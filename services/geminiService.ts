import { GoogleGenAI, Type, Schema } from '@google/genai';
import { TAXONOMY } from '../constants';
import { AnalysisResult } from '../types';

const SYSTEM_INSTRUCTION = `
You are an ESL Writing Error Annotation and Feedback System.
Your ONLY source of knowledge is the provided Taxonomy.
You must NOT use external grammar knowledge, teaching experience, or intuition.

STRICT RULES:
1. Only use error_codes present in the provided Taxonomy.
2. Do NOT infer, extend, merge, or invent error types.
3. macro_code MUST match the taxonomy relationship.
4. If no taxonomy definition matches, return an empty errors array [].
5. Be conservative: if unsure, do not annotate.
6. Do NOT reverse-engineer error types from the corrected sentence.
7. If an error_code is not in the taxonomy, it is invalid and must not be output.

TAXONOMY:
${JSON.stringify(TAXONOMY)}

Output MUST be valid JSON matching the schema.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    corrected_text: { type: Type.STRING, description: "The corrected version of the text." },
    annotations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original_span: { type: Type.STRING, description: "The specific text segment containing the error." },
          corrected_span: { type: Type.STRING, description: "The corrected text segment." },
          start_index: { type: Type.INTEGER, description: "Zero-based start index of the error in the original text." },
          end_index: { type: Type.INTEGER, description: "Zero-based end index (exclusive) of the error in the original text." },
          error_code: { type: Type.STRING, description: "The error code from the taxonomy." },
          macro_code: { type: Type.STRING, description: "The macro code from the taxonomy." },
          explanation: { type: Type.STRING, description: "The explanation from the taxonomy." },
        },
        required: ["original_span", "corrected_span", "start_index", "end_index", "error_code", "macro_code", "explanation"],
      },
    },
  },
  required: ["corrected_text", "annotations"],
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
  
  let retries = 0;
  const maxRetries = 5;
  const baseDelay = 2000;

  while (retries < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          role: 'user',
          parts: [{ text: `Analyze the following text for ESL errors based strictly on the taxonomy:\n\n"${text}"` }],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty response from AI");

      const result = JSON.parse(jsonText) as Omit<AnalysisResult, 'original_text'>;
      
      return {
        original_text: text,
        ...result
      };

    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      const isServerOverload = error.message?.includes('503') || error.status === 503;
      
      if ((isRateLimit || isServerOverload) && retries < maxRetries) {
        retries++;
        const waitTime = baseDelay * Math.pow(2, retries) + Math.random() * 1000;
        console.warn(`Gemini API rate limit/error. Retrying in ${Math.round(waitTime)}ms... (Attempt ${retries}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }
  
  throw new Error("Max retries exceeded for Gemini API");
};

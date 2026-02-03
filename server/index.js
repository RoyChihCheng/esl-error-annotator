import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const PROJECT_ID = process.env.PROJECT_ID;
const LOCATION = process.env.LOCATION || 'us-central1';
const MODEL = process.env.MODEL || 'gemini-2.5-flash';

if (!PROJECT_ID) {
  console.warn('PROJECT_ID is not set. Vertex AI calls will fail until it is provided.');
}

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
${JSON.stringify([{"macro_code":"AG","error_code":"AG","explanation":"A general agreement error where two or more grammatical elements do not match in number, person, or form."},{"macro_code":"AG","error_code":"AGA","explanation":"A pronoun does not agree with its antecedent in number, person, or gender."},{"macro_code":"AG","error_code":"AGD","explanation":"A determiner does not agree with the noun it modifies in number or countability."},{"macro_code":"AG","error_code":"AGN","explanation":"A noun does not agree with another grammatical element that requires number agreement."},{"macro_code":"AG","error_code":"AGQ","explanation":"A quantifier does not agree with the noun it modifies in terms of countability or number."},{"macro_code":"AG","error_code":"AGV","explanation":"A verb does not agree with its subject in number or person."},{"macro_code":"AS","error_code":"AS","explanation":"An error in the complementation pattern of a verb, where the chosen verb requires a different argument structure."},{"macro_code":"CD","error_code":"CD","explanation":"A determiner is used with a noun whose countability does not allow that determiner."},{"macro_code":"O","error_code":"CE","explanation":"A noun is incorrectly treated as countable or uncountable."},{"macro_code":"O","error_code":"CL","explanation":"An incorrect or unnatural collocation is used."},{"macro_code":"CD","error_code":"CN","explanation":"A noun is treated as countable or uncountable in a way that is not permitted in the intended sense."},{"macro_code":"CD","error_code":"CQ","explanation":"A quantifier is used that is incompatible with the countability of the noun."},{"macro_code":"DA","error_code":"DA","explanation":"An incorrect derived pronoun form is used."},{"macro_code":"DA","error_code":"DC","explanation":"An incorrect derived conjunction form is used."},{"macro_code":"DA","error_code":"DD","explanation":"An incorrect derived determiner form is used."},{"macro_code":"DA","error_code":"DI","explanation":"An incorrect inflected form of a determiner is used, where the determiner itself is appropriate but its morphological form is wrong."},{"macro_code":"DA","error_code":"DJ","explanation":"An incorrect derived adjective form is used."},{"macro_code":"DA","error_code":"DN","explanation":"An incorrect derived noun form is used."},{"macro_code":"DA","error_code":"DQ","explanation":"An incorrect derived quantifier form is used."},{"macro_code":"DA","error_code":"DT","explanation":"An incorrect derived preposition form is used."},{"macro_code":"DA","error_code":"DV","explanation":"An incorrect derived verb form is used."},{"macro_code":"DA","error_code":"DY","explanation":"An incorrect derived adverb form is used."},{"macro_code":"F","error_code":"FA","explanation":"An incorrect pronoun form is used."},{"macro_code":"F","error_code":"FD","explanation":"An incorrect determiner form is used."},{"macro_code":"F","error_code":"FJ","explanation":"An incorrect adjective form is used."},{"macro_code":"F","error_code":"FN","explanation":"An incorrect noun form is used."},{"macro_code":"F","error_code":"FQ","explanation":"An incorrect quantifier form is used."},{"macro_code":"F","error_code":"FV","explanation":"An incorrect verb form is used, such as using an infinitive where a gerund or participle is required."},{"macro_code":"F","error_code":"FY","explanation":"An incorrect adverb form is used."},{"macro_code":"I","error_code":"IA","explanation":"An incorrect inflected pronoun form is used."},{"macro_code":"I","error_code":"ID","explanation":"An idiomatic expression is used incorrectly or unnaturally."},{"macro_code":"I","error_code":"IJ","explanation":"An incorrect inflected adjective form is used."},{"macro_code":"I","error_code":"IN","explanation":"An incorrect inflected noun form is used."},{"macro_code":"I","error_code":"IQ","explanation":"An incorrect inflected quantifier form is used."},{"macro_code":"I","error_code":"IV","explanation":"An incorrect inflected form of a verb is used, such as incorrect tense marking or agreement morphology."},{"macro_code":"I","error_code":"IY","explanation":"An incorrect inflected adverb form is used."},{"macro_code":"L","error_code":"L","explanation":"The register or level of formality is inappropriate for the context."},{"macro_code":"M","error_code":"M","explanation":"A required grammatical element is missing."},{"macro_code":"M","error_code":"MA","explanation":"A required pronoun is missing."},{"macro_code":"M","error_code":"MC","explanation":"A required conjunction is missing."},{"macro_code":"M","error_code":"MD","explanation":"A required determiner is missing."},{"macro_code":"M","error_code":"MJ","explanation":"A required adjective is missing."},{"macro_code":"M","error_code":"MN","explanation":"A required noun is missing."},{"macro_code":"M","error_code":"MP","explanation":"Required punctuation is missing."},{"macro_code":"M","error_code":"MQ","explanation":"A required quantifier is missing."},{"macro_code":"M","error_code":"MT","explanation":"A required preposition is missing."},{"macro_code":"M","error_code":"MV","explanation":"A required verb is missing."},{"macro_code":"M","error_code":"MY","explanation":"A required adverb is missing."},{"macro_code":"O","error_code":"QL","explanation":"The response does not appropriately address the question prompt."},{"macro_code":"R","error_code":"R","explanation":"A word or phrase is present but is not the appropriate choice in the given context and needs to be replaced."},{"macro_code":"R","error_code":"RA","explanation":"A pronoun is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RC","explanation":"A conjunction is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RD","explanation":"A determiner is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RJ","explanation":"An adjective is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RN","explanation":"A noun is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RP","explanation":"Punctuation is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RQ","explanation":"A quantifier is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RT","explanation":"A preposition is incorrectly used and should be replaced."},{"macro_code":"R","error_code":"RV","explanation":"A verb is used that is grammatically possible but inappropriate in meaning, collocation, or argument structure for the context."},{"macro_code":"R","error_code":"RY","explanation":"An adverb is incorrectly used and should be replaced."},{"macro_code":"S","error_code":"S","explanation":"A non-existent word is produced due to incorrect spelling."},{"macro_code":"S","error_code":"SA","explanation":"A spelling variant that follows American conventions rather than British conventions."},{"macro_code":"S","error_code":"SX","explanation":"A real English word is used, but it is not the intended word."},{"macro_code":"T","error_code":"TV","explanation":"Incorrect tense is used to express time reference."},{"macro_code":"U","error_code":"U","explanation":"A grammatical element is used unnecessarily."},{"macro_code":"U","error_code":"UA","explanation":"A pronoun is used unnecessarily."},{"macro_code":"U","error_code":"UC","explanation":"A conjunction is used unnecessarily."},{"macro_code":"U","error_code":"UD","explanation":"A determiner is used unnecessarily."},{"macro_code":"U","error_code":"UJ","explanation":"An adjective is used unnecessarily."},{"macro_code":"U","error_code":"UN","explanation":"A noun is used unnecessarily."},{"macro_code":"U","error_code":"UP","explanation":"Punctuation is used unnecessarily."},{"macro_code":"U","error_code":"UQ","explanation":"A quantifier is used unnecessarily."},{"macro_code":"U","error_code":"UT","explanation":"A preposition is used unnecessarily."},{"macro_code":"U","error_code":"UV","explanation":"A verb is used unnecessarily."},{"macro_code":"U","error_code":"UY","explanation":"An adverb is used unnecessarily."},{"macro_code":"X","error_code":"W","explanation":"Words are arranged in an incorrect order."},{"macro_code":"X","error_code":"X","explanation":"Negation is expressed incorrectly."}])}

Output MUST be valid JSON matching the schema.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    corrected_text: { type: Type.STRING, description: 'The corrected version of the text.' },
    annotations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original_span: { type: Type.STRING, description: 'The specific text segment containing the error.' },
          corrected_span: { type: Type.STRING, description: 'The corrected text segment.' },
          start_index: { type: Type.INTEGER, description: 'Zero-based start index of the error in the original text.' },
          end_index: { type: Type.INTEGER, description: 'Zero-based end index (exclusive) of the error in the original text.' },
          error_code: { type: Type.STRING, description: 'The error code from the taxonomy.' },
          macro_code: { type: Type.STRING, description: 'The macro code from the taxonomy.' },
          explanation: { type: Type.STRING, description: 'The explanation from the taxonomy.' }
        },
        required: ['original_span', 'corrected_span', 'start_index', 'end_index', 'error_code', 'macro_code', 'explanation']
      }
    }
  },
  required: ['corrected_text', 'annotations']
};

const ai = new GoogleGenAI({ vertexai: true, projectId: PROJECT_ID, location: LOCATION });

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.post('/analyze', async (req, res) => {
  const text = req.body?.text;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing "text" in request body.' });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: {
        role: 'user',
        parts: [{ text: `Analyze the following text for ESL errors based strictly on the taxonomy:\n\n"${text}"` }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      return res.status(502).json({ error: 'Empty response from Vertex AI.' });
    }

    const result = JSON.parse(jsonText);
    return res.json(result);
  } catch (error) {
    console.error('Vertex AI error:', error);
    return res.status(500).json({ error: error?.message || 'Vertex AI error.' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

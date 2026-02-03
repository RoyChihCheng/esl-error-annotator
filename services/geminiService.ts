import { AnalysisResult } from '../types';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('api_base_url');
    if (stored) return stored;
  }
  return import.meta.env.VITE_API_BASE_URL || '';
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('API URL is missing');
  }

  const response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.error) message = parsed.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message || `Request failed (${response.status})`);
  }

  const result = await response.json();
  return {
    original_text: text,
    ...result
  } as AnalysisResult;
};

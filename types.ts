export interface TaxonomyItem {
  macro_code: string;
  error_code: string;
  explanation: string;
}

export interface Annotation {
  original_span: string;
  corrected_span: string;
  start_index: number;
  end_index: number;
  error_code: string;
  macro_code: string;
  explanation: string;
}

export interface AnalysisResult {
  original_text: string;
  corrected_text: string;
  annotations: Annotation[];
}

export interface DatabaseRecord {
  id?: number;
  created_at?: string;
  original_text: string;
  corrected_text: string;
  annotations: Annotation[]; // Maps to 'analysis_json' in DB
  error_count?: number;      // Maps to 'error_count' in DB
}

export type ViewMode = 'single' | 'batch' | 'history' | 'statistics';

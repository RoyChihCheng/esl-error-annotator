import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { DatabaseRecord } from '../types';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const saveRecord = async (record: DatabaseRecord) => {
  try {
    // Map the frontend structure to the database schema
    // Table: essay_analyses
    // Columns: original_text, corrected_text, error_count, analysis_json
    const { data, error } = await supabase
      .from('essay_analyses')
      .insert([
        {
          original_text: record.original_text,
          corrected_text: record.corrected_text,
          analysis_json: record.annotations, // Map annotations array to JSONB column
          error_count: record.annotations.length, // Calculate error count
        },
      ])
      .select();

    if (error) {
      console.error('Supabase Error:', error);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Failed to save record:', err);
    // We don't want to crash the app if DB is missing, just log it
    return null;
  }
};

export const fetchHistory = async () => {
  try {
    const { data, error } = await supabase
      .from('essay_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase Fetch Error:', error);
      throw error;
    }

    // Map database columns back to frontend structure
    return data.map((item: any) => ({
      id: item.id,
      created_at: item.created_at,
      original_text: item.original_text,
      corrected_text: item.corrected_text,
      annotations: item.analysis_json || [], // Map JSONB column back to annotations
      error_count: item.error_count
    })) as DatabaseRecord[];
  } catch (err) {
    console.error('Failed to fetch history:', err);
    return [];
  }
};

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const dataProvider = import.meta.env?.VITE_DATA_PROVIDER === 'supabase' ? 'supabase' : 'local';
export const isCloudProvider = dataProvider === 'supabase';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isCloudProvider) throw new Error('Supabase provider is not selected.');
  if (!url || !publishableKey) {
    throw new Error('Cloud mode is selected but VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing. Local fallback is intentionally disabled.');
  }
  if (!client) {
    client = createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-client-info': 'knot-production-adapter' } },
    });
  }
  return client;
}

export function cloudError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'object' && error && 'message' in error) return new Error(String(error.message));
  return new Error('Cloud operation failed.');
}

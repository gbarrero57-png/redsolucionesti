import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singletons — only created when first used (not at module import time).
// This prevents "supabaseUrl is required" build errors when env vars are absent.

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing Supabase public env vars');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('Missing Supabase service env vars');
    _supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  }
  return _supabaseAdmin;
}

// Named exports for backwards compatibility — resolved lazily via getters
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getSupabase() as unknown as Record<string, unknown>)[prop as string]; },
});

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getSupabaseAdmin() as unknown as Record<string, unknown>)[prop as string]; },
});

// CLINIC_ID
export const CLINIC_ID = process.env.CLINIC_ID ?? '';

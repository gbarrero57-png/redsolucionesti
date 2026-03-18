import { createClient } from '@supabase/supabase-js';

// Placeholder values prevent "supabaseUrl is required" crash at build time
// when env vars are absent. At runtime, Vercel injects real values.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY      ?? 'placeholder-service-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/** Creates a Supabase client authenticated as a specific user (JWT with custom claims).
 *  Use this for calling RPCs that validate auth.jwt() ->> 'clinic_id'. */
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}

export const CLINIC_ID = process.env.CLINIC_ID ?? '';

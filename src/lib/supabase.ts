import { createClient } from '@supabase/supabase-js';

// Placeholder values prevent "supabaseUrl is required" crash at build time
// when env vars are absent. At runtime, Vercel injects real values.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
// All portal code runs server-side. Use the service key for all Supabase clients
// since legacy anon JWT keys were disabled by Supabase on 2026-03-26.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? 'placeholder-service-key';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/** Creates a Supabase client that passes the user's JWT in the Authorization header.
 *  The SECURITY DEFINER functions read auth.jwt() claims from this token. */
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}

export const CLINIC_ID = process.env.CLINIC_ID ?? '';

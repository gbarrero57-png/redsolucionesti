import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Client-side client (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client (service role key — bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const CLINIC_ID = process.env.CLINIC_ID || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

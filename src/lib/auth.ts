import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export type AuthContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  clinic_id: string;
  role: string;
  is_superadmin: boolean;
  /** Set when the access token was refreshed — caller should update the sb-token cookie */
  newAccessToken?: string;
};

async function getUserWithRefresh(req: NextRequest): Promise<{ user: AuthContext['user']; newAccessToken?: string } | null> {
  const token = req.cookies.get('sb-token')?.value;
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (!error && user) return { user };

  // Access token expired — try to refresh using sb-refresh cookie
  const refreshToken = req.cookies.get('sb-refresh')?.value;
  if (!refreshToken) return null;

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
  );

  const { data: refreshData, error: refreshErr } = await anonClient.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshErr || !refreshData.user || !refreshData.session) return null;

  return { user: refreshData.user, newAccessToken: refreshData.session.access_token };
}

export async function verifyAuth(req: NextRequest) {
  const result = await getUserWithRefresh(req);
  return result?.user ?? null;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const result = await getUserWithRefresh(req);
  if (!result) return null;

  const { user, newAccessToken } = result;

  // ── Superadmin check FIRST — does not require a staff record ──
  const superadminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  const is_superadmin = superadminEmail !== '' &&
    (user.email ?? '').toLowerCase().trim() === superadminEmail;

  if (is_superadmin) {
    return { user, clinic_id: '', role: 'superadmin', is_superadmin: true, newAccessToken };
  }

  // ── Regular staff lookup ──────────────────────────────────────
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, clinic_id, role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .single();

  if (!staff) return null;

  return {
    user,
    clinic_id: staff.clinic_id as string,
    role: staff.role as string,
    is_superadmin: false,
    newAccessToken,
  };
}

/** Apply refreshed token cookie to a NextResponse if the context has a new token */
export function applyRefreshedToken(res: import('next/server').NextResponse, ctx: AuthContext) {
  if (ctx.newAccessToken) {
    res.cookies.set('sb-token', ctx.newAccessToken, { ...COOKIE_BASE, maxAge: 60 * 60 * 8 });
  }
  return res;
}

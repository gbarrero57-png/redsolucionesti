import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

/* ── Cloudflare Turnstile verification ── */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const form = new FormData();
  form.append('secret',   process.env.TURNSTILE_SECRET_KEY!);
  form.append('response', token);
  form.append('remoteip', ip);
  const res  = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method:'POST', body:form });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

/* ── Brute-force protection: 5 attempts / IP / 15 min ── */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkLoginLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const win = loginAttempts.get(ip);
  if (!win || now > win.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    return { allowed: true, remaining: 4 };
  }
  if (win.count >= 5) return { allowed: false, remaining: 0 };
  win.count++;
  return { allowed: true, remaining: 5 - win.count };
}
function clearLoginLimit(ip: string) { loginAttempts.delete(ip); }

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { allowed } = checkLoginLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos fallidos. Espera 15 minutos.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { email, password, captchaToken } = body;

  // Verify Turnstile token before touching credentials
  if (process.env.TURNSTILE_SECRET_KEY) {
    const valid = captchaToken ? await verifyTurnstile(captchaToken, ip) : false;
    if (!valid) {
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida. Intenta de nuevo.' },
        { status: 400 }
      );
    }
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
  }

  // Use service key — legacy anon JWT keys disabled by Supabase on 2026-03-26
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }
  clearLoginLimit(ip); // Reset on successful login

  const maxAge        = 60 * 60 * 8;   // 8h for access token cookie
  const refreshMaxAge = 60 * 60 * 24 * 7; // 7 days for refresh token cookie

  function setSessionCookies(res: NextResponse, accessToken: string, refreshToken: string, role: string) {
    res.cookies.set('sb-token',   accessToken,  { ...COOKIE_BASE, maxAge });
    res.cookies.set('sb-refresh', refreshToken, { ...COOKIE_BASE, maxAge: refreshMaxAge });
    res.cookies.set('sb-role',    role,          { ...COOKIE_BASE, maxAge });
  }

  // ── Superadmin path — no staff record required ────────────────
  const superadminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  if (superadminEmail !== '' && (data.user.email ?? '').toLowerCase().trim() === superadminEmail) {
    const res = NextResponse.json({
      ok: true,
      role: 'superadmin',
      is_superadmin: true,
      redirect: '/admin/global-metrics',
    });
    setSessionCookies(res, data.session.access_token, data.session.refresh_token, 'superadmin');
    return res;
  }

  // ── Regular staff path ────────────────────────────────────────
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, role, active, full_name, clinic_id')
    .eq('user_id', data.user.id)
    .eq('active', true)
    .single();

  if (!staff) {
    return NextResponse.json(
      { error: 'Sin acceso al panel. Contacta al administrador.' },
      { status: 403 }
    );
  }

  const redirect = '/admin/inbox';
  const res = NextResponse.json({
    ok: true,
    role: staff.role,
    name: staff.full_name,
    is_superadmin: false,
    redirect,
  });
  setSessionCookies(res, data.session.access_token, data.session.refresh_token, staff.role);
  return res;
}

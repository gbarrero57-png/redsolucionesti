import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const maxAge = 60 * 60 * 8; // 8h

  // ── Superadmin path — no staff record required ────────────────
  const superadminEmail = process.env.SUPERADMIN_EMAIL || '';
  if (superadminEmail !== '' && data.user.email === superadminEmail) {
    const res = NextResponse.json({
      ok: true,
      role: 'superadmin',
      is_superadmin: true,
      redirect: '/admin/global-metrics',
    });
    res.cookies.set('sb-token', data.session.access_token, { ...COOKIE_BASE, maxAge });
    res.cookies.set('sb-role', 'superadmin', { ...COOKIE_BASE, maxAge });
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
  res.cookies.set('sb-token', data.session.access_token, { ...COOKIE_BASE, maxAge });
  res.cookies.set('sb-role', staff.role, { ...COOKIE_BASE, maxAge });
  return res;
}

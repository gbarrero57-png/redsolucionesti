import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clear = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 0, path: '/' };
  res.cookies.set('sb-token',   '', clear);
  res.cookies.set('sb-refresh', '', clear);
  res.cookies.set('sb-role',    '', clear);
  return res;
}

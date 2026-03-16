import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    email: ctx.user.email,
    role: ctx.role,
    is_superadmin: ctx.is_superadmin,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

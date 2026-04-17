import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

const ALL_STATUSES = [
  'nuevo', 'sin_email', 'enviado', 'email_enviado', 'follow_up_enviado',
  'respondio', 'interesado', 'demo_agendada', 'cerrado', 'no_interesado',
];

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Count each status in parallel — avoids Supabase's 1000-row default limit
  const results = await Promise.all(
    ALL_STATUSES.map(async (st) => {
      const { count } = await supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', st);
      return [st, count ?? 0] as [string, number];
    })
  );

  const counts = Object.fromEntries(results.filter(([, n]) => n > 0));
  return NextResponse.json(counts, { headers: NO_CACHE });
}

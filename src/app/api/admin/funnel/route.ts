import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const days = Math.min(parseInt(new URL(req.url).searchParams.get('days') || '30', 10), 365);

  const { data, error } = await supabaseAdmin.rpc('get_clinic_funnel_summary', {
    p_clinic_id: ctx.clinic_id,
    p_days:      days,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data ?? { funnel: [], acquisition: [], timeline: [], new_leads: 0, ctwa_leads: 0 }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

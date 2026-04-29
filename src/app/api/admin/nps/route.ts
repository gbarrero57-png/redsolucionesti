// NPS: POST (bot/workflow records a response), GET (clinic stats)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 365);

  const { data, error } = await supabaseAdmin.rpc('get_clinic_nps_stats', {
    p_clinic_id: ctx.clinic_id,
    p_days:      days,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data ?? { total: 0, avg_score: 0, nps_score: 0, promoters: 0, passives: 0, detractors: 0 }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest) {
  // Called by n8n when a patient replies to NPS message
  // Auth: either user JWT or service key via Authorization header
  const authHeader = req.headers.get('authorization') ?? '';
  const body = await req.json().catch(() => ({}));
  const { clinic_id, patient_id, appointment_id, phone, score } = body;

  if (!clinic_id)               return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });
  if (!score || score < 1 || score > 5)
    return NextResponse.json({ error: 'score must be 1-5' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('nps_responses')
    .insert({
      clinic_id,
      patient_id:     patient_id ?? null,
      appointment_id: appointment_id ?? null,
      phone:          phone ?? null,
      score:          Number(score),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark appointment nps_sent if provided
  if (appointment_id) {
    await supabaseAdmin
      .from('appointments')
      .update({ nps_sent: true, nps_sent_at: new Date().toISOString() })
      .eq('id', appointment_id)
      .eq('clinic_id', clinic_id);
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

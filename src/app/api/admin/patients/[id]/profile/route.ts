// PATCH: update tags, VIP, insurance, chronic_conditions, current_medications, recall_interval_months
// GET:   return LTV + NPS stats + recall info for a patient
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

const VALID_PATCH_FIELDS = [
  'tags', 'is_vip', 'insurance_company', 'insurance_policy', 'insurance_expiry',
  'chronic_conditions', 'current_medications', 'recall_interval_months',
] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;

  const [ltvRes, npsRes, patientRes] = await Promise.all([
    supabaseAdmin.rpc('get_patient_ltv', { p_patient_id: patient_id, p_clinic_id: ctx.clinic_id }),
    supabaseAdmin
      .from('nps_responses')
      .select('score, created_at')
      .eq('clinic_id', ctx.clinic_id)
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('patients')
      .select('tags, is_vip, insurance_company, insurance_policy, insurance_expiry, chronic_conditions, current_medications, recall_interval_months, next_recall_due, last_recall_sent_at, birthday_msg_sent_year')
      .eq('id', patient_id)
      .eq('clinic_id', ctx.clinic_id)
      .single(),
  ]);

  const ltv    = Number(ltvRes.data ?? 0);
  const nps    = npsRes.data ?? [];
  const extras = patientRes.data ?? {};

  const nps_avg = nps.length
    ? Math.round((nps.reduce((s, r) => s + r.score, 0) / nps.length) * 10) / 10
    : null;

  const res = NextResponse.json({
    ltv,
    nps_responses: nps,
    nps_avg,
    nps_total: nps.length,
    ...extras,
  }, { headers: NO_CACHE });

  return applyRefreshedToken(res, ctx);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of VALID_PATCH_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 1)
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });

  // If recall_interval changed, recompute next_recall_due
  if ('recall_interval_months' in body) {
    await supabaseAdmin.rpc('update_patient_recall', {
      p_patient_id:      patient_id,
      p_clinic_id:       ctx.clinic_id,
      p_interval_months: body.recall_interval_months,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('patients')
    .update(updates)
    .eq('id', patient_id)
    .eq('clinic_id', ctx.clinic_id)
    .select('tags, is_vip, insurance_company, insurance_policy, insurance_expiry, chronic_conditions, current_medications, recall_interval_months, next_recall_due')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

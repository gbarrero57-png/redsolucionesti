import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createUserClient } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const stats  = searchParams.get('stats') === '1';
  const limit  = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  const source = searchParams.get('source') || null;

  const userClient = createUserClient(ctx.accessToken);

  if (stats) {
    const { data, error } = await userClient.rpc('get_lead_stats', {
      p_clinic_id: ctx.clinic_id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
    const res = NextResponse.json(data ?? {}, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  const { data, error } = await userClient.rpc('get_clinic_leads', {
    p_clinic_id: ctx.clinic_id,
    p_limit:     limit,
    p_offset:    offset,
    p_source:    source,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const rows  = Array.isArray(data) ? data : [];
  const total = rows[0]?.total ?? 0;
  const res = NextResponse.json({ leads: rows, total }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

const VALID_SOURCES = ['whatsapp_bot', 'manual', 'referral', 'landing_page', 'import'] as const;

// PATCH: activate a lead OR update source
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { patient_id, source } = body;
  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 });

  // Update source only
  if (source !== undefined) {
    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: `source must be one of: ${VALID_SOURCES.join(', ')}` }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('patients')
      .update({ source, updated_at: new Date().toISOString() })
      .eq('id', patient_id)
      .eq('clinic_id', ctx.clinic_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
    const res = NextResponse.json({ success: true }, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  // Activate lead → active patient
  const { data, error } = await supabaseAdmin.rpc('activate_patient', {
    p_patient_id: patient_id,
    p_clinic_id:  ctx.clinic_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json({ success: data === true }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

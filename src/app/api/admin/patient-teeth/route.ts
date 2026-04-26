import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get('patient_id');
  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400, headers: NO_CACHE });

  const { data, error } = await supabaseAdmin
    .from('patient_teeth')
    .select('id, patient_id, clinic_id, tooth_fdi, status, surfaces, notes, updated_by, updated_at')
    .eq('patient_id', patient_id)
    .eq('clinic_id', ctx.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data || [], { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { patient_id, tooth_fdi, status, surfaces, notes } = body;

  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400, headers: NO_CACHE });
  if (tooth_fdi === undefined || tooth_fdi === null)
    return NextResponse.json({ error: 'tooth_fdi required' }, { status: 400, headers: NO_CACHE });
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400, headers: NO_CACHE });

  const { data, error } = await supabaseAdmin
    .from('patient_teeth')
    .upsert(
      {
        patient_id,
        clinic_id: ctx.clinic_id,
        tooth_fdi,
        status,
        surfaces: surfaces ?? null,
        notes: notes ?? null,
        updated_by: ctx.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,tooth_fdi' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

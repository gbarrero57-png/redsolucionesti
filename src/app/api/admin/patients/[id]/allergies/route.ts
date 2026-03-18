import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const body = await req.json();
  const { allergen, severity, reaction } = body;

  if (!allergen?.trim()) return NextResponse.json({ error: 'allergen required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('patient_allergies').insert({
    patient_id,
    clinic_id: ctx.clinic_id,
    allergen: allergen.trim(),
    severity: severity || 'leve',
    reaction: reaction?.trim() || null,
    confirmed: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json({ ok: true }, { status: 201, headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const { searchParams } = new URL(req.url);
  const allergy_id = searchParams.get('allergy_id');

  if (!allergy_id) return NextResponse.json({ error: 'allergy_id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('patient_allergies')
    .delete()
    .eq('id', allergy_id)
    .eq('patient_id', patient_id)
    .eq('clinic_id', ctx.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json({ ok: true }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

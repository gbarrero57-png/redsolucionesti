import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

const VALID_METHODS  = ['cash', 'card', 'transfer', 'yape', 'plin', 'other'];
const VALID_STATUSES = ['pending', 'paid', 'partial', 'refunded', 'cancelled'];

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get('patient_id');
  const status     = searchParams.get('status');
  const summary    = searchParams.get('summary'); // summary=1 → debt summary
  const limit      = Math.min(Math.max(parseInt(searchParams.get('limit') || '100') || 100, 1), 500);

  // Clinic debt summary
  if (summary === '1') {
    const { data, error } = await supabaseAdmin.rpc('get_clinic_debt_summary', {
      p_clinic_id: ctx.clinic_id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
    const row = Array.isArray(data) ? data[0] : data;
    const res = NextResponse.json(row ?? {}, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  // Per-patient balance (includes installments via fixed SQL function)
  const balance = searchParams.get('balance');
  if (balance === '1' && patient_id) {
    const { data, error } = await supabaseAdmin.rpc('get_patient_balance', {
      p_patient_id: patient_id,
      p_clinic_id:  ctx.clinic_id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
    const row = Array.isArray(data) ? data[0] : data;
    const res = NextResponse.json(row ?? { total_debt: 0, overdue_debt: 0, pending_payments: 0 }, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  let query = supabaseAdmin
    .from('payments')
    .select(`
      id, patient_id, appointment_id, plan_id,
      amount, payment_method, status, due_date, paid_at,
      reference, notes, created_at, created_by,
      patients(full_name, phone, dni)
    `)
    .eq('clinic_id', ctx.clinic_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (patient_id) query = query.eq('patient_id', patient_id);
  if (status && VALID_STATUSES.includes(status)) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const flat = (data || []).map((p: Record<string, unknown>) => {
    const pat = p.patients as { full_name?: string; phone?: string; dni?: string } | null;
    return { ...p, patients: undefined, patient_name: pat?.full_name ?? null, patient_phone: pat?.phone ?? null, patient_dni: pat?.dni ?? null };
  });

  const res = NextResponse.json(flat, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { patient_id, appointment_id, plan_id, amount, payment_method, status, due_date, reference, notes } = body;

  if (!patient_id)  return NextResponse.json({ error: 'patient_id required' }, { status: 400 });
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  if (payment_method && !VALID_METHODS.includes(payment_method))
    return NextResponse.json({ error: `payment_method must be one of: ${VALID_METHODS.join(', ')}` }, { status: 400 });
  if (status && !VALID_STATUSES.includes(status))
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert({
      clinic_id:      ctx.clinic_id,
      patient_id,
      appointment_id: appointment_id || null,
      plan_id:        plan_id || null,
      amount:         Number(amount),
      payment_method: payment_method || 'cash',
      status:         status || 'pending',
      due_date:       due_date || null,
      paid_at:        (status === 'paid') ? now : null,
      reference:      reference?.trim() || null,
      notes:          notes?.trim() || null,
      created_by:     ctx.user?.id || null,
      created_at:     now,
      updated_at:     now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  const res = NextResponse.json(data, { status: 201, headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { id, status, payment_method, amount, due_date, reference, notes, paid_at } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    updates.status = status;
    if (status === 'paid' && !paid_at) updates.paid_at = new Date().toISOString();
  }
  if (payment_method !== undefined) {
    if (!VALID_METHODS.includes(payment_method))
      return NextResponse.json({ error: `payment_method must be one of: ${VALID_METHODS.join(', ')}` }, { status: 400 });
    updates.payment_method = payment_method;
  }
  if (amount     !== undefined) updates.amount    = Number(amount);
  if (due_date   !== undefined) updates.due_date  = due_date || null;
  if (reference  !== undefined) updates.reference = reference?.trim() || null;
  if (notes      !== undefined) updates.notes     = notes?.trim() || null;
  if (paid_at    !== undefined) updates.paid_at   = paid_at || null;

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  const res = NextResponse.json(data, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

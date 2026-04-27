import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const VALID_FREQ     = ['weekly', 'biweekly', 'monthly'];
const VALID_STATUSES = ['active', 'completed', 'defaulted', 'cancelled'];

function addInterval(date: Date, freq: string): Date {
  const d = new Date(date);
  if (freq === 'weekly')   d.setDate(d.getDate() + 7);
  if (freq === 'biweekly') d.setDate(d.getDate() + 14);
  if (freq === 'monthly')  d.setMonth(d.getMonth() + 1);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get('patient_id');
  const plan_id    = searchParams.get('plan_id'); // single plan with installments

  if (plan_id) {
    const { data, error } = await supabaseAdmin
      .from('payment_plans')
      .select('*, payment_installments(*)')
      .eq('id', plan_id)
      .eq('clinic_id', ctx.clinic_id)
      .order('installment_num', { referencedTable: 'payment_installments', ascending: true })
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
    const res = NextResponse.json(data, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  let query = supabaseAdmin
    .from('payment_plans')
    .select('id, patient_id, plan_id, total_amount, installment_amount, frequency, installments_total, installments_paid, start_date, next_due_date, status, notes, created_at')
    .eq('clinic_id', ctx.clinic_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (patient_id) query = query.eq('patient_id', patient_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  const res = NextResponse.json(data || [], { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { patient_id, plan_id, total_amount, installment_amount, frequency, installments_total, start_date, notes } = body;

  if (!patient_id)        return NextResponse.json({ error: 'patient_id required' }, { status: 400 });
  if (!total_amount)      return NextResponse.json({ error: 'total_amount required' }, { status: 400 });
  if (!installment_amount) return NextResponse.json({ error: 'installment_amount required' }, { status: 400 });
  if (!installments_total) return NextResponse.json({ error: 'installments_total required' }, { status: 400 });
  if (!start_date)        return NextResponse.json({ error: 'start_date required' }, { status: 400 });
  if (!VALID_FREQ.includes(frequency))
    return NextResponse.json({ error: `frequency must be one of: ${VALID_FREQ.join(', ')}` }, { status: 400 });

  const now         = new Date().toISOString();
  const startDateObj = new Date(start_date + 'T12:00:00');
  const firstDue     = addInterval(startDateObj, frequency);

  const { data: pp, error: ppErr } = await supabaseAdmin
    .from('payment_plans')
    .insert({
      clinic_id:          ctx.clinic_id,
      patient_id,
      plan_id:            plan_id || null,
      total_amount:       Number(total_amount),
      installment_amount: Number(installment_amount),
      frequency,
      installments_total: Number(installments_total),
      installments_paid:  0,
      start_date,
      next_due_date:      toDateStr(firstDue),
      status:             'active',
      notes:              notes?.trim() || null,
      created_at:         now,
      updated_at:         now,
    })
    .select()
    .single();

  if (ppErr || !pp) return NextResponse.json({ error: ppErr?.message ?? 'Error al crear plan' }, { status: 500, headers: NO_CACHE });

  // Auto-generate installment rows
  const installmentRows = [];
  let dueDate = firstDue;
  for (let i = 1; i <= Number(installments_total); i++) {
    installmentRows.push({
      payment_plan_id: (pp as Record<string, unknown>).id,
      installment_num: i,
      due_date:        toDateStr(dueDate),
      amount:          Number(installment_amount),
      status:          'pending',
      created_at:      now,
    });
    dueDate = addInterval(dueDate, frequency);
  }
  await supabaseAdmin.from('payment_installments').insert(installmentRows);

  const res = NextResponse.json(pp, { status: 201, headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { id, installment_id, status, notes } = body;

  // Mark an installment as paid
  if (installment_id) {
    const now = new Date().toISOString();

    // Fetch installment details before marking paid
    const { data: instFull, error: instFetchErr } = await supabaseAdmin
      .from('payment_installments')
      .select('id, payment_plan_id, amount, installment_num, due_date, status')
      .eq('id', installment_id)
      .single();
    if (instFetchErr || !instFull) return NextResponse.json({ error: 'Installment not found' }, { status: 404, headers: NO_CACHE });
    const instF = instFull as Record<string, unknown>;

    // Fetch parent plan to get clinic_id, patient_id, plan_id
    const { data: planFull } = await supabaseAdmin
      .from('payment_plans')
      .select('clinic_id, patient_id, plan_id, installments_paid, installments_total, frequency, payment_installments(due_date, status)')
      .eq('id', String(instF.payment_plan_id))
      .single();
    const pf = planFull as Record<string, unknown> | null;

    // Security: ensure plan belongs to this clinic
    if (!pf || String(pf.clinic_id) !== ctx.clinic_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
    }

    // Create a payments record for this installment payment
    let paymentId: string | null = null;
    const { data: newPay } = await supabaseAdmin
      .from('payments')
      .insert({
        clinic_id:      ctx.clinic_id,
        patient_id:     pf.patient_id,
        plan_id:        pf.plan_id ?? null,
        amount:         Number(instF.amount),
        payment_method: 'cash',
        status:         'paid',
        due_date:       instF.due_date,
        paid_at:        now,
        notes:          `Cuota ${instF.installment_num} del plan de cuotas`,
        created_by:     ctx.user?.id ?? null,
        created_at:     now,
        updated_at:     now,
      })
      .select('id')
      .single();
    if (newPay) paymentId = (newPay as Record<string, unknown>).id as string;

    // Mark installment as paid (link to payment record)
    await supabaseAdmin
      .from('payment_installments')
      .update({ status: 'paid', paid_at: now, payment_id: paymentId })
      .eq('id', installment_id);

    // Update installments_paid count + next_due_date on parent plan
    const paid  = Number(pf.installments_paid) + 1;
    const total = Number(pf.installments_total);
    const installs = (pf.payment_installments as Array<{ due_date: string; status: string }>) || [];
    const nextPending = installs
      .filter(i => i.status === 'pending' && i.due_date !== String(instF.due_date))
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
    await supabaseAdmin
      .from('payment_plans')
      .update({
        installments_paid: paid,
        next_due_date:     nextPending?.due_date ?? null,
        status:            paid >= total ? 'completed' : 'active',
        updated_at:        now,
      })
      .eq('id', String(instF.payment_plan_id));

    const res = NextResponse.json({ ok: true, payment_id: paymentId }, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  // Update plan status / notes
  if (!id) return NextResponse.json({ error: 'id or installment_id required' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    updates.status = status;
  }
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from('payment_plans')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  const res = NextResponse.json(data, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

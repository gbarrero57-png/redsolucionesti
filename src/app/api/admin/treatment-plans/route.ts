import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

const VALID_PLAN_STATUSES = ['draft', 'active', 'completed', 'cancelled'];
const VALID_ITEM_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const patient_id = searchParams.get('patient_id');
  const plan_id    = searchParams.get('plan_id');    // single plan with items
  const status     = searchParams.get('status');
  const limit      = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 200);

  // Single plan with items
  if (plan_id) {
    const { data: plan, error: planErr } = await supabaseAdmin
      .from('treatment_plans')
      .select('*, treatment_plan_items(*)')
      .eq('id', plan_id)
      .eq('clinic_id', ctx.clinic_id)
      .single();
    if (planErr || !plan) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });
    const res = NextResponse.json(plan, { headers: NO_CACHE });
    return applyRefreshedToken(res, ctx);
  }

  let query = supabaseAdmin
    .from('treatment_plans')
    .select(`
      id, patient_id, title, total_amount, status, notes, created_at, approved_at,
      patients(full_name, dni, phone)
    `)
    .eq('clinic_id', ctx.clinic_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (patient_id) query = query.eq('patient_id', patient_id);
  if (status && VALID_PLAN_STATUSES.includes(status)) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const flat = (data || []).map((p: Record<string, unknown>) => {
    const pat = p.patients as { full_name?: string; dni?: string; phone?: string } | null;
    return { ...p, patients: undefined, patient_name: pat?.full_name ?? null, patient_dni: pat?.dni ?? null, patient_phone: pat?.phone ?? null };
  });

  const res = NextResponse.json(flat, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { patient_id, title, notes, items } = body;

  if (!patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 });

  const now = new Date().toISOString();

  // Calculate total from items if provided
  const parsedItems: Array<{ tooth_number?: number; service: string; description?: string; unit_price: number; quantity?: number; status?: string; sort_order?: number }> =
    Array.isArray(items) ? items : [];

  const total_amount = parsedItems.reduce((sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 1), 0);

  const { data: plan, error: planErr } = await supabaseAdmin
    .from('treatment_plans')
    .insert({
      clinic_id:    ctx.clinic_id,
      patient_id,
      title:        title?.trim() || 'Plan de tratamiento',
      total_amount,
      status:       'draft',
      notes:        notes?.trim() || null,
      created_by:   ctx.user?.id || null,
      created_at:   now,
      updated_at:   now,
    })
    .select()
    .single();

  if (planErr || !plan) return NextResponse.json({ error: planErr?.message ?? 'Error al crear plan' }, { status: 500, headers: NO_CACHE });

  // Insert items if any
  if (parsedItems.length > 0) {
    const itemRows = parsedItems.map((i, idx) => ({
      plan_id:     (plan as Record<string, unknown>).id,
      tooth_number: i.tooth_number ? Number(i.tooth_number) : null,
      service:     i.service,
      description: i.description?.trim() || null,
      unit_price:  Number(i.unit_price) || 0,
      quantity:    Number(i.quantity) || 1,
      status:      (i.status && VALID_ITEM_STATUSES.includes(i.status)) ? i.status : 'pending',
      sort_order:  i.sort_order ?? idx,
      created_at:  now,
    }));
    await supabaseAdmin.from('treatment_plan_items').insert(itemRows);
  }

  const res = NextResponse.json(plan, { status: 201, headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { id, title, status, notes, total_amount, approved_at } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (title        !== undefined) updates.title        = title?.trim() || null;
  if (notes        !== undefined) updates.notes        = notes?.trim() || null;
  if (total_amount !== undefined) updates.total_amount = Number(total_amount);
  if (approved_at  !== undefined) updates.approved_at  = approved_at || null;
  if (status !== undefined) {
    if (!VALID_PLAN_STATUSES.includes(status))
      return NextResponse.json({ error: `status must be one of: ${VALID_PLAN_STATUSES.join(', ')}` }, { status: 400 });
    updates.status = status;
    if (status === 'active' && !approved_at) updates.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('treatment_plans')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  const res = NextResponse.json(data, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

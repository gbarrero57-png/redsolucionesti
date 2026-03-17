import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const VALID_STATUSES       = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
const VALID_PAYMENT_STATUS = ['not_required', 'pending', 'paid', 'partial', 'waived'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get('status');
  const from      = searchParams.get('from');
  const to        = searchParams.get('to');
  const limit     = Math.min(Math.max(parseInt(searchParams.get('limit') || '500') || 500, 1), 1000);

  // Validar status contra allowlist
  const status = rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : null;
  // Validar que from/to sean fechas ISO válidas
  const safeFrom = from && ISO_DATE_RE.test(from) ? from : null;
  const safeTo   = to   && ISO_DATE_RE.test(to)   ? to   : null;

  let query = supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('clinic_id', ctx.clinic_id)
    .order('start_time', { ascending: true })
    .limit(limit);

  if (status)   query = query.eq('status', status);
  if (safeFrom) query = query.gte('start_time', safeFrom);
  if (safeTo)   query = query.lt('start_time', safeTo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data || [], { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { patient_name, phone, service, start_time, end_time, notes } = body;

  if (!patient_name?.trim()) return NextResponse.json({ error: 'patient_name required' }, { status: 400 });
  if (!start_time)           return NextResponse.json({ error: 'start_time required' }, { status: 400 });
  if (!end_time)             return NextResponse.json({ error: 'end_time required' }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      clinic_id:    ctx.clinic_id,
      patient_name: patient_name.trim(),
      phone:        phone?.trim() || null,
      service:      service?.trim() || null,
      start_time,
      end_time,
      notes:        notes?.trim() || null,
      status:       'scheduled',
      source:       'manual',
      reminder_sent: false,
      created_at:   now,
      updated_at:   now,
    })
    .select()
    .single();

  if (error) {
    // Column may not exist yet — retry without source field
    if (error.message.includes('source')) {
      const { data: d2, error: e2 } = await supabaseAdmin
        .from('appointments')
        .insert({
          clinic_id:    ctx.clinic_id,
          patient_name: patient_name.trim(),
          phone:        phone?.trim() || null,
          service:      service?.trim() || null,
          start_time,
          end_time,
          notes:        notes?.trim() || null,
          status:       'scheduled',
          reminder_sent: false,
          created_at:   now,
          updated_at:   now,
        })
        .select()
        .single();
      if (e2) return NextResponse.json({ error: 'Error al crear cita' }, { status: 500, headers: NO_CACHE });
      return NextResponse.json({ ...d2, source: 'manual' }, { status: 201, headers: NO_CACHE });
    }
    return NextResponse.json({ error: 'Error al crear cita' }, { status: 500, headers: NO_CACHE });
  }

  return NextResponse.json(data, { status: 201, headers: NO_CACHE });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { id, status, payment_status, payment_amount } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Build update payload — supports status update, payment update, or both
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    updates.status = status;
  }

  if (payment_status !== undefined) {
    if (!VALID_PAYMENT_STATUS.includes(payment_status))
      return NextResponse.json({ error: `payment_status must be one of: ${VALID_PAYMENT_STATUS.join(', ')}` }, { status: 400 });
    updates.payment_status = payment_status;
    // Reset reminder flag when payment is resolved
    if (payment_status === 'paid' || payment_status === 'waived') {
      updates.payment_reminder_sent = false;
    }
  }

  if (payment_amount !== undefined) {
    updates.payment_amount = payment_amount === null ? null : Number(payment_amount);
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Error al actualizar cita' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data, { headers: NO_CACHE });
}

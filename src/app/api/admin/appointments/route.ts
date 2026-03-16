import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const VALID_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const from   = searchParams.get('from');
  const to     = searchParams.get('to');
  const limit  = parseInt(searchParams.get('limit') || '500');

  let query = supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('clinic_id', ctx.clinic_id)
    .order('start_time', { ascending: true })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (from)   query = query.gte('start_time', from);
  if (to)     query = query.lt('start_time', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
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
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500, headers: NO_CACHE });
      return NextResponse.json({ ...d2, source: 'manual' }, { status: 201, headers: NO_CACHE });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  }

  return NextResponse.json(data, { status: 201, headers: NO_CACHE });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { id, status } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data, { headers: NO_CACHE });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

const VALID_SLOT_DURATIONS = [15, 20, 30, 45, 60];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { data, error } = await supabaseAdmin
    .rpc('list_doctors', { p_clinic_id: ctx.clinic_id });

  if (error) return NextResponse.json({ error: 'Error al obtener doctores' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data || [], { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { first_name, last_name, specialty, display_name, bio, weekly_schedule, slot_duration_min } = body;

  if (!first_name?.trim()) return NextResponse.json({ error: 'first_name required' }, { status: 400 });
  if (!last_name?.trim())  return NextResponse.json({ error: 'last_name required' }, { status: 400 });
  if (!specialty?.trim())  return NextResponse.json({ error: 'specialty required' }, { status: 400 });

  const duration = slot_duration_min ? Number(slot_duration_min) : 30;
  if (!VALID_SLOT_DURATIONS.includes(duration))
    return NextResponse.json({ error: `slot_duration_min must be one of: ${VALID_SLOT_DURATIONS.join(', ')}` }, { status: 400 });

  if (!Array.isArray(weekly_schedule))
    return NextResponse.json({ error: 'weekly_schedule must be an array' }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .insert({
      clinic_id:        ctx.clinic_id,
      first_name:       first_name.trim(),
      last_name:        last_name.trim(),
      specialty:        specialty.trim(),
      display_name:     display_name?.trim() || null,
      bio:              bio?.trim() || null,
      weekly_schedule:  weekly_schedule,
      slot_duration_min: duration,
      active:           true,
      created_at:       now,
      updated_at:       now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Error al crear doctor' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data, { status: 201, headers: NO_CACHE });
}

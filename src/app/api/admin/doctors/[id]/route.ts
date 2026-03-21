import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const VALID_SLOT_DURATIONS = [15, 20, 30, 45, 60];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('*')
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404, headers: NO_CACHE });
  return NextResponse.json(data, { headers: NO_CACHE });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.first_name !== undefined)      updates.first_name       = body.first_name.trim();
  if (body.last_name !== undefined)       updates.last_name        = body.last_name.trim();
  if (body.specialty !== undefined)       updates.specialty        = body.specialty.trim();
  if (body.display_name !== undefined)    updates.display_name     = body.display_name?.trim() || null;
  if (body.bio !== undefined)             updates.bio              = body.bio?.trim() || null;
  if (body.weekly_schedule !== undefined) updates.weekly_schedule  = body.weekly_schedule;
  if (body.active !== undefined)          updates.active           = Boolean(body.active);

  if (body.slot_duration_min !== undefined) {
    const duration = Number(body.slot_duration_min);
    if (!VALID_SLOT_DURATIONS.includes(duration))
      return NextResponse.json({ error: `slot_duration_min must be one of: ${VALID_SLOT_DURATIONS.join(', ')}` }, { status: 400 });
    updates.slot_duration_min = duration;
  }

  const { data, error } = await supabaseAdmin
    .from('doctors')
    .update(updates)
    .eq('id', id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Error al actualizar doctor' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data, { headers: NO_CACHE });
}

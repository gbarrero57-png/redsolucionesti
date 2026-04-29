import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const { searchParams } = new URL(req.url);
  const include_done = searchParams.get('include_done') === '1';

  let q = supabaseAdmin
    .from('patient_reminders')
    .select('id, title, due_date, completed, completed_at, created_by_name, created_at')
    .eq('clinic_id', ctx.clinic_id)
    .eq('patient_id', patient_id)
    .order('due_date', { ascending: true })
    .limit(50);

  if (!include_done) q = q.eq('completed', false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data ?? [], { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const body = await req.json();
  const { title, due_date } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });
  if (!due_date)       return NextResponse.json({ error: 'due_date required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('patient_reminders')
    .insert({
      clinic_id:       ctx.clinic_id,
      patient_id,
      title:           title.trim(),
      due_date,
      created_by_name: ctx.user?.email ?? null,
    })
    .select('id, title, due_date, completed, created_by_name, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data, { status: 201, headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const body = await req.json();
  const { reminder_id, completed } = body;

  if (!reminder_id) return NextResponse.json({ error: 'reminder_id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (completed === true)  { updates.completed = true;  updates.completed_at = new Date().toISOString(); }
  if (completed === false) { updates.completed = false; updates.completed_at = null; }

  const { data, error } = await supabaseAdmin
    .from('patient_reminders')
    .update(updates)
    .eq('id', reminder_id)
    .eq('patient_id', patient_id)
    .eq('clinic_id', ctx.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const { searchParams } = new URL(req.url);
  const reminder_id = searchParams.get('reminder_id');

  if (!reminder_id) return NextResponse.json({ error: 'reminder_id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('patient_reminders')
    .delete()
    .eq('id', reminder_id)
    .eq('patient_id', patient_id)
    .eq('clinic_id', ctx.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json({ ok: true }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

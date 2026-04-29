import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;

  const { data, error } = await supabaseAdmin
    .from('patient_notes')
    .select('id, content, created_by_name, created_at, updated_at')
    .eq('clinic_id', ctx.clinic_id)
    .eq('patient_id', patient_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json(data ?? [], { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { id: patient_id } = await params;
  const body = await req.json();
  const content = body.content?.trim();

  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('patient_notes')
    .insert({
      clinic_id:       ctx.clinic_id,
      patient_id,
      content,
      created_by_name: ctx.user?.email ?? null,
    })
    .select('id, content, created_by_name, created_at')
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
  const { note_id, content } = body;

  if (!note_id || !content?.trim())
    return NextResponse.json({ error: 'note_id and content required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('patient_notes')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', note_id)
    .eq('patient_id', patient_id)
    .eq('clinic_id', ctx.clinic_id)
    .select('id, content, created_by_name, created_at, updated_at')
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
  const note_id = searchParams.get('note_id');

  if (!note_id) return NextResponse.json({ error: 'note_id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('patient_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', note_id)
    .eq('patient_id', patient_id)
    .eq('clinic_id', ctx.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  const res = NextResponse.json({ ok: true }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

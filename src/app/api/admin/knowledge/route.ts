import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('*')
      .eq('clinic_id', ctx.clinic_id)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || [], { headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: 'Error al obtener base de conocimiento' }, { status: 500, headers: NO_CACHE });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { question, answer, category, tags, active } = body;
  if (!question || !answer) {
    return NextResponse.json({ error: 'question and answer required' }, { status: 400 });
  }
  // Sanitizar tags: solo strings, máx 20 tags, máx 50 chars c/u
  const safeTags = Array.isArray(tags)
    ? tags.map(String).filter(t => t.length <= 50).slice(0, 20)
    : [];

  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert({
        question: String(question).slice(0, 500),
        answer: String(answer).slice(0, 2000),
        category: category ? String(category).slice(0, 100) : 'general',
        keywords: safeTags,
        metadata: {},
        active: active !== false,
        clinic_id: ctx.clinic_id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201, headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: 'Error al crear entrada' }, { status: 500, headers: NO_CACHE });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { id, question, answer, category, tags, active } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (question !== undefined) safeUpdates.question = String(question).slice(0, 500);
  if (answer   !== undefined) safeUpdates.answer   = String(answer).slice(0, 2000);
  if (category !== undefined) safeUpdates.category = category ? String(category).slice(0, 100) : null;
  if (tags     !== undefined) safeUpdates.keywords = Array.isArray(tags) ? tags.map(String).filter(t => t.length <= 50).slice(0, 20) : [];
  if (active   !== undefined) safeUpdates.active   = Boolean(active);

  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .update(safeUpdates)
      .eq('id', id)
      .eq('clinic_id', ctx.clinic_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: 'Error al actualizar entrada' }, { status: 500, headers: NO_CACHE });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const { error } = await supabaseAdmin
      .from('knowledge_base')
      .delete()
      .eq('id', id)
      .eq('clinic_id', ctx.clinic_id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: NO_CACHE });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar entrada' }, { status: 500, headers: NO_CACHE });
  }
}

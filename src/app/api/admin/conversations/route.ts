import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const VALID_CONV_STATUS = ['active', 'human', 'closed', 'paused'];

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get('status');
  const status = rawStatus && VALID_CONV_STATUS.includes(rawStatus) ? rawStatus : null;
  const limit  = Math.min(Math.max(parseInt(searchParams.get('limit')  || '100') || 100, 1), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0')  || 0, 0);

  const { data, error } = await supabaseAdmin.rpc('list_conversations', {
    p_clinic_id: ctx.clinic_id,
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) return NextResponse.json({ error: 'Error al obtener conversaciones' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data || [], { headers: NO_CACHE });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const { action, conversation_id } = body;

  let result;
  if (action === 'pause') {
    result = await supabaseAdmin.rpc('pause_conversation', { p_conversation_id: conversation_id, p_clinic_id: ctx.clinic_id, p_user_role: ctx.role });
  } else if (action === 'resume') {
    result = await supabaseAdmin.rpc('resume_conversation', { p_conversation_id: conversation_id, p_clinic_id: ctx.clinic_id, p_user_role: ctx.role });
  } else if (action === 'close') {
    result = await supabaseAdmin.rpc('close_conversation', { p_conversation_id: conversation_id, p_clinic_id: ctx.clinic_id, p_user_role: ctx.role });
  } else if (action === 'assign') {
    result = await supabaseAdmin.rpc('assign_conversation', { p_conversation_id: conversation_id, p_clinic_id: ctx.clinic_id, p_assigned_user_id: body.assigned_user_id, p_user_role: ctx.role });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (result.error) return NextResponse.json({ error: 'Error al procesar acción' }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(result.data, { headers: NO_CACHE });
}

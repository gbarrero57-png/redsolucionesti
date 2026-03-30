import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// GET: devuelve los campos editables del bot_config
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('bot_config')
    .eq('id', ctx.clinic_id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });

  const cfg = data.bot_config || {};
  return NextResponse.json({
    welcome_message:    cfg.welcome_message    ?? '',
    escalation_message: cfg.escalation_message ?? '',
  }, { headers: NO_CACHE });
}

// PATCH: permite editar welcome_message y escalation_message
export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json();
  const allowed = ['welcome_message', 'escalation_message'] as const;

  // Fetch current bot_config
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('clinics')
    .select('bot_config')
    .eq('id', ctx.clinic_id)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_CACHE });

  const newCfg = { ...current.bot_config };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      newCfg[key] = String(body[key]).slice(0, 500);
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('clinics')
    .update({ bot_config: newCfg })
    .eq('id', ctx.clinic_id);

  if (updateErr) return NextResponse.json({ error: 'Error al guardar' }, { status: 500, headers: NO_CACHE });

  return NextResponse.json({ success: true }, { headers: NO_CACHE });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext, applyRefreshedToken } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const N8N_WEBHOOK = 'https://workflows.n8n.redsolucionesti.com/webhook/sofia-debt-reminder';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { data, error } = await supabaseAdmin.rpc('get_clinic_reminder_stats', {
    p_clinic_id: ctx.clinic_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  const row = Array.isArray(data) ? data[0] : data;
  const res = NextResponse.json(row ?? { sent_today: 0, sent_7days: 0, last_sent_at: null }, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const body = await req.json().catch(() => ({}));
  const dry_run         = body.dry_run === true;
  const min_overdue_days = Number(body.min_overdue_days ?? 1);

  // Fire n8n webhook — collect and return the result
  let result: unknown;
  try {
    const r = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic_id: ctx.clinic_id, dry_run, min_overdue_days }),
    });
    result = await r.json();
  } catch (err) {
    return NextResponse.json({ error: 'No se pudo contactar el workflow de recordatorios', detail: String(err) }, { status: 502, headers: NO_CACHE });
  }

  const res = NextResponse.json(result, { headers: NO_CACHE });
  return applyRefreshedToken(res, ctx);
}

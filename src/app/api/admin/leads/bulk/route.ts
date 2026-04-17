import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function PATCH(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { ids, updates } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'No ids provided' }, { status: 400, headers: NO_CACHE });

  const allowed = ['status', 'whatsapp_enviado'];
  const safe: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) safe[key] = updates[key];
  }
  if (Object.keys(safe).length === 0)
    return NextResponse.json({ error: 'No valid fields' }, { status: 400, headers: NO_CACHE });

  const { error } = await supabaseAdmin
    .from('leads')
    .update(safe)
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  return NextResponse.json({ updated: ids.length }, { headers: NO_CACHE });
}

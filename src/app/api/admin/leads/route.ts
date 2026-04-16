import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page    = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit   = 50;
  const offset  = (page - 1) * limit;
  const search  = searchParams.get('q')?.trim() || '';
  const status  = searchParams.get('status') || '';
  const ciudad  = searchParams.get('ciudad') || '';
  const fuente  = searchParams.get('fuente') || '';
  const sortBy  = searchParams.get('sort') || 'created_at';
  const sortDir = searchParams.get('dir') === 'asc';

  let query = supabaseAdmin
    .from('leads')
    .select('id,nombre,email,telefono,ciudad,distrito,status,score_relevancia,rating,total_resenas,fuente,fecha_envio,created_at,notas', { count: 'exact' });

  if (search) {
    query = query.or(
      `nombre.ilike.%${search}%,email.ilike.%${search}%,telefono.ilike.%${search}%,ciudad.ilike.%${search}%,distrito.ilike.%${search}%`
    );
  }
  if (status)  query = query.eq('status', status);
  if (ciudad)  query = query.eq('ciudad', ciudad);
  if (fuente)  query = query.contains('fuente', [fuente]);

  const allowed = ['created_at', 'score_relevancia', 'nombre', 'ciudad', 'rating', 'total_resenas', 'fecha_envio'];
  const col = allowed.includes(sortBy) ? sortBy : 'created_at';
  query = query.order(col, { ascending: sortDir }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });

  return NextResponse.json(
    { leads: data || [], total: count ?? 0, page, limit },
    { headers: NO_CACHE }
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// GET /api/admin/reports — list past reports
// Super admin: pass ?clinic_id=... or get all
// Regular admin: own clinic only
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const clinic_id = searchParams.get('clinic_id') || ctx.clinic_id;

  let query = supabaseAdmin
    .from('monthly_reports')
    .select('id, clinic_id, month, pdf_url, email_to, sent_at, metrics, created_at')
    .order('month', { ascending: false })
    .limit(24);

  if (clinic_id) {
    query = query.eq('clinic_id', clinic_id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE });
  return NextResponse.json(data || [], { headers: NO_CACHE });
}

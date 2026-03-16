import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const clinic_id = searchParams.get('clinic_id');
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 });

  // Clinic info
  const { data: clinic, error: clinicErr } = await supabaseAdmin
    .from('clinics')
    .select('*')
    .eq('id', clinic_id)
    .single();
  if (clinicErr || !clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });

  // Staff records
  const { data: staffRows } = await supabaseAdmin
    .from('staff')
    .select('id, user_id, full_name, role, active, created_at')
    .eq('clinic_id', clinic_id)
    .order('created_at', { ascending: true });

  // Fetch auth emails for each staff member
  const staffWithEmail = await Promise.all((staffRows || []).map(async (s) => {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(s.user_id);
    return {
      id: s.id,
      user_id: s.user_id,
      full_name: s.full_name,
      email: user?.email ?? '—',
      role: s.role,
      active: s.active,
      created_at: s.created_at,
      last_sign_in: user?.last_sign_in_at ?? null,
    };
  }));

  // KB summary
  const { data: kbRows } = await supabaseAdmin
    .from('knowledge_base')
    .select('id, question, category, active, created_at')
    .eq('clinic_id', clinic_id)
    .order('category', { ascending: true });

  // KB categories grouped
  const kbByCategory: Record<string, number> = {};
  for (const k of kbRows || []) {
    const cat = k.category || 'general';
    kbByCategory[cat] = (kbByCategory[cat] || 0) + 1;
  }

  // Recent conversations (last 20)
  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select('id, chatwoot_conversation_id, patient_name, status, bot_paused, last_message, last_activity_at, created_at')
    .eq('clinic_id', clinic_id)
    .order('last_activity_at', { ascending: false })
    .limit(20);

  // Recent appointments (last 20)
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('id, patient_name, patient_phone, date_time, service, status, notes, created_at')
    .eq('clinic_id', clinic_id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Appointment status counts (all time)
  const { data: allAppts } = await supabaseAdmin
    .from('appointments')
    .select('status')
    .eq('clinic_id', clinic_id);

  const apptCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const a of allAppts || []) {
    const s = a.status as keyof typeof apptCounts;
    if (s in apptCounts) apptCounts[s]++;
  }

  // Conversation counts (all time)
  const { data: allConvs } = await supabaseAdmin
    .from('conversations')
    .select('status, bot_paused')
    .eq('clinic_id', clinic_id);

  const convCounts = {
    total: (allConvs || []).length,
    active: (allConvs || []).filter(c => c.status === 'active' && !c.bot_paused).length,
    human: (allConvs || []).filter(c => c.bot_paused && c.status !== 'closed').length,
    closed: (allConvs || []).filter(c => c.status === 'closed').length,
  };

  return NextResponse.json({
    clinic,
    staff: staffWithEmail,
    kb: {
      total: (kbRows || []).length,
      active: (kbRows || []).filter(k => k.active).length,
      by_category: kbByCategory,
      entries: kbRows || [],
    },
    conversations: {
      counts: convCounts,
      recent: conversations || [],
    },
    appointments: {
      counts: apptCounts,
      recent: appointments || [],
    },
  }, { headers: NO_CACHE });
}

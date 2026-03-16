import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ctx.is_superadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get('days') || '30'), 365);
  const periodStart = new Date(Date.now() - days * 86400000).toISOString();

  // All clinics
  const { data: clinics, error: clinicsErr } = await supabaseAdmin
    .from('clinics')
    .select('id, name, subdomain, active, created_at')
    .order('created_at', { ascending: true });

  if (clinicsErr) return NextResponse.json({ error: clinicsErr.message }, { status: 500, headers: NO_CACHE });

  // For each clinic, gather metrics in parallel
  const results = await Promise.all((clinics || []).map(async (clinic) => {
    const [convsRes, apptsRes, staffRes, kbRes] = await Promise.all([
      supabaseAdmin.from('conversations')
        .select('status, bot_paused')
        .eq('clinic_id', clinic.id),
      supabaseAdmin.from('appointments')
        .select('status, created_at')
        .eq('clinic_id', clinic.id)
        .gte('created_at', periodStart),
      supabaseAdmin.from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id)
        .eq('active', true),
      supabaseAdmin.from('knowledge_base')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id),
    ]);

    const convs = convsRes.data || [];
    const appts = apptsRes.data || [];

    const total_conversations    = convs.length;
    const active_conversations   = convs.filter(c => c.status === 'active' && !c.bot_paused).length;
    const closed_conversations   = convs.filter(c => c.status === 'closed').length;
    const human_now              = convs.filter(c => c.bot_paused && c.status !== 'closed').length;
    const ever_escalated         = convs.filter(c => c.bot_paused).length;

    const total_appointments     = appts.length;
    const cancelled_appointments = appts.filter(a => a.status === 'cancelled').length;
    const confirmed_appointments = appts.filter(a => a.status === 'confirmed').length;
    const completed_appointments = appts.filter(a => a.status === 'completed').length;

    const base              = total_conversations > 0 ? total_conversations : 1;
    const conversion_rate   = Math.round((total_appointments / base) * 100);
    const escalation_rate   = Math.round((ever_escalated / base) * 100);
    const cancellation_rate = total_appointments > 0
      ? Math.round((cancelled_appointments / total_appointments) * 100)
      : 0;

    return {
      clinic_id:   clinic.id,
      name:        clinic.name,
      subdomain:   clinic.subdomain,
      active:      clinic.active,
      created_at:  clinic.created_at,
      // Conversations
      total_conversations,
      active_conversations,
      closed_conversations,
      human_now,
      ever_escalated,
      // Appointments (filtered by period)
      total_appointments,
      confirmed_appointments,
      completed_appointments,
      cancelled_appointments,
      // Rates
      conversion_rate,
      escalation_rate,
      cancellation_rate,
      // Infra
      staff_count: staffRes.count ?? 0,
      kb_count:    kbRes.count ?? 0,
    };
  }));

  // Platform totals
  const totals = results.reduce((acc, c) => ({
    total_conversations:    acc.total_conversations    + c.total_conversations,
    active_conversations:   acc.active_conversations   + c.active_conversations,
    human_now:              acc.human_now              + c.human_now,
    total_appointments:     acc.total_appointments     + c.total_appointments,
    ever_escalated:         acc.ever_escalated         + c.ever_escalated,
    cancelled_appointments: acc.cancelled_appointments + c.cancelled_appointments,
    staff_count:            acc.staff_count            + c.staff_count,
  }), {
    total_conversations: 0, active_conversations: 0, human_now: 0,
    total_appointments: 0, ever_escalated: 0, cancelled_appointments: 0, staff_count: 0,
  });

  return NextResponse.json({
    period_days: days,
    clinic_count: results.length,
    totals,
    clinics: results,
  }, { headers: NO_CACHE });
}

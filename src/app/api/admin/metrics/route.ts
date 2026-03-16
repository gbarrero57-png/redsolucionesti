import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30');

  try {
    const periodStart = new Date(Date.now() - days * 86400000).toISOString();

    const [convsRes, apptsRes, metricsRowsRes] = await Promise.all([
      supabaseAdmin
        .from('conversations')
        .select('status, bot_paused, created_at')
        .eq('clinic_id', ctx.clinic_id),
      supabaseAdmin
        .from('appointments')
        .select('status, created_at')
        .eq('clinic_id', ctx.clinic_id),
      supabaseAdmin
        .from('conversation_metrics')
        .select('intent, booked, escalated, response_time_ms, created_at')
        .eq('clinic_id', ctx.clinic_id)
        .gte('created_at', periodStart),
    ]);

    const convs       = convsRes.data       || [];
    const appts       = apptsRes.data       || [];
    const metricsRows = metricsRowsRes.data || [];

    // ── Conversations (source of truth: conversations table) ──────────────
    const total_conversations_all = convs.length;
    const active_conversations    = convs.filter(c => c.status === 'active' && !c.bot_paused).length;
    const closed_conversations    = convs.filter(c => c.status === 'closed').length;
    // "paused NOW" = bot_paused AND not closed (agent actively handling)
    const paused_conversations    = convs.filter(c => c.bot_paused && c.status !== 'closed').length;
    // "escalated_total" = ever paused (includes resolved/closed) → escalation rate
    const ever_escalated          = convs.filter(c => c.bot_paused).length;

    // ── Appointments (source of truth: appointments table) ────────────────
    const countAppt = (s: string) => appts.filter(a => a.status === s).length;
    const total_appointments       = appts.length;
    const scheduled_appointments   = countAppt('scheduled');
    const confirmed_appointments   = countAppt('confirmed');
    const completed_appointments   = countAppt('completed');
    const cancelled_appointments   = countAppt('cancelled');

    // ── Escalations: conversations table is the REAL source of truth.
    //    conversation_metrics.escalated is never set by n8n workflow.
    const escalated_from_metrics  = metricsRows.filter(m => m.escalated).length;
    const escalated_count         = Math.max(escalated_from_metrics, ever_escalated);

    // ── Rates (denominator = total_conversations_all for consistency) ─────
    const base = total_conversations_all > 0 ? total_conversations_all : 1;
    const conversion_rate  = Math.round((total_appointments  / base) * 100);
    const escalation_rate  = Math.round((escalated_count     / base) * 100);
    const cancellation_rate = total_appointments > 0
      ? Math.round((cancelled_appointments / total_appointments) * 100)
      : 0;

    // ── Response time: exclude null/zero (never set by n8n → return null) ─
    const timeRows = metricsRows.filter(m => m.response_time_ms !== null && m.response_time_ms > 0);
    const avg_response_time_ms = timeRows.length > 0
      ? Math.round(timeRows.reduce((s, m) => s + (m.response_time_ms as number), 0) / timeRows.length)
      : null;

    // ── Intent distribution ───────────────────────────────────────────────
    // Base: what n8n actually recorded in conversation_metrics
    const intent_distribution = metricsRows.reduce((acc, m) => {
      const k = m.intent || 'UNKNOWN';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Enrich: escalated conversations = ESCALATE intent (net of already-recorded ones)
    const unrecorded_escalations = ever_escalated - escalated_from_metrics;
    if (unrecorded_escalations > 0) {
      intent_distribution['ESCALATE'] = (intent_distribution['ESCALATE'] || 0) + unrecorded_escalations;
    }
    // Booked conversations = AGENDAR intent (net of already-classified ones)
    const already_agendar = intent_distribution['AGENDAR'] || intent_distribution['AGENDAR_CITA'] || 0;
    const unrecorded_bookings = total_appointments - already_agendar;
    if (unrecorded_bookings > 0) {
      intent_distribution['AGENDAR'] = (intent_distribution['AGENDAR'] || 0) + unrecorded_bookings;
    }

    // total_ai_conversations = recorded metric rows (for display context only)
    const total_ai_conversations = metricsRows.length;

    return NextResponse.json({
      period_days: days,
      // Conversation totals (from conversations table — accurate)
      total_conversations_all,
      active_conversations,
      paused_conversations,
      closed_conversations,
      // AI metric rows recorded (may be < total_conversations_all)
      total_conversations: total_ai_conversations,
      // Appointments (from appointments table — accurate)
      total_appointments,
      total_bookings: total_appointments,
      scheduled_appointments,
      confirmed_appointments,
      completed_appointments,
      cancelled_appointments,
      // Escalations (from conversations table — accurate)
      escalated_count,          // total ever escalated (including closed ones)
      human_now: paused_conversations,  // currently with human agent (not closed)
      // Rates (all use total_conversations_all as denominator)
      conversion_rate,
      escalation_rate,
      cancellation_rate,
      // Response time (null when not recorded)
      avg_response_time_ms,
      // Intent distribution (enriched with real data)
      intent_distribution,
    }, { headers: NO_CACHE });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_CACHE });
  }
}

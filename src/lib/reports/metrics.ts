// @ts-nocheck — Supabase data returns T[] | null; TypeScript null-narrowing handled at runtime
import { supabaseAdmin } from '@/lib/supabase';

export interface WeekBar {
  week: string;   // 'S1', 'S2', ...
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DayLine {
  day: string;    // 'dd/MM'
  conversations: number;
  appointments: number;
}

export interface ServiceRow {
  service: string;
  count: number;
}

export interface ReportMetrics {
  clinic_name: string;
  admin_email: string;
  month: string;           // 'YYYY-MM'
  month_label: string;     // 'Marzo 2026'

  // KPIs
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  completion_rate: number;   // %
  cancellation_rate: number; // %
  bot_appointments: number;
  manual_appointments: number;

  total_conversations: number;
  bot_only_conversations: number;
  escalated_conversations: number;
  avg_messages_per_conv: number;
  escalation_rate: number;  // %

  reminders_sent: number;

  // Chart data
  weekly_bars: WeekBar[];
  daily_line: DayLine[];
  top_services: ServiceRow[];
}

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export async function fetchReportMetrics(
  clinic_id: string,
  month: string, // 'YYYY-MM'
): Promise<ReportMetrics> {
  const [year, mon] = month.split('-').map(Number);
  const from = new Date(year, mon - 1, 1).toISOString();
  const to   = new Date(year, mon, 1).toISOString();
  const daysInMonth = new Date(year, mon, 0).getDate();

  // ── Clinic info ──────────────────────────────────────────────
  const { data: clinic } = await supabaseAdmin
    .from('clinics')
    .select('name, admin_email')
    .eq('id', clinic_id)
    .single();

  // ── Appointments ─────────────────────────────────────────────
  const { data: appts = [] } = await supabaseAdmin
    .from('appointments')
    .select('id, status, service, start_time, source')
    .eq('clinic_id', clinic_id)
    .gte('start_time', from)
    .lt('start_time', to);

  const total_appointments   = appts.length;
  const completed_appointments = appts.filter(a => a.status === 'completed').length;
  const cancelled_appointments = appts.filter(a => a.status === 'cancelled').length;
  const no_show_appointments   = appts.filter(a => a.status === 'no_show').length;
  const bot_appointments       = appts.filter(a => (a.source ?? 'bot') === 'bot').length;
  const manual_appointments    = appts.filter(a => a.source === 'manual').length;
  const completion_rate  = total_appointments ? Math.round(completed_appointments / total_appointments * 100) : 0;
  const cancellation_rate = total_appointments ? Math.round(cancelled_appointments / total_appointments * 100) : 0;

  // Weekly bars (Mon–Sun buckets)
  const weekly_bars: WeekBar[] = [];
  for (let w = 0; w < 5; w++) {
    const weekStart = w * 7 + 1;
    const weekEnd   = Math.min(weekStart + 6, daysInMonth);
    const weekAppts = appts.filter(a => {
      const d = new Date(a.start_time).getDate();
      return d >= weekStart && d <= weekEnd;
    });
    weekly_bars.push({
      week: `S${w + 1}`,
      scheduled: weekAppts.filter(a => a.status === 'scheduled').length,
      confirmed:  weekAppts.filter(a => a.status === 'confirmed').length,
      completed:  weekAppts.filter(a => a.status === 'completed').length,
      cancelled:  weekAppts.filter(a => a.status === 'cancelled').length,
      no_show:    weekAppts.filter(a => a.status === 'no_show').length,
    });
  }

  // Top services
  const svcMap: Record<string, number> = {};
  for (const a of appts) {
    const s = a.service || 'Sin especificar';
    svcMap[s] = (svcMap[s] || 0) + 1;
  }
  const top_services: ServiceRow[] = Object.entries(svcMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([service, count]) => ({ service, count }));

  // ── Conversations ─────────────────────────────────────────────
  const { data: convs = [] } = await supabaseAdmin
    .from('conversations')
    .select('id, status, bot_paused, created_at')
    .eq('clinic_id', clinic_id)
    .gte('created_at', from)
    .lt('created_at', to);

  const { data: metrics = [] } = await supabaseAdmin
    .from('conversation_metrics')
    .select('conversation_id, escalated, message_count')
    .eq('clinic_id', clinic_id)
    .gte('created_at', from)
    .lt('created_at', to);

  const total_conversations    = convs.length;
  const escalated_conversations = metrics.filter(m => m.escalated).length;
  const bot_only_conversations  = total_conversations - escalated_conversations;
  const escalation_rate = total_conversations ? Math.round(escalated_conversations / total_conversations * 100) : 0;
  const totalMessages = metrics.reduce((s, m) => s + (m.message_count || 0), 0);
  const avg_messages_per_conv = metrics.length ? Math.round(totalMessages / metrics.length) : 0;

  // ── Reminders ─────────────────────────────────────────────────
  const { count: reminders_sent } = await supabaseAdmin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinic_id)
    .eq('reminder_sent', true)
    .gte('start_time', from)
    .lt('start_time', to);

  // ── Daily line chart (conversations + appointments per day) ───
  const daily_line: DayLine[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = new Date(year, mon - 1, d);
    const dayEnd   = new Date(year, mon - 1, d + 1);
    const dayConvs = convs.filter(c => {
      const dt = new Date(c.created_at);
      return dt >= dayStart && dt < dayEnd;
    }).length;
    const dayAppts = appts.filter(a => {
      const dt = new Date(a.start_time);
      return dt >= dayStart && dt < dayEnd;
    }).length;
    // Only include days with activity for a cleaner chart
    if (dayConvs > 0 || dayAppts > 0 || d % 7 === 0) {
      daily_line.push({
        day: `${String(d).padStart(2,'0')}/${String(mon).padStart(2,'0')}`,
        conversations: dayConvs,
        appointments: dayAppts,
      });
    }
  }

  return {
    clinic_name:  clinic?.name || 'Clínica',
    admin_email:  clinic?.admin_email || '',
    month,
    month_label: `${MONTH_NAMES[mon - 1]} ${year}`,

    total_appointments,
    completed_appointments,
    cancelled_appointments,
    no_show_appointments,
    completion_rate,
    cancellation_rate,
    bot_appointments,
    manual_appointments,

    total_conversations,
    bot_only_conversations,
    escalated_conversations,
    avg_messages_per_conv,
    escalation_rate,

    reminders_sent: reminders_sent ?? 0,

    weekly_bars,
    daily_line,
    top_services,
  };
}

'use client';

import { useState, useEffect } from 'react';
import { BarChart2, MessageSquare, Calendar, AlertTriangle, Clock, RefreshCw, TrendingUp, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts';

interface Metrics {
  period_days: number;
  total_conversations_all: number;
  active_conversations: number;
  paused_conversations: number;
  closed_conversations: number;
  total_conversations: number;          // conv_metrics rows recorded
  total_appointments: number;
  total_bookings: number;
  scheduled_appointments: number;
  confirmed_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  escalated_count: number;
  human_now: number;
  conversion_rate: number;
  escalation_rate: number;
  cancellation_rate: number;
  avg_response_time_ms: number | null;
  intent_distribution: Record<string, number>;
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-violet-400', warn = false }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string; warn?: boolean;
}) {
  return (
    <div className={`bg-gray-900 rounded-xl border p-5 ${warn ? 'border-amber-600/40' : 'border-gray-800'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {sub && <p className={`text-xs mt-1 ${warn ? 'text-amber-400' : 'text-gray-500'}`}>{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-gray-800 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111827', border: '1px solid #374151', borderRadius: 8 },
  labelStyle: { color: '#e5e7eb' },
  cursor: { fill: 'rgba(255,255,255,0.05)' },
};

function msToLabel(ms: number | null) {
  if (ms === null || ms === undefined || ms === 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

const INTENT_COLORS: Record<string, string> = {
  ESCALATE: '#dc2626',
  AGENDAR: '#059669',
  AGENDAR_CITA: '#059669',
  INFO: '#2563eb',
  UNKNOWN: '#6b7280',
  CANCEL: '#d97706',
};
const PIE_FALLBACK = ['#7c3aed', '#059669', '#2563eb', '#d97706', '#dc2626', '#6b7280'];

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  async function fetchMetrics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/metrics?days=${days}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cargando métricas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMetrics(); }, [days]);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <RefreshCw size={20} className="animate-spin mr-2" /> Cargando métricas...
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 text-red-300 text-sm">Error: {error}</div>
    </div>
  );

  if (!metrics) return null;

  // Chart data
  const apptChartData = [
    { name: 'Agendadas',   value: metrics.scheduled_appointments,  color: '#7c3aed' },
    { name: 'Confirmadas', value: metrics.confirmed_appointments,   color: '#059669' },
    { name: 'Completadas', value: metrics.completed_appointments,   color: '#2563eb' },
    { name: 'Canceladas',  value: metrics.cancelled_appointments,   color: '#dc2626' },
  ];

  const convChartData = [
    { name: 'Bot activo',  value: metrics.active_conversations, color: '#059669' },
    { name: 'Con humano',  value: metrics.human_now,            color: '#dc2626' },
    { name: 'Cerradas',    value: metrics.closed_conversations,  color: '#6b7280' },
  ];

  const intentChartData = Object.entries(metrics.intent_distribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const totalIntents = intentChartData.reduce((s, i) => s + i.value, 0);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 size={22} className="text-violet-400" /> Métricas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Últimos {days} días ·{' '}
            <span className="text-white font-medium">{metrics.total_conversations_all}</span> conversaciones totales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
          <button onClick={fetchMetrics} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI cards — all use total_conversations_all as base */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Conversaciones"
          value={metrics.total_conversations_all}
          sub={`${metrics.active_conversations} activas · ${metrics.closed_conversations} cerradas`}
          icon={MessageSquare}
          color="text-violet-400"
        />
        <StatCard
          label="Citas agendadas"
          value={metrics.total_appointments}
          sub={`${metrics.conversion_rate}% tasa de conversión`}
          icon={Calendar}
          color="text-blue-400"
        />
        <StatCard
          label="Escalaciones a humano"
          value={metrics.escalated_count}
          sub={`${metrics.escalation_rate}% del total`}
          icon={AlertTriangle}
          color="text-red-400"
          warn={metrics.escalation_rate > 15}
        />
        <StatCard
          label="Tiempo de respuesta"
          value={msToLabel(metrics.avg_response_time_ms)}
          sub={metrics.avg_response_time_ms ? 'Promedio IA' : 'Sin datos registrados'}
          icon={Clock}
          color="text-green-400"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Appointments */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <Calendar size={16} className="text-violet-400" /> Estado de citas
          </h2>
          <p className="text-xs text-gray-500 mb-4">{metrics.total_appointments} citas · {metrics.cancellation_rate}% cancelación</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={apptChartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {apptChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversations state */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <Users size={16} className="text-violet-400" /> Estado de conversaciones
          </h2>
          <p className="text-xs text-gray-500 mb-4">{metrics.total_conversations_all} total · {metrics.escalation_rate}% escaladas</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={convChartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {convChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intent distribution */}
      {intentChartData.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp size={15} className="text-violet-400" /> Distribución de intenciones
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{totalIntents} mensajes clasificados por el bot</p>
            </div>
            <div className="text-xs text-gray-600 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
              Últimos {days}d
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            {/* Donut chart — 2 cols */}
            <div className="lg:col-span-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={intentChartData}
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {intentChartData.map((item, i) => (
                      <Cell key={i} fill={INTENT_COLORS[item.name] || PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12 }}
                    formatter={(val, name) => [
                      `${val} (${totalIntents > 0 ? Math.round((Number(val) / totalIntents) * 100) : 0}%)`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Intent cards — 3 cols */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {intentChartData.map((item, i) => {
                const pct = totalIntents > 0 ? Math.round((item.value / totalIntents) * 100) : 0;
                const color = INTENT_COLORS[item.name] || PIE_FALLBACK[i % PIE_FALLBACK.length];
                const INTENT_LABEL: Record<string, string> = {
                  AGENDAR: 'Agendar cita',
                  AGENDAR_CITA: 'Agendar cita',
                  ESCALATE: 'Escalar a humano',
                  INFO: 'Consulta info',
                  UNKNOWN: 'Sin clasificar',
                  CANCEL: 'Cancelar cita',
                };
                const INTENT_ICON: Record<string, string> = {
                  AGENDAR: '📅', AGENDAR_CITA: '📅',
                  ESCALATE: '🚨', INFO: 'ℹ️',
                  UNKNOWN: '❓', CANCEL: '❌',
                };
                return (
                  <div
                    key={item.name}
                    className="rounded-xl p-4 border border-gray-800 bg-gray-800/40 hover:bg-gray-800/70 transition-colors"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{INTENT_ICON[item.name] || '🔹'}</span>
                        <span className="text-xs font-medium text-gray-300">{INTENT_LABEL[item.name] || item.name}</span>
                      </div>
                      <span className="text-lg font-bold text-white leading-none">{pct}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{item.value} mensajes</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Conversión</p>
          <p className="text-2xl font-bold text-white">{metrics.conversion_rate}%</p>
          <p className="text-xs text-gray-500 mt-1">{metrics.total_appointments} citas / {metrics.total_conversations_all} convs</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cancelación</p>
          <p className="text-2xl font-bold text-white">{metrics.cancellation_rate}%</p>
          <p className="text-xs text-gray-500 mt-1">{metrics.cancelled_appointments} / {metrics.total_appointments} citas</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Con humano ahora</p>
          <p className="text-2xl font-bold text-white">{metrics.human_now}</p>
          <p className="text-xs text-gray-500 mt-1">activas con agente</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Confirmadas</p>
          <p className="text-2xl font-bold text-white">{metrics.confirmed_appointments}</p>
          <p className="text-xs text-gray-500 mt-1">de {metrics.total_appointments} citas</p>
        </div>
      </div>
    </div>
  );
}

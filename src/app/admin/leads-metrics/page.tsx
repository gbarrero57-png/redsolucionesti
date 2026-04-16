'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  Users, Phone, Mail, RefreshCw, MapPin, TrendingUp, Globe,
  Loader2, MessageCircle, Smartphone, Send,
} from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────── */
interface CiudadRow   { name: string; count: number; }
interface StatusRow   { name: string; value: number; }
interface FuenteRow   { name: string; value: number; }
interface DistritoRow { nombre: string; ciudad: string; count: number; }

interface Metrics {
  total:             number;
  con_telefono:      number;
  con_email:         number;
  con_ambos:         number;
  email_enviado:     number;
  whatsapp_enviado:  number;
  sms_enviado:       number;
  ciudades:          CiudadRow[];
  statuses:          StatusRow[];
  fuentes:           FuenteRow[];
  top_distritos:     DistritoRow[];
}

/* ─── Colors & Labels ─────────────────────────────────────────────── */
const CITY_COLORS = [
  '#7c3aed','#059669','#2563eb','#d97706','#0891b2',
  '#9333ea','#16a34a','#ea580c','#e11d48','#0284c7',
];
const STATUS_META: Record<string, { color: string; label: string }> = {
  sin_email:          { color: '#6b7280', label: 'Sin email' },
  nuevo:              { color: '#6366f1', label: 'Nuevo' },
  enviado:            { color: '#0891b2', label: 'Email enviado' },
  email_enviado:      { color: '#0891b2', label: 'Email enviado' },
  follow_up_enviado:  { color: '#059669', label: 'Follow-up enviado' },
  respondio:          { color: '#d97706', label: 'Respondió' },
  cerrado:            { color: '#16a34a', label: 'Cerrado / Cliente' },
  sin_estado:         { color: '#374151', label: 'Sin estado' },
};
const FUENTE_META: Record<string, { color: string; label: string }> = {
  google_maps: { color: '#4285F4', label: 'Google Maps' },
  meta_ads:    { color: '#1877F2', label: 'Meta Ads' },
  sin_fuente:  { color: '#6b7280', label: 'Sin fuente' },
};

function pct(n: number, of: number) {
  if (!of) return '0%';
  return `${Math.round((n / of) * 100)}%`;
}

/* ─── Custom Tooltip ──────────────────────────────────────────────── */
function BarTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-gray-300 font-medium">{label}</p>
      <p className="text-violet-400 font-bold">{payload[0].value.toLocaleString()} leads</p>
    </div>
  );
}

/* ─── StatCard ────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, sub, color = 'violet',
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet:  'bg-violet-500/10 border-violet-500/20 text-violet-400',
    green:   'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    cyan:    'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400',
    teal:    'bg-teal-500/10 border-teal-500/20 text-teal-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorMap[color] ?? colorMap.violet}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide leading-none">{label}</p>
        <p className="text-xl font-bold text-white mt-1 tabular-nums leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── District ranked list ────────────────────────────────────────── */
function DistritoList({ distritos, ciudades }: { distritos: DistritoRow[]; ciudades: CiudadRow[] }) {
  const cityIndex = Object.fromEntries(ciudades.map((c, i) => [c.name, i]));
  const max = distritos[0]?.count || 1;

  return (
    <div className="space-y-2">
      {distritos.map((d, i) => {
        const ci = cityIndex[d.ciudad] ?? i;
        const color = CITY_COLORS[ci % CITY_COLORS.length];
        const barPct = Math.round((d.count / max) * 100);
        return (
          <div key={`${d.nombre}-${d.ciudad}`} className="flex items-center gap-3 group">
            {/* Rank */}
            <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0 tabular-nums">
              {i + 1}
            </span>
            {/* Name + city */}
            <div className="w-44 flex-shrink-0 min-w-0">
              <span className="text-sm text-gray-200 truncate block leading-none">{d.nombre}</span>
              <span
                className="text-[10px] font-medium mt-0.5 inline-block px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}22`, color }}
              >
                {d.ciudad}
              </span>
            </div>
            {/* Bar */}
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${barPct}%`, backgroundColor: color }}
              />
            </div>
            {/* Count */}
            <span className="text-sm text-gray-300 font-medium tabular-nums w-8 text-right flex-shrink-0">
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function LeadsMetricsPage() {
  const router = useRouter();
  const [data, setData]       = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/leads-metrics');
      if (res.status === 401) { router.push('/admin/login'); return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || `Error ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
      <Loader2 size={28} className="animate-spin text-violet-500" />
      <p className="text-sm">Cargando métricas de leads…</p>
      <p className="text-xs text-gray-600">Puede tardar ~30s (paginando 2,300+ registros)</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-center max-w-md">
        <p className="text-red-400 font-semibold mb-1">Error al cargar</p>
        <p className="text-sm text-gray-500">{error}</p>
        {error.includes('AIRTABLE_TOKEN') && (
          <p className="text-xs text-amber-400 mt-3">
            Agrega <code className="bg-gray-800 px-1.5 py-0.5 rounded">AIRTABLE_TOKEN=patP...</code> en{' '}
            <code className="bg-gray-800 px-1.5 py-0.5 rounded">.env.local</code>
          </p>
        )}
      </div>
      <button onClick={load} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">
        Reintentar
      </button>
    </div>
  );

  if (!data) return null;

  const {
    total, con_telefono, con_email, con_ambos,
    email_enviado, whatsapp_enviado, sms_enviado,
    ciudades, statuses, fuentes, top_distritos,
  } = data;

  // Merge duplicate status labels for display
  const displayStatuses = statuses.reduce<{ name: string; label: string; value: number; color: string }[]>((acc, s) => {
    const meta = STATUS_META[s.name] ?? { color: CITY_COLORS[acc.length % CITY_COLORS.length], label: s.name };
    const existing = acc.find(a => a.label === meta.label);
    if (existing) { existing.value += s.value; }
    else acc.push({ name: s.name, label: meta.label, value: s.value, color: meta.color });
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  return (
    <div className="p-5 space-y-5 max-w-[1400px] mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Leads — Métricas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} clínicas dentales · Google Maps + Meta Ads
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      {/* ── Row 1: Datos disponibles ─────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Datos disponibles</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}  label="Total leads"   value={total}        color="violet" />
          <StatCard icon={Phone}  label="Con teléfono"  value={con_telefono} sub={pct(con_telefono, total)} color="green" />
          <StatCard icon={Mail}   label="Con email"     value={con_email}    sub={pct(con_email, total)}    color="blue" />
          <StatCard icon={Users}  label="Tel + Email"   value={con_ambos}    sub={pct(con_ambos, total)}    color="amber" />
        </div>
      </div>

      {/* ── Row 2: Canales de contacto ───────────────────────────── */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Outreach enviado</p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Send}          label="Email enviado"     value={email_enviado}    sub={pct(email_enviado, con_email) + ' de leads con email'}       color="cyan" />
          <StatCard icon={MessageCircle} label="WhatsApp enviado"  value={whatsapp_enviado} sub={pct(whatsapp_enviado, con_telefono) + ' de leads con tel'}    color="teal" />
          <StatCard icon={Smartphone}    label="SMS enviado"       value={sms_enviado}      sub={pct(sms_enviado, con_telefono) + ' de leads con tel'}         color="rose" />
        </div>
      </div>

      {/* ── Row 3: Ciudad + Fuente ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Leads por ciudad */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Leads por ciudad</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ciudades} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#6b7280', fontSize: 11 }}>
                {ciudades.map((_, i) => <Cell key={i} fill={CITY_COLORS[i % CITY_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fuente */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={15} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Fuente</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={fuentes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={38} paddingAngle={3}>
                {fuentes.map((f, i) => (
                  <Cell key={i} fill={FUENTE_META[f.name]?.color ?? CITY_COLORS[i % CITY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [Number(v).toLocaleString(), FUENTE_META[String(name)]?.label ?? name]} />
              <Legend formatter={v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{FUENTE_META[v]?.label ?? v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {fuentes.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FUENTE_META[f.name]?.color ?? CITY_COLORS[i] }} />
                  <span className="text-gray-400">{FUENTE_META[f.name]?.label ?? f.name}</span>
                </div>
                <span className="text-gray-300 font-medium tabular-nums">
                  {f.value.toLocaleString()} <span className="text-gray-600">({pct(f.value, total)})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Estado + Top distritos ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Estado del lead */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Estado del lead</h2>
          </div>
          <div className="space-y-3">
            {displayStatuses.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-300">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{pct(s.value, total)}</span>
                    <span className="text-xs text-gray-200 font-medium tabular-nums w-14 text-right">{s.value.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((s.value / total) * 100)}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Embudo de outreach */}
          <div className="mt-5 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Embudo de contacto</p>
            {[
              { label: 'Total leads',     value: total,            color: '#7c3aed' },
              { label: 'Con teléfono',    value: con_telefono,     color: '#059669' },
              { label: 'Con email',       value: con_email,        color: '#2563eb' },
              { label: 'Email enviado',   value: email_enviado,    color: '#0891b2' },
              { label: 'WA enviado',      value: whatsapp_enviado, color: '#16a34a' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <div className="w-16 text-right">
                  <span className="text-xs font-bold tabular-nums" style={{ color: item.color }}>
                    {pct(item.value, total)}
                  </span>
                </div>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((item.value / total) * 100)}%`, backgroundColor: item.color }}
                  />
                </div>
                <div className="w-28 flex items-center justify-between">
                  <span className="text-xs text-gray-200 tabular-nums font-medium">{item.value.toLocaleString()}</span>
                  <span className="text-xs text-gray-600 truncate ml-1">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 15 distritos */}
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Top 15 distritos</h2>
            <span className="text-xs text-gray-600 ml-1">— colores por ciudad</span>
          </div>
          <DistritoList distritos={top_distritos} ciudades={ciudades} />
          {/* City legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 pt-3 border-t border-gray-800">
            {ciudades.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CITY_COLORS[i % CITY_COLORS.length] }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

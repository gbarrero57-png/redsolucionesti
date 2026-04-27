'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, Calendar, CheckCircle, TrendingUp,
  RefreshCw, ChevronRight, Phone, UserCheck, Search, X,
  AlertCircle, Clock, ChevronDown,
} from 'lucide-react';

interface LeadStats {
  total:            number;
  new_this_week:    number;
  with_appointment: number;
  converted_week:   number;
}

interface Lead {
  id:                 string;
  full_name:          string;
  phone:              string | null;
  email:              string | null;
  source:             string;
  created_at:         string;
  has_appointment:    boolean;
  next_appointment:   string | null;
  appointment_status: string | null;
  appointment_id:     string | null;
  total:              number;
}

const SOURCE_CFG: Record<string, { label: string; color: string; dot: string }> = {
  whatsapp_bot:  { label: 'WhatsApp Bot', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  manual:        { label: 'Manual',       color: 'bg-gray-500/10  text-gray-400   border-gray-500/20',   dot: 'bg-gray-400' },
  referral:      { label: 'Referido',     color: 'bg-blue-500/10  text-blue-400   border-blue-500/20',   dot: 'bg-blue-400' },
  landing_page:  { label: 'Landing',      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-400' },
  import:        { label: 'Importado',    color: 'bg-amber-500/10 text-amber-400  border-amber-500/20',  dot: 'bg-amber-400' },
};

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7)  return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem.`;
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function ApptBadge({ lead }: { lead: Lead }) {
  if (!lead.has_appointment || !lead.next_appointment) {
    return <span className="text-[11px] text-gray-600 italic">Sin cita</span>;
  }
  const dt = new Date(lead.next_appointment);
  const isPast = dt < new Date();
  const dateStr = dt.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) +
    ', ' + dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  if (isPast) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
        <AlertCircle size={10} />
        {dateStr}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
      <Calendar size={10} />
      {dateStr}
    </span>
  );
}

const SOURCE_KEYS = Object.keys(SOURCE_CFG) as (keyof typeof SOURCE_CFG)[];

function SourceEditor({ lead, onUpdate }: {
  lead: Lead;
  onUpdate: (id: string, source: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const src = SOURCE_CFG[lead.source] ?? SOURCE_CFG.manual;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function pick(newSource: string) {
    if (newSource === lead.source) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    const r = await fetch('/api/admin/prospectos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: lead.id, source: newSource }),
    });
    if (r.ok) onUpdate(lead.id, newSource);
    setSaving(false);
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-colors ${src.color} ${saving ? 'opacity-50' : 'hover:brightness-125 cursor-pointer'}`}
        title="Cambiar origen"
      >
        {saving
          ? <RefreshCw size={9} className="animate-spin" />
          : <span className={`w-1.5 h-1.5 rounded-full ${src.dot}`} />
        }
        {src.label}
        <ChevronDown size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
          {SOURCE_KEYS.map(key => (
            <button
              key={key}
              onClick={() => pick(key)}
              className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors ${key === lead.source ? 'text-white font-semibold' : 'text-gray-300'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${SOURCE_CFG[key].dot} flex-shrink-0`} />
              {SOURCE_CFG[key].label}
              {key === lead.source && <span className="ml-auto text-violet-400 text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['bg-violet-500/20 text-violet-300', 'bg-emerald-500/20 text-emerald-300',
    'bg-blue-500/20 text-blue-300', 'bg-amber-500/20 text-amber-300'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full border border-gray-700/50 flex items-center justify-center flex-shrink-0 text-xs font-bold ${color}`}>
      {initials || '?'}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, loading }: {
  icon: React.ElementType; label: string; value: number; color: string; loading: boolean;
}) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} />
      </div>
      <div>
        {loading
          ? <div className="h-6 w-10 bg-gray-800 rounded animate-pulse mb-1" />
          : <p className="text-xl font-bold text-white tabular-nums">{value}</p>
        }
        <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function ActivateButton({ lead, onActivate }: { lead: Lead; onActivate: (l: Lead) => Promise<void> }) {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'loading'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    if (phase === 'idle') {
      setPhase('confirm');
      timerRef.current = setTimeout(() => setPhase('idle'), 3000);
    } else if (phase === 'confirm') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('loading');
      onActivate(lead).finally(() => setPhase('idle'));
    }
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (phase === 'loading') {
    return (
      <button disabled className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 opacity-60">
        <RefreshCw size={11} className="animate-spin" />
        <span className="hidden sm:inline">Activando…</span>
      </button>
    );
  }
  if (phase === 'confirm') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 font-semibold animate-pulse"
      >
        <CheckCircle size={11} />
        <span className="hidden sm:inline">¿Confirmar?</span>
      </button>
    );
  }
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors"
      title="Marcar como paciente activo"
    >
      <UserCheck size={11} />
      <span className="hidden sm:inline">Activar</span>
    </button>
  );
}

const PAGE_SIZE = 20;
const SOURCES = ['', 'whatsapp_bot', 'manual', 'referral', 'landing_page'] as const;

export default function ProspectosPage() {
  const router = useRouter();

  const [stats,   setStats]   = useState<LeadStats | null>(null);
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(0);
  const [source,  setSource]  = useState('');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  function handleUpdateSource(id: string, source: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, source } : l));
  }

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const r = await fetch('/api/admin/prospectos?stats=1');
    if (r.ok) setStats(await r.json());
    setStatsLoading(false);
  }, []);

  const loadLeads = useCallback(async (pg: number, src: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(pg * PAGE_SIZE) });
    if (src) params.set('source', src);
    const r = await fetch(`/api/admin/prospectos?${params}`);
    if (r.ok) {
      const d = await r.json();
      setLeads(d.leads ?? []);
      setTotal(d.total ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    loadLeads(0, '');
  }, [loadStats, loadLeads]);

  function handleSourceFilter(s: string) {
    setSource(s);
    setPage(0);
    loadLeads(0, s);
  }

  function handlePage(p: number) {
    setPage(p);
    loadLeads(p, source);
  }

  async function handleActivate(lead: Lead) {
    const r = await fetch('/api/admin/prospectos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: lead.id }),
    });
    if (r.ok) {
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      setTotal(prev => Math.max(0, prev - 1));
      loadStats();
    }
  }

  const displayed = search.trim()
    ? leads.filter(l =>
        l.full_name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone?.includes(search)
      )
    : leads;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Users size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Prospectos</h1>
            <p className="text-xs text-gray-500">Leads pendientes de convertir en pacientes activos</p>
          </div>
        </div>
        <button
          onClick={() => { loadStats(); loadLeads(page, source); }}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}       label="Total prospectos"      value={stats?.total            ?? 0} color="bg-emerald-500/10 text-emerald-400" loading={statsLoading} />
        <StatCard icon={TrendingUp}  label="Nuevos esta semana"    value={stats?.new_this_week    ?? 0} color="bg-blue-500/10 text-blue-400"       loading={statsLoading} />
        <StatCard icon={Calendar}    label="Con cita agendada"     value={stats?.with_appointment ?? 0} color="bg-violet-500/10 text-violet-400"   loading={statsLoading} />
        <StatCard icon={CheckCircle} label="Convertidos esta semana" value={stats?.converted_week ?? 0} color="bg-amber-500/10 text-amber-400"    loading={statsLoading} />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Source filters */}
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg p-1 flex-shrink-0">
          {SOURCES.map(s => (
            <button
              key={s}
              onClick={() => handleSourceFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                source === s
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`}
            >
              {s === '' ? 'Todos' : SOURCE_CFG[s]?.label ?? s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre o teléfono…"
            className="w-full pl-8 pr-8 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        <span className="ml-auto text-xs text-gray-600 flex-shrink-0 tabular-nums">
          {search ? `${displayed.length} de ${total}` : `${total}`} prospectos
        </span>
      </div>

      {/* Lead list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-800/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full bg-gray-800 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-800 rounded animate-pulse w-40" />
                  <div className="h-3 bg-gray-800 rounded animate-pulse w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-14">
            <Users size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">
              {search ? 'Sin resultados para esa búsqueda' : 'No hay prospectos en este momento'}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {search ? 'Prueba con otro nombre o número' : 'Los nuevos contactos del bot aparecerán aquí automáticamente'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {displayed.map(lead => {
              const src = SOURCE_CFG[lead.source] ?? SOURCE_CFG.manual;
              return (
                <div key={lead.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors group">
                  {/* Avatar */}
                  <Avatar name={lead.full_name} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white truncate">{lead.full_name}</p>
                      <SourceEditor lead={lead} onUpdate={handleUpdateSource} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Phone size={10} />
                          {lead.phone}
                        </span>
                      )}
                      <ApptBadge lead={lead} />
                      <span className="flex items-center gap-1 text-[11px] text-gray-600">
                        <Clock size={9} />
                        {relativeDate(lead.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <ActivateButton lead={lead} onActivate={handleActivate} />

                    <button
                      onClick={() => router.push(`/admin/inbox?phone=${encodeURIComponent(lead.phone ?? '')}`)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
                      title="Ver conversación"
                    >
                      <MessageSquare size={14} />
                    </button>

                    <button
                      onClick={() => router.push(`/admin/patients/${lead.id}`)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                      title="Ver perfil"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!search && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-600 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page >= totalPages - 1}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

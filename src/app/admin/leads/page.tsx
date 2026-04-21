'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Mail, Phone, Globe, MapPin, Star, MessageSquare,
  X, ChevronDown, ArrowUpDown, ExternalLink, Loader2,
  Check, SlidersHorizontal, Users,
} from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────── */
interface Lead {
  id:               string;
  nombre:           string;
  email:            string | null;
  telefono:         string | null;
  ciudad:           string | null;
  distrito:         string | null;
  status:           string;
  score_relevancia: number;
  rating:           number | null;
  total_resenas:    number;
  fuente:           string[] | null;
  fecha_envio:      string | null;
  created_at:       string;
  notas:            string | null;
}

interface LeadFull extends Lead {
  website:          string | null;
  direccion:        string | null;
  whatsapp_enviado: boolean;
  sms_enviado:      boolean;
  fecha_followup:   string | null;
  email_asunto:     string | null;
  citas_semana:     string | null;
  ultima_actividad: string | null;
  updated_at:       string;
}

/* ─── Constants ───────────────────────────────────────────────────── */
const STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:              { label: 'Nuevo',           color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  sin_email:          { label: 'Sin email',        color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/30' },
  enviado:            { label: 'Enviado',          color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  email_enviado:      { label: 'Email enviado',    color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  follow_up_enviado:  { label: 'Follow-up',        color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
  respondio:          { label: 'Respondió',        color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30' },
  interesado:         { label: 'Interesado',       color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
  demo_agendada:      { label: 'Demo agendada',    color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/30' },
  cerrado:            { label: 'Cerrado',          color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/30' },
  no_interesado:      { label: 'No interesado',   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
};

const PIPELINE_ORDER = [
  'nuevo','enviado','follow_up_enviado','respondio','interesado','demo_agendada','cerrado',
];

const CITIES = [
  'Lima','Arequipa','Trujillo','Chiclayo','Cusco','Piura',
];

/* ─── StatusBadge ─────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? { label: status, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}

/* ─── LeadDrawer ──────────────────────────────────────────────────── */
function LeadDrawer({ leadId, onClose, onUpdated }: {
  leadId: string;
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
}) {
  const [lead, setLead]   = useState<LeadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [notes,   setNotes]   = useState('');
  const [status,  setStatus]  = useState('');
  const [dirty,        setDirty]        = useState(false);
  const [waTogggling,  setWaToggling]   = useState(false);
  const [copied,       setCopied]       = useState(false);

  const EMAIL_SENT_STATUSES = new Set(['enviado','email_enviado','follow_up_enviado','respondio','cerrado','interesado','demo_agendada']);

  useEffect(() => {
    fetch(`/api/admin/leads/${leadId}`)
      .then(r => r.json())
      .then(d => {
        setLead(d);
        setNotes(d.notas || '');
        setStatus(d.status);
        setLoading(false);
      });
  }, [leadId]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    const res = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: notes, status }),
    });
    const updated = await res.json();
    setSaving(false);
    setDirty(false);
    onUpdated(updated);
  };

  const toggleWa = async () => {
    if (!lead || waTogggling) return;
    setWaToggling(true);
    const next = !lead.whatsapp_enviado;
    const res = await fetch(`/api/admin/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp_enviado: next }),
    });
    const updated = await res.json();
    setLead(prev => prev ? { ...prev, whatsapp_enviado: updated.whatsapp_enviado } : prev);
    onUpdated(updated);
    setWaToggling(false);
  };

  const FEATURES = [
    '* Atencion 24/7 a tus pacientes',
    '* Agenda citas automaticamente',
    '* Sin dobles reservas',
    '* Responde preguntas (precios, servicios, horarios)',
    '* Menu interactivo en WhatsApp',
    '* Derivacion a humano cuando lo necesites',
    '* Historial clinico por paciente',
    '* Recordatorios automaticos',
    '* Recuperacion de pacientes',
    '* Reportes de gestion',
    '* Funciona para una o varias sedes',
  ].join('\n');

  const buildWaMessage = (l: LeadFull) => {
    const emailSent = EMAIL_SENT_STATUSES.has(l.status);
    const footer = '\n\nMas info: https://sofia.redsolucionesti.com'
      + '\nPruebalo: https://wa.me/51977588512'
      + '\n\nSi te interesa coordinamos una demo rapida de 10-15 min.';
    if (emailSent) {
      return 'Hola, te escribo por aqui tambien (intentamos contactarte por correo) para presentarte SofIA, asistente de WhatsApp con IA para clinicas dentales:\n\n' + FEATURES + footer;
    }
    return 'Hola, soy Gabriel de RedSoluciones TI. Me pongo en contacto porque ' + l.nombre + ' tiene gran presencia y queria presentarles SofIA, asistente de WhatsApp con IA para clinicas dentales:\n\n' + FEATURES + footer;
  };

  const sendWa = async () => {
    if (!lead?.telefono) return;
    const digits = lead.telefono.replace(/\D/g, '');
    // Add Peru +51 if no country code (numbers < 11 digits have no country code)
    const phone = digits.length <= 9 ? '51' + digits : digits;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildWaMessage(lead))}`;
    window.open(url, '_blank');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* drawer */}
      <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Detalle del lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        ) : lead ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Identity */}
            <div>
              <p className="text-lg font-semibold text-white leading-tight">{lead.nombre}</p>
              {lead.ciudad && (
                <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} /> {lead.distrito ? `${lead.distrito}, ` : ''}{lead.ciudad}
                </p>
              )}
            </div>

            {/* Score & rating */}
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2.5 text-center">
                <p className="text-[11px] text-gray-500 mb-0.5">Score</p>
                <p className="text-lg font-bold text-violet-400">{lead.score_relevancia}</p>
              </div>
              {lead.rating && (
                <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-[11px] text-gray-500 mb-0.5">Rating</p>
                  <p className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1">
                    <Star size={14} fill="currentColor" /> {lead.rating}
                  </p>
                </div>
              )}
              {lead.total_resenas > 0 && (
                <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-[11px] text-gray-500 mb-0.5">Reseñas</p>
                  <p className="text-lg font-bold text-emerald-400">{lead.total_resenas}</p>
                </div>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-violet-400 transition-colors">
                  <Mail size={14} className="text-gray-500 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
              )}
              {lead.telefono && (
                <button
                  onClick={sendWa}
                  className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-emerald-400 transition-colors w-full text-left"
                >
                  <MessageSquare size={14} className="text-gray-500 flex-shrink-0" />
                  {lead.telefono}
                  <span className={`text-[10px] ml-auto transition-colors ${copied ? 'text-amber-400' : 'text-emerald-500'}`}>
                    {copied ? 'Msg copiado — pega en WA' : 'WhatsApp'}
                  </span>
                </button>
              )}
              {lead.website && (
                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-blue-400 transition-colors">
                  <Globe size={14} className="text-gray-500 flex-shrink-0" />
                  <span className="truncate">{lead.website}</span>
                  <ExternalLink size={10} className="text-gray-600 flex-shrink-0" />
                </a>
              )}
              {lead.direccion && (
                <p className="flex items-center gap-2.5 text-sm text-gray-400">
                  <MapPin size={14} className="text-gray-500 flex-shrink-0" />
                  <span className="text-xs">{lead.direccion}</span>
                </p>
              )}
            </div>

            {/* Outreach status */}
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {/* Email */}
              {[
                { label: 'Email',     sent: EMAIL_SENT_STATUSES.has(lead.status) },
                { label: 'Follow-up', sent: ['follow_up_enviado','respondio','cerrado','interesado','demo_agendada'].includes(lead.status) },
              ].map(({ label, sent }) => (
                <div key={label} className={`rounded-lg px-2 py-2 text-center border ${sent ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                  {sent ? <Check size={12} className="mx-auto mb-0.5" /> : <span className="block text-lg leading-none mb-0.5">—</span>}
                  {label}
                </div>
              ))}
              {/* WhatsApp — clickable toggle */}
              <button
                onClick={toggleWa}
                disabled={waTogggling}
                title={lead.whatsapp_enviado ? 'Marcar como no enviado' : 'Marcar WhatsApp como enviado'}
                className={`rounded-lg px-2 py-2 text-center border transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-60 ${
                  lead.whatsapp_enviado
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-emerald-600/40 hover:text-emerald-600'
                }`}
              >
                {waTogggling
                  ? <Loader2 size={12} className="mx-auto mb-0.5 animate-spin" />
                  : lead.whatsapp_enviado
                    ? <Check size={12} className="mx-auto mb-0.5" />
                    : <span className="block text-lg leading-none mb-0.5">—</span>
                }
                WhatsApp
              </button>
            </div>

            {/* Pipeline status selector */}
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wide font-medium block mb-2">
                Estado pipeline
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_ORDER.map(s => {
                  const meta = STATUSES[s];
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { setStatus(s); setDirty(true); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        active ? `${meta.bg} ${meta.color} scale-105` : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      {meta?.label ?? s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wide font-medium block mb-2">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={e => { setNotes(e.target.value); setDirty(true); }}
                rows={4}
                placeholder="Agregar notas sobre este lead..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {/* Timestamps */}
            <div className="text-[11px] text-gray-600 space-y-1 pt-2 border-t border-gray-800">
              <p>Agregado: {new Date(lead.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              {lead.fecha_envio && <p>Email enviado: {new Date(lead.fecha_envio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
              {lead.citas_semana && <p>Citas/semana: {lead.citas_semana}</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Lead no encontrado</div>
        )}

        {/* save footer */}
        {dirty && (
          <div className="px-5 py-4 border-t border-gray-800 bg-gray-900">
            <button
              onClick={save}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar cambios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function LeadsPage() {
  const router = useRouter();

  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [status,      setStatus]      = useState('');
  const [ciudad,      setCiudad]      = useState('');
  const [fuente,      setFuente]      = useState('');
  const [sort,        setSort]        = useState('created_at');
  const [dir,         setDir]         = useState<'desc' | 'asc'>('desc');
  const [selected,    setSelected]    = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [checkedIds,  setCheckedIds]  = useState<Set<string>>(new Set());
  const [bulkStatus,  setBulkStatus]  = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Pipeline stats
  const [stats, setStats] = useState<Record<string, number>>({});

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 50;

  const load = useCallback(async (p: number, q: string, st: string, ci: string, so: string, di: string, fu: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), sort: so, dir: di });
    if (q)  params.set('q', q);
    if (st) params.set('status', st);
    if (ci) params.set('ciudad', ci);
    if (fu) params.set('fuente', fu);
    const res = await fetch(`/api/admin/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  // Fetch pipeline stats once on mount
  useEffect(() => {
    fetch('/api/admin/leads/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      setCheckedIds(new Set());
      load(1, search, status, ciudad, sort, dir, fuente);
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, status, ciudad, sort, dir, fuente, load]);

  useEffect(() => {
    setCheckedIds(new Set());
    load(page, search, status, ciudad, sort, dir, fuente);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / LIMIT);

  const toggleSort = (col: string) => {
    if (sort === col) setDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSort(col); setDir('desc'); }
  };

  const activeFilters = [status, ciudad, fuente].filter(Boolean).length;

  // Bulk helpers
  const allPageChecked = leads.length > 0 && leads.every(l => checkedIds.has(l.id));
  const toggleCheck = (id: string) => setCheckedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setCheckedIds(
    allPageChecked ? new Set() : new Set(leads.map(l => l.id))
  );

  const bulkUpdate = async (updates: Record<string, unknown>) => {
    if (checkedIds.size === 0) return;
    setBulkLoading(true);
    await fetch('/api/admin/leads/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...checkedIds], updates }),
    });
    setCheckedIds(new Set());
    setBulkStatus('');
    await load(page, search, status, ciudad, sort, dir, fuente);
    const newStats = await fetch('/api/admin/leads/stats').then(r => r.json());
    setStats(newStats);
    setBulkLoading(false);
  };

  const exportCSV = () => {
    const rows = leads.filter(l => checkedIds.has(l.id));
    const headers = ['nombre','email','telefono','ciudad','distrito','status','score_relevancia','rating','total_resenas','fuente','fecha_envio','created_at','notas'];
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = r[h as keyof Lead];
        const s = Array.isArray(v) ? v.join('|') : String(v ?? '');
        return `"${s.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const fmt = (s: string | null) => s
    ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    : '—';

  return (
    <div className="flex flex-col h-full bg-gray-950">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Users size={20} className="text-amber-400" />
              Leads CRM
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total.toLocaleString()} leads · página {page} de {totalPages || 1}
            </p>
          </div>
          <button onClick={() => load(page, search, status, ciudad, sort, dir, fuente)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search + filters row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, ciudad..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeFilters > 0 || showFilters
                ? 'bg-amber-600/20 border-amber-600/40 text-amber-400'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filtros
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex gap-2 mt-2 flex-wrap">
            <div className="relative">
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="appearance-none bg-gray-900 border border-gray-700 rounded-lg pl-3 pr-7 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="">Todos los estados</option>
                {Object.entries(STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={ciudad}
                onChange={e => { setCiudad(e.target.value); setPage(1); }}
                className="appearance-none bg-gray-900 border border-gray-700 rounded-lg pl-3 pr-7 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="">Todas las ciudades</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={fuente}
                onChange={e => { setFuente(e.target.value); setPage(1); }}
                className="appearance-none bg-gray-900 border border-gray-700 rounded-lg pl-3 pr-7 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="">Todas las fuentes</option>
                <option value="meta_ads">Meta Ads</option>
                <option value="google_maps">Google Maps</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            {(status || ciudad || fuente) && (
              <button
                onClick={() => { setStatus(''); setCiudad(''); setFuente(''); setPage(1); }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-700 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Pipeline stats bar ── */}
      {Object.keys(stats).length > 0 && (
        <div className="flex-shrink-0 px-6 py-2 border-b border-gray-800 flex gap-2 overflow-x-auto">
          {Object.entries(STATUSES).map(([key, meta]) => {
            const count = stats[key] ?? 0;
            if (!count) return null;
            const active = status === key;
            return (
              <button
                key={key}
                onClick={() => { setStatus(active ? '' : key); setPage(1); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  active ? `${meta.bg} ${meta.color} scale-105` : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                }`}
              >
                {meta.label}
                <span className={`font-bold tabular-nums ${active ? '' : 'text-gray-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {loading && leads.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-600">
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <Users size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900 z-10">
              <tr className="border-b border-gray-800">
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allPageChecked}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 accent-violet-500 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  <button onClick={() => toggleSort('nombre')} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                    Nombre <ArrowUpDown size={10} className={sort === 'nombre' ? 'text-violet-400' : ''} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  <button onClick={() => toggleSort('ciudad')} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                    Ciudad <ArrowUpDown size={10} className={sort === 'ciudad' ? 'text-violet-400' : ''} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Contacto</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                  <button onClick={() => toggleSort('score_relevancia')} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                    Score <ArrowUpDown size={10} className={sort === 'score_relevancia' ? 'text-violet-400' : ''} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                    Fecha <ArrowUpDown size={10} className={sort === 'created_at' ? 'text-violet-400' : ''} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-50' : ''}>
              {leads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={e => { if ((e.target as HTMLInputElement).type !== 'checkbox') setSelected(lead.id); }}
                  className={`border-b border-gray-800/50 hover:bg-gray-900 cursor-pointer transition-colors group ${checkedIds.has(lead.id) ? 'bg-violet-950/20' : ''}`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(lead.id)}
                      onChange={() => toggleCheck(lead.id)}
                      className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 accent-violet-500 cursor-pointer"
                    />
                  </td>
                  {/* Nombre */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-1">
                      {lead.nombre}
                    </p>
                    {lead.email && (
                      <p className="text-[11px] text-gray-600 truncate max-w-[180px]">{lead.email}</p>
                    )}
                  </td>
                  {/* Ciudad */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {lead.ciudad ? (
                      <span className="text-xs text-gray-400">
                        {lead.distrito ? <span className="text-gray-500">{lead.distrito}, </span> : null}
                        {lead.ciudad}
                      </span>
                    ) : <span className="text-gray-700">—</span>}
                  </td>
                  {/* Contacto icons */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1.5">
                      <span className={`w-5 h-5 rounded flex items-center justify-center ${lead.email ? 'bg-violet-500/15 text-violet-400' : 'bg-gray-800 text-gray-700'}`}>
                        <Mail size={11} />
                      </span>
                      <span className={`w-5 h-5 rounded flex items-center justify-center ${lead.telefono ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-700'}`}>
                        <Phone size={11} />
                      </span>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  {/* Score */}
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-xs font-mono text-violet-400">{lead.score_relevancia}</span>
                    {lead.rating && (
                      <span className="text-[10px] text-amber-500 ml-1.5">★{lead.rating}</span>
                    )}
                  </td>
                  {/* Fecha */}
                  <td className="px-4 py-3 hidden xl:table-cell text-[11px] text-gray-600">
                    {fmt(lead.fecha_envio || lead.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Bulk action toolbar ── */}
      {checkedIds.size > 0 && (
        <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 border-t border-amber-600/30 bg-amber-950/20">
          <span className="text-sm font-medium text-amber-400">
            {checkedIds.size} seleccionado{checkedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 ml-auto flex-wrap">
            {/* Change status */}
            <div className="flex gap-1">
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-2 pr-6 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="">Cambiar estado...</option>
                {Object.entries(STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <button
                onClick={() => bulkStatus && bulkUpdate({ status: bulkStatus })}
                disabled={!bulkStatus || bulkLoading}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : 'Aplicar'}
              </button>
            </div>
            {/* Mark WA sent */}
            <button
              onClick={() => bulkUpdate({ whatsapp_enviado: true })}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-emerald-700/30 border border-emerald-600/40 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-700/50 disabled:opacity-40 transition-colors"
            >
              Marcar WA enviado
            </button>
            {/* Export CSV */}
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Exportar CSV
            </button>
            {/* Clear selection */}
            <button
              onClick={() => setCheckedIds(new Set())}
              className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-gray-900">
          <p className="text-xs text-gray-600">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total.toLocaleString()}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {/* Page numbers (window of 5) */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Lead detail drawer ── */}
      {selected && (
        <LeadDrawer
          leadId={selected}
          onClose={() => setSelected(null)}
          onUpdated={updated => {
            setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

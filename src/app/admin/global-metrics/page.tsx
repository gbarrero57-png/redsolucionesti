'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart2, RefreshCw, MessageSquare, Calendar, AlertTriangle,
  Users, BookOpen, TrendingUp, Building2, Wifi, X, ChevronRight,
  Shield, UserCheck, Clock, Bot, Mail, Phone, MapPin,
  Globe, CheckCircle, XCircle, Loader2, FileText, Send, Download,
  ChevronDown,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */
interface ClinicMetric {
  clinic_id: string; name: string; subdomain: string; active: boolean; created_at: string;
  total_conversations: number; active_conversations: number; closed_conversations: number;
  human_now: number; ever_escalated: number; total_appointments: number;
  confirmed_appointments: number; completed_appointments: number; cancelled_appointments: number;
  conversion_rate: number; escalation_rate: number; cancellation_rate: number;
  staff_count: number; kb_count: number;
}
interface GlobalMetrics {
  period_days: number; clinic_count: number;
  totals: { total_conversations: number; active_conversations: number; human_now: number;
    total_appointments: number; ever_escalated: number; cancelled_appointments: number; staff_count: number; };
  clinics: ClinicMetric[];
}
interface StaffMember {
  id: string; user_id: string; full_name: string; email: string;
  role: string; active: boolean; created_at: string; last_sign_in: string | null;
}
interface KbEntry { id: string; question: string; category: string; active: boolean; created_at: string; }
interface ConvRow {
  id: string; chatwoot_conversation_id: number; patient_name: string;
  status: string; bot_paused: boolean; last_message: string; last_activity_at: string; created_at: string;
}
interface ApptRow {
  id: string; patient_name: string; patient_phone: string; date_time: string;
  service: string; status: string; notes: string; created_at: string;
}
interface ClinicDetail {
  clinic: Record<string, unknown>;
  staff: StaffMember[];
  kb: { total: number; active: number; by_category: Record<string, number>; entries: KbEntry[] };
  conversations: { counts: { total: number; active: number; human: number; closed: number }; recent: ConvRow[] };
  appointments: { counts: { pending: number; confirmed: number; completed: number; cancelled: number }; recent: ApptRow[] };
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const CLINIC_COLORS = ['#7c3aed','#059669','#2563eb','#d97706','#0891b2','#9333ea','#16a34a','#ea580c','#e11d48','#0284c7'];

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  const diff = Date.now() - dt.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111827', border: '1px solid #374151', borderRadius: 8 },
  labelStyle: { color: '#e5e7eb' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

/* ─── Small components ───────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, color = 'text-violet-400' }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-gray-800 ${color}`}><Icon size={18} /></div>
      </div>
    </div>
  );
}

function RateBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return role === 'admin'
    ? <span className="inline-flex items-center gap-1 text-[10px] bg-violet-600/20 text-violet-400 border border-violet-600/30 px-1.5 py-0.5 rounded-full"><Shield size={8} />Admin</span>
    : <span className="inline-flex items-center gap-1 text-[10px] bg-gray-700/60 text-gray-400 border border-gray-600/30 px-1.5 py-0.5 rounded-full"><UserCheck size={8} />Staff</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    active:    { color: 'bg-green-500/20 text-green-400 border-green-500/30',  label: 'Activa' },
    human:     { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',  label: 'Humano' },
    closed:    { color: 'bg-gray-700/60 text-gray-400 border-gray-600/30',     label: 'Cerrada' },
    pending:   { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     label: 'Pendiente' },
    confirmed: { color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', label: 'Confirmada' },
    completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30',  label: 'Completada' },
    cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30',        label: 'Cancelada' },
  };
  const s = map[status] ?? { color: 'bg-gray-700/60 text-gray-400 border-gray-600/30', label: status };
  return (
    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  );
}

/* ─── Clinic Detail Drawer ───────────────────────────────────────── */
function ClinicDrawer({ clinicId, clinicColor, onClose }: {
  clinicId: string; clinicColor: string; onClose: () => void;
}) {
  const [detail, setDetail] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'staff' | 'kb' | 'convs' | 'appts'>('staff');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/clinic-detail?clinic_id=${clinicId}`);
        if (cancelled) return;
        if (!res.ok) { setLoading(false); return; }
        const json = await res.json();
        if (cancelled) return;
        // Validate required shape to avoid render crashes
        if (
          json &&
          json.clinic &&
          Array.isArray(json.staff) &&
          json.kb && Array.isArray(json.kb.entries) &&
          json.conversations && Array.isArray(json.conversations.recent) &&
          json.appointments && Array.isArray(json.appointments.recent)
        ) {
          setDetail(json as ClinicDetail);
        } else if (json && json.clinic) {
          // Partial response — fill in safe defaults
          setDetail({
            clinic: json.clinic,
            staff: Array.isArray(json.staff) ? json.staff : [],
            kb: json.kb && Array.isArray(json.kb.entries)
              ? json.kb
              : { total: 0, active: 0, by_category: {}, entries: [] },
            conversations: json.conversations && Array.isArray(json.conversations.recent)
              ? json.conversations
              : { counts: { total: 0, active: 0, human: 0, closed: 0 }, recent: [] },
            appointments: json.appointments && Array.isArray(json.appointments.recent)
              ? json.appointments
              : { counts: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }, recent: [] },
          });
        }
      } catch { /* network error — detail stays null */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const c = detail?.clinic as Record<string, string | boolean | number> | undefined;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-gray-950 border-l border-gray-800 flex flex-col shadow-2xl"
        style={{ boxShadow: `-20px 0 60px -10px rgba(0,0,0,0.6)` }}>

        {/* Top accent */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${clinicColor}, transparent)` }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${clinicColor}22`, border: `1px solid ${clinicColor}44` }}>
              <Building2 size={18} style={{ color: clinicColor }} />
            </div>
            <div>
              {loading
                ? <div className="h-4 w-40 bg-gray-800 rounded animate-pulse" />
                : <h2 className="text-base font-semibold text-white">{c?.name as string}</h2>
              }
              {loading
                ? <div className="h-3 w-24 bg-gray-800 rounded animate-pulse mt-1" />
                : <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <code className="bg-gray-800 px-1 rounded">{c?.subdomain as string}</code>
                    {c?.active ? <span className="text-green-400 flex items-center gap-0.5"><CheckCircle size={10} />Activa</span>
                              : <span className="text-red-400 flex items-center gap-0.5"><XCircle size={10} />Inactiva</span>}
                  </p>
              }
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando detalle...
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm">Error cargando datos</div>
        ) : (
          <>
            {/* Clinic info bar */}
            <div className="px-6 py-3 border-b border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
              {c?.phone && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
                  <Phone size={11} className="text-gray-600 flex-shrink-0" />
                  <span className="truncate">{c.phone as string}</span>
                </div>
              )}
              {c?.timezone && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
                  <Globe size={11} className="text-gray-600 flex-shrink-0" />
                  <span className="truncate">{c.timezone as string}</span>
                </div>
              )}
              {c?.address && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0 col-span-2">
                  <MapPin size={11} className="text-gray-600 flex-shrink-0" />
                  <span className="truncate">{c.address as string}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                <Clock size={11} className="text-gray-600 flex-shrink-0" />
                <span>Creada {fmtDate(c?.created_at as string)}</span>
              </div>
            </div>

            {/* KPI mini-row */}
            <div className="px-6 py-3 border-b border-gray-800 grid grid-cols-4 gap-2 flex-shrink-0">
              {[
                { label: 'Staff', value: detail.staff.length, sub: `${detail.staff.filter(s => s.role === 'admin').length} admin`, icon: Users, color: 'text-violet-400' },
                { label: 'KB', value: detail.kb.total, sub: `${detail.kb.active} activos`, icon: BookOpen, color: 'text-blue-400' },
                { label: 'Convs.', value: detail.conversations.counts?.total ?? 0, sub: `${detail.conversations.counts?.active ?? 0} bot · ${detail.conversations.counts?.human ?? 0} humano`, icon: MessageSquare, color: 'text-green-400' },
                { label: 'Citas', value: (detail.appointments.counts?.confirmed ?? 0) + (detail.appointments.counts?.completed ?? 0), sub: `${detail.appointments.counts?.cancelled ?? 0} canc.`, icon: Calendar, color: 'text-amber-400' },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
                    <Icon size={11} className={color} />
                  </div>
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 py-2 border-b border-gray-800 flex-shrink-0">
              {([
                { key: 'staff', label: `Staff (${detail.staff.length})`, icon: Users },
                { key: 'kb',    label: `Base de conocimiento (${detail.kb.total})`, icon: BookOpen },
                { key: 'convs', label: `Conversaciones (${detail.conversations.counts?.total ?? 0})`, icon: MessageSquare },
                { key: 'appts', label: `Citas (${detail.appointments.recent.length})`, icon: Calendar },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Staff tab ── */}
              {tab === 'staff' && (
                <div className="p-6 space-y-3">
                  {detail.staff.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">No hay usuarios registrados</p>
                  )}
                  {detail.staff.map(s => (
                    <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: s.role === 'admin' ? '#4f46e5' : '#374151' }}>
                            {(s.full_name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-100">{s.full_name}</span>
                              <RoleBadge role={s.role} />
                              {!s.active && (
                                <span className="text-[10px] bg-red-900/20 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded-full">Inactivo</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail size={10} className="text-gray-600" />
                              <span className="text-xs text-gray-500">{s.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-gray-600">Creado</div>
                          <div className="text-[11px] text-gray-400">{fmtDate(s.created_at)}</div>
                          {s.last_sign_in && (
                            <>
                              <div className="text-[10px] text-gray-600 mt-1">Último acceso</div>
                              <div className="text-[11px] text-gray-400">{timeAgo(s.last_sign_in)}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── KB tab ── */}
              {tab === 'kb' && (
                <div className="p-6">
                  {/* Category summary */}
                  {Object.keys(detail.kb.by_category ?? {}).length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {Object.entries(detail.kb.by_category ?? {}).map(([cat, count]) => (
                        <span key={cat} className="text-[11px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-1 rounded-full">
                          {cat} <span className="text-gray-600">({count})</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    {detail.kb.entries.map(k => (
                      <div key={k.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs text-gray-300 leading-relaxed flex-1">{k.question}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{k.category || 'general'}</span>
                            {k.active
                              ? <CheckCircle size={11} className="text-green-500" />
                              : <XCircle size={11} className="text-red-500" />
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                    {detail.kb.entries.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">No hay entradas en la base de conocimiento</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Conversations tab ── */}
              {tab === 'convs' && (
                <div className="p-6">
                  {/* Count pills */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[
                      { label: 'Bot activo', value: detail.conversations.counts?.active ?? 0, color: 'bg-green-500/10 text-green-400 border-green-500/20' },
                      { label: 'Con humano', value: detail.conversations.counts?.human  ?? 0, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                      { label: 'Cerradas',   value: detail.conversations.counts?.closed  ?? 0, color: 'bg-gray-700/50 text-gray-400 border-gray-600/20' },
                    ].map(({ label, value, color }) => (
                      <span key={label} className={`text-xs px-3 py-1 rounded-full border ${color}`}>
                        {label}: <strong>{value}</strong>
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {detail.conversations.recent.map(conv => (
                      <div key={conv.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-200">{conv.patient_name || 'Sin nombre'}</span>
                            <StatusBadge status={conv.bot_paused && conv.status !== 'closed' ? 'human' : conv.status} />
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {conv.bot_paused ? <Bot size={11} className="text-amber-400" /> : <Bot size={11} className="text-green-400" />}
                            <span className="text-[10px] text-gray-600">{timeAgo(conv.last_activity_at || conv.created_at)}</span>
                          </div>
                        </div>
                        {conv.last_message && (
                          <p className="text-[11px] text-gray-500 truncate">{conv.last_message}</p>
                        )}
                      </div>
                    ))}
                    {detail.conversations.recent.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">No hay conversaciones registradas</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Appointments tab ── */}
              {tab === 'appts' && (
                <div className="p-6">
                  {/* Count pills */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[
                      { label: 'Pendientes',  value: detail.appointments.counts?.pending   ?? 0, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                      { label: 'Confirmadas', value: detail.appointments.counts?.confirmed  ?? 0, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                      { label: 'Completadas', value: detail.appointments.counts?.completed  ?? 0, color: 'bg-green-500/10 text-green-400 border-green-500/20' },
                      { label: 'Canceladas',  value: detail.appointments.counts?.cancelled  ?? 0, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
                    ].map(({ label, value, color }) => (
                      <span key={label} className={`text-xs px-3 py-1 rounded-full border ${color}`}>
                        {label}: <strong>{value}</strong>
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {detail.appointments.recent.map(appt => (
                      <div key={appt.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-200">{appt.patient_name || '—'}</span>
                              <StatusBadge status={appt.status} />
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500">
                              {appt.service && <span className="truncate">{appt.service}</span>}
                              {appt.patient_phone && (
                                <span className="flex items-center gap-1 flex-shrink-0">
                                  <Phone size={9} />{appt.patient_phone}
                                </span>
                              )}
                            </div>
                            {appt.notes && (
                              <p className="text-[10px] text-gray-600 mt-1 truncate">{appt.notes}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {appt.date_time && (
                              <p className="text-[11px] text-gray-300">{fmtDateTime(appt.date_time)}</p>
                            )}
                            <p className="text-[10px] text-gray-600 mt-0.5">creada {timeAgo(appt.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {detail.appointments.recent.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">No hay citas registradas</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── Report types ───────────────────────────────────────────────── */
interface MonthlyReport {
  id: string; clinic_id: string; month: string;
  pdf_url: string | null; email_to: string | null; sent_at: string | null;
  metrics: Record<string, number> | null; created_at: string;
}

/* ─── Reports section component ──────────────────────────────────── */
function ReportsSection({ clinics }: { clinics: ClinicMetric[] }) {
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Default: last month
  const lastMonth = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [selectedClinic, setSelectedClinic] = useState<string>('all');
  const [selectedMonth,  setSelectedMonth]  = useState<string>(lastMonth);
  const [sending,   setSending]   = useState(false);
  const [result,    setResult]    = useState<{ ok?: boolean; error?: string; sent?: number } | null>(null);
  const [reports,   setReports]   = useState<MonthlyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Build month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { val, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  });

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    const qs = selectedClinic !== 'all' ? `?clinic_id=${selectedClinic}` : '';
    const res = await fetch(`/api/admin/reports${qs}`).catch(() => null);
    const data = res?.ok ? await res.json() : [];
    setReports(Array.isArray(data) ? data : []);
    setLoadingReports(false);
  }, [selectedClinic]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleSend() {
    setSending(true);
    setResult(null);
    const targets = selectedClinic === 'all' ? clinics.map(c => c.clinic_id) : [selectedClinic];
    let sent = 0; let lastError = '';

    for (const clinic_id of targets) {
      const res = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id, month: selectedMonth }),
      });
      if (res.ok) { sent++; } else {
        const d = await res.json().catch(() => ({}));
        lastError = d.error || 'Error desconocido';
      }
    }

    setResult(sent === targets.length
      ? { ok: true, sent }
      : { error: sent > 0 ? `${sent}/${targets.length} enviados. Último error: ${lastError}` : lastError }
    );
    setSending(false);
    if (sent > 0) fetchReports();
  }

  const fmtMonth = (m: string | null | undefined) => {
    if (!m || !/^\d{4}-\d{2}$/.test(m)) return m ?? '—';
    const [y, mo] = m.split('-').map(Number);
    return `${MONTHS[mo - 1] ?? '?'} ${y}`;
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-0.5 h-6 bg-violet-500 rounded-full" />
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <FileText size={16} className="text-violet-400" />
          Reportes Mensuales PDF
        </h2>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
        <div className="flex flex-wrap items-end gap-4">

          {/* Clinic selector */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1.5">Clínica</label>
            <div className="relative">
              <select
                value={selectedClinic}
                onChange={e => setSelectedClinic(e.target.value)}
                className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors pr-8"
              >
                <option value="all">Todas las clínicas ({clinics.length})</option>
                {clinics.map(c => (
                  <option key={c.clinic_id} value={c.clinic_id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Month selector */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1.5">Mes del reporte</label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors pr-8"
              >
                {monthOptions.map(o => (
                  <option key={o.val} value={o.val}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {sending
              ? <><RefreshCw size={14} className="animate-spin" /> Generando...</>
              : <><Send size={14} /> Generar y Enviar</>
            }
          </button>
        </div>

        {/* Result feedback */}
        {result && (
          <div className={`mt-3 text-sm px-3 py-2 rounded-lg border flex items-center gap-2 ${
            result.ok
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {result.ok
              ? <><CheckCircle size={14} /> {result.sent} reporte{(result.sent ?? 0) > 1 ? 's' : ''} generado{(result.sent ?? 0) > 1 ? 's' : ''} y enviado{(result.sent ?? 0) > 1 ? 's' : ''} correctamente</>
              : <><XCircle size={14} /> {result.error}</>
            }
          </div>
        )}
      </div>

      {/* Report history */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-300">Historial de reportes</p>
          <button onClick={fetchReports} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
            <RefreshCw size={13} className={loadingReports ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingReports ? (
          <div className="flex items-center justify-center h-24 text-gray-500 text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Cargando...
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-600 text-sm gap-1">
            <FileText size={24} className="opacity-30" />
            <p>Sin reportes generados aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {reports.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-violet-600/15 border border-violet-600/25 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{fmtMonth(r.month)}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.email_to} · {r.sent_at ? new Date(r.sent_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                {r.metrics && (
                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                    <span>{r.metrics.total_appointments ?? 0} citas</span>
                    <span className="text-emerald-400">{r.metrics.completion_rate ?? 0}% comp.</span>
                    <span>{r.metrics.total_conversations ?? 0} convs</span>
                  </div>
                )}
                {r.pdf_url && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-xs"
                  >
                    <Download size={12} /> PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function GlobalMetricsPage() {
  const router = useRouter();
  const [data, setData]           = useState<GlobalMetrics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [days, setDays]           = useState(30);
  const [sortBy, setSortBy]       = useState<'name' | 'conversations' | 'appointments' | 'escalation'>('conversations');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`/api/admin/global-metrics?days=${days}`, { cache: 'no-store' });
      if (res.status === 401) { router.replace('/admin/login?reason=session_expired'); return; }
      if (res.status === 403) { setData(null); return; }
      if (!res.ok) { setFetchError(true); setData(null); return; }
      const json = await res.json();
      // Validate shape before setting — prevent crash if API returns error object
      if (json && typeof json === 'object' && Array.isArray(json.clinics)) {
        // Ensure totals always exists with safe defaults (crashes KpiCard row if missing)
        const safeTotals = {
          total_conversations: 0, active_conversations: 0, human_now: 0,
          total_appointments: 0, ever_escalated: 0, cancelled_appointments: 0, staff_count: 0,
          ...(json.totals && typeof json.totals === 'object' ? json.totals : {}),
        };
        setData({ ...json, totals: safeTotals } as GlobalMetrics);
      } else {
        setFetchError(true); setData(null);
      }
    } catch { setFetchError(true); setData(null); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedClinics = (data?.clinics ?? []).slice().sort((a, b) => {
    if (sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
    if (sortBy === 'conversations') return b.total_conversations - a.total_conversations;
    if (sortBy === 'appointments')  return b.total_appointments - a.total_appointments;
    if (sortBy === 'escalation')    return b.escalation_rate - a.escalation_rate;
    return 0;
  }) ?? [];

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <RefreshCw size={18} className="animate-spin mr-2" /> Cargando métricas globales...
    </div>
  );

  if (!data) return (
    <div className="p-6">
      <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 text-red-300 text-sm flex items-center gap-3">
        <AlertTriangle size={16} />
        {fetchError
          ? 'Error al cargar métricas. Verifica la conexión y recarga.'
          : 'Acceso denegado — solo el superadmin puede ver métricas globales.'}
      </div>
      {fetchError && (
        <button onClick={fetchData} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm transition-colors">
          <RefreshCw size={14} /> Reintentar
        </button>
      )}
    </div>
  );


  const selectedClinic = sortedClinics.find(c => c.clinic_id === selectedId);
  const selectedColor  = selectedClinic ? CLINIC_COLORS[sortedClinics.indexOf(selectedClinic) % CLINIC_COLORS.length] : '#7c3aed';

  return (
    <div className="p-6 max-w-6xl">
      {/* Drawer */}
      {selectedId && (
        <ClinicDrawer
          clinicId={selectedId}
          clinicColor={selectedColor}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 size={22} className="text-amber-400" />
            Métricas Globales
            <span className="text-xs bg-amber-600/20 text-amber-400 border border-amber-600/30 px-1.5 py-0.5 rounded-full">SA</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data.clinic_count} clínica{data.clinic_count !== 1 ? 's' : ''} · Últimos {days} días
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-amber-500">
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Clínicas activas" value={data.clinic_count} sub={`${data.totals.staff_count} usuarios en total`} icon={Building2} color="text-amber-400" />
        <KpiCard label="Conversaciones totales" value={data.totals.total_conversations} sub={`${data.totals.active_conversations} activas ahora`} icon={MessageSquare} color="text-violet-400" />
        <KpiCard label="Citas (período)" value={data.totals.total_appointments} sub={`${data.totals.cancelled_appointments} canceladas`} icon={Calendar} color="text-blue-400" />
        <KpiCard label="Con humano ahora" value={data.totals.human_now} sub={`${data.totals.ever_escalated} escaladas total`} icon={AlertTriangle} color="text-red-400" />
      </div>

      {/* Charts */}
      {data.clinic_count >= 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* ── Conversaciones por clínica — horizontal stacked ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
              <MessageSquare size={15} className="text-violet-400" /> Conversaciones por clínica
            </h2>
            <p className="text-[11px] text-gray-600 mb-4">Bot activo · Con humano · Cerradas</p>
            <div className="space-y-4">
              {sortedClinics.map((c, i) => {
                const color = CLINIC_COLORS[i % CLINIC_COLORS.length];
                const total = Math.max(c.total_conversations, 1);
                const pBot   = (c.active_conversations / total) * 100;
                const pHuman = (c.human_now / total) * 100;
                const pClose = (c.closed_conversations / total) * 100;
                return (
                  <div key={c.clinic_id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs text-gray-300 truncate max-w-[160px]">{c.name}</span>
                      </div>
                      <span className="text-xs font-bold text-white ml-2 flex-shrink-0">{c.total_conversations}</span>
                    </div>
                    {/* Stacked bar */}
                    <div className="flex h-5 rounded-lg overflow-hidden bg-gray-800 gap-px">
                      {c.active_conversations > 0 && (
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white/80"
                          style={{ width: `${pBot}%`, background: color, minWidth: 20 }}>
                          {c.active_conversations}
                        </div>
                      )}
                      {c.human_now > 0 && (
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white/80"
                          style={{ width: `${pHuman}%`, background: '#f59e0b', minWidth: 20 }}>
                          {c.human_now}
                        </div>
                      )}
                      {c.closed_conversations > 0 && (
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white/60"
                          style={{ width: `${pClose}%`, background: '#374151', minWidth: 20 }}>
                          {c.closed_conversations}
                        </div>
                      )}
                      {c.total_conversations === 0 && (
                        <div className="h-full w-full flex items-center px-2">
                          <span className="text-[9px] text-gray-600">Sin conversaciones</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: color }} />
                        Bot: {c.active_conversations}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-sm bg-amber-500" />
                        Humano: {c.human_now}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-sm bg-gray-600" />
                        Cerradas: {c.closed_conversations}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Citas por clínica + resumen donut ── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
              <Calendar size={15} className="text-blue-400" /> Citas por clínica
            </h2>
            <p className="text-[11px] text-gray-600 mb-4">Confirmadas · Completadas · Canceladas · Pendientes</p>
            <div className="space-y-4">
              {sortedClinics.map((c, i) => {
                const color = CLINIC_COLORS[i % CLINIC_COLORS.length];
                const total = Math.max(c.total_appointments, 1);
                const pending = c.total_appointments - c.confirmed_appointments - c.completed_appointments - c.cancelled_appointments;
                const pConf  = (c.confirmed_appointments  / total) * 100;
                const pComp  = (c.completed_appointments  / total) * 100;
                const pCanc  = (c.cancelled_appointments  / total) * 100;
                const pPend  = Math.max((pending / total) * 100, 0);
                return (
                  <div key={c.clinic_id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs text-gray-300 truncate max-w-[160px]">{c.name}</span>
                      </div>
                      <span className="text-xs font-bold text-white ml-2 flex-shrink-0">{c.total_appointments}</span>
                    </div>
                    <div className="flex h-5 rounded-lg overflow-hidden bg-gray-800 gap-px">
                      {c.confirmed_appointments > 0 && (
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white/80"
                          style={{ width: `${pConf}%`, background: '#6366f1', minWidth: 20 }}>
                          {c.confirmed_appointments}
                        </div>
                      )}
                      {c.completed_appointments > 0 && (
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white/80"
                          style={{ width: `${pComp}%`, background: '#10b981', minWidth: 20 }}>
                          {c.completed_appointments}
                        </div>
                      )}
                      {c.cancelled_appointments > 0 && (
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white/80"
                          style={{ width: `${pCanc}%`, background: '#ef4444', minWidth: 20 }}>
                          {c.cancelled_appointments}
                        </div>
                      )}
                      {pPend > 0 && pending > 0 && (
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white/60"
                          style={{ width: `${pPend}%`, background: '#3b82f6', minWidth: 20 }}>
                          {pending}
                        </div>
                      )}
                      {c.total_appointments === 0 && (
                        <div className="h-full w-full flex items-center px-2">
                          <span className="text-[9px] text-gray-600">Sin citas en el período</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {c.confirmed_appointments > 0 && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-sm bg-indigo-500" />Conf: {c.confirmed_appointments}
                        </span>
                      )}
                      {c.completed_appointments > 0 && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />Comp: {c.completed_appointments}
                        </span>
                      )}
                      {c.cancelled_appointments > 0 && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-sm bg-red-500" />Canc: {c.cancelled_appointments}
                        </span>
                      )}
                      {pending > 0 && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-sm bg-blue-500" />Pend: {pending}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Per-clinic detail table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <TrendingUp size={15} className="text-amber-400" /> Detalle por clínica
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-gray-600">Haz clic en una clínica para ver el detalle completo</p>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none">
              <option value="conversations">Ordenar: conversaciones</option>
              <option value="appointments">Ordenar: citas</option>
              <option value="escalation">Ordenar: escalación</option>
              <option value="name">Ordenar: nombre</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-800">
          {sortedClinics.map((clinic, i) => (
            <div
              key={clinic.clinic_id}
              onClick={() => setSelectedId(clinic.clinic_id)}
              className="px-5 py-4 cursor-pointer hover:bg-gray-800/40 transition-colors group"
            >
              {/* Clinic header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 group-hover:ring-2 ring-offset-1 ring-offset-gray-900 transition-all"
                    style={{ background: CLINIC_COLORS[i % CLINIC_COLORS.length], '--tw-ring-color': CLINIC_COLORS[i % CLINIC_COLORS.length] } as React.CSSProperties} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors">{clinic.name}</span>
                      <code className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{clinic.subdomain}</code>
                      {!clinic.active && (
                        <span className="text-xs bg-red-900/20 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded-full">Inactiva</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">Creada {fmtDate(clinic.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users size={11} />{clinic.staff_count} staff</span>
                    <span className="flex items-center gap-1"><BookOpen size={11} />{clinic.kb_count} KB</span>
                    <span className="flex items-center gap-1">
                      <Wifi size={11} className={clinic.kb_count > 0 ? 'text-green-500' : 'text-gray-600'} />
                      {clinic.kb_count > 0 ? 'Bot activo' : 'Sin KB'}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Conversaciones</span>
                    <span className="text-xs font-semibold text-gray-200">{clinic.total_conversations}</span>
                  </div>
                  <div className="flex gap-1 text-xs text-gray-600 mb-1.5">
                    <span className="text-green-400">{clinic.active_conversations} bot</span>
                    <span>·</span>
                    <span className="text-red-400">{clinic.human_now} humano</span>
                    <span>·</span>
                    <span>{clinic.closed_conversations} cerradas</span>
                  </div>
                  <RateBar value={clinic.active_conversations} max={Math.max(clinic.total_conversations, 1)} color={CLINIC_COLORS[i % CLINIC_COLORS.length]} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Citas</span>
                    <span className="text-xs font-semibold text-gray-200">{clinic.total_appointments}</span>
                  </div>
                  <div className="flex gap-1 text-xs text-gray-600 mb-1.5">
                    <span className="text-blue-400">{clinic.confirmed_appointments} conf.</span>
                    <span>·</span>
                    <span className="text-green-400">{clinic.completed_appointments} comp.</span>
                    <span>·</span>
                    <span className="text-red-400">{clinic.cancelled_appointments} canc.</span>
                  </div>
                  <RateBar value={clinic.confirmed_appointments + clinic.completed_appointments} max={Math.max(clinic.total_appointments, 1)} color="#2563eb" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Tasa conversión</span>
                    <span className="text-xs font-semibold text-gray-200">{clinic.conversion_rate}%</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1.5">{clinic.total_appointments} citas / {clinic.total_conversations} convs</div>
                  <RateBar value={clinic.conversion_rate} color="#059669" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Tasa escalación</span>
                    <span className={`text-xs font-semibold ${clinic.escalation_rate > 20 ? 'text-red-400' : clinic.escalation_rate > 10 ? 'text-amber-400' : 'text-gray-200'}`}>
                      {clinic.escalation_rate}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1.5">{clinic.human_now} ahora · {clinic.cancellation_rate}% canc.</div>
                  <RateBar value={clinic.escalation_rate} color={clinic.escalation_rate > 20 ? '#dc2626' : clinic.escalation_rate > 10 ? '#d97706' : '#6b7280'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.clinic_count === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500 mt-4">
          <Building2 size={32} className="mb-2 opacity-30" />
          <p className="text-sm">No hay clínicas registradas</p>
        </div>
      )}

      {/* ── Monthly Reports ── */}
      <ReportsSection clinics={sortedClinics} />

    </div>
  );
}

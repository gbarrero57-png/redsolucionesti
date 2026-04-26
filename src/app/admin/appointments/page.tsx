'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  XCircle, AlertCircle, Clock, User, Phone, CalendarDays,
  Plus, X, Pencil, CreditCard, DollarSign, BadgeCheck, AlertTriangle,
  Stethoscope,
} from 'lucide-react';

/* ── Types ── */
interface Appointment {
  id: string;
  patient_name: string;
  phone: string | null;
  service: string | null;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  source?: 'bot' | 'manual';
  notes: string | null;
  created_at: string;
  payment_status?: 'not_required' | 'pending' | 'paid' | 'partial' | 'waived';
  payment_amount?: number | null;
  payment_currency?: string;
  payment_reminder_sent?: boolean;
  doctor_id?: string | null;
  doctor_name?: string | null;
}

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  display_name: string | null;
  slot_duration_min: number;
  active: boolean;
}

/* ── Status config ── */
const STATUS: Record<string, { label: string; dot: string; badge: string; icon: React.ElementType }> = {
  scheduled: { label: 'Agendada',       dot: 'bg-blue-400',    badge: 'text-blue-400 bg-blue-400/10 border-blue-400/20',         icon: Clock },
  confirmed: { label: 'Confirmada',     dot: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle },
  completed: { label: 'Completada',     dot: 'bg-gray-400',    badge: 'text-gray-400 bg-gray-400/10 border-gray-400/20',          icon: CheckCircle },
  cancelled: { label: 'Cancelada',      dot: 'bg-red-400',     badge: 'text-red-400 bg-red-400/10 border-red-400/20',             icon: XCircle },
  no_show:   { label: 'No se presentó', dot: 'bg-amber-400',   badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20',       icon: AlertCircle },
};

/* ── Status left-border color map ── */
const STATUS_BORDER: Record<string, string> = {
  scheduled: 'border-l-blue-500',
  confirmed:  'border-l-emerald-500',
  completed:  'border-l-gray-500',
  cancelled:  'border-l-red-500',
  no_show:    'border-l-amber-500',
};

/* ── Payment config ── */
const PAYMENT: Record<string, { label: string; badge: string; dot: string }> = {
  not_required: { label: 'Sin cobro',    badge: 'text-gray-500 bg-gray-500/10 border-gray-500/20',          dot: '' },
  pending:      { label: 'Pago pend.',   badge: 'text-amber-400 bg-amber-400/10 border-amber-400/30',       dot: 'bg-amber-400' },
  partial:      { label: 'Pago parcial', badge: 'text-orange-400 bg-orange-400/10 border-orange-400/30',    dot: 'bg-orange-400' },
  paid:         { label: 'Pagado',       badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', dot: 'bg-emerald-400' },
  waived:       { label: 'Condonado',    badge: 'text-gray-400 bg-gray-400/10 border-gray-400/20',          dot: 'bg-gray-500' },
};

const SERVICES = [
  'Limpieza dental', 'Extracción', 'Empaste', 'Blanqueamiento',
  'Ortodoncia consulta', 'Endodoncia', 'Implante consulta', 'Revisión general', 'Otro',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── Helpers ── */
function startOfMonth(y: number, m: number) { return new Date(y, m, 1); }
function daysInMonth(y: number, m: number)  { return new Date(y, m + 1, 0).getDate(); }
function dow(d: Date) { return (d.getDay() + 6) % 7; }
function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function sameDay(a: Date, b: Date) { return isoDate(a) === isoDate(b); }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
function localDatetimeValue(date: Date, hh = 9, mm = 0) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hh)}:${pad(mm)}`;
}
function fmtAmount(amount?: number | null, currency = 'PEN') {
  if (!amount) return null;
  return `${currency === 'PEN' ? 'S/' : '$'} ${Number(amount).toFixed(2)}`;
}
function isoToLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Form state ── */
interface FormState {
  patient_name: string; phone: string; service: string;
  start: string; duration: number; notes: string; doctor_id: string;
}
function defaultForm(date: Date): FormState {
  return { patient_name: '', phone: '', service: '', start: localDatetimeValue(date, 9, 0), duration: 30, notes: '', doctor_id: '' };
}

type ViewTab = 'all' | 'pending_payment';

/* ── Main component ── */
export default function AppointmentsPage() {
  const today = new Date();
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth());
  const [appts,    setAppts]    = useState<Appointment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Date>(today);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form,  setForm]  = useState<FormState>(() => defaultForm(today));
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>('all');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // Payment panel state
  const [payModal, setPayModal]   = useState<Appointment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payStatus, setPayStatus] = useState<'pending' | 'partial' | 'paid' | 'waived'>('pending');
  const [payNote,   setPayNote]   = useState('');
  const [paySaving, setPaySaving] = useState(false);

  /* ── Fetch month ── */
  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const from = new Date(y, m, 1).toISOString();
      const to   = new Date(y, m + 1, 1).toISOString();
      const res  = await fetch(`/api/admin/appointments?from=${from}&to=${to}`);
      const data = await res.json();
      setAppts(Array.isArray(data) ? data : []);
    } catch { setAppts([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(today); }

  /* ── Status update ── */
  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      await fetchMonth(year, month);
    } finally { setUpdating(null); }
  }

  /* ── Payment update ── */
  async function savePayment() {
    if (!payModal) return;
    setPaySaving(true);
    try {
      await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payModal.id,
          payment_status: payStatus,
          payment_amount: payAmount ? parseFloat(payAmount) : null,
        }),
      });
      setPayModal(null);
      await fetchMonth(year, month);
    } finally { setPaySaving(false); }
  }

  async function quickPay(id: string, payment_status: string) {
    setUpdating(id);
    try {
      await fetch('/api/admin/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, payment_status }),
      });
      await fetchMonth(year, month);
    } finally { setUpdating(null); }
  }

  function openPayModal(appt: Appointment) {
    setPayModal(appt);
    setPayStatus((appt.payment_status as typeof payStatus) || 'pending');
    setPayAmount(appt.payment_amount ? String(appt.payment_amount) : '');
    setPayNote('');
  }

  /* ── New / Edit appointment ── */
  async function openModal(appt?: Appointment) {
    if (appt) {
      const dur = Math.round((new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000);
      setForm({
        patient_name: appt.patient_name, phone: appt.phone || '',
        service: appt.service || '', start: isoToLocalDatetime(appt.start_time),
        duration: dur, notes: appt.notes || '', doctor_id: appt.doctor_id || '',
      });
      setEditingAppt(appt);
    } else {
      setForm(defaultForm(selected));
      setEditingAppt(null);
    }
    setFormErr(null); setShowModal(true);
    setLoadingDoctors(true);
    try {
      const res = await fetch('/api/admin/doctors');
      const data = await res.json();
      setDoctors(Array.isArray(data) ? data.filter((d: Doctor) => d.active) : []);
    } catch { setDoctors([]); }
    finally { setLoadingDoctors(false); }
  }

  async function saveAppointment() {
    if (!form.patient_name.trim()) { setFormErr('El nombre del paciente es obligatorio'); return; }
    if (!form.start)               { setFormErr('La hora de inicio es obligatoria'); return; }
    setSaving(true); setFormErr(null);
    try {
      const startDt = new Date(form.start);
      const endDt   = new Date(startDt.getTime() + form.duration * 60000);
      const payload = {
        patient_name: form.patient_name, phone: form.phone || null,
        service: form.service || null, start_time: startDt.toISOString(),
        end_time: endDt.toISOString(), notes: form.notes || null,
        doctor_id: form.doctor_id || null,
      };
      const res = editingAppt
        ? await fetch('/api/admin/appointments', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingAppt.id, ...payload }),
          })
        : await fetch('/api/admin/appointments', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) { const d = await res.json(); setFormErr(d.error || 'Error al guardar'); return; }
      setShowModal(false);
      await fetchMonth(year, month);
    } catch { setFormErr('Error de conexión'); }
    finally { setSaving(false); }
  }

  /* ── Derived data ── */
  const firstDow   = dow(startOfMonth(year, month));
  const totalDays  = daysInMonth(year, month);
  const totalCells = Math.ceil((firstDow + totalDays) / 7) * 7;

  const byDate = appts.reduce<Record<string, Appointment[]>>((acc, a) => {
    const k = isoDate(new Date(a.start_time));
    (acc[k] ||= []).push(a);
    return acc;
  }, {});

  const selectedKey = isoDate(selected);
  const allDayAppts = (byDate[selectedKey] || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const dayAppts = tab === 'pending_payment'
    ? allDayAppts.filter(a => a.payment_status === 'pending' || a.payment_status === 'partial')
    : allDayAppts;

  const isThisMonth = year === today.getFullYear() && month === today.getMonth();

  // Month-level stats
  const confirmedCount  = appts.filter(a => a.status === 'confirmed').length;
  const cancelledCount  = appts.filter(a => a.status === 'cancelled').length;
  const pendingPayments = appts.filter(a => a.payment_status === 'pending' || a.payment_status === 'partial');
  const pendingTotal    = pendingPayments.reduce((s, a) => s + (a.payment_amount || 0), 0);

  // Pending payment day keys (for calendar dots)
  const pendingByDate = pendingPayments.reduce<Record<string, number>>((acc, a) => {
    const k = isoDate(new Date(a.start_time));
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 lg:p-6 max-w-7xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 text-white">
            <CalendarDays size={22} className="text-violet-400" />
            Calendario de Citas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {MONTHS[month]} {year}
          </p>
        </div>

        {/* Stats pills row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
            <CalendarDays size={11} />
            {appts.length} citas
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle size={11} />
            {confirmedCount} confirmadas
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25">
            <XCircle size={11} />
            {cancelledCount} canceladas
          </span>
          {pendingPayments.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
              <CreditCard size={11} />
              {pendingPayments.length} pagos pend.
            </span>
          )}
          <button
            onClick={() => fetchMonth(year, month)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 border border-gray-800 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Payment summary bar ── */}
      {pendingPayments.length > 0 && (
        <div
          className="flex items-center justify-between bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 mb-5 cursor-pointer hover:bg-amber-500/15 transition-colors"
          onClick={() => setTab(t => t === 'pending_payment' ? 'all' : 'pending_payment')}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={15} className="text-amber-400" />
            <span className="text-sm font-medium text-amber-300">
              {pendingPayments.length} pago{pendingPayments.length !== 1 ? 's' : ''} pendiente{pendingPayments.length !== 1 ? 's' : ''} este mes
            </span>
            {pendingTotal > 0 && (
              <span className="text-xs text-amber-500 font-mono bg-amber-500/15 px-2 py-0.5 rounded-full">
                S/ {pendingTotal.toFixed(2)} por cobrar
              </span>
            )}
          </div>
          <span className="text-xs text-amber-500">
            {tab === 'pending_payment' ? 'Ver todas ↑' : 'Filtrar día ↓'}
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">

        {/* ─────────── Calendar ─────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-white">{MONTHS[month]} {year}</h2>
              {!isThisMonth && (
                <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors border border-violet-500/20">
                  Hoy
                </button>
              )}
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 bg-gray-800/30 border-b border-gray-800">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDow + 1;
              const isValid = dayNum >= 1 && dayNum <= totalDays;
              if (!isValid) return (
                <div key={idx} className="min-h-[90px] border-r border-b border-gray-800/40 last:border-r-0 bg-gray-900/30" />
              );

              const cellDate  = new Date(year, month, dayNum);
              const key       = isoDate(cellDate);
              const cellAppts = byDate[key] || [];
              const hasPending = (pendingByDate[key] || 0) > 0;
              const isToday   = sameDay(cellDate, today);
              const isSel     = sameDay(cellDate, selected);
              const isPast    = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <div
                  key={idx}
                  onClick={() => setSelected(cellDate)}
                  className={[
                    'min-h-[90px] border-r border-b border-gray-800/40 p-1.5 cursor-pointer transition-all',
                    (idx + 1) % 7 === 0 ? 'border-r-0' : '',
                    isSel && !isToday ? 'bg-violet-500/15 ring-1 ring-inset ring-violet-500/30' : '',
                    !isSel ? 'hover:bg-gray-800/40' : '',
                  ].join(' ')}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={[
                      'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold transition-all',
                      isToday
                        ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                        : isSel
                          ? 'bg-gray-700 text-white'
                          : isPast
                            ? 'text-gray-600 opacity-60'
                            : 'text-gray-300',
                    ].join(' ')}>
                      {dayNum}
                    </span>
                    {hasPending && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 mr-0.5 flex-shrink-0" title="Pago pendiente" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {cellAppts.slice(0, 3).map(a => {
                      const s = STATUS[a.status] || STATUS.scheduled;
                      const isManual = a.source === 'manual';
                      const isDimmed = a.status === 'cancelled' || a.status === 'no_show';
                      // pill color by status
                      const pillColors: Record<string, string> = {
                        scheduled: 'bg-blue-500/15 text-blue-300',
                        confirmed:  'bg-emerald-500/15 text-emerald-300',
                        completed:  'bg-gray-500/15 text-gray-400',
                        cancelled:  'bg-red-500/15 text-red-400',
                        no_show:    'bg-amber-500/15 text-amber-400',
                      };
                      const pillCls = isManual
                        ? 'bg-orange-500/15 text-orange-300'
                        : (pillColors[a.status] || 'bg-gray-500/15 text-gray-400');
                      return (
                        <div
                          key={a.id}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] leading-tight truncate font-medium ${pillCls} ${isDimmed ? 'opacity-50' : ''}`}
                        >
                          {fmtTime(a.start_time)} {a.patient_name}
                        </div>
                      );
                    })}
                    {cellAppts.length > 3 && (
                      <div className="text-[9px] text-gray-500 px-1.5 font-medium">+{cellAppts.length - 3} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-800 flex-wrap">
            {Object.entries(STATUS).map(([, cfg]) => (
              <span
                key={cfg.label}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${cfg.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Pago pend.
            </span>
          </div>
        </div>

        {/* ─────────── Day detail ─────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">

          {/* Day header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5 font-medium">
                {selected.toLocaleDateString('es-ES', { weekday: 'long' })}
              </p>
              <h3 className="text-lg font-bold text-white">
                {selected.getDate()} de {MONTHS[selected.getMonth()]}
                {selected.getFullYear() !== today.getFullYear() && ` de ${selected.getFullYear()}`}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {allDayAppts.length === 0 ? 'Sin citas' : `${allDayAppts.length} cita${allDayAppts.length !== 1 ? 's' : ''} programadas`}
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors text-xs font-semibold whitespace-nowrap shadow-lg shadow-violet-900/30"
            >
              <Plus size={14} /> Nueva Cita
            </button>
          </div>

          {/* Tabs */}
          {allDayAppts.length > 0 && (
            <div className="flex border-b border-gray-800">
              {([['all', 'Todas'], ['pending_payment', 'Pagos pendientes']] as const).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t
                      ? 'text-white border-b-2 border-violet-500 bg-violet-500/5'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                  {t === 'pending_payment' && allDayAppts.filter(a => a.payment_status === 'pending' || a.payment_status === 'partial').length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                      {allDayAppts.filter(a => a.payment_status === 'pending' || a.payment_status === 'partial').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Appointment list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm gap-2">
                <RefreshCw size={16} className="animate-spin" /> Cargando...
              </div>
            ) : dayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 text-gray-600 px-6">
                {tab === 'pending_payment' ? (
                  <>
                    <BadgeCheck size={32} className="mb-3 text-emerald-600 opacity-40" />
                    <p className="text-sm font-medium text-gray-500">Sin pagos pendientes este día</p>
                  </>
                ) : (
                  <>
                    <CalendarDays size={32} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium text-gray-500">No hay citas este día</p>
                    <button
                      onClick={() => openModal()}
                      className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                    >
                      + Crear cita manual
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {dayAppts.map(appt => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    isUpdating={updating === appt.id}
                    onUpdateStatus={updateStatus}
                    onQuickPay={quickPay}
                    onOpenPayModal={openPayModal}
                    onEdit={openModal}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────── Modal: Registrar cobro ─────────── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

            {/* Gradient top line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-amber-400" />
                <h2 className="text-base font-semibold text-white">Gestión de Cobro</h2>
              </div>
              <button onClick={() => setPayModal(null)} className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Patient summary */}
              <div className="px-3 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50">
                <p className="text-sm font-semibold text-white">{payModal.patient_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{payModal.service || 'Consulta'} · {fmtTime(payModal.start_time)}</p>
              </div>

              {/* Payment status */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Estado del pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['pending', '⏳ Pendiente'],
                    ['partial', '🔄 Parcial'],
                    ['paid',    '✅ Pagado'],
                    ['waived',  '🚫 Condonado'],
                  ] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setPayStatus(val)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                        payStatus === val
                          ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              {(payStatus === 'pending' || payStatus === 'partial') && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Monto {payStatus === 'partial' ? 'pendiente' : 'a cobrar'} (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="Ej: 150.00"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setPayModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={savePayment}
                disabled={paySaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paySaving ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
                {paySaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── Modal: Nueva Cita Manual ─────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Gradient top line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-violet-400" />
                <h2 className="text-base font-semibold text-white">{editingAppt ? 'Editar Cita' : 'Nueva Cita Manual'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 font-medium">
                {selected.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre del paciente *</label>
                <input type="text" value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} placeholder="Ej: María González"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Teléfono</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+51 999 123 456"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Servicio</label>
                <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors">
                  <option value="">— Seleccionar —</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Doctor{loadingDoctors ? <span className="ml-1 text-gray-600">cargando...</span> : null}
                </label>
                <select
                  value={form.doctor_id}
                  onChange={e => {
                    const docId = e.target.value;
                    const doc = doctors.find(d => d.id === docId);
                    setForm(f => ({ ...f, doctor_id: docId, duration: doc ? doc.slot_duration_min : f.duration }));
                  }}
                  disabled={loadingDoctors}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors disabled:opacity-50"
                >
                  <option value="">— Sin asignar —</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.display_name || `${d.first_name} ${d.last_name}`} · {d.specialty} ({d.slot_duration_min} min)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Hora de inicio *</label>
                  <input type="datetime-local" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Duración</label>
                  <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors">
                    <option value={15}>15 min</option><option value={30}>30 min</option>
                    <option value={45}>45 min</option><option value={60}>1 hora</option>
                    <option value={90}>1.5 horas</option><option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Notas (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Indicaciones, motivo, etc." rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors resize-none" />
              </div>
              {formErr && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{formErr}</p>}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button
                onClick={saveAppointment}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Guardando...' : 'Guardar Cita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AppointmentCard sub-component ── */
function AppointmentCard({
  appt,
  isUpdating,
  onUpdateStatus,
  onQuickPay,
  onOpenPayModal,
  onEdit,
}: {
  appt: Appointment;
  isUpdating: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onQuickPay: (id: string, payment_status: string) => void;
  onOpenPayModal: (appt: Appointment) => void;
  onEdit: (appt: Appointment) => void;
}) {
  const cfg      = STATUS[appt.status] || STATUS.scheduled;
  const payCfg   = PAYMENT[appt.payment_status || 'not_required'];
  const Icon     = cfg.icon;
  const isManual = appt.source === 'manual';
  const hasPay   = appt.payment_status === 'pending' || appt.payment_status === 'partial';
  const borderCls = STATUS_BORDER[appt.status] || 'border-l-gray-500';

  return (
    <div
      className={`bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 border-l-4 ${borderCls} hover:bg-gray-800/60 transition-colors`}
    >
      {/* Top row: time + status badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-lg font-bold text-white leading-none">
            {fmtTime(appt.start_time)}
            {appt.end_time && (
              <span className="text-xs font-normal text-gray-500 ml-1.5">– {fmtTime(appt.end_time)}</span>
            )}
          </p>
          <p className="text-sm font-medium text-gray-100 mt-1">{appt.patient_name}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
          {isManual && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
              <Pencil size={9} /> Manual
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
            <Icon size={11} /> {cfg.label}
          </span>
          <button
            onClick={() => onEdit(appt)}
            title="Editar cita"
            className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>

      {/* Details row */}
      <div className="space-y-1 mb-3">
        {appt.doctor_name && (
          <p className="text-xs text-violet-300 flex items-center gap-1.5 font-medium">
            <User size={11} className="text-violet-400 flex-shrink-0" />
            {appt.doctor_name}
          </p>
        )}
        {appt.service && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Stethoscope size={11} className="text-gray-500 flex-shrink-0" />
            {appt.service}
          </p>
        )}
        {appt.phone && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Phone size={11} className="text-gray-500 flex-shrink-0" />
            {appt.phone}
          </p>
        )}
        {appt.notes && (
          <p className="text-xs text-gray-500 italic pl-4">{appt.notes}</p>
        )}

        {/* Payment status row */}
        {appt.payment_status && appt.payment_status !== 'not_required' && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${payCfg.badge}`}>
              <CreditCard size={9} /> {payCfg.label}
            </span>
            {hasPay && (
              <span className="text-xs text-amber-300 font-medium">
                {appt.payment_amount
                  ? `${fmtAmount(appt.payment_amount, appt.payment_currency)} pendiente`
                  : 'Monto por definir'}
              </span>
            )}
            {hasPay && appt.payment_reminder_sent && (
              <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">
                recordatorio enviado
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons — full-width row */}
      <div className="space-y-2 pt-3 border-t border-gray-700/40">
        {appt.status === 'scheduled' && (
          <div className="flex gap-2 flex-wrap">
            <ActionBtn onClick={() => onUpdateStatus(appt.id, 'confirmed')} disabled={isUpdating} color="green">Confirmar</ActionBtn>
            <ActionBtn onClick={() => onUpdateStatus(appt.id, 'cancelled')} disabled={isUpdating} color="red">Cancelar</ActionBtn>
            <ActionBtn onClick={() => onUpdateStatus(appt.id, 'no_show')}   disabled={isUpdating} color="gray">No asistió</ActionBtn>
          </div>
        )}
        {appt.status === 'confirmed' && (
          <div className="flex gap-2 flex-wrap">
            <ActionBtn onClick={() => onUpdateStatus(appt.id, 'completed')} disabled={isUpdating} color="blue">Completada</ActionBtn>
            <ActionBtn onClick={() => onUpdateStatus(appt.id, 'no_show')}   disabled={isUpdating} color="gray">No asistió</ActionBtn>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {(!appt.payment_status || appt.payment_status === 'not_required') && (
            <ActionBtn onClick={() => onOpenPayModal(appt)} disabled={isUpdating} color="amber">
              Registrar cobro
            </ActionBtn>
          )}
          {hasPay && (
            <>
              <ActionBtn onClick={() => onQuickPay(appt.id, 'paid')} disabled={isUpdating} color="green">
                Pago recibido
              </ActionBtn>
              <ActionBtn onClick={() => onOpenPayModal(appt)} disabled={isUpdating} color="amber">
                Editar cobro
              </ActionBtn>
            </>
          )}
          {appt.payment_status === 'paid' && (
            <ActionBtn onClick={() => onOpenPayModal(appt)} disabled={isUpdating} color="gray">
              Ver cobro
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ActionBtn helper ── */
function ActionBtn({ onClick, disabled, color, children }: {
  onClick: () => void; disabled: boolean; color: string; children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/35 border-emerald-600/30',
    red:   'bg-red-600/20 text-red-400 hover:bg-red-600/35 border-red-600/30',
    blue:  'bg-blue-600/20 text-blue-400 hover:bg-blue-600/35 border-blue-600/30',
    gray:  'bg-gray-700/60 text-gray-300 hover:bg-gray-700 border-gray-600/50',
    amber: 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-amber-500/30',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 font-medium ${colors[color] || colors.gray}`}
    >
      {children}
    </button>
  );
}

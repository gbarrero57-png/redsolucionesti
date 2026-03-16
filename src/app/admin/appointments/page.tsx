'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  XCircle, AlertCircle, Clock, User, Phone, CalendarDays,
  Plus, X, Pencil,
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
}

/* ── Status config ── */
const STATUS: Record<string, { label: string; dot: string; badge: string; icon: React.ElementType }> = {
  scheduled: { label: 'Agendada',       dot: 'bg-blue-400',    badge: 'text-blue-400 bg-blue-400/10 border-blue-400/20',    icon: Clock },
  confirmed: { label: 'Confirmada',     dot: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle },
  completed: { label: 'Completada',     dot: 'bg-gray-400',    badge: 'text-gray-400 bg-gray-400/10 border-gray-400/20',    icon: CheckCircle },
  cancelled: { label: 'Cancelada',      dot: 'bg-red-400',     badge: 'text-red-400 bg-red-400/10 border-red-400/20',       icon: XCircle },
  no_show:   { label: 'No se presentó', dot: 'bg-amber-400',   badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: AlertCircle },
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
function dow(d: Date) { return (d.getDay() + 6) % 7; }   // Monday-first
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function sameDay(a: Date, b: Date) { return isoDate(a) === isoDate(b); }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
function localDatetimeValue(date: Date, hh = 9, mm = 0) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hh)}:${pad(mm)}`;
}

/* ── New-appointment form state ── */
interface FormState {
  patient_name: string;
  phone: string;
  service: string;
  start: string;   // datetime-local value
  duration: number; // minutes
  notes: string;
}

function defaultForm(date: Date): FormState {
  return {
    patient_name: '',
    phone: '',
    service: '',
    start: localDatetimeValue(date, 9, 0),
    duration: 30,
    notes: '',
  };
}

/* ── Main component ── */
export default function AppointmentsPage() {
  const today = new Date();
  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [appts,   setAppts]   = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date>(today);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]   = useState<FormState>(() => defaultForm(today));
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

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

  /* ── Navigation ── */
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(today);
  }

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

  /* ── Open modal ── */
  function openModal() {
    setForm(defaultForm(selected));
    setFormErr(null);
    setShowModal(true);
  }

  /* ── Save manual appointment ── */
  async function saveAppointment() {
    if (!form.patient_name.trim()) { setFormErr('El nombre del paciente es obligatorio'); return; }
    if (!form.start)               { setFormErr('La hora de inicio es obligatoria'); return; }

    setSaving(true);
    setFormErr(null);
    try {
      const startDt  = new Date(form.start);
      const endDt    = new Date(startDt.getTime() + form.duration * 60000);
      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: form.patient_name,
          phone:        form.phone || null,
          service:      form.service || null,
          start_time:   startDt.toISOString(),
          end_time:     endDt.toISOString(),
          notes:        form.notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setFormErr(d.error || 'Error al guardar');
        return;
      }
      setShowModal(false);
      await fetchMonth(year, month);
    } catch { setFormErr('Error de conexión'); }
    finally { setSaving(false); }
  }

  /* ── Calendar grid ── */
  const firstDow   = dow(startOfMonth(year, month));
  const totalDays  = daysInMonth(year, month);
  const totalCells = Math.ceil((firstDow + totalDays) / 7) * 7;

  const byDate = appts.reduce<Record<string, Appointment[]>>((acc, a) => {
    const k = isoDate(new Date(a.start_time));
    (acc[k] ||= []).push(a);
    return acc;
  }, {});

  const selectedKey = isoDate(selected);
  const dayAppts    = (byDate[selectedKey] || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const isThisMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="p-4 lg:p-6 max-w-7xl">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays size={22} className="text-violet-400" />
            Calendario de Citas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {appts.length} cita{appts.length !== 1 ? 's' : ''} en {MONTHS[month]} {year}
          </p>
        </div>
        <button
          onClick={() => fetchMonth(year, month)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">

        {/* ─────────── LEFT: Calendar ─────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-white">{MONTHS[month]} {year}</h2>
              {!isThisMonth && (
                <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors">
                  Hoy
                </button>
              )}
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDow + 1;
              const isValid = dayNum >= 1 && dayNum <= totalDays;
              if (!isValid) return <div key={idx} className="min-h-[90px] border-r border-b border-gray-800/50 last:border-r-0" />;

              const cellDate  = new Date(year, month, dayNum);
              const key       = isoDate(cellDate);
              const cellAppts = byDate[key] || [];
              const isToday   = sameDay(cellDate, today);
              const isSel     = sameDay(cellDate, selected);
              const isPast    = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <div
                  key={idx}
                  onClick={() => setSelected(cellDate)}
                  className={`min-h-[90px] border-r border-b border-gray-800/50 p-1.5 cursor-pointer transition-colors
                    ${isSel ? 'bg-violet-500/10' : 'hover:bg-gray-800/40'}
                    ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                  `}
                >
                  <div className="flex justify-end mb-1.5">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold
                      ${isToday ? 'bg-violet-600 text-white' : ''}
                      ${isSel && !isToday ? 'bg-gray-700 text-white' : ''}
                      ${!isToday && !isSel ? (isPast ? 'text-gray-600' : 'text-gray-300') : ''}
                    `}>
                      {dayNum}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {cellAppts.slice(0, 3).map(a => {
                      const s = STATUS[a.status] || STATUS.scheduled;
                      const isManual = a.source === 'manual';
                      return (
                        <div
                          key={a.id}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight truncate ${
                            a.status === 'cancelled' || a.status === 'no_show' ? 'opacity-40' : ''
                          }`}
                          style={{ background: isManual ? 'rgba(251,146,60,.12)' : 'rgba(255,255,255,.05)' }}
                        >
                          {isManual
                            ? <Pencil size={8} className="flex-shrink-0 text-orange-400" />
                            : <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                          }
                          <span className={`truncate ${isManual ? 'text-orange-200' : 'text-gray-300'}`}>
                            {fmtTime(a.start_time)} {a.patient_name}
                          </span>
                        </div>
                      );
                    })}
                    {cellAppts.length > 3 && (
                      <div className="text-[9px] text-gray-500 px-1.5">+{cellAppts.length - 3} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-800 flex-wrap">
            {Object.entries(STATUS).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Pencil size={9} className="text-orange-400" />
              Manual
            </div>
          </div>
        </div>

        {/* ─────────── RIGHT: Day detail ─────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Day header */}
          <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                {selected.toLocaleDateString('es-ES', { weekday: 'long' })}
              </p>
              <h3 className="text-lg font-bold text-white">
                {selected.getDate()} de {MONTHS[selected.getMonth()]}
                {selected.getFullYear() !== today.getFullYear() && ` de ${selected.getFullYear()}`}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {dayAppts.length === 0 ? 'Sin citas' : `${dayAppts.length} cita${dayAppts.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/25 hover:bg-orange-500/25 transition-colors text-xs font-medium whitespace-nowrap"
            >
              <Plus size={14} />
              Nueva Cita
            </button>
          </div>

          {/* Appointment list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <RefreshCw size={16} className="animate-spin mr-2" /> Cargando...
              </div>
            ) : dayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                <CalendarDays size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No hay citas este día</p>
                <button onClick={openModal} className="mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors">
                  + Crear cita manual
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {dayAppts.map(appt => {
                  const cfg     = STATUS[appt.status] || STATUS.scheduled;
                  const Icon    = cfg.icon;
                  const isUpd   = updating === appt.id;
                  const isManual = appt.source === 'manual';

                  return (
                    <div
                      key={appt.id}
                      className={`px-5 py-4 ${isManual ? 'border-l-2 border-orange-500/50' : ''}`}
                    >
                      {/* Time + status badges */}
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{fmtTime(appt.start_time)}</span>
                          {appt.end_time && (
                            <span className="text-xs text-gray-500">– {fmtTime(appt.end_time)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isManual && (
                            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
                              <Pencil size={9} /> Manual
                            </span>
                          )}
                          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                            <Icon size={11} />
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Patient info */}
                      <div className="space-y-1 mb-3">
                        <p className="text-sm font-medium text-gray-100 flex items-center gap-2">
                          <User size={13} className="text-gray-500 flex-shrink-0" />
                          {appt.patient_name}
                        </p>
                        {appt.phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                            <Phone size={12} className="text-gray-500 flex-shrink-0" />
                            {appt.phone}
                          </p>
                        )}
                        {appt.service && (
                          <p className="text-xs text-gray-400 pl-5">{appt.service}</p>
                        )}
                        {appt.notes && (
                          <p className="text-xs text-gray-500 pl-5 italic">{appt.notes}</p>
                        )}
                      </div>

                      {/* Quick actions */}
                      {appt.status === 'scheduled' && (
                        <div className="flex gap-1.5 flex-wrap">
                          <ActionBtn onClick={() => updateStatus(appt.id, 'confirmed')} disabled={isUpd} color="green">Confirmar</ActionBtn>
                          <ActionBtn onClick={() => updateStatus(appt.id, 'cancelled')} disabled={isUpd} color="red">Cancelar</ActionBtn>
                          <ActionBtn onClick={() => updateStatus(appt.id, 'no_show')}   disabled={isUpd} color="gray">No se presentó</ActionBtn>
                        </div>
                      )}
                      {appt.status === 'confirmed' && (
                        <div className="flex gap-1.5 flex-wrap">
                          <ActionBtn onClick={() => updateStatus(appt.id, 'completed')} disabled={isUpd} color="blue">Completada</ActionBtn>
                          <ActionBtn onClick={() => updateStatus(appt.id, 'no_show')}   disabled={isUpd} color="gray">No se presentó</ActionBtn>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────── Modal: Nueva Cita Manual ─────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-orange-400" />
                <h2 className="text-base font-semibold text-white">Nueva Cita Manual</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              {/* Date display */}
              <div className="px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300">
                📅 {selected.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>

              {/* Patient name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre del paciente *</label>
                <input
                  type="text"
                  value={form.patient_name}
                  onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
                  placeholder="Ej: María González"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Teléfono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+52 664 123 4567"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 transition-colors"
                />
              </div>

              {/* Service */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Servicio</label>
                <select
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 transition-colors"
                >
                  <option value="">— Seleccionar —</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Start time + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Hora de inicio *</label>
                  <input
                    type="datetime-local"
                    value={form.start}
                    onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Duración</label>
                  <select
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 transition-colors"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1.5 horas</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Notas (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Indicaciones, motivo, etc."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 transition-colors resize-none"
                />
              </div>

              {/* Error */}
              {formErr && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{formErr}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveAppointment}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

/* ── ActionBtn helper ── */
function ActionBtn({
  onClick, disabled, color, children,
}: { onClick: () => void; disabled: boolean; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/35 border-emerald-600/30',
    red:   'bg-red-600/20 text-red-400 hover:bg-red-600/35 border-red-600/30',
    blue:  'bg-blue-600/20 text-blue-400 hover:bg-blue-600/35 border-blue-600/30',
    gray:  'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${colors[color]}`}
    >
      {children}
    </button>
  );
}

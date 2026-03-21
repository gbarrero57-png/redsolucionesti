'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Clock, Edit2, Save, X, Trash2, Plus,
  Calendar, CheckCircle2, XCircle, Stethoscope,
} from 'lucide-react';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  specialty: string;
  bio: string | null;
  slot_duration_min: number;
  weekly_schedule: ScheduleEntry[];
  active: boolean;
  created_at: string;
}

interface ScheduleEntry {
  dow: number;
  start_hour: number;
  end_hour: number;
}

interface Appointment {
  id: string;
  patient_name: string;
  service: string | null;
  start_time: string;
  end_time: string;
  status: string;
  phone: string | null;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_DURATIONS = [15, 20, 30, 45, 60];
const SPECIALTIES = [
  'Odontología General', 'Ortodoncia', 'Endodoncia', 'Periodoncia',
  'Cirugía Oral', 'Odontopediatría', 'Implantología', 'Estética Dental',
  'Radiología Oral', 'Otra',
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:  { label: 'Programada',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  confirmed:  { label: 'Confirmada',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  completed:  { label: 'Completada',  color: 'text-gray-400 bg-gray-700/50 border-gray-600/30' },
  cancelled:  { label: 'Cancelada',   color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  no_show:    { label: 'No se presentó', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
  });
}

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [doctor,       setDoctor]       = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Editable fields
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [specialty,    setSpecialty]    = useState('');
  const [displayName,  setDisplayName]  = useState('');
  const [bio,          setBio]          = useState('');
  const [slotDuration, setSlotDuration] = useState(30);
  const [schedule,     setSchedule]     = useState<ScheduleEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, apptRes] = await Promise.all([
        fetch(`/api/admin/doctors/${id}`, { cache: 'no-store' }),
        fetch(`/api/admin/appointments?limit=200`, { cache: 'no-store' }),
      ]);
      if (!docRes.ok) { setError('Doctor no encontrado'); return; }
      const doc: Doctor = await docRes.json();
      setDoctor(doc);
      // Filter appointments for this doctor
      if (apptRes.ok) {
        const all: (Appointment & { doctor_id?: string })[] = await apptRes.json();
        setAppointments(all.filter(a => a.doctor_id === id));
      }
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function startEditing() {
    if (!doctor) return;
    setFirstName(doctor.first_name);
    setLastName(doctor.last_name);
    setSpecialty(doctor.specialty);
    setDisplayName(doctor.display_name || '');
    setBio(doctor.bio || '');
    setSlotDuration(doctor.slot_duration_min);
    setSchedule([...(doctor.weekly_schedule || [])]);
    setEditing(true);
    setError(null);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  async function saveEdits() {
    setError(null);
    for (const entry of schedule) {
      if (entry.end_hour <= entry.start_hour) {
        setError('La hora de fin debe ser mayor que la hora de inicio en todos los bloques');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/doctors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:        firstName.trim(),
          last_name:         lastName.trim(),
          specialty,
          display_name:      displayName.trim() || null,
          bio:               bio.trim() || null,
          slot_duration_min: slotDuration,
          weekly_schedule:   schedule,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }
      await load();
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!doctor) return;
    const action = doctor.active ? 'desactivar' : 'activar';
    if (!confirm(`¿Confirmas ${action} este doctor?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/doctors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !doctor.active }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      await load();
    } catch {
      setError('No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  }

  function addScheduleEntry() {
    setSchedule(prev => [...prev, { dow: 1, start_hour: 8, end_hour: 17 }]);
  }

  function removeScheduleEntry(index: number) {
    setSchedule(prev => prev.filter((_, i) => i !== index));
  }

  function updateScheduleEntry(index: number, field: keyof ScheduleEntry, value: number) {
    setSchedule(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error && !doctor) return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/admin/calendarios" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-6">
        <ArrowLeft size={16} /> Volver
      </Link>
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">{error}</div>
    </div>
  );

  if (!doctor) return null;

  const computedDisplay = doctor.display_name || `Dr. ${doctor.first_name} ${doctor.last_name}`;
  const upcomingAppts = appointments
    .filter(a => ['scheduled', 'confirmed'].includes(a.status) && new Date(a.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <Link
          href="/admin/calendarios"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors mt-0.5"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">{computedDisplay}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              doctor.active
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-gray-700 text-gray-400'
            }`}>
              {doctor.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-sm text-violet-400 mt-0.5">{doctor.specialty}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <>
              <button
                onClick={toggleActive}
                disabled={saving}
                title={doctor.active ? 'Desactivar doctor' : 'Activar doctor'}
                className={`p-2 rounded-lg border transition-colors text-sm ${
                  doctor.active
                    ? 'text-red-400 border-red-500/20 hover:bg-red-500/10'
                    : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                }`}
              >
                {doctor.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
              </button>
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                <Edit2 size={14} />
                Editar
              </button>
            </>
          )}
          {editing && (
            <>
              <button
                onClick={cancelEditing}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700 transition-colors"
              >
                <X size={16} />
              </button>
              <button
                onClick={saveEdits}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <Save size={14} />}
                Guardar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">

        {/* Perfil */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Stethoscope size={14} className="text-violet-400" />
            Perfil
          </h2>

          {!editing ? (
            <div className="space-y-3">
              <Row label="Nombre completo" value={`${doctor.first_name} ${doctor.last_name}`} />
              {doctor.display_name && <Row label="Nombre para pacientes" value={doctor.display_name} />}
              <Row label="Especialidad" value={doctor.specialty} />
              {doctor.bio && <Row label="Descripción" value={doctor.bio} />}
              <Row label="Duración de turno" value={`${doctor.slot_duration_min} minutos`} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre *">
                  <input value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Ana" />
                </Field>
                <Field label="Apellido *">
                  <input value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="García" />
                </Field>
              </div>
              <Field label="Nombre para pacientes (opcional)">
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder={`Dr. ${firstName} ${lastName}`.trim()} />
              </Field>
              <Field label="Especialidad *">
                <select value={specialty} onChange={e => setSpecialty(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors">
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Descripción breve (opcional)">
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  placeholder="Ej: 10 años de experiencia…" />
              </Field>
              <Field label="Duración de turno">
                <div className="flex gap-2 flex-wrap">
                  {SLOT_DURATIONS.map(d => (
                    <button key={d} type="button" onClick={() => setSlotDuration(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        slotDuration === d
                          ? 'bg-violet-600 text-white border border-violet-500'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-200'
                      }`}>
                      {d} min
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </div>

        {/* Horario */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Clock size={14} className="text-violet-400" />
              Horario semanal
            </h2>
            {editing && (
              <button onClick={addScheduleEntry}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-lg transition-colors">
                <Plus size={12} /> Agregar bloque
              </button>
            )}
          </div>

          {!editing ? (
            doctor.weekly_schedule && doctor.weekly_schedule.length > 0 ? (
              <div className="space-y-2">
                {doctor.weekly_schedule.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-800 last:border-0">
                    <span className="text-gray-300 w-24 font-medium">{DAY_NAMES[e.dow]}</span>
                    <span className="text-gray-400">
                      {String(e.start_hour).padStart(2,'0')}:00 – {String(e.end_hour).padStart(2,'0')}:00
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-500/70 flex items-center gap-1.5">
                <Calendar size={13} /> Sin horario configurado
              </p>
            )
          ) : (
            <div className="space-y-2">
              {schedule.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-3">Sin bloques. Agrega al menos uno.</p>
              )}
              {schedule.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2.5">
                  <select value={entry.dow} onChange={e => updateScheduleEntry(i, 'dow', Number(e.target.value))}
                    className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 min-w-[110px]">
                    {DAY_NAMES.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
                  </select>
                  <span className="text-xs text-gray-500">de</span>
                  <select value={entry.start_hour} onChange={e => updateScheduleEntry(i, 'start_hour', Number(e.target.value))}
                    className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500">
                    {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
                  </select>
                  <span className="text-xs text-gray-500">a</span>
                  <select value={entry.end_hour} onChange={e => updateScheduleEntry(i, 'end_hour', Number(e.target.value))}
                    className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500">
                    {HOURS.filter(h => h > 0).map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
                    <option value={24}>24:00</option>
                  </select>
                  {entry.end_hour <= entry.start_hour && <span className="text-red-400 text-xs">⚠</span>}
                  <button onClick={() => removeScheduleEntry(i)}
                    className="ml-auto p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas citas */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
            <Calendar size={14} className="text-violet-400" />
            Próximas citas
            <span className="ml-1 text-xs text-gray-600 font-normal">({upcomingAppts.length})</span>
          </h2>

          {upcomingAppts.length === 0 ? (
            <p className="text-sm text-gray-500">Sin citas próximas agendadas.</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppts.slice(0, 10).map(appt => {
                const sc = STATUS_CONFIG[appt.status] || { label: appt.status, color: 'text-gray-400 bg-gray-700/50 border-gray-600/30' };
                return (
                  <div key={appt.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-800 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{appt.patient_name}</p>
                      {appt.service && <p className="text-xs text-gray-500 truncate">{appt.service}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">{formatTime(appt.start_time)}</p>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
              {upcomingAppts.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-1">
                  +{upcomingAppts.length - 10} citas más
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-200">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

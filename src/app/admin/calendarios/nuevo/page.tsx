'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Stethoscope, Save } from 'lucide-react';

const SPECIALTIES = [
  'Odontología General',
  'Ortodoncia',
  'Endodoncia',
  'Periodoncia',
  'Cirugía Oral',
  'Odontopediatría',
  'Implantología',
  'Estética Dental',
  'Radiología Oral',
  'Otra',
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface ScheduleEntry {
  dow: number;
  start_hour: number;
  end_hour: number;
}

const SLOT_DURATIONS = [15, 20, 30, 45, 60];

export default function NuevoDoctorPage() {
  const router = useRouter();

  const [firstName,      setFirstName]      = useState('');
  const [lastName,       setLastName]        = useState('');
  const [specialty,      setSpecialty]      = useState('Odontología General');
  const [displayName,    setDisplayName]    = useState('');
  const [bio,            setBio]            = useState('');
  const [slotDuration,   setSlotDuration]   = useState(30);
  const [schedule,       setSchedule]       = useState<ScheduleEntry[]>([
    { dow: 1, start_hour: 9, end_hour: 17 },
    { dow: 2, start_hour: 9, end_hour: 17 },
    { dow: 3, start_hour: 9, end_hour: 17 },
    { dow: 4, start_hour: 9, end_hour: 17 },
    { dow: 5, start_hour: 9, end_hour: 17 },
  ]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function addEntry() {
    setSchedule(prev => [...prev, { dow: 1, start_hour: 8, end_hour: 17 }]);
  }

  function removeEntry(index: number) {
    setSchedule(prev => prev.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: keyof ScheduleEntry, value: number) {
    setSchedule(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Nombre y apellido son requeridos');
      return;
    }

    // Validate schedule entries
    for (const entry of schedule) {
      if (entry.end_hour <= entry.start_hour) {
        setError('La hora de fin debe ser mayor que la hora de inicio');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
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
        throw new Error(data.error || 'Error al crear el doctor');
      }

      router.push('/admin/calendarios');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  const computedDisplayName = displayName.trim() ||
    (firstName.trim() || lastName.trim()
      ? `Dr. ${firstName.trim()} ${lastName.trim()}`.trim()
      : '');

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/calendarios"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Nuevo doctor</h1>
          <p className="text-sm text-gray-400">Configura el perfil y horario del doctor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Nombre */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Stethoscope size={14} className="text-violet-400" />
            Información personal
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Ana"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Apellido *</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="García"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Nombre para pacientes
              <span className="ml-1 text-gray-600 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={computedDisplayName || 'Dr. Ana García'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {!displayName && computedDisplayName && (
              <p className="mt-1 text-xs text-gray-600">Se usará: <span className="text-gray-400">{computedDisplayName}</span></p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Especialidad *</label>
            <select
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
            >
              {SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Descripción breve
              <span className="ml-1 text-gray-600 font-normal">(opcional)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Ej: 10 años de experiencia en ortodoncia invisible"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Duración de turnos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Duración de cada turno</h2>
          <div className="flex gap-2 flex-wrap">
            {SLOT_DURATIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSlotDuration(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  slotDuration === d
                    ? 'bg-violet-600 text-white border border-violet-500'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-200'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Horario semanal */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Horario semanal</h2>
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-lg transition-colors"
            >
              <Plus size={12} />
              Agregar bloque
            </button>
          </div>

          {schedule.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Sin bloques horarios. El doctor no tendrá disponibilidad.
            </p>
          )}

          <div className="space-y-2">
            {schedule.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                <select
                  value={entry.dow}
                  onChange={e => updateEntry(i, 'dow', Number(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 min-w-[110px]"
                >
                  {DAY_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>

                <span className="text-xs text-gray-500 flex-shrink-0">de</span>

                <select
                  value={entry.start_hour}
                  onChange={e => updateEntry(i, 'start_hour', Number(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {HOURS.map(h => (
                    <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                  ))}
                </select>

                <span className="text-xs text-gray-500 flex-shrink-0">a</span>

                <select
                  value={entry.end_hour}
                  onChange={e => updateEntry(i, 'end_hour', Number(e.target.value))}
                  className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {HOURS.filter(h => h > 0).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                  ))}
                  <option value={24}>24:00</option>
                </select>

                {entry.end_hour <= entry.start_hour && (
                  <span className="text-xs text-red-400 flex-shrink-0">⚠</span>
                )}

                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  className="ml-auto p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/admin/calendarios"
            className="px-5 py-2.5 text-sm text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-violet-500/20"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Guardando…' : 'Crear doctor'}
          </button>
        </div>
      </form>
    </div>
  );
}

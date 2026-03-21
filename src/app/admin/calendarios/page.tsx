'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Stethoscope, Plus, Clock, Calendar, ChevronRight, UserCheck, UserX } from 'lucide-react';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  specialty: string;
  bio: string | null;
  slot_duration_min: number;
  schedule_summary: string;
  active: boolean;
  created_at: string;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendariosPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/doctors', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setDoctors)
      .catch(() => setError('No se pudieron cargar los calendarios'))
      .finally(() => setLoading(false));
  }, []);

  const activeDoctors   = doctors.filter(d => d.active);
  const inactiveDoctors = doctors.filter(d => !d.active);

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600/20 border border-violet-500/30 rounded-xl flex items-center justify-center">
              <Stethoscope size={18} className="text-violet-400" />
            </div>
            Calendarios
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-12">
            Gestión de doctores y sus horarios de atención
          </p>
        </div>
        <Link
          href="/admin/calendarios/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-violet-500/20"
        >
          <Plus size={16} />
          Nuevo doctor
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && doctors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <Stethoscope size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium mb-1">Sin calendarios configurados</p>
          <p className="text-gray-600 text-sm mb-6">Crea el primer doctor para tu clínica</p>
          <Link
            href="/admin/calendarios/nuevo"
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus size={15} />
            Crear primer calendario
          </Link>
        </div>
      )}

      {/* Active doctors */}
      {activeDoctors.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-gray-300">
              Doctores activos
              <span className="ml-2 text-xs text-gray-500 font-normal">{activeDoctors.length}</span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeDoctors.map(doc => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        </section>
      )}

      {/* Inactive doctors */}
      {inactiveDoctors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UserX size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-500">
              Inactivos
              <span className="ml-2 text-xs font-normal">{inactiveDoctors.length}</span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 opacity-60">
            {inactiveDoctors.map(doc => (
              <DoctorCard key={doc.id} doctor={doc} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Link
      href={`/admin/calendarios/${doctor.id}`}
      className="group flex items-start justify-between gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-white truncate">{doctor.display_name}</p>
          {!doctor.active && (
            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400 font-medium">
              Inactivo
            </span>
          )}
        </div>
        <p className="text-xs text-violet-400 font-medium mb-2">{doctor.specialty}</p>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock size={11} />
          <span>Turnos de {doctor.slot_duration_min} min</span>
        </div>
        {doctor.schedule_summary && doctor.schedule_summary !== 'Sin horario configurado' && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
            {doctor.schedule_summary}
          </p>
        )}
        {(!doctor.schedule_summary || doctor.schedule_summary === 'Sin horario configurado') && (
          <p className="text-xs text-amber-500/70 mt-1 flex items-center gap-1">
            <Calendar size={10} />
            Sin horario configurado
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors" />
    </Link>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Search, UserPlus, Calendar, AlertTriangle,
  CheckCircle, Clock, ChevronRight, RefreshCw,
} from 'lucide-react';

interface TodayAppt {
  appointment_id: string;
  patient_name: string;
  phone: string | null;
  service: string | null;
  start_time: string;
  patient_id: string | null;
  has_record: boolean;
}

interface PatientResult {
  id: string;
  dni: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  total_visits: number;
  last_visit: string | null;
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function RecordBadge({ has }: { has: boolean }) {
  return has
    ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle size={10} /> Historia completa
      </span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock size={10} /> Sin historia
      </span>;
}

export default function PatientsPage() {
  const router = useRouter();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [appts, setAppts]       = useState<TodayAppt[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch('/api/admin/patients?today=1')
      .then(r => r.json())
      .then(d => { setAppts(Array.isArray(d) ? d : []); setLoadingAppts(false); })
      .catch(() => setLoadingAppts(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await fetch(`/api/admin/patients?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      setResults(Array.isArray(d) ? d : []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleFillRecord(a: TodayAppt) {
    if (a.patient_id) {
      router.push(`/admin/patients/${a.patient_id}/records/new?appointment=${a.appointment_id}&name=${encodeURIComponent(a.patient_name)}`);
    } else {
      router.push(`/admin/patients/new?name=${encodeURIComponent(a.patient_name)}&phone=${a.phone || ''}&appointment=${a.appointment_id}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <ClipboardList size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Historial Clínico</h1>
            <p className="text-xs text-gray-400">Pacientes y consultas de la clínica</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin/patients/new')}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <UserPlus size={16} /> Nuevo paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60"
        />
        {searching && (
          <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Search results */}
      {query.trim() && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {results.length === 0 && !searching
            ? <p className="text-center text-gray-400 text-sm py-8">No se encontraron pacientes</p>
            : results.map(p => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/admin/patients/${p.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{p.full_name}</p>
                    <p className="text-xs text-gray-400">DNI: {p.dni} · {p.total_visits} consultas</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-500" />
                </button>
              ))
          }
        </div>
      )}

      {/* Today's appointments */}
      {!query.trim() && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Citas de hoy</h2>
            </div>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' })}</span>
          </div>

          {loadingAppts ? (
            <div className="flex justify-center py-8">
              <RefreshCw size={20} className="text-gray-500 animate-spin" />
            </div>
          ) : appts.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No hay citas programadas para hoy</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {appts.map(a => (
                <div key={a.appointment_id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[3rem]">
                      <p className="text-sm font-bold text-violet-400">{timeStr(a.start_time)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{a.patient_name}</p>
                      <p className="text-xs text-gray-400">{a.service || 'Consulta general'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RecordBadge has={a.has_record} />
                    {!a.has_record && (
                      <button
                        onClick={() => handleFillRecord(a)}
                        className="text-xs px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded-lg transition-colors font-medium"
                      >
                        Llenar historia
                      </button>
                    )}
                    {a.patient_id && (
                      <button
                        onClick={() => router.push(`/admin/patients/${a.patient_id}`)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

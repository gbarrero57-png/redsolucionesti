'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Heart, AlertTriangle,
  Plus, ChevronDown, ChevronUp, Stethoscope, Pill, FileText,
  Calendar, Activity, Trash2, RefreshCw,
} from 'lucide-react';

interface Allergy { id: string; allergen: string; severity: string; reaction: string | null; confirmed: boolean; }
interface Patient {
  id: string; dni: string; full_name: string; birth_date: string | null;
  gender: string | null; phone: string | null; email: string | null;
  address: string | null; blood_type: string;
  emergency_contact_name: string | null; emergency_contact_phone: string | null;
  patient_allergies: Allergy[];
}
interface ClinicalRecord {
  id: string; consultation_date: string; reason: string; diagnosis: string;
  treatment: string | null; medications: string | null; observations: string | null;
  next_appointment_rec: string | null; attended_by_name: string | null;
  weight_kg: number | null; height_cm: number | null;
  blood_pressure: string | null; temperature_c: number | null;
  total_count?: number;
}

const SEV_CFG: Record<string, { label: string; cls: string }> = {
  anafilaxis: { label: 'Anafilaxis', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  severa:     { label: 'Severa',     cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  moderada:   { label: 'Moderada',   cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  leve:       { label: 'Leve',       cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ConsultCard({ r }: { r: ClinicalRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/50 transition-colors text-left">
        <div>
          <p className="text-sm font-semibold text-white">{fmtDate(r.consultation_date)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{r.reason.substring(0, 80)}{r.reason.length > 80 ? '...' : ''}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-3">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Stethoscope size={10} /> Diagnóstico</p>
            <p className="text-sm text-white">{r.diagnosis}</p>
          </div>
          {r.treatment && <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Activity size={10} /> Tratamiento</p>
            <p className="text-sm text-gray-300">{r.treatment}</p>
          </div>}
          {r.medications && <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Pill size={10} /> Medicamentos</p>
            <p className="text-sm text-gray-300 whitespace-pre-line">{r.medications}</p>
          </div>}
          {r.observations && <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><FileText size={10} /> Observaciones</p>
            <p className="text-sm text-gray-300">{r.observations}</p>
          </div>}
          {(r.weight_kg || r.height_cm || r.blood_pressure || r.temperature_c) && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {r.weight_kg    && <div className="bg-gray-900 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Peso</p><p className="text-sm font-bold text-white">{r.weight_kg} kg</p></div>}
              {r.height_cm    && <div className="bg-gray-900 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Talla</p><p className="text-sm font-bold text-white">{r.height_cm} cm</p></div>}
              {r.blood_pressure && <div className="bg-gray-900 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Presión</p><p className="text-sm font-bold text-white">{r.blood_pressure}</p></div>}
              {r.temperature_c  && <div className="bg-gray-900 rounded-lg p-2 text-center"><p className="text-xs text-gray-400">Temp.</p><p className="text-sm font-bold text-white">{r.temperature_c}°C</p></div>}
            </div>
          )}
          {r.next_appointment_rec && (
            <p className="text-xs text-violet-300 flex items-center gap-1"><Calendar size={10} /> Próxima cita sugerida: {fmtDate(r.next_appointment_rec)}</p>
          )}
          {r.attended_by_name && <p className="text-xs text-gray-500">Atendido por: {r.attended_by_name}</p>}
        </div>
      )}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [patient, setPatient]   = useState<Patient | null>(null);
  const [records, setRecords]   = useState<ClinicalRecord[]>([]);
  const [total,   setTotal]     = useState(0);
  const [page,    setPage]      = useState(1);
  const [loading, setLoading]   = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ allergen: '', severity: 'leve', reaction: '' });
  const [savingAllergy, setSavingAllergy] = useState(false);

  const loadPatient = useCallback(async () => {
    const r = await fetch(`/api/admin/patients?id=${id}`);
    if (r.ok) setPatient(await r.json());
    else router.push('/admin/patients');
    setLoading(false);
  }, [id, router]);

  const loadRecords = useCallback(async (p = 1) => {
    setRecLoading(true);
    const r = await fetch(`/api/admin/clinical-records?patient_id=${id}&page=${p}`);
    const d = await r.json();
    setRecords(d.records || []);
    setTotal(d.total || 0);
    setRecLoading(false);
  }, [id]);

  useEffect(() => { loadPatient(); }, [loadPatient]);
  useEffect(() => { loadRecords(page); }, [loadRecords, page]);

  async function addAllergy() {
    if (!allergyForm.allergen.trim()) return;
    setSavingAllergy(true);
    await fetch(`/api/admin/patients/${id}/allergies`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: id, ...allergyForm }),
    });
    setSavingAllergy(false);
    setShowAddAllergy(false);
    setAllergyForm({ allergen: '', severity: 'leve', reaction: '' });
    loadPatient();
  }

  async function removeAllergy(allergyId: string) {
    await fetch(`/api/admin/patients/${id}/allergies?allergy_id=${allergyId}`, { method: 'DELETE' });
    loadPatient();
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <RefreshCw size={24} className="text-violet-400 animate-spin" />
    </div>
  );
  if (!patient) return null;

  const severeAllergies = patient.patient_allergies.filter(a => a.severity === 'anafilaxis' || a.severity === 'severa');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/patients')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{patient.full_name}</h1>
          <p className="text-xs text-gray-400">DNI: {patient.dni}</p>
        </div>
        <button
          onClick={() => router.push(`/admin/patients/${id}/records/new`)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} /> Nueva consulta
        </button>
      </div>

      {/* Critical allergy alert */}
      {severeAllergies.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Alergias críticas</p>
            <p className="text-xs text-red-400 mt-0.5">{severeAllergies.map(a => a.allergen).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: profile */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><User size={14} className="text-violet-400" /> Datos del paciente</h2>
            <div className="space-y-2 text-sm">
              {patient.birth_date && <p className="text-gray-300"><span className="text-gray-500">Nacimiento: </span>{fmtDate(patient.birth_date)}</p>}
              {patient.gender && <p className="text-gray-300"><span className="text-gray-500">Género: </span>{{ M: 'Masculino', F: 'Femenino', otro: 'Otro' }[patient.gender] || patient.gender}</p>}
              <p className="text-gray-300"><span className="text-gray-500">Sangre: </span>{patient.blood_type === 'desconocido' ? 'Desconocido' : patient.blood_type}</p>
              {patient.phone && <p className="text-gray-300 flex items-center gap-1"><Phone size={12} className="text-gray-500" /> {patient.phone}</p>}
              {patient.email && <p className="text-gray-300 flex items-center gap-1"><Mail size={12} className="text-gray-500" /> {patient.email}</p>}
              {patient.address && <p className="text-gray-300 flex items-center gap-1"><MapPin size={12} className="text-gray-500" /> {patient.address}</p>}
            </div>
          </div>

          {/* Emergency contact */}
          {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Contacto de emergencia</p>
              {patient.emergency_contact_name && <p className="text-sm text-white">{patient.emergency_contact_name}</p>}
              {patient.emergency_contact_phone && <p className="text-sm text-gray-400 flex items-center gap-1"><Phone size={12} /> {patient.emergency_contact_phone}</p>}
            </div>
          )}

          {/* Allergies */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Heart size={14} className="text-red-400" /> Alergias</h2>
              <button onClick={() => setShowAddAllergy(v => !v)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                <Plus size={12} /> Agregar
              </button>
            </div>
            {showAddAllergy && (
              <div className="space-y-2">
                <input value={allergyForm.allergen} onChange={e => setAllergyForm(f => ({ ...f, allergen: e.target.value }))}
                  placeholder="Alérgeno" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                <select value={allergyForm.severity} onChange={e => setAllergyForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                  <option value="leve">Leve</option>
                  <option value="moderada">Moderada</option>
                  <option value="severa">Severa</option>
                  <option value="anafilaxis">Anafilaxis</option>
                </select>
                <input value={allergyForm.reaction} onChange={e => setAllergyForm(f => ({ ...f, reaction: e.target.value }))}
                  placeholder="Reacción (opcional)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                <button onClick={addAllergy} disabled={savingAllergy || !allergyForm.allergen.trim()}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                  {savingAllergy ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
            {patient.patient_allergies.length === 0
              ? <p className="text-xs text-gray-500">Sin alergias registradas</p>
              : patient.patient_allergies.map(a => (
                <div key={a.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${SEV_CFG[a.severity]?.cls || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                  <div>
                    <span className="font-semibold">{a.allergen}</span>
                    <span className="ml-2 opacity-70">{SEV_CFG[a.severity]?.label || a.severity}</span>
                    {a.reaction && <span className="ml-1 opacity-60">· {a.reaction}</span>}
                  </div>
                  <button onClick={() => removeAllergy(a.id)} className="opacity-60 hover:opacity-100 ml-2"><Trash2 size={12} /></button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Right: timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Stethoscope size={14} className="text-violet-400" /> Historial de consultas
              <span className="text-xs text-gray-400 font-normal">({total} total)</span>
            </h2>
          </div>

          {recLoading ? (
            <div className="flex justify-center py-8"><RefreshCw size={20} className="text-gray-500 animate-spin" /></div>
          ) : records.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <FileText size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-gray-400 text-sm">No hay consultas registradas</p>
              <button onClick={() => router.push(`/admin/patients/${id}/records/new`)}
                className="mt-3 text-xs px-4 py-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded-lg transition-colors">
                Agregar primera consulta
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {records.map(r => <ConsultCard key={r.id} r={r} />)}
              </div>
              {total > 10 && (
                <div className="flex items-center justify-center gap-3">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors">
                    ← Anterior
                  </button>
                  <span className="text-xs text-gray-400">Página {page} de {Math.ceil(total / 10)}</span>
                  <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors">
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Stethoscope, Pill, FileText, Activity, Calendar, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const inputCls = "w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 resize-none";
const labelCls = "block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1";

function Field({ label, required, error, icon, children }: { label: string; required?: boolean; error?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className={`${labelCls} flex items-center gap-1`}>{icon}{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function NewConsultationForm() {
  const { id: patientId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const appointmentId   = searchParams.get('appointment') || '';
  const patientNameUrl  = searchParams.get('name') || '';

  const [patient, setPatient] = useState<{ full_name: string; blood_type: string; dni: string; allergies: { allergen: string; severity: string }[] } | null>(null);
  const [form, setForm] = useState({
    consultation_date: new Date().toISOString().split('T')[0],
    reason: '', diagnosis: '', treatment: '', medications: '',
    observations: '', next_appointment_rec: '',
    weight_kg: '', height_cm: '', blood_pressure: '', temperature_c: '',
    appointment_id: appointmentId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showVitals, setShowVitals] = useState(false);
  const [pendingAppts, setPendingAppts] = useState<{ id: string; start_time: string; service: string }[]>([]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`/api/admin/patients?id=${patientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPatient({
        full_name: d.full_name, blood_type: d.blood_type, dni: d.dni,
        allergies: (d.patient_allergies || []).map((a: { allergen: string; severity: string }) => ({ allergen: a.allergen, severity: a.severity })),
      }));
  }, [patientId]);

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/admin/appointments?from=${weekAgo}&status=scheduled`)
      .then(r => r.json())
      .then(d => setPendingAppts(Array.isArray(d) ? d.slice(0, 20) : []));
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.reason.trim()) e.reason = 'El motivo de consulta es requerido';
    if (!form.diagnosis.trim()) e.diagnosis = 'El diagnóstico es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setGlobalError('');
    const r = await fetch('/api/admin/clinical-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, ...form }),
    });
    const data = await r.json();
    if (!r.ok) { setGlobalError(data.error || 'Error al guardar'); setSaving(false); return; }
    router.push(`/admin/patients/${patientId}`);
  }

  const severeAllergies = patient?.allergies.filter(a => a.severity === 'anafilaxis' || a.severity === 'severa') || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push(`/admin/patients/${patientId}`)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Volver al paciente
        </button>
        <h1 className="text-xl font-bold text-white">Nueva consulta</h1>
        <div />
      </div>

      {/* Patient info */}
      {patient && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">{patient.full_name}</p>
            <p className="text-xs text-gray-400">DNI: {patient.dni} · Sangre: {patient.blood_type}</p>
          </div>
          {severeAllergies.length > 0 && (
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={14} />
              <p className="text-xs font-semibold">{severeAllergies.map(a => a.allergen).join(', ')}</p>
            </div>
          )}
        </div>
      )}
      {!patient && patientNameUrl && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm font-medium text-white">{patientNameUrl}</p>
          <p className="text-xs text-gray-400">Paciente nuevo</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date + appointment */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de consulta" required icon={<Calendar size={10} />}>
              <input type="date" value={form.consultation_date} onChange={e => set('consultation_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Vincular con cita" icon={<Calendar size={10} />}>
              <select value={form.appointment_id} onChange={e => set('appointment_id', e.target.value)} className={inputCls}>
                <option value="">— Sin cita —</option>
                {appointmentId && <option value={appointmentId}>Cita pre-seleccionada</option>}
                {pendingAppts.filter(a => a.id !== appointmentId).map(a => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.start_time).toLocaleDateString('es-PE')} · {a.service}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Clinical data */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Stethoscope size={16} className="text-violet-400" /> Datos de la consulta
          </h2>
          <Field label="Motivo de consulta" required error={errors.reason} icon={<FileText size={10} />}>
            <textarea rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="¿Por qué viene el paciente hoy?" className={inputCls} />
          </Field>
          <Field label="Diagnóstico" required error={errors.diagnosis} icon={<Stethoscope size={10} />}>
            <textarea rows={2} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="Diagnóstico clínico" className={inputCls} />
          </Field>
          <Field label="Tratamiento indicado" icon={<Activity size={10} />}>
            <textarea rows={2} value={form.treatment} onChange={e => set('treatment', e.target.value)} placeholder="Procedimientos, indicaciones, terapias..." className={inputCls} />
          </Field>
          <Field label="Medicamentos recetados" icon={<Pill size={10} />}>
            <textarea rows={3} value={form.medications} onChange={e => set('medications', e.target.value)}
              placeholder={'Nombre — dosis — frecuencia\nEj: Amoxicilina 500mg — 1 cápsula — cada 8h por 7 días'} className={inputCls} />
          </Field>
          <Field label="Observaciones" icon={<FileText size={10} />}>
            <textarea rows={2} value={form.observations} onChange={e => set('observations', e.target.value)} placeholder="Evolución del paciente, notas adicionales..." className={inputCls} />
          </Field>
          <Field label="Próxima cita recomendada" icon={<Calendar size={10} />}>
            <input type="date" value={form.next_appointment_rec} onChange={e => set('next_appointment_rec', e.target.value)}
              min={new Date().toISOString().split('T')[0]} className={inputCls} />
          </Field>
        </div>

        {/* Vitals collapsible */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setShowVitals(v => !v)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-800/50 transition-colors">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity size={16} className="text-violet-400" /> Signos vitales (opcional)
            </span>
            {showVitals ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {showVitals && (
            <div className="p-5 pt-0 grid grid-cols-2 gap-4">
              <Field label="Peso (kg)">
                <input type="number" step="0.1" min="1" max="300" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="68.5" className={inputCls} />
              </Field>
              <Field label="Talla (cm)">
                <input type="number" step="0.1" min="30" max="250" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="165" className={inputCls} />
              </Field>
              <Field label="Presión arterial">
                <input value={form.blood_pressure} onChange={e => set('blood_pressure', e.target.value)} placeholder="120/80 mmHg" className={inputCls} />
              </Field>
              <Field label="Temperatura (°C)">
                <input type="number" step="0.1" min="30" max="45" value={form.temperature_c} onChange={e => set('temperature_c', e.target.value)} placeholder="36.5" className={inputCls} />
              </Field>
            </div>
          )}
        </div>

        {globalError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{globalError}</p>
        )}

        <div className="flex gap-4 pb-8">
          <button type="button" onClick={() => router.push(`/admin/patients/${patientId}`)}
            className="flex-1 px-4 py-3 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? 'Guardando historia...' : 'Guardar consulta'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewConsultationPage() {
  return <Suspense><NewConsultationForm /></Suspense>;
}

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

const inputCls = "w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60";
const labelCls = "block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function NewPatientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointment');

  const [form, setForm] = useState({
    dni: '',
    full_name: searchParams.get('name') || '',
    phone: searchParams.get('phone') || '',
    birth_date: '', gender: '', email: '', address: '',
    blood_type: 'desconocido',
    emergency_contact_name: '', emergency_contact_phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dniStatus, setDniStatus] = useState<'idle' | 'checking' | 'exists' | 'free'>('idle');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function checkDni() {
    if (!form.dni || form.dni.length !== 8) return;
    setDniStatus('checking');
    const r = await fetch(`/api/admin/patients?q=${form.dni}`);
    const data = await r.json();
    const exact = Array.isArray(data) ? data.find((p: { dni: string }) => p.dni === form.dni) : null;
    if (exact) { setDniStatus('exists'); setExistingId(exact.id); }
    else { setDniStatus('free'); setExistingId(null); }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!/^[0-9]{8}$/.test(form.dni)) e.dni = 'El DNI debe tener 8 dígitos';
    if (!form.full_name.trim()) e.full_name = 'El nombre es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setGlobalError('');
    const r = await fetch('/api/admin/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    if (!r.ok) { setGlobalError(data.error || 'Error al guardar'); setSaving(false); return; }
    if (appointmentId) {
      router.push(`/admin/patients/${data.patient_id}/records/new?appointment=${appointmentId}`);
    } else {
      router.push(`/admin/patients/${data.patient_id}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/admin/patients')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        <h1 className="text-xl font-bold text-white">Nuevo paciente</h1>
        <div />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* DNI */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
          <Field label="DNI" required error={errors.dni}>
            <div className="relative">
              <input value={form.dni}
                onChange={e => { set('dni', e.target.value.replace(/\D/g, '').slice(0, 8)); setDniStatus('idle'); }}
                onBlur={checkDni} placeholder="12345678" maxLength={8} className={inputCls} />
              {dniStatus === 'checking' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
              )}
              {dniStatus === 'free' && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />}
            </div>
          </Field>
          {dniStatus === 'exists' && existingId && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">Este DNI ya está registrado</p>
                <button type="button"
                  onClick={() => router.push(appointmentId ? `/admin/patients/${existingId}/records/new?appointment=${appointmentId}` : `/admin/patients/${existingId}`)}
                  className="mt-1 text-xs font-medium text-amber-400 underline">
                  Ver perfil existente →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Personal data */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <User size={16} className="text-violet-400" /> Datos personales
          </h2>
          <Field label="Nombre completo" required error={errors.full_name}>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Apellidos y nombres" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de nacimiento">
              <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Género">
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                <option value="">— Seleccionar —</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo de sangre">
              <select value={form.blood_type} onChange={e => set('blood_type', e.target.value)} className={inputCls}>
                {['desconocido','O+','O-','A+','A-','B+','B-','AB+','AB-'].map(t => (
                  <option key={t} value={t}>{t === 'desconocido' ? 'Desconocido' : t}</option>
                ))}
              </select>
            </Field>
            <Field label="Teléfono">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+51 999 000 000" className={inputCls} />
            </Field>
          </div>
          <Field label="Correo electrónico">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="paciente@correo.com" className={inputCls} />
          </Field>
          <Field label="Dirección">
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Av. ejemplo 123, Lima" className={inputCls} />
          </Field>
        </div>

        {/* Emergency contact */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Contacto de emergencia</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre">
              <input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} placeholder="Nombre completo" className={inputCls} />
            </Field>
            <Field label="Teléfono">
              <input value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} placeholder="+51 999 000 000" className={inputCls} />
            </Field>
          </div>
        </div>

        {globalError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{globalError}</p>
        )}

        <div className="flex gap-4 pb-8">
          <button type="button" onClick={() => router.push('/admin/patients')}
            className="flex-1 px-4 py-3 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || dniStatus === 'exists'}
            className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? 'Guardando...' : appointmentId ? 'Guardar y llenar historia' : 'Registrar paciente'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewPatientPage() {
  return <Suspense><NewPatientForm /></Suspense>;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Heart, AlertTriangle,
  Plus, ChevronDown, ChevronUp, Stethoscope, Pill, FileText,
  Calendar, Activity, Trash2, RefreshCw, Pencil, X, Save,
  DollarSign, CheckCircle2, Clock, ClipboardList, CreditCard,
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
interface PatientBalance { total_debt: number; overdue_debt: number; pending_payments: number; }
interface Payment {
  id: string; amount: number; payment_method: string; status: string;
  due_date: string | null; paid_at: string | null; notes: string | null; created_at: string;
}
interface TreatmentPlan {
  id: string; title: string; total_amount: number; status: string;
  created_at: string; approved_at: string | null;
}
interface PaymentInstallment {
  id: string; installment_num: number; due_date: string; amount: number;
  status: string; paid_at: string | null;
}
interface PaymentPlan {
  id: string; total_amount: number; installment_amount: number; frequency: string;
  installments_total: number; installments_paid: number; start_date: string;
  next_due_date: string | null; status: string; notes: string | null; created_at: string;
  payment_installments?: PaymentInstallment[];
}

const SEV_CFG: Record<string, { label: string; cls: string }> = {
  anafilaxis: { label: 'Anafilaxis', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  severa:     { label: 'Severa',     cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  moderada:   { label: 'Moderada',   cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  leve:       { label: 'Leve',       cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
  yape: 'Yape', plin: 'Plin', other: 'Otro',
};
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  partial:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paid:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  refunded:  'bg-gray-500/10 text-gray-400 border-gray-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};
const PLAN_STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-500/10 text-gray-400 border-gray-500/20',
  active:    'bg-violet-500/10 text-violet-400 border-violet-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};
const PLAN_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', active: 'Activo', completed: 'Completado', cancelled: 'Cancelado',
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
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

/* ── Inline quick-payment form ── */
function QuickPaymentForm({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const [open,   setOpen]   = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [status, setStatus] = useState('paid');
  const [notes,  setNotes]  = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving]  = useState(false);
  const [error,  setError]   = useState('');

  async function save() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Monto inválido'); return; }
    setSaving(true); setError('');
    const r = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, amount: Number(amount), payment_method: method, status, due_date: dueDate || null, notes: notes || null }),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json(); setError(d.error || 'Error'); return; }
    setOpen(false); setAmount(''); setNotes(''); setDueDate('');
    onSaved();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-medium transition-colors">
      <Plus size={12} /> Registrar cobro
    </button>
  );

  return (
    <div className="bg-gray-800 border border-violet-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-violet-300">Nuevo cobro</p>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Monto (S/)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Estado</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50">
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="partial">Parcial</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Método</label>
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50">
            {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {(status === 'pending' || status === 'partial') && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fecha límite</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
          </div>
        )}
      </div>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas (opcional)"
        className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button onClick={save} disabled={saving}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
        {saving ? 'Guardando...' : 'Guardar cobro'}
      </button>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get('tab') as 'consultas' | 'cobros' | 'presupuestos' | null) ?? 'consultas';
  const [tab, setTab] = useState<'consultas' | 'cobros' | 'presupuestos'>(initialTab);

  const [patient, setPatient]   = useState<Patient | null>(null);
  const [records, setRecords]   = useState<ClinicalRecord[]>([]);
  const [total,   setTotal]     = useState(0);
  const [page,    setPage]      = useState(1);
  const [loading, setLoading]   = useState(true);
  const [recLoading, setRecLoading] = useState(true);

  // CRM state
  const [balance,      setBalance]      = useState<PatientBalance | null>(null);
  const [payments,     setPayments]     = useState<Payment[]>([]);
  const [plans,        setPlans]        = useState<TreatmentPlan[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planInstalls, setPlanInstalls] = useState<Record<string, PaymentInstallment[]>>({});
  const [showNewPlan,  setShowNewPlan]  = useState(false);
  const [crmLoading,   setCrmLoading]   = useState(false);

  // New payment plan form
  const [ppForm, setPpForm] = useState({
    total_amount: '', installment_amount: '', frequency: 'monthly',
    installments_total: '', start_date: '', notes: '',
  });
  const [ppSaving, setPpSaving] = useState(false);
  const [ppError,  setPpError]  = useState('');

  // Patient edit state
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ allergen: '', severity: 'leve', reaction: '' });
  const [savingAllergy, setSavingAllergy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '', dni: '', birth_date: '', gender: '', phone: '', email: '',
    address: '', blood_type: 'desconocido', emergency_contact_name: '', emergency_contact_phone: '',
  });
  const [editErr, setEditErr]     = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const loadCrm = useCallback(async () => {
    setCrmLoading(true);
    const [payRes, planRes, ppRes] = await Promise.all([
      fetch(`/api/admin/payments?patient_id=${id}&limit=50`),
      fetch(`/api/admin/treatment-plans?patient_id=${id}`),
      fetch(`/api/admin/payment-plans?patient_id=${id}`),
    ]);
    const [payData, planData, ppData] = await Promise.all([payRes.json(), planRes.json(), ppRes.json()]);
    const pendingList = Array.isArray(payData) ? payData.filter((p: Payment) => p.status === 'pending' || p.status === 'partial') : [];
    const overdueList = pendingList.filter((p: Payment) => p.due_date && new Date(p.due_date) < new Date());
    setBalance({
      total_debt:       pendingList.reduce((s: number, p: Payment) => s + Number(p.amount), 0),
      overdue_debt:     overdueList.reduce((s: number, p: Payment) => s + Number(p.amount), 0),
      pending_payments: pendingList.length,
    });
    setPayments(Array.isArray(payData) ? payData : []);
    setPlans(Array.isArray(planData) ? planData : []);
    setPaymentPlans(Array.isArray(ppData) ? ppData : []);
    setCrmLoading(false);
  }, [id]);

  async function loadInstallments(planId: string) {
    if (planInstalls[planId]) { setExpandedPlan(expandedPlan === planId ? null : planId); return; }
    const r = await fetch(`/api/admin/payment-plans?plan_id=${planId}`);
    const d = await r.json();
    const installs = d.payment_installments || [];
    setPlanInstalls(prev => ({ ...prev, [planId]: installs }));
    setExpandedPlan(planId);
  }

  async function markInstallmentPaid(installmentId: string) {
    await fetch('/api/admin/payment-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installment_id: installmentId }),
    });
    // Refresh installments for the expanded plan
    if (expandedPlan) {
      setPlanInstalls(prev => ({ ...prev, [expandedPlan]: [] })); // force reload
      const r = await fetch(`/api/admin/payment-plans?plan_id=${expandedPlan}`);
      const d = await r.json();
      setPlanInstalls(prev => ({ ...prev, [expandedPlan]: d.payment_installments || [] }));
    }
    loadCrm();
  }

  async function savePaymentPlan() {
    if (!ppForm.total_amount || !ppForm.installment_amount || !ppForm.installments_total || !ppForm.start_date) {
      setPpError('Completa todos los campos requeridos'); return;
    }
    setPpSaving(true); setPpError('');
    const r = await fetch('/api/admin/payment-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: id, ...ppForm, total_amount: Number(ppForm.total_amount), installment_amount: Number(ppForm.installment_amount), installments_total: Number(ppForm.installments_total) }),
    });
    setPpSaving(false);
    if (!r.ok) { const d = await r.json(); setPpError(d.error || 'Error'); return; }
    setShowNewPlan(false);
    setPpForm({ total_amount: '', installment_amount: '', frequency: 'monthly', installments_total: '', start_date: '', notes: '' });
    loadCrm();
  }

  useEffect(() => { loadPatient(); }, [loadPatient]);
  useEffect(() => { loadRecords(page); }, [loadRecords, page]);
  useEffect(() => {
    if (tab === 'cobros' || tab === 'presupuestos') loadCrm();
  }, [tab, loadCrm]);

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

  function openEdit() {
    if (!patient) return;
    setEditForm({
      full_name: patient.full_name,
      dni: patient.dni,
      birth_date: patient.birth_date || '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      blood_type: patient.blood_type || 'desconocido',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
    });
    setEditErr(null);
    setEditing(true);
  }

  async function saveEdit() {
    if (!editForm.full_name.trim()) { setEditErr('El nombre es obligatorio'); return; }
    if (!/^[0-9]{8}$/.test(editForm.dni)) { setEditErr('DNI debe tener 8 dígitos'); return; }
    setSavingEdit(true); setEditErr(null);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (!res.ok) { const d = await res.json(); setEditErr(d.error || 'Error al guardar'); return; }
      setEditing(false);
      await loadPatient();
    } catch { setEditErr('Error de conexión'); }
    finally { setSavingEdit(false); }
  }

  async function markPaid(paymentId: string) {
    await fetch('/api/admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: paymentId, status: 'paid' }),
    });
    loadCrm();
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <RefreshCw size={24} className="text-violet-400 animate-spin" />
    </div>
  );
  if (!patient) return null;

  const severeAllergies = patient.patient_allergies.filter(a => a.severity === 'anafilaxis' || a.severity === 'severa');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/patients')} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{patient.full_name}</h1>
          <p className="text-xs text-gray-400">DNI: {patient.dni}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
          >
            <Pencil size={14} /> Editar
          </button>
          <button
            onClick={() => router.push(`/admin/patients/${id}/records/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} /> Nueva consulta
          </button>
        </div>
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
          {editing ? (
            <div className="bg-gray-900 border border-violet-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Pencil size={14} className="text-violet-400" /> Editar paciente</h2>
                <button onClick={() => setEditing(false)} className="p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"><X size={16} /></button>
              </div>
              {[
                { label: 'Nombre completo *', key: 'full_name', type: 'text' },
                { label: 'DNI (8 dígitos) *', key: 'dni', type: 'text' },
                { label: 'Fecha de nacimiento', key: 'birth_date', type: 'date' },
                { label: 'Teléfono', key: 'phone', type: 'tel' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Dirección', key: 'address', type: 'text' },
                { label: 'Contacto emergencia', key: 'emergency_contact_name', type: 'text' },
                { label: 'Teléfono emergencia', key: 'emergency_contact_phone', type: 'tel' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input type={type} value={editForm[key as keyof typeof editForm]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Género</label>
                <select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors">
                  <option value="">— No especificado —</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Grupo sanguíneo</label>
                <select value={editForm.blood_type} onChange={e => setEditForm(f => ({ ...f, blood_type: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors">
                  {['desconocido','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b === 'desconocido' ? 'Desconocido' : b}</option>)}
                </select>
              </div>
              {editErr && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{editErr}</p>}
              <button onClick={saveEdit} disabled={savingEdit}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <>
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

              {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Contacto de emergencia</p>
                  {patient.emergency_contact_name && <p className="text-sm text-white">{patient.emergency_contact_name}</p>}
                  {patient.emergency_contact_phone && <p className="text-sm text-gray-400 flex items-center gap-1"><Phone size={12} /> {patient.emergency_contact_phone}</p>}
                </div>
              )}
            </>
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

        {/* Right: tabbed panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
            {([
              { key: 'consultas',    label: 'Consultas',    icon: Stethoscope },
              { key: 'cobros',       label: 'Cobros',       icon: DollarSign },
              { key: 'presupuestos', label: 'Presupuestos', icon: ClipboardList },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  tab === key
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Consultas ── */}
          {tab === 'consultas' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Stethoscope size={14} className="text-violet-400" /> Historial de consultas
                  <span className="text-xs text-gray-400 font-normal">({total} total)</span>
                </p>
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
          )}

          {/* ── Tab: Cobros ── */}
          {tab === 'cobros' && (
            <div className="space-y-4">
              {/* Balance summary */}
              {balance && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Deuda total</p>
                    <p className="text-lg font-bold text-white">{fmtAmount(balance.total_debt)}</p>
                  </div>
                  <div className={`border rounded-xl p-3 text-center ${balance.overdue_debt > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-800 border-gray-700'}`}>
                    <p className="text-xs text-gray-400 mb-1">Vencido</p>
                    <p className={`text-lg font-bold ${balance.overdue_debt > 0 ? 'text-red-400' : 'text-white'}`}>{fmtAmount(balance.overdue_debt)}</p>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock size={11} className="text-gray-400" />
                      <p className="text-xs text-gray-400">Pendientes</p>
                    </div>
                    <p className="text-lg font-bold text-white">{balance.pending_payments}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <DollarSign size={14} className="text-violet-400" /> Historial de cobros
                </p>
                <QuickPaymentForm patientId={id} onSaved={loadCrm} />
              </div>

              {crmLoading ? (
                <div className="flex justify-center py-8"><RefreshCw size={20} className="text-gray-500 animate-spin" /></div>
              ) : payments.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <DollarSign size={28} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-400 text-sm">Sin cobros registrados</p>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
                  {payments.map(p => (
                    <div key={p.id} className={`flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors ${(p.status === 'pending' || p.status === 'partial') && p.due_date && new Date(p.due_date) < new Date() ? 'border-l-2 border-red-500/60' : ''}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{fmtAmount(p.amount)}</p>
                          <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || ''}`}>
                            {p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : p.status === 'partial' ? 'Parcial' : p.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {METHOD_LABELS[p.payment_method]} · {fmtDateTime(p.created_at)}
                          {p.due_date && p.status !== 'paid' && ` · vence ${fmtDate(p.due_date)}`}
                        </p>
                        {p.notes && <p className="text-xs text-gray-500 truncate mt-0.5">{p.notes}</p>}
                      </div>
                      {(p.status === 'pending' || p.status === 'partial') && (
                        <button
                          onClick={() => markPaid(p.id)}
                          title="Marcar como pagado"
                          className="ml-3 p-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors flex-shrink-0"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Planes de cuotas (dentro de tab Cobros) ── */}
          {tab === 'cobros' && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <CreditCard size={14} className="text-violet-400" /> Planes de cuotas
                  {paymentPlans.length > 0 && <span className="text-xs text-gray-400 font-normal">({paymentPlans.length})</span>}
                </p>
                <button
                  onClick={() => setShowNewPlan(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus size={12} /> {showNewPlan ? 'Cancelar' : 'Nuevo plan'}
                </button>
              </div>

              {/* New payment plan form */}
              {showNewPlan && (
                <div className="bg-gray-800 border border-violet-500/30 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-violet-300">Configurar plan de cuotas</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Total a financiar (S/)*</label>
                      <input type="number" min="0" step="0.01" value={ppForm.total_amount} onChange={e => setPpForm(f => ({ ...f, total_amount: e.target.value }))}
                        placeholder="0.00" className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cuota (S/)*</label>
                      <input type="number" min="0" step="0.01" value={ppForm.installment_amount} onChange={e => setPpForm(f => ({ ...f, installment_amount: e.target.value }))}
                        placeholder="0.00" className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Frecuencia*</label>
                      <select value={ppForm.frequency} onChange={e => setPpForm(f => ({ ...f, frequency: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50">
                        <option value="weekly">Semanal</option>
                        <option value="biweekly">Quincenal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nro. cuotas*</label>
                      <input type="number" min="1" max="60" value={ppForm.installments_total} onChange={e => setPpForm(f => ({ ...f, installments_total: e.target.value }))}
                        placeholder="12" className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Fecha de inicio*</label>
                      <input type="date" value={ppForm.start_date} onChange={e => setPpForm(f => ({ ...f, start_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                    </div>
                  </div>
                  {ppError && <p className="text-xs text-red-400">{ppError}</p>}
                  <button onClick={savePaymentPlan} disabled={ppSaving}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                    {ppSaving ? 'Guardando...' : 'Crear plan de cuotas'}
                  </button>
                </div>
              )}

              {/* Plans list */}
              {paymentPlans.length === 0 && !showNewPlan && (
                <p className="text-xs text-gray-500 text-center py-3">Sin planes de cuotas</p>
              )}
              {paymentPlans.map(pp => (
                <div key={pp.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => loadInstallments(pp.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {fmtAmount(pp.installment_amount)} · {pp.frequency === 'weekly' ? 'semanal' : pp.frequency === 'biweekly' ? 'quincenal' : 'mensual'}
                        <span className="text-gray-400 font-normal ml-1">({pp.installments_paid}/{pp.installments_total} cuotas)</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Total: {fmtAmount(pp.total_amount)}
                        {pp.next_due_date ? ` · próximo vencimiento: ${fmtDate(pp.next_due_date)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pp.status === 'active' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : pp.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {pp.status === 'active' ? 'Activo' : pp.status === 'completed' ? 'Completado' : pp.status}
                      </span>
                      {expandedPlan === pp.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                  </button>

                  {expandedPlan === pp.id && (
                    <div className="border-t border-gray-800 divide-y divide-gray-800/50">
                      {(planInstalls[pp.id] || []).map(inst => (
                        <div key={inst.id} className={`flex items-center justify-between px-4 py-2.5 ${inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.due_date) < new Date()) ? 'bg-red-500/5' : ''}`}>
                          <div>
                            <span className="text-xs font-medium text-gray-300">Cuota {inst.installment_num}</span>
                            <span className={`text-xs ml-2 ${new Date(inst.due_date) < new Date() && inst.status === 'pending' ? 'text-red-400' : 'text-gray-500'}`}>
                              vence {fmtDate(inst.due_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{fmtAmount(inst.amount)}</span>
                            {inst.status === 'paid'
                              ? <CheckCircle2 size={14} className="text-emerald-400" />
                              : (
                                <button
                                  onClick={() => markInstallmentPaid(inst.id)}
                                  className="p-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
                                >
                                  <CheckCircle2 size={13} />
                                </button>
                              )
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Tab: Presupuestos ── */}
          {tab === 'presupuestos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <ClipboardList size={14} className="text-violet-400" /> Planes de tratamiento
                </p>
                <button
                  onClick={() => router.push(`/admin/treatment-plans/new?patient_id=${id}&patient_name=${encodeURIComponent(patient.full_name)}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus size={12} /> Nuevo presupuesto
                </button>
              </div>

              {crmLoading ? (
                <div className="flex justify-center py-8"><RefreshCw size={20} className="text-gray-500 animate-spin" /></div>
              ) : plans.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <ClipboardList size={28} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-400 text-sm">Sin planes de tratamiento</p>
                  <button
                    onClick={() => router.push(`/admin/treatment-plans/new?patient_id=${id}&patient_name=${encodeURIComponent(patient.full_name)}`)}
                    className="mt-3 text-xs px-4 py-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded-lg transition-colors"
                  >
                    Crear primer presupuesto
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map(plan => (
                    <div key={plan.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{plan.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(plan.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${PLAN_STATUS_COLORS[plan.status] || ''}`}>
                            {PLAN_STATUS_LABELS[plan.status] || plan.status}
                          </span>
                          <p className="text-sm font-bold text-white">{fmtAmount(plan.total_amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

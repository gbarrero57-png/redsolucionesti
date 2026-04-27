'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, AlertTriangle, Clock, CheckCircle2, RefreshCw,
  Plus, Search, ChevronRight, X, CreditCard, ArrowUpCircle, Bell, Send,
} from 'lucide-react';

interface DebtSummary {
  patients_with_debt:  number;
  patients_overdue:    number;
  total_debt:          number;
  total_overdue:       number;
}

interface ReminderStats {
  sent_today:   number;
  sent_7days:   number;
  last_sent_at: string | null;
}

interface Payment {
  id:             string;
  patient_id:     string;
  patient_name:   string | null;
  patient_phone:  string | null;
  patient_dni:    string | null;
  amount:         number;
  payment_method: string;
  status:         string;
  due_date:       string | null;
  paid_at:        string | null;
  reference:      string | null;
  notes:          string | null;
  created_at:     string;
}

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', partial: 'Parcial', paid: 'Pagado',
  refunded: 'Reembolsado', cancelled: 'Cancelado',
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(p: Payment) {
  return p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date();
}

/* ── Quick Register Payment Modal ── */
function RegisterModal({
  onClose, onSaved,
}: { onClose: () => void; onSaved: () => void }) {
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients]         = useState<Array<{ id: string; full_name: string; dni: string; phone: string | null }>>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; full_name: string } | null>(null);
  const [amount,   setAmount]   = useState('');
  const [method,   setMethod]   = useState('cash');
  const [status,   setStatus]   = useState('paid');
  const [dueDate,  setDueDate]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) { setPatients([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await fetch(`/api/admin/patients?q=${encodeURIComponent(patientQuery)}`);
      const d = await r.json();
      setPatients(Array.isArray(d) ? d : []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  async function handleSave() {
    if (!selectedPatient) { setError('Selecciona un paciente'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Monto inválido'); return; }
    setSaving(true); setError('');
    const r = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: selectedPatient.id,
        amount: Number(amount),
        payment_method: method,
        status,
        due_date: dueDate || null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json(); setError(d.error || 'Error al guardar'); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Registrar cobro</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Patient search */}
          {!selectedPatient ? (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Paciente</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  value={patientQuery}
                  onChange={e => setPatientQuery(e.target.value)}
                  placeholder="Buscar por nombre o DNI..."
                  className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                {searching && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              </div>
              {patients.length > 0 && (
                <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPatient({ id: p.id, full_name: p.full_name }); setPatientQuery(''); setPatients([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-white border-b border-gray-700 last:border-0"
                    >
                      <span className="font-medium">{p.full_name}</span>
                      <span className="text-gray-400 ml-2">DNI {p.dni}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <span className="text-sm font-medium text-violet-300">{selectedPatient.full_name}</span>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Monto (S/)</label>
            <input
              type="number" min="0" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Method */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Método de pago</label>
              <select
                value={method} onChange={e => setMethod(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              >
                {Object.entries(METHOD_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Estado</label>
              <select
                value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              >
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
              </select>
            </div>
          </div>

          {/* Due date (only if pending/partial) */}
          {(status === 'pending' || status === 'partial') && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Fecha límite de pago</label>
              <input
                type="date"
                value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Notas (opcional)</label>
            <input
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Pago por extracción, voucher #123..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </div>

          {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-200">
              Cancelar
            </button>
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Registrar cobro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function PaymentsPage() {
  const router = useRouter();
  const [summary,  setSummary]  = useState<DebtSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<string>('all');
  const [search,   setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult,   setReminderResult]   = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, payRes, remRes] = await Promise.all([
        fetch('/api/admin/payments?summary=1'),
        fetch('/api/admin/payments?limit=200'),
        fetch('/api/admin/debt-reminders'),
      ]);
      const [sumData, payData, remData] = await Promise.all([sumRes.json(), payRes.json(), remRes.json()]);
      setSummary(sumRes.ok ? sumData : null);
      setPayments(Array.isArray(payData) ? payData : []);
      setReminderStats(remRes.ok ? remData : null);
    } catch {
      // network error — leave state as-is
    }
    setLoading(false);
  }, []);

  async function sendReminders(dryRun = false) {
    setSendingReminders(true); setReminderResult(null);
    const r = await fetch('/api/admin/debt-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: dryRun, min_overdue_days: 1 }),
    });
    const d = await r.json();
    setSendingReminders(false);
    if (d.ok) {
      setReminderResult(dryRun
        ? `Vista previa: ${d.skipped ?? 0} pacientes recibirían recordatorio`
        : `Enviados: ${d.sent ?? 0} · Fallidos: ${d.failed ?? 0}`);
      if (!dryRun) loadData();
    } else {
      setReminderResult('Error: ' + (d.error || 'desconocido'));
    }
  }

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = payments.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter || (filter === 'overdue' && isOverdue(p));
    const q = search.toLowerCase();
    const matchSearch = !q || (p.patient_name?.toLowerCase().includes(q)) || (p.patient_dni?.includes(q));
    return matchFilter && matchSearch;
  });

  async function markPaid(id: string) {
    await fetch('/api/admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'paid' }),
    });
    loadData();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <DollarSign size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Cobros & CRM</h1>
            <p className="text-xs text-gray-400">Pagos, deudas y presupuestos de la clínica</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} /> Registrar cobro
          </button>
        </div>
      </div>

      {/* Debt reminder panel */}
      {(summary?.patients_overdue ?? 0) > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Bell size={18} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                {summary!.patients_overdue} paciente{summary!.patients_overdue !== 1 ? 's' : ''} con deuda vencida
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {reminderStats?.last_sent_at
                  ? `Último recordatorio: ${new Date(reminderStats.last_sent_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : 'Sin recordatorios enviados aún'}
                {reminderStats?.sent_today ? ` · ${reminderStats.sent_today} hoy` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => sendReminders(true)}
              disabled={sendingReminders}
              className="px-3 py-1.5 text-xs border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Vista previa
            </button>
            <button
              onClick={() => sendReminders(false)}
              disabled={sendingReminders}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {sendingReminders ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              Enviar recordatorios
            </button>
          </div>
          {reminderResult && (
            <p className="w-full text-xs text-gray-300 bg-gray-800 rounded-lg px-3 py-2">{reminderResult}</p>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Pacientes con deuda"
          value={summary?.patients_with_debt ?? '—'}
          icon={<Clock size={18} className="text-amber-400" />}
          color="amber"
          loading={loading}
        />
        <SummaryCard
          label="Deuda total"
          value={summary ? fmtAmount(Number(summary.total_debt ?? 0)) : '—'}
          icon={<DollarSign size={18} className="text-violet-400" />}
          color="violet"
          loading={loading}
        />
        <SummaryCard
          label="Pacientes vencidos"
          value={summary?.patients_overdue ?? '—'}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="red"
          loading={loading}
        />
        <SummaryCard
          label="Deuda vencida"
          value={summary ? fmtAmount(Number(summary.total_overdue ?? 0)) : '—'}
          icon={<ArrowUpCircle size={18} className="text-red-400" />}
          color="red"
          loading={loading}
        />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {[
            { value: 'all',      label: 'Todos' },
            { value: 'pending',  label: 'Pendientes' },
            { value: 'overdue',  label: 'Vencidos' },
            { value: 'paid',     label: 'Pagados' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          />
        </div>
      </div>

      {/* Payments list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={20} className="text-gray-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-500">
            <CreditCard size={28} className="mb-3 opacity-40" />
            <p className="text-sm">No hay cobros con estos filtros</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_100px_120px_100px_90px_80px] gap-3 px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span>Paciente</span>
              <span>Monto</span>
              <span>Método</span>
              <span>Estado</span>
              <span>Fecha límite</span>
              <span></span>
            </div>

            {filtered.map(p => (
              <div key={p.id} className={`px-4 py-3 hover:bg-gray-800/50 transition-colors ${isOverdue(p) ? 'border-l-2 border-red-500/60' : ''}`}>
                {/* Mobile layout */}
                <div className="sm:hidden flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.patient_name ?? 'Paciente'}</p>
                    <p className="text-xs text-gray-400">{METHOD_LABELS[p.payment_method]} · {fmtDate(p.created_at)}</p>
                    {p.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-sm font-bold text-white">{fmtAmount(p.amount)}</span>
                    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || ''}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                    {p.status !== 'paid' && (
                      <button
                        onClick={() => markPaid(p.id)}
                        className="text-[10px] px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-md transition-colors font-medium"
                      >
                        Marcar pagado
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[1fr_100px_120px_100px_90px_80px] gap-3 items-center">
                  <div className="min-w-0">
                    <button
                      onClick={() => router.push(`/admin/patients/${p.patient_id}`)}
                      className="text-sm font-medium text-white hover:text-violet-300 truncate block text-left"
                    >
                      {p.patient_name ?? 'Paciente'}
                    </button>
                    {p.notes && <p className="text-xs text-gray-500 truncate">{p.notes}</p>}
                  </div>
                  <span className="text-sm font-bold text-white">{fmtAmount(p.amount)}</span>
                  <span className="text-sm text-gray-400">{METHOD_LABELS[p.payment_method]}</span>
                  <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[p.status] || ''}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  <span className={`text-xs ${isOverdue(p) ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                    {fmtDate(p.due_date)}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    {p.status !== 'paid' && p.status !== 'cancelled' && (
                      <button
                        onClick={() => markPaid(p.id)}
                        title="Marcar como pagado"
                        className="p-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/admin/patients/${p.patient_id}`)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <RegisterModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, loading }: {
  label: string; value: string | number; icon: React.ReactNode;
  color: 'amber' | 'violet' | 'red' | 'emerald'; loading: boolean;
}) {
  const border = { amber: 'border-amber-500/20', violet: 'border-violet-500/20', red: 'border-red-500/20', emerald: 'border-emerald-500/20' }[color];
  const bg     = { amber: 'bg-amber-500/5', violet: 'bg-violet-500/5', red: 'bg-red-500/5', emerald: 'bg-emerald-500/5' }[color];
  return (
    <div className={`${bg} border ${border} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {loading
        ? <div className="h-6 w-16 bg-gray-800 rounded animate-pulse" />
        : <p className="text-xl font-bold text-white">{value}</p>
      }
    </div>
  );
}

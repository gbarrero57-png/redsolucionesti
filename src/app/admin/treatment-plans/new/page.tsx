'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Save, RefreshCw, AlertTriangle, ClipboardList,
} from 'lucide-react';

// Lucide doesn't have a Tooth icon — use a simple SVG inline
function ToothIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C9 2 6 4 6 7c0 2 1 3.5 1 5.5 0 3 1 7.5 2.5 9.5.5.7 1 1 1.5 1h2c.5 0 1-.3 1.5-1C16 20 17 15.5 17 12.5c0-2 1-3.5 1-5.5 0-3-3-5-6-5z"/>
    </svg>
  );
}

interface PlanItem {
  key:          string;  // local only for React key
  tooth_number: string;
  service:      string;
  description:  string;
  unit_price:   string;
  quantity:     string;
}

const COMMON_SERVICES = [
  'Consulta general', 'Limpieza dental', 'Extracción simple', 'Extracción con cirugía',
  'Resina compuesta', 'Amalgama', 'Endodoncia (unirradicular)', 'Endodoncia (birradicular)',
  'Endodoncia (trirradicular)', 'Corona de porcelana', 'Corona metal-porcelana',
  'Corona metálica', 'Carilla de porcelana', 'Prótesis parcial removible',
  'Prótesis total', 'Implante dental', 'Blanqueamiento dental', 'Ortodoncia mensual',
  'Radiografía periapical', 'Radiografía panorámica',
];

function newItem(): PlanItem {
  return { key: crypto.randomUUID(), tooth_number: '', service: '', description: '', unit_price: '', quantity: '1' };
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}

function itemSubtotal(item: PlanItem): number {
  const price = parseFloat(item.unit_price) || 0;
  const qty   = parseInt(item.quantity) || 1;
  return price * qty;
}

function NewTreatmentPlanPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const patientId   = searchParams.get('patient_id') ?? '';
  const patientName = searchParams.get('patient_name') ?? 'Paciente';

  const [title,  setTitle]  = useState('Plan de tratamiento');
  const [notes,  setNotes]  = useState('');
  const [items,  setItems]  = useState<PlanItem[]>([newItem()]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null); // key of active item

  useEffect(() => {
    if (!patientId) router.push('/admin/patients');
  }, [patientId, router]);

  function addItem() {
    setItems(prev => [...prev, newItem()]);
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => i.key !== key));
  }

  function updateItem(key: string, field: keyof PlanItem, value: string) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  }

  const total = items.reduce((sum, i) => sum + itemSubtotal(i), 0);
  const validItems = items.filter(i => i.service.trim() && parseFloat(i.unit_price) > 0);

  async function handleSave() {
    if (!patientId)             { setError('Paciente no especificado'); return; }
    if (validItems.length === 0) { setError('Agrega al menos un servicio con precio'); return; }

    setSaving(true); setError('');
    const r = await fetch('/api/admin/treatment-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        title: title.trim() || 'Plan de tratamiento',
        notes: notes.trim() || null,
        items: validItems.map((i, idx) => ({
          tooth_number: i.tooth_number ? parseInt(i.tooth_number) : null,
          service:      i.service.trim(),
          description:  i.description.trim() || null,
          unit_price:   parseFloat(i.unit_price),
          quantity:     parseInt(i.quantity) || 1,
          sort_order:   idx,
        })),
      }),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json(); setError(d.error || 'Error al guardar'); return; }
    router.push(`/admin/patients/${patientId}?tab=presupuestos`);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/patients/${patientId}`)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Nuevo presupuesto</h1>
          <p className="text-xs text-gray-400">{patientName}</p>
        </div>
      </div>

      {/* Plan meta */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Título del plan</label>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Rehabilitación oral completa"
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Observaciones (opcional)</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Notas clínicas, condiciones del presupuesto, etc."
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
          />
        </div>
      </div>

      {/* Items */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardList size={15} className="text-violet-400" /> Servicios
          </h2>
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-medium transition-colors"
          >
            <Plus size={12} /> Agregar fila
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[60px_1fr_80px_80px_90px_36px] gap-2 px-4 py-2 text-[10px] font-medium text-gray-500 uppercase tracking-wide border-b border-gray-800">
          <span>Diente</span>
          <span>Servicio</span>
          <span>Precio S/</span>
          <span>Cant.</span>
          <span className="text-right">Subtotal</span>
          <span></span>
        </div>

        {/* Item rows */}
        <div className="divide-y divide-gray-800/60">
          {items.map((item, idx) => (
            <div key={item.key} className="grid grid-cols-[60px_1fr_80px_80px_90px_36px] gap-2 px-4 py-2.5 items-start">

              {/* Tooth number */}
              <div className="relative">
                <input
                  type="number" min="1" max="32"
                  value={item.tooth_number}
                  onChange={e => updateItem(item.key, 'tooth_number', e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white text-center placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                {item.tooth_number && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
                    <ToothIcon size={9} />
                  </div>
                )}
              </div>

              {/* Service name + suggestions */}
              <div className="relative">
                <input
                  value={item.service}
                  onChange={e => { updateItem(item.key, 'service', e.target.value); setShowSuggestions(item.key); }}
                  onFocus={() => setShowSuggestions(item.key)}
                  onBlur={() => setTimeout(() => setShowSuggestions(null), 150)}
                  placeholder="Nombre del servicio"
                  className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
                {/* Autocomplete suggestions */}
                {showSuggestions === item.key && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-0.5 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {COMMON_SERVICES
                      .filter(s => !item.service || s.toLowerCase().includes(item.service.toLowerCase()))
                      .slice(0, 8)
                      .map(s => (
                        <button
                          key={s}
                          onMouseDown={() => { updateItem(item.key, 'service', s); setShowSuggestions(null); }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          {s}
                        </button>
                      ))
                    }
                    {COMMON_SERVICES.filter(s => !item.service || s.toLowerCase().includes(item.service.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-500">Servicio personalizado</p>
                    )}
                  </div>
                )}
                {/* Description sub-row */}
                <input
                  value={item.description}
                  onChange={e => updateItem(item.key, 'description', e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="mt-1 w-full px-2.5 py-1 bg-transparent border border-transparent hover:border-gray-700 rounded-md text-xs text-gray-500 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-gray-700 transition-colors"
                />
              </div>

              {/* Unit price */}
              <input
                type="number" min="0" step="0.50"
                value={item.unit_price}
                onChange={e => updateItem(item.key, 'unit_price', e.target.value)}
                placeholder="0.00"
                className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white text-right placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />

              {/* Quantity */}
              <input
                type="number" min="1" max="99"
                value={item.quantity}
                onChange={e => updateItem(item.key, 'quantity', e.target.value)}
                className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />

              {/* Subtotal */}
              <p className="text-sm font-semibold text-white text-right pt-1.5">
                {itemSubtotal(item) > 0 ? fmtAmount(itemSubtotal(item)) : '—'}
              </p>

              {/* Delete */}
              <button
                onClick={() => items.length > 1 ? removeItem(item.key) : undefined}
                disabled={items.length === 1}
                className="mt-1 p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{validItems.length} servicio{validItems.length !== 1 ? 's' : ''}</span>
            {items.length !== validItems.length && (
              <span className="text-amber-400">({items.length - validItems.length} sin precio)</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Total presupuesto</p>
            <p className="text-2xl font-bold text-white">{fmtAmount(total)}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/patients/${patientId}`)}
          className="flex-1 py-3 rounded-xl text-sm text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || validItems.length === 0}
          className="flex-2 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Guardando...' : `Guardar presupuesto · ${fmtAmount(total)}`}
        </button>
      </div>

    </div>
  );
}

export default function NewTreatmentPlanPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12 text-gray-500 text-sm">Cargando...</div>}>
      <NewTreatmentPlanPage />
    </Suspense>
  );
}

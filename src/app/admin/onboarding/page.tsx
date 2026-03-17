'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, RefreshCw, CheckCircle, XCircle, Copy,
  Eye, EyeOff, MessageSquare, Calendar, BookOpen, Users,
  Wifi, WifiOff, ChevronDown, ChevronUp,
} from 'lucide-react';

interface ClinicRow {
  id: string;
  name: string;
  subdomain: string;
  phone: string | null;
  active: boolean;
  created_at: string;
  chatwoot_inbox_id: number | null;
  staff_count: number;
  kb_count: number;
  conversations_count: number;
  appointments_count: number;
}

interface OnboardResult {
  clinic: { id: string; name: string; subdomain: string };
  admin: { email: string; user_id: string; password?: string };
  kb_count: number;
  chatwoot_inbox_id: number | null;
  panel_url: string;
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let pass = '';
  for (let i = 0; i < 14; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function StatBadge({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <Icon size={12} className="text-gray-500" />
      <span className="font-medium text-gray-300">{value}</span>
      <span>{label}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);

  const [form, setForm] = useState({
    clinic_name: '',
    subdomain: '',
    phone: '',
    address: '',
    timezone: 'America/Lima',
    welcome_message: '',
    admin_email: '',
    admin_full_name: '',
    use_default_kb: true,
  });

  const fetchClinics = useCallback(async () => {
    setLoadingClinics(true);
    try {
      const res = await fetch('/api/admin/onboard');
      if (!res.ok) {
        if (res.status === 403) {
          setError('Acceso denegado. Solo el superadmin puede ver esta página.');
          return;
        }
        throw new Error('Error cargando clínicas');
      }
      const data = await res.json();
      setClinics(Array.isArray(data) ? data : []);
    } catch {
      setError('Error cargando la lista de clínicas');
    } finally {
      setLoadingClinics(false);
    }
  }, []);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  function setField(key: string, val: string | boolean) {
    setForm(f => {
      const next = { ...f, [key]: val };
      // Auto-generate subdomain from clinic name
      if (key === 'clinic_name' && typeof val === 'string') {
        next.subdomain = slugify(val);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!form.clinic_name || !form.subdomain || !form.admin_email || !adminPassword) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic: {
            name: form.clinic_name,
            subdomain: form.subdomain,
            phone: form.phone || null,
            address: form.address || null,
            timezone: form.timezone,
            welcome_message: form.welcome_message || undefined,
          },
          admin: {
            email: form.admin_email,
            password: adminPassword,
            full_name: form.admin_full_name || undefined,
          },
          use_default_kb: form.use_default_kb,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al onboardear la clínica'); return; }
      setResult({ ...data, admin: { ...data.admin, password: adminPassword } } as OnboardResult & { admin: { email: string; user_id: string; password: string } });
      setShowForm(false);
      setForm({ clinic_name: '', subdomain: '', phone: '', address: '', timezone: 'America/Lima', welcome_message: '', admin_email: '', admin_full_name: '', use_default_kb: true });
      setAdminPassword('');
      await fetchClinics();
    } finally {
      setSaving(false);
    }
  }

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Building2 size={22} className="text-violet-400" />
            Onboarding de Clínicas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {clinics.length} clínica{clinics.length !== 1 ? 's' : ''} registrada{clinics.length !== 1 ? 's' : ''} · Super Admin
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchClinics} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} className={loadingClinics ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setResult(null); setError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nueva clínica
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-300 text-sm">
          <XCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Success result ────────────────────────────────────────────── */}
      {result && (
        <div className="mb-6 bg-green-900/10 border border-green-700/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-green-400" />
            <span className="font-semibold text-green-300">¡Clínica onboardeada exitosamente!</span>
            {result.chatwoot_inbox_id && (
              <span className="text-xs bg-blue-900/30 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded-full">
                Inbox #{result.chatwoot_inbox_id} creado
              </span>
            )}
            {result.kb_count > 0 && (
              <span className="text-xs bg-violet-900/30 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded-full">
                {result.kb_count} preguntas KB
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Credenciales para entregar al cliente</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: 'Panel de acceso', value: result.panel_url, field: 'url' },
              { label: 'Email', value: result.admin.email, field: 'email' },
              { label: 'Contraseña temporal', value: result.admin.password || '', field: 'pass' },
              { label: 'Clinic ID (técnico)', value: result.clinic.id, field: 'clinic_id' },
            ].map(({ label, value, field }) => (
              <div key={field} className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-2.5 border border-gray-800">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-100 font-mono truncate">{value}</p>
                </div>
                <button
                  onClick={() => copy(value, field)}
                  className="text-gray-500 hover:text-violet-400 transition-colors flex-shrink-0"
                  title="Copiar"
                >
                  {copiedField === field ? <CheckCircle size={15} className="text-green-400" /> : <Copy size={15} />}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-amber-400 mt-3 flex items-center gap-1.5">
            ⚠ Pide al admin que cambie su contraseña al primer ingreso
          </p>
        </div>
      )}

      {/* ── New clinic form ───────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-gray-800 rounded-xl border border-violet-700/30 p-5 mb-6">
          <h3 className="text-sm font-semibold text-violet-300 mb-5">Datos de la nueva clínica</h3>

          {/* Clinic info */}
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Información de la clínica</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-400 mb-1 block">Nombre de la clínica *</label>
              <input
                value={form.clinic_name}
                onChange={e => setField('clinic_name', e.target.value)}
                placeholder="Clínica Dental San José"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Subdomain * <span className="text-gray-600">(solo letras, números, guiones)</span>
              </label>
              <input
                value={form.subdomain}
                onChange={e => setField('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="sanjose"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Teléfono</label>
              <input
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+51987654321"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Zona horaria</label>
              <select
                value={form.timezone}
                onChange={e => setField('timezone', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500"
              >
                <option value="America/Lima">América/Lima (Perú)</option>
                <option value="America/Bogota">América/Bogotá (Colombia)</option>
                <option value="America/Mexico_City">América/Ciudad de México</option>
                <option value="America/Santiago">América/Santiago (Chile)</option>
                <option value="America/Buenos_Aires">América/Buenos Aires</option>
                <option value="America/Caracas">América/Caracas (Venezuela)</option>
                <option value="America/Guayaquil">América/Guayaquil (Ecuador)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Dirección</label>
              <input
                value={form.address}
                onChange={e => setField('address', e.target.value)}
                placeholder="Av. Brasil 456, Breña, Lima"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Mensaje de bienvenida del bot <span className="text-gray-600">(opcional)</span></label>
              <textarea
                value={form.welcome_message}
                onChange={e => setField('welcome_message', e.target.value)}
                placeholder={`Hola 👋 Soy SofIA, tu asistente de ${form.clinic_name || 'la clínica'}. ¿En qué puedo ayudarte?`}
                rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
          </div>

          {/* Admin user */}
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Usuario administrador de la clínica</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre completo</label>
              <input
                value={form.admin_full_name}
                onChange={e => setField('admin_full_name', e.target.value)}
                placeholder="Dr. Carlos García"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Email * <span className="text-gray-600 normal-case">· recibirá reportes PDF mensuales</span>
              </label>
              <input
                type="email"
                value={form.admin_email}
                onChange={e => setField('admin_email', e.target.value)}
                placeholder="admin@clinica.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Contraseña temporal *</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  onClick={() => { setAdminPassword(generatePassword()); setShowPass(true); }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  Generar
                </button>
              </div>
            </div>
          </div>

          {/* Options */}
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Opciones</p>
          <label className="flex items-center gap-3 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={form.use_default_kb}
              onChange={e => setField('use_default_kb', e.target.checked)}
              className="w-4 h-4 rounded accent-violet-500"
            />
            <div>
              <span className="text-sm text-gray-200">Cargar base de conocimiento dental completa</span>
              <span className="text-xs text-gray-500 block">30 preguntas sobre horarios, precios, servicios, pagos, seguros y más</span>
            </div>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving || !form.clinic_name || !form.subdomain || !form.admin_email || !adminPassword}
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Creando clínica...' : 'Crear clínica'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {saving && (
              <span className="text-xs text-gray-400 animate-pulse">Esto tarda ~5 segundos...</span>
            )}
          </div>
        </div>
      )}

      {/* ── Clinic list ───────────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Clínicas registradas
      </h2>

      {loadingClinics ? (
        <div className="flex items-center justify-center h-40 text-gray-500">
          <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : clinics.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500 bg-gray-900/50 rounded-xl border border-gray-800">
          <Building2 size={32} className="mb-2 opacity-30" />
          <p className="text-sm">No hay clínicas registradas</p>
          <p className="text-xs text-gray-600 mt-1">Crea la primera con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clinics.map(clinic => {
            const expanded = expandedClinic === clinic.id;
            return (
              <div
                key={clinic.id}
                className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedClinic(expanded ? null : clinic.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors text-left"
                >
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${clinic.active ? 'bg-green-400' : 'bg-gray-600'}`} />

                  {/* Name + subdomain */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-100">{clinic.name}</p>
                      <code className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{clinic.subdomain}</code>
                      {clinic.chatwoot_inbox_id ? (
                        <span className="flex items-center gap-1 text-xs text-blue-400"><Wifi size={10} />Chatwoot #{clinic.chatwoot_inbox_id}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-600"><WifiOff size={10} />Sin inbox</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Creada {new Date(clinic.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-4">
                    <StatBadge icon={Users} value={clinic.staff_count} label="staff" />
                    <StatBadge icon={BookOpen} value={clinic.kb_count} label="KB" />
                    <StatBadge icon={MessageSquare} value={clinic.conversations_count} label="convs" />
                    <StatBadge icon={Calendar} value={clinic.appointments_count} label="citas" />
                  </div>

                  {expanded ? <ChevronUp size={16} className="text-gray-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />}
                </button>

                {expanded && (
                  <div className="border-t border-gray-800 px-4 py-3 bg-gray-900/50">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                      <StatBadge icon={Users} value={clinic.staff_count} label="usuarios activos" />
                      <StatBadge icon={BookOpen} value={clinic.kb_count} label="preguntas KB" />
                      <StatBadge icon={MessageSquare} value={clinic.conversations_count} label="conversaciones" />
                      <StatBadge icon={Calendar} value={clinic.appointments_count} label="citas" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">clinic_id:</span>
                      <code className="text-xs text-gray-400 font-mono">{clinic.id}</code>
                      <button
                        onClick={() => copy(clinic.id, clinic.id)}
                        className="text-gray-600 hover:text-violet-400 transition-colors"
                      >
                        {copiedField === clinic.id ? <CheckCircle size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                    {clinic.phone && (
                      <p className="text-xs text-gray-500 mt-1">Tel: {clinic.phone}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

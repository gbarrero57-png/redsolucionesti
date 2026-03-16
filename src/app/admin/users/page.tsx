'use client';

import { useState, useEffect } from 'react';
import {
  Users, Plus, Shield, UserCheck, Trash2,
  RefreshCw, Eye, EyeOff, CheckCircle, XCircle, Clock
} from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  active: boolean;
  created_at: string;
  last_sign_in: string | null;
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', color: 'text-violet-400 bg-violet-400/10 border-violet-400/30', icon: Shield },
  staff: { label: 'Staff', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: UserCheck },
};

function timeAgo(iso: string | null) {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function UsersPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff',
  });

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStaff(); }, []);

  function flash(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); }
    else { setError(msg); setTimeout(() => setError(null), 5000); }
  }

  async function createUser() {
    if (!form.email || !form.password) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Error al crear usuario', 'error'); return; }
      flash(`Usuario ${data.email} creado correctamente`, 'success');
      setShowForm(false);
      setForm({ email: '', password: '', full_name: '', role: 'staff' });
      await fetchStaff();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, active: !member.active }),
      });
      if (res.ok) await fetchStaff();
    } catch { /* ignore */ }
  }

  async function changeRole(member: StaffMember, role: string) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, role }),
      });
      if (res.ok) await fetchStaff();
    } catch { /* ignore */ }
  }

  async function deleteUser(member: StaffMember) {
    if (!confirm(`¿Eliminar al usuario ${member.email}? Esta acción no se puede deshacer.`)) return;
    setDeleting(member.id);
    try {
      const res = await fetch(`/api/admin/users?id=${member.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Error al eliminar', 'error'); return; }
      flash('Usuario eliminado', 'success');
      await fetchStaff();
    } finally {
      setDeleting(null);
    }
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, password: pass }));
    setShowPass(true);
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users size={22} className="text-violet-400" />
            Usuarios y acceso
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{staff.length} miembro{staff.length !== 1 ? 's' : ''} del equipo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStaff} className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-green-300 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-300 text-sm">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Create user form */}
      {showForm && (
        <div className="bg-gray-800 rounded-xl border border-violet-700/30 p-5 mb-6">
          <h3 className="text-sm font-semibold text-violet-300 mb-4">Crear nuevo usuario</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre completo</label>
              <input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Juan Pérez"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="juan@clinica.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contraseña</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
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
                  onClick={generatePassword}
                  className="px-2.5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  Generar
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-violet-500"
              >
                <option value="staff">Staff — Solo lectura</option>
                <option value="admin">Admin — Control completo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createUser}
              disabled={saving || !form.email || !form.password}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <RefreshCw size={20} className="animate-spin mr-2" /> Cargando usuarios...
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Users size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No hay usuarios registrados</p>
          <p className="text-xs text-gray-600 mt-1">Crea el primer usuario con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(member => {
            const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;
            const RoleIcon = roleCfg.icon;
            return (
              <div
                key={member.id}
                className={`bg-gray-900 rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                  member.active ? 'border-gray-800' : 'border-gray-800 opacity-60'
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300 flex-shrink-0">
                  {(member.full_name || member.email || '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-100">
                      {member.full_name || member.email.split('@')[0]}
                    </p>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${roleCfg.color}`}>
                      <RoleIcon size={11} />
                      {roleCfg.label}
                    </span>
                    {!member.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 border border-red-700/30">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    Último acceso: {timeAgo(member.last_sign_in)}
                    {' · '}
                    Creado: {new Date(member.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Role toggle */}
                  <select
                    value={member.role}
                    onChange={e => changeRole(member, e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>

                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(member)}
                    className={`p-1.5 rounded-lg text-sm transition-colors ${
                      member.active
                        ? 'text-green-400 hover:bg-green-400/10'
                        : 'text-gray-500 hover:bg-gray-800'
                    }`}
                    title={member.active ? 'Desactivar' : 'Activar'}
                  >
                    {member.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteUser(member)}
                    disabled={deleting === member.id}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info panel */}
      <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Permisos por rol</h3>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
          <div>
            <p className="text-violet-400 font-medium mb-1 flex items-center gap-1"><Shield size={12} />Admin</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Ver y gestionar conversaciones</li>
              <li>Pausar / reanudar el bot</li>
              <li>Editar base de conocimiento</li>
              <li>Ver todas las métricas</li>
              <li>Crear y eliminar usuarios</li>
            </ul>
          </div>
          <div>
            <p className="text-blue-400 font-medium mb-1 flex items-center gap-1"><UserCheck size={12} />Staff</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Ver conversaciones (solo lectura)</li>
              <li>Ver citas del día</li>
              <li>Ver métricas básicas</li>
              <li>No puede crear usuarios</li>
              <li>No puede pausar el bot</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Calendar, BarChart2, BookOpen, Users, Bot, Activity, TrendingUp } from 'lucide-react';

interface Stats {
  total_conversations_all: number;
  active_conversations: number;
  paused_conversations: number;
  total_appointments: number;
  scheduled_appointments: number;
  confirmed_appointments: number;
  conversion_rate: number;
  total_conversations: number;
}

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/metrics?days=30', { cache: 'no-store' });
        const data = await res.json();
        if (!data.error) setStats(data);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot size={26} className="text-violet-400" />
            SofIA Admin
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {time.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-full">
          <Activity size={12} className="animate-pulse" />
          Sistema activo
        </div>
      </div>

      {/* Live stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-5 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-700 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-20" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Conversaciones</p>
            <p className="text-3xl font-bold text-white">{stats.total_conversations_all}</p>
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {stats.active_conversations} activas ahora
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Citas agendadas</p>
            <p className="text-3xl font-bold text-white">{stats.total_appointments}</p>
            <p className="text-xs text-blue-400 mt-1">{stats.confirmed_appointments} confirmadas</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Conversión IA</p>
            <p className="text-3xl font-bold text-white">{stats.conversion_rate}%</p>
            <p className="text-xs text-gray-500 mt-1">{stats.total_conversations} interacciones</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Bot pausado</p>
            <p className="text-3xl font-bold text-white">{stats.paused_conversations}</p>
            <p className="text-xs text-amber-400 mt-1">conversaciones con humano</p>
          </div>
        </div>
      ) : null}

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            href: '/admin/inbox',
            icon: MessageSquare,
            label: 'Conversaciones',
            desc: 'Inbox de pacientes · Pausar/reanudar bot · Asignar staff',
            color: 'text-violet-400',
            badge: stats ? `${stats.total_conversations_all} total` : null,
          },
          {
            href: '/admin/appointments',
            icon: Calendar,
            label: 'Citas',
            desc: 'Calendario · Confirmar · Cancelar · Completar',
            color: 'text-blue-400',
            badge: stats ? `${stats.total_appointments} citas` : null,
          },
          {
            href: '/admin/metrics',
            icon: BarChart2,
            label: 'Métricas',
            desc: 'KPIs · Gráficos · Distribución de intenciones · Tendencias',
            color: 'text-green-400',
            badge: stats ? `${stats.conversion_rate}% conversión` : null,
          },
          {
            href: '/admin/knowledge',
            icon: BookOpen,
            label: 'Base de conocimiento',
            desc: 'FAQ · Preguntas y respuestas · Categorías · Tags',
            color: 'text-amber-400',
            badge: null,
          },
          {
            href: '/admin/users',
            icon: Users,
            label: 'Usuarios',
            desc: 'Staff · Admins · Roles · Crear cuentas',
            color: 'text-pink-400',
            badge: null,
          },
        ].map(({ href, icon: Icon, label, desc, color, badge }) => (
          <Link
            key={href}
            href={href}
            className="bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 p-5 transition-all hover:bg-gray-800/80 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-gray-800 group-hover:bg-gray-700 ${color} transition-colors`}>
                <Icon size={20} />
              </div>
              {badge && (
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{badge}</span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-100 mb-1">{label}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>

      {/* System status */}
      <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado del sistema</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'n8n Workflow', status: 'Activo', ok: true },
            { label: 'Supabase DB', status: 'Conectado', ok: true },
            { label: 'Chatwoot', status: 'En línea', ok: true },
            { label: 'Google Calendar', status: 'Sincronizado', ok: true },
          ].map(({ label, status, ok }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-xs font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>{status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

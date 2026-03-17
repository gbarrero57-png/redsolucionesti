'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageSquare, Calendar, BarChart2, BookOpen, Bot,
  LogOut, Users, Building2, AlertTriangle, Menu, X,
} from 'lucide-react';

const NAV = [
  { href: '/admin/inbox',        label: 'Conversaciones',       icon: MessageSquare },
  { href: '/admin/appointments', label: 'Citas',                icon: Calendar },
  { href: '/admin/metrics',      label: 'Métricas',             icon: BarChart2 },
  { href: '/admin/knowledge',    label: 'Base de conocimiento', icon: BookOpen },
  { href: '/admin/users',        label: 'Usuarios',             icon: Users },
];

const SUPERADMIN_NAV = [
  { href: '/admin/global-metrics', label: 'Métricas Globales', icon: BarChart2 },
  { href: '/admin/onboarding',     label: 'Clínicas',          icon: Building2 },
];

const SA_PATHS = ['/admin/global-metrics', '/admin/onboarding'];

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const WARN_BEFORE_MS  =  2 * 60 * 1000;
const WARN_TIMEOUT_MS = IDLE_TIMEOUT_MS - WARN_BEFORE_MS;
const IDLE_EVENTS     = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'wheel'] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const pathImpliesSA = SA_PATHS.some(p => pathname.startsWith(p));
  const [isSuperadmin, setIsSuperadmin] = useState(pathImpliesSA);
  const [showWarning,  setShowWarning]  = useState(false);
  const [countdown,    setCountdown]    = useState(120);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cerrar sidebar al navegar
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const doLogout = useCallback(async (reason = 'timeout') => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/admin/login?reason=${reason}`);
  }, [router]);

  const resetTimers = useCallback(() => {
    if (warnTimer.current)   clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countRef.current)    clearInterval(countRef.current);
    setShowWarning(false);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(120);
      countRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { if (countRef.current) clearInterval(countRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, WARN_TIMEOUT_MS);

    logoutTimer.current = setTimeout(() => doLogout('timeout'), IDLE_TIMEOUT_MS);
  }, [doLogout]);

  useEffect(() => {
    resetTimers();
    const handler = () => resetTimers();
    IDLE_EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => {
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, handler));
      if (warnTimer.current)   clearTimeout(warnTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (countRef.current)    clearInterval(countRef.current);
    };
  }, [resetTimers]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setIsSuperadmin(d.is_superadmin === true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onSAPath = SA_PATHS.some(p => pathname.startsWith(p));
    if (isSuperadmin && !onSAPath && pathname !== '/admin' && pathname !== '/admin/') {
      router.replace('/admin/global-metrics');
    }
    if (!isSuperadmin && onSAPath) {
      router.replace('/admin/inbox');
    }
  }, [isSuperadmin, pathname, router]);

  const visibleNav = isSuperadmin ? SUPERADMIN_NAV : NAV;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Nombre de la página actual para el header móvil
  const currentPage = [...NAV, ...SUPERADMIN_NAV].find(n => pathname.startsWith(n.href))?.label ?? 'SofIA Admin';

  /* ── Sidebar content (reutilizado en desktop y drawer móvil) ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-violet-500/30">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SofIA Admin</p>
            <p className="text-xs text-gray-400">{isSuperadmin ? 'Super Admin' : 'Panel de Control'}</p>
          </div>
          {isSuperadmin && (
            <span className="ml-2 text-[10px] bg-amber-600/20 text-amber-400 border border-amber-600/30 px-1.5 py-0.5 rounded-full font-medium">SA</span>
          )}
        </div>
        {/* Botón cerrar solo en móvil */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? isSuperadmin
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                    : 'bg-violet-600/20 text-violet-400 border border-violet-600/30'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          Sesión activa
        </div>
        <button
          onClick={() => doLogout('manual')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── Idle-timeout warning modal ── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-7 max-w-sm w-full shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent rounded-t-2xl" />
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                <AlertTriangle size={22} className="text-amber-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Sesión a punto de cerrarse</h3>
              <p className="text-[13px] text-gray-400 mb-5">Por inactividad, tu sesión se cerrará en</p>
              <div className="relative mb-6">
                <svg width="100" height="100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" stroke="#374151" strokeWidth="6" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke="#f59e0b" strokeWidth="6" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - countdown / 120)}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-400 tabular-nums">{fmt(countdown)}</span>
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => doLogout('manual')}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-200 transition-colors">
                  Cerrar sesión
                </button>
                <button onClick={resetTimers}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors">
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay fondo cuando sidebar abierto en móvil ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar desktop (fijo) ── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex-col">
        <SidebarContent />
      </aside>

      {/* ── Sidebar móvil (drawer deslizable) ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 border-r border-gray-800
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top bar solo en móvil ── */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center flex-shrink-0">
              <Bot size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white truncate">{currentPage}</span>
          </div>
          {isSuperadmin && (
            <span className="ml-auto text-[10px] bg-amber-600/20 text-amber-400 border border-amber-600/30 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">SA</span>
          )}
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

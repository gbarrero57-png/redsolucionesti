'use client';

import { useState, FormEvent, Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Shield, Clock, Activity, CheckCircle } from 'lucide-react';
import Link from 'next/link';

/* ── Styles ────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  input:-webkit-autofill,
  input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #080c14 inset !important;
    -webkit-text-fill-color: #fff !important;
    transition: background-color 5000s ease-in-out 0s;
  }
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}40%{transform:translateX(8px)}
    60%{transform:translateX(-5px)}80%{transform:translateX(5px)}
  }
  .card-shake { animation:shake .5s ease; }

  @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  .grad-btn {
    background: linear-gradient(135deg,#2563eb,#3b82f6);
    background-size:200% 200%;
    animation:gradShift 4s ease infinite;
  }
  .grad-btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
  .grad-btn:disabled { filter:none; transform:none; }

  /* ── Animated grid background ── */
  @keyframes gridMove { from{transform:translateY(0)} to{transform:translateY(60px)} }
  .bg-grid {
    background-image:
      linear-gradient(rgba(59,130,246,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59,130,246,.06) 1px, transparent 1px);
    background-size: 60px 60px;
    animation: gridMove 8s linear infinite;
  }

  /* ── Floating orbs ── */
  @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-60px) scale(1.05)} 66%{transform:translate(-30px,40px) scale(.97)} }
  @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-50px,30px) scale(1.08)} 70%{transform:translate(30px,-40px) scale(.95)} }
  @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,50px)} }
  .orb1 { animation: orbFloat1 18s ease-in-out infinite; }
  .orb2 { animation: orbFloat2 22s ease-in-out infinite; }
  .orb3 { animation: orbFloat3 14s ease-in-out infinite; }

  /* ── Scanline on card ── */
  @keyframes scanline { 0%{top:-100%} 100%{top:200%} }
  .card-scan::after {
    content:'';
    position:absolute;
    inset-x:0;
    height:2px;
    background:linear-gradient(90deg,transparent,rgba(59,130,246,.4),transparent);
    animation:scanline 4s ease-in-out infinite;
    pointer-events:none;
  }

  /* ── Dot pulse ── */
  @keyframes dotPulse { 0%,100%{opacity:.15;transform:scale(1)} 50%{opacity:.45;transform:scale(1.3)} }
`;

/* ── Floating label input ──────────────────────────────────────── */
function FloatInput({
  id, label, type, value, onChange, autoComplete, required, disabled, rightSlot,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; autoComplete?: string;
  required?: boolean; disabled?: boolean; rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <input
        id={id} type={type} autoComplete={autoComplete} required={required}
        disabled={disabled} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={label}
        className={`peer w-full rounded-xl px-4 pt-6 pb-2.5 text-sm text-white placeholder-transparent
          focus:outline-none transition-all duration-200 disabled:opacity-40
          ${rightSlot ? 'pr-11' : ''}
          ${focused ? 'ring-2 ring-blue-500/25' : ''}`}
        style={{
          background: 'rgba(255,255,255,.06)',
          border: `1px solid ${focused ? 'rgba(59,130,246,.6)' : 'rgba(255,255,255,.08)'}`,
        }}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 pointer-events-none select-none transition-all duration-200
          ${lifted ? 'top-2 text-[10px] font-medium text-blue-400' : 'top-1/2 -translate-y-1/2 text-sm text-gray-500'}`}
      >
        {label}
      </label>
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </div>
  );
}

/* ── Login form (needs Suspense for useSearchParams) ───────────── */
function LoginForm() {
  const searchParams = useSearchParams();
  const next   = searchParams.get('next') || '/admin';
  const reason = searchParams.get('reason');

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [shake,    setShake]    = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<string | null>(null);

  useEffect(() => {
    const SITE_KEY   = '0x4AAAAAACutwtZn3-QfR34k';
    const containerId = 'cf-turnstile-container';

    function renderWidget() {
      const container = document.getElementById(containerId);
      if (!container || !window.turnstile) return;
      if (turnstileRef.current) { try { window.turnstile.remove(turnstileRef.current); } catch {} }
      turnstileRef.current = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        theme: 'dark',
        appearance: 'always',
        callback:           (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null),
        'error-callback':   () => setCaptchaToken(null),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (turnstileRef.current) { try { window.turnstile?.remove(turnstileRef.current); } catch {} }
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!captchaToken) { setError('Completa la verificación de seguridad.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas');
        setShake(true); setTimeout(() => setShake(false), 600);
        if (turnstileRef.current) { try { window.turnstile?.reset(turnstileRef.current); } catch {} }
        setCaptchaToken(null);
        return;
      }
      setSuccess(true);
      setTimeout(() => { window.location.href = data.redirect || next || '/admin'; }, 600);
    } catch {
      setError('Error de conexión.');
      setShake(true); setTimeout(() => setShake(false), 600);
      if (turnstileRef.current) { try { window.turnstile?.reset(turnstileRef.current); } catch {} }
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`card-scan relative w-full max-w-sm overflow-hidden rounded-2xl p-8 ${shake ? 'card-shake' : ''}`}
      style={{
        background: 'rgba(8,12,20,.75)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(59,130,246,.15)',
        boxShadow: '0 0 0 1px rgba(255,255,255,.04) inset, 0 40px 80px -20px rgba(0,0,0,.8), 0 0 40px -10px rgba(37,99,235,.15)',
      }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
            SofIA
          </span>
          <span className="text-sm text-slate-500">by Red Soluciones TI</span>
        </Link>
        <h1 className="text-xl font-bold text-white">Accede a tu panel</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa tus credenciales para continuar</p>
      </div>

      {reason === 'timeout' && !error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-amber-300"
          style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)' }}>
          <Clock size={13} className="flex-shrink-0 text-amber-400" />
          Sesión cerrada por inactividad. Ingresa de nuevo.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatInput
          id="email" label="Correo electrónico" type="email"
          value={email} onChange={setEmail} autoComplete="email"
          required disabled={loading || success}
        />
        <FloatInput
          id="password" label="Contraseña"
          type={showPw ? 'text' : 'password'}
          value={password} onChange={setPassword}
          autoComplete="current-password" required disabled={loading || success}
          rightSlot={
            <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
              className="p-1 text-gray-500 transition-colors hover:text-gray-300">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        <div className="w-full">
          <div id="cf-turnstile-container" className="w-full overflow-hidden rounded-xl" />
          {captchaToken && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle size={11} /> Verificación completada
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-red-400"
            style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)' }}>
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px]">!</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success || !email || !password || !captchaToken}
          className="grad-btn w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all
            disabled:cursor-not-allowed disabled:opacity-40
            focus:outline-none focus:ring-2 focus:ring-blue-500/40
            flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {success && <CheckCircle size={15} />}
          {loading ? 'Verificando...' : success ? 'Accediendo...' : 'Ingresar al panel'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-4 border-t border-white/5 pt-5 text-[10px] text-gray-700">
        <span className="flex items-center gap-1"><Shield size={9} /> SSL 256-bit</span>
        <span className="flex items-center gap-1"><Clock size={9} /> Sesión 8h</span>
        <span className="flex items-center gap-1"><Activity size={9} /> 99.9% uptime</span>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* ── Full-screen background ── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
        style={{ background: 'radial-gradient(ellipse 120% 80% at 50% -10%, #0d1f3c 0%, #080c14 55%, #050507 100%)' }}>

        {/* Animated grid */}
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-100" />

        {/* Vignette edges */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #050507 100%)' }} />

        {/* Floating orbs */}
        <div className="orb1 pointer-events-none absolute left-[10%] top-[20%] h-[420px] w-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 70%)' }} />
        <div className="orb2 pointer-events-none absolute right-[8%] top-[35%] h-[320px] w-[320px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,.12) 0%, transparent 70%)' }} />
        <div className="orb3 pointer-events-none absolute bottom-[10%] left-[30%] h-[280px] w-[280px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,.10) 0%, transparent 70%)' }} />

        {/* Corner accent lines */}
        <div className="pointer-events-none absolute left-0 top-0 h-px w-1/3"
          style={{ background: 'linear-gradient(to right, rgba(59,130,246,.5), transparent)' }} />
        <div className="pointer-events-none absolute left-0 top-0 h-1/4 w-px"
          style={{ background: 'linear-gradient(to bottom, rgba(59,130,246,.5), transparent)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 h-px w-1/3"
          style={{ background: 'linear-gradient(to left, rgba(59,130,246,.3), transparent)' }} />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1/4 w-px"
          style={{ background: 'linear-gradient(to top, rgba(59,130,246,.3), transparent)' }} />

        {/* Scatter dots */}
        {[
          { top: '15%', left: '20%', delay: '0s' }, { top: '72%', left: '75%', delay: '.8s' },
          { top: '40%', left: '88%', delay: '1.4s' }, { top: '60%', left: '12%', delay: '2s' },
          { top: '25%', left: '60%', delay: '.4s' }, { top: '82%', left: '42%', delay: '1.8s' },
        ].map((d, i) => (
          <div key={i} className="pointer-events-none absolute h-1 w-1 rounded-full bg-blue-400"
            style={{ top: d.top, left: d.left, animation: `dotPulse ${2 + i * 0.4}s ease-in-out ${d.delay} infinite` }} />
        ))}

        {/* ── Login card ── */}
        <Suspense fallback={
          <div className="flex h-10 items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Cargando...
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="relative mt-6 text-xs text-slate-600">
          ¿Necesitas ayuda?{' '}
          <a href="mailto:info@redsolucionesti.com" className="text-slate-400 hover:text-slate-200 transition-colors">
            info@redsolucionesti.com
          </a>
        </p>
      </div>
    </>
  );
}

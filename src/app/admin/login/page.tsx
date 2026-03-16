'use client';

import { useState, FormEvent, Suspense, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye, EyeOff, Loader2, Zap, Shield, Activity, Bot, Calendar,
  MessageSquare, BookOpen, Users, TrendingUp, CheckCircle, Star,
  ArrowRight, Clock, Globe, BarChart2, Wifi, ChevronDown, X, Send,
  Bell, CreditCard, ChevronRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  * { font-family: 'Inter', system-ui, sans-serif; }

  @keyframes float    { 0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-18px) rotate(2deg)} }
  @keyframes floatB   { 0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(-1deg)} }
  @keyframes pulse-r  { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,.5)}70%{box-shadow:0 0 0 14px rgba(124,58,237,0)} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0}to{opacity:1} }
  @keyframes slideR   { from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)} }
  @keyframes slideL   { from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)} }
  @keyframes marquee  { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
  @keyframes spin-slow{ from{transform:rotate(0)}to{transform:rotate(360deg)} }
  @keyframes blink    { 0%,100%{opacity:1}50%{opacity:0} }
  @keyframes chatIn   { from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes gradShift{ 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }
  @keyframes shake    { 0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)} }
  @keyframes scanline { 0%{top:-100%}100%{top:100%} }
  @keyframes glow     { 0%,100%{opacity:.4}50%{opacity:.8} }
  @keyframes counter  { from{transform:translateY(100%)}to{transform:translateY(0)} }

  .animate-fadeUp  { animation:fadeUp .7s cubic-bezier(.16,1,.3,1) both }
  .animate-fadeIn  { animation:fadeIn .5s ease both }
  .animate-slideR  { animation:slideR .6s cubic-bezier(.16,1,.3,1) both }
  .animate-slideL  { animation:slideL .6s cubic-bezier(.16,1,.3,1) both }
  .card-shake      { animation:shake .5s ease }

  .grad-text {
    background: linear-gradient(135deg,#a78bfa 0%,#818cf8 40%,#38bdf8 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  }
  .grad-text-em {
    background: linear-gradient(135deg,#f472b6 0%,#a78bfa 50%,#818cf8 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  }
  .grad-btn {
    background: linear-gradient(135deg,#7c3aed,#4f46e5);
    background-size:200% 200%;
    animation:gradShift 4s ease infinite;
  }
  .grad-btn:hover { filter:brightness(1.15); transform:translateY(-1px); }
  .glass { background:rgba(255,255,255,.04);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08); }
  .glass-dark { background:rgba(0,0,0,.3);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06); }

  .float-a { animation:float 6s ease-in-out infinite }
  .float-b { animation:floatB 8s ease-in-out infinite }
  .float-c { animation:float 10s ease-in-out 2s infinite }
  .pulse-ring { animation:pulse-r 2s cubic-bezier(.4,0,.6,1) infinite }

  .marquee-inner { animation:marquee 28s linear infinite }

  .chat-msg { animation:chatIn .45s cubic-bezier(.16,1,.3,1) both }

  .feature-card:hover { transform:translateY(-4px); border-color:rgba(124,58,237,.4); box-shadow:0 20px 40px -10px rgba(124,58,237,.2); }
  .feature-card { transition:all .3s cubic-bezier(.16,1,.3,1); }

  input:-webkit-autofill,
  input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px #0d1117 inset !important;
    -webkit-text-fill-color: #fff !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

/* ─────────────────────────────────────────────────────────────────
   BACKGROUND
───────────────────────────────────────────────────────────────── */
function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{ background: '#030712' }} />
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#6d28d9 1px,transparent 1px),linear-gradient(to right,#6d28d9 1px,transparent 1px)',
        backgroundSize: '72px 72px',
      }} />
      {/* Glow orbs */}
      <div className="absolute rounded-full" style={{ width:900,height:600,top:'5%',left:'50%',transform:'translateX(-50%)',background:'radial-gradient(ellipse,rgba(79,70,229,.18) 0%,transparent 70%)' }} />
      <div className="absolute rounded-full" style={{ width:500,height:500,bottom:'-10%',right:'-5%',background:'radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 65%)' }} />
      <div className="absolute rounded-full" style={{ width:400,height:400,top:'30%',left:'-8%',background:'radial-gradient(circle,rgba(56,189,248,.08) 0%,transparent 65%)' }} />
      {/* Scanline */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,.05) 2px,rgba(255,255,255,.05) 4px)',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ANIMATED CHAT MOCKUP
───────────────────────────────────────────────────────────────── */
const CHAT_MSGS = [
  { from:'patient', text:'Hola! Necesito una cita para limpieza dental 🦷', delay:.2 },
  { from:'sofia',   text:'¡Hola! Soy SofIA 🤖 Con gusto te ayudo. ¿Cuándo prefieres?', delay:1.0 },
  { from:'patient', text:'Este sábado por la mañana si es posible', delay:2.0 },
  { from:'sofia',   text:'✅ Tengo disponible sábado 22 mar a las 9:00 am. ¿Te confirmo?', delay:3.0 },
  { from:'patient', text:'Perfecto! Confírmame por favor', delay:4.0 },
  { from:'sofia',   text:'🗓️ ¡Listo! Cita confirmada. Recibirás recordatorio 24h antes.', delay:5.0, isLast:true },
];

function ChatMockup() {
  const [visible, setVisible] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    CHAT_MSGS.forEach((m, i) => {
      const base = m.delay * 1000;
      if (m.from === 'sofia' && i > 0) {
        setTimeout(() => setTyping(true), base - 600);
        setTimeout(() => setTyping(false), base - 50);
      }
      setTimeout(() => setVisible(v => [...v, i]), base * 1000 / 1000);
    });
    const restart = setTimeout(() => {
      setVisible([]);
      setTyping(false);
      // restart cycle
    }, 9000);
    return () => clearTimeout(restart);
  }, []);

  return (
    <div className="float-a relative" style={{ width: 320 }}>
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] overflow-hidden" style={{
        background: 'linear-gradient(145deg,#1a1a2e,#0d0d1a)',
        border: '2px solid rgba(255,255,255,.1)',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.05) inset, inset 0 1px 0 rgba(255,255,255,.1)',
        padding: '12px 10px 24px',
      }}>
        {/* Notch */}
        <div className="w-24 h-6 mx-auto rounded-full mb-3 flex items-center justify-center gap-2" style={{ background: '#0a0a15' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
          <div className="w-8 h-1.5 rounded-full bg-gray-700" />
        </div>

        {/* WhatsApp-style chat header */}
        <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-xl" style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.2)' }}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <Bot size={14} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-900 pulse-ring" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">SofIA IA</p>
            <p className="text-[9px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" style={{ animation: 'glow 1.5s ease infinite' }} />
              en línea · 24/7
            </p>
          </div>
          <div className="ml-auto flex gap-1.5">
            {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-gray-600" />)}
          </div>
        </div>

        {/* Messages */}
        <div className="px-2 py-1 space-y-2 min-h-[260px]" style={{ background: 'rgba(0,0,0,.3)', borderRadius: 12 }}>
          {CHAT_MSGS.map((m, i) => visible.includes(i) && (
            <div key={i} className={`chat-msg flex ${m.from === 'patient' ? 'justify-end' : 'justify-start'}`}
              style={{ animationDelay: '0s' }}>
              {m.from === 'sofia' && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center mr-1.5 flex-shrink-0 mt-auto mb-0.5"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', flexShrink: 0 }}>
                  <Bot size={9} className="text-white" />
                </div>
              )}
              <div className="max-w-[200px] px-2.5 py-1.5 rounded-2xl text-[10px] leading-relaxed"
                style={{
                  background: m.from === 'patient' ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'rgba(255,255,255,.07)',
                  borderRadius: m.from === 'patient' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  color: '#e5e7eb',
                  border: m.from === 'sofia' ? '1px solid rgba(255,255,255,.06)' : 'none',
                }}>
                {m.text}
                {m.isLast && <span className="block text-emerald-400 text-[9px] mt-0.5">✓✓ Entregado</span>}
              </div>
            </div>
          ))}

          {typing && (
            <div className="chat-msg flex justify-start">
              <div className="w-5 h-5 rounded-full flex items-center justify-center mr-1.5 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                <Bot size={9} className="text-white" />
              </div>
              <div className="px-3 py-2 rounded-2xl flex items-center gap-1" style={{ background: 'rgba(255,255,255,.07)', borderRadius: '16px 16px 16px 4px', border: '1px solid rgba(255,255,255,.06)' }}>
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animation: `blink 1s ease ${i * .2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 mt-2 px-2">
          <div className="flex-1 h-8 rounded-full flex items-center px-3 text-[9px] text-gray-600" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)' }}>
            Escribe un mensaje...
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <ArrowRight size={12} className="text-white" />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-10 top-12 glass rounded-2xl px-3 py-2 flex items-center gap-2 float-b" style={{ animationDelay: '1s' }}>
        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={13} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-white">Cita agendada</p>
          <p className="text-[9px] text-gray-500">en 47 segundos</p>
        </div>
      </div>

      <div className="absolute -left-12 bottom-20 glass rounded-2xl px-3 py-2 flex items-center gap-2 float-c" style={{ animationDelay: '2s' }}>
        <div className="w-7 h-7 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Zap size={13} className="text-violet-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-white">IA Respondió</p>
          <p className="text-[9px] text-gray-500">{'<'} 2 segundos</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: HERO
───────────────────────────────────────────────────────────────── */
function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            {/* Badge */}
            <div className="animate-fadeUp inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6" style={{ animationDelay: '.1s' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-ring" />
              <span className="text-xs text-emerald-400 font-medium">IA activa 24/7 · Multi-clínica dental</span>
            </div>

            <h1 className="animate-fadeUp text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-6" style={{ animationDelay: '.2s', letterSpacing: '-0.02em' }}>
              Tu clínica dental,{' '}
              <br />
              <span className="grad-text">siempre disponible</span>
              <br />
              con IA
            </h1>

            <p className="animate-fadeUp text-lg text-gray-400 leading-relaxed mb-8 max-w-lg" style={{ animationDelay: '.3s' }}>
              SofIA gestiona cada conversación de WhatsApp, agenda citas automáticamente y escala a humano cuando lo necesita — todo sin que levantes un dedo.
            </p>

            {/* Value props */}
            <div className="animate-fadeUp space-y-2.5 mb-10" style={{ animationDelay: '.4s' }}>
              {[
                { icon: Zap,      text: 'Responde en menos de 2 segundos, las 24 horas' },
                { icon: Calendar, text: 'Agenda citas en Google Calendar automáticamente' },
                { icon: Shield,   text: 'Control total: pausa el bot en 1 clic' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={10} className="text-violet-400" />
                  </div>
                  {text}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="animate-fadeUp flex flex-wrap gap-3" style={{ animationDelay: '.5s' }}>
              <button onClick={onLogin}
                className="grad-btn flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-semibold text-sm shadow-lg shadow-violet-500/30 transition-all">
                Acceder al panel <ArrowRight size={16} />
              </button>
              <a href="#features" className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-gray-300 text-sm font-medium transition-colors hover:text-white glass">
                Ver características <ChevronDown size={16} />
              </a>
            </div>
          </div>

          {/* Right — Chat mockup */}
          <div className="animate-fadeUp flex justify-center lg:justify-end" style={{ animationDelay: '.3s' }}>
            <ChatMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: STATS MARQUEE
───────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '24/7', label: 'Disponibilidad' },
  { value: '<2s',  label: 'Tiempo de respuesta' },
  { value: '65+',  label: 'Conversaciones activas' },
  { value: '95%',  label: 'Satisfacción' },
  { value: '0',    label: 'Tiempo sin respuesta' },
  { value: '∞',    label: 'Conversaciones simultáneas' },
  { value: '24/7', label: 'Disponibilidad' },
  { value: '<2s',  label: 'Tiempo de respuesta' },
  { value: '65+',  label: 'Conversaciones activas' },
  { value: '95%',  label: 'Satisfacción' },
  { value: '0',    label: 'Tiempo sin respuesta' },
  { value: '∞',    label: 'Conversaciones simultáneas' },
];

function StatsMarquee() {
  return (
    <div className="relative overflow-hidden py-4 border-y border-white/5" style={{ background: 'rgba(124,58,237,.05)' }}>
      <div className="marquee-inner flex gap-12 w-max">
        {STATS.map((s, i) => (
          <div key={i} className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <p className="text-2xl font-black grad-text">{s.value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: FEATURES
───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Bot,
    color: '#7c3aed',
    bg: 'rgba(124,58,237,.12)',
    title: 'IA Conversacional Avanzada',
    desc: 'Entiende contexto, urgencias, miedos y emociones del paciente. Responde como un asistente humano entrenado en odontología.',
    tag: 'GPT-4 powered',
  },
  {
    icon: Calendar,
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,.12)',
    title: 'Agendamiento Automático',
    desc: 'Se integra con Google Calendar. Ofrece slots disponibles, confirma citas y envía recordatorios 24h antes sin intervención.',
    tag: 'Google Calendar',
  },
  {
    icon: Shield,
    color: '#10b981',
    bg: 'rgba(16,185,129,.12)',
    title: 'Gobernanza Híbrida',
    desc: 'Pausa el bot en 1 clic para tomar control manual. Asigna staff, escala conversaciones y cierra con registro completo.',
    tag: 'Control total',
  },
  {
    icon: BarChart2,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,.12)',
    title: 'Métricas en Tiempo Real',
    desc: 'Dashboard con tasa de conversión, escalación, citas por período y estado de cada conversación. Todo visible de un vistazo.',
    tag: 'Analytics',
  },
  {
    icon: BookOpen,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,.12)',
    title: 'Base de Conocimiento',
    desc: 'Entrena a SofIA con precios, servicios, horarios y políticas de tu clínica. Respuestas precisas y consistentes siempre.',
    tag: '30+ plantillas',
  },
  {
    icon: Globe,
    color: '#ec4899',
    bg: 'rgba(236,72,153,.12)',
    title: 'Multi-clínica & Multi-sede',
    desc: 'Una sola plataforma para todas tus sucursales. Datos aislados por clínica, usuarios independientes, métricas globales.',
    tag: 'SaaS escalable',
  },
];

function Features() {
  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
          <Zap size={12} className="text-violet-400" />
          <span className="text-xs text-violet-300 font-medium">Capacidades de SofIA</span>
        </div>
        <h2 className="text-4xl font-black text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
          Todo lo que tu clínica necesita,{' '}
          <span className="grad-text">automatizado</span>
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          Desde el primer mensaje hasta la cita confirmada, SofIA maneja cada paso con precisión quirúrgica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ icon: Icon, color, bg, title, desc, tag }) => (
          <div key={title} className="feature-card glass rounded-2xl p-6 cursor-default">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg, border: `1px solid ${color}22` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ background: `${bg}`, color, border: `1px solid ${color}22` }}>
                {tag}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: HOW IT WORKS
───────────────────────────────────────────────────────────────── */
const STEPS = [
  {
    n: '01',
    icon: MessageSquare,
    color: '#7c3aed',
    title: 'Paciente escribe por WhatsApp',
    desc: 'El paciente envía un mensaje a tu número de WhatsApp. SofIA lo recibe al instante y responde en segundos.',
  },
  {
    n: '02',
    icon: Bot,
    color: '#0ea5e9',
    title: 'IA procesa y responde',
    desc: 'SofIA entiende la intención, consulta tu base de conocimiento y ofrece la mejor respuesta personalizada.',
  },
  {
    n: '03',
    icon: Calendar,
    color: '#10b981',
    title: 'Cita agendada automáticamente',
    desc: 'Consulta disponibilidad real en Google Calendar y confirma la cita al instante con recordatorio automático.',
  },
  {
    n: '04',
    icon: Activity,
    color: '#f59e0b',
    title: 'Tú monitoras y controlas',
    desc: 'Desde el dashboard ves todo en tiempo real. Interviene cuando quieras con un solo clic.',
  },
];

function HowItWorks() {
  return (
    <section className="py-24" style={{ background: 'rgba(255,255,255,.01)', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
            <Activity size={12} className="text-sky-400" />
            <span className="text-xs text-sky-300 font-medium">Flujo de trabajo</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
            Así funciona <span className="grad-text">SofIA</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">De mensaje recibido a cita confirmada en menos de 60 segundos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px" style={{ background: 'linear-gradient(to right,transparent,rgba(124,58,237,.3),rgba(14,165,233,.3),rgba(16,185,129,.3),transparent)' }} />

          {STEPS.map(({ n, icon: Icon, color, title, desc }) => (
            <div key={n} className="relative text-center">
              {/* Step number */}
              <div className="relative inline-flex mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon size={24} style={{ color }} />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: color }}>
                  {n.slice(1)}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: SOCIAL PROOF
───────────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: 'Dr. Carlos Mendoza',
    role: 'Director — Clínica Dental Premium, Lima',
    text: 'Antes perdíamos pacientes porque no podíamos responder a las 11pm. Ahora SofIA responde, agenda y confirma. En el primer mes agendamos 47 citas que antes se perdían.',
    stars: 5,
    avatar: 'CM',
    color: '#7c3aed',
  },
  {
    name: 'Dra. Sofía Ríos',
    role: 'Directora — OdontoVida, Bogotá',
    text: 'Lo que más me sorprendió es que los pacientes no notan que es IA. La tasa de escalación bajó al 8% y mis recepcionistas ahora se enfocan en lo que importa.',
    stars: 5,
    avatar: 'SR',
    color: '#0ea5e9',
  },
  {
    name: 'Ing. Roberto Salinas',
    role: 'CEO — Red Dental Corporativa (4 sedes)',
    text: 'Implementamos SofIA en 4 clínicas en una tarde. El panel de superadmin nos da visibilidad total de todo el grupo. Es exactamente lo que necesitábamos para escalar.',
    stars: 5,
    avatar: 'RS',
    color: '#10b981',
  },
];

function Testimonials() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
          <Star size={12} className="text-amber-400" />
          <span className="text-xs text-amber-300 font-medium">Resultados reales</span>
        </div>
        <h2 className="text-4xl font-black text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
          Clínicas que ya <span className="grad-text-em">transformaron</span> su atención
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map(({ name, role, text, stars, avatar, color }) => (
          <div key={name} className="glass rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex gap-0.5">
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed flex-1">&ldquo;{text}&rdquo;</p>
            <div className="flex items-center gap-3 pt-2 border-t border-white/5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg,${color},${color}88)` }}>
                {avatar}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{name}</p>
                <p className="text-[10px] text-gray-600">{role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: DASHBOARD PREVIEW
───────────────────────────────────────────────────────────────── */
function DashboardPreview() {
  const convs = [
    { name:'Ana García',   status:'bot',   msg:'Quiero una cita para mañana' },
    { name:'Pedro López',  status:'human', msg:'Tengo una pregunta sobre precios' },
    { name:'María Torres', status:'bot',   msg:'¿Tienen disponibilidad el sábado?' },
    { name:'Luis Ruiz',    status:'closed',msg:'Perfecto, nos vemos el jueves' },
  ];
  return (
    <section className="py-24" style={{ background: 'rgba(255,255,255,.01)', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
              <BarChart2 size={12} className="text-violet-400" />
              <span className="text-xs text-violet-300 font-medium">Panel de control</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
              Visibilidad total de{' '}
              <span className="grad-text">cada conversación</span>
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Monitorea en tiempo real qué está respondiendo el bot, quién necesita atención humana y cuántas citas se han agendado hoy.
            </p>
            <div className="space-y-3">
              {[
                { icon: Activity, color:'#10b981', text: 'Estado en vivo de todas las conversaciones' },
                { icon: TrendingUp, color:'#6366f1', text: 'Métricas de conversión y escalación' },
                { icon: Users, color:'#f59e0b', text: 'Gestión de staff con roles y permisos' },
                { icon: Wifi, color:'#0ea5e9', text: 'Bot activo/pausado con un clic' },
              ].map(({ icon: Icon, color, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <span className="text-sm text-gray-300">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mock dashboard */}
          <div className="float-b">
            <div className="glass-dark rounded-2xl overflow-hidden" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,.6)' }}>
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
                <div className="flex gap-1.5">
                  {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="flex-1 mx-2 h-5 rounded-md flex items-center px-2 text-[9px] text-gray-600" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                  sofia-admin.vercel.app/admin/inbox
                </div>
              </div>

              {/* Sidebar + content */}
              <div className="flex h-72">
                {/* Mini sidebar */}
                <div className="w-28 border-r border-white/5 p-2 space-y-1 flex-shrink-0">
                  {[
                    { icon: MessageSquare, label:'Inbox', active:true },
                    { icon: Calendar,      label:'Citas',  active:false },
                    { icon: BarChart2,     label:'Métricas',active:false },
                  ].map(({ icon: Icon, label, active }) => (
                    <div key={label} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] ${active ? 'bg-violet-500/20 text-violet-400' : 'text-gray-600'}`}>
                      <Icon size={10} />
                      {label}
                    </div>
                  ))}
                </div>

                {/* Conversations list */}
                <div className="flex-1 p-2 space-y-1.5 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-gray-400 font-semibold">Conversaciones activas</span>
                    <span className="text-[8px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">{convs.length} total</span>
                  </div>
                  {convs.map(({ name, status, msg }) => (
                    <div key={name} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                        style={{ background: status === 'bot' ? '#6d28d9' : status === 'human' ? '#f59e0b' : '#374151' }}>
                        {name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium text-gray-200">{name}</p>
                        <p className="text-[8px] text-gray-600 truncate">{msg}</p>
                      </div>
                      <span className={`text-[7px] px-1 py-0.5 rounded-full flex-shrink-0 ${
                        status === 'bot' ? 'bg-green-500/20 text-green-400' :
                        status === 'human' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-700 text-gray-500'
                      }`}>
                        {status === 'bot' ? 'Bot' : status === 'human' ? 'Humano' : 'Cerrada'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: LOGIN FORM
───────────────────────────────────────────────────────────────── */
function FloatInput({ id, label, type, value, onChange, autoComplete, required, rightSlot, disabled }: {
  id:string; label:string; type:string; value:string; onChange:(v:string)=>void;
  autoComplete?:string; required?:boolean; rightSlot?:React.ReactNode; disabled?:boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <input id={id} type={type} autoComplete={autoComplete} required={required} disabled={disabled}
        value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={label}
        className={`peer w-full rounded-xl px-4 pt-6 pb-2.5 text-sm text-white placeholder-transparent focus:outline-none transition-all duration-200 disabled:opacity-40 ${rightSlot ? 'pr-11' : ''} ${focused ? 'ring-2 ring-violet-500/25' : ''}`}
        style={{ background: 'rgba(255,255,255,.06)', border: `1px solid ${focused ? 'rgba(124,58,237,.6)' : 'rgba(255,255,255,.08)'}` }}
      />
      <label htmlFor={id} className={`absolute left-4 pointer-events-none select-none transition-all duration-200 ${lifted ? 'top-2 text-[10px] font-medium text-violet-400' : 'top-1/2 -translate-y-1/2 text-sm text-gray-500'}`}>
        {label}
      </label>
      {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
    </div>
  );
}

function LoginSection({ loginRef }: { loginRef: React.RefObject<HTMLDivElement | null> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next   = searchParams.get('next') || '/admin';
  const reason = searchParams.get('reason');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [shake, setShake]       = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Credenciales inválidas'); setShake(true); setTimeout(()=>setShake(false),600); return; }
      setSuccess(true);
      setTimeout(() => { router.push(data.redirect || next || '/admin'); router.refresh(); }, 600);
    } catch { setError('Error de conexión.'); setShake(true); setTimeout(()=>setShake(false),600);
    } finally { setLoading(false); }
  }

  return (
    <section ref={loginRef} className="py-24" id="login">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
              <Shield size={12} className="text-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">Acceso seguro · SSL cifrado</span>
            </div>
            <h2 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>Accede a tu panel</h2>
            <p className="text-gray-500 text-sm mt-2">Ingresa tus credenciales para continuar</p>
          </div>

          <div className={`relative glass rounded-3xl p-8 ${shake ? 'card-shake' : ''}`}
            style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.05) inset' }}>
            <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(to right,transparent,rgba(255,255,255,.15),transparent)' }} />

            {reason === 'timeout' && !error && (
              <div className="mb-5 flex items-center gap-2.5 text-xs text-amber-300 rounded-xl px-3 py-2.5" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)' }}>
                <Clock size={13} className="text-amber-400 flex-shrink-0" />
                Sesión cerrada por inactividad. Ingresa de nuevo.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FloatInput id="email" label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" required disabled={loading||success} />
              <FloatInput id="password" label="Contraseña" type={showPw?'text':'password'} value={password} onChange={setPassword} autoComplete="current-password" required disabled={loading||success}
                rightSlot={
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v=>!v)} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                } />

              {error && (
                <div className="animate-fadeIn flex items-center gap-2 text-xs text-red-400 rounded-xl px-3 py-2.5" style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.15)' }}>
                  <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] flex-shrink-0">!</span>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading||success||!email||!password}
                className="grad-btn w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500/40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                {loading && <Loader2 size={15} className="animate-spin"/>}
                {success && <CheckCircle size={15}/>}
                {loading ? 'Verificando...' : success ? 'Accediendo...' : 'Ingresar al panel'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-4 text-[10px] text-gray-700">
              <span className="flex items-center gap-1"><Shield size={9}/>SSL 256-bit</span>
              <span className="flex items-center gap-1"><Clock size={9}/>Sesión 8h</span>
              <span className="flex items-center gap-1"><Activity size={9}/>99.9% uptime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: REMINDERS (inline feature highlight)
───────────────────────────────────────────────────────────────── */
function RemindersSection() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: reminder cards mockup */}
        <div className="relative float-a">
          <div className="space-y-3">
            {/* Cita reminder */}
            <div className="glass rounded-2xl p-4 flex items-start gap-4" style={{ border: '1px solid rgba(16,185,129,.2)' }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(16,185,129,.15)' }}>
                <Bell size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Recordatorio de Cita</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Enviado ✓</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Hola María 👋 Te recordamos que mañana tienes cita en nuestra clínica a las <strong className="text-white">9:00 AM</strong>. ¿Confirmas tu asistencia?
                </p>
                <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Enviado vía WhatsApp · 24h antes automático
                </p>
              </div>
            </div>
            {/* Pago reminder */}
            <div className="glass rounded-2xl p-4 flex items-start gap-4" style={{ border: '1px solid rgba(245,158,11,.2)' }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(245,158,11,.15)' }}>
                <CreditCard size={18} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Recordatorio de Pago</span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">3 días antes</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tu suscripción SofIA Pro vence en <strong className="text-white">3 días</strong>. Renueva ahora para mantener tu bot activo sin interrupciones.
                </p>
                <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>Aviso automático · Sin configuración
                </p>
              </div>
            </div>
            {/* Stats mini */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { v:'100%', l:'Tasa entrega', c:'#7c3aed' },
                { v:'24h',  l:'Antes de cita', c:'#10b981' },
                { v:'0',    l:'Citas olvidadas', c:'#0ea5e9' },
              ].map(({ v, l, c }) => (
                <div key={l} className="glass rounded-xl p-3 text-center">
                  <p className="text-xl font-black" style={{ color: c }}>{v}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: copy */}
        <div>
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4">
            <Bell size={12} className="text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Recordatorios automáticos</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            Cero citas{' '}
            <span className="grad-text">olvidadas.</span>
            <br />Cero pagos{' '}
            <span className="grad-text-em">tardíos.</span>
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            SofIA envía recordatorios automáticos por WhatsApp sin que tengas que hacer nada. Tus pacientes llegan puntuales y tu suscripción siempre activa.
          </p>
          <div className="space-y-4">
            {[
              { icon: Bell, color: '#10b981', title: 'Recordatorios de citas', desc: 'WhatsApp automático 24h antes de cada cita agendada. Confirmación con un tap.' },
              { icon: CreditCard, color: '#f59e0b', title: 'Recordatorios de pagos', desc: 'Aviso 3 días antes del vencimiento de tu suscripción mensual. Sin sorpresas.' },
              { icon: CheckCircle, color: '#6366f1', title: 'Confirmación en tiempo real', desc: 'El paciente confirma por WhatsApp. SofIA actualiza el calendario automáticamente.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: DEMO GRATUITA 7 DÍAS
───────────────────────────────────────────────────────────────── */
function DemoSection({ onChat }: { onChat: (msg: string) => void }) {
  return (
    <section id="demo" className="py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Gradient border card */}
        <div className="relative rounded-3xl p-[1px]" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5 40%,#0ea5e9)' }}>
          <div className="rounded-3xl px-8 py-12 lg:px-16" style={{ background: 'linear-gradient(135deg,#080818,#080d1a)' }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left */}
              <div>
                <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-300" style={{ background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.25)' }}>
                  <Zap size={11} className="text-amber-400 fill-amber-400" /> Oferta de lanzamiento · 0 tarjeta de crédito
                </div>

                <h2 className="text-5xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                  7 días
                </h2>
                <h3 className="text-3xl font-black mb-5" style={{ letterSpacing: '-0.02em' }}>
                  <span className="grad-text">completamente gratis</span>
                </h3>
                <p className="text-gray-400 leading-relaxed mb-8">
                  Sin compromisos. Sin tarjeta de crédito. Configura SofIA en tu clínica en 5 minutos y descubre en esta semana cuántos pacientes estás perdiendo sin IA.
                </p>

                <ul className="space-y-2.5 mb-8">
                  {[
                    'Bot de WhatsApp activo desde el día 1',
                    'Agendamiento automático con Google Calendar',
                    'Dashboard con métricas en tiempo real',
                    'Base de conocimiento personalizada (ilimitada)',
                    'Recordatorios automáticos de citas y pagos',
                    'Soporte 1 a 1 durante toda la demo',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => onChat('Hola! Quiero comenzar mi demo gratuita de 7 días 🚀')}
                    className="grad-btn flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-xl shadow-violet-500/30 transition-all"
                  >
                    <Bot size={18} /> Hablar con SofIA ahora
                  </button>
                </div>
                <p className="text-xs text-gray-700 mt-3">Respuesta en {'<'} 5 segundos · Sin formularios aburridos</p>
              </div>

              {/* Right: Planes */}
              <div className="space-y-3">
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">Planes disponibles</p>
                {[
                  { plan: 'Starter',    price: '$49',    mo: '/mes', clinics: '1 clínica',       convs: '500 conv/mes',  color: '#7c3aed', popular: false },
                  { plan: 'Pro',        price: '$149',   mo: '/mes', clinics: 'Hasta 5 clínicas', convs: 'Ilimitadas',    color: '#0ea5e9', popular: true  },
                  { plan: 'Enterprise', price: 'Custom', mo: '',     clinics: 'Sin límite',        convs: 'Ilimitadas',    color: '#10b981', popular: false },
                ].map(({ plan, price, mo, clinics, convs, color, popular }) => (
                  <div key={plan} className="relative flex items-center justify-between rounded-2xl px-5 py-4 glass transition-all hover:scale-[1.01]"
                    style={{ border: popular ? `1px solid ${color}40` : undefined }}>
                    {popular && (
                      <div className="absolute -top-2.5 left-5 text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: color, color: '#fff' }}>
                        MÁS POPULAR
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{plan}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{clinics} · {convs}</p>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-black" style={{ color }}>{price}</span>
                      <span className="text-xs text-gray-600 mb-0.5">{mo}</span>
                    </div>
                  </div>
                ))}

                <div className="glass rounded-2xl p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={13} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-semibold text-white">Demo incluye plan Pro completo</span>
                  </div>
                  <p className="text-[11px] text-gray-500">Prueba las funciones más avanzadas sin límites durante 7 días. Al terminar, elige el plan que más te convenga.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CHAT WIDGET (floating)
───────────────────────────────────────────────────────────────── */
interface ChatMsg { role: 'user' | 'bot'; content: string; }

const GREETING_MSG: ChatMsg = {
  role: 'bot',
  content: '¡Hola! 👋 Soy **SofIA**, tu asistente de IA.\n\nPuedo responder tus preguntas sobre la plataforma, contarte sobre los **recordatorios automáticos** o ayudarte a agendar tu **demo gratuita de 7 días**. ¿En qué te ayudo?',
};

const QUICK_QUESTIONS = [
  '¿Qué es SofIA?',
  'Demo gratis 7 días 🚀',
  '¿Cómo funcionan los recordatorios?',
  '¿Cuánto cuesta?',
];

function renderBotText(text: string) {
  // Simple markdown: **bold**
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          : part
      )}
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ));
}

function ChatWidget({ initialMsg }: { initialMsg: string | null }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<ChatMsg[]>([GREETING_MSG]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [demoSaved, setDemoSaved] = useState(false);
  const [unread, setUnread]       = useState(1);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300); } }, [open]);

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const updated: ChatMsg[] = [...messages, { role: 'user', content: msg }];
    setMessages(updated);
    setLoading(true);
    try {
      const history = updated.slice(1, -1).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }));
      const res  = await fetch('/api/demo-bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, history }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.response || 'Hubo un error. Intenta de nuevo.' }]);
      if (data.action === 'demo_saved') setDemoSaved(true);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'Error de conexión. Intenta de nuevo.' }]);
    } finally { setLoading(false); }
  }, [input, messages, loading]);

  // Auto-open + send when triggered from demo button
  useEffect(() => {
    if (initialMsg && !open) {
      setOpen(true);
      setTimeout(() => send(initialMsg), 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMsg]);

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed bottom-[88px] right-4 sm:right-6 z-50 flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          style={{ width: 360, height: 520, background: '#080d1a', border: '1px solid rgba(124,58,237,.25)', boxShadow: '0 30px 80px -10px rgba(0,0,0,.8), 0 0 0 1px rgba(124,58,237,.15) inset' }}>

          {/* Top accent */}
          <div className="h-0.5 w-full flex-shrink-0" style={{ background: 'linear-gradient(to right,#7c3aed,#4f46e5,#0ea5e9)' }} />

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                <Bot size={16} className="text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: '#080d1a' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">SofIA</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'glow 1.5s ease infinite' }} />
                En línea · Responde al instante
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.1) transparent' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {m.role === 'bot' && (
                  <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-auto" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                    <Bot size={11} className="text-white" />
                  </div>
                )}
                <div className="max-w-[75%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                  style={{
                    background:     m.role === 'user' ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'rgba(255,255,255,.06)',
                    borderRadius:   m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border:         m.role === 'bot' ? '1px solid rgba(255,255,255,.06)' : 'none',
                    color:          m.role === 'user' ? '#f3f4f6' : '#d1d5db',
                  }}>
                  {m.role === 'bot' ? renderBotText(m.content) : m.content}
                </div>
              </div>
            ))}

            {/* Demo saved success */}
            {demoSaved && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-[11px] text-emerald-300 rounded-xl px-3 py-2" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
                  <CheckCircle size={12} />
                  ¡Demo agendada! Te contactaremos pronto.
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  <Bot size={11} className="text-white" />
                </div>
                <div className="px-3 py-2.5 rounded-2xl flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '16px 16px 16px 4px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animation: `blink 1s ease ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick questions (only when first message) */}
            {messages.length === 1 && !loading && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[10px] text-gray-600 px-1">Preguntas frecuentes:</p>
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-between group"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <span>{q}</span>
                    <ChevronRight size={11} className="text-gray-600 group-hover:text-violet-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Escribe tu pregunta..."
                disabled={loading}
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none disabled:opacity-40"
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
                style={{ background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,.08)' }}>
                <Send size={12} className="text-white" />
              </button>
            </div>
            <p className="text-[9px] text-gray-700 text-center mt-1.5">Powered by SofIA AI · Respuesta garantizada</p>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{ background: open ? 'rgba(124,58,237,.3)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: open ? '1px solid rgba(124,58,237,.4)' : 'none', boxShadow: '0 8px 30px -4px rgba(124,58,237,.5)' }}
      >
        {open ? <X size={20} className="text-white" /> : <Bot size={22} className="text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center pulse-ring">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION: FOOTER CTA
───────────────────────────────────────────────────────────────── */
function FooterCTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="relative glass rounded-3xl p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background:'radial-gradient(ellipse at center,rgba(124,58,237,.4) 0%,transparent 70%)' }}/>
          <div className="relative">
            <p className="text-xs text-violet-400 font-medium uppercase tracking-widest mb-4">Transforma tu clínica hoy</p>
            <h2 className="text-4xl font-black text-white mb-6" style={{letterSpacing:'-0.02em'}}>
              ¿Listo para nunca más{' '}
              <span className="grad-text">perder un paciente</span>?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              SofIA está trabajando ahora mismo en clínicas reales. Únete y deja que la IA haga el trabajo pesado.
            </p>
            <button onClick={onLogin} className="grad-btn inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-xl shadow-violet-500/30 transition-all">
              Acceder al panel <ArrowRight size={18}/>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────────────────────────── */
function Navbar({ onLogin }: { onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive:true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? 'rgba(3,7,18,.85)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <Bot size={16} className="text-white"/>
          </div>
          <span className="text-base font-bold text-white">SofIA</span>
          <span className="text-[10px] text-gray-600 font-medium px-1.5 py-0.5 rounded glass hidden sm:block">Dental AI</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
          <a href="#features" className="hover:text-white transition-colors">Características</a>
          <a href="#login" className="hover:text-white transition-colors">Cómo funciona</a>
        </div>

        {/* CTA */}
        <button onClick={onLogin} className="grad-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all shadow-md shadow-violet-500/20">
          Iniciar sesión <ArrowRight size={14}/>
        </button>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FULL LANDING PAGE (wraps everything)
───────────────────────────────────────────────────────────────── */
function LandingPage() {
  const loginRef = useRef<HTMLDivElement>(null);
  const [chatMsg, setChatMsg] = useState<string | null>(null);

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' });
    setTimeout(() => document.getElementById('email')?.focus(), 700);
  };

  const openChat = useCallback((msg: string) => setChatMsg(msg), []);

  return (
    <div style={{ background:'#030712', minHeight:'100vh', color:'white' }}>
      <style>{GLOBAL_CSS}</style>
      <Background />
      <Navbar onLogin={scrollToLogin} />
      <div className="relative" style={{ zIndex: 1 }}>
        <Hero onLogin={scrollToLogin} />
        <StatsMarquee />
        <Features />
        <HowItWorks />
        <DashboardPreview />
        <Testimonials />
        <RemindersSection />
        <DemoSection onChat={openChat} />
        <FooterCTA onLogin={scrollToLogin} />
        <Suspense fallback={null}>
          <LoginSection loginRef={loginRef} />
        </Suspense>
        {/* Footer */}
        <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-700 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot size={12} className="text-violet-600"/>
              <span>SofIA Admin v2.0 — Multi-clínica Dental AI</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Sistemas operativos</span>
              <span>© 2026 Red Soluciones TI</span>
            </div>
          </div>
        </footer>
      </div>
      <ChatWidget initialMsg={chatMsg} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ background:'#030712', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Loader2 size={24} className="text-violet-400 animate-spin"/>
      </div>
    }>
      <LandingPage />
    </Suspense>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, X, Send, CheckCircle, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface ChatMsg { role: 'user' | 'bot'; content: string; ts: number; }

const GREETING: ChatMsg = {
  role: 'bot',
  ts: Date.now(),
  content: '¡Hola! 👋 Soy **SofIA**, tu asistente de IA.\n\nPuedo responder tus preguntas sobre la plataforma, contarte sobre los **recordatorios automáticos** o ayudarte a agendar tu **demo gratuita de 7 días**. ¿En qué te ayudo?',
};

const QUICK_CHIPS = [
  { label: '¿Qué es SofIA?',              msg: '¿Qué es SofIA?' },
  { label: '🚀 Demo gratis 7 días',        msg: 'Demo gratis 7 días' },
  { label: '¿Cómo funcionan los recordatorios?', msg: '¿Cómo funcionan los recordatorios?' },
  { label: '💰 ¿Cuánto cuesta?',           msg: '¿Cuánto cuesta?' },
  { label: '📅 ¿Cómo se agenda una cita?', msg: '¿Cómo se agenda una cita?' },
  { label: '🔒 Seguridad y privacidad',     msg: '¿Qué tan segura es la plataforma?' },
];

/* ─── Markdown renderer ──────────────────────────────────────── */
function BotText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        // Bullet line (• or -)
        if (/^[•\-]\s/.test(line)) {
          return (
            <span key={i} className="flex gap-1.5 mt-0.5">
              <span className="text-violet-400 flex-shrink-0 mt-px">•</span>
              <span>{renderInline(line.replace(/^[•\-]\s/, ''))}</span>
              {!isLast && <br className="hidden" />}
            </span>
          );
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)?.[1];
          return (
            <span key={i} className="flex gap-1.5 mt-0.5">
              <span className="text-violet-400 flex-shrink-0 font-semibold mt-px text-[10px]">{num}.</span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
              {!isLast && <br className="hidden" />}
            </span>
          );
        }
        // Empty line → spacer
        if (line === '') return <br key={i} />;
        // Normal line
        return (
          <span key={i}>
            {renderInline(line)}
            {!isLast && <br />}
          </span>
        );
      })}
    </>
  );
}

function renderInline(text: string) {
  return text.split(/(\*\*.*?\*\*)/).map((part, j) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      : <span key={j}>{part}</span>
  );
}

/* ─── Main Widget ────────────────────────────────────────────── */
export default function ChatWidget({ initialMsg }: { initialMsg: string | null }) {
  const [open, setOpen]           = useState(false);
  const [msgs, setMsgs]           = useState<ChatMsg[]>([GREETING]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(false);
  const [demoSaved, setDemoSaved] = useState(false);
  const [unread, setUnread]       = useState(1);
  const [visible, setVisible]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  // Focus + clear unread when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setTimeout(() => setVisible(false), 300);
    }
  }, [open]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setError(false);
    const updated: ChatMsg[] = [...msgs, { role: 'user', content: msg, ts: Date.now() }];
    setMsgs(updated);
    setLoading(true);
    try {
      const history = updated.slice(1, -1).map(m => ({
        role: m.role === 'bot' ? 'assistant' : 'user',
        content: m.content,
      }));
      const res  = await fetch('/api/demo-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      setMsgs(prev => [...prev, {
        role: 'bot',
        content: data.response || 'Hubo un problema. Intenta de nuevo.',
        ts: Date.now(),
      }]);
      if (data.action === 'demo_saved') setDemoSaved(true);
    } catch {
      setError(true);
      setMsgs(prev => [...prev, {
        role: 'bot',
        content: 'Sin conexión por un momento. ¿Reintentamos?',
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, msgs, loading]);

  // Auto-open when triggered from CTA
  useEffect(() => {
    if (initialMsg && !open) {
      setOpen(true);
      setTimeout(() => send(initialMsg), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMsg]);

  const isFirstMsg = msgs.length === 1 && !loading;

  return (
    <>
      {/* ── Chat panel ───────────────────────────────────────── */}
      {visible && (
        <div
          className="fixed z-50 flex flex-col"
          style={{
            bottom: 88, right: 20,
            width: 380, height: 580,
            borderRadius: 24,
            background: 'linear-gradient(160deg, #0d1224 0%, #080d1a 100%)',
            border: '1px solid rgba(124,58,237,.2)',
            boxShadow: '0 40px 100px -20px rgba(0,0,0,.9), 0 0 40px -10px rgba(124,58,237,.15)',
            transform: open ? 'translateY(0) scale(1)' : 'translateY(16px) scale(.97)',
            opacity: open ? 1 : 0,
            transition: 'transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s ease',
            pointerEvents: open ? 'auto' : 'none',
            overflow: 'hidden',
          }}>

          {/* Top gradient bar */}
          <div className="h-0.5 w-full flex-shrink-0"
            style={{ background: 'linear-gradient(to right,#7c3aed,#6366f1,#0ea5e9,#10b981)' }} />

          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#0ea5e9 100%)' }}>
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 flex-shrink-0"
                style={{ border: '2px solid #080d1a' }} />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white tracking-tight">SofIA</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(124,58,237,.2)', color: '#a78bfa' }}>IA</span>
              </div>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-px">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En línea · Responde en segundos
              </p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1">
              {msgs.length > 1 && (
                <button
                  onClick={() => { setMsgs([GREETING]); setDemoSaved(false); setError(false); }}
                  title="Nueva conversación"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
                  style={{ background: 'rgba(255,255,255,.04)' }}>
                  <RotateCcw size={12} />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,.04)' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.08) transparent' }}>

            {msgs.map((m, i) => (
              <div key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2 items-end`}
                style={{ animation: 'fadeSlideUp .2s ease' }}>

                {/* Bot avatar */}
                {m.role === 'bot' && (
                  <div className="w-6 h-6 rounded-xl flex-shrink-0 flex items-center justify-center mb-0.5"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                    <Bot size={11} className="text-white" />
                  </div>
                )}

                {/* Bubble */}
                <div className="max-w-[78%] px-3 py-2.5 text-xs leading-relaxed"
                  style={{
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg,#7c3aed,#5b21b6)'
                      : 'rgba(255,255,255,.06)',
                    borderRadius: m.role === 'user'
                      ? '18px 18px 4px 18px'
                      : '18px 18px 18px 4px',
                    border: m.role === 'bot' ? '1px solid rgba(255,255,255,.07)' : 'none',
                    color: m.role === 'user' ? '#f3f4f6' : '#c9cdd6',
                  }}>
                  {m.role === 'bot' ? <BotText text={m.content} /> : m.content}
                </div>
              </div>
            ))}

            {/* Demo saved badge */}
            {demoSaved && (
              <div className="flex justify-center pt-1" style={{ animation: 'fadeSlideUp .3s ease' }}>
                <div className="flex items-center gap-2 text-[11px] text-emerald-300 rounded-xl px-3 py-2"
                  style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
                  <CheckCircle size={12} />
                  ¡Demo registrada! Te contactaremos pronto. 🎉
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start gap-2 items-end" style={{ animation: 'fadeSlideUp .2s ease' }}>
                <div className="w-6 h-6 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  <Bot size={11} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-[18px] flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '18px 18px 18px 4px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: '#7c3aed',
                        animation: `typingDot 1.2s ease ${i * 0.2}s infinite`,
                      }} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick chips — shown at start */}
            {isFirstMsg && (
              <div className="pt-1 space-y-1" style={{ animation: 'fadeSlideUp .3s ease .1s both' }}>
                <p className="text-[10px] text-gray-600 px-1 font-medium">Preguntas frecuentes:</p>
                {QUICK_CHIPS.map(({ label, msg }) => (
                  <button key={label} onClick={() => send(msg)}
                    className="w-full text-left text-[11px] px-3 py-2 rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-between group"
                    style={{
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.06)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)')}>
                    <span>{label}</span>
                    <ChevronRight size={11} className="text-gray-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
              style={{
                background: 'rgba(255,255,255,.05)',
                border: `1px solid ${input.trim() ? 'rgba(124,58,237,.4)' : 'rgba(255,255,255,.08)'}`,
                transition: 'border-color .2s ease',
              }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Escribe tu pregunta..."
                disabled={loading}
                maxLength={500}
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none disabled:opacity-40"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                style={{ background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,.08)' }}>
                <Send size={12} className="text-white" />
              </button>
            </div>
            <p className="text-[9px] text-gray-700 text-center mt-1.5 tracking-wide">
              Powered by <span className="text-gray-600">SofIA AI</span> · Respuesta garantizada
            </p>
          </div>
        </div>
      )}

      {/* ── Floating button ──────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-50 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          bottom: 24, right: 20,
          width: 56, height: 56,
          borderRadius: 18,
          background: open
            ? 'rgba(124,58,237,.25)'
            : 'linear-gradient(135deg,#7c3aed,#5b21b6)',
          border: open ? '1px solid rgba(124,58,237,.4)' : '1px solid rgba(124,58,237,.2)',
          boxShadow: open
            ? '0 4px 20px -4px rgba(124,58,237,.3)'
            : '0 8px 30px -4px rgba(124,58,237,.6)',
        }}>
        {open ? <X size={20} className="text-white" /> : <Bot size={22} className="text-white" />}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center"
            style={{ border: '2px solid #050810', animation: 'pulseRing 2s ease infinite' }}>
            {unread}
          </span>
        )}
      </button>

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: .4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,.6); }
          70%  { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </>
  );
}

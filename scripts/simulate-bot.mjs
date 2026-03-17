/**
 * simulate-bot.mjs
 * Back-to-end simulation of WhatsApp conversation scenarios
 * against the /api/demo-bot endpoint (rule-based fallback, no n8n needed)
 *
 * Usage:
 *   node scripts/simulate-bot.mjs              # local (default)
 *   node scripts/simulate-bot.mjs --prod       # production
 *   node scripts/simulate-bot.mjs --verbose    # show full responses
 */

const args    = process.argv.slice(2);
const PROD    = args.includes('--prod');
const VERBOSE = args.includes('--verbose');
const BASE    = PROD
  ? 'https://sofia.redsolucionesti.com'
  : 'http://localhost:3000';

const ENDPOINT = `${BASE}/api/demo-bot`;

/* ── Colors ── */
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m',
  blue:   '\x1b[34m',
};
const ok   = `${C.green}✅${C.reset}`;
const fail = `${C.red}❌${C.reset}`;
const warn = `${C.yellow}⚠️ ${C.reset}`;

/* ── Send one message with history ── */
async function send(message, history = []) {
  const res = await fetch(ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

/* ── Assertion helpers ── */
function assert(label, value, condition) {
  const passed = condition(value);
  console.log(
    `  ${passed ? ok : fail} ${label}`,
    passed ? '' : `${C.red}(got: "${String(value).slice(0, 120)}")${C.reset}`,
  );
  return passed;
}

function norm(s) {
  return s.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
}
function contains(text, ...keywords) {
  const n = norm(text);
  return keywords.every(k => n.includes(norm(k)));
}

function notContains(text, ...keywords) {
  const n = text.toLowerCase();
  return keywords.every(k => !n.includes(k.toLowerCase()));
}

/* ── Scenario runner ── */
let totalPassed = 0;
let totalFailed = 0;

async function scenario(title, fn) {
  console.log(`\n${C.bold}${C.cyan}▶ ${title}${C.reset}`);
  let passed = 0; let failed = 0;
  const check = (label, text, condition) => {
    const ok = assert(label, text, condition);
    ok ? passed++ : failed++;
  };
  try {
    await fn(check);
  } catch (e) {
    console.log(`  ${fail} ${C.red}ERROR: ${e.message}${C.reset}`);
    failed++;
  }
  totalPassed += passed; totalFailed += failed;
  const color = failed === 0 ? C.green : C.red;
  console.log(`  ${color}${passed}/${passed + failed} checks passed${C.reset}`);
}

/* ═══════════════════════════════════════════════════
   SCENARIOS
   ═══════════════════════════════════════════════════ */

console.log(`\n${C.bold}SofIA Demo-Bot — Conversation Simulator${C.reset}`);
console.log(`${C.gray}Endpoint: ${ENDPOINT}${C.reset}`);
console.log(`${C.gray}${'─'.repeat(55)}${C.reset}`);

/* 1. Greeting */
await scenario('Saludo inicial', async (check) => {
  const r = await send('hola');
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('Menciona SofIA',    r.response, t => contains(t, 'sofia'));
  check('Menciona demo',     r.response, t => contains(t, 'demo'));
  check('Tono amigable',     r.response, t => contains(t, '👋') || contains(t, '😊'));
  check('Action = none',     r.action,   v => v === 'none');
});

/* 2. Greeting variants */
await scenario('Variantes de saludo', async (check) => {
  for (const msg of ['Buenos días', 'buenas tardes', 'Hey', 'buen dia']) {
    const r = await send(msg);
    check(`"${msg}" → menciona SofIA`, r.response, t => contains(t, 'sofia') || contains(t, '👋') || contains(t, '😊'));
  }
});

/* 3. Precio / planes */
await scenario('Pregunta por precios', async (check) => {
  for (const msg of ['¿Cuánto cuesta?', 'precio', 'planes disponibles', '¿cuánto vale?']) {
    const r = await send(msg);
    if (VERBOSE) console.log(`  ${C.gray}"${msg}" → ${r.response.slice(0, 100)}...${C.reset}`);
    check(`"${msg}" → tiene precio`,  r.response, t => contains(t, '$') || contains(t, 'mes'));
    check(`"${msg}" → menciona demo`, r.response, t => contains(t, 'demo') || contains(t, 'gratis'));
  }
});

/* 4. Recordatorios */
await scenario('Recordatorios automáticos', async (check) => {
  const r = await send('¿Cómo funcionan los recordatorios?');
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('Menciona 24 horas',    r.response, t => contains(t, '24'));
  check('Menciona WhatsApp',    r.response, t => contains(t, 'whatsapp'));
  check('Menciona automático',  r.response, t => contains(t, 'automat'));
});

/* 5. Agendamiento de citas — chip principal */
await scenario('Agendamiento de citas (chip: ¿Cómo se agenda una cita?)', async (check) => {
  const r = await send('¿Cómo se agenda una cita?');
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('Menciona WhatsApp',   r.response, t => contains(t, 'whatsapp'));
  check('Menciona disponibil.', r.response, t => contains(t, 'disponib') || contains(t, 'horario'));
  check('Menciona confirmac.', r.response, t => contains(t, 'confirma'));
  check('Sin "Google Calendar"', r.response, t => notContains(t, 'google calendar'));
});

/* 6. Agendamiento — variantes */
await scenario('Agendamiento variantes', async (check) => {
  const variants = [
    'Quiero agendar una cita',
    'cómo se reserva una cita',
    '¿tienen disponibilidad?',
    'como agenda el paciente',
  ];
  for (const msg of variants) {
    const r = await send(msg);
    check(`"${msg}" → respuesta de cita`, r.response,
      t => contains(t, 'cita') || contains(t, 'agenda') || contains(t, 'horario') || contains(t, 'disponib'));
  }
});

/* 7. Seguridad */
await scenario('Seguridad y privacidad', async (check) => {
  const r = await send('¿Qué tan segura es la plataforma?');
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('Menciona seguridad',  r.response, t => contains(t, 'seguridad') || contains(t, 'cifrad') || contains(t, 'encriptad'));
  check('Menciona datos',      r.response, t => contains(t, 'dato'));
  check('Menciona aislamiento', r.response, t => contains(t, 'aislad') || contains(t, 'supabase') || contains(t, 'gdpr') || contains(t, 'tls'));
});

/* 8. Qué es SofIA */
await scenario('¿Qué es SofIA?', async (check) => {
  const r = await send('¿Qué es SofIA?');
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('Menciona IA / plataforma', r.response, t => contains(t, 'ia') || contains(t, 'plataforma') || contains(t, 'asistente'));
  check('Menciona dental',          r.response, t => contains(t, 'dental') || contains(t, 'clínica') || contains(t, 'clinica'));
  check('Menciona WhatsApp',        r.response, t => contains(t, 'whatsapp'));
});

/* 9. Demo gratis — intención explícita */
await scenario('Demo gratis 7 días — inicio de flujo', async (check) => {
  const r = await send('Demo gratis 7 días');
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('Pide nombre',  r.response, t => contains(t, 'nombre'));
  check('Action = none', r.action, v => v === 'none');
});

/* 10. Flujo completo de demo (conversación multi-turno) */
await scenario('Flujo demo completo (5 turnos)', async (check) => {
  let history = [];

  // Turno 1: trigger demo
  let r = await send('quiero la demo gratis', history);
  check('T1: pide nombre', r.response, t => contains(t, 'nombre'));
  history.push({ role: 'user', content: 'quiero la demo gratis' });
  history.push({ role: 'assistant', content: r.response });

  // Turno 2: nombre
  r = await send('María González', history);
  check('T2: pide email',  r.response, t => contains(t, 'email') || contains(t, 'correo'));
  check('T2: usa el nombre', r.response, t => contains(t, 'María') || contains(t, 'Maria') || contains(t, 'maria'));
  history.push({ role: 'user', content: 'María González' });
  history.push({ role: 'assistant', content: r.response });

  // Turno 3: email
  r = await send('maria@clinica.com', history);
  check('T3: pide clínica', r.response, t => contains(t, 'clínica') || contains(t, 'clinica'));
  history.push({ role: 'user', content: 'maria@clinica.com' });
  history.push({ role: 'assistant', content: r.response });

  // Turno 4: clínica
  r = await send('Clínica Dental Sonrisa', history);
  check('T4: pide teléfono o horario', r.response,
    t => contains(t, 'teléfono') || contains(t, 'telefono') || contains(t, 'whatsapp') || contains(t, 'momento'));
  history.push({ role: 'user', content: 'Clínica Dental Sonrisa' });
  history.push({ role: 'assistant', content: r.response });

  // Turno 5: teléfono
  r = await send('88776655', history);
  check('T5: avanza en flujo', r.response,
    t => contains(t, 'momento') || contains(t, 'horario') || contains(t, 'prefer') || contains(t, 'listo'));
  history.push({ role: 'user', content: '88776655' });
  history.push({ role: 'assistant', content: r.response });

  if (VERBOSE) console.log(`  ${C.gray}Último bot: ${r.response.slice(0, 200)}${C.reset}`);
});

/* 11. FAQ durante flujo demo — no debe interrumpir con dato de demo */
await scenario('FAQ interrumpe flujo demo (guard looksLikeFAQ)', async (check) => {
  // Bot estaba pidiendo nombre
  const history = [
    { role: 'assistant', content: '¡Perfecto! ¿Cuál es tu nombre completo?' },
  ];
  const r = await send('¿Cuánto cuesta?', history);
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('Responde FAQ de precio (no guarda como nombre)', r.response,
    t => contains(t, '$') || contains(t, 'starter') || contains(t, 'plan'));
});

/* 12. Respuesta por defecto — mensaje no reconocido */
await scenario('Respuesta por defecto (mensaje no reconocido)', async (check) => {
  const r = await send('xkdjfhdkjfhsdkjfhsd123');
  if (VERBOSE) console.log(`  ${C.gray}${r.response}${C.reset}`);
  check('No está vacía',       r.response, t => t.length > 10);
  check('Ofrece opciones',     r.response, t => contains(t, 'sofia') || contains(t, 'demo') || contains(t, 'precio'));
  check('Action = none',       r.action,   v => v === 'none');
});

/* 13. Sin "Google Calendar" en ninguna respuesta */
await scenario('Sin referencias a Google Calendar', async (check) => {
  const messages = [
    '¿Cómo se agenda una cita?',
    '¿Qué es SofIA?',
    'Demo gratis',
    '¿Qué incluye la demo?',
    'cómo funciona el calendario',
  ];
  for (const msg of messages) {
    const r = await send(msg);
    check(`"${msg}" sin "google calendar"`, r.response,
      t => notContains(t, 'google calendar'));
  }
});

/* 14. Respuestas en español */
await scenario('Idioma y longitud de respuestas', async (check) => {
  const tests = [
    { msg: '¿Cómo funcionan los recordatorios?', minLen: 80 },
    { msg: '¿Cuánto cuesta?',                    minLen: 100 },
    { msg: '¿Qué es SofIA?',                     minLen: 100 },
    { msg: '¿Cómo se agenda una cita?',           minLen: 100 },
  ];
  for (const { msg, minLen } of tests) {
    const r = await send(msg);
    check(`"${msg}" respuesta suficiente (>${minLen} chars)`, r.response,
      t => t.length >= minLen);
    check(`"${msg}" en español`, r.response,
      t => /[áéíóúñ¿¡]/.test(t) || contains(t, ' de ') || contains(t, ' la ') || contains(t, ' en '));
  }
});

/* 15. Agradecimiento contextual */
await scenario('Agradecimiento (con y sin nombre previo)', async (check) => {
  const r1 = await send('gracias');
  check('Responde gracias (anon)',    r1.response, t => contains(t, 'gusto') || contains(t, 'sofia') || contains(t, 'pregunta'));

  const history = [
    { role: 'user',      content: 'quiero la demo' },
    { role: 'assistant', content: '¿Cuál es tu nombre completo?' },
    { role: 'user',      content: 'Carlos Pérez' },
    { role: 'assistant', content: 'Encantado, Carlos! ¿Cuál es tu email?' },
  ];
  const r2 = await send('gracias por todo', history);
  check('Responde gracias (con nombre)', r2.response,
    t => contains(t, 'carlos') || contains(t, 'gusto') || contains(t, 'sofia'));
});

/* ─── Summary ─── */
const total = totalPassed + totalFailed;
const pct   = Math.round((totalPassed / total) * 100);
const color = totalFailed === 0 ? C.green : totalFailed <= 3 ? C.yellow : C.red;

console.log(`\n${C.gray}${'═'.repeat(55)}${C.reset}`);
console.log(`${C.bold}Results: ${color}${totalPassed}/${total} checks passed (${pct}%)${C.reset}`);

if (totalFailed > 0) {
  console.log(`${C.yellow}${totalFailed} check(s) failed — review responses above${C.reset}`);
  process.exit(1);
} else {
  console.log(`${C.green}All scenarios passed! 🎉${C.reset}`);
}

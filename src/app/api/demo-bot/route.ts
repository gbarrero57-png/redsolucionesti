import { NextRequest, NextResponse } from 'next/server';

const NO_CACHE = { 'Cache-Control': 'no-store' };

/* ── Rate limiting: 30 req/IP/min ── */
const ipWindows = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const win = ipWindows.get(ip);
  if (!win || now > win.resetAt) { ipWindows.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (win.count >= 30) return false;
  win.count++;
  return true;
}

/* ── Types ── */
interface Message { role: 'user' | 'assistant'; content: string; }
interface LeadData { name?: string; clinic?: string; phone?: string; }

/* ── Normalize: remove accents + lowercase ── */
function norm(s: string): string {
  return s.toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[¿¡]/g, '');
}

/* ── Detect what the bot last asked for ── */
function getLastAsked(botMsg: string): keyof LeadData | null {
  const b = norm(botMsg);
  if (/tu nombre|como te llamas|nombre completo|cual es tu nombre/.test(b)) return 'name';
  if (/nombre de (tu |la )?clinica|clinica se llama|como se llama.*clinica/.test(b))  return 'clinic';
  if (/telefono|celular|numero de (telefono|contacto|whatsapp)|numero de whatsapp|whatsapp/.test(b)) return 'phone';
  return null;
}

/* ── Is this message clearly a FAQ, not a lead answer? ── */
function looksLikeFAQ(n: string): boolean {
  return /que es|como funciona|cuanto cuesta|cuanto vale|precio|plan(es)?|recordatorio|whatsapp|integracion|seguridad|privacidad|cuanto tarda|recepcionista|reemplaz|hola$|gracias|buenas|hey |quienes son|cancelar|soporte|idioma|calendario|agenda|cita|reservar|como se|horario/.test(n);
}

/* ── Extract lead data from conversation history ── */
function extractLeadData(msgs: Message[]): LeadData {
  const data: LeadData = {};
  for (let i = 0; i < msgs.length - 1; i++) {
    const msg = msgs[i]; const next = msgs[i + 1];
    if (msg.role !== 'assistant' || next.role !== 'user') continue;
    const asked = getLastAsked(msg.content);
    const answer = next.content.trim();
    if (!asked || !answer || answer.length > 100) continue;
    if (asked === 'name'   && !answer.includes('@'))       data.name   = answer;
    if (asked === 'clinic')                                data.clinic = answer;
    if (asked === 'phone')                                 data.phone  = answer;
  }
  return data;
}

/* ── Telegram notification ── */
async function notifyTelegram(lead: LeadData): Promise<void> {
  const token  = (process.env.TELEGRAM_BOT_TOKEN  ?? '').replace(/\s/g, '');
  const chatId = (process.env.TELEGRAM_CHAT_ID    ?? '').replace(/\s/g, '');
  if (!token || !chatId) return;

  const now = new Date().toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const text = [
    '🚀 <b>NUEVO LEAD — SofIA AI</b>',
    '',
    `👤 <b>Nombre:</b> ${lead.name ?? '—'}`,
    `🏥 <b>Clínica:</b> ${lead.clinic ?? '—'}`,
    `📱 <b>WhatsApp:</b> ${lead.phone ?? '—'}`,
    '',
    `🕐 ${now} (Lima)`,
    `🌐 Fuente: Chat landing sofia.redsolucionesti.com`,
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* non-blocking */ }
}

/* ── Next question in lead capture flow ── */
function nextLeadQuestion(d: LeadData): string | null {
  const first = d.name ? d.name.split(' ')[0] : '';
  if (!d.name)   return `¡Perfecto! Me encantaría ayudarte. 😊\n\n¿Cuál es tu **nombre**?`;
  if (!d.clinic) return `Encantado, **${first}**! 👋\n\n¿Cómo se llama tu **clínica dental**?`;
  if (!d.phone)  return `¡Casi listo! ¿Cuál es tu **número de WhatsApp**? Un especialista te contactará ahí directamente.`;
  return null;
}

/* ─────────────────────────────────────────────────────────────────
   FAQ DATABASE — all patterns run against norm(text)
───────────────────────────────────────────────────────────────── */
type Responder = (d: LeadData) => string;
const FAQS: { pattern: RegExp; response: Responder }[] = [
  // Greetings
  {
    pattern: /^(hola|hi|hey|buenas|buenos dias|buenas tardes|buenas noches|saludos|ola|buen dia)/,
    response: (d) => d.name
      ? `¡Hola de nuevo, **${d.name.split(' ')[0]}**! 👋 ¿En qué te puedo ayudar?`
      : `¡Hola! 😊 Soy **SofIA**, el asistente de la plataforma SofIA AI para clínicas dentales.\n\nEstoy aquí para responder tus preguntas y ayudarte a solicitar tu **demo gratuita**. ¿Qué te gustaría saber?`,
  },
  // Thanks
  {
    pattern: /^(gracias|thank|perfecto|genial|excelente|buenisimo|listo|entendido|ok|okay)/,
    response: (d) => d.name
      ? `¡Con gusto, **${d.name.split(' ')[0]}**! 😊 ¿Hay algo más en lo que te pueda ayudar?`
      : `¡Con gusto! 😊 ¿Tienes alguna otra pregunta sobre SofIA?`,
  },
  // Reminders
  {
    pattern: /recordatorio|reminder|aviso autom|notificacion|recuerda cita/,
    response: () =>
      `SofIA envía **recordatorios automáticos** por WhatsApp **24 horas antes** de cada cita. ⏰\n\nEl paciente recibe un mensaje con:\n• Nombre del doctor\n• Fecha y hora\n• Botón para confirmar o cancelar\n\nSofIA actualiza el calendario automáticamente según la respuesta. **Reduce hasta 40% las inasistencias.**\n\n¿Quieres ver esto en tu clínica con una **demo gratuita**?`,
  },
  // What is SofIA
  {
    pattern: /que es sofia|que hace sofia|sobre sofia|como funciona sofia|cuentame (de|sobre)|para que sirve sofia|que ofrece sofia/,
    response: () =>
      `**SofIA** es una plataforma de IA diseñada específicamente para clínicas dentales. 🦷\n\n• Responde mensajes de **WhatsApp** en menos de 2 segundos, 24/7\n• **Agenda citas** automáticamente consultando disponibilidad en tiempo real\n• Responde preguntas usando tu **base de conocimiento** (precios, servicios, horarios)\n• **Escala a tu equipo** cuando hay algo que no puede resolver\n• Envía **recordatorios automáticos** 24h antes de cada cita\n\nTu equipo se libera de mensajes repetitivos y se enfoca en atender pacientes. 🚀`,
  },
  // Pricing
  {
    pattern: /precio|costo|cuanto cuesta|cuanto vale|cuanto sale|cuantos cobran|plan(es)?|tarifa|suscri|mensual|anual|pagar|cobran|es caro|cuanto es/,
    response: () =>
      `Tenemos planes en soles, sin contratos:\n\n🟢 **Básico** — S/290/mes · 1 clínica · 500 conversaciones/mes\n🔵 **Pro** — S/490/mes · multi-doctor · 1,500 conversaciones ⭐ *(el más popular)*\n🏥 **Clínica** — S/790/mes · ilimitadas · multi-doctor + reportes avanzados\n🟣 **Enterprise** — precio personalizado · múltiples sedes\n\n✨ Sin contrato. Cancela cuando quieras.\n💡 Descuento 15% pagando 6 meses | 25% pagando 1 año\n\n¿Quieres solicitar tu **demo gratuita**?`,
  },
  // WhatsApp / integrations
  {
    pattern: /whatsapp|chatwoot|integracion|integra|canal de comunicacion/,
    response: () =>
      `SofIA se conecta con **WhatsApp Business** a través de un número dedicado para tu clínica. 📱\n\nLos pacientes escriben como siempre y SofIA responde en nombre de tu clínica — sin cambiar nada para tus pacientes.\n\nSi tienes varias sedes, cada una tiene su propio número y configuración independiente.`,
  },
  // Calendar / appointments
  {
    pattern: /calendario|agendar|agenda.*cita|cita.*agenda|como se agenda|como agenda|disponibilidad|horarios disponibles|reservar cita|agendamiento|como.*cita|cita.*como/,
    response: () =>
      `¡Súper sencillo para el paciente! 📅\n\n1. El paciente escribe por **WhatsApp** pidiendo una cita\n2. SofIA consulta la **disponibilidad real** de tu clínica\n3. Ofrece **3 horarios libres** directamente como botones\n4. El paciente elige y SofIA **confirma al instante**\n5. **24h antes**, SofIA envía recordatorio automático\n\nTu equipo nunca tiene que intervenir. ✅\n\n¿Quieres ver cómo quedaría para tu clínica?`,
  },
  // Security / privacy
  {
    pattern: /seguridad|segura|seguro|privacidad|datos del paciente|gdpr|encriptad|confidencial|tan segura|es segura/,
    response: () =>
      `La seguridad es prioridad absoluta. 🔒\n\nLos datos de tu clínica y pacientes se almacenan en tu **propia base de datos** — completamente aislados de otras clínicas.\n\nTodo el tráfico va cifrado con HTTPS/TLS y es compatible con estándares internacionales de privacidad.`,
  },
  // Multiple clinics
  {
    pattern: /varias clinicas|multiples clinicas|grupo dental|cadena|franquicia|sucursal(es)?|escalar negocio/,
    response: () =>
      `¡SofIA está diseñada para escalar! 🏢\n\nDesde el **Plan Clínica** puedes tener múltiples doctores en la misma clínica. El plan **Enterprise** no tiene límite de sedes.\n\nDesde un único panel administras todas tus sedes: métricas, horarios, configuración de cada WhatsApp.`,
  },
  // Team / receptionist
  {
    pattern: /recepcionista|personal|equipo|staff|reemplaza|trabajo|empleado/,
    response: () =>
      `SofIA **complementa** a tu equipo, nunca lo reemplaza. 🤝\n\nEl 80% de los mensajes de una clínica son preguntas repetitivas: horarios, precios, disponibilidad. SofIA las maneja automáticamente.\n\nTu recepcionista se enfoca en recibir pacientes y atención personalizada. Cuando SofIA no puede con algo, **escala al humano en segundos**.`,
  },
  // Setup time
  {
    pattern: /cuanto tarda|tiempo de implementacion|como se configura|proceso de setup|implementar sofia|cuando empieza|cuanto tiempo tarda|48 horas/,
    response: () =>
      `¡Muy rápido! El setup toma **menos de 48 horas**:\n\n1. Te asignamos un número de WhatsApp exclusivo para tu clínica\n2. Cargamos tus horarios, servicios y precios\n3. ¡SofIA empieza a atender!\n\nTe acompañamos **personalmente** en todo el proceso. 🛠️`,
  },
  // Cancel / no contract
  {
    pattern: /cancelar|cancelacion|contrato|permanencia|sin compromiso|cuando cancelo|puedo cancelar/,
    response: () =>
      `SofIA funciona **mes a mes**, sin contratos ni permanencia mínima. 🆓\n\nCancelas cuando quieras desde tu panel, sin cargos adicionales ni penalizaciones.`,
  },
  // Support
  {
    pattern: /soporte|ayuda tecnica|asistencia|tengo un problema|error|atencion al cliente/,
    response: () =>
      `Ofrecemos soporte completo:\n\n💬 **WhatsApp directo** con el equipo técnico\n📧 Email con respuesta en menos de 4 horas\n🎥 Video-llamada de onboarding incluida en todos los planes\n\nDurante la configuración inicial tendrás soporte 1 a 1 con un especialista.`,
  },
  // Demo details
  {
    pattern: /que incluye (la demo|el trial|la prueba)|como es la demo|detalles de la demo|en que consiste la demo/,
    response: () =>
      `La **demo gratuita** incluye una configuración real de SofIA para tu clínica:\n\n✅ WhatsApp Business conectado con tu número\n✅ Calendario integrado con tus horarios reales\n✅ Base de conocimiento con tus servicios y precios\n✅ Recordatorios automáticos activos\n✅ Panel de administración completo\n✅ Soporte 1 a 1 durante la configuración\n\n¿Empezamos? 🚀`,
  },
];

/* ── Main response logic ── */
async function buildResponse(
  message: string,
  history: Message[]
): Promise<{ response: string; action: string }> {
  const normalized = norm(message.trim());
  const allMsgs = [...history, { role: 'user' as const, content: message }];
  const lead = extractLeadData(allMsgs);

  const lastBot  = history.filter(h => h.role === 'assistant').pop();
  const lastAsked = lastBot ? getLastAsked(lastBot.content) : null;

  // ── Lead capture flow — only if not a FAQ ──
  if (lastAsked && !looksLikeFAQ(normalized)) {
    // Check if all 3 fields are now collected
    if (lead.name && lead.clinic && lead.phone) {
      const first = lead.name.split(' ')[0];
      return {
        response: `¡Listo, **${first}**! 🎉\n\nHemos registrado tu solicitud:\n✅ **Nombre:** ${lead.name}\n✅ **Clínica:** ${lead.clinic}\n✅ **WhatsApp:** ${lead.phone}\n\nUn especialista de **Red Soluciones TI** te contactará por WhatsApp en las próximas horas. ¡Gracias por tu interés! 😊\n\n¿Tienes alguna otra pregunta mientras tanto?`,
        action: 'demo_saved',
      };
    }
    // Continue collecting
    const next = nextLeadQuestion(lead);
    if (next) return { response: next, action: 'none' };
  }

  // ── Explicit demo intent ──
  if (/demo|prueba gratis|comenzar ahora|empezar ahora|quiero probar|registrarme|quiero la demo|iniciar demo|solicitar demo/.test(normalized)) {
    const next = nextLeadQuestion(lead);
    if (next) return { response: next, action: 'none' };
  }

  // ── FAQ matching ──
  for (const faq of FAQS) {
    if (faq.pattern.test(normalized)) {
      return { response: faq.response(lead), action: 'none' };
    }
  }

  // ── Default ──
  const firstName = lead.name ? ` **${lead.name.split(' ')[0]}**,` : '';
  return {
    response: `Hola${firstName} soy **SofIA** 👋\n\nPuedo contarte sobre:\n\n• 💬 **Cómo responde SofIA** en WhatsApp 24/7\n• 📅 **Agendamiento automático** de citas\n• 🔔 **Recordatorios** automáticos 24h antes\n• 💰 **Planes desde S/290/mes** sin contrato\n• 🚀 **Demo gratuita** para tu clínica\n\n¿Qué te interesa más?`,
    action: 'none',
  };
}

/* ── Route handler ── */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429, headers: NO_CACHE });
  }

  const body = await req.json().catch(() => ({}));
  const { message, history = [] } = body as { message: string; history: Message[] };

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  const safeHistory = (Array.isArray(history) ? history : [])
    .slice(-20)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 500) }));

  // Small humanizing delay
  await new Promise(r => setTimeout(r, 350));

  const allMsgs = [...safeHistory, { role: 'user' as const, content: message }];
  const result  = await buildResponse(message, safeHistory);

  // Send Telegram when lead is complete
  if (result.action === 'demo_saved') {
    const lead = extractLeadData(allMsgs);
    await notifyTelegram(lead);
  }

  return NextResponse.json(result, { headers: NO_CACHE });
}

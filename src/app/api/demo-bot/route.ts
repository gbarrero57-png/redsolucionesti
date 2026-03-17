import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK = 'https://workflows.n8n.redsolucionesti.com/webhook/sofia-demo';
const NO_CACHE = { 'Cache-Control': 'no-store' };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

/* ── Types ── */
interface Message { role: 'user' | 'assistant'; content: string; }
interface DemoData {
  name?: string; email?: string; clinic?: string;
  phone?: string; preferred?: string;
}

/* ── Normalize: remove accents + lowercase ── */
function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[¿¡]/g, '');
}

function getLastAsked(botMsg: string): keyof DemoData | null {
  const b = normalize(botMsg);
  if (/tu nombre|como te llamas|nombre completo|cual es tu nombre/.test(b)) return 'name';
  if (/telefono|celular|numero de (telefono|contacto|whatsapp)|whatsapp.*coordinar|coordinar.*whatsapp/.test(b)) return 'phone';
  if (/direccion de (email|correo)|cual es tu (email|correo)|tu (email|correo) (electronico|electro)|correo electr/.test(b)) return 'email';
  if (/nombre de (tu |la )?clinica|clinica se llama|como se llama.*clinica|nombre.*clinica|como se llama tu clinica/.test(b)) return 'clinic';
  if (/mejor momento|mejor hora|fecha.*prefer|horario.*prefer|cuando.*prefer|prefer.*fecha/.test(b)) return 'preferred';
  return null;
}

/* ── Is this message clearly a question/FAQ, not a demo data answer? ── */
function looksLikeFAQ(norm: string): boolean {
  return /que es|como funciona|cuanto cuesta|cuanto vale|precio|plan(es)?|recordatorio|whatsapp|integracion|seguridad|privacidad|cuanto tarda|recepcionista|reemplaz|hola$|gracias|buenas|hey |quienes son|cancelar|soporte|idioma|calendario|agenda|cita|reservar|como se|horario/.test(norm);
}

/* ── Extract all demo data from conversation history ── */
function extractDemoData(msgs: Message[]): DemoData {
  const data: DemoData = {};
  for (let i = 0; i < msgs.length - 1; i++) {
    const msg = msgs[i];
    const next = msgs[i + 1];
    if (msg.role !== 'assistant' || next.role !== 'user') continue;
    const asked = getLastAsked(msg.content);
    const answer = next.content.trim();
    if (!asked || !answer) continue;
    if (asked === 'name' && answer.length > 0 && answer.length < 80 && !answer.includes('@')) data.name = answer;
    else if (asked === 'email' && answer.includes('@')) data.email = answer;
    else if (asked === 'clinic' && answer.length > 0) data.clinic = answer;
    else if (asked === 'phone') data.phone = answer;
    else if (asked === 'preferred') data.preferred = answer;
  }
  return data;
}

/* ── Save demo to Supabase ── */
async function saveDemoRequest(data: DemoData): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/demo_requests`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: data.name, email: data.email, clinic_name: data.clinic,
        phone: data.phone || '', preferred_datetime: data.preferred || '',
        status: 'pending',
      }),
    });
    return res.ok;
  } catch { return false; }
}

/* ── Next step in demo collection flow ── */
function nextDemoQuestion(collected: DemoData): { response: string; action: string } {
  const firstName = collected.name ? collected.name.split(' ')[0] : '';

  if (!collected.name) return {
    response: `¡Perfecto! Me encantaría ayudarte a comenzar. 😊\n\n¿Cuál es tu **nombre completo**?`,
    action: 'none',
  };
  if (!collected.email) return {
    response: `Encantado, **${firstName}**! 👋\n\n¿Cuál es tu **dirección de email**? Te enviaremos ahí los detalles de acceso.`,
    action: 'none',
  };
  if (!collected.clinic) return {
    response: `Perfecto. ¿Cómo se llama **tu clínica dental**?`,
    action: 'none',
  };
  if (!collected.phone) return {
    response: `¡Casi listo, **${firstName}**! ¿Cuál es tu **número de WhatsApp o teléfono** para coordinar la demo? (Escribe "no tengo" si prefieres solo email)`,
    action: 'none',
  };
  if (!collected.preferred) return {
    response: `¡Ya casi! ¿Cuál sería el **mejor momento** para la demo? Por ejemplo: *"lunes por la mañana"*, *"esta semana cualquier tarde"*, o una fecha específica.`,
    action: 'none',
  };
  return { response: '', action: 'none' };
}

/* ── FAQ rules — ALL patterns run against normalize(text), no accents needed ── */
type Responder = (d: DemoData) => string;

const FAQS: { pattern: RegExp; response: Responder }[] = [
  // Greetings
  {
    pattern: /^(hola|hi|hey|buenas|buenos dias|buenas tardes|buenas noches|saludos|ola|buen dia)/,
    response: (d) => d.name
      ? `¡Hola de nuevo, **${d.name.split(' ')[0]}**! 👋 ¿En qué te puedo ayudar?`
      : `¡Hola! 😊 Soy **SofIA**, el asistente de la plataforma SofIA AI para clínicas dentales.\n\nEstoy aquí para responder tus preguntas y ayudarte a agendar tu **demo gratuita de 7 días**. ¿Qué te gustaría saber?`,
  },
  // Thanks
  {
    pattern: /^(gracias|thank|perfecto|genial|excelente|buenisimo|listo|entendido|ok|okay)/,
    response: (d) => d.name
      ? `¡Con gusto, **${d.name.split(' ')[0]}**! 😊 ¿Hay algo más en lo que te pueda ayudar?`
      : `¡Con gusto! 😊 ¿Tienes alguna otra pregunta sobre SofIA?`,
  },
  // Reminders — BEFORE generic FAQ (more specific)
  {
    pattern: /recordatorio|reminder|aviso autom|notificacion|recuerda cita/,
    response: () =>
      `SofIA tiene **dos sistemas de recordatorios completamente automáticos**:\n\n🗓️ **Recordatorio de citas:** WhatsApp automático **24 horas antes** de cada cita. El paciente confirma con un tap y SofIA actualiza el calendario al instante.\n\n💳 **Recordatorio de suscripción:** Aviso automático **3 días antes** del vencimiento de tu plan. Sin sorpresas.\n\nAmbos funcionan desde el primer día, sin configuración extra. ✅\n\n¿Te gustaría ver esto en acción con una **demo gratuita**?`,
  },
  // What is SofIA / how it works
  {
    pattern: /que es sofia|que hace sofia|sobre sofia|como funciona sofia|cuentame (de|sobre)|para que sirve sofia|que ofrece sofia/,
    response: () =>
      `**SofIA** es una plataforma de IA diseñada para clínicas dentales. 🦷\n\n• Responde mensajes de **WhatsApp** en menos de 2 segundos, las 24h\n• **Agenda citas** automáticamente en el calendario integrado\n• Consulta tu **base de conocimiento** (precios, servicios, horarios)\n• **Escala a humano** cuando lo necesita\n• Envía **recordatorios** automáticos antes de cada cita\n\nTu equipo se libera de mensajes repetitivos y se enfoca en atender pacientes. 🚀`,
  },
  // Pricing — CRITICAL: handles "¿Cuánto cuesta?", "precio", "planes"
  {
    pattern: /precio|costo|cuanto cuesta|cuanto vale|cuanto sale|cuantos cobran|plan(es)?|tarifa|suscri|mensual|anual|pagar|cobran|es caro|cuanto es/,
    response: () =>
      `Tenemos planes para cada tamaño de clínica:\n\n💜 **Starter** — $49/mes · 1 clínica · 500 conversaciones/mes\n🚀 **Pro** — $149/mes · hasta 5 clínicas · conversaciones **ilimitadas** *(el más popular)*\n🏢 **Enterprise** — precio a medida · clínicas ilimitadas\n\nLos 3 incluyen **7 días de demo gratis** con el plan Pro completo, sin tarjeta de crédito. 💳\n\n¿Quieres comenzar tu demo gratis ahora?`,
  },
  // WhatsApp / integrations
  {
    pattern: /whatsapp|chatwoot|integracion|integra|canal de comunicacion|instagram|facebook/,
    response: () =>
      `SofIA se conecta nativamente con **WhatsApp Business** a través de Chatwoot. Tu número actual sigue siendo el mismo — los pacientes escriben como siempre y SofIA responde en nombre de tu clínica. 📱\n\nSoporta múltiples números si tienes varias sedes. La integración con Instagram y Facebook Messenger está en desarrollo.`,
  },
  // Calendar / appointments — covers "¿Cómo se agenda una cita?", "agendar", "reservar", etc.
  {
    pattern: /calendario|agendar|agenda.*cita|cita.*agenda|como se agenda|como agenda|disponibilidad|horarios disponibles|reservar cita|reserva.*cita|agendamiento|como.*cita|cita.*como/,
    response: () =>
      `¡Súper sencillo para el paciente! 📅\n\nAsí funciona el agendamiento en SofIA:\n\n1. El paciente escribe por **WhatsApp** pidiendo una cita\n2. SofIA consulta la **disponibilidad real** de tu clínica en tiempo real\n3. Ofrece **3 horarios libres** directamente en el chat\n4. El paciente elige y SofIA **confirma al instante**\n5. **24h antes** de la cita, SofIA envía un recordatorio automático\n\nTu equipo nunca tiene que intervenir — todo pasa solo. ✅\n\n¿Quieres ver cómo quedaría configurado para tu clínica?`,
  },
  // Security / privacy
  {
    pattern: /seguridad|privacidad|datos del paciente|gdpr|cumplimiento|encriptad|hipaa|confidencial/,
    response: () =>
      `La seguridad es prioridad absoluta. 🔒\n\nLos datos de tu clínica y pacientes se almacenan en tu **propia base de datos Supabase** — completamente aislados de otras clínicas, sin servidores compartidos.\n\nCompatible con **GDPR** y estándares internacionales. Todo el tráfico va cifrado con HTTPS/TLS.`,
  },
  // Multiple clinics
  {
    pattern: /varias clinicas|multiples clinicas|grupo dental|cadena|franquicia|sucursal(es)?|escalar negocio/,
    response: () =>
      `¡SofIA está diseñada para escalar! 🏢\n\nEl plan **Pro** soporta hasta 5 clínicas desde un único panel. El plan **Enterprise** no tiene límite.\n\nDesde el **Superadmin** puedes ver métricas de todas tus clínicas, pausar/reanudar bots individualmente y gestionar el equipo de cada sede.`,
  },
  // Team / receptionist
  {
    pattern: /recepcionista|personal|equipo|staff|reemplaza|trabajo|empleado/,
    response: () =>
      `SofIA **complementa** a tu equipo, nunca lo reemplaza. 🤝\n\nEl 80% de los mensajes de una clínica son preguntas repetitivas: horarios, precios, disponibilidad. SofIA las maneja automáticamente.\n\nTu recepcionista se enfoca en recibir pacientes y atención personalizada. Cuando SofIA no puede con algo, **escala al humano en segundos**.`,
  },
  // Setup time
  {
    pattern: /cuanto tarda|tiempo de implementacion|como se configura|proceso de setup|implementar sofia|cuando empieza|cuanto tiempo tarda/,
    response: () =>
      `¡Muy rápido! El setup inicial toma **5 minutos**:\n\n1. Conectamos tu número de WhatsApp\n2. Cargamos tu información (servicios, precios, horarios)\n3. ¡Listo! SofIA responde\n\nDurante la demo gratuita te acompañamos **personalmente** en cada paso. 🛠️`,
  },
  // Cancel / no contract
  {
    pattern: /cancelar|cancelacion|contrato|permanencia|sin compromiso|cuando cancelo|puedo cancelar/,
    response: () =>
      `SofIA funciona **mes a mes**, sin contratos ni permanencia. 🆓\n\nCancelas cuando quieras desde tu panel, sin cargos adicionales.\n\nLa demo de 7 días es **100% gratis** y sin tarjeta de crédito requerida.`,
  },
  // Support
  {
    pattern: /soporte|ayuda tecnica|asistencia|tengo un problema|error en sofia|atencion al cliente/,
    response: () =>
      `Ofrecemos **soporte completo** en todos los planes:\n\n💬 Chat en tiempo real (horario laboral)\n📧 Email con respuesta en menos de 4 horas\n🎥 Video-llamada de onboarding (Pro y Enterprise)\n\nDurante la **demo gratuita** tendrás soporte 1 a 1 con un especialista dedicado.`,
  },
  // Language
  {
    pattern: /idioma|espanol|ingles|frances|portugues|multilingual|idiomas/,
    response: () =>
      `SofIA está optimizada para **español latinoamericano** y responde en inglés cuando el paciente escribe en inglés. 🌎\n\nTu base de conocimiento se configura en el idioma de tus pacientes y SofIA responde en ese idioma automáticamente.`,
  },
  // Demo details
  {
    pattern: /que incluye (la demo|el trial|la prueba)|como es la demo|detalles de la demo|en que consiste la demo/,
    response: () =>
      `La **demo gratuita de 7 días** incluye el plan Pro completo:\n\n✅ SofIA activa en tu clínica real (no sandbox)\n✅ WhatsApp Business conectado\n✅ Calendario integrado de SofIA\n✅ Recordatorios automáticos\n✅ Panel de administración completo\n✅ Soporte 1 a 1\n✅ Sin tarjeta de crédito\n\n¿Empezamos? 🚀`,
  },
];

/* ── Main response logic ── */
async function buildResponse(
  message: string,
  history: Message[]
): Promise<{ response: string; action: string }> {
  const norm = normalize(message.trim());

  const allMsgs = [...history, { role: 'user' as const, content: message }];
  const collected = extractDemoData(allMsgs);

  const lastBot = history.filter(h => h.role === 'assistant').pop();
  const lastAsked = lastBot ? getLastAsked(lastBot.content) : null;

  // ── Demo collection flow — only if NOT a FAQ question ──
  if (lastAsked && !looksLikeFAQ(norm)) {
    const updatedCollected = extractDemoData(allMsgs);

    if (updatedCollected.name && updatedCollected.email && updatedCollected.clinic && updatedCollected.preferred) {
      await saveDemoRequest(updatedCollected);
      const first = updatedCollected.name.split(' ')[0];
      return {
        response: `¡Todo listo, **${first}**! 🎉\n\nHemos registrado tu solicitud:\n✅ **Nombre:** ${updatedCollected.name}\n✅ **Email:** ${updatedCollected.email}\n✅ **Clínica:** ${updatedCollected.clinic}\n✅ **Disponibilidad:** ${updatedCollected.preferred}\n\nUn especialista de SofIA te contactará en las próximas **2-4 horas hábiles** para confirmar el horario y enviarte el acceso. ¡Gracias!\n\n¿Tienes alguna pregunta mientras tanto?`,
        action: 'demo_saved',
      };
    }

    const next = nextDemoQuestion(updatedCollected);
    if (next.response) return next;
  }

  // ── Explicit demo intent ──
  if (/demo|prueba gratis|7 dias|free trial|comenzar ahora|empezar ahora|quiero probar|registrarme|quiero la demo|iniciar demo/.test(norm)) {
    const step = nextDemoQuestion(collected);
    if (step.response) return step;
  }

  // ── FAQ matching (normalized text) ──
  for (const faq of FAQS) {
    if (faq.pattern.test(norm)) {
      return { response: faq.response(collected), action: 'none' };
    }
  }

  // ── Contextual default ──
  const firstName = collected.name ? ` **${collected.name.split(' ')[0]}**,` : '';
  return {
    response: `Hola${firstName} soy **SofIA** 👋\n\nPuedo contarte sobre:\n\n• 💬 **Cómo responde SofIA** en WhatsApp 24/7\n• 📅 **Agendamiento automático** de citas\n• 🔔 **Recordatorios** automáticos para pacientes\n• 💰 **Precios** y planes disponibles\n• 🚀 **Demo gratuita** de 7 días sin tarjeta\n\n¿Qué te interesa más?`,
    action: 'none',
  };
}

/* ── Route handler ── */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { message, history = [] } = body as { message: string; history: Message[] };

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  // Try n8n first (AI-powered)
  try {
    const res = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.slice(0, 1000), history }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { headers: NO_CACHE });
    }
  } catch { /* fallback */ }

  // Rule-based fallback
  await new Promise(r => setTimeout(r, 400));
  const result = await buildResponse(message, history);
  return NextResponse.json(result, { headers: NO_CACHE });
}

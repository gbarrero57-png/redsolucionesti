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

/* ── State tracking: what was the bot last asking for? ── */
function normalize(s: string): string {
  // Lowercase + strip markdown + remove accent diacritics for reliable matching
  return s.toLowerCase().replace(/\*\*/g, '')
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
}

function getLastAsked(botMsg: string): keyof DemoData | null {
  const b = normalize(botMsg);
  if (/tu nombre|como te llamas|nombre completo|cual es tu nombre/.test(b)) return 'name';
  // phone BEFORE email — phone question ends with "si prefieres solo email" which contains "email"
  if (/telefono|celular|numero de (telefono|contacto|whatsapp)|whatsapp.*coordinar|coordinar.*whatsapp/.test(b)) return 'phone';
  // email: require question markers to avoid false positives
  if (/direccion de (email|correo)|cual es tu (email|correo)|tu (email|correo) (electronico|electro)|correo electr/.test(b)) return 'email';
  if (/nombre de (tu |la )?clinica|clinica se llama|como se llama.*clinica|nombre.*clinica/.test(b)) return 'clinic';
  if (/mejor momento|mejor hora|fecha.*prefer|horario.*prefer|cuando.*prefer|prefer.*fecha/.test(b)) return 'preferred';
  return null;
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
function nextDemoQuestion(collected: DemoData, name?: string): { response: string; action: string } {
  const firstName = name || collected.name || '';
  const greet = firstName ? `${firstName.split(' ')[0]}, ` : '';

  if (!collected.name) {
    return {
      response: `¡Perfecto! Me encantaría ayudarte a comenzar. 😊\n\nPrimero, ¿cuál es tu **nombre completo**?`,
      action: 'none',
    };
  }
  if (!collected.email) {
    return {
      response: `Encantado, ${greet.replace(', ', '')}! 👋\n\n¿Cuál es tu **dirección de email**? Te enviaremos ahí los detalles de la demo.`,
      action: 'none',
    };
  }
  if (!collected.clinic) {
    return {
      response: `Perfecto. Ahora, ¿cómo se llama **tu clínica dental**?`,
      action: 'none',
    };
  }
  if (!collected.phone) {
    return {
      response: `Excelente! Casi terminamos. ¿Cuál es tu **número de teléfono o WhatsApp** para coordinar la demo? (Puedes escribir "no tengo" si prefieres solo email)`,
      action: 'none',
    };
  }
  if (!collected.preferred) {
    return {
      response: `¡Ya casi! ¿Cuál sería el **mejor momento** para hacer la demo? Por ejemplo: *"lunes por la mañana"*, *"esta semana en cualquier tarde"*, o una fecha específica.`,
      action: 'none',
    };
  }
  return { response: '', action: 'none' }; // all collected
}

/* ── FAQ rules ── */
type Responder = (d: DemoData) => string;
const FAQS: { pattern: RegExp; response: Responder }[] = [
  // ── Recordatorios FIRST (more specific than generic "cómo funciona") ──
  {
    pattern: /recordatorio|reminder|aviso|notifi|recuerda/i,
    response: () =>
      `SofIA tiene **dos sistemas de recordatorios completamente automáticos**:\n\n🗓️ **Recordatorios de citas:** WhatsApp automático 24 horas antes de cada cita agendada. El paciente confirma con un tap y SofIA actualiza el calendario.\n\n💳 **Recordatorios de pagos:** Aviso automático 3 días antes del vencimiento de tu suscripción. Sin sorpresas, sin interrupciones.\n\nAmbos funcionan desde el primer día, sin ninguna configuración extra. ✅`,
  },
  {
    pattern: /qu[eé]\s*(es|hace|ofrece|sabe)|sobre sofia|como funciona|c[oó]mo funciona|cu[eé]ntame/i,
    response: () =>
      `**SofIA** es una plataforma de inteligencia artificial diseñada especialmente para clínicas dentales. 🦷\n\nEn pocas palabras: SofIA gestiona todos los mensajes de **WhatsApp** de tu clínica, responde en menos de 2 segundos las 24 horas, agenda citas automáticamente en Google Calendar y escala a humano cuando lo necesita.\n\nTu equipo se libera de responder mensajes repetitivos y puede enfocarse en lo que realmente importa: atender a los pacientes.`,
  },
  {
    pattern: /precio|cost[ao]|cuant[ao]|plan[es]?|tarifa|suscri|mensual/i,
    response: () =>
      `Tenemos planes para cada tamaño de clínica:\n\n💜 **Starter** — $49/mes · 1 clínica · 500 conversaciones/mes\n🚀 **Pro** — $149/mes · hasta 5 clínicas · conversaciones **ilimitadas** *(el más popular)*\n🏢 **Enterprise** — precio a medida · clínicas ilimitadas\n\nLos 3 incluyen **7 días de demo gratis** con el plan Pro completo. Sin tarjeta de crédito.`,
  },
  {
    pattern: /whatsapp|chatwoot|integra/i,
    response: () =>
      `SofIA se conecta nativamente con **WhatsApp Business** a través de Chatwoot. Tu número actual sigue siendo el mismo — los pacientes escriben como siempre y SofIA responde en nombre de tu clínica.\n\nTambién funciona con múltiples números si tienes varias sedes. 📱`,
  },
  {
    pattern: /segur|privaci|datos|gdpr|cumplimiento|encriptad/i,
    response: () =>
      `La seguridad es prioridad absoluta. Los datos de tu clínica y pacientes se almacenan en tu **propia base de datos Supabase** — no en servidores compartidos. Cada clínica tiene sus datos completamente aislados.\n\nCompatible con GDPR y estándares de privacidad internacionales. 🔒`,
  },
  {
    pattern: /recepcionista|personal|equipo|staff|reemplaz/i,
    response: () =>
      `SofIA **complementa** a tu equipo, nunca lo reemplaza. 🤝\n\nEl 80% de los mensajes que recibe una clínica son preguntas repetitivas: horarios, precios, disponibilidad. SofIA las maneja automáticamente.\n\nTu recepcionista puede enfocarse en recibir pacientes, coordinar tratamientos complejos y dar la atención personalizada que solo un humano puede dar.`,
  },
  {
    pattern: /cuanto tarda|cu[aá]nto tarda|configurar|setup|implementar|cu[aá]ndo empiez/i,
    response: () =>
      `¡Muy rápido! El setup inicial toma aproximadamente **5 minutos**:\n\n1. Conectamos tu número de WhatsApp\n2. Cargamos la información básica de tu clínica\n3. ¡Listo! SofIA ya puede responder\n\nDurante la demo gratuita te acompañamos personalmente en cada paso. 🛠️`,
  },
  {
    pattern: /hola|hi |hey |buenas|buenos dias|buenas tardes|buenas noches/i,
    response: (d) =>
      d.name
        ? `¡Hola de nuevo, ${d.name.split(' ')[0]}! 👋 ¿En qué puedo ayudarte?`
        : `¡Hola! 😊 Soy **SofIA**, asistente de la plataforma SofIA AI para clínicas dentales.\n\nEstoy aquí para contarte cómo podemos transformar la atención de tu clínica con IA, responder tus preguntas, o ayudarte a agendar tu **demo gratuita de 7 días**. ¿Cómo te puedo ayudar?`,
  },
  {
    pattern: /gracias|thank|perfecto|genial|excelente|brutal|bien|ok |okay/i,
    response: (d) =>
      d.name
        ? `¡Con gusto, ${d.name.split(' ')[0]}! 😊 ¿Hay algo más en lo que te pueda ayudar?`
        : `¡Con gusto! 😊 Estoy aquí para lo que necesites. ¿Tienes alguna otra pregunta sobre SofIA?`,
  },
];

/* ── Main response logic ── */
async function buildResponse(
  message: string,
  history: Message[]
): Promise<{ response: string; action: string }> {
  const lower = message.toLowerCase().trim();

  // All messages including current for data extraction
  const allMsgs = [...history, { role: 'user' as const, content: message }];
  const collected = extractDemoData(allMsgs);

  // What was the bot last asking about?
  const lastBot = history.filter(h => h.role === 'assistant').pop();
  const lastAsked = lastBot ? getLastAsked(lastBot.content) : null;

  // ── Handling an answer in demo collection flow ──
  if (lastAsked) {
    // User answered the previous question — check if we now have everything
    const updatedCollected = extractDemoData(allMsgs);

    // Check if all required fields are now collected
    if (updatedCollected.name && updatedCollected.email && updatedCollected.clinic && updatedCollected.preferred) {
      await saveDemoRequest(updatedCollected);
      const first = updatedCollected.name.split(' ')[0];
      return {
        response: `¡Todo listo, **${first}**! 🎉\n\nHemos registrado tu solicitud de demo:\n✅ **Nombre:** ${updatedCollected.name}\n✅ **Email:** ${updatedCollected.email}\n✅ **Clínica:** ${updatedCollected.clinic}\n✅ **Disponibilidad:** ${updatedCollected.preferred}\n\nUn especialista de SofIA se pondrá en contacto contigo en las próximas **2-4 horas** hábiles para confirmar el horario y enviarte el acceso.\n\n¿Tienes alguna pregunta mientras tanto?`,
        action: 'demo_saved',
      };
    }

    // Still collecting — ask for the next missing field
    const next = nextDemoQuestion(updatedCollected);
    if (next.response) return next;
  }

  // ── Explicit intent to start demo ──
  if (/demo|prueba|gratis|free|7 d[ií]as|comenzar|empezar|start|agendar|quiero probar|registrar/i.test(lower)) {
    const step = nextDemoQuestion(collected);
    if (step.response) return step;
  }

  // ── FAQ matching ──
  for (const faq of FAQS) {
    if (faq.pattern.test(lower)) {
      return { response: faq.response(collected), action: 'none' };
    }
  }

  // ── Contextual default ──
  const firstName = collected.name ? `, ${collected.name.split(' ')[0]}` : '';
  return {
    response: `Entendido${firstName}. 😊 SofIA convierte WhatsApp en el mejor asistente de tu clínica dental — responde automáticamente, agenda citas y envía recordatorios sin que tengas que hacer nada.\n\n¿Te cuento sobre los **recordatorios automáticos**, los **precios**, o prefieres agendar tu **demo gratuita de 7 días** ahora mismo?`,
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

  // Try n8n first (AI-powered, when webhook is registered)
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

  // Context-aware rule-based fallback
  await new Promise(r => setTimeout(r, 500));
  const result = await buildResponse(message, history);
  return NextResponse.json(result, { headers: NO_CACHE });
}

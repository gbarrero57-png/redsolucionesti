'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import ChatWidget from '@/components/ChatWidget';
import { trackEvent } from '@/lib/track';
import {
  MessageSquare,
  Calendar,
  Shield,
  BarChart2,
  BookOpen,
  Building2,
  ChevronDown,
  Instagram,
  Facebook,
  Check,
} from 'lucide-react';

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: MessageSquare,
    title: 'IA Conversacional',
    description:
      'Entiende lenguaje natural en español. Responde como una recepcionista real, no como un bot de menús.',
  },
  {
    icon: Calendar,
    title: 'Agendamiento Automático',
    description:
      'Verifica disponibilidad y crea citas en tiempo real. Sin doble booking, sin errores humanos.',
  },
  {
    icon: Shield,
    title: 'Control Total',
    description:
      'Pausa el bot en 1 clic. Toma el control cuando quieras. Tú siempre decides.',
  },
  {
    icon: BarChart2,
    title: 'Métricas en tiempo real',
    description:
      'Dashboard con conversaciones, citas agendadas y satisfacción. Todo en un solo lugar.',
  },
  {
    icon: BookOpen,
    title: 'Base de Conocimiento',
    description:
      'Responde con tu información: precios, horarios, servicios — sin programar nada.',
  },
  {
    icon: Building2,
    title: 'Multi-clínica',
    description:
      'Un solo panel para todas tus sedes. Cada clínica con su propia configuración.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Consigue tu número dedicado',
    description:
      'Obtén una SIM nueva o número virtual exclusivo para SofIA. Así el número queda para siempre en tu clínica, no atado a ningún celular personal.',
  },
  {
    number: '02',
    title: 'Configuramos SofIA',
    description:
      'Cargamos tus horarios, servicios y precios. Nosotros hacemos el trabajo técnico.',
  },
  {
    number: '03',
    title: 'SofIA empieza a atender',
    description:
      'Tus pacientes escriben y SofIA responde al instante, agenda citas y resuelve dudas.',
  },
  {
    number: '04',
    title: 'Tú supervisas y creces',
    description:
      'Revisa conversaciones, accede a métricas y toma el control cuando lo necesites.',
  },
];

const comparisonRows = [
  {
    feature: 'Disponibilidad',
    sofia: '24/7 siempre',
    human: 'Solo horario laboral',
    basic: '24/7 (sin entender)',
  },
  {
    feature: 'Costo mensual',
    sofia: '$49–$199',
    human: '$500–$1,500',
    basic: '$0–$50 (sin agendar)',
  },
  {
    feature: 'Entiende lenguaje natural',
    sofia: '✅ Sí (GPT-4)',
    human: '✅ Sí',
    basic: '❌ Solo palabras clave',
  },
  {
    feature: 'Agenda en tiempo real',
    sofia: '✅ Automático',
    human: '⚠️ Manual',
    basic: '❌ Solo captura datos',
  },
  {
    feature: 'Anti double-booking',
    sofia: '✅ Siempre',
    human: '⚠️ Error humano',
    basic: '❌ No',
  },
  {
    feature: 'Recordatorios 24h',
    sofia: '✅ Automático',
    human: '⚠️ Si hay tiempo',
    basic: '❌ Add-on de pago',
  },
  {
    feature: 'Setup',
    sofia: '✅ 48 horas',
    human: '❌ Proceso de RRHH',
    basic: '⚠️ 1–2 semanas',
  },
  {
    feature: 'Vacaciones/bajas',
    sofia: '✅ Nunca',
    human: '❌ Sí',
    basic: '✅ Nunca',
  },
];

const testimonials = [
  {
    avatarUrl: 'https://ui-avatars.com/api/?name=Carlos+Mendoza&background=1A6EBD&color=fff&size=64',
    name: 'Dr. Carlos Mendoza',
    role: 'Clínica Dental Sonrisa, Lima',
    quote:
      'Antes perdíamos 3-4 pacientes por semana por mensajes sin responder. Ahora SofIA atiende todo y solo me avisa cuando necesita mi ayuda.',
  },
  {
    avatarUrl: 'https://ui-avatars.com/api/?name=Sofia+Rios&background=7C3AED&color=fff&size=64',
    name: 'Dra. Sofía Ríos',
    role: 'Odontología Estética, Bogotá',
    quote:
      'La configuración fue más fácil de lo que esperaba. En menos de 24 horas ya teníamos SofIA atendiendo pacientes por WhatsApp.',
  },
  {
    avatarUrl: 'https://ui-avatars.com/api/?name=Roberto+Salinas&background=059669&color=fff&size=64',
    name: 'Ing. Roberto Salinas',
    role: 'Red de 4 clínicas, México',
    quote:
      'Manejamos 4 sedes desde un solo panel. Cada clínica tiene su propia IA pero yo veo todo centralizado. Increíble.',
  },
];

const faqs = [
  {
    question: '¿Qué pasa si SofIA dice algo incorrecto?',
    answer:
      'SofIA solo agenda citas y responde preguntas con la información que tú le configuras (precios, horarios, servicios). No da diagnósticos ni información médica. Puedes revisar cada conversación desde el dashboard y tomar el control en cualquier momento con un clic.',
  },
  {
    question: '¿Necesito un número de WhatsApp nuevo?',
    answer:
      'Sí, recomendamos usar un número dedicado exclusivamente para SofIA — una SIM nueva o número virtual de cualquier operador. Esto evita mezclar mensajes personales con los de la clínica y garantiza que el número quede como activo de tu negocio. Durante el onboarding te guiamos en la configuración completa, sin costo adicional.',
  },
  {
    question: '¿Mis pacientes van a saber que están hablando con una IA?',
    answer:
      'SofIA está diseñada para sonar natural y profesional. Según nuestros datos, menos del 8% de los pacientes escalan a un humano porque la conversación se siente fluida. Si quieres, puedes configurar que SofIA se identifique como asistente virtual — tú decides.',
  },
  {
    question: '¿Cuánto tiempo tarda la configuración?',
    answer:
      'El onboarding completo toma menos de 48 horas. Solo necesitas llegar con tres cosas: tu SIM nueva (o número virtual), tus horarios de atención y la lista de servicios. Nosotros hacemos todo el setup técnico.',
  },
  {
    question: '¿Puedo cancelar cuando quiera?',
    answer:
      'Sí. Sin permanencia, sin penalizaciones. Cancelas desde tu panel con un clic y no se genera ningún cobro adicional.',
  },
];

const pricingTiers = [
  {
    name: 'Starter',
    price: 'S/ 290',
    period: '/mes',
    description: 'Consultorio unipersonal · 1 doctor · Hasta 200 pacientes activos',
    features: [
      '1 número WhatsApp',
      'SofIA responde FAQs 24/7',
      'Agendamiento automático de citas',
      'Recordatorios 24h antes',
      'Hasta 500 conversaciones/mes',
    ],
    notIncluded: [
      'Sin reporte mensual',
      'Sin multi-doctor',
      'Sin personalización avanzada',
    ],
    badge: null,
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'S/ 490',
    period: '/mes',
    description: 'Clínica con 2–4 doctores · 200–600 pacientes activos',
    features: [
      '1 número WhatsApp',
      'SofIA completa con IA (GPT-4o)',
      'Agendamiento multi-doctor',
      'Recordatorios automáticos',
      'Reporte mensual PDF con métricas',
      'Hasta 1,500 conversaciones/mes',
      'Integración calendario por doctor',
      'Soporte por WhatsApp (respuesta <24h)',
      'Panel de estadísticas',
    ],
    notIncluded: [],
    badge: '⭐ PRINCIPAL',
    highlight: true,
  },
  {
    name: 'Clínica',
    price: 'S/ 790',
    period: '/mes',
    description: 'Clínica grande · +4 doctores · Volumen alto',
    features: [
      '2 números WhatsApp',
      'Todo lo del Pro',
      'Multi-sucursal (hasta 2 sedes)',
      'Hasta 5,000 conversaciones/mes',
      'WhatsApp Flows nativos (cuando disponible)',
      'Soporte prioritario (respuesta <4h)',
      'Onboarding personalizado (1 sesión Zoom)',
      'Personalización de respuestas SofIA',
    ],
    notIncluded: [],
    badge: null,
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Precio personalizado',
    period: '',
    description: 'Para redes de clínicas con necesidades específicas',
    features: [
      'Clínicas y sedes ilimitadas',
      'Todo lo del Plan Clínica',
      'SLA garantizado',
      'Integración con tu sistema (API)',
      'Soporte dedicado 24/7',
      'Onboarding completo para tu equipo',
      'Conversaciones ilimitadas',
    ],
    notIncluded: [],
    badge: null,
    highlight: false,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SofiaLanding() {
  const [openFaq,      setOpenFaq]      = useState<number | null>(null);
  const [chatTrigger,  setChatTrigger]  = useState(0);

  const openChat = useCallback(() => setChatTrigger(n => n + 1), []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100">
      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="#" className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
                SofIA
              </span>
              <span className="text-sm text-slate-400">by Red Soluciones TI</span>
            </a>
            <div className="hidden items-center gap-8 md:flex">
              <a
                href="#caracteristicas"
                className="text-sm text-slate-400 transition-colors hover:text-slate-100"
              >
                Características
              </a>
              <a
                href="#precios"
                className="text-sm text-slate-400 transition-colors hover:text-slate-100"
              >
                Precios
              </a>
              <a
                href="#faq"
                className="text-sm text-slate-400 transition-colors hover:text-slate-100"
              >
                FAQ
              </a>
              <a
                href="/admin/login"
                className="text-sm text-slate-400 transition-colors hover:text-slate-100"
              >
                Iniciar sesión
              </a>
            </div>
            <a
              href="https://wa.me/51992764457?text=Hola%2C%20quiero%20ver%20c%C3%B3mo%20funciona%20SofIA"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('cta_header_demo', { label: 'nav_hablar_sofia' })}
              className="cta-glow rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-500"
            >
              Hablar con SofIA
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center gap-6"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300">
                🤖 Recepcionista IA para WhatsApp · 24/7
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              Tu clínica dental,{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                siempre disponible
              </span>{' '}
              con IA
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl"
            >
              Agenda citas, responde preguntas y gestiona tu recepción por WhatsApp — y
              tu recepción nunca cierra.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 sm:flex-row">
              <a
                href="https://wa.me/51992764457?text=Hola%2C%20quiero%20ver%20c%C3%B3mo%20funciona%20SofIA"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cta_hero_demo', { label: 'hero_hablar_sofia' })}
                className="cta-glow rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white transition-all hover:bg-blue-500"
              >
                Hablar con Sofía ahora
              </a>
              <a
                href="#como-funciona"
                className="text-base font-medium text-slate-400 transition-colors hover:text-slate-200"
              >
                Ver cómo funciona →
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="text-sm text-slate-500">
              ✓ Sin tarjeta de crédito &nbsp;·&nbsp; ✓ Setup en 48h &nbsp;·&nbsp; ✓ Cancela
              cuando quieras
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── METRICS BAR ── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
        >
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { value: '24/7', label: 'Disponible siempre' },
              { value: '<2s', label: 'Tiempo de respuesta' },
              { value: '500+', label: 'Citas agendadas' },
              { value: '95%', label: 'Satisfacción pacientes' },
            ].map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                  {metric.value}
                </div>
                <div className="mt-1 text-sm text-slate-400">{metric.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── BRAND STORY ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-3xl font-bold text-white sm:text-4xl"
          >
            Por qué construimos SofIA
          </motion.h2>
          <motion.div variants={staggerContainer} className="flex flex-col gap-5">
            {[
              'Cada noche, miles de dentistas en LATAM se van a dormir con el celular lleno de mensajes sin responder.',
              'Un paciente preguntó si había cita para el martes. Otro canceló y quiso reagendar. Para cuando el doctor vio los mensajes a las 7am, dos de ellos ya habían encontrado otra clínica.',
              'Eso no debería pasar. Construimos SofIA para que no pase.',
              'No es un bot de botones. Es una asistente que entiende cuando alguien escribe \'¿tienes algo el jueves por la tarde?\' y responde como lo haría tu mejor recepcionista — a cualquier hora.',
            ].map((paragraph, i) => (
              <motion.p
                key={i}
                variants={fadeUp}
                className="text-lg italic leading-relaxed text-slate-300"
              >
                {paragraph}
              </motion.p>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section id="caracteristicas" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Todo lo que necesitas para{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                nunca perder un paciente
              </span>
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-blue-500/30 hover:bg-blue-500/5"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-blue-500/15 p-3">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Lista en menos de{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                48 horas
              </span>
              , nosotros lo configuramos por ti
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                className="relative flex flex-col items-start"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[2.375rem] top-[1.375rem] hidden h-px w-[calc(100%-1rem)] bg-gradient-to-r from-blue-500/40 to-transparent lg:block" />
                )}
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/15 text-sm font-bold text-blue-400">
                  {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section id="comparativa" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              ¿Por qué SofIA y no otra solución?
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="overflow-x-auto rounded-2xl border border-white/10"
          >
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left font-medium text-slate-400">Característica</th>
                  <th className="bg-blue-600/10 px-6 py-4 text-center font-bold text-blue-400 ring-1 ring-inset ring-blue-500/30">
                    SofIA
                  </th>
                  <th className="px-6 py-4 text-center font-medium text-slate-400">
                    Recepcionista humana
                  </th>
                  <th className="px-6 py-4 text-center font-medium text-slate-400">
                    Chatbot básico
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-white/5 transition-colors hover:bg-white/3 ${
                      i % 2 === 0 ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <td className="px-6 py-3.5 font-medium text-slate-300">{row.feature}</td>
                    <td className="bg-blue-600/5 px-6 py-3.5 text-center text-white ring-1 ring-inset ring-blue-500/20">
                      {row.sofia}
                    </td>
                    <td className="px-6 py-3.5 text-center text-slate-400">{row.human}</td>
                    <td className="px-6 py-3.5 text-center text-slate-400">{row.basic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Preguntas frecuentes
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-col gap-3"
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={fadeUp}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-white/5"
                  aria-expanded={openFaq === index}
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  <ChevronDown
                    className={`ml-4 h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="border-t border-white/10 px-6 py-5">
                    <p className="text-sm leading-relaxed text-slate-400">{faq.answer}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precios" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
              Planes simples y transparentes
            </h2>
            <p className="text-slate-400">14 días completamente gratis · Sin tarjeta</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {pricingTiers.map((tier) => (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                  tier.highlight
                    ? 'cta-glow -translate-y-2 border-blue-500/50 bg-blue-600/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="mb-1 text-lg font-bold text-white">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-bold ${
                        tier.period
                          ? 'text-3xl text-white'
                          : 'text-xl text-slate-300'
                      }`}
                    >
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-slate-400">{tier.period}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {tier.description}
                  </p>
                </div>

                <ul className="mb-6 flex flex-col gap-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </li>
                  ))}
                  {tier.notIncluded && tier.notIncluded.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 opacity-50">
                      <span className="mt-0.5 h-4 w-4 flex-shrink-0 text-center text-xs text-slate-500">✕</span>
                      <span className="text-sm text-slate-500">{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contacto"
                  onClick={() => trackEvent(
                    tier.name === 'Enterprise' ? 'cta_pricing_enterprise' : 'cta_pricing_start',
                    { label: tier.name }
                  )}
                  className={`mt-auto block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                    tier.highlight
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'border border-white/20 text-slate-300 hover:border-blue-500/50 hover:text-white'
                  }`}
                >
                  {tier.name === 'Enterprise' ? 'Contactar ventas' : 'Empezar gratis'}
                </a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TRIAL CTA ── */}
      <section id="contacto" className="px-4 py-24 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-600/20 to-blue-900/10 px-8 py-16 backdrop-blur-sm">
            {/* Background glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[80px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Empieza tu prueba gratuita de 14 días
              </h2>
              <p className="text-slate-400">
                Sin tarjeta de crédito · Sin compromisos · Configura en 48h
              </p>
              <a
                href="https://wa.me/51992764457?text=Hola%2C%20quiero%20ver%20c%C3%B3mo%20funciona%20SofIA"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('cta_footer_demo', { label: 'footer_hablar_sofia' })}
                className="cta-glow rounded-xl bg-blue-600 px-10 py-4 text-base font-bold text-white transition-all hover:bg-blue-500"
              >
                Hablar con Sofía ahora →
              </a>
              <p className="text-sm font-medium text-blue-300">
                ⚡ Solo para las primeras 30 clínicas — quedan 23 lugares disponibles
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Left: brand */}
            <div className="flex flex-col gap-4">
              <div>
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
                  SofIA
                </span>
                <span className="ml-2 text-sm text-slate-400">by Red Soluciones TI</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-500">
                Recepcionista IA para clínicas dentales en LATAM. Disponible 24/7 por WhatsApp.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://www.instagram.com/redsolucionesti/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-blue-500/40 hover:text-blue-400"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61577530556670"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-blue-500/40 hover:text-blue-400"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Middle: links */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="mb-4 text-sm font-semibold text-white">Producto</h4>
                <ul className="flex flex-col gap-2.5">
                  {[
                    { label: 'Características', href: '#caracteristicas' },
                    { label: 'Precios', href: '#precios' },
                    { label: 'FAQ', href: '#faq' },
                    { label: 'Clínicas', href: '#comparativa' },
                  ].map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-4 text-sm font-semibold text-white">Soporte</h4>
                <ul className="flex flex-col gap-2.5">
                  <li>
                    <a
                      href="https://wa.me/51905858566"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                    >
                      Hablar con ventas
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:info@redsolucionesti.com"
                      className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                    >
                      info@redsolucionesti.com
                    </a>
                  </li>
                  <li>
                    <a
                      href="/admin/login"
                      className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                    >
                      Acceso clínicas
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: legal */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Legal</h4>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <a
                    href="/privacidad"
                    className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                  >
                    Política de privacidad
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@redsolucionesti.com"
                    className="text-sm text-slate-400 transition-colors hover:text-slate-200"
                  >
                    info@redsolucionesti.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-white/5 pt-8">
            <p className="text-center text-sm text-slate-500">
              © 2026 Red Soluciones TI. Todos los derechos reservados. | SofIA by Red Soluciones TI
            </p>
          </div>
        </div>
      </footer>

      {/* ── ChatWidget — abre con los CTAs "Hablar con Sofía" ── */}
      <ChatWidget
        initialMsg="Hola, me interesa probar SofIA en mi clínica 😊"
        trigger={chatTrigger}
      />
    </div>
  );
}

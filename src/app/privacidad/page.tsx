import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — SofIA by Red Soluciones TI',
  description: 'Cómo recopilamos, usamos y protegemos los datos de nuestros usuarios y sus pacientes.',
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-slate-300">
      {/* Navbar mínimo */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-6 flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold text-transparent">
              SofIA
            </span>
            <span className="text-sm text-slate-500">by Red Soluciones TI</span>
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-3">Política de Privacidad</h1>
          <p className="text-sm text-slate-500">Última actualización: 22 de marzo de 2026</p>
        </div>

        <div className="flex flex-col gap-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">1. Quiénes somos</h2>
            <p>
              <strong className="text-slate-200">Red Soluciones TI</strong> es el titular y operador de{' '}
              <strong className="text-slate-200">SofIA</strong>, una plataforma de asistente conversacional
              basada en inteligencia artificial, diseñada para la gestión de citas y atención de pacientes
              en clínicas dentales y médicas.
            </p>
            <p className="mt-3">
              Para consultas relacionadas con esta política escríbenos a{' '}
              <a href="mailto:info@redsolucionesti.com" className="text-blue-400 hover:underline">
                info@redsolucionesti.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">2. Datos que recopilamos</h2>
            <p className="mb-3">Recopilamos dos tipos de datos:</p>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-slate-200 mb-2">Datos de clínicas (nuestros clientes)</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Nombre del negocio y datos de facturación</li>
                  <li>Correo electrónico y número de WhatsApp Business</li>
                  <li>Horarios de atención, lista de servicios y precios configurados</li>
                  <li>Métricas de uso de la plataforma</li>
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-slate-200 mb-2">Datos de pacientes (usuarios finales de las clínicas)</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Nombre y número de teléfono (WhatsApp)</li>
                  <li>Fecha y tipo de cita solicitada</li>
                  <li>Historial de conversaciones con SofIA</li>
                  <li>Datos clínicos únicamente si la clínica los ingresa en la plataforma</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">3. Cómo usamos los datos</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>Prestar el servicio de asistente conversacional y agendamiento automático</li>
              <li>Enviar recordatorios de citas a los pacientes</li>
              <li>Generar reportes y métricas para las clínicas</li>
              <li>Mejorar la precisión del modelo de IA (solo con datos anonimizados)</li>
              <li>Cumplir obligaciones legales y fiscales</li>
            </ul>
            <p className="mt-3">
              <strong className="text-slate-200">No vendemos ni cedemos datos personales a terceros</strong>{' '}
              con fines comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">4. Proveedores y terceros</h2>
            <p className="mb-3">Para operar el servicio trabajamos con los siguientes proveedores:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-left">
                    <th className="pb-2 pr-6 font-medium">Proveedor</th>
                    <th className="pb-2 pr-6 font-medium">Función</th>
                    <th className="pb-2 font-medium">Política</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: 'Meta (WhatsApp Business API)', role: 'Canal de mensajería', url: 'https://www.whatsapp.com/legal/privacy-policy' },
                    { name: 'OpenAI', role: 'Procesamiento de lenguaje natural', url: 'https://openai.com/policies/privacy-policy' },
                    { name: 'Supabase', role: 'Base de datos y autenticación', url: 'https://supabase.com/privacy' },
                    { name: 'Vercel', role: 'Alojamiento de la plataforma web', url: 'https://vercel.com/legal/privacy-policy' },
                    { name: 'Chatwoot', role: 'Bandeja de conversaciones', url: 'https://www.chatwoot.com/privacy-policy' },
                  ].map((p) => (
                    <tr key={p.name}>
                      <td className="py-2.5 pr-6 text-slate-300">{p.name}</td>
                      <td className="py-2.5 pr-6 text-slate-400">{p.role}</td>
                      <td className="py-2.5">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          Ver política
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">5. Almacenamiento y seguridad</h2>
            <p>
              Los datos se almacenan con cifrado en reposo (AES-256) y en tránsito (TLS 1.3).
              El acceso está restringido por roles y autenticación para el equipo interno.
            </p>
            <p className="mt-3">
              Los datos de conversación se conservan por{' '}
              <strong className="text-slate-200">24 meses</strong> desde la última interacción,
              salvo que la clínica solicite su eliminación antes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">6. Derechos de los usuarios</h2>
            <p className="mb-3">
              Tanto las clínicas como los pacientes pueden ejercer los siguientes derechos enviando un correo a{' '}
              <a href="mailto:info@redsolucionesti.com" className="text-blue-400 hover:underline">
                info@redsolucionesti.com
              </a>
              :
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><strong className="text-slate-300">Acceso:</strong> solicitar copia de sus datos personales</li>
              <li><strong className="text-slate-300">Rectificación:</strong> corregir datos inexactos</li>
              <li><strong className="text-slate-300">Eliminación:</strong> solicitar la eliminación de sus datos</li>
              <li><strong className="text-slate-300">Portabilidad:</strong> recibir sus datos en formato legible</li>
              <li><strong className="text-slate-300">Oposición:</strong> oponerse al procesamiento para fines específicos</li>
            </ul>
            <p className="mt-3">
              Responderemos en un plazo máximo de <strong className="text-slate-200">15 días hábiles</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">7. Cookies</h2>
            <p>
              La plataforma utiliza cookies técnicas estrictamente necesarias para la autenticación de
              sesión y el correcto funcionamiento del panel de administración. No utilizamos cookies de
              seguimiento publicitario de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">8. Menores de edad</h2>
            <p>
              SofIA está dirigida a profesionales de la salud y negocios. No recopilamos intencionalmente
              datos de menores de 14 años. Si detectamos que se han recopilado dichos datos sin
              consentimiento parental, los eliminaremos de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">9. Cambios a esta política</h2>
            <p>
              Notificaremos cualquier cambio material por correo electrónico a las clínicas registradas
              con al menos <strong className="text-slate-200">15 días de anticipación</strong>. El uso
              continuado del servicio tras esa fecha implica la aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">10. Contacto</h2>
            <p>Para cualquier consulta sobre privacidad o para ejercer tus derechos:</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-1">
              <p className="text-slate-200 font-medium">Red Soluciones TI</p>
              <p className="text-slate-400">
                Email:{' '}
                <a href="mailto:info@redsolucionesti.com" className="text-blue-400 hover:underline">
                  info@redsolucionesti.com
                </a>
              </p>
              <p className="text-slate-400">
                WhatsApp:{' '}
                <a href="https://wa.me/51905858566" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  +51 905 858 566
                </a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-16 border-t border-white/5 pt-8 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← Volver a sofia.redsolucionesti.com
          </Link>
        </div>
      </main>
    </div>
  );
}

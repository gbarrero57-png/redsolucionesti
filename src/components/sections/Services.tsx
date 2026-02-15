'use client';
import { motion } from 'framer-motion';
import { Bot, PhoneCall, Link as LinkIcon, Workflow, Lightbulb } from 'lucide-react';

const services = [
    {
        icon: <Bot className="w-8 h-8" />,
        title: 'Automatización con IA',
        description: 'Delegación inteligente de tareas repetitivas para máxima eficiencia operativa.',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    },
    {
        icon: <PhoneCall className="w-8 h-8" />,
        title: 'Soporte Técnico 24/7',
        description: 'Asistencia Nivel 1 siempre disponible mediante agentes de IA especializados.',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10'
    },
    {
        icon: <LinkIcon className="w-8 h-8" />,
        title: 'Integración de Plataformas',
        description: 'Conectamos tus CRMs, ERPs y herramientas en un flujo de datos unificado.',
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10'
    },
    {
        icon: <Workflow className="w-8 h-8" />,
        title: 'Flujos y Workflows',
        description: 'Diseño de lógica avanzada con n8n y Make para automatizar tu negocio.',
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
    },
    {
        icon: <Lightbulb className="w-8 h-8" />,
        title: 'Consultoría Estratégica',
        description: 'Guía profesional para migrar tus procesos manuales hacia la era digital.',
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10'
    },
];

const Services = () => {
    return (
        <section id="servicios" className="py-24 bg-white/[0.02] border-y border-white/5">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-5xl font-black text-white mb-6"
                    >
                        Servicios para la Era Digital
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-xl text-slate-400 max-w-3xl mx-auto"
                    >
                        Tecnología de punta con atención personalizada. Maximizamos el potencial de tu negocio local.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-3xl bg-ti-dark-lighter border border-white/5 hover:border-ti-blue/50 transition-all group relative overflow-hidden"
                        >
                            <div className={`p-4 rounded-2xl w-fit mb-6 ${service.bg} ${service.color} group-hover:scale-110 transition-transform duration-300`}>
                                {service.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 group-hover:text-ti-blue transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-slate-400 leading-relaxed text-sm">
                                {service.description}
                            </p>

                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                {service.icon}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;

'use client';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

const plans = [
    {
        name: 'PLAN IMPULSO',
        subtitle: 'Empieza a ahorrar tiempo desde el primer mes',
        description: 'Ideal para negocios que quieren orden y eficiencia sin complicaciones.',
        features: [
            'Recupera 10–20 horas al mes',
            'Reduce errores hasta en 70%',
            'Automatiza tareas repetitivas',
            'Soporte directo cuando lo necesites',
        ],
        highlight: false,
        cta: 'Quiero empezar a ahorrar tiempo'
    },
    {
        name: 'PLAN CRECIMIENTO',
        subtitle: 'Escala sin contratar más personal',
        description: 'Tu negocio funciona aunque no estés encima todo el día.',
        features: [
            'Ahorra 30–50 horas mensuales',
            'Reduce costos operativos hasta 25%',
            'Automatiza ventas y seguimiento de clientes',
            'Optimización continua mensual',
        ],
        highlight: true,
        cta: 'Quiero escalar sin contratar más personal'
    },
    {
        name: 'PLAN LIBERTAD TOTAL',
        subtitle: 'Tu negocio en piloto automático',
        description: 'Más rentabilidad y más libertad para el dueño.',
        features: [
            'Procesos automatizados de punta a punta',
            'Equipo dedicado optimizando tu operación',
            'Soporte prioritario 24/7',
            'Estrategia personalizada de crecimiento',
        ],
        highlight: false,
        cta: 'Quiero mi negocio en piloto automático'
    }
];

const Pricing = () => {
    return (
        <section id="planes" className="py-24 bg-ti-dark relative overflow-hidden">
            {/* Background Gradient Orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ti-blue/10 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] -z-10 -translate-x-1/2 translate-y-1/2"></div>

            <div className="container mx-auto px-6 max-w-7xl">
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
                    >
                        Planes que te devuelven tiempo <br className="hidden md:block" />
                        <span className="bg-gradient-to-r from-ti-blue to-purple-400 bg-clip-text text-transparent">y aumentan tu rentabilidad</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-xl text-slate-400 max-w-4xl mx-auto leading-relaxed"
                    >
                        Nuestros clientes recuperan entre <span className="text-white font-bold">20 y 50 horas al mes</span> y reducen hasta un <span className="text-ti-blue font-bold">25% sus costos operativos</span> en los primeros 90 días.
                    </motion.p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-stretch pt-8">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className={`flex flex-col p-10 rounded-[2.5rem] border transition-all duration-500 ${plan.highlight
                                ? 'bg-ti-blue/[0.07] border-ti-blue shadow-[0_0_50px_rgba(59,130,246,0.15)] relative lg:-translate-y-4 z-10'
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ti-blue text-white text-[11px] uppercase font-black px-5 py-2 rounded-full tracking-widest shadow-lg z-20">
                                    Recomendado
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className={`text-sm font-black tracking-[0.2em] mb-4 ${plan.highlight ? 'text-ti-blue' : 'text-slate-500'}`}>
                                    {plan.name}
                                </h3>
                                <div className="text-2xl font-bold text-white leading-tight mb-4">
                                    {plan.subtitle}
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {plan.description}
                                </p>
                            </div>

                            <div className="flex-grow">
                                <ul className="space-y-5 mb-12">
                                    {plan.features.map((feature, j) => {
                                        // Detect numbers/percentages to highlight them
                                        const parts = feature.split(/(\d+(?:–\d+)?%?|\d+%)/g);
                                        return (
                                            <li key={j} className="flex items-start space-x-3 group">
                                                <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${plan.highlight ? 'bg-ti-blue/20 text-ti-blue' : 'bg-white/10 text-slate-400'}`}>
                                                    <Check className="w-3 h-3" strokeWidth={3} />
                                                </div>
                                                <span className="text-slate-300 text-sm leading-snug">
                                                    {parts.map((part, k) => (
                                                        /(\d+(?:–\d+)?%?|\d+%)/.test(part) ? (
                                                            <strong key={k} className="text-white font-black">{part}</strong>
                                                        ) : part
                                                    ))}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <a
                                href="#contacto"
                                className={`group flex flex-col items-center justify-center text-center space-y-2 w-full py-6 px-6 rounded-2xl font-black text-sm cta-glow transition-all active:scale-[0.98] ${plan.highlight
                                    ? 'bg-ti-blue text-white shadow-ti-blue/20'
                                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                                    }`}
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    <span>{plan.cta}</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </a>
                        </motion.div>
                    ))}
                </div>

                {/* Trust indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-16 text-center"
                >
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                        Todos nuestros planes incluyen garantía de satisfacción y soporte prioritario
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default Pricing;

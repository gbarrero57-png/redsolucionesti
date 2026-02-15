'use client';
import { motion } from 'framer-motion';
import { Zap, DollarSign, Target, Clock } from 'lucide-react';
import ScrollImageSequence from '../ui/ScrollImageSequence';

const benefits = [
    {
        icon: <Zap className="w-6 h-6" />,
        title: 'Atención 24/7',
        desc: 'Soporte inteligente que nunca duerme.'
    },
    {
        icon: <DollarSign className="w-6 h-6" />,
        title: 'Menos Gastos',
        desc: 'Reduce costos operativos con IA.'
    },
    {
        icon: <Target className="w-6 h-6" />,
        title: 'Cero Errores',
        desc: 'Precisión garantizada en cada tarea.'
    },
    {
        icon: <Clock className="w-6 h-6" />,
        title: 'Más Tiempo',
        desc: 'Enfócate en expandir tu negocio.'
    }
];



const ValueProp = () => {
    return (
        <>
            {/* Animated Banner */}
            <section className="py-12 bg-animated-gradient animate-[gradient-shift_10s_ease_infinite_alternate] overflow-hidden">
                <div className="container mx-auto px-6 text-center max-w-7xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="space-y-2"
                    >
                        <p className="text-white/80 font-medium uppercase tracking-widest text-sm">
                            Socio Estratégico en Lima
                        </p>
                        <h3 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                            LA EFICIENCIA YA NO ES UN LUJO, ES UNA AUTOMATIZACIÓN.
                        </h3>
                    </motion.div>
                </div>
            </section>

            {/* Value Proposition */}
            <section id="beneficios" className="py-24 overflow-hidden relative">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid lg:grid-cols-4 gap-8">
                        {benefits.map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors"
                            >
                                <div className="text-ti-blue mb-6">{item.icon}</div>
                                <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                                <p className="text-slate-400 text-sm">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Secondary Visual Section: MAX CLARITY & SHARPNESS */}
                    <div id="valor" className="mt-40 grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8 order-2 lg:order-1"
                        >
                            <h3 className="text-5xl md:text-7xl font-black text-white leading-[1.05]">
                                La IA trabaja mientras <br />
                                <span className="text-ti-blue">tú descansas</span>
                            </h3>
                            <p className="text-xl lg:text-2xl text-slate-400 leading-relaxed max-w-xl opacity-95">
                                Imagina un equipo que no pide vacaciones ni comete errores. Nuestras automatizaciones gestionan leads, resuelven consultas y procesan datos 24/7.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.2 }}
                            viewport={{ margin: "-100px" }}
                            className="relative h-[650px] sm:h-[750px] lg:h-[850px] order-1 lg:order-2 z-10 w-full max-w-2xl mx-auto"
                        >
                            {/* Visual Container - CRYSTAL CLEAR FOCUS with Edge Softening Mask */}
                            <div className="w-full h-full relative rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.4)] bg-black">
                                <div className="absolute inset-0 z-10 pointer-events-none" style={{ maskImage: 'radial-gradient(circle, black 60%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)' }}>
                                    <ScrollImageSequence
                                        directory="/videoLandingpage"
                                        frameCount={30}
                                        fit="cover"
                                    />
                                </div>

                                {/* PREMIUM EDGE BLENDING - REPLICATED FROM HERO */}
                                <div className="absolute inset-0 z-20 pointer-events-none">
                                    <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                    <div className="absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-black to-transparent"></div>
                                    <div className="absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l from-black to-transparent"></div>
                                    <div className="absolute inset-x-0 top-0 h-1/6 bg-gradient-to-b from-black/40 to-transparent"></div>
                                </div>

                                {/* High-Contrast Edge Highlight */}
                                <div className="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-[3rem] pointer-events-none z-30"></div>
                            </div>

                            {/* Background depth without blurring the subject */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-ti-blue/5 blur-[180px] -z-10 rounded-full"></div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default ValueProp;

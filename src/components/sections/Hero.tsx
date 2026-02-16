'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ScrollImageSequence from '../ui/ScrollImageSequence';

const Hero = () => {
    return (
        <section className="relative min-h-[95vh] flex items-center pt-28 pb-16 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-hero-gradient opacity-50"></div>
                <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-ti-blue/15 blur-[140px] rounded-full"></div>
                <div className="absolute bottom-[5%] right-[-5%] w-[35%] h-[35%] bg-purple-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-4">
                    {/* TEXT CONTENT - Original & Intact */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="w-full lg:w-[42%] flex flex-col space-y-9 z-20"
                    >
                        <div className="inline-flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full w-fit">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ti-blue opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-ti-blue"></span>
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                                Soluciones Digitales | Soporte & Automatización con IA
                            </span>
                        </div>

                        <h1 className="text-6xl sm:text-7xl xl:text-8xl font-black leading-[1] tracking-tight text-white drop-shadow-2xl">
                            <span className="bg-gradient-to-r from-ti-blue via-ti-blue-light to-purple-400 bg-clip-text text-transparent">
                                Inteligencia Artificial
                            </span>
                            <br />
                            para tu Negocio
                        </h1>

                        <p className="text-xl sm:text-2xl text-slate-300 font-medium max-w-xl leading-relaxed opacity-90">
                            Automatizamos procesos complejos para que ganes tiempo, reduzcas errores y escales sin límites.
                        </p>

                        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 pt-4">
                            <a
                                href="#contacto"
                                className="bg-ti-blue hover:bg-ti-blue-dark text-white font-bold py-4 px-10 rounded-2xl text-lg cta-glow text-center transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-ti-blue/25"
                            >
                                Agenda tu Demo Gratis
                            </a>
                            <a
                                href="https://wa.me/51905858566"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold py-4 px-10 rounded-2xl text-lg text-center transition-all flex items-center justify-center space-x-2"
                            >
                                <span>Hablar por WhatsApp</span>
                            </a>
                        </div>
                    </motion.div>

                    {/* HERO IMAGE: MASSIVE, PROTAGONIST, NO BLUR */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ duration: 1.4, delay: 0.2 }}
                        className="w-full lg:w-[60%] relative h-[600px] sm:h-[800px] lg:h-[950px] z-10 lg:-mr-[8%]"
                    >
                        <div className="w-full h-full relative">
                            {/* Sequence Container - Clear Background with Edge Softening Mask */}
                            <div className="absolute inset-0 z-10 pointer-events-none" style={{ maskImage: 'radial-gradient(circle, black 65%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle, black 65%, transparent 100%)' }}>
                                <ScrollImageSequence
                                    directory="/humanoideLandingpage"
                                    frameCount={20}
                                    fit="cover"
                                />
                            </div>

                            {/* PREMIUM EDGE BLENDING */}
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                                <div className="absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-[#050505] to-transparent"></div>
                                <div className="absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-[#050505] to-transparent"></div>
                                <div className="absolute inset-x-0 top-0 h-1/6 bg-gradient-to-b from-[#050505]/40 to-transparent"></div>
                            </div>
                        </div>

                        {/* RESTORED FLOATING STATUS TOKEN - Exact text from original */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute bottom-[20%] left-[-5%] bg-black/80 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl z-30 hidden sm:flex items-center space-x-4 border-l-ti-blue border-l-4"
                        >
                            <div className="bg-ti-blue/20 p-2.5 rounded-xl text-ti-blue font-black text-xs">24/7</div>
                            <div>
                                <div className="text-sm font-black text-white">Soporte IA</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Activo ahora</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Hero;

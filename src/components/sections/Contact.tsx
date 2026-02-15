'use client';

import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import AIChat from '../ui/AIChat';

const Contact = () => {
  return (
    <section id="contacto" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background illumination */}
      <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-ti-blue/5 blur-[150px] -z-10 rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-[30%] h-[50%] bg-purple-500/5 blur-[120px] -z-10 rounded-full"></div>

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Column: Content */}
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-ti-blue/10 border border-ti-blue/20 px-4 py-2 rounded-full">
                <Bot className="w-5 h-5 text-ti-blue" />
                <span className="text-ti-blue font-black uppercase tracking-[0.2em] text-[10px]">
                  Asistente Virtual 24/7
                </span>
              </div>

              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.05]">
                Agenda tu <br />
                <span className="bg-gradient-to-r from-ti-blue to-purple-500 bg-clip-text text-transparent">Consultoría</span>
              </h2>

              <p className="text-xl text-slate-400 leading-relaxed max-w-lg">
                Olvídate de los formularios infinitos. Habla directamente con nuestra IA y recibe una respuesta instantánea sobre cómo escalar tu negocio.
              </p>
            </div>

            {/* INTEGRACIÓN DIRECTA TEXT BLOCK REMOVED AS REQUESTED */}
          </div>

          {/* Right Column: STRUCTURED CHAT COMPONENT */}
          <div className="relative h-[650px] w-full flex items-center justify-center">
            {/* Glow behind the box */}
            <div className="absolute -inset-10 bg-ti-blue/10 rounded-full blur-[100px] -z-10 opacity-30"></div>

            {/* The Container for AIChat */}
            <div className="w-full h-full relative z-20">
              <AIChat />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;

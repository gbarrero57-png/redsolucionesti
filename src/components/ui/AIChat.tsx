'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
    role: 'user' | 'assistant' | 'error';
    content: string;
};

const AIChat = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Hola 👋 Soy el asistente de **RedSoluciones TI**. ¿En qué puedo ayudarte hoy?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (instant = false) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            });
        }
    };

    useEffect(() => {
        // Use instant scroll on first mount to avoid page jumps, then smooth
        const isInitial = messages.length === 1 && !isLoading;
        scrollToBottom(isInitial);
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const userMsg = input.trim();
        if (!userMsg || isLoading) return;

        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP error! status: ${response.status}`);
            setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (error: any) {
            console.error('[CHAT ERROR]:', error);
            setMessages((prev) => [...prev, {
                role: 'error',
                content: `Error: ${error.message}.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0a0a] rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
            {/* Minimalist Header */}
            <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-ti-blue to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-ti-blue/20">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm tracking-tight flex items-center">
                            Soporte RedSoluciones
                            <Zap className="w-3 h-3 ml-2 text-yellow-400 fill-yellow-400" />
                        </h3>
                        <div className="flex items-center space-x-1.5 leading-none mt-0.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">En Línea</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                <AnimatePresence initial={false}>
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[85%] items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${message.role === 'user'
                                    ? 'bg-ti-blue/10 border-ti-blue/30 text-ti-blue'
                                    : 'bg-white/5 border-white/10 text-slate-400'
                                    }`}>
                                    {message.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>
                                <div className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed ${message.role === 'user'
                                    ? 'bg-ti-blue text-white rounded-tr-none'
                                    : message.role === 'error'
                                        ? 'bg-red-500/10 border border-red-500/20 text-red-400 italic'
                                        : 'bg-white/[0.05] border border-white/10 text-slate-200 rounded-tl-none'
                                    } shadow-sm`}>
                                    <span dangerouslySetInnerHTML={{
                                        __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                                    }} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isLoading && (
                    <div className="flex justify-start items-center space-x-3 ml-11">
                        <div className="flex space-x-1">
                            <span className="w-1.5 h-1.5 bg-ti-blue rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-ti-blue rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-ti-blue rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white/[0.02] border-t border-white/5">
                <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu mensaje..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-sm text-white focus:outline-none focus:border-ti-blue/50 placeholder:text-slate-600 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-3.5 bg-ti-blue hover:bg-ti-blue-dark rounded-xl text-white disabled:opacity-30 disabled:grayscale transition-all"
                    >
                        <Send size={18} />
                    </button>
                </form>
                <p className="mt-3 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    Asistente RedSoluciones 24/7
                </p>
            </div>
        </div>
    );
};

export default AIChat;

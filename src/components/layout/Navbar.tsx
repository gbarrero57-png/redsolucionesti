'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Servicios', href: '#servicios' },
        { name: 'Propuesta', href: '#beneficios' },
        { name: 'IA & Valor', href: '#valor' },
        { name: 'Planes', href: '#planes' },
    ];

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
                ? 'bg-ti-dark/80 backdrop-blur-md border-b border-white/10 py-3'
                : 'bg-transparent py-5'
                }`}
        >
            <div className="container mx-auto px-6 flex justify-between items-center max-w-7xl">
                <a href="#" className="flex items-center space-x-2">
                    <span className="text-2xl font-black bg-gradient-to-r from-ti-blue to-purple-500 bg-clip-text text-transparent tracking-tight">
                        Red Soluciones TI
                    </span>
                </a>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-slate-300 hover:text-ti-blue transition-colors"
                        >
                            {link.name}
                        </a>
                    ))}
                    <a
                        href="#contacto"
                        className="bg-ti-blue hover:bg-ti-blue-dark text-white px-5 py-2.5 rounded-full font-semibold text-sm cta-glow transition-all"
                    >
                        Agenda tu Demo Gratis
                    </a>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden text-ti-blue p-2"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-ti-dark-card border-b border-white/10 overflow-hidden"
                    >
                        <div className="flex flex-col p-6 space-y-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="text-lg font-medium text-slate-300 hover:text-ti-blue transition-colors"
                                >
                                    {link.name}
                                </a>
                            ))}
                            <a
                                href="#contacto"
                                onClick={() => setIsOpen(false)}
                                className="bg-ti-blue text-white px-6 py-3 rounded-xl font-bold text-center cta-glow"
                            >
                                Agenda tu Demo Gratis
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;

import { Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-ti-dark py-20 border-t border-white/5">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-white">RedSoluciones TI</h3>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                            Automatizamos tu negocio con IA para que ganes tiempo y dinero. Sociedad estratégica en Lima Metropolitana.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-ti-blue hover:text-white transition-all"><Facebook size={20} /></a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-ti-blue hover:text-white transition-all"><Instagram size={20} /></a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-ti-blue hover:text-white transition-all"><Twitter size={20} /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Servicios</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#servicios" className="hover:text-ti-blue transition-colors">Automatización IA</a></li>
                            <li><a href="#servicios" className="hover:text-ti-blue transition-colors">Soporte 24/7</a></li>
                            <li><a href="#servicios" className="hover:text-ti-blue transition-colors">Integraciones</a></li>
                            <li><a href="#servicios" className="hover:text-ti-blue transition-colors">Consultoría Digital</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Compañía</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#beneficios" className="hover:text-ti-blue transition-colors">Propuesta de Valor</a></li>
                            <li><a href="#valor" className="hover:text-ti-blue transition-colors">IA & Visión</a></li>
                            <li><a href="#planes" className="hover:text-ti-blue transition-colors">Nuestros Planes</a></li>
                            <li><a href="#contacto" className="hover:text-ti-blue transition-colors">Contactar</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" className="hover:text-ti-blue transition-colors">Política de Privacidad</a></li>
                            <li><a href="#" className="hover:text-ti-blue transition-colors">Términos del Servicio</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-slate-600 text-xs gap-4">
                    <p>© 2025 RedSoluciones TI. Todos los derechos reservados.</p>
                    <div className="flex space-x-6">
                        <span>Diseñado con ❤️ para la eficiencia</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

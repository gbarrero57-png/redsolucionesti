import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RedSoluciones TI | Automatización Inteligente para Empresas",
  description: "Especialistas en automatización de procesos, soporte técnico 24/7 e integración de IA para empresas modernas. Soluciones digitales que transforman tu negocio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/favicon-192.png" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {children}
        {/* Force removal of common floating widget toggles and dev overlays */}
        <style dangerouslySetInnerHTML={{
          __html: `
          #nextjs-portal, 
          [id*="nextjs-portal"], 
          .nextjs-toast-errors-parent,
          nextjs-portal {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
          .chat-toggle, .n8n-chat-toggle { display: none !important; }
        `}} />
      </body>
    </html>
  );
}

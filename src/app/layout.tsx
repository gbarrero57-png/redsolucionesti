import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RedSoluciones TI | Automatización con IA en Lima",
  description: "Especialistas en automatización de procesos, soporte técnico 24/7 e integración de IA para negocios en Lima Metropolitana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
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

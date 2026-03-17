import type { NextConfig } from "next";

const securityHeaders = [
  // Evita que el browser interprete archivos con tipo MIME diferente al declarado
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Protege contra clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Protege contra XSS en browsers antiguos
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Solo permite HTTPS durante 1 año (HSTS)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Controla información de referrer enviada a terceros
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restringe funcionalidades del browser no necesarias
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy: solo permite recursos del mismo origen + Supabase
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // unsafe-eval requerido por Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://inhyrrjidhzrbqecnptn.supabase.co wss://inhyrrjidhzrbqecnptn.supabase.co https://workflows.n8n.redsolucionesti.com https://chat.redsolucionesti.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // v2 — forces chunk hash regeneration after cache invalidation fix (2026-03-17)
  // Packages that use native Node.js modules must NOT be bundled by webpack/turbopack.
  // @react-pdf/renderer uses canvas (native binary), nodemailer uses net/tls.
  serverExternalPackages: ['@react-pdf/renderer', 'nodemailer', 'canvas'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

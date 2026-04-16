import type { NextConfig } from "next";

const IS_PROD = process.env.NODE_ENV === 'production';
const APP_ORIGIN = 'https://sofia.redsolucionesti.com';

const securityHeaders = [
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'X-Frame-Options',         value: 'DENY' },
  // HSTS: 2 years + preload (meets hstspreload.org requirements)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Remove unsafe-eval in production (only needed for Next.js HMR in dev)
      IS_PROD
        ? "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "frame-src https://challenges.cloudflare.com",
      "connect-src 'self' https://inhyrrjidhzrbqecnptn.supabase.co wss://inhyrrjidhzrbqecnptn.supabase.co https://workflows.n8n.redsolucionesti.com https://chat.redsolucionesti.com https://api.brevo.com https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

// Restrict CORS on API routes to own origin only
const corsHeaders = [
  { key: 'Access-Control-Allow-Origin',      value: IS_PROD ? APP_ORIGIN : '*' },
  { key: 'Access-Control-Allow-Methods',     value: 'GET, POST, PATCH, DELETE, OPTIONS' },
  { key: 'Access-Control-Allow-Headers',     value: 'Content-Type, Authorization' },
  { key: 'Access-Control-Allow-Credentials', value: 'true' },
];

const nextConfig: NextConfig = {
  // v2 — forces chunk hash regeneration after cache invalidation fix (2026-03-17)
  // Packages that use native Node.js modules must NOT be bundled by webpack/turbopack.
  // @react-pdf/renderer uses canvas (native binary), nodemailer uses net/tls.
  serverExternalPackages: ['@react-pdf/renderer', 'nodemailer', 'canvas'],

  async headers() {
    return [
      { source: '/(.*)',      headers: securityHeaders },
      { source: '/api/(.*)', headers: corsHeaders },
    ];
  },
};

export default nextConfig;

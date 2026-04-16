/**
 * Unified analytics tracking for GA4 + Meta Pixel.
 * Fires gracefully if scripts haven't loaded yet.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// ── GA4 event names ───────────────────────────────────────────────────────────
export type TrackAction =
  | 'cta_header_demo'       // top nav "Ver demo" button
  | 'cta_hero_demo'         // hero section primary CTA
  | 'cta_pricing_start'     // pricing card "Empezar gratis"
  | 'cta_pricing_enterprise'// pricing card "Contactar ventas"
  | 'cta_footer_demo'       // bottom section CTA
  | 'cta_whatsapp_support'  // footer WhatsApp support link
  | 'view_pricing';         // user scrolls/clicks pricing section

interface TrackParams {
  label?: string;
  value?: number;
  [key: string]: unknown;
}

// ── Meta Pixel event mapping ──────────────────────────────────────────────────
const PIXEL_EVENT: Record<TrackAction, string> = {
  cta_header_demo:        'Contact',
  cta_hero_demo:          'Lead',
  cta_pricing_start:      'Lead',
  cta_pricing_enterprise: 'Contact',
  cta_footer_demo:        'Lead',
  cta_whatsapp_support:   'Contact',
  view_pricing:           'ViewContent',
};

// ── Main tracking function ────────────────────────────────────────────────────
export function trackEvent(action: TrackAction, params: TrackParams = {}) {
  // GA4
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: 'engagement',
      event_label: params.label ?? action,
      value: params.value,
      ...params,
    });
  }

  // Meta Pixel
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    const pixelEvent = PIXEL_EVENT[action] ?? 'CustomEvent';
    window.fbq('track', pixelEvent, { content_name: action, ...params });
  }
}

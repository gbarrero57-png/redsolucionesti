// Type declarations for Cloudflare Turnstile global
interface TurnstileWidgetOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

interface TurnstileAPI {
  render(container: HTMLElement | string, options: TurnstileWidgetOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
  getResponse(widgetId: string): string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

export {};

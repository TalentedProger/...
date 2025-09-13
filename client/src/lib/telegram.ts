declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: any;
        ready(): void;
        expand(): void;
        close(): void;
        MainButton: {
          text: string;
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
        };
      };
    };
  }
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  ready(): void;
  expand(): void;
  close(): void;
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function getInitData(): string | null {
  const webApp = getTelegramWebApp();
  if (webApp && webApp.initData) {
    return webApp.initData;
  }
  
  // Fallback for development
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('initData');
  }
  
  return null;
}

export function initializeTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.ready();
    webApp.expand();
  }
}

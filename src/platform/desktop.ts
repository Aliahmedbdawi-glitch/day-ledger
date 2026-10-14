/** Bridge exposed by electron/preload.cjs when running as the installed desktop app. */
export interface DesktopSettings {
  closeToTray: boolean;
  openAtLogin: boolean;
}

export interface DesktopBridge {
  isDesktop: true;
  notify: (payload: { title: string; body: string; date?: string; startTime?: string }) => void;
  onOpenSlot: (callback: (slot: { date: string; startTime: string }) => void) => () => void;
  getSettings: () => Promise<DesktopSettings>;
  setSettings: (patch: Partial<DesktopSettings>) => Promise<DesktopSettings>;
}

declare global {
  interface Window {
    dayLedger?: DesktopBridge;
  }
}

/** Undefined in a plain browser. */
export const desktop: DesktopBridge | undefined =
  typeof window === 'undefined' ? undefined : window.dayLedger;

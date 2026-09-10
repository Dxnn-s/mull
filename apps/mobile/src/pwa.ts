import { Platform } from 'react-native';

/** True when running from the home screen rather than a browser tab. */
export function isInstalled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

export function isIOSWeb(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Registers the offline shell. Safe to call on every platform; no-ops off web. */
export function registerServiceWorker(): void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not fatal: without it the app still runs, it just needs the network to open.
    });
  });
}

import { registerSW } from 'virtual:pwa-register';

/** Registra o service worker (só em produção). O aviso de atualização entra na Fase 4. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  registerSW({});
}

import { registerSW } from 'virtual:pwa-register';
import { setUpdateAvailable } from './update';

/**
 * Registra o service worker (só em produção). `registerType: "prompt"`: a nova versão só assume
 * quando o usuário toca em "Atualizar" (o botão só aparece fora de uma sessão de treino).
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    onNeedRefresh() {
      setUpdateAvailable(() => void updateSW(true));
    },
  });
}

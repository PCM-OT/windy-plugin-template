import { useEffect } from 'react';

/** Mantém a tela acesa enquanto `active`; reaplica ao voltar para o app. Sem suporte = não faz nada. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    const acquire = async () => {
      if (stopped || document.visibilityState !== 'visible' || sentinel) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (stopped) return void s.release();
        sentinel = s;
        s.addEventListener('release', () => {
          if (sentinel === s) sentinel = null;
        });
      } catch {
        /* negado (economia de bateria etc.): o treino segue normal */
      }
    };
    const onVisible = () => void acquire();
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
    };
  }, [active]);
}

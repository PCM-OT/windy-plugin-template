import { useEffect, useState } from 'react';

const LOCK = 'ficha-abcde-app';

/**
 * Uma aba só escreve: a primeira aba segura um Web Lock. As demais ficam em modo leitura e
 * assumem sozinhas quando a primeira fecha. Sem Web Locks, todas escrevem (comportamento antigo).
 * Retorna: true = pode escrever · false = leitura · null = verificando.
 */
export function useLeader(): boolean | null {
  const [leader, setLeader] = useState<boolean | null>(() =>
    typeof navigator !== 'undefined' && navigator.locks ? null : true,
  );

  useEffect(() => {
    const locks = navigator.locks;
    if (!locks) return;
    const ctrl = new AbortController();
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    const hold = () => {
      setLeader(true);
      return held;
    };

    void locks
      .request(LOCK, { ifAvailable: true }, (lock) => {
        if (lock) return hold();
        setLeader(false);
        // fila: quando a aba líder fechar, esta assume
        return locks.request(LOCK, { signal: ctrl.signal }, hold).catch(() => undefined);
      })
      .catch(() => setLeader(true)); // falha inesperada: melhor permitir escrita do que travar o app

    return () => {
      ctrl.abort();
      release();
    };
  }, []);

  return leader;
}

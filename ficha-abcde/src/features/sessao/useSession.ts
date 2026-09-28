import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveSession } from '../../domain/schemas';
import type { Repo } from '../../data/repo';
import { createSaver } from './saver';

/**
 * Estado da sessão em memória + gravação no IndexedDB a cada alteração.
 * `update` é síncrono (a tela responde na hora); a gravação corre em segundo plano com retry.
 */
export function useSession(initial: ActiveSession, repo: Repo) {
  const [session, setSession] = useState(initial);
  const [saveError, setSaveError] = useState<string | null>(null);
  const ref = useRef(session);
  const saver = useMemo(
    () => createSaver((s: ActiveSession) => repo.saveActive(s), setSaveError),
    [repo],
  );

  useEffect(() => () => saver.close(), [saver]);

  const update = useCallback(
    (fn: (s: ActiveSession) => ActiveSession) => {
      const next = fn(ref.current);
      if (next === ref.current) return;
      ref.current = next;
      setSession(next);
      saver.schedule(next);
    },
    [saver],
  );

  return { session, ref, update, saveError, closeSaver: saver.close };
}

/**
 * Dispara `onTick(agora)` a cada 250 ms e sempre que o app volta a ficar visível.
 * O intervalo só serve de gatilho: todo tempo é recalculado a partir de timestamps absolutos.
 */
export function useTicker(clock: () => number, onTick: (now: number) => void, ms = 250) {
  const cb = useRef(onTick);
  useEffect(() => {
    cb.current = onTick;
  });
  useEffect(() => {
    const run = () => cb.current(clock());
    const id = setInterval(run, ms);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    window.addEventListener('pageshow', run);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
      window.removeEventListener('pageshow', run);
    };
  }, [clock, ms]);
}

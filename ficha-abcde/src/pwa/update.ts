import { useSyncExternalStore } from 'react';

/** Estado mínimo da atualização do service worker (sem depender do módulo virtual, testável). */
let apply: (() => void) | null = null;
const listeners = new Set<() => void>();

export function setUpdateAvailable(fn: (() => void) | null) {
  apply = fn;
  listeners.forEach((l) => l());
}

export function useUpdateAvailable(): (() => void) | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => apply,
  );
}

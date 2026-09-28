export type SyncState = 'local' | 'syncing' | 'synced' | 'offline';

export interface SyncStatus {
  state: SyncState;
  pending: number;
  lastSyncAt: number | null;
  error: string | null;
}

export const LOCAL_STATUS: SyncStatus = {
  state: 'local',
  pending: 0,
  lastSyncAt: null,
  error: null,
};

interface Opts {
  run: () => Promise<{ applied: number }>;
  pending: () => Promise<number>;
  onStatus: (s: SyncStatus) => void;
  onApplied?: () => void;
  isOnline?: () => boolean;
  now?: () => number;
  baseMs?: number;
  maxMs?: number;
  periodMs?: number;
  debounceMs?: number;
}

/**
 * Agenda a sincronização: ao iniciar, ao voltar a rede (`online`), depois de alterações (com atraso),
 * periodicamente e com backoff exponencial (2 s, 4 s, 8 s … até 5 min) após falhas.
 */
export function createScheduler(o: Opts) {
  const base = o.baseMs ?? 2000;
  const max = o.maxMs ?? 300_000;
  const isOnline = o.isOnline ?? (() => navigator.onLine !== false);
  const now = o.now ?? Date.now;
  let running = false;
  let again = false;
  let stopped = true;
  let failures = 0;
  let lastSyncAt: number | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let periodic: ReturnType<typeof setInterval> | null = null;

  const set = (state: SyncState, pending: number, error: string | null = null) =>
    o.onStatus({ state, pending, lastSyncAt, error });

  async function cycle(): Promise<void> {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    if (retry) clearTimeout(retry);
    retry = null;

    if (!isOnline()) {
      set('offline', await o.pending());
      return;
    }
    running = true;
    set('syncing', await o.pending());
    try {
      const { applied } = await o.run();
      failures = 0;
      lastSyncAt = now();
      const pending = await o.pending();
      set('synced', pending);
      if (applied > 0) o.onApplied?.();
    } catch (e) {
      failures++;
      set('offline', await o.pending(), e instanceof Error ? e.message : String(e));
      if (!stopped)
        retry = setTimeout(() => void cycle(), Math.min(max, base * 2 ** (failures - 1)));
    } finally {
      running = false;
      if (again && !stopped) {
        again = false;
        void cycle();
      }
    }
  }

  const onOnline = () => {
    failures = 0;
    void cycle();
  };
  const onOffline = () => void o.pending().then((n) => !stopped && set('offline', n));

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      // Com falhas em curso, quem decide o próximo passo é o backoff (senão o periódico o anularia).
      periodic = setInterval(() => {
        if (failures === 0) void cycle();
      }, o.periodMs ?? 60_000);
      void cycle();
    },
    /** Sincronizar agora (botão). */
    trigger() {
      failures = 0;
      void cycle();
    },
    /** Algo entrou na fila: envia em instantes (agrupa várias alterações seguidas). */
    notifyChange() {
      if (stopped) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void cycle(), o.debounceMs ?? 1500);
    },
    stop() {
      stopped = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (retry) clearTimeout(retry);
      if (debounce) clearTimeout(debounce);
      if (periodic) clearInterval(periodic);
      retry = debounce = periodic = null;
    },
  };
}

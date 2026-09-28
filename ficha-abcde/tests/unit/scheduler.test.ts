import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScheduler } from '../../src/sync/scheduler';
import type { SyncStatus } from '../../src/sync/scheduler';
import { statusLabel } from '../../src/sync/syncContext';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(
  over: {
    run?: () => Promise<{ applied: number }>;
    online?: () => boolean;
    pending?: () => number;
  } = {},
) {
  const statuses: SyncStatus[] = [];
  const run = vi.fn(over.run ?? (async () => ({ applied: 0 })));
  const onApplied = vi.fn();
  const s = createScheduler({
    run,
    pending: async () => over.pending?.() ?? 0,
    onStatus: (x) => statuses.push(x),
    onApplied,
    isOnline: over.online,
    now: () => 42,
  });
  return { s, run, statuses, onApplied, last: () => statuses.at(-1)! };
}

describe('agendador', () => {
  it('sincroniza ao iniciar e mostra Sincronizado', async () => {
    const t = setup();
    t.s.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.run).toHaveBeenCalledTimes(1);
    expect(t.last()).toMatchObject({ state: 'synced', lastSyncAt: 42 });
    t.s.stop();
  });

  it('backoff exponencial após falhas (2 s, 4 s, 8 s) e volta ao normal ao conseguir', async () => {
    let fails = 3;
    const t = setup({
      run: async () => {
        if (fails-- > 0) throw new Error('sem rede');
        return { applied: 0 };
      },
      pending: () => 2,
    });
    t.s.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.run).toHaveBeenCalledTimes(1);
    expect(t.last()).toMatchObject({ state: 'offline', pending: 2, error: 'sem rede' });
    await vi.advanceTimersByTimeAsync(1999);
    expect(t.run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // 2 s
    expect(t.run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3999);
    expect(t.run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); // +4 s
    expect(t.run).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(8000); // +8 s: sucesso
    expect(t.run).toHaveBeenCalledTimes(4);
    expect(t.last().state).toBe('synced');
    t.s.stop();
  });

  it('o intervalo entre tentativas cresce 2× até o teto de 5 minutos', async () => {
    const times: number[] = [];
    const t = setup({
      run: async () => {
        times.push(Date.now());
        throw new Error('x');
      },
    });
    t.s.start();
    await vi.advanceTimersByTimeAsync(2_000_000);
    const gaps = times.slice(1).map((v, i) => v - times[i]!);
    expect(gaps.slice(0, 7)).toEqual([2000, 4000, 8000, 16000, 32000, 64000, 128000]);
    expect(gaps.slice(7)).toSatisfy(
      (g: number[]) => g.length > 0 && g.every((x) => x === 256_000 || x === 300_000),
    );
    expect(Math.max(...gaps)).toBe(300_000);
    t.s.stop();
  });

  it('offline: não tenta e mostra pendências; ao evento online sincroniza', async () => {
    let online = false;
    const t = setup({ online: () => online, pending: () => 3 });
    t.s.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.run).not.toHaveBeenCalled();
    expect(t.last()).toMatchObject({ state: 'offline', pending: 3 });
    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(t.run).toHaveBeenCalledTimes(1);
    t.s.stop();
  });

  it('agrupa várias alterações seguidas (debounce) e avisa quando recebeu mudanças', async () => {
    const t = setup({ run: async () => ({ applied: 2 }) });
    t.s.start();
    await vi.advanceTimersByTimeAsync(0);
    t.run.mockClear();
    t.s.notifyChange();
    t.s.notifyChange();
    t.s.notifyChange();
    await vi.advanceTimersByTimeAsync(1499);
    expect(t.run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(t.run).toHaveBeenCalledTimes(1);
    expect(t.onApplied).toHaveBeenCalled();
    t.s.stop();
  });

  it('sincroniza periodicamente e para de vez ao chamar stop()', async () => {
    const t = setup();
    t.s.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(t.run).toHaveBeenCalledTimes(2);
    t.s.stop();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(t.run).toHaveBeenCalledTimes(2);
  });

  it('não roda dois ciclos ao mesmo tempo (o segundo espera e roda em seguida)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const t = setup({
      run: async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 100));
        inFlight--;
        return { applied: 0 };
      },
    });
    t.s.start();
    t.s.trigger();
    t.s.trigger();
    await vi.advanceTimersByTimeAsync(500);
    expect(maxInFlight).toBe(1);
    expect(t.run.mock.calls.length).toBeGreaterThanOrEqual(2);
    t.s.stop();
  });
});

describe('indicador de estado', () => {
  const s = (state: SyncStatus['state'], pending = 0): SyncStatus => ({
    state,
    pending,
    lastSyncAt: null,
    error: null,
  });
  it('textos', () => {
    expect(statusLabel(s('local'))).toBe('Salvo neste aparelho');
    expect(statusLabel(s('syncing'))).toBe('Sincronizando…');
    expect(statusLabel(s('synced'))).toBe('Sincronizado');
    expect(statusLabel(s('offline', 1))).toBe('Sem conexão (1 alteração pendente)');
    expect(statusLabel(s('offline', 3))).toBe('Sem conexão (3 alterações pendentes)');
  });
});

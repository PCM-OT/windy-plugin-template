import { describe, expect, it } from 'vitest';
import { parseDecimal, parseKg, parseReps } from '../../src/domain/numbers';
import {
  dayKey,
  daysUntil,
  nextWorkoutFromHistory,
  restRemainingMs,
  sessionVolume,
} from '../../src/domain/rules';
import { session, set } from './helpers';

describe('parsing numérico', () => {
  it('aceita vírgula e ponto', () => {
    expect(parseKg('22,5')).toBe(22.5);
    expect(parseKg('22.5')).toBe(22.5);
    expect(parseKg(' 40 ')).toBe(40);
  });
  it('rejeita vazio, negativo, lixo e acima do limite', () => {
    for (const s of ['', '-5', 'abc', '1e3', '1,2,3', '501'])
      expect(parseKg(s)).toBeNull();
    expect(parseKg('500')).toBe(500);
    expect(parseDecimal('0', 10)).toBe(0);
  });
  it('reps: inteiro de 0 a 200', () => {
    expect(parseReps('12')).toBe(12);
    expect(parseReps('12,5')).toBeNull();
    expect(parseReps('201')).toBeNull();
    expect(parseReps('-1')).toBeNull();
  });
});

describe('volume', () => {
  it('soma kg×reps só das séries feitas', () => {
    const sets = [
      set({ kg: 40, reps: 12 }),
      set({ kg: 40, reps: 10, idx: 1 }),
      set({ done: false, kg: 99, reps: 99, idx: 2 }),
      set({ kg: null, reps: 15, idx: 3 }),
    ];
    expect(sessionVolume(sets)).toBe(880);
  });
});

describe('descanso a partir de timestamps', () => {
  const total = 60_000;
  it('calcula o restante e zera ao vencer', () => {
    expect(restRemainingMs(100_000, 70_000, total)).toBe(30_000);
    expect(restRemainingMs(100_000, 100_000, total)).toBe(0);
    expect(restRemainingMs(100_000, 500_000, total)).toBe(0);
  });
  it('correto após bloquear a tela por 2 min (sem depender de ticks)', () => {
    const start = 1_000_000;
    expect(restRemainingMs(start + 180_000, start + 120_000, 180_000)).toBe(60_000);
  });
  it('relógio saltando para trás não passa do total', () => {
    expect(restRemainingMs(100_000, -5_000_000, total)).toBe(total);
  });
});

describe('rotação a partir do histórico', () => {
  it('usa a última sessão finalizada', () => {
    expect(nextWorkoutFromHistory([])).toBe('A');
    const list = [
      session({ id: '1', workoutId: 'B', endedAt: 1 }),
      session({ id: '2', workoutId: 'E', endedAt: 5 }),
      session({ id: '3', workoutId: 'C', endedAt: 3 }),
    ];
    expect(nextWorkoutFromHistory(list)).toBe('A');
  });
});

describe('datas em São Paulo', () => {
  it('23:50 em SP pertence ao dia em que começou (mesmo já sendo o dia seguinte em UTC)', () => {
    expect(dayKey(Date.parse('2026-03-10T02:50:00Z'))).toBe('2026-03-09');
  });
  it('dias até a validade', () => {
    const now = Date.parse('2026-11-01T15:00:00Z');
    expect(daysUntil('2026-11-16', now)).toBe(15);
    expect(daysUntil('2026-11-01', now)).toBe(0);
    expect(daysUntil('2026-10-30', now)).toBe(-2);
  });
});

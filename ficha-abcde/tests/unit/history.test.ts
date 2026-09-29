import { describe, expect, it } from 'vitest';
import {
  addDays,
  calendarWeeks,
  chartExercises,
  groupByMonth,
  loadSeries,
  summaryStats,
  weekStart,
} from '../../src/domain/history';
import { session, set } from './helpers';

// 2026-06-10 é quarta-feira.
const D = (iso: string) => Date.parse(iso);
const NOW = D('2026-06-10T15:00:00Z');
const at = (iso: string, extra: Parameters<typeof session>[0] = {}) =>
  session({ startedAt: D(iso), endedAt: D(iso) + 3_600_000, ...extra });

describe('datas de calendário', () => {
  it('addDays e início da semana (segunda)', () => {
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
    expect(weekStart('2026-06-10')).toBe('2026-06-08');
    expect(weekStart('2026-06-14')).toBe('2026-06-08'); // domingo
    expect(weekStart('2026-06-08')).toBe('2026-06-08');
  });
});

describe('resumo', () => {
  it('total, sessões na semana e duração média', () => {
    const list = [
      at('2026-06-09T15:00:00Z', { id: 'a' }),
      at('2026-06-08T15:00:00Z', { id: 'b' }),
      at('2026-06-05T15:00:00Z', {
        id: 'c',
        endedAt: D('2026-06-05T15:00:00Z') + 1_800_000,
      }),
    ];
    const s = summaryStats(list, NOW);
    expect(s.total).toBe(3);
    expect(s.thisWeek).toBe(2);
    expect(s.avgDurationMs).toBe((3_600_000 * 2 + 1_800_000) / 3);
  });
  it('sem sessões: zeros', () => {
    expect(summaryStats([], NOW)).toEqual({ total: 0, thisWeek: 0, avgDurationMs: 0 });
  });
});

describe('calendário de 5 semanas', () => {
  it('tem 5×7 dias, termina na semana atual e marca hoje/futuro', () => {
    const weeks = calendarWeeks([], NOW);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]![0]!.key).toBe('2026-05-11');
    expect(weeks[4]![0]!.key).toBe('2026-06-08');
    const today = weeks[4]![2]!;
    expect(today).toMatchObject({ key: '2026-06-10', isToday: true, isFuture: false });
    expect(weeks[4]![3]!.isFuture).toBe(true);
  });
  it('mostra a letra do treino no dia em que ele começou (23:50 em SP)', () => {
    // 23:50 de 09/06 em São Paulo = 02:50Z de 10/06
    const late = at('2026-06-10T02:50:00Z', { workoutId: 'C' });
    const two = [
      at('2026-06-08T13:00:00Z', { id: 'x', workoutId: 'A' }),
      at('2026-06-08T20:00:00Z', { id: 'y', workoutId: 'B' }),
    ];
    const days = calendarWeeks([late, ...two], NOW).flat();
    expect(days.find((d) => d.key === '2026-06-09')!.letters).toBe('C');
    expect(days.find((d) => d.key === '2026-06-10')!.letters).toBe('');
    expect(days.find((d) => d.key === '2026-06-08')!.letters).toBe('AB');
  });
});

describe('gráfico de evolução', () => {
  const s1 = at('2026-06-01T15:00:00Z', {
    id: '1',
    sets: [
      set({ kg: 40 }),
      set({ kg: 45, idx: 1 }),
      set({ kg: 99, idx: 2, done: false }),
    ],
  });
  const s2 = at('2026-06-08T15:00:00Z', { id: '2', sets: [set({ kg: 50 })] });
  it('carga máxima por sessão, cronológica, ignorando séries não feitas', () => {
    expect(loadSeries([s2, s1], 'A-2')).toEqual([
      { at: s1.startedAt, kg: 45 },
      { at: s2.startedAt, kg: 50 },
    ]);
    expect(loadSeries([s1], 'nao-existe')).toEqual([]);
  });
  it('lista exercícios com carga; mobilidade e sem série feita ficam de fora', () => {
    const mob = at('2026-06-02T15:00:00Z', {
      id: 'm',
      exercises: [
        {
          id: 'A-1',
          name: 'Mobilidade',
          restSec: 30,
          noLoad: true,
          reps: null,
          machine: null,
          catalogId: null,
          note: '',
        },
      ],
      sets: [set({ exerciseId: 'A-1', kg: null })],
    });
    expect(chartExercises([s1, s2, mob])).toEqual([
      { id: 'A-2', name: 'Cadeira adutora' },
    ]);
  });
});

describe('lista por mês', () => {
  it('agrupa do mais novo ao mais antigo', () => {
    const g = groupByMonth([
      at('2026-05-30T15:00:00Z', { id: 'm' }),
      at('2026-06-08T15:00:00Z', { id: 'j1' }),
      at('2026-06-01T15:00:00Z', { id: 'j0' }),
    ]);
    expect(g.map((x) => x.key)).toEqual(['2026-06', '2026-05']);
    expect(g[0]!.sessions.map((s) => s.id)).toEqual(['j1', 'j0']);
  });
});

import { describe, expect, it } from 'vitest';
import { seedPlan } from '../../src/data/seed';
import { formatClock } from '../../src/domain/format';
import {
  addSet,
  adjustRest,
  buildSession,
  exerciseDone,
  finishSummary,
  lastSetsByExercise,
  normalizeResume,
  nextPending,
  removeLastSet,
  restNextLabel,
  setField,
  skipRest,
  toggleSet,
} from '../../src/domain/session';
import { session, set } from './helpers';

const workoutA = () => seedPlan(1).workouts[0]!;
const fresh = () => buildSession(workoutA(), { id: 'x', now: 1000 });

describe('buildSession', () => {
  it('cria uma série por exercício×séries, com snapshot do exercício', () => {
    const s = fresh();
    expect(s.sets).toHaveLength(3 + 4 + 4 + 4 + 4 + 3 + 3);
    expect(s.exercises[3]).toMatchObject({
      name: 'Cadeira extensora',
      machine: '07',
      restSec: 60,
    });
  });
  it('pré-preenche a carga com a da última vez (série a série, e a última se faltar)', () => {
    const last = lastSetsByExercise([
      session({
        startedAt: 5,
        sets: [
          set({ exerciseId: 'A-2', idx: 0, kg: 40, reps: 12 }),
          set({ exerciseId: 'A-2', idx: 1, kg: 42.5, reps: 10 }),
          set({ exerciseId: 'A-2', idx: 2, done: false, kg: 99 }),
        ],
      }),
    ]);
    const s = buildSession(workoutA(), { id: 'x', now: 1, last });
    const kgs = s.sets.filter((x) => x.exerciseId === 'A-2').map((x) => x.kg);
    expect(kgs).toEqual([40, 42.5, 42.5, 42.5]);
  });
  it('mobilidade (sem carga) não recebe carga', () => {
    const last = new Map([['A-1', [{ kg: 5, reps: 15 }]]]);
    expect(buildSession(workoutA(), { id: 'x', now: 1, last }).sets[0]!.kg).toBeNull();
  });
});

describe('lastSetsByExercise', () => {
  it('usa a sessão mais recente que tenha séries feitas do exercício', () => {
    const old = session({ id: 'o', startedAt: 1, sets: [set({ kg: 10 })] });
    const recent = session({ id: 'r', startedAt: 9, sets: [set({ kg: 20 })] });
    expect(lastSetsByExercise([old, recent]).get('A-2')).toEqual([{ kg: 20, reps: 12 }]);
  });
});

describe('toggleSet', () => {
  it('marca, preenche reps com o alvo e inicia o descanso do exercício', () => {
    const s = toggleSet(fresh(), 'A-2', 0, 50_000);
    const got = s.sets.find((x) => x.exerciseId === 'A-2' && x.idx === 0)!;
    expect(got).toMatchObject({ done: true, reps: 12, doneAt: 50_000 });
    expect(s.rest).toEqual({
      endAt: 110_000,
      totalMs: 60_000,
      exerciseId: 'A-2',
      setIdx: 0,
    });
  });
  it('não sobrescreve reps digitadas', () => {
    let s = setField(fresh(), 'A-2', 0, { reps: 9 });
    s = toggleSet(s, 'A-2', 0, 1);
    expect(s.sets.find((x) => x.exerciseId === 'A-2')!.reps).toBe(9);
  });
  it('desmarcar volta a série a pendente e cancela o descanso que ela iniciou', () => {
    let s = toggleSet(fresh(), 'A-2', 0, 1000);
    s = toggleSet(s, 'A-2', 0, 2000);
    expect(s.sets.find((x) => x.exerciseId === 'A-2')).toMatchObject({
      done: false,
      doneAt: null,
    });
    expect(s.rest).toBeNull();
  });
  it('desmarcar outra série não mexe no descanso em andamento', () => {
    let s = toggleSet(fresh(), 'A-2', 0, 1000);
    s = toggleSet(s, 'A-2', 1, 2000);
    s = toggleSet(s, 'A-2', 0, 3000);
    expect(s.rest?.setIdx).toBe(1);
  });
  it('descanso 0 ou última série do treino não inicia descanso', () => {
    let s = fresh();
    for (const x of s.sets.slice(0, -1)) s = toggleSet(s, x.exerciseId, x.idx, 1);
    const lastSet = s.sets.at(-1)!;
    expect(toggleSet(s, lastSet.exerciseId, lastSet.idx, 1).rest).toBeNull();
  });
  it('exercício concluído quando todas as séries estão feitas', () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) s = toggleSet(s, 'A-1', i, 1);
    expect(exerciseDone(s, 'A-1')).toBe(true);
    expect(exerciseDone(s, 'A-2')).toBe(false);
  });
});

describe('rótulo do descanso', () => {
  it('mostra a próxima série dentro do exercício e o próximo exercício ao acabar', () => {
    let s = toggleSet(fresh(), 'A-1', 0, 1);
    expect(restNextLabel(s)).toBe(
      'Próxima: série 2 de Mobilidade de quadril e tornozelo',
    );
    s = toggleSet(toggleSet(s, 'A-1', 1, 2), 'A-1', 2, 3);
    expect(restNextLabel(s)).toBe('Próximo: Cadeira adutora');
    expect(nextPending(s)?.exercise.id).toBe('A-2');
  });
});

describe('séries extras', () => {
  it('adiciona repetindo a carga e remove a última, sempre restando uma', () => {
    let s = setField(fresh(), 'A-2', 3, { kg: 30 });
    s = addSet(s, 'A-2');
    const mine = s.sets.filter((x) => x.exerciseId === 'A-2');
    expect(mine).toHaveLength(5);
    expect(mine[4]).toMatchObject({ idx: 4, kg: 30 });
    expect(s.sets[s.sets.indexOf(mine[4]!) + 1]!.exerciseId).toBe('A-3'); // fica junto do exercício
    s = removeLastSet(s, 'A-2');
    expect(s.sets.filter((x) => x.exerciseId === 'A-2')).toHaveLength(4);
    let one = fresh();
    for (let i = 0; i < 10; i++) one = removeLastSet(one, 'A-1');
    expect(one.sets.filter((x) => x.exerciseId === 'A-1')).toHaveLength(1);
  });
});

describe('descanso: ajustes e retomada', () => {
  it('±15 s move endAt e o total; pular limpa', () => {
    const s = toggleSet(fresh(), 'A-2', 0, 0);
    const plus = adjustRest(s, 15_000);
    expect(plus.rest).toMatchObject({ endAt: 75_000, totalMs: 75_000 });
    expect(adjustRest(s, -90_000).rest!.totalMs).toBe(1000);
    expect(skipRest(s).rest).toBeNull();
  });
  it('ao reabrir, descanso vencido some; em curso é mantido com o tempo certo', () => {
    const s = toggleSet(fresh(), 'A-2', 0, 0);
    expect(normalizeResume(s, 60_001).rest).toBeNull();
    expect(normalizeResume(s, 30_000).rest?.endAt).toBe(60_000);
  });
});

describe('resumo de finalização e relógio', () => {
  it('duração, séries feitas/total e volume', () => {
    let s = toggleSet(setField(fresh(), 'A-2', 0, { kg: 40 }), 'A-2', 0, 2000);
    s = toggleSet(setField(s, 'A-2', 1, { kg: 50, reps: 10 }), 'A-2', 1, 3000);
    expect(finishSummary(s, 61_000)).toEqual({
      durationMs: 60_000,
      done: 2,
      total: s.sets.length,
      volume: 40 * 12 + 500,
    });
  });
  it('formatClock', () => {
    expect(formatClock(59)).toBe('0:59');
    expect(formatClock(75.4)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});

import { describe, expect, it } from 'vitest';
import { seedPlan } from '../../src/data/seed';
import {
  addExercise,
  moveExercise,
  removeExercise,
  replaceWorkout,
  updateExercise,
  validateWorkout,
} from '../../src/domain/planEdit';

const w = () => seedPlan(1).workouts[0]!;

describe('edição da ficha', () => {
  it('move exercícios e ignora limites', () => {
    const a = w();
    const m = moveExercise(a, 0, 2);
    expect(m.exercises[2]!.id).toBe(a.exercises[0]!.id);
    expect(moveExercise(a, 0, -1)).toBe(a);
    expect(moveExercise(a, 0, 99)).toBe(a);
  });
  it('adiciona com id único e remove', () => {
    const a = addExercise(addExercise(w()));
    const ids = a.exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(removeExercise(a, ids[0]!).exercises).toHaveLength(a.exercises.length - 1);
  });
  it('atualiza sem mutar o original', () => {
    const a = w();
    const b = updateExercise(a, a.exercises[1]!.id, { restSec: 120 });
    expect(b.exercises[1]!.restSec).toBe(120);
    expect(a.exercises[1]!.restSec).toBe(60);
  });
  it('valida e devolve mensagens legíveis', () => {
    expect(validateWorkout(w())).toEqual([]);
    const bad = updateExercise(w(), 'A-2', { name: '  ', sets: 0 });
    const errs = validateWorkout(bad);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/Exercício 2/);
  });
  it('substitui só o treino editado', () => {
    const p = seedPlan(1);
    const q = replaceWorkout(p, { ...p.workouts[1]!, name: 'X' });
    expect(q.workouts.map((x) => x.name)[1]).toBe('X');
    expect(q.workouts[0]).toBe(p.workouts[0]);
  });
});

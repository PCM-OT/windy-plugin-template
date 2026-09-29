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

import { CATALOG, getCatalogExercise } from '../../src/data/catalog';
import { seedPlan as _seed } from '../../src/data/seed';
import {
  addCatalogExercise,
  addCustomExercise,
  addWorkout,
  nextFreeLetter,
  removeWorkout,
} from '../../src/domain/planEdit';
import { starterPlan } from '../../src/data/templates';

describe('catálogo, treinos e exercícios manuais', () => {
  it('adiciona do catálogo com as sugestões e o vínculo para as dicas', () => {
    const w = starterPlan(1).workouts[0]!;
    const c = getCatalogExercise('leg-press')!;
    const r = addCatalogExercise(w, c);
    expect(r.exercises[0]).toMatchObject({
      name: 'Leg press',
      catalogId: 'leg-press',
      sets: c.sets,
      restSec: c.restSec,
      reps: { min: c.reps[0], max: c.reps[1] },
    });
    expect(validateWorkout(r)).toEqual([]);
  });
  it('exercício manual: nome obrigatório com padrão, anotação opcional, sem vínculo', () => {
    const w = starterPlan(1).workouts[0]!;
    const r = addCustomExercise(
      addCustomExercise(w, { name: '  Meu exercício  ', note: ' cuidado com o ombro ' }),
      { name: '   ' },
    );
    expect(r.exercises[0]).toMatchObject({
      name: 'Meu exercício',
      catalogId: null,
      note: 'cuidado com o ombro',
    });
    expect(r.exercises[1]!.name).toBe('Novo exercício');
    expect(validateWorkout(r)).toEqual([]);
  });
  it('novo treino usa a primeira letra livre, sem renumerar; máximo de 7', () => {
    let p = starterPlan(1);
    expect(nextFreeLetter(p)).toBe('B');
    for (let i = 0; i < 6; i++) p = addWorkout(p)!.plan;
    expect(p.workouts.map((x) => x.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(addWorkout(p)).toBeNull();
    const menosB = removeWorkout(p, 'B');
    expect(menosB.workouts.map((x) => x.id)).toEqual(['A', 'C', 'D', 'E', 'F', 'G']);
    expect(addWorkout(menosB)!.id).toBe('B'); // reaproveita a letra livre
  });
  it('a ficha nunca fica sem treinos', () => {
    const p = starterPlan(1);
    expect(removeWorkout(p, 'A')).toBe(p);
  });
  it('a ficha de exemplo continua ligada ao catálogo', () => {
    const ex = _seed(1).workouts.flatMap((w) => w.exercises);
    expect(ex.filter((e) => e.catalogId).length).toBe(ex.length);
    for (const e of ex) expect(getCatalogExercise(e.catalogId)).toBeDefined();
    expect(CATALOG.length).toBeGreaterThan(50);
  });
});

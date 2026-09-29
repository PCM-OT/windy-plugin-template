import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  MUSCLE_GROUPS,
  getCatalogExercise,
  searchCatalog,
} from '../../src/data/catalog';
import { SOURCES, getSource } from '../../src/data/sources';
import { TEMPLATES, planFromTemplate, starterPlan } from '../../src/data/templates';
import { nextWorkout } from '../../src/domain/rotation';
import { nextWorkoutFromHistory } from '../../src/domain/rules';
import { PlanSchema } from '../../src/domain/schemas';
import { session } from './helpers';

describe('catálogo de exercícios', () => {
  it('ids e nomes únicos; todo exercício tem passo a passo e dicas', () => {
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
    expect(new Set(CATALOG.map((e) => e.name)).size).toBe(CATALOG.length);
    for (const e of CATALOG) {
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.tips.length, e.id).toBeGreaterThanOrEqual(2);
      for (const t of [...e.steps, ...e.tips])
        expect(t.trim().length, e.id).toBeGreaterThan(10);
      expect(MUSCLE_GROUPS).toContain(e.group);
    }
  });
  it('sugestões dentro dos limites do app', () => {
    for (const e of CATALOG) {
      expect(e.sets, e.id).toBeGreaterThanOrEqual(1);
      expect(e.sets, e.id).toBeLessThanOrEqual(6);
      expect(e.reps[1], e.id).toBeGreaterThanOrEqual(e.reps[0]);
      expect(e.reps[1], e.id).toBeLessThanOrEqual(200);
      expect(e.restSec, e.id).toBeLessThanOrEqual(600);
    }
  });
  it('todos os grupos musculares têm exercícios', () => {
    for (const g of MUSCLE_GROUPS)
      expect(
        CATALOG.some((e) => e.group === g),
        g,
      ).toBe(true);
  });
  it('busca sem acento, por nome/grupo/equipamento, e filtro por grupo', () => {
    expect(searchCatalog('panturrilha', null).map((e) => e.id)).toEqual(
      expect.arrayContaining(['panturrilha-em-pe', 'panturrilha-sentado']),
    );
    expect(searchCatalog('BICEPS', null).length).toBeGreaterThan(3);
    expect(searchCatalog('remada', 'Costas').every((e) => e.group === 'Costas')).toBe(
      true,
    );
    expect(searchCatalog('remada', 'Peito')).toEqual([]);
    expect(searchCatalog('', 'Mobilidade').length).toBeGreaterThanOrEqual(3);
    expect(searchCatalog('xyzinexistente', null)).toEqual([]);
    expect(getCatalogExercise('leg-press')?.name).toBe('Leg press');
    expect(getCatalogExercise('nao-existe')).toBeUndefined();
    expect(getCatalogExercise(null)).toBeUndefined();
  });
});

describe('fontes', () => {
  it('todas com título, detalhe e endereço https; ids únicos', () => {
    expect(new Set(SOURCES.map((s) => s.id)).size).toBe(SOURCES.length);
    for (const s of SOURCES) {
      expect(s.url, s.id).toMatch(/^https:\/\/[^\s]+$/);
      expect(s.title.length, s.id).toBeGreaterThan(10);
      expect(s.detail.length, s.id).toBeGreaterThan(10);
    }
    expect(SOURCES.some((s) => s.kind === 'diretriz')).toBe(true);
    expect(SOURCES.some((s) => s.kind === 'estudo')).toBe(true);
    expect(SOURCES.some((s) => s.kind === 'tecnica')).toBe(true);
  });
});

describe('fichas prontas', () => {
  it('há várias fichas, ids únicos, e todas com base em fontes existentes (exceto o exemplo)', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      for (const id of t.basedOn) expect(getSource(id), `${t.id} → ${id}`).toBeDefined();
      if (t.id !== 'academia-abcde') expect(t.basedOn.length, t.id).toBeGreaterThan(0);
    }
  });
  it('cada ficha vira uma ficha válida (schema), com exercícios do catálogo e volume sensato', () => {
    for (const t of TEMPLATES) {
      const plan = planFromTemplate(t, 123);
      expect(PlanSchema.safeParse(plan).success, t.id).toBe(true);
      expect(plan.workouts.length, t.id).toBeGreaterThanOrEqual(2);
      expect(plan.workouts.length, t.id).toBeLessThanOrEqual(7);
      for (const w of plan.workouts) {
        expect(w.exercises.length, `${t.id} ${w.id}`).toBeGreaterThanOrEqual(4);
        expect(w.exercises.length, `${t.id} ${w.id}`).toBeLessThanOrEqual(9);
        for (const e of w.exercises) {
          expect(
            e.catalogId && getCatalogExercise(e.catalogId),
            `${t.id} ${e.name}`,
          ).toBeTruthy();
          expect(e.sets, e.name).toBeLessThanOrEqual(5);
          expect(e.restSec, e.name).toBeLessThanOrEqual(180);
        }
      }
    }
  });
  it('a estrutura respeita as faixas citadas: iniciantes 2–3 dias, intermediários 3–4', () => {
    for (const t of TEMPLATES.filter((x) => x.level === 'Iniciante'))
      expect(t.daysPerWeek).toBeLessThanOrEqual(3);
    for (const t of TEMPLATES.filter((x) => x.level === 'Intermediário')) {
      expect(t.daysPerWeek).toBeGreaterThanOrEqual(3);
      expect(t.daysPerWeek).toBeLessThanOrEqual(4);
    }
    // toda ficha cita a recomendação de 2+ dias de fortalecimento (exceto o exemplo)
    for (const t of TEMPLATES.filter((x) => x.id !== 'academia-abcde'))
      expect(t.daysPerWeek).toBeGreaterThanOrEqual(2);
  });
  it('a ficha do usuário é uma cópia: ids novos e nada compartilhado com o modelo', () => {
    const t = TEMPLATES[0]!;
    const a = planFromTemplate(t, 1);
    const b = planFromTemplate(t, 2);
    expect(a.workouts[0]!.exercises[0]!.id).not.toBe(b.workouts[0]!.exercises[0]!.id);
    a.workouts[0]!.exercises[0]!.name = 'mudou';
    expect(t.workouts[0]!.exercises[0]!.name).not.toBe('mudou');
    expect(a).toMatchObject({
      name: t.title,
      source: { templateId: t.id },
      validUntil: null,
      totalSessions: t.totalSessions,
    });
  });
  it('ficha vazia para montar do zero é válida e não tem meta', () => {
    const p = starterPlan(5);
    expect(PlanSchema.safeParse(p).success).toBe(true);
    expect(p).toMatchObject({ totalSessions: null, validUntil: null, source: null });
    expect(p.workouts).toHaveLength(1);
  });
});

describe('rotação em fichas de tamanhos diferentes', () => {
  it('segue a ordem da ficha e volta ao primeiro', () => {
    expect(nextWorkout('A', ['A', 'B'])).toBe('B');
    expect(nextWorkout('B', ['A', 'B'])).toBe('A');
    expect(nextWorkout('C', ['A', 'C', 'F'])).toBe('F');
    expect(nextWorkout('F', ['A', 'C', 'F'])).toBe('A');
  });
  it('sem histórico, ou se o último treino não existe mais na ficha, começa no primeiro', () => {
    expect(nextWorkout(null, ['B', 'C'])).toBe('B');
    expect(nextWorkout('E', ['A', 'B'])).toBe('A');
    expect(
      nextWorkoutFromHistory([session({ workoutId: 'E', endedAt: 5 })], ['A', 'B']),
    ).toBe('A');
    expect(nextWorkoutFromHistory([session({ workoutId: 'A', endedAt: 5 })], ['A'])).toBe(
      'A',
    );
  });
  it('ficha com 7 treinos gira A→G→A', () => {
    const order = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
    expect(nextWorkout('E', order)).toBe('F');
    expect(nextWorkout('G', order)).toBe('A');
  });
});

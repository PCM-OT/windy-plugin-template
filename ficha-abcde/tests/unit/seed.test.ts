import { describe, expect, it } from 'vitest';
import { seedPlan } from '../../src/data/seed';
import { PlanSchema } from '../../src/domain/schemas';

describe('seed da ficha', () => {
  const plan = seedPlan(1);
  it('é válida no schema', () => expect(PlanSchema.safeParse(plan).success).toBe(true));
  it('tem A–E, 40 sessões e validade 16/11/2026', () => {
    expect(plan.workouts.map((w) => w.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(plan.totalSessions).toBe(40);
    expect(plan.validUntil).toBe('2026-11-16');
  });
  it('conta exercícios como na ficha (7, 8, 6, 7, 7)', () => {
    expect(plan.workouts.map((w) => w.exercises.length)).toEqual([7, 8, 6, 7, 7]);
  });
  it('ids de exercício são únicos', () => {
    const ids = plan.workouts.flatMap((w) => w.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('marca "a definir" (reps null) em C4 e D6', () => {
    const tbd = plan.workouts
      .flatMap((w) => w.exercises)
      .filter((e) => e.reps === null)
      .map((e) => e.id);
    expect(tbd).toEqual(['C-4', 'D-6']);
  });
  it('mobilidades são sem carga; máquinas mantêm o zero à esquerda', () => {
    const a = plan.workouts[0]!.exercises;
    expect(a[0]!.noLoad).toBe(true);
    expect(a[3]).toMatchObject({ name: 'Cadeira extensora', machine: '07', restSec: 60 });
    expect(a[4]).toMatchObject({ name: 'Leg press', machine: null, restSec: 90 });
  });
});

import { WorkoutSchema } from './schemas';
import type { Exercise, Plan, Workout } from './schemas';

export function newExercise(workoutId: string): Exercise {
  return {
    id: `${workoutId}-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Novo exercício',
    sets: 3,
    reps: { min: 10, max: 12 },
    machine: null,
    restSec: 60,
    noLoad: false,
  };
}

export const addExercise = (w: Workout): Workout => ({
  ...w,
  exercises: [...w.exercises, newExercise(w.id)],
});

export const removeExercise = (w: Workout, id: string): Workout => ({
  ...w,
  exercises: w.exercises.filter((e) => e.id !== id),
});

export const updateExercise = (
  w: Workout,
  id: string,
  patch: Partial<Exercise>,
): Workout => ({
  ...w,
  exercises: w.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
});

/** Move o exercício de `from` para `to` (limites ignorados). */
export function moveExercise(w: Workout, from: number, to: number): Workout {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= w.exercises.length ||
    to >= w.exercises.length
  ) {
    return w;
  }
  const list = [...w.exercises];
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item!);
  return { ...w, exercises: list };
}

export const replaceWorkout = (plan: Plan, w: Workout): Plan => ({
  ...plan,
  workouts: plan.workouts.map((x) => (x.id === w.id ? w : x)),
});

/** Erros legíveis para mostrar no editor. Lista vazia = pode salvar. */
export function validateWorkout(w: Workout): string[] {
  const r = WorkoutSchema.safeParse(w);
  if (r.success) return [];
  return r.error.issues.map((i) => {
    const [, idx, field] = i.path;
    if (i.path[0] === 'exercises' && typeof idx === 'number') {
      return `Exercício ${idx + 1} (${field === undefined ? 'inválido' : String(field)}): ${i.message}`;
    }
    return `${i.path.join('.') || 'Treino'}: ${i.message}`;
  });
}

import { WORKOUT_LETTERS, WorkoutSchema } from './schemas';
import type { Exercise, Plan, Workout, WorkoutId } from './schemas';
import type { CatalogExercise } from '../data/catalog';

export function newExercise(workoutId: string): Exercise {
  return {
    id: `${workoutId}-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Novo exercício',
    sets: 3,
    reps: { min: 10, max: 12 },
    machine: null,
    restSec: 60,
    noLoad: false,
    catalogId: null,
    note: '',
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

/** Exercício do catálogo, com a sugestão de séries/repetições/descanso do catálogo. */
export function addCatalogExercise(w: Workout, c: CatalogExercise): Workout {
  const e: Exercise = {
    id: `${w.id}-${crypto.randomUUID().slice(0, 8)}`,
    name: c.name,
    sets: c.sets,
    reps: { min: c.reps[0], max: c.reps[1] },
    machine: null,
    restSec: c.restSec,
    noLoad: Boolean(c.noLoad),
    catalogId: c.id,
    note: '',
  };
  return { ...w, exercises: [...w.exercises, e] };
}

/** Exercício criado à mão (fora do catálogo). */
export function addCustomExercise(
  w: Workout,
  input: { name: string; note?: string },
): Workout {
  const e: Exercise = {
    ...newExercise(w.id),
    name: input.name.trim().slice(0, 120) || 'Novo exercício',
    note: (input.note ?? '').trim().slice(0, 500),
  };
  return { ...w, exercises: [...w.exercises, e] };
}

/** Primeira letra livre entre A e G (null se a ficha já tem 7 treinos). */
export const nextFreeLetter = (plan: Plan): WorkoutId | null =>
  WORKOUT_LETTERS.find((l) => !plan.workouts.some((w) => w.id === l)) ?? null;

/** Acrescenta um treino vazio. As letras existentes não mudam (o histórico continua fazendo sentido). */
export function addWorkout(plan: Plan): { plan: Plan; id: WorkoutId } | null {
  const id = nextFreeLetter(plan);
  if (!id) return null;
  const w: Workout = { id, name: `Treino ${id}`, muscles: '', exercises: [] };
  return { plan: { ...plan, workouts: [...plan.workouts, w] }, id };
}

/** Remove um treino (a ficha sempre mantém pelo menos um). */
export function removeWorkout(plan: Plan, id: WorkoutId): Plan {
  if (plan.workouts.length <= 1) return plan;
  return { ...plan, workouts: plan.workouts.filter((w) => w.id !== id) };
}

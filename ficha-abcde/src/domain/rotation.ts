import type { WorkoutId } from './schemas';

export const WORKOUT_ORDER: readonly WorkoutId[] = ['A', 'B', 'C', 'D', 'E'];

/** Próximo treino da rotação A→B→C→D→E→A. Sem histórico, começa em A. */
export function nextWorkout(last: WorkoutId | null): WorkoutId {
  if (last === null) return 'A';
  const i = WORKOUT_ORDER.indexOf(last);
  return WORKOUT_ORDER[(i + 1) % WORKOUT_ORDER.length]!;
}

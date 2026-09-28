export const WORKOUT_ORDER = ['A', 'B', 'C', 'D', 'E'] as const;
export type WorkoutId = (typeof WORKOUT_ORDER)[number];

/** Próximo treino da rotação A→B→C→D→E→A. Sem histórico, começa em A. */
export function nextWorkout(last: WorkoutId | null): WorkoutId {
  if (last === null) return 'A';
  const i = WORKOUT_ORDER.indexOf(last);
  return WORKOUT_ORDER[(i + 1) % WORKOUT_ORDER.length]!;
}

import type { WorkoutId } from './schemas';

/** Ordem padrão (ficha ABCDE). Fichas com outros treinos passam a própria ordem. */
export const WORKOUT_ORDER: readonly WorkoutId[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * Próximo treino da rotação, na ordem da ficha, voltando ao primeiro depois do último.
 * Sem histórico (ou se o último treino não existe mais na ficha), começa no primeiro.
 */
export function nextWorkout(
  last: WorkoutId | null,
  order: readonly WorkoutId[] = WORKOUT_ORDER,
): WorkoutId {
  const first = order[0] ?? 'A';
  if (last === null) return first;
  const i = order.indexOf(last);
  if (i === -1) return first;
  return order[(i + 1) % order.length]!;
}

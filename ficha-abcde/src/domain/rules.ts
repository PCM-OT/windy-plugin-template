import { nextWorkout } from './rotation';
import type { Session, SetLog, WorkoutId } from './schemas';

const TZ = 'America/Sao_Paulo';

/** Volume = Σ kg × reps das séries feitas. */
export function sessionVolume(sets: readonly SetLog[]): number {
  return sets.reduce((acc, s) => (s.done ? acc + (s.kg ?? 0) * (s.reps ?? 0) : acc), 0);
}

export function setsSummary(sets: readonly SetLog[]) {
  return { done: sets.filter((s) => s.done).length, total: sets.length };
}

/**
 * Tempo restante do descanso. O relógio pode saltar (ajuste manual, fuso):
 * o resultado nunca passa de totalMs nem fica negativo.
 */
export function restRemainingMs(endAt: number, now: number, totalMs: number): number {
  return Math.min(totalMs, Math.max(0, endAt - now));
}

/** Próximo treino com base na sessão finalizada mais recente. */
export function nextWorkoutFromHistory(
  sessions: readonly Session[],
  order?: readonly WorkoutId[],
): WorkoutId {
  let last: Session | null = null;
  for (const s of sessions) if (!last || s.endedAt > last.endedAt) last = s;
  return nextWorkout(last?.workoutId ?? null, order);
}

/** Dia (YYYY-MM-DD) em São Paulo. 23:50 pertence ao dia em que começou. */
export function dayKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ms);
}

/** Dias (inteiros) de hoje até `validUntil`, calendário de São Paulo. Negativo = vencida. */
export function daysUntil(validUntil: string, now: number): number {
  const a = Date.parse(`${dayKey(now)}T00:00:00Z`);
  const b = Date.parse(`${validUntil}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export const isExpiringSoon = (validUntil: string, now: number, days = 14) =>
  daysUntil(validUntil, now) <= days;

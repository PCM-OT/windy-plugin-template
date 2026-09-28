import { dayKey } from './rules';
import type { Session, WorkoutId } from './schemas';

/** Soma `n` dias a um dia "YYYY-MM-DD" (calendário puro, sem fuso). */
export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Segunda = 0 … domingo = 6. */
const weekdayIndex = (key: string) => (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
export const weekStart = (key: string) => addDays(key, -weekdayIndex(key));

export function summaryStats(sessions: readonly Session[], now: number) {
  const today = dayKey(now);
  const from = weekStart(today);
  const thisWeek = sessions.filter((s) => {
    const d = dayKey(s.startedAt);
    return d >= from && d <= today;
  }).length;
  const durations = sessions.map((s) => Math.max(0, s.endedAt - s.startedAt));
  const avgDurationMs = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  return { total: sessions.length, thisWeek, avgDurationMs };
}

export interface CalendarDay {
  key: string;
  dayOfMonth: number;
  /** Letras dos treinos feitos no dia (ex.: "A" ou "AB"). Vazio = sem treino. */
  letters: string;
  isToday: boolean;
  isFuture: boolean;
}

/** Últimas `weeks` semanas (segunda a domingo), a mais antiga primeiro. O dia é o de `startedAt`. */
export function calendarWeeks(
  sessions: readonly Session[],
  now: number,
  weeks = 5,
): CalendarDay[][] {
  const today = dayKey(now);
  const byDay = new Map<string, WorkoutId[]>();
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const k = dayKey(s.startedAt);
    byDay.set(k, [...(byDay.get(k) ?? []), s.workoutId]);
  }
  const first = addDays(weekStart(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(first, w * 7 + d);
      return {
        key,
        dayOfMonth: Number(key.slice(8)),
        letters: (byDay.get(key) ?? []).join(''),
        isToday: key === today,
        isFuture: key > today,
      };
    }),
  );
}

/** Exercícios com carga registrada (para o seletor do gráfico), por nome. */
export function chartExercises(
  sessions: readonly Session[],
): { id: string; name: string }[] {
  const names = new Map<string, string>();
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const loaded = new Set(
      s.sets.filter((x) => x.done && (x.kg ?? 0) > 0).map((x) => x.exerciseId),
    );
    for (const e of s.exercises)
      if (!e.noLoad && loaded.has(e.id)) names.set(e.id, e.name);
  }
  return [...names]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Carga máxima por sessão para um exercício, em ordem cronológica. */
export function loadSeries(
  sessions: readonly Session[],
  exerciseId: string,
): { at: number; kg: number }[] {
  const out: { at: number; kg: number }[] = [];
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const kgs = s.sets
      .filter((x) => x.exerciseId === exerciseId && x.done && x.kg !== null)
      .map((x) => x.kg!);
    if (kgs.length) out.push({ at: s.startedAt, kg: Math.max(...kgs) });
  }
  return out;
}

export interface MonthGroup {
  key: string; // YYYY-MM
  sessions: Session[];
}

/** Agrupa por mês (do dia em que começou), do mais novo ao mais antigo. */
export function groupByMonth(sessions: readonly Session[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const s of [...sessions].sort((a, b) => b.startedAt - a.startedAt)) {
    const key = dayKey(s.startedAt).slice(0, 7);
    const g = groups.at(-1);
    if (g && g.key === key) g.sessions.push(s);
    else groups.push({ key, sessions: [s] });
  }
  return groups;
}

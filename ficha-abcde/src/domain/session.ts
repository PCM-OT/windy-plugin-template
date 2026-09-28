import { sessionVolume, setsSummary } from './rules';
import type { ActiveSession, Session, SetLog, Workout } from './schemas';

export interface LastSet {
  kg: number | null;
  reps: number | null;
}

/** Séries feitas na última vez em que cada exercício apareceu (`sessions` do mais novo ao mais antigo). */
export function lastSetsByExercise(sessions: readonly Session[]): Map<string, LastSet[]> {
  const map = new Map<string, LastSet[]>();
  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  for (const s of ordered) {
    const byEx = new Map<string, SetLog[]>();
    for (const set of s.sets) {
      if (!set.done) continue;
      byEx.set(set.exerciseId, [...(byEx.get(set.exerciseId) ?? []), set]);
    }
    for (const [id, sets] of byEx) {
      if (!map.has(id)) {
        map.set(
          id,
          [...sets]
            .sort((a, b) => a.idx - b.idx)
            .map((x) => ({ kg: x.kg, reps: x.reps })),
        );
      }
    }
  }
  return map;
}

export function buildSession(
  workout: Workout,
  opts: { id: string; now: number; last?: Map<string, LastSet[]> },
): ActiveSession {
  const sets: SetLog[] = [];
  for (const e of workout.exercises) {
    const last = opts.last?.get(e.id);
    for (let idx = 0; idx < e.sets; idx++) {
      const kg = e.noLoad ? null : (last?.[idx]?.kg ?? last?.at(-1)?.kg ?? null);
      sets.push({ exerciseId: e.id, idx, kg, reps: null, done: false, doneAt: null });
    }
  }
  return {
    id: opts.id,
    schemaVersion: 1,
    workoutId: workout.id,
    startedAt: opts.now,
    exercises: workout.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      restSec: e.restSec,
      noLoad: e.noLoad,
      reps: e.reps,
      machine: e.machine,
    })),
    sets,
    note: '',
    rest: null,
    updatedAt: opts.now,
  };
}

const mapSet = (
  s: ActiveSession,
  exId: string,
  idx: number,
  fn: (x: SetLog) => SetLog,
) => ({
  ...s,
  sets: s.sets.map((x) => (x.exerciseId === exId && x.idx === idx ? fn(x) : x)),
});

export function setField(
  s: ActiveSession,
  exId: string,
  idx: number,
  patch: Partial<Pick<SetLog, 'kg' | 'reps'>>,
): ActiveSession {
  return mapSet(s, exId, idx, (x) => ({ ...x, ...patch }));
}

/**
 * Marca/desmarca a série. Ao marcar: preenche reps com o alvo (máximo da faixa) se estiver vazio
 * e inicia o descanso do exercício, exceto se não restar nenhuma série pendente.
 */
export function toggleSet(
  s: ActiveSession,
  exId: string,
  idx: number,
  now: number,
): ActiveSession {
  const cur = s.sets.find((x) => x.exerciseId === exId && x.idx === idx);
  const ex = s.exercises.find((e) => e.id === exId);
  if (!cur || !ex) return s;
  if (cur.done) {
    const next = mapSet(s, exId, idx, (x) => ({ ...x, done: false, doneAt: null }));
    const r = s.rest;
    return r && r.exerciseId === exId && r.setIdx === idx
      ? { ...next, rest: null }
      : next;
  }
  const next = mapSet(s, exId, idx, (x) => ({
    ...x,
    reps: x.reps ?? ex.reps?.max ?? null,
    done: true,
    doneAt: now,
  }));
  const pending = next.sets.some((x) => !x.done);
  const rest =
    ex.restSec > 0 && pending
      ? {
          endAt: now + ex.restSec * 1000,
          totalMs: ex.restSec * 1000,
          exerciseId: exId,
          setIdx: idx,
        }
      : null;
  return { ...next, rest };
}

/** Acrescenta uma série extra ao exercício, repetindo a carga da anterior. */
export function addSet(s: ActiveSession, exId: string): ActiveSession {
  const mine = s.sets.filter((x) => x.exerciseId === exId);
  if (mine.length === 0 || mine.length >= 20) return s;
  const last = mine[mine.length - 1]!;
  const extra: SetLog = {
    exerciseId: exId,
    idx: last.idx + 1,
    kg: last.kg,
    reps: null,
    done: false,
    doneAt: null,
  };
  const at = s.sets.lastIndexOf(last) + 1;
  return { ...s, sets: [...s.sets.slice(0, at), extra, ...s.sets.slice(at)] };
}

/** Remove a última série do exercício (sempre resta ao menos uma). */
export function removeLastSet(s: ActiveSession, exId: string): ActiveSession {
  const mine = s.sets.filter((x) => x.exerciseId === exId);
  if (mine.length <= 1) return s;
  const last = mine[mine.length - 1]!;
  const rest = s.rest?.exerciseId === exId && s.rest.setIdx === last.idx ? null : s.rest;
  return { ...s, sets: s.sets.filter((x) => x !== last), rest };
}

export const setNote = (s: ActiveSession, note: string): ActiveSession => ({
  ...s,
  note: note.slice(0, 2000),
});

/** Ajusta o descanso em andamento (−15 s / +15 s). Nunca abaixo de 1 s de duração total. */
export function adjustRest(s: ActiveSession, deltaMs: number): ActiveSession {
  if (!s.rest) return s;
  return {
    ...s,
    rest: {
      ...s.rest,
      endAt: s.rest.endAt + deltaMs,
      totalMs: Math.max(1000, s.rest.totalMs + deltaMs),
    },
  };
}

export const skipRest = (s: ActiveSession): ActiveSession =>
  s.rest ? { ...s, rest: null } : s;

export const exerciseDone = (s: ActiveSession, exId: string): boolean => {
  const mine = s.sets.filter((x) => x.exerciseId === exId);
  return mine.length > 0 && mine.every((x) => x.done);
};

/** Primeira série pendente, na ordem da ficha. */
export function nextPending(s: ActiveSession) {
  for (const e of s.exercises) {
    const set = s.sets.find((x) => x.exerciseId === e.id && !x.done);
    if (set) return { exercise: e, idx: set.idx };
  }
  return null;
}

/** Rótulo do descanso: se acabou o exercício, mostra o próximo; senão, a próxima série. */
export function restNextLabel(s: ActiveSession): string | null {
  const p = nextPending(s);
  if (!p) return null;
  const from = s.rest?.exerciseId;
  return p.exercise.id !== from
    ? `Próximo: ${p.exercise.name}`
    : `Próxima: série ${p.idx + 1} de ${p.exercise.name}`;
}

/** Ao reabrir: descanso já vencido some em silêncio (sem apitar por algo que passou). */
export function normalizeResume(s: ActiveSession, now: number): ActiveSession {
  return s.rest && s.rest.endAt <= now ? { ...s, rest: null } : s;
}

export function finishSummary(s: ActiveSession, endedAt: number) {
  return {
    durationMs: Math.max(0, endedAt - s.startedAt),
    ...setsSummary(s.sets),
    volume: sessionVolume(s.sets),
  };
}

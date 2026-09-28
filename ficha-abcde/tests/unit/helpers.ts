import { FichaDB } from '../../src/data/db';
import { createRepo } from '../../src/data/repo';
import type { ActiveSession, Session, SetLog } from '../../src/domain/schemas';

let n = 0;
export function freshRepo(clock: () => number = () => 1_000) {
  const db = new FichaDB(`test-${++n}-${Math.random()}`);
  return { db, repo: createRepo(db, clock) };
}

export const set = (p: Partial<SetLog> = {}): SetLog => ({
  exerciseId: 'A-2',
  idx: 0,
  kg: 40,
  reps: 12,
  done: true,
  doneAt: 10,
  ...p,
});

export const active = (p: Partial<ActiveSession> = {}): ActiveSession => ({
  id: 'sess-1',
  schemaVersion: 1,
  workoutId: 'A',
  startedAt: 100,
  exercises: [
    {
      id: 'A-2',
      name: 'Cadeira adutora',
      restSec: 60,
      noLoad: false,
      reps: { min: 10, max: 12 },
      machine: '17',
    },
  ],
  sets: [set()],
  note: '',
  rest: null,
  updatedAt: 100,
  ...p,
});

export const session = (p: Partial<Session> = {}): Session => {
  const { rest: _r, updatedAt: _u, ...base } = active();
  return { ...base, endedAt: 200, ...p };
};

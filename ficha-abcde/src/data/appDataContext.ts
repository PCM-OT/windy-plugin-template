import { createContext, useContext } from 'react';
import type { ActiveSession, Plan, Session, WorkoutId } from '../domain/schemas';
import type { Repo } from './repo';

export interface AppData {
  repo: Repo;
  plan: Plan;
  sessions: Session[];
  /** Sessão em andamento (retomada ao reabrir o app). */
  active: ActiveSession | null;
  savePlan: (p: Plan) => Promise<void>;
  resetPlan: () => Promise<void>;
  startSession: (id: WorkoutId) => Promise<void>;
  finishSession: (s: ActiveSession) => Promise<void>;
  discardSession: () => Promise<void>;
  now: () => number;
}

export const AppDataCtx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const v = useContext(AppDataCtx);
  if (!v) throw new Error('useAppData fora do AppDataProvider');
  return v;
}

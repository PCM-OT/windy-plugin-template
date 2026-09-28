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
  deleteSession: (id: string) => Promise<void>;
  /** Relê tudo do banco (ex.: depois de importar um backup). */
  reload: () => Promise<void>;
  /** Outra aba está com o app aberto: esta aba só lê. */
  readOnly: boolean;
  now: () => number;
}

export const AppDataCtx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const v = useContext(AppDataCtx);
  if (!v) throw new Error('useAppData fora do AppDataProvider');
  return v;
}

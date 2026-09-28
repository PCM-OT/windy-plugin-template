import { createContext, useContext } from 'react';
import type { Plan, Session } from '../domain/schemas';

export interface AppData {
  plan: Plan;
  sessions: Session[];
  savePlan: (p: Plan) => Promise<void>;
  resetPlan: () => Promise<void>;
  now: () => number;
}

export const AppDataCtx = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const v = useContext(AppDataCtx);
  if (!v) throw new Error('useAppData fora do AppDataProvider');
  return v;
}

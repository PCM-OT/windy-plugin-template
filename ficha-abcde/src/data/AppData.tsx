import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ActiveSession, Plan, Session } from '../domain/schemas';
import { buildSession, lastSetsByExercise, normalizeResume } from '../domain/session';
import type { Repo } from './repo';
import { AppDataCtx } from './appDataContext';
import type { AppData } from './appDataContext';

interface Loaded {
  plan: Plan;
  sessions: Session[];
  active: ActiveSession | null;
}

/** Carrega ficha, histórico e sessão em andamento. Falha de leitura é mostrada, com "tentar de novo". */
export function AppDataProvider({
  repo,
  now = Date.now,
  children,
}: {
  repo: Repo;
  now?: () => number;
  children: ReactNode;
}) {
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([repo.getPlan(), repo.listSessions(), repo.getActive()])
      .then(([plan, sessions, active]) => {
        if (!alive) return;
        setState({ plan, sessions, active: active && normalizeResume(active, now()) });
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [repo, attempt, now]);

  const value = useMemo<AppData | null>(() => {
    if (!state) return null;
    const patch = (p: Partial<Loaded>) => setState((s) => (s ? { ...s, ...p } : s));
    return {
      repo,
      plan: state.plan,
      sessions: state.sessions,
      active: state.active,
      now,
      // Se a escrita falhar, o erro sobe para a tela que chamou (que mostra o aviso).
      savePlan: async (p) => patch({ plan: await repo.savePlan(p) }),
      resetPlan: async () => patch({ plan: await repo.resetPlan() }),
      startSession: async (id) => {
        const workout = state.plan.workouts.find((w) => w.id === id)!;
        const active = buildSession(workout, {
          id: crypto.randomUUID(),
          now: now(),
          last: lastSetsByExercise(state.sessions),
        });
        await repo.saveActive(active);
        patch({ active });
      },
      finishSession: async (s) => {
        const done = await repo.finishWith(s, now());
        setState((cur) =>
          cur
            ? {
                ...cur,
                active: null,
                sessions: [done, ...cur.sessions.filter((x) => x.id !== done.id)],
              }
            : cur,
        );
      },
      discardSession: async () => {
        await repo.discardActive();
        patch({ active: null });
      },
    };
  }, [state, repo, now]);

  if (error) {
    return (
      <main className="screen" role="alert">
        <h1>Não foi possível abrir os dados</h1>
        <p>{error}</p>
        <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
          Tentar de novo
        </button>
      </main>
    );
  }
  if (!value) {
    return (
      <main className="screen">
        <p>Carregando…</p>
      </main>
    );
  }
  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ActiveSession, Plan, Session } from '../domain/schemas';
import { buildSession, lastSetsByExercise, normalizeResume } from '../domain/session';
import type { Repo } from './repo';
import { useLeader } from '../pwa/leader';
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
  const leader = useLeader();
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Ao virar líder (a outra aba fechou), relê o banco: o que esta aba viu pode estar velho.
  const reloadKey = leader === true ? 1 : 0;

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
  }, [repo, attempt, now, reloadKey]);

  const value = useMemo<AppData | null>(() => {
    if (!state) return null;
    const patch = (p: Partial<Loaded>) => setState((s) => (s ? { ...s, ...p } : s));
    const readOnly = leader === false;
    // Segunda aba: nunca escreve, para não sobrescrever a sessão ativa da primeira.
    const guard = () => {
      if (readOnly)
        throw new Error('Este app está aberto em outra aba. Feche a outra para editar.');
    };
    return {
      readOnly,
      repo,
      plan: state.plan,
      sessions: state.sessions,
      active: state.active,
      now,
      // Se a escrita falhar, o erro sobe para a tela que chamou (que mostra o aviso).
      savePlan: async (p) => {
        guard();
        patch({ plan: await repo.savePlan(p) });
      },
      resetPlan: async () => {
        guard();
        patch({ plan: await repo.resetPlan() });
      },
      startSession: async (id) => {
        guard();
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
        guard();
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
        guard();
        await repo.discardActive();
        patch({ active: null });
      },
      deleteSession: async (id) => {
        guard();
        await repo.deleteSession(id);
        setState((cur) =>
          cur ? { ...cur, sessions: cur.sessions.filter((x) => x.id !== id) } : cur,
        );
      },
      reload: async () => {
        const [plan, sessions, active] = await Promise.all([
          repo.getPlan(),
          repo.listSessions(),
          repo.getActive(),
        ]);
        setState({ plan, sessions, active: active && normalizeResume(active, now()) });
      },
    };
  }, [state, repo, now, leader]);

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
  if (!value || leader === null) {
    return (
      <main className="screen">
        <p>Carregando…</p>
      </main>
    );
  }
  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

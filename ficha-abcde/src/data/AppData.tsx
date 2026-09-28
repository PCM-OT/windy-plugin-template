import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Plan, Session } from '../domain/schemas';
import type { Repo } from './repo';
import { AppDataCtx } from './appDataContext';
import type { AppData } from './appDataContext';

/** Carrega ficha e histórico do IndexedDB. Falha de leitura é mostrada, com "tentar de novo". */
export function AppDataProvider({
  repo,
  now = Date.now,
  children,
}: {
  repo: Repo;
  now?: () => number;
  children: ReactNode;
}) {
  const [state, setState] = useState<{ plan: Plan; sessions: Session[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([repo.getPlan(), repo.listSessions()])
      .then(([plan, sessions]) => {
        if (!alive) return;
        setState({ plan, sessions });
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [repo, attempt]);

  const value = useMemo<AppData | null>(() => {
    if (!state) return null;
    return {
      plan: state.plan,
      sessions: state.sessions,
      now,
      // Se a escrita falhar, o erro sobe para a tela que chamou (que mostra o aviso).
      savePlan: async (p) => {
        const saved = await repo.savePlan(p);
        setState((s) => (s ? { ...s, plan: saved } : s));
      },
      resetPlan: async () => {
        const plan = await repo.resetPlan();
        setState((s) => (s ? { ...s, plan } : s));
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
  if (!value)
    return (
      <main className="screen">
        <p>Carregando…</p>
      </main>
    );
  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

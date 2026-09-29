import { FichaDB } from './db';
import { createRepo } from './repo';
import type { Repo } from './repo';

/**
 * Cada conta tem o próprio banco local neste aparelho (perfil). Sem login existe só o perfil
 * "anônimo" (o banco original). Assim, duas pessoas no mesmo celular nunca misturam treinos,
 * e nada é apagado ao trocar de conta.
 */
export interface Profile {
  userId: string;
  email: string | null;
}

// Só guarda QUEM é o perfil ativo (id e e-mail), nunca dados de treino.
const KEY = 'ficha-abcde:profile';

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    return typeof p.userId === 'string' && p.userId
      ? { userId: p.userId, email: p.email ?? null }
      : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* sem localStorage: o app abre no perfil anônimo, sem perder dados */
  }
}

export const dbNameFor = (p: Pick<Profile, 'userId'> | null) =>
  p ? `ficha-abcde-u-${p.userId}` : 'ficha-abcde';

export interface Handle {
  db: FichaDB;
  repo: Repo;
}

export function openHandle(p: Pick<Profile, 'userId'> | null): Handle {
  const db = new FichaDB(dbNameFor(p));
  return { db, repo: createRepo(db) };
}

/** Há algo neste banco que valha a pena vincular a uma conta? */
export async function hasLocalData(db: FichaDB): Promise<boolean> {
  if ((await db.sessions.count()) > 0) return true;
  if ((await db.activeSession.count()) > 0) return true;
  return ((await db.plan.get('plan'))?.updatedAt ?? 0) > 0;
}

/**
 * Move os dados de `from` (perfil anônimo) para `to` (conta) e esvazia `from`.
 * Sessões: união por id (sem duplicar). Ficha/ajustes: vale o mais novo. Sessão em andamento: só se a
 * conta não tiver outra. Depois, o motor de sincronização envia tudo à nuvem da conta.
 */
export async function moveLocalData(from: FichaDB, to: FichaDB): Promise<void> {
  await to.sessions.bulkPut(await from.sessions.toArray());

  const plan = await from.plan.get('plan');
  if (plan && plan.updatedAt > 0) {
    const cur = await to.plan.get('plan');
    if (!cur || cur.updatedAt < plan.updatedAt) await to.plan.put(plan);
  }
  const st = await from.settings.get('settings');
  if (st && (st.updatedAt ?? 0) > 0) {
    const cur = await to.settings.get('settings');
    if (!cur || (cur.updatedAt ?? 0) < st.updatedAt)
      await to.settings.put({
        ...st,
        persistGranted: cur?.persistGranted ?? st.persistGranted,
      });
  }
  const active = await from.activeSession.get('current');
  if (active && !(await to.activeSession.get('current')))
    await to.activeSession.put(active);

  // Só apaga a origem depois de tudo copiado.
  await Promise.all([
    from.sessions.clear(),
    from.plan.clear(),
    from.settings.clear(),
    from.activeSession.clear(),
    from.outbox.clear(),
    from.meta.clear(),
  ]);
}

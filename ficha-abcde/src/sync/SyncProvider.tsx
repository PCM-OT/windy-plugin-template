import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppData } from '../data/appDataContext';
import type { FichaDB } from '../data/db';
import { createEngine } from './engine';
import { LOCAL_STATUS, createScheduler } from './scheduler';
import type { SyncStatus } from './scheduler';
import { SyncCtx } from './syncContext';
import type { SyncApi } from './syncContext';
import {
  SUPABASE_KEY,
  SUPABASE_URL,
  createSupabaseBackend,
  hasStoredSession,
  syncConfigured,
} from './supabaseBackend';
import type { SyncBackend, SyncUser } from './types';

interface Props {
  db: FichaDB;
  /**
   * Conta dona do banco local aberto (null = perfil anônimo). Só sincroniza quando o usuário logado é
   * o dono do banco; se for outro, avisa via `onLogin` para o app trocar de perfil. Omitido = sem trava.
   */
  profileUserId?: string | null;
  onLogin?: (u: SyncUser) => void;
  onLogout?: (wipe: boolean) => void;
  /** Injetável nos testes. Padrão: Supabase, se o build tiver URL e chave. */
  loadBackend?: () => Promise<SyncBackend | null>;
  configured?: boolean;
  children: ReactNode;
}

const defaultLoad = async () =>
  syncConfigured ? createSupabaseBackend(SUPABASE_URL!, SUPABASE_KEY!) : null;

/**
 * Sincronização opcional. Sem login o app é 100% local e nada aqui roda; o cliente Supabase
 * nem é baixado. Só a aba "líder" sincroniza (a outra está em modo leitura).
 */
export function SyncProvider({
  db,
  profileUserId,
  onLogin,
  onLogout,
  loadBackend = defaultLoad,
  configured = syncConfigured,
  children,
}: Props) {
  const { repo, reload, readOnly } = useAppData();
  const [backend, setBackend] = useState<SyncBackend | null>(null);
  const [user, setUser] = useState<SyncUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>(LOCAL_STATUS);
  const backendRef = useRef<Promise<SyncBackend | null> | null>(null);
  const schedulerRef = useRef<ReturnType<typeof createScheduler> | null>(null);
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });

  const ensureBackend = useCallback(async () => {
    backendRef.current ??= loadBackend().then(async (b) => {
      if (!b) return null;
      setBackend(b);
      setUser(await b.getUser());
      b.onAuthChange(setUser);
      return b;
    });
    return backendRef.current;
  }, [loadBackend]);

  // Já tinha login guardado: prepara em segundo plano (o import dinâmico só acontece aqui).
  useEffect(() => {
    if (configured && hasStoredSession()) void ensureBackend().catch(() => undefined);
  }, [configured, ensureBackend]);

  // Login detectado com outro perfil aberto: o app decide (vincular treinos locais, trocar de banco).
  const notified = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      notified.current = null;
      return;
    }
    if (
      profileUserId === undefined ||
      profileUserId === user.id ||
      notified.current === user.id
    )
      return;
    notified.current = user.id;
    onLogin?.(user);
  }, [user, profileUserId, onLogin]);

  // Motor: liga quando há backend + usuário dono do banco aberto + aba líder.
  const userId =
    user && (profileUserId === undefined || profileUserId === user.id) ? user.id : null;
  useEffect(() => {
    if (!backend || !userId || readOnly) return;
    let stopped = false;
    let unsubscribe = () => {};

    void (async () => {
      // Conta diferente da última usada neste aparelho: recomeça a fila e o cursor, e sobe tudo.
      const last = await db.meta.get('user');
      if (last?.value !== userId) {
        await db.outbox.clear();
        await db.meta.delete('cursor');
        await repo.enqueueAll();
        await db.meta.put({ key: 'user', value: userId });
      }
      if (stopped) return;
      const engine = createEngine(db, backend.remote(userId));
      const scheduler = createScheduler({
        run: () => engine.sync(),
        pending: engine.pending,
        onStatus: setStatus,
        onApplied: () => void reloadRef.current(),
      });
      schedulerRef.current = scheduler;
      unsubscribe = db.onOutboxChange(() => scheduler.notifyChange());
      scheduler.start();
    })();

    return () => {
      stopped = true;
      unsubscribe();
      schedulerRef.current?.stop();
      schedulerRef.current = null;
      setStatus(LOCAL_STATUS);
    };
  }, [backend, userId, readOnly, db, repo]);

  const api = useMemo<SyncApi>(
    () => ({
      configured,
      user,
      status: user ? status : LOCAL_STATUS,
      signIn: async (email) => {
        const b = await ensureBackend();
        if (!b) throw new Error('Sincronização não configurada neste build.');
        await b.signInWithEmail(email);
      },
      verify: async (email, code) => {
        const b = await ensureBackend();
        if (!b) throw new Error('Sincronização não configurada neste build.');
        await b.verifyCode(email, code);
      },
      signInPassword: async (email, password) => {
        const b = await ensureBackend();
        if (!b) throw new Error('Sincronização não configurada neste build.');
        await b.signInWithPassword(email, password);
      },
      signUp: async (email, password) => {
        const b = await ensureBackend();
        if (!b) throw new Error('Sincronização não configurada neste build.');
        return b.signUp(email, password);
      },
      changePassword: async (password) => {
        const b = await ensureBackend();
        if (!b) throw new Error('Sincronização não configurada neste build.');
        await b.updatePassword(password);
      },
      signOut: async (wipe = false) => {
        const b = await ensureBackend();
        await b?.signOut();
        setUser(null);
        onLogout?.(wipe);
      },
      syncNow: () => schedulerRef.current?.trigger(),
    }),
    [configured, user, status, ensureBackend, onLogout],
  );

  return <SyncCtx.Provider value={api}>{children}</SyncCtx.Provider>;
}

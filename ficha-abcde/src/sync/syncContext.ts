import { createContext, useContext } from 'react';
import type { SyncStatus } from './scheduler';
import type { SyncUser } from './types';

export interface SyncApi {
  /** Este build tem Supabase configurado? */
  configured: boolean;
  user: SyncUser | null;
  status: SyncStatus;
  signInPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ signedIn: boolean }>;
  changePassword: (password: string) => Promise<void>;
  signIn: (email: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  /** `wipe`: também apaga os dados desta conta neste aparelho (a cópia na nuvem fica). */
  signOut: (wipe?: boolean) => Promise<void>;
  syncNow: () => void;
}

import { LOCAL_STATUS } from './scheduler';

/** Sem SyncProvider (ex.: testes de tela), o app se comporta como 100% local. */
const OFF: SyncApi = {
  configured: false,
  user: null,
  status: LOCAL_STATUS,
  signInPassword: async () => {},
  signUp: async () => ({ signedIn: false }),
  changePassword: async () => {},
  signIn: async () => {},
  verify: async () => {},
  signOut: async () => {},
  syncNow: () => {},
};

export const SyncCtx = createContext<SyncApi>(OFF);

export const useSync = (): SyncApi => useContext(SyncCtx);

/** Texto do indicador de estado (discreto, no topo e em Ajustes). */
export function statusLabel(s: SyncStatus): string {
  switch (s.state) {
    case 'local':
      return 'Salvo neste aparelho';
    case 'syncing':
      return 'Sincronizando…';
    case 'synced':
      return s.pending > 0 ? `Sincronizado (${s.pending} em fila)` : 'Sincronizado';
    case 'offline':
      return s.pending > 0
        ? `Sem conexão (${s.pending} ${s.pending === 1 ? 'alteração pendente' : 'alterações pendentes'})`
        : 'Sem conexão';
  }
}

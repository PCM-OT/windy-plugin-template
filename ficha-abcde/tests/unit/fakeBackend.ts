import { vi } from 'vitest';
import type { SyncBackend, SyncUser } from '../../src/sync/types';
import type { FakeServer } from './fakeServer';

export const ACCOUNTS: Record<string, { id: string; password: string }> = {
  'ana@exemplo.com': { id: 'u1', password: 'senha-da-ana' },
  'bia@exemplo.com': { id: 'u2', password: 'senha-da-bia' },
};

/** Backend de mentira: contas em memória, login por senha/código, nuvem simulada (FakeServer). */
export function fakeBackend(server: FakeServer, initial: SyncUser | null = null) {
  let user = initial;
  const listeners = new Set<(u: SyncUser | null) => void>();
  const set = (u: SyncUser | null) => {
    user = u;
    // como o supabase-js: o login fica guardado (é o que faz o app recarregar o cliente ao remontar)
    if (u) localStorage.setItem('sb-fake-auth-token', '{}');
    else localStorage.removeItem('sb-fake-auth-token');
    listeners.forEach((l) => l(u));
  };
  const login = (email: string) => set({ id: ACCOUNTS[email]!.id, email });
  const backend: SyncBackend = {
    getUser: async () => user,
    onAuthChange: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    signInWithPassword: vi.fn(async (email: string, password: string) => {
      if (ACCOUNTS[email]?.password !== password)
        throw new Error('E-mail ou senha incorretos.');
      login(email);
    }),
    signUp: vi.fn(async (email: string) => {
      if (ACCOUNTS[email]) throw new Error('Este e-mail já tem conta. Use “Entrar”.');
      return { signedIn: false };
    }),
    updatePassword: vi.fn(async () => {}),
    signInWithEmail: vi.fn(async () => {}),
    verifyCode: vi.fn(async (email: string) => login(email)),
    signOut: vi.fn(async () => set(null)),
    remote: (id) => server.remote(id),
  };
  return { backend, set, login };
}

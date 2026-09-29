import type { SyncTable } from '../data/db';
import type { Remote, RemoteRow } from './engine';
import type { SyncBackend, SyncUser } from './types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  string | undefined;
export const syncConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const PAGE = 500;

/** Mensagens do Supabase Auth em português, sem jargão. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  const wait = m.match(/after (\d+) seconds?/);
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))
    return 'Falta confirmar o e-mail: abra a mensagem que enviamos ao criar a conta e toque no link.';
  if (m.includes('user already registered'))
    return 'Este e-mail já tem conta. Use “Entrar”.';
  if (wait) return `Aguarde ${wait[1]} segundos para pedir outro e-mail.`;
  if (m.includes('rate limit'))
    return 'O serviço de e-mail atingiu o limite de envios (limite do provedor). Tente de novo em cerca de uma hora. Se você já criou a conta, toque em “Já tenho conta” e entre com a senha.';
  if (m.includes('password should be') || m.includes('weak'))
    return 'Senha fraca demais: use pelo menos 8 caracteres.';
  if (m.includes('same password')) return 'A nova senha precisa ser diferente da atual.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com a internet.';
  return message;
}

/**
 * Cliente Supabase carregado sob demanda (import dinâmico): quem não usa a sincronização
 * não paga o custo no primeiro carregamento. A chave é a *publishable* (pública por desenho);
 * quem protege os dados é a RLS.
 */
export async function createSupabaseBackend(
  url: string,
  key: string,
): Promise<SyncBackend> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const toUser = (
    u: { id: string; email?: string } | null | undefined,
  ): SyncUser | null => (u ? { id: u.id, email: u.email ?? null } : null);

  return {
    async getUser() {
      const { data } = await client.auth.getSession(); // lê o token guardado: funciona offline
      return toUser(data.session?.user);
    },
    onAuthChange(cb) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        cb(toUser(session?.user)),
      );
      return () => data.subscription.unsubscribe();
    },
    async signInWithPassword(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(friendlyAuthError(error.message));
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/` },
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      // E-mail já cadastrado: o Supabase responde "sucesso" sem identidades (para não revelar contas).
      if (data.user && data.user.identities?.length === 0)
        throw new Error(friendlyAuthError('User already registered'));
      return { signedIn: Boolean(data.session) };
    },
    async resetPassword(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/`,
      });
      if (error) throw new Error(friendlyAuthError(error.message));
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw new Error(friendlyAuthError(error.message));
    },
    async signInWithEmail(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/`, shouldCreateUser: true },
      });
      if (error) throw new Error(friendlyAuthError(error.message));
    },
    async verifyCode(email, code) {
      const { error } = await client.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await client.auth.signOut();
    },
    remote(userId): Remote {
      return {
        async push(table: SyncTable, rows) {
          if (rows.length === 0) return;
          // upsert por (user_id, id): reenviar é seguro (idempotente).
          const { error } = await client.from(table).upsert(
            rows.map((r) => ({ ...r, user_id: userId })),
            { onConflict: 'user_id,id' },
          );
          if (error) throw new Error(error.message);
        },
        async pull(table: SyncTable, since) {
          const out: RemoteRow[] = [];
          for (let from = 0; ; from += PAGE) {
            let q = client
              .from(table)
              .select('id,data,updated_at,deleted_at,synced_at')
              .order('synced_at', { ascending: true })
              .order('id', { ascending: true })
              .range(from, from + PAGE - 1);
            if (since) q = q.gte('synced_at', since);
            const { data, error } = await q;
            if (error) throw new Error(error.message);
            out.push(...(data as RemoteRow[]));
            if (data.length < PAGE) return out;
          }
        },
      };
    },
  };
}

/** O supabase-js guarda o login em localStorage (chave sb-…-auth-token). Só isso, nunca dados de treino. */
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch {
    /* localStorage indisponível: trata como sem sessão */
  }
  return false;
}

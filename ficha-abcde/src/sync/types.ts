import type { Remote } from './engine';

export interface SyncUser {
  id: string;
  email: string | null;
}

/** O que o app precisa da nuvem: login por link mágico e a ponte de dados. */
export interface SyncBackend {
  getUser(): Promise<SyncUser | null>;
  onAuthChange(cb: (u: SyncUser | null) => void): () => void;
  /** E-mail + senha: não gasta e-mail a cada entrada (só a criação da conta manda a confirmação). */
  signInWithPassword(email: string, password: string): Promise<void>;
  /** `signedIn: false` = a conta foi criada e falta confirmar o e-mail. */
  signUp(email: string, password: string): Promise<{ signedIn: boolean }>;
  updatePassword(password: string): Promise<void>;
  signInWithEmail(email: string): Promise<void>;
  /** Alternativa ao link (útil no app instalado): código de 6 dígitos do e-mail. */
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  remote(userId: string): Remote;
}

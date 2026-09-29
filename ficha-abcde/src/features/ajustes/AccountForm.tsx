import { useState } from 'react';
import { useSync } from '../../sync/syncContext';

const MIN_PASSWORD = 8;
type Msg = { kind: 'ok' | 'err'; text: string };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Entrar / criar conta (e-mail + senha) e, como alternativa, link ou código por e-mail.
 * Usado na tela de login do primeiro acesso e em Ajustes.
 */
export function AccountForm() {
  const { signInPassword, signUp, signIn, verify, resetPassword } = useSync();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  async function run(fn: () => Promise<Msg | void>) {
    setBusy(true);
    setMsg(null);
    try {
      const m = await fn();
      if (m) setMsg(m);
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }

  const passwordOk = password.length >= MIN_PASSWORD;

  return (
    <div className="stack">
      <div className="row" role="group" aria-label="Tipo de acesso">
        <button
          className={`btn ${mode === 'entrar' ? 'btn-primary' : ''}`}
          aria-pressed={mode === 'entrar'}
          onClick={() => setMode('entrar')}
        >
          Já tenho conta
        </button>
        <button
          className={`btn ${mode === 'criar' ? 'btn-primary' : ''}`}
          aria-pressed={mode === 'criar'}
          onClick={() => setMode('criar')}
        >
          Quero criar conta
        </button>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (mode === 'entrar') {
              await signInPassword(email.trim(), password);
              return { kind: 'ok', text: 'Conectado.' };
            }
            const r = await signUp(email.trim(), password);
            return r.signedIn
              ? { kind: 'ok', text: 'Conta criada e conectada.' }
              : {
                  kind: 'ok',
                  text: 'Conta criada. Enviamos um e-mail de confirmação: toque no link e depois volte aqui e toque em “Já tenho conta”.',
                };
          });
        }}
      >
        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>
            {mode === 'criar' ? `Senha (mínimo ${MIN_PASSWORD} caracteres)` : 'Senha'}
          </span>
          <input
            type="password"
            autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={
            busy ||
            !email.includes('@') ||
            (mode === 'criar' ? !passwordOk : password.length === 0)
          }
        >
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
      {mode === 'entrar' && (
        <button
          className="btn btn-link"
          disabled={busy || !email.includes('@')}
          onClick={() =>
            void run(async () => {
              await resetPassword(email.trim());
              return {
                kind: 'ok',
                text: 'Enviamos um e-mail com o link para criar uma nova senha. Abra-o neste navegador. Preencha o e-mail acima para pedir.',
              };
            })
          }
        >
          Esqueci minha senha
        </button>
      )}

      <details className="details">
        <summary>Entrar sem senha (link ou código por e-mail)</summary>
        <p className="muted">
          Útil se você esqueceu a senha: entre assim e defina uma nova em Ajustes. O
          e-mail pode demorar e há um limite de envios por hora.
        </p>
        <button
          className="btn"
          disabled={busy || !email.includes('@')}
          onClick={() =>
            void run(async () => {
              await signIn(email.trim());
              setSentTo(email.trim());
              return { kind: 'ok', text: 'Link enviado. Abra o e-mail neste navegador.' };
            })
          }
        >
          Enviar link de acesso
        </button>
        {sentTo && (
          <>
            <label className="field">
              <span>Ou digite o código do e-mail</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button
              className="btn"
              disabled={busy || code.trim().length < 6}
              onClick={() =>
                void run(
                  async () => (
                    await verify(sentTo, code),
                    { kind: 'ok', text: 'Conectado.' }
                  ),
                )
              }
            >
              Entrar com código
            </button>
          </>
        )}
      </details>

      {msg && (
        <p
          className={msg.kind === 'err' ? 'warn' : 'ok'}
          role={msg.kind === 'err' ? 'alert' : 'status'}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

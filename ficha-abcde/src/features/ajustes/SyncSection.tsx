import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAppData } from '../../data/appDataContext';
import { statusLabel, useSync } from '../../sync/syncContext';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const MIN_PASSWORD = 8;

type Msg = { kind: 'ok' | 'err'; text: string };

export function SyncSection() {
  const {
    configured,
    user,
    status,
    signInPassword,
    signUp,
    changePassword,
    signIn,
    verify,
    signOut,
    syncNow,
  } = useSync();
  const { readOnly } = useAppData();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
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
    <section className="card" aria-labelledby="sync-title">
      <h2 id="sync-title" className="small">
        Conta e sincronização
      </h2>
      <p role="status" data-testid="sync-status">
        {statusLabel(status)}.
      </p>

      {!configured && (
        <p className="muted">
          A conta e a sincronização entre aparelhos não estão configuradas neste build. O
          app funciona normalmente, só neste aparelho.
        </p>
      )}

      {configured && !user && (
        <>
          <p className="muted">
            Opcional. Cada pessoa tem a própria conta: os treinos de uma não aparecem para
            a outra, nem no mesmo celular. Sem login, tudo continua funcionando neste
            aparelho.
          </p>
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
                      text: 'Conta criada. Enviamos um e-mail de confirmação: toque no link e depois volte aqui e toque em “Entrar”.',
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
                  return {
                    kind: 'ok',
                    text: 'Link enviado. Abra o e-mail neste navegador.',
                  };
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
        </>
      )}

      {configured && user && (
        <>
          <p>
            Conectado como <strong>{user.email ?? 'sua conta'}</strong>.
          </p>
          <div className="row">
            <button
              className="btn"
              disabled={readOnly || status.state === 'syncing'}
              onClick={syncNow}
            >
              Sincronizar agora
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => void run(async () => (await signOut(false), undefined))}
            >
              Sair
            </button>
          </div>
          {status.error && (
            <p className="warn">
              Última tentativa falhou: {status.error}. Tentando de novo automaticamente.
            </p>
          )}
          <p className="muted">
            Sair não apaga nada: seus treinos ficam guardados na sua conta e neste
            aparelho, e só aparecem quando você entrar de novo.
          </p>

          <details className="details">
            <summary>Alterar senha</summary>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await changePassword(newPassword);
                  setNewPassword('');
                  return { kind: 'ok', text: 'Senha alterada.' };
                });
              }}
            >
              <label className="field">
                <span>Nova senha (mínimo {MIN_PASSWORD} caracteres)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <button
                className="btn"
                type="submit"
                disabled={busy || newPassword.length < MIN_PASSWORD}
              >
                Salvar nova senha
              </button>
            </form>
          </details>

          <details className="details">
            <summary>Emprestando este aparelho?</summary>
            <p className="muted">
              Para tirar os seus treinos deste aparelho (eles continuam na sua conta),
              saia e apague os dados locais.
            </p>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={() => setConfirmWipe(true)}
            >
              Sair e apagar dados deste aparelho
            </button>
          </details>
        </>
      )}

      {msg && (
        <p
          className={msg.kind === 'err' ? 'warn' : 'ok'}
          role={msg.kind === 'err' ? 'alert' : 'status'}
        >
          {msg.text}
        </p>
      )}

      {confirmWipe && (
        <ConfirmDialog
          title="Sair e apagar os dados deste aparelho?"
          message={`Os treinos da conta ${user?.email ?? ''} serão removidos deste aparelho. Eles continuam salvos na nuvem, desde que já tenham sido sincronizados (veja o estado acima). Alterações ainda pendentes serão perdidas.`}
          confirmLabel="Sair e apagar"
          danger
          onCancel={() => setConfirmWipe(false)}
          onConfirm={() => {
            setConfirmWipe(false);
            void run(async () => (await signOut(true), undefined));
          }}
        />
      )}
    </section>
  );
}

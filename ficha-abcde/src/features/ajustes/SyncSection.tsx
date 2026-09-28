import { useState } from 'react';
import { useAppData } from '../../data/appDataContext';
import { statusLabel, useSync } from '../../sync/syncContext';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function SyncSection() {
  const { configured, user, status, signIn, verify, signOut, syncNow } = useSync();
  const { readOnly } = useAppData();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ kind: 'ok', text: ok });
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="sync-title">
      <h2 id="sync-title" className="small">
        Sincronização
      </h2>
      <p role="status" data-testid="sync-status">
        {statusLabel(status)}.
      </p>

      {!configured && (
        <p className="muted">
          A sincronização entre aparelhos não está configurada neste build. O app funciona
          normalmente, só neste aparelho.
        </p>
      )}

      {configured && !user && (
        <>
          <p className="muted">
            Opcional. Entre com seu e-mail para manter uma cópia na nuvem e usar em mais
            de um aparelho. Sem login, tudo continua funcionando neste aparelho.
          </p>
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
          <button
            className="btn"
            disabled={busy || !email.includes('@')}
            onClick={() =>
              void run(async () => {
                await signIn(email.trim());
                setSentTo(email.trim());
              }, 'Link enviado. Abra o e-mail neste navegador.')
            }
          >
            {busy ? 'Enviando…' : 'Enviar link de acesso'}
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
                onClick={() => void run(() => verify(sentTo, code), 'Conectado.')}
              >
                Entrar com código
              </button>
            </>
          )}
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
              className="btn btn-danger"
              disabled={busy}
              onClick={() => void run(signOut)}
            >
              Sair
            </button>
          </div>
          {status.error && (
            <p className="warn">
              Última tentativa falhou: {status.error}. Tentando de novo automaticamente.
            </p>
          )}
          <p className="muted">Sair não apaga nada deste aparelho.</p>
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
    </section>
  );
}

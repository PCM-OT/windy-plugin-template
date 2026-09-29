import { useState } from 'react';
import { useSync } from '../../sync/syncContext';

const MIN_PASSWORD = 8;

/** Aparece quando a pessoa entra pelo link de "esqueci minha senha": pede a nova senha. */
export function RecoveryPrompt() {
  const { recovery, changePassword, clearRecovery } = useSync();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!recovery) return null;

  return (
    <div className="recovery" role="dialog" aria-modal="true" aria-labelledby="rec-title">
      <div className="card recovery-card">
        <h2 id="rec-title" className="small">
          Crie uma nova senha
        </h2>
        <p className="muted">
          Você entrou pelo link de redefinição. Defina agora a sua nova senha.
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            changePassword(password).then(
              () => clearRecovery(),
              (err: unknown) => {
                setError(err instanceof Error ? err.message : String(err));
                setBusy(false);
              },
            );
          }}
        >
          <label className="field">
            <span>Nova senha (mínimo {MIN_PASSWORD} caracteres)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="warn" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button className="btn" type="button" onClick={clearRecovery} disabled={busy}>
              Agora não
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={busy || password.length < MIN_PASSWORD}
            >
              {busy ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

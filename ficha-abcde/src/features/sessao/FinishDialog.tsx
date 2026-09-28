import { useEffect, useRef } from 'react';
import { formatClock } from '../../domain/format';

interface Props {
  durationMs: number;
  done: number;
  total: number;
  volume: number;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FinishDialog(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    if (d && !d.showModal) d.setAttribute('open', '');
  }, []);
  const missing = p.total - p.done;
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="fin-title"
      onCancel={p.onCancel}
    >
      <h2 id="fin-title">Finalizar treino?</h2>
      <dl className="stats">
        <div>
          <dt>Duração</dt>
          <dd>{formatClock(p.durationMs / 1000)}</dd>
        </div>
        <div>
          <dt>Séries</dt>
          <dd>
            {p.done}/{p.total}
          </dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd>{Math.round(p.volume).toLocaleString('pt-BR')} kg</dd>
        </div>
      </dl>
      {missing > 0 && (
        <p className="warn">
          {missing}{' '}
          {missing === 1 ? 'série ficará registrada' : 'séries ficarão registradas'} como
          não {missing === 1 ? 'feita' : 'feitas'}.
        </p>
      )}
      {p.error && (
        <p className="warn" role="alert">
          {p.error}
        </p>
      )}
      <div className="row">
        <button className="btn" onClick={p.onCancel} disabled={p.busy}>
          Continuar treinando
        </button>
        <button className="btn btn-primary" onClick={p.onConfirm} disabled={p.busy}>
          {p.busy ? 'Salvando…' : 'Finalizar'}
        </button>
      </div>
    </dialog>
  );
}

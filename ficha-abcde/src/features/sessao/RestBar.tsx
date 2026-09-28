import { formatClock } from '../../domain/format';

interface Props {
  remainingMs: number;
  totalMs: number;
  nextLabel: string | null;
  onAdjust: (deltaMs: number) => void;
  onSkip: () => void;
}

export function RestBar({ remainingMs, totalMs, nextLabel, onAdjust, onSkip }: Props) {
  const pct = Math.min(100, Math.max(0, (remainingMs / Math.max(1, totalMs)) * 100));
  return (
    <div className="restbar" role="timer" aria-label="Descanso">
      <div className="rest-top">
        <div>
          <span className="eyebrow">Descanso</span>
          <div
            className="rest-clock"
            aria-label={`Faltam ${Math.ceil(remainingMs / 1000)} segundos`}
          >
            {formatClock(Math.ceil(remainingMs / 1000))}
          </div>
        </div>
        {nextLabel && <p className="rest-next">{nextLabel}</p>}
      </div>
      <div className="progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="row">
        <button className="btn" onClick={() => onAdjust(-15_000)}>
          −15 s
        </button>
        <button className="btn" onClick={() => onAdjust(15_000)}>
          +15 s
        </button>
        <button className="btn btn-primary" onClick={onSkip}>
          Pular
        </button>
      </div>
    </div>
  );
}

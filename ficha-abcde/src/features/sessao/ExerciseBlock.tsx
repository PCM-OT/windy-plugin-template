import { NumberInput } from '../../components/NumberInput';
import { formatReps } from '../../domain/format';
import { parseKg, parseReps } from '../../domain/numbers';
import type { LastSet } from '../../domain/session';
import type { ExerciseSnapshot, SetLog } from '../../domain/schemas';

interface Props {
  exercise: ExerciseSnapshot;
  index: number;
  total: number;
  sets: SetLog[];
  last: LastSet[] | undefined;
  open: boolean;
  done: boolean;
  onToggleOpen: () => void;
  onToggleSet: (idx: number) => void;
  onField: (idx: number, patch: { kg?: number | null; reps?: number | null }) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
}

const fmtSet = (s: { kg: number | null; reps: number | null }, noLoad: boolean) =>
  noLoad ? `${s.reps ?? '–'}` : `${s.kg ?? '–'}×${s.reps ?? '–'}`;

export function ExerciseBlock(p: Props) {
  const { exercise: e, sets } = p;
  const doneCount = sets.filter((s) => s.done).length;
  return (
    <section className={`card ex ${p.done ? 'ex-done' : ''}`} aria-label={e.name}>
      <button className="ex-head" aria-expanded={p.open} onClick={p.onToggleOpen}>
        <span className="grow">
          <span className="eyebrow block">
            Exercício {p.index + 1}/{p.total}
            {e.machine && ` · máq. ${e.machine}`}
          </span>
          <strong className="ex-name">
            {p.done && '✓ '}
            {e.name}
          </strong>
          {p.done && !p.open && (
            <span className="muted block">
              {sets.map((s) => fmtSet(s, e.noLoad)).join(' · ')}
            </span>
          )}
        </span>
        <span className="muted" aria-hidden="true">
          {doneCount}/{sets.length}
        </span>
      </button>

      {p.open && (
        <div className="ex-body">
          <p className="muted">
            Alvo: {formatReps(e.reps)} reps
            {p.last && p.last.length > 0 && (
              <>
                {' · '}
                <span>
                  Última vez: {p.last.map((s) => fmtSet(s, e.noLoad)).join(' · ')}
                </span>
              </>
            )}
          </p>
          {sets.map((s) => (
            <div key={s.idx} className={`set ${s.done ? 'set-done' : ''}`}>
              <span className="set-n" aria-hidden="true">
                {s.idx + 1}
              </span>
              {!e.noLoad && (
                <NumberInput
                  label={`Carga da série ${s.idx + 1} de ${e.name} (kg)`}
                  hideLabel
                  placeholder="kg"
                  inputMode="decimal"
                  value={s.kg}
                  parse={parseKg}
                  onChange={(kg) => p.onField(s.idx, { kg })}
                />
              )}
              <NumberInput
                label={`Repetições da série ${s.idx + 1} de ${e.name}`}
                hideLabel
                placeholder={e.reps ? String(e.reps.max) : 'reps'}
                value={s.reps}
                parse={parseReps}
                onChange={(reps) => p.onField(s.idx, { reps })}
              />
              <button
                className={`check-btn ${s.done ? 'is-done' : ''}`}
                aria-pressed={s.done}
                aria-label={`Série ${s.idx + 1} de ${e.name}`}
                onClick={() => p.onToggleSet(s.idx)}
              >
                <span aria-hidden="true">{s.done ? '✓' : ''}</span>
              </button>
            </div>
          ))}
          <div className="row">
            <button className="btn" onClick={p.onRemoveSet} disabled={sets.length <= 1}>
              − Série
            </button>
            <button className="btn" onClick={p.onAddSet}>
              + Série
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

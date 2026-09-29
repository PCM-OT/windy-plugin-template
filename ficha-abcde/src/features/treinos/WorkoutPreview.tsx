import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HowTo } from '../../components/HowTo';
import { hasHowTo } from '../../data/howto';
import { useAppData } from '../../data/appDataContext';
import { formatReps, formatRest } from '../../domain/format';
import { removeWorkout } from '../../domain/planEdit';
import type { WorkoutId } from '../../domain/schemas';

interface Props {
  id: WorkoutId;
  onBack: () => void;
  onEdit: () => void;
}

export function WorkoutPreview({ id, onBack, onEdit }: Props) {
  const { plan, savePlan, readOnly } = useAppData();
  const w = plan.workouts.find((x) => x.id === id);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!w) return null;

  return (
    <div className="screen">
      <button className="btn btn-link" onClick={onBack}>
        ← Treinos
      </button>
      <h1 className="big">
        Treino {w.id} · {w.name}
      </h1>
      <p className="muted">{w.muscles}</p>
      {w.exercises.length === 0 && (
        <p className="muted">
          Este treino ainda não tem exercícios. Toque em “Editar treino” para adicionar.
        </p>
      )}
      <ol className="list numbered">
        {w.exercises.map((e) => (
          <li key={e.id} className="card">
            <strong>{e.name}</strong>
            <p className="muted">
              {e.sets}×{formatReps(e.reps)}
              {e.machine && ` · máq. ${e.machine}`}
              {e.noLoad && ' · sem carga'} · descanso {formatRest(e.restSec)}
            </p>
            {e.reps === null && <span className="tag">a definir</span>}
            {hasHowTo(e.catalogId, e.note) && (
              <button
                className="btn btn-link"
                aria-expanded={open === e.id}
                onClick={() => setOpen(open === e.id ? null : e.id)}
              >
                Como fazer
              </button>
            )}
            {open === e.id && <HowTo catalogId={e.catalogId} note={e.note} />}
          </li>
        ))}
      </ol>
      <div className="row">
        <button className="btn" onClick={onEdit}>
          Editar treino
        </button>
        {plan.workouts.length > 1 && (
          <button
            className="btn btn-danger"
            disabled={readOnly}
            onClick={() => setConfirmDelete(true)}
          >
            Excluir treino
          </button>
        )}
      </div>
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Excluir o treino ${w.id}?`}
          message={`O treino “${w.name}” será removido da ficha. O histórico do que você já fez não muda.`}
          confirmLabel="Excluir"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            savePlan(removeWorkout(plan, w.id)).then(onBack, (e: unknown) =>
              setError(
                `Não foi possível excluir: ${e instanceof Error ? e.message : String(e)}`,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

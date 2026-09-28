import { useAppData } from '../../data/appDataContext';
import { formatReps, formatRest } from '../../domain/format';
import type { WorkoutId } from '../../domain/schemas';

interface Props {
  id: WorkoutId;
  onBack: () => void;
  onEdit: () => void;
}

export function WorkoutPreview({ id, onBack, onEdit }: Props) {
  const { plan } = useAppData();
  const w = plan.workouts.find((x) => x.id === id)!;
  return (
    <div className="screen">
      <button className="btn btn-link" onClick={onBack}>
        ← Treinos
      </button>
      <h1 className="big">
        Treino {w.id} · {w.name}
      </h1>
      <p className="muted">{w.muscles}</p>
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
          </li>
        ))}
      </ol>
      <div className="row">
        <button className="btn" onClick={onEdit}>
          Editar treino
        </button>
      </div>
    </div>
  );
}

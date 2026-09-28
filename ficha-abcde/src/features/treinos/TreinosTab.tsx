import { useAppData } from '../../data/appDataContext';
import { ProgressBar } from '../../components/ProgressBar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDayMonth, formatIsoDate } from '../../domain/format';
import { daysUntil, nextWorkoutFromHistory } from '../../domain/rules';
import type { WorkoutId } from '../../domain/schemas';
import { useState } from 'react';
import { requestNotificationPermission } from '../../pwa/alerts';

interface Props {
  onView: (id: WorkoutId) => void;
}

export function TreinosTab({ onView }: Props) {
  const { plan, sessions, now, resetPlan, startSession } = useAppData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start(id: WorkoutId) {
    // Permissão de notificação só depois de um toque do usuário (iniciar treino).
    void requestNotificationPermission();
    startSession(id).catch((e: unknown) =>
      setError(`Não foi possível iniciar: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  const next = nextWorkoutFromHistory(sessions);
  const nextWorkout = plan.workouts.find((w) => w.id === next)!;
  const days = daysUntil(plan.validUntil, now());

  const lastRun = (id: WorkoutId) => {
    let last: number | null = null;
    for (const s of sessions)
      if (s.workoutId === id && (last === null || s.startedAt > last)) last = s.startedAt;
    return last;
  };

  return (
    <div className="screen">
      <section className="card card-next" aria-labelledby="next-title">
        <p className="eyebrow">Próximo treino</p>
        <h2 id="next-title" className="big">
          Treino {nextWorkout.id} · {nextWorkout.name}
        </h2>
        <p className="muted">{nextWorkout.muscles}</p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => start(nextWorkout.id)}>
            Iniciar treino {nextWorkout.id}
          </button>
          <button className="btn" onClick={() => onView(nextWorkout.id)}>
            Ver
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="prog-title">
        <h2 id="prog-title" className="small">
          Sessões: {sessions.length}/{plan.totalSessions}
        </h2>
        <ProgressBar
          value={sessions.length}
          max={plan.totalSessions}
          label="Progresso das sessões"
        />
        <p className="muted">Ficha válida até {formatIsoDate(plan.validUntil)}</p>
        {days <= 14 && (
          <p className="warn" role="status">
            {days < 0
              ? `A ficha venceu há ${-days} ${-days === 1 ? 'dia' : 'dias'}. Peça uma nova ao professor.`
              : days === 0
                ? 'A ficha vence hoje.'
                : `A ficha vence em ${days} ${days === 1 ? 'dia' : 'dias'}.`}
          </p>
        )}
      </section>

      <h2 className="small section-title">Treinos</h2>
      <ul className="list">
        {plan.workouts.map((w) => {
          const last = lastRun(w.id);
          return (
            <li key={w.id}>
              <button
                className="row-btn"
                onClick={() => onView(w.id)}
                aria-label={`Treino ${w.id}, ${w.name}`}
              >
                <span className="letter" aria-hidden="true">
                  {w.id}
                </span>
                <span className="grow">
                  <strong>{w.name}</strong>
                  <span className="muted block">
                    {w.exercises.length} exercícios ·{' '}
                    {last ? `último: ${formatDayMonth(last)}` : 'ainda não feito'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button className="btn btn-link" onClick={() => setConfirmReset(true)}>
        Restaurar ficha original
      </button>
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      {confirmReset && (
        <ConfirmDialog
          title="Restaurar ficha original?"
          message="Suas edições nos treinos serão perdidas. O histórico não muda."
          confirmLabel="Restaurar"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            resetPlan().catch((e: unknown) =>
              setError(
                `Não foi possível restaurar: ${e instanceof Error ? e.message : String(e)}`,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

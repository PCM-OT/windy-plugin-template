import { useState } from 'react';
import { ProgressBar } from '../../components/ProgressBar';
import { useAppData } from '../../data/appDataContext';
import { formatDayMonth, formatIsoDate } from '../../domain/format';
import { addWorkout } from '../../domain/planEdit';
import { daysUntil, nextWorkoutFromHistory } from '../../domain/rules';
import type { WorkoutId } from '../../domain/schemas';
import { requestNotificationPermission } from '../../pwa/alerts';

interface Props {
  onView: (id: WorkoutId) => void;
  onEdit: (id: WorkoutId) => void;
  onTemplates: () => void;
  onScratch: () => void;
  onMeta: () => void;
}

export function TreinosTab({ onView, onEdit, onTemplates, onScratch, onMeta }: Props) {
  const { plan, sessions, now, startSession, savePlan, readOnly } = useAppData();
  const [error, setError] = useState<string | null>(null);

  // Ficha nunca escolhida (ainda é o exemplo que veio com o app) e sem treinos feitos: convida a escolher.
  const onboarding = plan.updatedAt === 0 && sessions.length === 0;

  function start(id: WorkoutId) {
    // Permissão de notificação só depois de um toque do usuário (iniciar treino).
    void requestNotificationPermission();
    startSession(id).catch((e: unknown) =>
      setError(`Não foi possível iniciar: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  async function newWorkout() {
    const r = addWorkout(plan);
    if (!r) return;
    try {
      await savePlan(r.plan);
      onEdit(r.id);
    } catch (e) {
      setError(
        `Não foi possível criar o treino: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const order = plan.workouts.map((w) => w.id);
  const next = nextWorkoutFromHistory(sessions, order);
  const nextWorkout = plan.workouts.find((w) => w.id === next) ?? plan.workouts[0]!;
  const nextEmpty = nextWorkout.exercises.length === 0;
  const days = plan.validUntil ? daysUntil(plan.validUntil, now()) : null;

  const lastRun = (id: WorkoutId) => {
    let last: number | null = null;
    for (const s of sessions)
      if (s.workoutId === id && (last === null || s.startedAt > last)) last = s.startedAt;
    return last;
  };

  return (
    <div className="screen">
      {onboarding && (
        <section className="card card-next" aria-labelledby="onb-title">
          <p className="eyebrow">Bem-vindo</p>
          <h2 id="onb-title" className="big">
            Escolha sua ficha
          </h2>
          <p className="muted">
            Veja fichas prontas baseadas em diretrizes e estudos, monte a sua com
            exercícios do catálogo (com dicas de execução) ou continue com a ficha de
            exemplo que já está aqui.
          </p>
          <div className="row">
            <button className="btn btn-primary" onClick={onTemplates}>
              Ver fichas prontas
            </button>
            <button className="btn" onClick={onScratch}>
              Montar do zero
            </button>
          </div>
          <button
            className="btn btn-link"
            disabled={readOnly}
            onClick={() => void savePlan(plan).catch((e: unknown) => setError(String(e)))}
          >
            Manter a ficha de exemplo
          </button>
        </section>
      )}

      <section className="card card-next" aria-labelledby="next-title">
        <p className="eyebrow">Próximo treino · {plan.name}</p>
        <h2 id="next-title" className="big">
          Treino {nextWorkout.id} · {nextWorkout.name}
        </h2>
        <p className="muted">
          {nextWorkout.muscles || (nextEmpty ? 'Ainda sem exercícios.' : '')}
        </p>
        <div className="row">
          {nextEmpty ? (
            <button className="btn btn-primary" onClick={() => onEdit(nextWorkout.id)}>
              Adicionar exercícios
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={readOnly}
              onClick={() => start(nextWorkout.id)}
            >
              Iniciar treino {nextWorkout.id}
            </button>
          )}
          <button className="btn" onClick={() => onView(nextWorkout.id)}>
            Ver
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="prog-title">
        <h2 id="prog-title" className="small">
          {plan.totalSessions
            ? `Sessões: ${sessions.length}/${plan.totalSessions}`
            : `Sessões feitas: ${sessions.length}`}
        </h2>
        {plan.totalSessions && (
          <ProgressBar
            value={sessions.length}
            max={plan.totalSessions}
            label="Progresso das sessões"
          />
        )}
        {plan.validUntil && (
          <p className="muted">Ficha válida até {formatIsoDate(plan.validUntil)}</p>
        )}
        {days !== null && days <= 14 && (
          <p className="warn" role="status">
            {days < 0
              ? `A ficha venceu há ${-days} ${-days === 1 ? 'dia' : 'dias'}. Peça uma nova ao professor ou escolha outra ficha.`
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
                    {w.exercises.length}{' '}
                    {w.exercises.length === 1 ? 'exercício' : 'exercícios'} ·{' '}
                    {last ? `último: ${formatDayMonth(last)}` : 'ainda não feito'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="row">
        {plan.workouts.length < 7 && (
          <button className="btn" disabled={readOnly} onClick={() => void newWorkout()}>
            + Novo treino
          </button>
        )}
        <button className="btn" onClick={onTemplates}>
          Fichas prontas
        </button>
        <button className="btn" onClick={onMeta}>
          Dados da ficha
        </button>
      </div>
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

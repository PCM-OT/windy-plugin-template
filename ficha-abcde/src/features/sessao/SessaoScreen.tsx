import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAppData } from '../../data/appDataContext';
import { formatClock } from '../../domain/format';
import { restRemainingMs } from '../../domain/rules';
import {
  addSet,
  adjustRest,
  exerciseDone,
  finishSummary,
  lastSetsByExercise,
  removeLastSet,
  nextPending,
  restNextLabel,
  setField,
  setNote,
  skipRest,
  toggleSet,
} from '../../domain/session';
import type { ActiveSession } from '../../domain/schemas';
import { createAlerts } from '../../pwa/alerts';
import type { Alerts } from '../../pwa/alerts';
import { useWakeLock } from '../../pwa/wakeLock';
import { ExerciseBlock } from './ExerciseBlock';
import { FinishDialog } from './FinishDialog';
import { RestBar } from './RestBar';
import { useSession, useTicker } from './useSession';

interface Props {
  initial: ActiveSession;
  /** Injetável nos testes. */
  alerts?: Alerts;
}

export function SessaoScreen({ initial, alerts: alertsProp }: Props) {
  const { repo, sessions, now: clock, finishSession, discardSession } = useAppData();
  const { session, ref, update, saveError, closeSaver } = useSession(initial, repo);
  const [now, setNow] = useState(clock);
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const alertedFor = useRef<number | null>(null);

  const alerts = useMemo(
    () => alertsProp ?? createAlerts(() => repo.getSettings()),
    [alertsProp, repo],
  );
  const last = useMemo(() => lastSetsByExercise(sessions), [sessions]);
  useWakeLock(true);

  // Cada fim de descanso apita uma vez, mesmo que o timer e o "voltei para o app" cheguem juntos.
  const alertOnce = useCallback(
    (endAt: number) => {
      if (alertedFor.current === endAt) return;
      alertedFor.current = endAt;
      void alerts.finished();
    },
    [alerts],
  );

  useTicker(clock, (t) => {
    setNow(t);
    const r = ref.current.rest;
    if (r && t >= r.endAt) {
      alertOnce(r.endAt);
      update((s) => (s.rest?.endAt === r.endAt ? { ...s, rest: null } : s));
    }
  });

  // Reforço em segundo plano: um timeout no instante exato (o app pode estar oculto).
  const restEndAt = session.rest?.endAt ?? null;
  useEffect(() => {
    if (restEndAt === null) return;
    const id = setTimeout(() => alertOnce(restEndAt), Math.max(0, restEndAt - clock()));
    return () => clearTimeout(id);
  }, [restEndAt, alertOnce, clock]);

  const rest = session.rest;
  const remaining = rest ? restRemainingMs(rest.endAt, now, rest.totalMs) : 0;
  const summary = finishSummary(session, now);
  // Só o exercício atual começa aberto; os concluídos recolhem e os seguintes esperam.
  const currentId = nextPending(session)?.exercise.id;

  async function confirmFinish() {
    setBusy(true);
    setActionError(null);
    try {
      closeSaver(); // nada mais é gravado depois; o estado em memória vai direto ao histórico
      await finishSession(ref.current);
    } catch (e) {
      setActionError(
        `Não foi possível finalizar: ${e instanceof Error ? e.message : String(e)}. Tente de novo.`,
      );
      setBusy(false);
    }
  }

  async function confirmDiscard() {
    try {
      closeSaver();
      await discardSession();
    } catch (e) {
      setDiscarding(false);
      setActionError(
        `Não foi possível descartar: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return (
    <div className={`app session ${rest ? 'has-rest' : ''}`}>
      <header className="topbar sess-top">
        <div>
          <span className="brand">Treino {session.workoutId}</span>
          <span className="muted block" aria-label="Tempo total do treino">
            {formatClock(summary.durationMs / 1000)}
          </span>
        </div>
        <div className="row">
          <button className="btn btn-danger" onClick={() => setDiscarding(true)}>
            Descartar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setNow(clock());
              setFinishing(true);
            }}
          >
            Finalizar
          </button>
        </div>
      </header>

      {saveError && (
        <p className="warn banner" role="alert">
          Não foi possível salvar no aparelho ({saveError}). Tentando de novo…
        </p>
      )}
      {actionError && (
        <p className="warn banner" role="alert">
          {actionError}
        </p>
      )}

      <main className="screen">
        {session.exercises.map((e, i) => {
          const done = exerciseDone(session, e.id);
          return (
            <ExerciseBlock
              key={e.id}
              exercise={e}
              index={i}
              total={session.exercises.length}
              sets={session.sets.filter((s) => s.exerciseId === e.id)}
              last={last.get(e.id)}
              done={done}
              open={override[e.id] ?? e.id === currentId}
              onToggleOpen={() =>
                setOverride((o) => ({ ...o, [e.id]: !(o[e.id] ?? e.id === currentId) }))
              }
              onToggleSet={(idx) => {
                alerts.prime(); // gesto do usuário libera o áudio do alerta
                update((s) => toggleSet(s, e.id, idx, clock()));
                setOverride((o) => {
                  const { [e.id]: _drop, ...rest } = o;
                  return rest;
                });
              }}
              onField={(idx, patch) => update((s) => setField(s, e.id, idx, patch))}
              onAddSet={() => update((s) => addSet(s, e.id))}
              onRemoveSet={() => update((s) => removeLastSet(s, e.id))}
            />
          );
        })}
        <label className="field card">
          <span>Anotação do treino</span>
          <textarea
            rows={3}
            maxLength={2000}
            value={session.note}
            onChange={(ev) => update((s) => setNote(s, ev.target.value))}
          />
        </label>
      </main>

      {rest && (
        <RestBar
          remainingMs={remaining}
          totalMs={rest.totalMs}
          nextLabel={restNextLabel(session)}
          onAdjust={(d) => update((s) => adjustRest(s, d))}
          onSkip={() => update(skipRest)}
        />
      )}

      {finishing && (
        <FinishDialog
          {...summary}
          busy={busy}
          error={actionError}
          onCancel={() => setFinishing(false)}
          onConfirm={() => void confirmFinish()}
        />
      )}
      {discarding && (
        <ConfirmDialog
          title="Descartar treino?"
          message="Tudo o que foi registrado neste treino será apagado. Isso não pode ser desfeito."
          confirmLabel="Descartar"
          danger
          onCancel={() => setDiscarding(false)}
          onConfirm={() => void confirmDiscard()}
        />
      )}
    </div>
  );
}

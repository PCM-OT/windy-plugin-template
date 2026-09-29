import { useState } from 'react';
import { useAppData } from '../../data/appDataContext';
import { NumberInput } from '../../components/NumberInput';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { parseReps } from '../../domain/numbers';
import {
  addCatalogExercise,
  addCustomExercise,
  moveExercise,
  removeExercise,
  replaceWorkout,
  updateExercise,
  validateWorkout,
} from '../../domain/planEdit';
import { LIMITS } from '../../domain/schemas';
import { ExercisePicker } from './ExercisePicker';
import type { WorkoutId } from '../../domain/schemas';

interface Props {
  id: WorkoutId;
  onDone: () => void;
}

export function WorkoutEditor({ id, onDone }: Props) {
  const { plan, savePlan, readOnly } = useAppData();
  const [w, setW] = useState(() => plan.workouts.find((x) => x.id === id)!);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const dirty =
    JSON.stringify(w) !== JSON.stringify(plan.workouts.find((x) => x.id === id));

  async function save() {
    const errs = validateWorkout(w);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePlan(replaceWorkout(plan, w));
      onDone();
    } catch (e) {
      // Nunca engolir em silêncio: o usuário vê o aviso e pode tentar de novo.
      setSaveError(
        `Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}. Tente de novo.`,
      );
    } finally {
      setSaving(false);
    }
  }

  const patch = (exId: string, p: Parameters<typeof updateExercise>[2]) =>
    setW((cur) => updateExercise(cur, exId, p));
  const toRemove = w.exercises.find((e) => e.id === removing);

  return (
    <div className="screen">
      <h1 className="big">Editar treino {w.id}</h1>
      <label className="field">
        <span>Nome</span>
        <input
          value={w.name}
          onChange={(e) => setW({ ...w, name: e.target.value })}
          maxLength={80}
        />
      </label>
      <label className="field">
        <span>Grupos musculares</span>
        <input
          value={w.muscles}
          onChange={(e) => setW({ ...w, muscles: e.target.value })}
          maxLength={120}
        />
      </label>

      <ol className="list numbered">
        {w.exercises.map((e, i) => (
          <li key={e.id} className="card editor-ex">
            <label className="field">
              <span>Exercício {i + 1}</span>
              <input
                value={e.name}
                maxLength={120}
                onChange={(ev) => patch(e.id, { name: ev.target.value })}
              />
            </label>
            <div className="grid">
              <NumberInput
                label="Séries"
                value={e.sets}
                parse={(s) => {
                  const n = parseReps(s);
                  return n !== null && n >= 1 && n <= LIMITS.setsMax ? n : null;
                }}
                onChange={(n) => n !== null && patch(e.id, { sets: n })}
              />
              <NumberInput
                label="Descanso (s)"
                value={e.restSec}
                parse={(s) => {
                  const n = parseReps(s);
                  return n !== null && n <= LIMITS.restMaxSec ? n : null;
                }}
                onChange={(n) => n !== null && patch(e.id, { restSec: n })}
              />
              <label className="field">
                <span>Máquina nº</span>
                <input
                  value={e.machine ?? ''}
                  maxLength={10}
                  inputMode="numeric"
                  onChange={(ev) =>
                    patch(e.id, {
                      machine: ev.target.value.trim() === '' ? null : ev.target.value,
                    })
                  }
                />
              </label>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={e.reps === null}
                onChange={(ev) =>
                  patch(e.id, { reps: ev.target.checked ? null : { min: 10, max: 12 } })
                }
              />
              <span>Repetições a definir</span>
            </label>
            {e.reps && (
              <div className="grid">
                <NumberInput
                  label="Reps mín."
                  value={e.reps.min}
                  parse={(s) => {
                    const n = parseReps(s);
                    return n !== null && n >= 1 ? n : null;
                  }}
                  onChange={(n) =>
                    n !== null &&
                    e.reps &&
                    patch(e.id, { reps: { min: n, max: Math.max(n, e.reps.max) } })
                  }
                />
                <NumberInput
                  label="Reps máx."
                  value={e.reps.max}
                  parse={parseReps}
                  onChange={(n) =>
                    n !== null &&
                    e.reps &&
                    patch(e.id, { reps: { min: Math.min(e.reps.min, n), max: n } })
                  }
                />
              </div>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={e.noLoad}
                onChange={(ev) => patch(e.id, { noLoad: ev.target.checked })}
              />
              <span>Sem carga (mobilidade)</span>
            </label>
            <label className="field">
              <span>Anotação ou dica (opcional)</span>
              <input
                value={e.note}
                maxLength={500}
                onChange={(ev) => patch(e.id, { note: ev.target.value })}
              />
            </label>
            <div className="row">
              <button
                className="btn"
                aria-label={`Subir ${e.name}`}
                disabled={i === 0}
                onClick={() => setW(moveExercise(w, i, i - 1))}
              >
                ↑
              </button>
              <button
                className="btn"
                aria-label={`Descer ${e.name}`}
                disabled={i === w.exercises.length - 1}
                onClick={() => setW(moveExercise(w, i, i + 1))}
              >
                ↓
              </button>
              <button
                className="btn btn-danger"
                aria-label={`Remover ${e.name}`}
                onClick={() => setRemoving(e.id)}
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ol>

      <button className="btn" onClick={() => setPicking(true)}>
        + Adicionar exercício
      </button>

      {errors.length > 0 && (
        <ul className="warn" role="alert">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {saveError && (
        <p className="warn" role="alert">
          {saveError}
        </p>
      )}

      <div className="row sticky-actions">
        <button className="btn" onClick={onDone}>
          {dirty ? 'Descartar' : 'Voltar'}
        </button>
        <button
          className="btn btn-primary"
          disabled={saving || !dirty || readOnly}
          onClick={() => void save()}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {picking && (
        <ExercisePicker
          onAddCatalog={(c) => setW((cur) => addCatalogExercise(cur, c))}
          onAddCustom={(input) => setW((cur) => addCustomExercise(cur, input))}
          onClose={() => setPicking(false)}
        />
      )}

      {toRemove && (
        <ConfirmDialog
          title="Remover exercício?"
          message={`"${toRemove.name}" será removido deste treino.`}
          confirmLabel="Remover"
          danger
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            setW(removeExercise(w, toRemove.id));
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { useAppData } from '../../data/appDataContext';

/** Nome da ficha, meta de sessões e validade (os dois últimos são opcionais). */
export function PlanMetaEditor({ onDone }: { onDone: () => void }) {
  const { plan, savePlan, readOnly } = useAppData();
  const [name, setName] = useState(plan.name);
  const [goal, setGoal] = useState(
    plan.totalSessions === null ? '' : String(plan.totalSessions),
  );
  const [until, setUntil] = useState(plan.validUntil ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goalOk =
    goal.trim() === '' ||
    (/^\d+$/.test(goal.trim()) && Number(goal) >= 1 && Number(goal) <= 1000);
  const dateOk = until === '' || /^\d{4}-\d{2}-\d{2}$/.test(until);
  const valid = name.trim() !== '' && goalOk && dateOk;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await savePlan({
        ...plan,
        name: name.trim(),
        totalSessions: goal.trim() === '' ? null : Number(goal),
        validUntil: until === '' ? null : until,
      });
      onDone();
    } catch (e) {
      setError(`Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="big">Dados da ficha</h1>
      <label className="field">
        <span>Nome da ficha</span>
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Meta de sessões (opcional)</span>
        <input
          inputMode="numeric"
          value={goal}
          aria-invalid={!goalOk || undefined}
          onChange={(e) => setGoal(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Validade da ficha (opcional)</span>
        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
      </label>
      {plan.source && (
        <p className="muted">Baseada na ficha pronta “{plan.source.title}”.</p>
      )}
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      <div className="row sticky-actions">
        <button className="btn" onClick={onDone}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          disabled={!valid || busy || readOnly}
          onClick={() => void save()}
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

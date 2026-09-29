import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HowTo } from '../../components/HowTo';
import { hasHowTo } from '../../data/howto';
import { SourcesList } from '../../components/SourcesList';
import { getTemplate, planFromTemplate } from '../../data/templates';
import { useAppData } from '../../data/appDataContext';
import { formatReps, formatRest } from '../../domain/format';

interface Props {
  id: string;
  onBack: () => void;
  onApplied: () => void;
}

export function TemplateDetail({ id, onBack, onApplied }: Props) {
  const { plan, savePlan, now, readOnly } = useAppData();
  const tpl = getTemplate(id);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tpl) {
    return (
      <div className="screen">
        <button className="btn btn-link" onClick={onBack}>
          ← Fichas prontas
        </button>
        <p>Ficha não encontrada.</p>
      </div>
    );
  }

  // Ficha nunca escolhida/editada (updatedAt 0) ou vazia: pode trocar sem aviso.
  const hasOwn = plan.updatedAt > 0 && plan.workouts.some((w) => w.exercises.length > 0);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      await savePlan(planFromTemplate(tpl!, now()));
      onApplied();
    } catch (e) {
      setError(`Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn btn-link" onClick={onBack}>
        ← Fichas prontas
      </button>
      <h1 className="big">{tpl.title}</h1>
      <p className="chips-static">
        <span className="tag">{tpl.level}</span>
        <span className="tag">{tpl.place}</span>
        <span className="tag">
          {tpl.daysPerWeek} {tpl.daysPerWeek === 1 ? 'dia' : 'dias'} por semana
        </span>
        {tpl.totalSessions && <span className="tag">{tpl.totalSessions} sessões</span>}
      </p>
      <p>{tpl.summary}</p>
      <p className="muted">Objetivo: {tpl.goal}</p>
      {tpl.notes && <p className="muted">{tpl.notes}</p>}

      {tpl.workouts.map((w) => (
        <section key={w.id} className="card" aria-label={`Treino ${w.id}: ${w.name}`}>
          <h2 className="small">
            Treino {w.id} · {w.name}
          </h2>
          <p className="muted">{w.muscles}</p>
          <ol className="list numbered">
            {w.exercises.map((e) => {
              const key = `${w.id}:${e.id}`;
              return (
                <li key={key}>
                  <strong>{e.name}</strong>
                  <span className="muted block">
                    {e.sets}×{formatReps(e.reps)}
                    {e.machine && ` · máq. ${e.machine}`} · descanso{' '}
                    {formatRest(e.restSec)}
                  </span>
                  {hasHowTo(e.catalogId, e.note) && (
                    <button
                      className="btn btn-link"
                      aria-expanded={open === key}
                      onClick={() => setOpen(open === key ? null : key)}
                    >
                      Como fazer
                    </button>
                  )}
                  {open === key && <HowTo catalogId={e.catalogId} note={e.note} />}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <h2 className="small section-title">Em que esta ficha se baseia</h2>
      {tpl.basedOn.length > 0 ? (
        <SourcesList ids={tpl.basedOn} />
      ) : (
        <p className="muted">Ficha de exemplo, sem base em diretriz.</p>
      )}

      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      <div className="row sticky-actions">
        <button className="btn" onClick={onBack}>
          Voltar
        </button>
        <button
          className="btn btn-primary"
          disabled={busy || readOnly}
          onClick={() => (hasOwn ? setConfirm(true) : void apply())}
        >
          {busy ? 'Salvando…' : 'Usar esta ficha'}
        </button>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Trocar a sua ficha?"
          message={`Sua ficha atual (“${plan.name}”) será substituída por “${tpl.title}”. O seu histórico de treinos não muda. Se quiser guardar a ficha atual, exporte um backup em Ajustes antes.`}
          confirmLabel="Usar esta ficha"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            void apply();
          }}
        />
      )}
    </div>
  );
}

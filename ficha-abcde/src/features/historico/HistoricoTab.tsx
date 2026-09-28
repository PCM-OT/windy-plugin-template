import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LineChart } from '../../components/LineChart';
import { useAppData } from '../../data/appDataContext';
import { formatClock, formatDateTime, formatMonth } from '../../domain/format';
import {
  calendarWeeks,
  chartExercises,
  groupByMonth,
  loadSeries,
  summaryStats,
} from '../../domain/history';
import { sessionVolume, setsSummary } from '../../domain/rules';
import type { Session } from '../../domain/schemas';

const PAGE = 50; // acima disso a lista pagina: nada de renderizar centenas de itens de uma vez
const DOW = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function HistoricoTab() {
  const { sessions, now, deleteSession, readOnly } = useAppData();
  const [exId, setExId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => summaryStats(sessions, now()), [sessions, now]);
  const weeks = useMemo(() => calendarWeeks(sessions, now()), [sessions, now]);
  const exercises = useMemo(() => chartExercises(sessions), [sessions]);
  const selected = exercises.find((e) => e.id === exId) ?? exercises[0];
  const series = useMemo(
    () => (selected ? loadSeries(sessions, selected.id) : []),
    [sessions, selected],
  );
  const groups = useMemo(
    () =>
      groupByMonth(
        sessions
          .slice()
          .sort((a, b) => b.startedAt - a.startedAt)
          .slice(0, shown),
      ),
    [sessions, shown],
  );

  if (sessions.length === 0) {
    return (
      <div className="screen">
        <section className="card">
          <h2 className="small">Nenhum treino ainda</h2>
          <p className="muted">
            Quando você finalizar um treino, ele aparece aqui, com a evolução das cargas.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <dl className="stats card" aria-label="Resumo">
        <div>
          <dt>Sessões</dt>
          <dd>{stats.total}</dd>
        </div>
        <div>
          <dt>Na semana</dt>
          <dd>{stats.thisWeek}</dd>
        </div>
        <div>
          <dt>Duração média</dt>
          <dd>{formatClock(stats.avgDurationMs / 1000)}</dd>
        </div>
      </dl>

      <section className="card" aria-labelledby="cal-title">
        <h2 id="cal-title" className="small">
          Últimas 5 semanas
        </h2>
        <table className="cal">
          <thead>
            <tr>
              {DOW.map((d, i) => (
                <th key={i} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w[0]!.key}>
                {w.map((d) => (
                  <td
                    key={d.key}
                    className={`${d.letters ? 'cal-on' : ''} ${d.isToday ? 'cal-today' : ''} ${d.isFuture ? 'cal-future' : ''}`}
                    aria-label={`${d.dayOfMonth}${d.letters ? `, treino ${d.letters}` : ''}${d.isToday ? ', hoje' : ''}`}
                  >
                    <span className="cal-day">{d.dayOfMonth}</span>
                    <span className="cal-letter">{d.letters}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" aria-labelledby="evo-title">
        <h2 id="evo-title" className="small">
          Evolução da carga
        </h2>
        {selected ? (
          <>
            <label className="field">
              <span>Exercício</span>
              <select value={selected.id} onChange={(e) => setExId(e.target.value)}>
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <LineChart points={series} label={`Carga máxima em ${selected.name}`} />
          </>
        ) : (
          <p className="muted">Registre cargas em um treino para ver a evolução.</p>
        )}
      </section>

      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      {groups.map((g) => (
        <section key={g.key} aria-label={formatMonth(g.key)}>
          <h2 className="small section-title">{formatMonth(g.key)}</h2>
          <ul className="list">
            {g.sessions.map((s) => (
              <SessionItem
                key={s.id}
                s={s}
                open={open === s.id}
                onToggle={() => setOpen(open === s.id ? null : s.id)}
                onDelete={() => setToDelete(s)}
                canDelete={!readOnly}
              />
            ))}
          </ul>
        </section>
      ))}
      {shown < sessions.length && (
        <button className="btn" onClick={() => setShown((n) => n + PAGE)}>
          Mostrar mais ({sessions.length - shown} restantes)
        </button>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir este treino?"
          message={`O treino ${toDelete.workoutId} de ${formatDateTime(toDelete.startedAt)} será removido do histórico. Isso não pode ser desfeito.`}
          confirmLabel="Excluir"
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            const id = toDelete.id;
            setToDelete(null);
            deleteSession(id).catch((e: unknown) =>
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

function SessionItem(p: {
  s: Session;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { s } = p;
  const sum = setsSummary(s.sets);
  return (
    <li className="card hist-item">
      <button className="hist-head" aria-expanded={p.open} onClick={p.onToggle}>
        <span className="letter" aria-hidden="true">
          {s.workoutId}
        </span>
        <span className="grow">
          <strong>Treino {s.workoutId}</strong>
          <span className="muted block">
            {formatDateTime(s.startedAt)} ·{' '}
            {formatClock((s.endedAt - s.startedAt) / 1000)} · {sum.done}/{sum.total}{' '}
            séries
          </span>
        </span>
      </button>
      {p.open && (
        <div className="hist-body">
          <p className="muted">
            Volume: {Math.round(sessionVolume(s.sets)).toLocaleString('pt-BR')} kg
          </p>
          {s.exercises.map((e) => {
            const sets = s.sets.filter((x) => x.exerciseId === e.id);
            if (sets.length === 0) return null;
            return (
              <div key={e.id} className="hist-ex">
                <strong>{e.name}</strong>
                <ul className="hist-sets">
                  {sets.map((x) => (
                    <li key={x.idx} className={x.done ? '' : 'not-done'}>
                      {x.done
                        ? e.noLoad
                          ? `${x.reps ?? '–'} reps`
                          : `${x.kg ?? '–'} kg × ${x.reps ?? '–'}`
                        : 'não feita'}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {s.note && <p className="note">“{s.note}”</p>}
          <button className="btn btn-danger" disabled={!p.canDelete} onClick={p.onDelete}>
            Excluir treino
          </button>
        </div>
      )}
    </li>
  );
}

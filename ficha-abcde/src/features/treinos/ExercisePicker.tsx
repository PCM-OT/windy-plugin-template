import { useEffect, useMemo, useRef, useState } from 'react';
import { HowTo } from '../../components/HowTo';
import { MUSCLE_GROUPS, searchCatalog } from '../../data/catalog';
import type { CatalogExercise, MuscleGroup } from '../../data/catalog';

interface Props {
  onAddCatalog: (c: CatalogExercise) => void;
  onAddCustom: (input: { name: string; note: string }) => void;
  onClose: () => void;
}

/** Escolha de exercícios avulsos: catálogo com busca/filtro e dicas, ou criação manual. */
export function ExercisePicker({ onAddCatalog, onAddCustom, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    if (d && !d.showModal) d.setAttribute('open', '');
  }, []);

  const results = useMemo(() => searchCatalog(query, group), [query, group]);

  function add(c: CatalogExercise) {
    onAddCatalog(c);
    setCount((n) => n + 1);
    setAdded(c.name);
  }

  function addManual() {
    const n = name.trim();
    if (!n) return;
    onAddCustom({ name: n, note });
    setCount((c) => c + 1);
    setAdded(n);
    setName('');
    setNote('');
    setManual(false);
  }

  return (
    <dialog
      ref={ref}
      className="dialog sheet"
      aria-labelledby="pick-title"
      onCancel={onClose}
    >
      <div className="sheet-head">
        <h2 id="pick-title" className="small">
          Adicionar exercício
        </h2>
        <button className="btn btn-primary" onClick={onClose}>
          {count > 0 ? `Concluir (${count})` : 'Fechar'}
        </button>
      </div>

      <p className="muted" role="status" aria-live="polite">
        {added
          ? `✓ “${added}” foi adicionado ao treino.`
          : 'Escolha na lista, ou crie o seu no final da página.'}
      </p>

      <label className="field">
        <span>Buscar exercício</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </label>

      <div className="chips" role="group" aria-label="Filtrar por grupo muscular">
        <button
          className={`chip ${group === null ? 'is-on' : ''}`}
          aria-pressed={group === null}
          onClick={() => setGroup(null)}
        >
          Todos
        </button>
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g}
            className={`chip ${group === g ? 'is-on' : ''}`}
            aria-pressed={group === g}
            onClick={() => setGroup(group === g ? null : g)}
          >
            {g}
          </button>
        ))}
      </div>

      <p className="muted">
        {results.length} {results.length === 1 ? 'exercício' : 'exercícios'}
      </p>
      <ul className="list">
        {results.map((c) => (
          <li key={c.id} className="card pick-item">
            <div>
              <strong>{c.name}</strong>
              <span className="muted block">
                {c.group} · {c.equipment}
              </span>
            </div>
            <div className="row">
              <button
                className="btn"
                aria-expanded={open === c.id}
                onClick={() => setOpen(open === c.id ? null : c.id)}
              >
                Como fazer
              </button>
              <button
                className="btn btn-primary"
                aria-label={`Adicionar ${c.name}`}
                onClick={() => add(c)}
              >
                Adicionar
              </button>
            </div>
            {open === c.id && <HowTo catalogId={c.id} />}
          </li>
        ))}
      </ul>

      <section className="card" aria-labelledby="manual-title">
        <h3 id="manual-title" className="small">
          Não achou o exercício?
        </h3>
        {!manual ? (
          <button
            className="btn"
            onClick={() => {
              setManual(true);
              if (!name) setName(query.trim());
            }}
          >
            Criar exercício manualmente
          </button>
        ) : (
          <div className="stack">
            <label className="field">
              <span>Nome do exercício</span>
              <input
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Sua anotação ou dica (opcional)</span>
              <textarea
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="row">
              <button className="btn" onClick={() => setManual(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={!name.trim()}
                onClick={addManual}
              >
                Adicionar ao treino
              </button>
            </div>
          </div>
        )}
      </section>
    </dialog>
  );
}

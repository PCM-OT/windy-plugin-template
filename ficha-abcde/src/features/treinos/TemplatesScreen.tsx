import { TEMPLATES } from '../../data/templates';
import { SourcesList } from '../../components/SourcesList';

interface Props {
  onBack: () => void;
  onOpen: (id: string) => void;
  onScratch: () => void;
  /** Primeiro acesso: título de boas-vindas. */
  first?: boolean;
}

export function TemplatesScreen({ onBack, onOpen, onScratch, first }: Props) {
  return (
    <div className="screen">
      <button className="btn btn-link" onClick={onBack}>
        ← Treinos
      </button>
      <h1 className="big">{first ? 'Escolha sua ficha' : 'Fichas prontas'}</h1>
      <p className="muted">
        Modelos montados a partir de diretrizes e estudos (as fontes aparecem em cada
        ficha). Depois de escolher, você pode editar tudo: trocar exercícios, séries,
        descansos e criar os seus.
      </p>

      <ul className="list">
        {TEMPLATES.map((t) => (
          <li key={t.id} className="card tpl">
            <h2 className="small">{t.title}</h2>
            <p className="chips-static">
              <span className="tag">{t.level}</span>
              <span className="tag">{t.place}</span>
              <span className="tag">
                {t.daysPerWeek} {t.daysPerWeek === 1 ? 'dia' : 'dias'} por semana
              </span>
            </p>
            <p>{t.summary}</p>
            <button
              className="btn btn-primary"
              aria-label={`Ver a ficha ${t.title}`}
              onClick={() => onOpen(t.id)}
            >
              Ver ficha
            </button>
          </li>
        ))}
      </ul>

      <section className="card" aria-labelledby="scratch-title">
        <h2 id="scratch-title" className="small">
          Prefere montar a sua?
        </h2>
        <p className="muted">
          Comece com um treino vazio e adicione exercícios do catálogo (com dicas de
          execução) ou crie os seus.
        </p>
        <button className="btn" onClick={onScratch}>
          Montar do zero
        </button>
      </section>

      <h2 className="small section-title">Fontes e referências</h2>
      <SourcesList />
    </div>
  );
}

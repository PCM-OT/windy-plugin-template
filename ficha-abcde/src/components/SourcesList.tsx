import { DISCLAIMER, SOURCES, getSource } from '../data/sources';
import type { Source } from '../data/sources';

/** Lista de fontes com link. Sem `ids`, mostra todas. */
export function SourcesList({
  ids,
  showDisclaimer = true,
}: {
  ids?: string[];
  showDisclaimer?: boolean;
}) {
  const list: Source[] = ids
    ? ids.map(getSource).filter((s): s is Source => Boolean(s))
    : [...SOURCES];
  if (list.length === 0) return null;
  return (
    <div>
      <ul className="list sources">
        {list.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
            <span className="muted block">{s.detail}</span>
          </li>
        ))}
      </ul>
      {showDisclaimer && <p className="muted">{DISCLAIMER}</p>}
    </div>
  );
}

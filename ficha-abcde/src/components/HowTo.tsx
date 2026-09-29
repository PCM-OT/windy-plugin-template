import { getCatalogExercise } from '../data/catalog';

/** Como fazer + dicas (do catálogo) e a anotação do próprio usuário. Tudo local: funciona offline. */
export function HowTo({
  catalogId,
  note,
}: {
  catalogId: string | null | undefined;
  note?: string;
}) {
  const c = getCatalogExercise(catalogId);
  if (!c && !note?.trim()) return null;
  return (
    <div className="howto">
      {c && (
        <>
          <p className="howto-title">Como fazer</p>
          <ol>
            {c.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="howto-title">Dicas e erros comuns</p>
          <ul>
            {c.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
      {note?.trim() && (
        <>
          <p className="howto-title">Sua anotação</p>
          <p>{note}</p>
        </>
      )}
      <p className="muted howto-foot">
        Pare se sentir dor. Em caso de dúvida, procure um profissional.
      </p>
    </div>
  );
}

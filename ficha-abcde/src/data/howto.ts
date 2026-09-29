import { getCatalogExercise } from './catalog';

/** Existe alguma dica para mostrar (catálogo ou anotação do usuário)? */
export const hasHowTo = (
  catalogId: string | null | undefined,
  note: string | undefined,
) => Boolean(getCatalogExercise(catalogId) || (note && note.trim()));

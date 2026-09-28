const TZ = 'America/Sao_Paulo';

/** "12/03" no fuso de São Paulo. */
export const formatDayMonth = (ms: number) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
  }).format(ms);

/** "16/11/2026" a partir de "2026-11-16". */
export const formatIsoDate = (iso: string) => iso.split('-').reverse().join('/');

export const formatReps = (r: { min: number; max: number } | null) =>
  r === null ? 'a definir' : r.min === r.max ? String(r.min) : `${r.min}-${r.max}`;

export function formatRest(sec: number) {
  return sec >= 60 && sec % 60 === 0 ? `${sec / 60} min` : `${sec} s`;
}

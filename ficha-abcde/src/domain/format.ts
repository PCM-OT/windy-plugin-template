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

/** "m:ss" (ou "h:mm:ss") a partir de segundos inteiros. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const TZ_SP = 'America/Sao_Paulo';

/** "junho de 2026" a partir de "2026-06". */
export const formatMonth = (key: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(Date.parse(`${key}-15T12:00:00Z`));

/** "seg., 12/03 · 18:30" no fuso de São Paulo. */
export const formatDateTime = (ms: number) => {
  const d = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ_SP,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(ms);
  const t = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ_SP,
    hour: '2-digit',
    minute: '2-digit',
  }).format(ms);
  return `${d} · ${t}`;
};

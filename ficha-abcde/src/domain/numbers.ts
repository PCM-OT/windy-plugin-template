import { LIMITS } from './schemas';

/**
 * Converte texto digitado em número. Aceita vírgula ou ponto ("22,5").
 * Retorna null para vazio, negativo, não numérico ou acima do máximo.
 */
export function parseDecimal(input: string, max: number): number | null {
  const s = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n > max) return null;
  return n;
}

export const parseKg = (s: string) => parseDecimal(s, LIMITS.kgMax);

export function parseReps(s: string): number | null {
  const n = parseDecimal(s, LIMITS.repsMax);
  return n !== null && Number.isInteger(n) ? n : null;
}

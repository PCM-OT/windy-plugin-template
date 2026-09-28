import { formatDayMonth } from '../domain/format';

interface Point {
  at: number;
  kg: number;
}

const W = 340;
const H = 200;
const M = { l: 40, r: 14, t: 14, b: 30 };

const fmtKg = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** Gráfico de linha em SVG puro (sem biblioteca): carga máxima por sessão. */
export function LineChart({ points, label }: { points: Point[]; label: string }) {
  if (points.length === 0) return <p className="muted">Sem dados para este exercício.</p>;

  const kgs = points.map((p) => p.kg);
  let lo = Math.min(...kgs);
  let hi = Math.max(...kgs);
  if (hi === lo) {
    lo -= 5;
    hi += 5;
  }
  const pad = (hi - lo) * 0.1;
  lo = Math.max(0, lo - pad);
  hi += pad;
  const t0 = points[0]!.at;
  const t1 = points.at(-1)!.at;
  const x = (t: number) =>
    t1 === t0 ? (M.l + W - M.r) / 2 : M.l + ((t - t0) / (t1 - t0)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  const first = points[0]!;
  const last = points.at(-1)!;
  const summary =
    points.length === 1
      ? `${label}: ${fmtKg(last.kg)} kg em ${formatDayMonth(last.at)}`
      : `${label}: de ${fmtKg(first.kg)} kg em ${formatDayMonth(first.at)} para ${fmtKg(last.kg)} kg em ${formatDayMonth(last.at)}`;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end" className="chart-txt">
              {fmtKg(v)}
            </text>
          </g>
        ))}
        <polyline
          className="chart-line"
          fill="none"
          points={points.map((p) => `${x(p.at)},${y(p.kg)}`).join(' ')}
        />
        {points.map((p) => (
          <circle key={p.at} cx={x(p.at)} cy={y(p.kg)} r={4} className="chart-dot" />
        ))}
        <text
          x={x(last.at)}
          y={y(last.kg) - 9}
          textAnchor="middle"
          className="chart-txt chart-strong"
        >
          {fmtKg(last.kg)} kg
        </text>
        <text x={M.l} y={H - 8} textAnchor="start" className="chart-txt">
          {formatDayMonth(first.at)}
        </text>
        {points.length > 1 && (
          <text x={W - M.r} y={H - 8} textAnchor="end" className="chart-txt">
            {formatDayMonth(last.at)}
          </text>
        )}
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

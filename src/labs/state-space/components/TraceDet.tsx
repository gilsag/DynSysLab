import { useRef } from 'react';
import { Mat, trace, det } from '../math/linalg';
import { fmt } from '../format';
import { useT } from '../i18n';
import { Tex } from './basic';

export function classify2(A: Mat): string {
  const tr = trace(A), d = det(A);
  const disc = tr * tr - 4 * d;
  const eps = 1e-9 * (1 + Math.abs(tr) + Math.abs(d));
  if (d < -eps) return 'cls.saddle';
  if (Math.abs(d) <= eps) return 'cls.degenerate';
  if (Math.abs(tr) <= eps) return 'cls.center';
  if (Math.abs(disc) <= eps) return tr < 0 ? 'cls.stableStar' : 'cls.unstableStar';
  if (disc < 0) return tr < 0 ? 'cls.stableFocus' : 'cls.unstableFocus';
  return tr < 0 ? 'cls.stableNode' : 'cls.unstableNode';
}

export function TraceDet({ A, width = 300 }: { A: Mat; width?: number }) {
  const { t } = useT();
  const tr = trace(A), d = det(A);
  const trail = useRef<{ tr: number; d: number }[]>([]);
  const last = trail.current[trail.current.length - 1];
  if (!last || Math.abs(last.tr - tr) + Math.abs(last.d - d) > 1e-9) {
    trail.current.push({ tr, d });
    if (trail.current.length > 120) trail.current.shift();
  }
  const Rt = Math.max(4, Math.abs(tr) * 1.3);
  const Rd = Math.max(4, Math.abs(d) * 1.3, (Rt * Rt) / 4 * 0.6);
  const H = width * 0.78;
  const X = (x: number) => width / 2 + (x / Rt) * (width / 2 - 8);
  const Y = (y: number) => H * 0.72 - (y / Rd) * (H * 0.72 - 8);
  const par: string[] = [];
  for (let k = 0; k <= 80; k++) { const x = -Rt + (2 * Rt * k) / 80; par.push(`${k ? 'L' : 'M'}${X(x).toFixed(1)},${Y((x * x) / 4).toFixed(1)}`); }
  const cls = classify2(A);
  return (
    <div className="tracedet">
      <svg width={width} height={H}>
        <rect x={0} y={Y(0)} width={width} height={H - Y(0)} className="td-saddle" />
        <path d={par.join('')} className="td-par" />
        <line x1={0} x2={width} y1={Y(0)} y2={Y(0)} className="axis" />
        <line x1={X(0)} x2={X(0)} y1={0} y2={H} className="axis" />
        <line x1={X(0)} x2={X(0)} y1={0} y2={Y(0)} className="td-center" />
        <text x={8} y={H - 8} className="td-lab">{t('cls.saddle')}</text>
        <text x={X(-Rt * 0.45)} y={Y(Rd * 0.85)} className="td-lab" textAnchor="middle">{t('cls.stableFocus')}</text>
        <text x={X(Rt * 0.45)} y={Y(Rd * 0.85)} className="td-lab" textAnchor="middle">{t('cls.unstableFocus')}</text>
        <text x={X(-Rt * 0.82)} y={Y(Rd * 0.1)} className="td-lab" textAnchor="middle">{t('cls.stableNode')}</text>
        <text x={X(Rt * 0.82)} y={Y(Rd * 0.1)} className="td-lab" textAnchor="middle">{t('cls.unstableNode')}</text>
        <text x={width - 6} y={Y(0) + 13} className="td-ax" textAnchor="end">τ = tr A</text>
        <text x={X(0) + 5} y={12} className="td-ax">Δ = det A</text>
        <path d={trail.current.map((p, k) => `${k ? 'L' : 'M'}${X(p.tr).toFixed(1)},${Y(p.d).toFixed(1)}`).join('')} className="td-trail" />
        <circle cx={X(tr)} cy={Y(d)} r={6} className="td-pt" />
      </svg>
      <div className="td-info"><b>{t(cls as never)}</b> · τ = {fmt(tr)}, Δ = {fmt(d)} · <Tex tex="\tau^2-4\Delta" /> = {fmt(tr * tr - 4 * d)}</div>
    </div>
  );
}

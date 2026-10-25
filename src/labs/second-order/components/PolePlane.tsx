// s-plane of the canonical second-order system: draggable poles, ωn circle, angle θ = arccos ζ, σ and ωd.
import { useRef, useState } from 'react';
import { useWidth } from '@shared/Plot';
import { tick } from '@shared/format';
import type { LabLang } from '@shared/suite';
import { fromPoles, poles } from '../math/second';

type P = [number, number];

function niceStep(span: number, target: number) {
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

export function PolePlane({ z, wn, frozen, onChange, lang }: { z: number; wn: number; frozen?: { z: number; wn: number } | null; onChange: (z: number, wn: number) => void; lang: LabLang }) {
  const [wrap, W0] = useWidth<HTMLDivElement>();
  // σ from −1.6R to 0.35R and jω from −R to R with equal scales: a nearly square plane
  const W = Math.max(220, Math.min(W0, 380));
  const H = Math.round(W * 0.98);
  const p = poles(z, wn);
  // view: fixed while dragging so the plane does not move under the finger
  const fit = () => {
    const reach = Math.max(wn, Math.abs(p.p2[0]), 0.1) * 1.25;
    return reach;
  };
  const [lock, setLock] = useState<number | null>(null);
  const R = lock ?? fit();
  const ml = 8, mr = 8, mt = 8, mb = 22;
  const pw = W - ml - mr, ph = H - mt - mb;
  // x from −R·k to R·0.35, y symmetric; equal scales
  const xMax = R * 0.35;
  const scale = Math.min(pw / (1.6 * R + xMax), ph / (2 * R));
  const x0 = ml + pw - xMax * scale; // pixel of σ = 0
  const y0 = mt + ph / 2;
  const X = (v: number) => x0 + v * scale;
  const Y = (v: number) => y0 - v * scale;
  const xMin = (ml - x0) / scale;
  const step = niceStep(R, 4);
  const ticks: number[] = [];
  for (let v = Math.ceil(xMin / step) * step; v <= xMax + 1e-9; v += step) ticks.push(+v.toFixed(10));
  const yt: number[] = [];
  const yLim = ph / 2 / scale;
  for (let v = Math.ceil(-yLim / step) * step; v <= yLim + 1e-9; v += step) yt.push(+v.toFixed(10));

  const drag = useRef<{ which: 1 | 2; other: P } | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const toS = (e: React.PointerEvent): P => {
    const r = svg.current!.getBoundingClientRect();
    return [(e.clientX - r.left - x0) / scale, (y0 - (e.clientY - r.top)) / scale];
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    let [sx, sy] = toS(e);
    sx = Math.min(0, sx);
    const snap = 6 / scale;
    let a: P, b: P;
    if (Math.abs(sy) > snap) {
      a = [sx, Math.abs(sy)];
      b = [sx, -Math.abs(sy)];
    } else {
      a = [sx, 0];
      b = drag.current.other[1] !== 0 ? [sx, 0] : drag.current.other;
    }
    const r = fromPoles(a, b);
    onChange(+Math.min(r.z, 5).toFixed(3), +Math.max(0.05, r.wn).toFixed(3));
  };
  const down = (which: 1 | 2) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setLock(R);
    drag.current = { which, other: which === 1 ? p.p2 : p.p1 };
  };
  const up = () => {
    drag.current = null;
    setLock(null);
  };

  const th = Math.acos(Math.min(1, z));
  const under = p.kind === 'under' || p.kind === 'undamped';
  const fp = frozen ? poles(frozen.z, frozen.wn) : null;
  const cross = (q: P, cls: string, key: string, onDown?: (e: React.PointerEvent) => void) => {
    const cx = X(q[0]), cy = Y(q[1]);
    return (
      <g key={key} className={cls} onPointerDown={onDown}>
        <circle cx={cx} cy={cy} r={14} className="hit" />
        <path d={`M ${cx - 7} ${cy - 7} L ${cx + 7} ${cy + 7} M ${cx - 7} ${cy + 7} L ${cx + 7} ${cy - 7}`} />
      </g>
    );
  };
  return (
    <div ref={wrap} className="pole-plane">
      <svg ref={svg} width={W} height={H} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <rect x={ml} y={mt} width={pw} height={ph} className="pp-bg" />
        <rect x={ml} y={mt} width={x0 - ml} height={ph} className="pp-lhp" />
        {ticks.map((v) => (
          <g key={`x${v}`}>
            <line x1={X(v)} x2={X(v)} y1={mt} y2={mt + ph} className="pp-grid" />
            <text x={X(v)} y={mt + ph + 14} textAnchor="middle" className="pp-tick">{tick(v, lang)}</text>
          </g>
        ))}
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={ml} x2={ml + pw} y1={Y(v)} y2={Y(v)} className="pp-grid" />
            {v !== 0 && <text x={x0 + 4} y={Y(v) - 3} className="pp-tick">{tick(v, lang)}j</text>}
          </g>
        ))}
        <line x1={ml} x2={ml + pw} y1={y0} y2={y0} className="pp-axis" />
        <line x1={x0} x2={x0} y1={mt} y2={mt + ph} className="pp-axis" />
        <text x={ml + pw - 4} y={y0 - 5} textAnchor="end" className="pp-name">σ</text>
        <text x={x0 - 5} y={mt + 12} textAnchor="end" className="pp-name">jω</text>
        {/* ωn circle and constant-ζ ray */}
        <path d={`M ${X(0)} ${Y(wn)} A ${wn * scale} ${wn * scale} 0 0 0 ${X(0)} ${Y(-wn)}`} className="pp-circle" />
        {under && (
          <>
            <line x1={x0} y1={y0} x2={X(p.p1[0])} y2={Y(p.p1[1])} className="pp-ray" />
            <line x1={X(p.p1[0])} y1={Y(p.p1[1])} x2={X(p.p1[0])} y2={y0} className="pp-guide" />
            <line x1={X(p.p1[0])} y1={Y(p.p1[1])} x2={x0} y2={Y(p.p1[1])} className="pp-guide" />
            {z > 0.02 && <path d={`M ${x0 - 26} ${y0} A 26 26 0 0 1 ${x0 - 26 * Math.cos(th)} ${y0 - 26 * Math.sin(th)}`} className="pp-arc" />}
            {z > 0.02 && <text x={x0 - 30 * Math.cos(th / 2) - 4} y={y0 - 30 * Math.sin(th / 2)} textAnchor="end" className="pp-lab">θ</text>}
            <text x={(X(p.p1[0]) + x0) / 2} y={y0 + 14} textAnchor="middle" className="pp-lab">−ζωₙ</text>
            <text x={x0 - 6} y={Y(p.p1[1]) - 5} textAnchor="end" className="pp-lab">ωd</text>
          </>
        )}
        <text x={X(-wn * Math.SQRT1_2) - 4} y={Y(wn * Math.SQRT1_2) - 6} textAnchor="end" className="pp-lab circle-lab">ωₙ</text>
        {fp && [fp.p1, fp.p2].map((q, i) => cross(q, 'pp-frozen', `f${i}`))}
        {cross(p.p2, 'pp-pole', 'p2', down(2))}
        {cross(p.p1, 'pp-pole', 'p1', down(1))}
        <rect x={ml} y={mt} width={pw} height={ph} className="pp-frame" />
      </svg>
    </div>
  );
}

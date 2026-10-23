import { ReactNode, useMemo, useState } from 'react';
import { Tex, useWidth } from './basic';
import { fmt } from '../format';

export interface Series { x: number[]; y: number[]; color: string; label?: string; width?: number; dash?: string; opacity?: number; hideHover?: boolean }
export interface VLine { x: number; color?: string; label?: string; dash?: string }

export function niceTicks(min: number, max: number, count = 6): number[] {
  if (!(max > min)) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const r = step0 / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

function bisect(xs: number[], x: number): number {
  let lo = 0, hi = xs.length - 1;
  if (xs[0] > xs[hi]) return xs.reduce((b, v, i) => (Math.abs(v - x) < Math.abs(xs[b] - x) ? i : b), 0);
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] < x) lo = mid; else hi = mid; }
  return Math.abs(xs[lo] - x) < Math.abs(xs[hi] - x) ? lo : hi;
}

export function Plot({ series, height = 220, xLabel, yLabel, logX, xRange, yRange, vlines, hlines, legend = true, title, cursorX, yPad = 0.08, symmetricY }: {
  series: Series[]; height?: number; xLabel?: string; yLabel?: string; logX?: boolean; xRange?: [number, number]; yRange?: [number, number];
  vlines?: VLine[]; hlines?: { y: number; color?: string; dash?: string; label?: string }[]; legend?: boolean; title?: ReactNode; cursorX?: number; yPad?: number; symmetricY?: boolean;
}) {
  const [ref, W] = useWidth<HTMLDivElement>(500);
  const [hover, setHover] = useState<number | null>(null);
  const ml = 54, mr = 14, mt = 10, mb = 34;
  const w = Math.max(W - ml - mr, 50), h = height - mt - mb;
  const tx = (x: number) => (logX ? Math.log10(Math.max(x, 1e-12)) : x);
  const { x0, x1, y0, y1 } = useMemo(() => {
    let xa = Infinity, xb = -Infinity, ya = Infinity, yb = -Infinity;
    for (const s of series) {
      s.x.forEach((v) => { const t = tx(v); if (isFinite(t)) { xa = Math.min(xa, t); xb = Math.max(xb, t); } });
      s.y.forEach((v) => { if (isFinite(v)) { ya = Math.min(ya, v); yb = Math.max(yb, v); } });
    }
    hlines?.forEach((l) => { ya = Math.min(ya, l.y); yb = Math.max(yb, l.y); });
    if (xRange) { xa = tx(xRange[0]); xb = tx(xRange[1]); }
    if (!isFinite(xa)) { xa = 0; xb = 1; }
    if (!isFinite(ya)) { ya = -1; yb = 1; }
    if (yRange) { ya = yRange[0]; yb = yRange[1]; }
    else {
      if (symmetricY) { const m = Math.max(Math.abs(ya), Math.abs(yb)); ya = -m; yb = m; }
      const span = yb - ya || Math.max(Math.abs(yb), 1);
      ya -= span * yPad; yb += span * yPad;
      if (yb - ya < 1e-9) { ya -= 1; yb += 1; }
    }
    if (xb - xa < 1e-12) xb = xa + 1;
    return { x0: xa, x1: xb, y0: ya, y1: yb };
  }, [series, xRange, yRange, logX, hlines, yPad, symmetricY]);
  const X = (x: number) => ml + ((tx(x) - x0) / (x1 - x0)) * w;
  const Y = (y: number) => mt + (1 - (y - y0) / (y1 - y0)) * h;
  const xt = logX ? Array.from({ length: Math.floor(x1) - Math.ceil(x0) + 1 }, (_, k) => Math.pow(10, Math.ceil(x0) + k)) : niceTicks(x0, x1, Math.max(3, Math.floor(w / 80)));
  const yt = niceTicks(y0, y1, Math.max(3, Math.floor(h / 40)));
  const clampY = (y: number) => Math.max(mt - 50, Math.min(mt + h + 50, Y(y)));
  const paths = series.map((s) => {
    let d = '';
    let pen = false;
    for (let i = 0; i < s.x.length; i++) {
      const v = s.y[i];
      if (!isFinite(v)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${X(s.x[i]).toFixed(1)},${clampY(v).toFixed(1)}`;
      pen = true;
    }
    return d;
  });
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    if (px < ml || px > ml + w) { setHover(null); return; }
    const t = x0 + ((px - ml) / w) * (x1 - x0);
    setHover(logX ? Math.pow(10, t) : t);
  };
  const hoverVals = hover !== null ? series.filter((s) => !s.hideHover && s.label).map((s) => { const i = bisect(s.x, hover); return { s, x: s.x[i], y: s.y[i] }; }) : [];
  return (
    <div className="plot" ref={ref}>
      {(title || (legend && series.some((s) => s.label))) && (
        <div className="plot-head">
          {title && <span className="plot-title">{title}</span>}
          {legend && (
            <span className="legend">
              {series.filter((s) => s.label).map((s, i) => (
                <span key={i} className="lg"><svg width="18" height="8"><line style={{ stroke: s.color }} x1="0" y1="4" x2="18" y2="4" strokeWidth={2.2} strokeDasharray={s.dash} /></svg><Tex tex={s.label!} /></span>
              ))}
            </span>
          )}
        </div>
      )}
      <div className="plot-area" style={{ height }}>
        <svg width={W} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs><clipPath id={`clip-${ml}-${Math.round(w)}-${height}`}><rect x={ml} y={mt} width={w} height={h} /></clipPath></defs>
          {yt.map((v) => <line key={`gy${v}`} x1={ml} x2={ml + w} y1={Y(v)} y2={Y(v)} className={v === 0 ? 'axis0' : 'grid'} />)}
          {xt.map((v) => <line key={`gx${v}`} y1={mt} y2={mt + h} x1={X(v)} x2={X(v)} className={!logX && v === 0 ? 'axis0' : 'grid'} />)}
          <rect x={ml} y={mt} width={w} height={h} className="frame" />
          {yt.map((v) => <text key={`ty${v}`} x={ml - 6} y={Y(v) + 4} className="tick" textAnchor="end">{fmt(v, 3)}</text>)}
          {xt.map((v) => <text key={`tx${v}`} x={X(v)} y={mt + h + 15} className="tick" textAnchor="middle">{logX ? `10${supers(Math.round(Math.log10(v)))}` : fmt(v, 3)}</text>)}
          <g clipPath={`url(#clip-${ml}-${Math.round(w)}-${height})`}>
            {hlines?.map((l, i) => <line style={{ stroke: l.color ?? 'var(--axis)' }} key={`hl${i}`} x1={ml} x2={ml + w} y1={Y(l.y)} y2={Y(l.y)} strokeDasharray={l.dash ?? '5 4'} strokeWidth={1.2} />)}
            {vlines?.map((l, i) => <g key={`vl${i}`}><line style={{ stroke: l.color ?? 'var(--axis)' }} y1={mt} y2={mt + h} x1={X(l.x)} x2={X(l.x)} strokeDasharray={l.dash ?? '4 4'} strokeWidth={1.2} />{l.label && <text style={{ fill: l.color ?? 'var(--muted)' }} x={X(l.x) + 4} y={mt + 12} className="vlabel">{l.label}</text>}</g>)}
            {series.map((s, i) => <path style={{ stroke: s.color }} key={i} d={paths[i]} fill="none" strokeWidth={s.width ?? 2} strokeDasharray={s.dash} opacity={s.opacity ?? 1} strokeLinejoin="round" />)}
            {cursorX !== undefined && <line style={{ stroke: 'var(--s4)' }} y1={mt} y2={mt + h} x1={X(cursorX)} x2={X(cursorX)} strokeWidth={1.5} />}
            {hover !== null && <line style={{ stroke: 'var(--axis)' }} y1={mt} y2={mt + h} x1={X(hover)} x2={X(hover)} strokeWidth={0.8} />}
            {hoverVals.map((hv, i) => isFinite(hv.y) && <circle style={{ fill: hv.s.color }} key={i} cx={X(hv.x)} cy={Y(hv.y)} r={3.5} />)}
          </g>
        </svg>
        {xLabel && <span className="xlabel"><Tex tex={xLabel} /></span>}
        {yLabel && <span className="ylabel"><Tex tex={yLabel} /></span>}
        {hover !== null && hoverVals.length > 0 && (
          <div className="hoverbox" style={{ left: Math.min(X(hover) + 10, W - 150), top: 8 }}>
            <div className="hb-x">{xLabel ? <Tex tex={xLabel.split('\\;')[0]} /> : 'x'} = {fmt(hoverVals[0].x, 4)}</div>
            {hoverVals.map((hv, i) => <div key={i}><span className="dot" style={{ background: hv.s.color }} /><Tex tex={hv.s.label!} /> = {fmt(hv.y, 4)}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const supers = (k: number) => String(k).split('').map((c) => SUP[c] ?? c).join('');

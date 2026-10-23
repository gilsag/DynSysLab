import type { ReactNode } from 'react';
import { linTicks, niceStep, pathOf, useSize } from './plotUtils';
import { fmt, type Lang } from '../i18n';

export interface Series {
  x: number[];
  y: number[];
  cls: string;
}

interface Props {
  series: Series[];
  xLabel: string;
  yLabel: string;
  lang: Lang;
  height?: number;
  equal?: boolean;
  xlim?: [number, number];
  ylim?: [number, number];
  children?: (sx: (x: number) => number, sy: (y: number) => number) => ReactNode;
}

export default function LinePlot(p: Props) {
  const [wrap, size] = useSize<HTMLDivElement>();
  const W = size.w;
  const H = p.height ?? 300;
  const L = 56;
  const R = 22;
  const T = 10;
  const B = 36;
  const pw = W - L - R;
  const phh = H - T - B;

  const allX = p.series.flatMap((s) => s.x).filter(isFinite);
  const allY = p.series.flatMap((s) => s.y).filter(isFinite);
  let [x0, x1] = p.xlim ?? [Math.min(...allX), Math.max(...allX)];
  let [y0, y1] = p.ylim ?? [Math.min(...allY), Math.max(...allY)];
  if (!isFinite(x0) || !isFinite(x1)) [x0, x1] = [0, 1];
  if (!isFinite(y0) || !isFinite(y1)) [y0, y1] = [-1, 1];
  if (x1 - x0 < 1e-12) [x0, x1] = [x0 - 1, x1 + 1];
  if (y1 - y0 < 1e-9 * Math.max(1, Math.abs(y0))) [y0, y1] = [y0 - 1, y1 + 1];
  if (!p.ylim) {
    const pad = (y1 - y0) * 0.08;
    y0 -= pad;
    y1 += pad;
    const st = niceStep(y1 - y0, 5);
    y0 = Math.floor(y0 / st) * st;
    y1 = Math.ceil(y1 / st) * st;
  }
  if (p.equal) {
    // same scale on both axes, expand the shorter range
    const sx = pw / (x1 - x0);
    const sy = phh / (y1 - y0);
    if (sx > sy) {
      const c = (x0 + x1) / 2;
      const half = pw / sy / 2;
      x0 = c - half;
      x1 = c + half;
    } else {
      const c = (y0 + y1) / 2;
      const half = phh / sx / 2;
      y0 = c - half;
      y1 = c + half;
    }
  }
  const sx = (x: number) => L + ((x - x0) / (x1 - x0)) * pw;
  const sy = (y: number) => T + phh - ((y - y0) / (y1 - y0)) * phh;
  const xt = linTicks(x0, x1, Math.max(3, Math.floor(pw / 80)));
  const yt = linTicks(y0, y1, Math.max(3, Math.floor(phh / 45)));

  return (
    <div ref={wrap} className="lineplot-wrap">
      <svg width={W} height={H} className="lineplot">
        <defs>
          <clipPath id={`clip-${H}-${Math.round(W)}`}>
            <rect x={L} y={T} width={pw} height={phh} />
          </clipPath>
        </defs>
        <rect x={L} y={T} width={pw} height={phh} className="frame" />
        {xt.map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={T} y2={T + phh} className={v === 0 ? 'grid zero' : 'grid'} />
            <text x={sx(v)} y={T + phh + 16} className="tick" textAnchor="middle">
              {fmt(v, p.lang)}
            </text>
          </g>
        ))}
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={L} x2={L + pw} y1={sy(v)} y2={sy(v)} className={v === 0 ? 'grid zero' : 'grid'} />
            <text x={L - 6} y={sy(v) + 4} className="tick" textAnchor="end">
              {fmt(v, p.lang)}
            </text>
          </g>
        ))}
        <text x={L + pw / 2} y={H - 4} className="axlabel" textAnchor="middle">
          {p.xLabel}
        </text>
        <text transform={`translate(14 ${T + phh / 2}) rotate(-90)`} className="axlabel" textAnchor="middle">
          {p.yLabel}
        </text>
        <g clipPath={`url(#clip-${H}-${Math.round(W)})`}>
          {p.series.map((s, i) => (
            <path
              key={i}
              d={pathOf(s.x.map(sx), s.y.map(sy), T - 1000, T + phh + 1000)}
              className={`curve ${s.cls}`}
            />
          ))}
          {p.children?.(sx, sy)}
        </g>
      </svg>
    </div>
  );
}

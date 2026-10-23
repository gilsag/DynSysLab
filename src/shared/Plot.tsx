import { useEffect, useRef, useState } from 'react';
import { textScale, useThemeVersion } from './LabChrome';

export interface Series {
  y: ArrayLike<number>;
  x?: ArrayLike<number>;
  xStart?: number;
  xStep?: number;
  color: string; // CSS color or a CSS custom property name such as '--c-signal'
  width?: number;
  dash?: number[];
  alpha?: number;
  /** line · stem · points · hollow · area (filled down to `base`, opacity `alpha`) · arrow (impulse: stem with head) */
  kind?: 'line' | 'stem' | 'points' | 'hollow' | 'area' | 'arrow';
  /** baseline for 'area' (default 0) */
  base?: number;
  label?: string;
}

export interface RefLine {
  v: number;
  color?: string;
  dash?: number[];
  label?: string;
}

export interface PlotSpec {
  series: Series[];
  xRange: [number, number];
  yRange: [number, number];
  xLog?: boolean;
  yLog?: boolean;
  xLabel?: string;
  yLabel?: string;
  hLines?: RefLine[];
  vLines?: RefLine[];
  legend?: boolean;
  stemBase?: number;
  xFmt?: (v: number) => string;
  yFmt?: (v: number) => string;
}

export function plotMargins(spec: Pick<PlotSpec, 'xLabel' | 'yLabel'>) {
  const f = textScale();
  return { l: Math.round((spec.yLabel ? 62 : 50) * f), r: 12, t: 10, b: Math.round((spec.xLabel ? 38 : 24) * f) };
}

export function cssColor(c: string): string {
  if (c.startsWith('--')) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(c).trim();
    return v || '#888';
  }
  return c;
}

export function fmtNum(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = v / 10 ** e;
    return (Math.abs(m - 1) < 1e-9 ? '' : parseFloat(m.toPrecision(2)) + '·') + '10^' + e;
  }
  return String(parseFloat(v.toPrecision(4)));
}

function supFmt(s: string): string {
  const sup: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return s.replace(/\^(-?\d+)/, (_, e: string) => e.split('').map((ch) => sup[ch] ?? ch).join(''));
}

function niceTicks(min: number, max: number, target: number): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
}

function logTicks(min: number, max: number): { major: number[]; minor: number[] } {
  const a = Math.floor(Math.log10(min));
  const b = Math.ceil(Math.log10(max));
  const major: number[] = [];
  const minor: number[] = [];
  const decades = b - a;
  const dense = decades <= 3;
  const every = decades > 9 ? 2 : 1;
  for (let e = a; e <= b; e++) {
    const d = 10 ** e;
    for (let m = 1; m < 10; m++) {
      const v = m * d;
      if (v < min * 0.999 || v > max * 1.001) continue;
      if ((m === 1 && (e - a) % every === 0) || (dense && (m === 2 || m === 5))) major.push(v);
      else minor.push(v);
    }
  }
  return { major, minor };
}

export function drawPlot(canvas: HTMLCanvasElement, cssW: number, cssH: number, spec: PlotSpec): void {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.max(50, Math.round(cssW));
  const H = Math.max(50, Math.round(cssH));
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const m = plotMargins(spec);
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const [x0, x1] = spec.xRange;
  const [y0, y1] = spec.yRange;
  const tx = (v: number) => (spec.xLog ? Math.log10(v) : v);
  const ty = (v: number) => (spec.yLog ? Math.log10(v) : v);
  const lx0 = tx(x0);
  const lx1 = tx(x1);
  const ly0 = ty(y0);
  const ly1 = ty(y1);
  const X = (v: number) => m.l + ((tx(v) - lx0) / (lx1 - lx0 || 1)) * pw;
  const Y = (v: number) => m.t + ph - ((ty(v) - ly0) / (ly1 - ly0 || 1)) * ph;

  const textC = cssColor('--plot-text');
  const gridC = cssColor('--grid');
  const axisC = cssColor('--axis');
  ctx.fillStyle = cssColor('--plot-bg');
  ctx.fillRect(m.l, m.t, pw, ph);

  const fs = textScale();
  ctx.font = `${11 * fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.lineWidth = 1;

  // Grid and tick labels
  const xf = spec.xFmt ?? ((v: number) => supFmt(fmtNum(v)));
  const yf = spec.yFmt ?? ((v: number) => supFmt(fmtNum(v)));
  let xMajor: number[];
  let xMinor: number[] = [];
  if (spec.xLog) ({ major: xMajor, minor: xMinor } = logTicks(x0, x1));
  else xMajor = niceTicks(x0, x1, Math.max(3, Math.floor(pw / 85)));
  let yMajor: number[];
  let yMinor: number[] = [];
  if (spec.yLog) ({ major: yMajor, minor: yMinor } = logTicks(y0, y1));
  else yMajor = niceTicks(y0, y1, Math.max(3, Math.floor(ph / 40)));

  ctx.strokeStyle = gridC;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (const v of xMinor) {
    const px = Math.round(X(v)) + 0.5;
    ctx.moveTo(px, m.t);
    ctx.lineTo(px, m.t + ph);
  }
  for (const v of yMinor) {
    const py = Math.round(Y(v)) + 0.5;
    ctx.moveTo(m.l, py);
    ctx.lineTo(m.l + pw, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  for (const v of xMajor) {
    const px = Math.round(X(v)) + 0.5;
    ctx.moveTo(px, m.t);
    ctx.lineTo(px, m.t + ph);
  }
  for (const v of yMajor) {
    const py = Math.round(Y(v)) + 0.5;
    ctx.moveTo(m.l, py);
    ctx.lineTo(m.l + pw, py);
  }
  ctx.stroke();

  ctx.fillStyle = textC;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const v of xMajor) ctx.fillText(xf(v), X(v), m.t + ph + 5);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of yMajor) ctx.fillText(yf(v), m.l - 6, Y(v));

  if (spec.xLabel) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(spec.xLabel, m.l + pw / 2, H - 2);
  }
  if (spec.yLabel) {
    ctx.save();
    ctx.translate(12, m.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.yLabel, 0, 0);
    ctx.restore();
  }

  // Plot area contents (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.rect(m.l, m.t, pw, ph);
  ctx.clip();

  const refLine = (l: RefLine, horizontal: boolean) => {
    ctx.strokeStyle = cssColor(l.color ?? '--axis');
    ctx.setLineDash(l.dash ?? []);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (horizontal) {
      const py = Math.round(Y(l.v)) + 0.5;
      ctx.moveTo(m.l, py);
      ctx.lineTo(m.l + pw, py);
    } else {
      const px = Math.round(X(l.v)) + 0.5;
      ctx.moveTo(px, m.t);
      ctx.lineTo(px, m.t + ph);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (l.label) {
      ctx.fillStyle = cssColor(l.color ?? '--axis');
      ctx.textBaseline = 'top';
      if (horizontal) {
        ctx.textAlign = 'right';
        ctx.fillText(l.label, m.l + pw - 4, Y(l.v) + 2);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(l.label, X(l.v) + 3, m.t + 3);
      }
    }
  };
  for (const l of spec.hLines ?? []) refLine(l, true);
  for (const l of spec.vLines ?? []) refLine(l, false);

  for (const s of spec.series) {
    const n = s.y.length;
    const xs = (i: number) => (s.x ? s.x[i] : (s.xStart ?? 0) + i * (s.xStep ?? 1));
    const valid = (x: number, y: number) =>
      Number.isFinite(x) && Number.isFinite(y) && !(spec.xLog && x <= 0) && !(spec.yLog && y <= 0);
    const color = cssColor(s.color);
    ctx.globalAlpha = s.alpha ?? 1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = s.width ?? 1.5;
    ctx.setLineDash(s.dash ?? []);
    const kind = s.kind ?? 'line';
    if (kind === 'area') {
      const b = Y(s.base ?? 0);
      ctx.globalAlpha = s.alpha ?? 0.25;
      ctx.beginPath();
      let open = false;
      let lastX = 0;
      for (let i = 0; i < n; i++) {
        const x = xs(i);
        const y = s.y[i];
        if (!valid(x, y)) {
          if (open) { ctx.lineTo(lastX, b); ctx.closePath(); open = false; }
          continue;
        }
        const px = X(x);
        if (!open) { ctx.moveTo(px, b); open = true; }
        ctx.lineTo(px, Y(y));
        lastX = px;
      }
      if (open) { ctx.lineTo(lastX, b); ctx.closePath(); }
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (kind === 'arrow') {
      const b = Y(spec.stemBase ?? 0);
      ctx.lineWidth = s.width ?? 2;
      for (let i = 0; i < n; i++) {
        const x = xs(i);
        const y = s.y[i];
        if (!valid(x, y) || y === 0) continue;
        const px = X(x);
        const py = Y(y);
        const dir = py < b ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(px, b);
        ctx.lineTo(px, py + dir * 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 5, py + dir * 9);
        ctx.lineTo(px + 5, py + dir * 9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    if (kind === 'line') {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < n; i++) {
        const x = xs(i);
        const y = s.y[i];
        if (!valid(x, y)) {
          pen = false;
          continue;
        }
        const px = X(x);
        const py = Y(y);
        if (pen) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
        pen = true;
      }
      ctx.stroke();
    } else {
      const base = spec.stemBase ?? (spec.yLog ? y0 : 0);
      const pyBase = Y(Math.max(Math.min(base, y1), spec.yLog ? y0 : -Infinity));
      const r = kind === 'stem' ? 2.6 : (s.width ?? 2.6);
      ctx.setLineDash([]);
      for (let i = 0; i < n; i++) {
        const x = xs(i);
        const y = s.y[i];
        if (!valid(x, y)) continue;
        const px = X(x);
        const py = Y(y);
        if (kind === 'stem') {
          ctx.lineWidth = s.width ?? 1.5;
          ctx.beginPath();
          ctx.moveTo(px, pyBase);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 2 * Math.PI);
        if (kind === 'hollow') {
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }
  ctx.restore();

  ctx.strokeStyle = axisC;
  ctx.lineWidth = 1;
  ctx.strokeRect(m.l + 0.5, m.t + 0.5, pw - 1, ph - 1);

  if (spec.legend) {
    const items = spec.series.filter((s) => s.label);
    if (items.length) {
      ctx.font = `${11.5 * fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
      const widths = items.map((s) => ctx.measureText(s.label!).width);
      const bw = Math.max(...widths) + 38;
      const lh = Math.round(17 * fs);
      const bh = items.length * lh + 8;
      const bx = m.l + pw - bw - 8;
      const by = m.t + 8;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = cssColor('--plot-bg');
      ctx.fillRect(bx, by, bw, bh);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = gridC;
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      items.forEach((s, i) => {
        const yy = by + 4 + lh / 2 + i * lh;
        ctx.strokeStyle = ctx.fillStyle = cssColor(s.color);
        ctx.lineWidth = 2;
        ctx.setLineDash(s.dash ?? []);
        if ((s.kind ?? 'line') === 'line') {
          ctx.beginPath();
          ctx.moveTo(bx + 8, yy);
          ctx.lineTo(bx + 26, yy);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(bx + 17, yy, 3, 0, 2 * Math.PI);
          if (s.kind === 'hollow') ctx.stroke();
          else ctx.fill();
        }
        ctx.setLineDash([]);
        ctx.fillStyle = textC;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.label!, bx + 32, yy);
      });
    }
  }
}

/** Re-renders when theme, palette or text size change so canvas colours follow the CSS theme. */
export function useThemeTick(): number {
  return useThemeVersion();
}

/** Scales a nominal plot height to the window height (laptops get shorter plots, large monitors taller). */
export function useFitHeight(h: number): number {
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const k = Math.min(1.15, Math.max(0.78, vh / 960));
  return Math.round(h * k);
}

/** Tracks the content width of an element. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      if (cw > 0) setW(Math.floor(cw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function Plot({ spec, height: nominal }: { spec: PlotSpec; height: number }) {
  const height = useFitHeight(nominal);
  const [wrapRef, w] = useWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useThemeTick();
  useEffect(() => {
    if (canvasRef.current) drawPlot(canvasRef.current, w, height, spec);
  }, [spec, w, height, theme]);
  return (
    <div ref={wrapRef} className="plot">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function autoRange(arrays: ArrayLike<number>[], pad = 0.08, minSpan = 1e-9): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const a of arrays) {
    for (let i = 0; i < a.length; i++) {
      const v = a[i];
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo)) return [-1, 1];
  let span = hi - lo;
  if (span < minSpan) {
    const c = (hi + lo) / 2;
    lo = c - minSpan / 2;
    hi = c + minSpan / 2;
    span = minSpan;
  }
  return [lo - span * pad, hi + span * pad];
}

export function logRange(values: ArrayLike<number>, maxDecades = 8): [number, number] {
  let lo = Infinity;
  let hi = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v > 0 && Number.isFinite(v)) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!(hi > 0)) return [1e-3, 1];
  const top = 10 ** Math.ceil(Math.log10(hi) + 1e-9);
  const bot = Math.max(10 ** Math.floor(Math.log10(lo)), top / 10 ** maxDecades);
  return [bot, top];
}

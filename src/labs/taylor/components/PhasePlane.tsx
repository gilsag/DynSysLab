// Phase portrait of a second-order system on canvas: field, trajectories, separatrices, equilibria.
import { useEffect, useRef } from 'react';
import { cssVar, textScale, useThemeVersion } from '@shared/LabChrome';
import { useFitHeight, useWidth } from '@shared/Plot';
import { tick } from '@shared/format';
import type { LabLang } from '@shared/suite';
import type { Equilibrium, V2, Window } from '../math/system';

export interface PhaseProps {
  win: Window;
  names: [string, string];
  lang: LabLang;
  field?: (x: V2) => V2;
  family?: V2[][];
  stable?: V2[][];
  unstable?: V2[][];
  eqs: Equilibrium[];
  selected: number;
  eigLines?: boolean;
  main?: V2[];
  lin?: V2[];
  x0: V2;
  onPick: (x: V2) => void;
  height: number;
}

function niceTicks(a: number, b: number, target: number): number[] {
  const span = b - a;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9 * step; v += step) out.push(Math.abs(v) < 1e-12 * step ? 0 : v);
  return out;
}

const STABLE = new Set(['stableNode', 'stableFocus']);

export function PhasePlane(p: PhaseProps) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const H = useFitHeight(p.height);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const theme = useThemeVersion();
  const geom = useRef({ ml: 0, mt: 0, pw: 1, ph: 1 });

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(200, w);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const fs = textScale();
    const ml = Math.round(46 * fs), mb = Math.round(34 * fs), mt = 8, mr = 10;
    const pw = W - ml - mr, ph = H - mt - mb;
    geom.current = { ml, mt, pw, ph };
    const { x1: [a1, b1], x2: [a2, b2] } = p.win;
    const X = (v: number) => ml + ((v - a1) / (b1 - a1)) * pw;
    const Y = (v: number) => mt + ph - ((v - a2) / (b2 - a2)) * ph;
    const col = {
      bg: cssVar('--plot-bg'), grid: cssVar('--grid'), axis: cssVar('--axis'), text: cssVar('--plot-text'),
      field: cssVar('--c-input'), fam: cssVar('--c-muted'), main: cssVar('--s1'), stable: cssVar('--c-error'),
      unstable: cssVar('--c-approx'), eq: cssVar('--text'), accent: cssVar('--accent'), good: cssVar('--good'), bad: cssVar('--bad'),
    };
    ctx.fillStyle = col.bg;
    ctx.fillRect(ml, mt, pw, ph);
    ctx.font = `${11 * fs}px system-ui, sans-serif`;
    // grid and ticks
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = col.text;
    const tx = niceTicks(a1, b1, Math.max(4, Math.floor(pw / 80)));
    const ty = niceTicks(a2, b2, Math.max(4, Math.floor(ph / 50)));
    ctx.beginPath();
    for (const v of tx) { ctx.moveTo(Math.round(X(v)) + 0.5, mt); ctx.lineTo(Math.round(X(v)) + 0.5, mt + ph); }
    for (const v of ty) { ctx.moveTo(ml, Math.round(Y(v)) + 0.5); ctx.lineTo(ml + pw, Math.round(Y(v)) + 0.5); }
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of tx) ctx.fillText(tick(v, p.lang), X(v), mt + ph + 4);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of ty) ctx.fillText(tick(v, p.lang), ml - 5, Y(v));
    ctx.save();
    ctx.beginPath();
    ctx.rect(ml, mt, pw, ph);
    ctx.clip();
    // axes through the origin
    ctx.strokeStyle = col.axis;
    ctx.beginPath();
    if (a1 < 0 && b1 > 0) { ctx.moveTo(X(0), mt); ctx.lineTo(X(0), mt + ph); }
    if (a2 < 0 && b2 > 0) { ctx.moveTo(ml, Y(0)); ctx.lineTo(ml + pw, Y(0)); }
    ctx.stroke();
    // vector field
    if (p.field) {
      const nx = Math.max(12, Math.round(pw / 34));
      const ny = Math.max(9, Math.round(ph / 34));
      const L = Math.min(pw / nx, ph / ny) * 0.38;
      ctx.strokeStyle = col.field;
      ctx.fillStyle = col.field;
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const px = ml + ((i + 0.5) / nx) * pw;
          const py = mt + ((j + 0.5) / ny) * ph;
          const x: V2 = [a1 + ((px - ml) / pw) * (b1 - a1), a2 + ((mt + ph - py) / ph) * (b2 - a2)];
          const f = p.field(x);
          const dx = (f[0] / (b1 - a1)) * pw;
          const dy = -(f[1] / (b2 - a2)) * ph;
          const m = Math.hypot(dx, dy);
          if (!(m > 0) || !Number.isFinite(m)) continue;
          const ux = (dx / m) * L, uy = (dy / m) * L;
          ctx.globalAlpha = 0.35 + 0.4 * Math.min(1, Math.log10(1 + m / 40));
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(px - ux, py - uy);
          ctx.lineTo(px + ux, py + uy);
          ctx.stroke();
          const hx = px + ux, hy = py + uy, a = Math.atan2(uy, ux);
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx - 4.5 * Math.cos(a - 0.45), hy - 4.5 * Math.sin(a - 0.45));
          ctx.lineTo(hx - 4.5 * Math.cos(a + 0.45), hy - 4.5 * Math.sin(a + 0.45));
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    const poly = (pts: V2[], color: string, width: number, dash: number[] = [], alpha = 1) => {
      if (pts.length < 2) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let k = 1; k < pts.length; k++) ctx.lineTo(X(pts[k][0]), Y(pts[k][1]));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    };
    for (const tr of p.family ?? []) poly(tr, col.fam, 1.1, [], 0.9);
    // eigendirections at the selected equilibrium
    const sel = p.eqs[p.selected];
    if (p.eigLines && sel?.eig.vec) {
      const span = Math.hypot(b1 - a1, b2 - a2);
      sel.eig.vec.forEach((v, i) => {
        const c = sel.eig.re[i] < 0 ? col.good : col.bad;
        poly([[sel.x[0] - span * v[0], sel.x[1] - span * v[1]], [sel.x[0] + span * v[0], sel.x[1] + span * v[1]]], c, 1, [3, 4], 0.8);
      });
    }
    for (const s of p.stable ?? []) poly(s, col.stable, 2.4);
    for (const s of p.unstable ?? []) poly(s, col.stable, 1.8, [6, 4]);
    if (p.lin) poly(p.lin, col.main, 1.8, [6, 4], 0.9);
    if (p.main) poly(p.main, col.main, 2.6);
    // equilibria
    p.eqs.forEach((e, i) => {
      const px = X(e.x[0]), py = Y(e.x[1]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = col.eq;
      ctx.fillStyle = STABLE.has(e.kind) ? col.eq : col.bg;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      if (e.kind === 'undecided') {
        ctx.beginPath();
        ctx.arc(px, py, 8.5, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (i === p.selected) {
        ctx.strokeStyle = col.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    // initial condition
    ctx.fillStyle = col.main;
    ctx.strokeStyle = col.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(p.x0[0]), Y(p.x0[1]), 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = col.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(ml + 0.5, mt + 0.5, pw - 1, ph - 1);
  }, [p, w, H, theme]);

  const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const { ml, mt, pw, ph } = geom.current;
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (px < ml || px > ml + pw || py < mt || py > mt + ph) return;
    const { x1: [a1, b1], x2: [a2, b2] } = p.win;
    p.onPick([a1 + ((px - ml) / pw) * (b1 - a1), a2 + ((mt + ph - py) / ph) * (b2 - a2)]);
  };
  return (
    <div ref={wrap} className="plot phase-canvas">
      <canvas
        ref={ref}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => { if (e.buttons) pick(e); }}
      />
    </div>
  );
}

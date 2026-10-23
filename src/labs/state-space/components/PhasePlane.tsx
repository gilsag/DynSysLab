import { useEffect, useMemo, useRef, useState } from 'react';
import { Mat, Vec, matvec, jacobiEig } from '../math/linalg';
import { discretize, eqPoint } from '../math/ss';
import { Tex, useWidth } from './basic';
import { niceTicks } from './Plot';
import { fmt } from '../format';
import { useT } from '../i18n';

export interface EigLine { v: Vec; color: string; label: string }
export interface SubLine { v: Vec; color: string; label: string; dash?: string }
export interface ExtraTraj { x0: Vec; color: string; dash?: string; label?: string; pts?: Vec[] }

export function trajectory(A: Mat, B: Mat, x0: Vec, u: Vec, T: number, N = 400): Vec[] {
  const { Phi, Gam } = discretize(A, B, T / N);
  const gu = matvec(Gam, u);
  const out: Vec[] = [x0.slice()];
  let x = x0.slice();
  for (let k = 0; k < N; k++) {
    x = matvec(Phi, x).map((v, i) => v + gu[i]);
    out.push(x);
    if (!x.every(isFinite) || Math.max(...x.map(Math.abs)) > 1e8) break;
  }
  return out;
}

interface View { cx: number; cy: number; rx: number; ry: number }

export function PhasePlane({ A, B, ix, iy, x0, onX0, u, horizon, showField, showFamily, eig, sub, ellipse, labels, size, tAnim, extra, fitKey, onFamilyAdd, family, title, hideMain, equal }: {
  A: Mat; B: Mat; ix: number; iy: number; x0: Vec; onX0?: (x: Vec) => void; u: Vec; horizon: number;
  showField: boolean; showFamily: boolean; eig?: EigLine[]; sub?: SubLine[]; ellipse?: Mat | null; labels: [string, string];
  size?: number; tAnim?: number | null; extra?: ExtraTraj[]; fitKey?: string; family?: Vec[]; onFamilyAdd?: (x: Vec) => void; title?: React.ReactNode; hideMain?: boolean; equal?: boolean;
}) {
  const { t } = useT();
  const [ref, Wc] = useWidth<HTMLDivElement>(500);
  const W = size ?? Wc;
  const H = size ?? Math.round(Math.min(Math.max(Wc, 460), 700));
  const n = A.length;
  const eq = useMemo(() => (u.some((v) => v !== 0) ? eqPoint({ A, B, C: [], D: [] }, u) : null) ?? A.map(() => 0), [A, B, u]);
  const [view, setView] = useState<View>({ cx: 0, cy: 0, rx: 2, ry: 2 });
  const main = useMemo(() => (hideMain ? [] : trajectory(A, B, x0, u, horizon)), [A, B, x0, u, horizon, hideMain]);
  const extraTr = useMemo(() => (extra ?? []).map((e) => ({ ...e, pts: e.pts ?? trajectory(A, B, e.x0, u, horizon) })), [extra, A, B, u, horizon]);

  const fit = () => {
    const pts: Vec[] = [x0, eq, ...(family ?? [])];
    const lim = 6 * Math.max(1, Math.abs(x0[ix] - eq[ix]), Math.abs(x0[iy] - eq[iy]));
    const addTraj = (tr: Vec[]) => { for (const p of tr) { if (Math.abs(p[ix] - eq[ix]) > lim * 50 || Math.abs(p[iy] - eq[iy]) > lim * 50) break; pts.push(p); } };
    addTraj(main.filter((p) => Math.hypot(p[ix] - eq[ix], p[iy] - eq[iy]) < lim));
    extraTr.forEach((e) => addTraj(e.pts));
    let ax = 0, ay = 0;
    for (const p of pts) { ax = Math.max(ax, Math.abs(p[ix] - eq[ix])); ay = Math.max(ay, Math.abs(p[iy] - eq[iy])); }
    if (ellipse) { ax = Math.max(ax, Math.sqrt(Math.max(ellipse[0][0], 0))); ay = Math.max(ay, Math.sqrt(Math.max(ellipse[1][1], 0))); }
    let rx = Math.max(ax * 1.25, 1e-3), ry = Math.max(ay * 1.25, 1e-3);
    if (ax === 0 && ay === 0) { rx = ry = 1.5; }
    const m = Math.max(rx, ry);
    if (equal) { rx = ry = m; }
    else { rx = Math.max(rx, m * 0.15); ry = Math.max(ry, m * 0.15); }
    setView({ cx: eq[ix], cy: eq[iy], rx, ry });
  };
  useEffect(fit, [fitKey]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const sx = W / (2 * view.rx), sy = H / (2 * view.ry);
  const X = (x: number) => W / 2 + (x - view.cx) * sx;
  const Y = (y: number) => H / 2 - (y - view.cy) * sy;
  const toW = (px: number, py: number) => ({ x: view.cx + (px - W / 2) / sx, y: view.cy - (py - H / 2) / sy });

  const fam = useMemo(() => {
    if (!showFamily) return [] as Vec[][];
    const starts: Vec[] = [];
    const K = 16;
    for (let k = 0; k < K; k++) {
      const th = (2 * Math.PI * k) / K + 0.13;
      const p = eq.slice();
      p[ix] = eq[ix] + 0.95 * view.rx * Math.cos(th);
      p[iy] = eq[iy] + 0.95 * view.ry * Math.sin(th);
      starts.push(p);
    }
    // puntos sobre las direcciones propias para resaltar separatrices
    eig?.forEach((e) => {
      const nv = Math.hypot(e.v[ix] / view.rx, e.v[iy] / view.ry);
      if (nv < 1e-12) return;
      for (const s of [-1, 1]) for (const f of [0.35, 0.9]) {
        const p = eq.slice();
        for (let i = 0; i < n; i++) p[i] = eq[i] + (s * f * e.v[i]) / nv;
        starts.push(p);
      }
    });
    (family ?? []).forEach((f) => starts.push(f));
    return starts.map((s) => trajectory(A, B, s, u, horizon, 300));
  }, [showFamily, A, B, u, horizon, view.rx, view.ry, eq, ix, iy, eig, family, n]);

  const pathOf = (pts: Vec[]) => {
    let d = '';
    for (let k = 0; k < pts.length; k++) {
      const px = X(pts[k][ix]), py = Y(pts[k][iy]);
      if (Math.abs(px) > 40 * W || Math.abs(py) > 40 * H) break;
      d += `${k ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
    }
    return d;
  };

  // campo vectorial (corte con las demás coordenadas en el equilibrio)
  const G = 19;
  const field = useMemo(() => {
    if (!showField) return [];
    const out: { x: number; y: number; dx: number; dy: number; m: number }[] = [];
    const Bu = matvec(B, u);
    let mmax = 0;
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      const px = ((i + 0.5) / G) * W, py = ((j + 0.5) / G) * H;
      const w = toW(px, py);
      const x = eq.slice(); x[ix] = w.x; x[iy] = w.y;
      const f = matvec(A, x).map((v, k) => v + Bu[k]);
      const dx = f[ix] * sx, dy = -f[iy] * sy;
      const m = Math.hypot(dx, dy);
      mmax = Math.max(mmax, m);
      out.push({ x: px, y: py, dx, dy, m });
    }
    return out.map((a) => ({ ...a, m: a.m / (mmax || 1) }));
  }, [showField, A, B, u, view, W, H, ix, iy, eq]);

  const setFromEvent = (e: React.PointerEvent) => {
    if (!onX0) return;
    const r = svgRef.current!.getBoundingClientRect();
    const w = toW(e.clientX - r.left, e.clientY - r.top);
    const nx = x0.slice();
    const rnd = (v: number, s: number) => { const q = Math.pow(10, Math.floor(Math.log10(s)) - 2); return Math.round(v / q) * q; };
    nx[ix] = +rnd(w.x, view.rx).toPrecision(6); nx[iy] = +rnd(w.y, view.ry).toPrecision(6);
    onX0(nx);
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey && onFamilyAdd) {
      const r = svgRef.current!.getBoundingClientRect();
      const w = toW(e.clientX - r.left, e.clientY - r.top);
      const nx = eq.slice(); nx[ix] = w.x; nx[iy] = w.y;
      onFamilyAdd(nx);
      return;
    }
    if (!onX0) return;
    dragging.current = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setFromEvent(e);
  };
  const onWheel = (e: React.WheelEvent) => {
    const f = Math.exp(e.deltaY * 0.0012);
    setView((v) => ({ ...v, rx: Math.min(Math.max(v.rx * f, 1e-4), 1e5), ry: Math.min(Math.max(v.ry * f, 1e-4), 1e5) }));
  };

  const ticks = niceTicks(view.cx - view.rx, view.cx + view.rx, 6);
  const ticksY = niceTicks(view.cy - view.ry, view.cy + view.ry, 6);
  const o = { x: X(0), y: Y(0) };

  let dot: Vec | null = null;
  if (tAnim != null && main.length > 1) {
    const k = Math.min(main.length - 1, Math.round((tAnim / horizon) * (main.length - 1)));
    dot = main[k];
  }

  let ell: string | null = null;
  if (ellipse) {
    const { values, vectors } = jacobiEig(ellipse);
    const a = Math.sqrt(Math.max(values[0], 0)), b = Math.sqrt(Math.max(values[1], 0));
    const pts: string[] = [];
    for (let k = 0; k <= 96; k++) {
      const th = (2 * Math.PI * k) / 96;
      const px = a * Math.cos(th) * vectors[0][0] + b * Math.sin(th) * vectors[0][1];
      const py = a * Math.cos(th) * vectors[1][0] + b * Math.sin(th) * vectors[1][1];
      pts.push(`${k ? 'L' : 'M'}${X(px).toFixed(1)},${Y(py).toFixed(1)}`);
    }
    ell = pts.join('');
  }

  const lineThrough = (p: Vec, v: Vec) => {
    const vx = v[ix] * sx, vy = -v[iy] * sy;
    const nv = Math.hypot(vx, vy);
    if (nv < 1e-9) return null;
    const ux = vx / nv, uy = vy / nv, L = 3 * Math.max(W, H);
    const cx = X(p[ix]), cy = Y(p[iy]);
    const lr = 0.36 * Math.min(W, H);
    return { x1: cx - L * ux, y1: cy - L * uy, x2: cx + L * ux, y2: cy + L * uy, lx: cx + lr * ux, ly: cy + lr * uy };
  };

  const famArrows = fam.map((p) => {
    const k = Math.min(Math.floor(p.length * 0.12), p.length - 2);
    if (k < 1) return null;
    return [p[k], p[k + 1]];
  });

  return (
    <div className="phase" ref={ref} style={size ? { width: size } : undefined}>
      {title && <div className="phase-title">{title}</div>}
      <svg ref={svgRef} width={W} height={H} onPointerDown={onDown} onPointerMove={(e) => dragging.current && setFromEvent(e)}
        onPointerUp={() => (dragging.current = false)} onWheel={onWheel} style={{ cursor: onX0 ? 'crosshair' : 'default' }}>
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke" /></marker>
        </defs>
        {ticks.map((v) => <line key={`gx${v}`} x1={X(v)} x2={X(v)} y1={0} y2={H} className="grid" />)}
        {ticksY.map((v) => <line key={`gy${v}`} y1={Y(v)} y2={Y(v)} x1={0} x2={W} className="grid" />)}
        <line x1={0} x2={W} y1={o.y} y2={o.y} className="axis" />
        <line y1={0} y2={H} x1={o.x} x2={o.x} className="axis" />
        {ticks.map((v) => v !== 0 && <text key={`tx${v}`} x={X(v)} y={Math.min(Math.max(o.y + 14, 14), H - 4)} className="tick" textAnchor="middle">{fmt(v, 3)}</text>)}
        {ticksY.map((v) => v !== 0 && <text key={`ty${v}`} x={Math.min(Math.max(o.x - 5, 34), W - 4)} y={Y(v) + 4} className="tick" textAnchor="end">{fmt(v, 3)}</text>)}
        {field.map((a, i) => {
          const L = (Math.min(W, H) / G) * 0.38;
          const nrm = Math.hypot(a.dx, a.dy) || 1;
          const ux = (a.dx / nrm) * L, uy = (a.dy / nrm) * L;
          const op = 0.25 + 0.55 * Math.pow(a.m, 0.35);
          return <line key={i} x1={a.x - ux} y1={a.y - uy} x2={a.x + ux} y2={a.y + uy} className="field" opacity={op} markerEnd="url(#ah)" />;
        })}
        {ell && <path d={ell} className="gram" />}
        {sub?.map((s, i) => { const l = lineThrough(A.map(() => 0), s.v); return l && <g key={`s${i}`}><line style={{ stroke: s.color }} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3} strokeDasharray={s.dash ?? '10 6'} opacity={0.8} /><text style={{ fill: s.color }} x={l.lx + 6} y={l.ly + 16} className="eiglabel">{s.label}</text></g>; })}
        {eig?.map((e, i) => { const l = lineThrough(eq, e.v); return l && <g key={`e${i}`}><line style={{ stroke: e.color }} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={1.8} strokeDasharray="7 4" /><text style={{ fill: e.color }} x={l.lx + 6} y={l.ly - 6} className="eiglabel">{e.label}</text></g>; })}
        {fam.map((p, i) => <path key={`f${i}`} d={pathOf(p)} className="famtraj" />)}
        {famArrows.map((ab, i) => {
          if (!ab) return null;
          const [a, b] = ab;
          const x1 = X(a[ix]), y1 = Y(a[iy]);
          if (x1 < 0 || x1 > W || y1 < 0 || y1 > H) return null;
          return <line key={`fa${i}`} x1={x1} y1={y1} x2={X(b[ix])} y2={Y(b[iy])} className="famarrow" markerEnd="url(#ah)" />;
        })}
        {extraTr.map((e, i) => <g key={`x${i}`}><path style={{ stroke: e.color }} d={pathOf(e.pts)} fill="none" strokeWidth={2.4} strokeDasharray={e.dash} /><circle style={{ fill: e.color }} cx={X(e.x0[ix])} cy={Y(e.x0[iy])} r={5} /></g>)}
        {!hideMain && <path d={pathOf(main)} className="maintraj" />}
        <circle cx={X(eq[ix])} cy={Y(eq[iy])} r={4.5} className="eqpt" />
        {!hideMain && <circle cx={X(x0[ix])} cy={Y(x0[iy])} r={6.5} className="x0pt" />}
        {!hideMain && <text x={X(x0[ix]) + 9} y={Y(x0[iy]) - 8} className="x0label">x(0)</text>}
        {dot && <circle cx={X(dot[ix])} cy={Y(dot[iy])} r={6} className="animdot" />}
      </svg>
      <span className="ph-xl"><Tex tex={labels[0]} /></span>
      <span className="ph-yl"><Tex tex={labels[1]} /></span>
      <div className="sp-zoom">
        <button onClick={() => setView({ ...view, rx: view.rx / 1.25, ry: view.ry / 1.25 })}>+</button>
        <button onClick={() => setView({ ...view, rx: view.rx * 1.25, ry: view.ry * 1.25 })}>−</button>
        <button onClick={fit} title={t('sp.fit')}>⤢</button>
      </div>
    </div>
  );
}

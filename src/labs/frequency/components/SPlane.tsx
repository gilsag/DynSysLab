import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Complex, Root, SystemDef } from '../math/types';
import { newId } from '../math/types';
import { closedLoopPoles, rootLocus, isProper } from '../math/tf';
import { linTicks, niceStep, useSize } from './plotUtils';
import { fmt, type Lang } from '../i18n';

export type EditMode = 'move' | 'pole' | 'zero' | 'delete';

interface Props {
  sys: SystemDef;
  onRoots: (roots: Root[], commit: boolean) => void;
  mode: EditMode;
  selected: string | null;
  onSelect: (id: string | null) => void;
  wStar: number | null;
  showVectors: boolean;
  showCL: boolean;
  showLocus: boolean;
  snap: boolean;
  overlayRoots: Root[] | null;
  lang: Lang;
  fitSignal: number;
}

interface View {
  cx: number;
  cy: number;
  half: number;
}

function fitView(roots: Root[], aspect: number): View {
  if (!roots.length) return { cx: -0.5, cy: 0, half: 2.5 };
  let xmin = 0;
  let xmax = 0;
  let ymax = 0;
  for (const r of roots) {
    xmin = Math.min(xmin, r.re);
    xmax = Math.max(xmax, r.re);
    ymax = Math.max(ymax, Math.abs(r.im));
  }
  const hx = ((xmax - xmin) / 2) * 1.3;
  const hy = ymax * 1.3 * aspect;
  let half = Math.max(hx, hy, 1e-3);
  if (half === 1e-3) half = Math.max(Math.abs(xmin), Math.abs(xmax), 1) * 1.5;
  half = Math.max(half, (Math.max(Math.abs(xmin), xmax) || 1) * 0.3);
  return { cx: (xmin + xmax) / 2, cy: 0, half };
}

export default function SPlane(p: Props) {
  const [wrap, size] = useSize<HTMLDivElement>();
  const W = size.w;
  const H = Math.round(Math.min(Math.max(W * 0.78, 260), 460));
  const aspect = W / H;
  const [view, setView] = useState<View>(() => fitView(p.sys.roots, 1.3));
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; pan?: { x: number; y: number; v: View } } | null>(null);
  const [hover, setHover] = useState<Complex | null>(null);
  const rootsRef = useRef(p.sys.roots);
  rootsRef.current = p.sys.roots;

  useEffect(() => {
    setView(fitView(p.sys.roots, aspect));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.fitSignal, aspect > 0]);

  const scale = W / (2 * view.half);
  const X = (x: number) => (x - (view.cx - view.half)) * scale;
  const Y = (y: number) => H / 2 - (y - view.cy) * scale;
  const toS = (px: number, py: number): Complex => ({
    re: view.cx - view.half + px / scale,
    im: view.cy + (H / 2 - py) / scale,
  });

  const gridStep = niceStep(2 * view.half, 8);
  const xr = [view.cx - view.half, view.cx + view.half];
  const yh = H / 2 / scale;
  const yr = [view.cy - yh, view.cy + yh];

  // wheel zoom (non-passive)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setView((v) => {
        const sc = W / (2 * v.half);
        const sx = v.cx - v.half + px / sc;
        const sy = v.cy + (H / 2 - py) / sc;
        const f = e.deltaY > 0 ? 1.15 : 1 / 1.15;
        const half = Math.min(Math.max(v.half * f, 1e-4), 1e6);
        const nsc = W / (2 * half);
        return { half, cx: sx - (px / nsc - half), cy: sy - (H / 2 - py) / nsc };
      });
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, [W, H]);

  const snapPt = (s: Complex): Complex => {
    let { re, im } = s;
    const st = gridStep / 4;
    if (p.snap) {
      re = Math.round(re / st) * st;
      im = Math.round(im / st) * st;
    }
    const thr = view.half * 0.025;
    if (Math.abs(im) < thr) im = 0;
    if (Math.abs(re) < thr) re = 0;
    const clean = (v: number) => +v.toPrecision(6);
    return { re: clean(re), im: clean(im) };
  };

  const local = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { px: e.clientX - rect.left, py: e.clientY - rect.top };
  };

  const onRootDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (p.mode === 'delete') {
      p.onRoots(
        rootsRef.current.filter((r) => r.id !== id),
        true,
      );
      p.onSelect(null);
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    svgRef.current!.setPointerCapture(e.pointerId);
    drag.current = { id };
    p.onSelect(id);
  };

  const onBgDown = (e: React.PointerEvent) => {
    const { px, py } = local(e);
    if (p.mode === 'pole' || p.mode === 'zero') {
      const s = snapPt(toS(px, py));
      const r: Root = { id: newId(), kind: p.mode, re: s.re, im: Math.abs(s.im) };
      p.onRoots([...rootsRef.current, r], true);
      p.onSelect(r.id);
      return;
    }
    if (p.mode === 'move') {
      svgRef.current!.setPointerCapture(e.pointerId);
      drag.current = { id: '', pan: { x: px, y: py, v: view } };
      p.onSelect(null);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const { px, py } = local(e);
    setHover(toS(px, py));
    const d = drag.current;
    if (!d) return;
    if (d.pan) {
      const v = d.pan.v;
      const sc = W / (2 * v.half);
      setView({ ...v, cx: v.cx - (px - d.pan.x) / sc, cy: v.cy + (py - d.pan.y) / sc });
      return;
    }
    const s = snapPt(toS(px, py));
    const roots = rootsRef.current;
    const r = roots.find((x) => x.id === d.id);
    if (!r) return;
    let next: Root[];
    if (r.im > 0) {
      const im = Math.abs(s.im);
      if (im === 0) {
        // pair breaks away on the real axis → two coincident real roots
        next = roots.flatMap((x) =>
          x.id === r.id ? [{ ...x, re: s.re, im: 0 }, { id: newId(), kind: x.kind, re: s.re, im: 0 }] : [x],
        );
      } else next = roots.map((x) => (x.id === r.id ? { ...x, re: s.re, im } : x));
    } else {
      if (s.im !== 0) {
        // try to merge with a nearby real root of the same kind
        const others = roots.filter((x) => x.id !== r.id && x.kind === r.kind && x.im === 0);
        let best: Root | null = null;
        for (const o of others) if (!best || Math.abs(o.re - r.re) < Math.abs(best.re - r.re)) best = o;
        if (best && Math.abs(best.re - r.re) <= view.half * 0.12) {
          next = roots
            .filter((x) => x.id !== best!.id)
            .map((x) => (x.id === r.id ? { ...x, re: s.re, im: Math.abs(s.im) } : x));
        } else next = roots.map((x) => (x.id === r.id ? { ...x, re: s.re, im: 0 } : x));
      } else next = roots.map((x) => (x.id === r.id ? { ...x, re: s.re, im: 0 } : x));
    }
    p.onRoots(next, false);
  };

  const onUp = () => {
    if (drag.current && !drag.current.pan) p.onRoots(rootsRef.current, true);
    drag.current = null;
  };

  const proper = isProper(p.sys);
  const cl = useMemo(() => (p.showCL && proper ? closedLoopPoles(p.sys) : []), [p.sys, p.showCL, proper]);
  const locus = useMemo(() => (p.showLocus && proper ? rootLocus(p.sys) : []), [p.sys, p.showLocus, proper]);

  // coincidence counts
  const multKey = (r: Complex, kind: string) => `${kind}:${r.re.toPrecision(5)}:${r.im.toPrecision(5)}`;
  const mult = new Map<string, number>();
  for (const r of p.sys.roots) {
    for (const c of r.im > 0 ? [r, { re: r.re, im: -r.im }] : [r]) {
      const k = multKey(c, r.kind);
      mult.set(k, (mult.get(k) ?? 0) + 1);
    }
  }

  const markers: JSX.Element[] = [];
  const drawn = new Set<string>();
  const R = 7;
  for (const r of p.sys.roots) {
    const pts = r.im > 0 ? [{ re: r.re, im: r.im }, { re: r.re, im: -r.im }] : [{ re: r.re, im: 0 }];
    pts.forEach((c, i) => {
      const x = X(c.re);
      const y = Y(c.im);
      const sel = p.selected === r.id;
      const k = multKey(c, r.kind);
      const first = !drawn.has(k);
      drawn.add(k);
      const cls = `root ${r.kind} ${sel ? 'sel' : ''} mode-${p.mode}`;
      markers.push(
        <g key={`${r.id}-${i}`} className={cls} onPointerDown={(e) => onRootDown(e, r.id)}>
          <circle cx={x} cy={y} r={R + 6} className="hit" />
          {sel && <circle cx={x} cy={y} r={R + 4} className="halo" />}
          {r.kind === 'pole' ? (
            <path d={`M${x - R},${y - R}L${x + R},${y + R}M${x - R},${y + R}L${x + R},${y - R}`} className="mark" />
          ) : (
            <circle cx={x} cy={y} r={R - 0.5} className="mark" />
          )}
          {first && (mult.get(k) ?? 1) > 1 && (
            <text x={x + R + 3} y={y - R} className="mult">
              {mult.get(k)}
            </text>
          )}
        </g>,
      );
    });
  }

  const wy = p.wStar !== null ? Y(p.wStar) : null;

  return (
    <div ref={wrap} className="splane-wrap">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        className={`splane mode-${p.mode}`}
        onPointerDown={onBgDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="s-plane"
      >
        <rect x={0} y={0} width={Math.max(0, Math.min(W, X(0)))} height={H} className="lhp" />
        {linTicks(xr[0], xr[1], Math.max(3, Math.floor(W / 64))).map((v) => (
          <g key={`gx${v}`}>
            <line x1={X(v)} x2={X(v)} y1={0} y2={H} className={v === 0 ? 'axis' : 'grid'} />
            {v !== 0 && (
              <text x={X(v)} y={Math.min(Math.max(Y(0) + 13, 12), H - 4)} className="tick" textAnchor="middle">
                {fmt(v, p.lang)}
              </text>
            )}
          </g>
        ))}
        {linTicks(yr[0], yr[1], Math.max(3, Math.floor(H / 44))).map((v) => (
          <g key={`gy${v}`}>
            <line x1={0} x2={W} y1={Y(v)} y2={Y(v)} className={v === 0 ? 'axis' : 'grid'} />
            {v !== 0 && (
              <text x={Math.min(Math.max(X(0) + 5, 4), W - 40)} y={Y(v) - 3} className="tick">
                {fmt(v, p.lang)}j
              </text>
            )}
          </g>
        ))}
        <text x={W - 6} y={Math.min(Math.max(Y(0) - 6, 12), H - 4)} className="axlabel" textAnchor="end">
          σ
        </text>
        <text x={Math.min(Math.max(X(0) - 6, 20), W - 6)} y={14} className="axlabel" textAnchor="end">
          jω
        </text>

        {locus.map((c, i) => (
          <circle key={`l${i}`} cx={X(c.re)} cy={Y(c.im)} r={1.3} className="locus" />
        ))}

        {p.showVectors && wy !== null && (
          <g className="vectors">
            {p.sys.roots.flatMap((r) =>
              (r.im > 0 ? [r.im, -r.im] : [0]).map((im, i) => (
                <line key={`v${r.id}${i}`} x1={X(r.re)} y1={Y(im)} x2={X(0)} y2={wy} className={`vec ${r.kind}`} />
              )),
            )}
            <circle cx={X(0)} cy={wy} r={4.5} className="wstar" />
            <text
              x={X(0) > W - 90 ? X(0) - 8 : X(0) + 8}
              y={wy - 6}
              className="wstar-label"
              textAnchor={X(0) > W - 90 ? 'end' : 'start'}
            >
              jω = {fmt(p.wStar!, p.lang)}j
            </text>
          </g>
        )}

        {p.overlayRoots?.flatMap((r) =>
          (r.im > 0 ? [r.im, -r.im] : [0]).map((im, i) => {
            const x = X(r.re);
            const y = Y(im);
            return r.kind === 'pole' ? (
              <path
                key={`o${r.id}${i}`}
                d={`M${x - 6},${y - 6}L${x + 6},${y + 6}M${x - 6},${y + 6}L${x + 6},${y - 6}`}
                className="overlay-root"
              />
            ) : (
              <circle key={`o${r.id}${i}`} cx={x} cy={y} r={6} className="overlay-root" />
            );
          }),
        )}

        {cl.map((c, i) => (
          <rect
            key={`cl${i}`}
            x={X(c.re) - 4}
            y={Y(c.im) - 4}
            width={8}
            height={8}
            transform={`rotate(45 ${X(c.re)} ${Y(c.im)})`}
            className={`clpole ${c.re > 1e-9 ? 'bad' : 'good'}`}
          />
        ))}

        {markers}
      </svg>
      <div className="splane-status">
        {hover ? (
          <span>
            s = {fmt(hover.re, p.lang)} {hover.im < 0 ? '−' : '+'} j{fmt(Math.abs(hover.im), p.lang)}
          </span>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );
}

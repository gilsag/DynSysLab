import { useEffect, useMemo, useRef, useState } from 'react';
import { C, cabs } from '../math/complex';
import { PZState, Root, newRoot, orderOf } from '../model';
import { useWidth, Tex } from './basic';
import { niceTicks } from './Plot';
import { fmt, fmtComplex } from '../format';
import { useT } from '../i18n';

export type PZTool = 'move' | 'pole' | 'zero' | 'delete';
export interface ModeFlag { lambda: C; c: boolean; o: boolean }

interface View { xc: number; yc: number; upp: number } // unidades por píxel

export const MAX_ORDER = 8;

export function SPlane({ pz, onPZ, poles, zeros, editable, tool, snap, height, showDamping, loci, flags, fitKey }: {
  pz?: PZState; onPZ?: (p: PZState) => void; poles: C[]; zeros: C[]; editable: boolean; tool: PZTool; snap: number; height: number;
  showDamping: boolean; loci?: { pts: C[]; label: string }[]; flags?: ModeFlag[]; fitKey?: string;
}) {
  const { t } = useT();
  const [ref, W] = useWidth<HTMLDivElement>(600);
  const H = height;
  const [view, setView] = useState<View>({ xc: -3, yc: 0, upp: 0.02 });
  const [drag, setDrag] = useState<{ kind: 'pole' | 'zero'; id: number } | null>(null);
  const [hover, setHover] = useState<{ z: C; kind: 'pole' | 'zero'; px: number; py: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Ajuste automático de la vista
  const fit = () => {
    const pts = [...poles, ...zeros];
    let xa = Math.min(-1, ...pts.map((p) => p.re)), xb = Math.max(1, ...pts.map((p) => p.re));
    const ym = Math.max(1, ...pts.map((p) => Math.abs(p.im)));
    const spanX = (xb - xa) * 1.35 + 1, spanY = 2 * ym * 1.35 + 1;
    const upp = Math.max(spanX / Math.max(W, 100), spanY / H);
    setView({ xc: (xa + xb) / 2, yc: 0, upp });
  };
  useEffect(fit, [fitKey, W > 100 ? Math.round(W / 50) : 0]);

  const toPx = (z: C) => ({ x: W / 2 + (z.re - view.xc) / view.upp, y: H / 2 - (z.im - view.yc) / view.upp });
  const toW = (x: number, y: number): C => ({ re: view.xc + (x - W / 2) * view.upp, im: view.yc - (y - H / 2) * view.upp });

  const evPos = (e: React.PointerEvent | React.MouseEvent | React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const snapVal = (v: number, alt: boolean) => (snap > 0 && !alt ? Math.round(v / snap) * snap : v);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 2200); };

  const onBgDown = (e: React.PointerEvent) => {
    if (!editable || !pz || !onPZ || e.button !== 0) return;
    if (tool === 'move') return flash(t('sp.useTool'));
    if (tool !== 'pole' && tool !== 'zero') return;
    const { x, y } = evPos(e);
    const w = toW(x, y);
    let re = snapVal(w.re, e.altKey), im = Math.abs(snapVal(w.im, e.altKey));
    if (im < 8 * view.upp) im = 0;
    const add = im > 0 ? 2 : 1;
    if (tool === 'pole') {
      if (orderOf(pz.poles) + add > MAX_ORDER) return flash(t('sp.maxOrder'));
      onPZ({ ...pz, poles: [...pz.poles, newRoot(re, im)] });
    } else {
      if (orderOf(pz.zeros) + add > orderOf(pz.poles)) return flash(t('sp.tooManyZeros'));
      onPZ({ ...pz, zeros: [...pz.zeros, newRoot(re, im)] });
    }
  };

  const remove = (kind: 'pole' | 'zero', id: number) => {
    if (!pz || !onPZ) return;
    if (kind === 'pole') {
      const np = pz.poles.filter((r) => r.id !== id);
      if (orderOf(np) < 1) return flash(t('sp.minOnePole'));
      if (orderOf(np) < orderOf(pz.zeros)) return flash(t('sp.removeZeroFirst'));
      onPZ({ ...pz, poles: np });
    } else onPZ({ ...pz, zeros: pz.zeros.filter((r) => r.id !== id) });
  };

  const onRootDown = (e: React.PointerEvent, kind: 'pole' | 'zero', id: number) => {
    if (!editable) return;
    e.stopPropagation();
    if (e.button === 2 || tool === 'delete') { e.preventDefault(); remove(kind, id); return; }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setHover(null);
    setDrag({ kind, id });
  };

  const onMove = (e: React.PointerEvent) => {
    const { x, y } = evPos(e);
    if (!drag || !pz || !onPZ) return;
    const w = toW(x, y);
    let re = snapVal(w.re, e.altKey), im = Math.abs(snapVal(w.im, e.altKey));
    // atracción magnética hacia polos/ceros existentes
    if (!e.altKey) {
      const others = [...pz.poles.map((r) => ({ r, k: 'pole' })), ...pz.zeros.map((r) => ({ r, k: 'zero' }))].filter((o) => o.r.id !== drag.id);
      for (const o of others) {
        if (Math.hypot(o.r.re - w.re, o.r.im - Math.abs(w.im)) < 10 * view.upp) { re = o.r.re; im = o.r.im; break; }
      }
    }
    const listKey = drag.kind === 'pole' ? 'poles' : 'zeros';
    let list: Root[] = pz[listKey].map((r) => ({ ...r }));
    const me = list.find((r) => r.id === drag.id);
    if (!me) return;
    if (me.im > 0) {
      if (im < 6 * view.upp) {
        // el par cae al eje real: se separa en dos raíces reales coincidentes
        me.re = re; me.im = 0;
        list.push(newRoot(re, 0));
      } else { me.re = re; me.im = im; }
    } else {
      if (im > 12 * view.upp) {
        const reals = list.filter((r) => r.im === 0 && r.id !== me.id);
        if (reals.length) {
          const nearest = reals.reduce((b, r) => (Math.abs(r.re - me.re) < Math.abs(b.re - me.re) ? r : b));
          list = list.filter((r) => r.id !== nearest.id);
          me.re = re; me.im = im;
        } else { me.re = re; me.im = 0; }
      } else { me.re = re; me.im = 0; }
    }
    onPZ({ ...pz, [listKey]: list });
  };

  const onWheel = (e: React.WheelEvent) => {
    const { x, y } = evPos(e);
    const w0 = toW(x, y);
    const f = Math.exp(e.deltaY * 0.0012);
    const upp = Math.min(Math.max(view.upp * f, 1e-4), 2);
    setView({ upp, xc: w0.re - (x - W / 2) * upp, yc: 0 * (w0.im + (y - H / 2) * upp) });
  };

  // Rejilla
  const xmin = toW(0, 0).re, xmax = toW(W, 0).re, ymax = toW(0, 0).im, ymin = toW(0, H).im;
  const xt = niceTicks(xmin, xmax, Math.floor(W / 70));
  const yt = niceTicks(ymin, ymax, Math.floor(H / 60));
  const o = toPx({ re: 0, im: 0 });

  // multiplicidades y cancelaciones
  const groups = useMemo(() => {
    const g: { z: C; np: number; nz: number }[] = [];
    const add = (z: C, k: 'p' | 'z') => {
      const e = g.find((q) => cabs({ re: q.z.re - z.re, im: q.z.im - z.im }) < 1e-7 * (1 + cabs(z)));
      if (e) { if (k === 'p') e.np++; else e.nz++; } else g.push({ z, np: k === 'p' ? 1 : 0, nz: k === 'z' ? 1 : 0 });
    };
    poles.forEach((p) => add(p, 'p'));
    zeros.forEach((z) => add(z, 'z'));
    return g;
  }, [poles, zeros]);

  const pzRoots = (kind: 'pole' | 'zero') => {
    if (editable && pz) {
      const list = kind === 'pole' ? pz.poles : pz.zeros;
      return list.flatMap((r) => (r.im > 0 ? [{ id: r.id, z: { re: r.re, im: r.im } }, { id: r.id, z: { re: r.re, im: -r.im } }] : [{ id: r.id, z: { re: r.re, im: 0 } }]));
    }
    return (kind === 'pole' ? poles : zeros).map((z, i) => ({ id: -1 - i, z }));
  };

  const zetaLines = [0.1, 0.3, 0.5, 0.7, 0.9];
  const R = Math.max(Math.abs(xmin), Math.abs(xmax), Math.abs(ymax)) * 1.5;
  const wnTicks = niceTicks(0, Math.max(Math.abs(xmin), ymax), 5).filter((v) => v > 0);

  const dragRoot = drag && pz ? (drag.kind === 'pole' ? pz.poles : pz.zeros).find((r) => r.id === drag.id) : undefined;
  const tip = dragRoot && drag ? (() => { const z = { re: dragRoot.re, im: dragRoot.im }; const q = toPx(z); return { z, kind: drag.kind, px: q.x, py: q.y }; })() : hover;
  const cursor = drag ? 'grabbing' : tool === 'pole' || tool === 'zero' ? 'crosshair' : tool === 'delete' ? 'not-allowed' : 'default';

  return (
    <div className="splane" ref={ref} onContextMenu={(e) => e.preventDefault()}>
      <svg ref={svgRef} width={W} height={H} style={{ cursor }} onPointerDown={onBgDown} onPointerMove={onMove}
        onPointerUp={() => setDrag(null)} onPointerLeave={() => { setHover(null); }} onWheel={onWheel}>
        <rect x={0} y={0} width={Math.max(0, o.x)} height={H} className="lhp" />
        <rect x={Math.max(0, o.x)} y={0} width={Math.max(0, W - o.x)} height={H} className="rhp" />
        {xt.map((v) => <line key={`x${v}`} x1={toPx({ re: v, im: 0 }).x} x2={toPx({ re: v, im: 0 }).x} y1={0} y2={H} className="grid" />)}
        {yt.map((v) => <line key={`y${v}`} y1={toPx({ re: 0, im: v }).y} y2={toPx({ re: 0, im: v }).y} x1={0} x2={W} className="grid" />)}
        {showDamping && (
          <g className="damping">
            {zetaLines.map((z) => {
              const th = Math.acos(z);
              const a = toPx({ re: -R * z, im: R * Math.sin(th) }), b = toPx({ re: -R * z, im: -R * Math.sin(th) });
              const lab = toPx({ re: -z * Math.abs(xmin) * 0.92, im: Math.sin(th) * Math.abs(xmin) * 0.92 });
              return <g key={z}><line x1={o.x} y1={o.y} x2={a.x} y2={a.y} /><line x1={o.x} y1={o.y} x2={b.x} y2={b.y} />
                {lab.y > 14 && <text x={lab.x} y={lab.y} className="dlabel">ζ={fmt(z)}</text>}</g>;
            })}
            {wnTicks.map((r) => <path key={r} d={`M ${o.x} ${o.y - r / view.upp} A ${r / view.upp} ${r / view.upp} 0 0 0 ${o.x} ${o.y + r / view.upp}`} fill="none" />)}
          </g>
        )}
        <line x1={0} x2={W} y1={o.y} y2={o.y} className="axis" />
        <line y1={0} y2={H} x1={o.x} x2={o.x} className="axis" />
        {xt.map((v) => v !== 0 && <text key={`tx${v}`} x={toPx({ re: v, im: 0 }).x} y={Math.min(Math.max(o.y + 14, 14), H - 4)} className="tick" textAnchor="middle">{fmt(v, 3)}</text>)}
        {yt.map((v) => v !== 0 && <text key={`ty${v}`} x={Math.min(Math.max(o.x - 5, 26), W - 4)} y={toPx({ re: 0, im: v }).y + 4} className="tick" textAnchor="end">{fmt(v, 3)}j</text>)}
        <text x={W - 8} y={o.y - 6} textAnchor="end" className="axname">σ = Re{'{'}s{'}'}</text>
        <text x={o.x + 6} y={14} className="axname">jω = Im{'{'}s{'}'}</text>

        {loci?.map((l, i) => (
          <g key={`l${i}`} className="locus">
            {l.pts.map((p, k) => { const q = toPx(p); return <circle key={k} cx={q.x} cy={q.y} r={2.2} opacity={0.25 + 0.6 * (k / l.pts.length)} />; })}
            {l.pts.length > 0 && (() => { const q = toPx(l.pts[l.pts.length - 1]); return <text x={q.x + 6} y={q.y - 6}>{l.label}</text>; })()}
          </g>
        ))}
        {groups.filter((g) => g.np > 0 && g.nz > 0).map((g, i) => { const q = toPx(g.z); return <circle key={`cn${i}`} cx={q.x} cy={q.y} r={15} className="cancel-ring" />; })}
        {flags?.filter((f) => !f.c || !f.o).flatMap((f) => (f.lambda.im ? [f.lambda, { re: f.lambda.re, im: -f.lambda.im }] : [f.lambda]).map((z, k) => {
          const q = toPx(z);
          return <g key={`fl${f.lambda.re}${f.lambda.im}${k}`} className="modeflag"><circle cx={q.x} cy={q.y} r={19} />
            <text x={q.x + 16} y={q.y + 26}>{[!f.c ? t('sp.flagNC') : '', !f.o ? t('sp.flagNO') : ''].filter(Boolean).join(' · ')}</text></g>;
        }))}

        {pzRoots('zero').map(({ id, z }, i) => {
          const q = toPx(z);
          return <g key={`z${id}-${i}`} className={`zero ${editable ? 'drag' : ''}`} onPointerDown={(e) => onRootDown(e, 'zero', id)}
            onPointerEnter={() => setHover({ z, kind: 'zero', px: q.x, py: q.y })} onPointerLeave={() => setHover(null)}>
            <circle cx={q.x} cy={q.y} r={14} className="hit" />
            <circle cx={q.x} cy={q.y} r={7} className={z.re > 1e-12 ? 'unst' : ''} />
          </g>;
        })}
        {pzRoots('pole').map(({ id, z }, i) => {
          const q = toPx(z);
          const s = 7;
          return <g key={`p${id}-${i}`} className={`pole ${editable ? 'drag' : ''} ${z.re > 1e-12 ? 'unst' : Math.abs(z.re) <= 1e-12 ? 'marg' : ''}`} onPointerDown={(e) => onRootDown(e, 'pole', id)}
            onPointerEnter={() => setHover({ z, kind: 'pole', px: q.x, py: q.y })} onPointerLeave={() => setHover(null)}>
            <circle cx={q.x} cy={q.y} r={14} className="hit" />
            <line x1={q.x - s} y1={q.y - s} x2={q.x + s} y2={q.y + s} /><line x1={q.x - s} y1={q.y + s} x2={q.x + s} y2={q.y - s} />
          </g>;
        })}
        {groups.filter((g) => g.np > 1 || g.nz > 1).map((g, i) => { const q = toPx(g.z); return <text key={`m${i}`} x={q.x + 10} y={q.y - 9} className="mult">{g.np > 1 ? `×${g.np}` : ''}{g.np > 1 && g.nz > 1 ? ' ' : ''}{g.nz > 1 ? `○${g.nz}` : ''}</text>; })}
      </svg>
      <div className="sp-zoom">
        <button onClick={() => setView({ ...view, upp: view.upp / 1.25 })} title="+">+</button>
        <button onClick={() => setView({ ...view, upp: view.upp * 1.25 })} title="−">−</button>
        <button onClick={fit} title={t('sp.fit')}>⤢</button>
      </div>
      {tip && (
        <div className="sp-tip" style={{ left: Math.min(tip.px + 14, W - 210), top: Math.max(tip.py - 70, 4) }}>
          <b>{tip.kind === 'pole' ? t('sp.pole') : t('sp.zero')}</b>: <Tex tex={`s = ${fmtComplex(tip.z).replace(/−/g, '-').replace(/,/g, '{,}').replace(/\+ (\S+)j/, (_m, a) => `\\pm j${a}`)}`} />
          {tip.kind === 'pole' && <PoleInfo z={tip.z} />}
        </div>
      )}
      {msg && <div className="sp-msg">{msg}</div>}
    </div>
  );
}

export function poleData(z: C) {
  const wn = cabs(z);
  const zeta = wn > 0 ? -z.re / wn : NaN;
  const tau = z.re !== 0 ? -1 / z.re : Infinity;
  return { wn, zeta, tau, wd: Math.abs(z.im) };
}

function PoleInfo({ z }: { z: C }) {
  const { t } = useT();
  const d = poleData(z);
  return (
    <div className="pinfo">
      {z.im !== 0 && <div><Tex tex="\omega_n" /> = {fmt(d.wn)} rad/s · <Tex tex="\zeta" /> = {fmt(d.zeta, 3)}</div>}
      {z.im !== 0 && <div><Tex tex="\omega_d" /> = {fmt(d.wd)} rad/s</div>}
      {z.re < 0 && <div><Tex tex="\tau = -1/\mathrm{Re}\{\lambda\}" /> = {fmt(d.tau)} s</div>}
      <div className="muted">{z.re < -1e-12 ? (z.im ? t('mode.decayOsc') : t('mode.decay')) : z.re > 1e-12 ? (z.im ? t('mode.growOsc') : t('mode.grow')) : z.im ? t('mode.sustained') : t('mode.constant')}</div>
    </div>
  );
}

// Block diagrams: canonical forms drawn from the coefficients, and chains with loops for the reduction examples.
import type { ReactNode } from 'react';
import { fmt } from '@shared/format';
import type { LabLang } from '@shared/suite';

// ---------- primitives ----------
const Arrow = ({ d }: { d: string }) => <path d={d} className="bd-w" markerEnd="url(#bd-arr)" />;
const Wire = ({ d }: { d: string }) => <path d={d} className="bd-w" />;
function Sum({ x, y, signs }: { x: number; y: number; signs?: { dx: number; dy: number; s: string }[] }) {
  return (
    <g>
      <circle cx={x} cy={y} r={10} className="bd-sum" />
      <path d={`M ${x - 5} ${y} L ${x + 5} ${y} M ${x} ${y - 5} L ${x} ${y + 5}`} className="bd-w thin" />
      {signs?.map((g, i) => <text key={i} x={x + g.dx} y={y + g.dy} className="bd-sign" textAnchor="middle">{g.s}</text>)}
    </g>
  );
}
function Block({ x, y, w, label, cls = '' }: { x: number; y: number; w: number; label: string; cls?: string }) {
  return (
    <g className={'bd-block ' + cls}>
      <rect x={x - w / 2} y={y - 14} width={w} height={28} rx={3} />
      <text x={x} y={y + 4.5} textAnchor="middle">{label}</text>
    </g>
  );
}
const Dot = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r={2.8} className="bd-dot" />;
const Lab = ({ x, y, t, anchor = 'middle', cls = '' }: { x: number; y: number; t: string; anchor?: 'start' | 'middle' | 'end'; cls?: string }) => (
  <text x={x} y={y} textAnchor={anchor} className={'bd-lab ' + cls}>{t}</text>
);
const defs = (
  <defs>
    <marker id="bd-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" className="bd-head" />
    </marker>
  </defs>
);
const sub = (i: number) => String(i).split('').map((c) => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('');

// ---------- canonical forms ----------
/** a: monic denominator coefficients a₀…aₙ₋₁; c: numerator of the strictly proper part c₀…cₙ₋₁; d: direct term. */
export function CanonicalDiagram({ form, a, c, d, lang }: { form: 'ccf' | 'ocf'; a: number[]; c: number[]; d: number; lang: LabLang }) {
  const n = a.length;
  const g = (v: number) => fmt(v, lang, 3);
  const parts: ReactNode[] = [];
  const MY = 150, SP = 118;
  const nz = (v: number) => Math.abs(v) > 1e-12;
  if (form === 'ccf') {
    const xS = 70;
    const xI = (j: number) => xS + 62 + (n - j) * SP; // integrator producing x_j (j = n … 1)
    const xNode = (j: number) => xI(j) + 40;
    const xEnd = xNode(1) + 50;
    const xT = xEnd + 40;
    parts.push(<Lab key="u" x={12} y={MY + 4} t="u" anchor="start" cls="io" />, <Arrow key="u-s" d={`M 24 ${MY} L ${xS - 11} ${MY}`} />);
    parts.push(<Sum key="S" x={xS} y={MY} signs={[{ dx: -16, dy: -6, s: '+' }, { dx: 10, dy: 24, s: '−' }]} />);
    let prev = xS + 10;
    for (let j = n; j >= 1; j--) {
      parts.push(<Arrow key={`a${j}`} d={`M ${prev} ${MY} L ${xI(j) - 19} ${MY}`} />);
      parts.push(<Block key={`I${j}`} x={xI(j)} y={MY} w={36} label="1/s" cls="int" />);
      parts.push(<Wire key={`w${j}`} d={`M ${xI(j) + 18} ${MY} L ${xNode(j)} ${MY}`} />, <Dot key={`d${j}`} x={xNode(j)} y={MY} />);
      parts.push(<Lab key={`x${j}`} x={xNode(j) + 4} y={MY + 16} t={`x${sub(j)}`} anchor="start" cls="state" />);
      prev = xNode(j);
    }
    // feedback gains a_{j−1} from x_j down to the bottom bus
    const busB = MY + 96;
    let rightmost = -Infinity;
    for (let j = 1; j <= n; j++) {
      const v = a[j - 1];
      if (!nz(v)) continue;
      const x = xNode(j);
      parts.push(<Wire key={`fb${j}`} d={`M ${x} ${MY} L ${x} ${MY + 38}`} />, <Block key={`ga${j}`} x={x} y={MY + 52} w={50} label={g(v)} cls="gain" />, <Wire key={`fb2${j}`} d={`M ${x} ${MY + 66} L ${x} ${busB}`} />);
      rightmost = Math.max(rightmost, x);
    }
    if (rightmost > -Infinity) parts.push(<Wire key="bus" d={`M ${rightmost} ${busB} L ${xS} ${busB}`} />, <Arrow key="busup" d={`M ${xS} ${busB} L ${xS} ${MY + 11}`} />);
    // output gains c_{j−1} up to the top bus
    const busT = MY - 96;
    let any = false;
    for (let j = 1; j <= n; j++) {
      const v = c[j - 1];
      if (!nz(v)) continue;
      const x = xNode(j);
      any = true;
      parts.push(<Wire key={`ot${j}`} d={`M ${x} ${MY} L ${x} ${MY - 38}`} />, <Block key={`gc${j}`} x={x} y={MY - 52} w={50} label={g(v)} cls="gain out" />, <Wire key={`ot2${j}`} d={`M ${x} ${MY - 66} L ${x} ${busT}`} />);
    }
    const firstC = [...Array(n).keys()].map((k) => n - k).find((j) => nz(c[j - 1]));
    if (any && firstC) parts.push(<Arrow key="tbus" d={`M ${xNode(firstC)} ${busT} L ${xT - 11} ${busT}`} />);
    if (nz(d)) {
      const yD = busT - 40;
      parts.push(<Wire key="dpath" d={`M 40 ${MY} L 40 ${yD} L ${(40 + xT) / 2 - 25} ${yD}`} />, <Dot key="dp" x={40} y={MY} />, <Block key="gd" x={(40 + xT) / 2} y={yD} w={50} label={g(d)} cls="gain out" />, <Wire key="dpath2" d={`M ${(40 + xT) / 2 + 25} ${yD} L ${xT} ${yD}`} />);
      parts.push(<Arrow key="dT" d={`M ${xT} ${yD} L ${xT} ${busT - 11}`} />);
    }
    parts.push(<Sum key="T" x={xT} y={busT} />, <Arrow key="y" d={`M ${xT + 10} ${busT} L ${xT + 46} ${busT}`} />, <Lab key="yl" x={xT + 50} y={busT + 4} t="y" anchor="start" cls="io" />);
    const W = xT + 70;
    const top = nz(d) ? busT - 60 : busT - 20;
    return (
      <svg viewBox={`0 ${top} ${W} ${busB + 20 - top}`} className="bd-svg" role="img">
        {defs}
        {parts}
      </svg>
    );
  }
  // observable form: Σ_k → 1/s → x_k, u enters every sum through c_{k−1}, y = xₙ feeds back through −a_{k−1}
  const x0 = 70;
  const xSum = (k: number) => x0 + (k - 1) * SP;
  const xInt = (k: number) => xSum(k) + 48;
  const xNodeO = (k: number) => xInt(k) + 40;
  const busT = MY - 96, busB = MY + 96;
  const xY = xNodeO(n);
  parts.push(<Lab key="u" x={12} y={busT + 4} t="u" anchor="start" cls="io" />, <Wire key="ubus" d={`M 24 ${busT} L ${xSum(n)} ${busT}`} />);
  for (let k = 1; k <= n; k++) {
    const xs = xSum(k);
    parts.push(<Sum key={`S${k}`} x={xs} y={MY} signs={[...(k > 1 ? [{ dx: -16, dy: -6, s: '+' }] : []), { dx: 10, dy: -16, s: '+' }, { dx: 10, dy: 24, s: '−' }]} />);
    if (k > 1) parts.push(<Arrow key={`ch${k}`} d={`M ${xNodeO(k - 1)} ${MY} L ${xs - 11} ${MY}`} />);
    parts.push(<Arrow key={`si${k}`} d={`M ${xs + 10} ${MY} L ${xInt(k) - 19} ${MY}`} />, <Block key={`I${k}`} x={xInt(k)} y={MY} w={36} label="1/s" cls="int" />);
    parts.push(<Wire key={`iw${k}`} d={`M ${xInt(k) + 18} ${MY} L ${xNodeO(k)} ${MY}`} />, <Lab key={`x${k}`} x={xNodeO(k) - 4} y={MY + 16} t={`x${sub(k)}`} anchor="end" cls="state" />);
    const cv = c[k - 1];
    if (nz(cv)) parts.push(<Dot key={`ud${k}`} x={xs} y={busT} />, <Wire key={`uc${k}`} d={`M ${xs} ${busT} L ${xs} ${MY - 66}`} />, <Block key={`gc${k}`} x={xs} y={MY - 52} w={50} label={g(cv)} cls="gain" />, <Arrow key={`uc2${k}`} d={`M ${xs} ${MY - 38} L ${xs} ${MY - 11}`} />);
    const av = a[k - 1];
    if (nz(av)) parts.push(<Dot key={`fd${k}`} x={xs} y={busB} />, <Wire key={`fa${k}`} d={`M ${xs} ${busB} L ${xs} ${MY + 66}`} />, <Block key={`ga${k}`} x={xs} y={MY + 52} w={50} label={g(av)} cls="gain" />, <Arrow key={`fa2${k}`} d={`M ${xs} ${MY + 38} L ${xs} ${MY + 11}`} />);
  }
  parts.push(<Dot key="ynode" x={xY} y={MY} />, <Wire key="fbus" d={`M ${xY} ${MY} L ${xY} ${busB} L ${xSum(1)} ${busB}`} />);
  let xOut = xY;
  if (nz(d)) {
    const xT = xY + 50;
    parts.push(<Arrow key="toT" d={`M ${xY} ${MY} L ${xT - 11} ${MY}`} />, <Sum key="T" x={xT} y={MY} />);
    parts.push(<Wire key="dbus" d={`M ${xSum(n)} ${busT} L ${xT - 60} ${busT}`} />, <Block key="gd" x={xT - 35} y={busT} w={50} label={g(d)} cls="gain out" />, <Wire key="dbus2" d={`M ${xT - 10} ${busT} L ${xT} ${busT}`} />, <Arrow key="dT" d={`M ${xT} ${busT} L ${xT} ${MY - 11}`} />);
    xOut = xT + 10;
  }
  parts.push(<Arrow key="y" d={`M ${xOut} ${MY} L ${xOut + 40} ${MY}`} />, <Lab key="yl" x={xOut + 44} y={MY + 4} t="y" anchor="start" cls="io" />);
  const W = xOut + 64;
  return (
    <svg viewBox={`0 ${busT - 20} ${W} ${busB - busT + 40}`} className="bd-svg" role="img">
      {defs}
      {parts}
    </svg>
  );
}

// ---------- chains with loops (reduction examples) ----------
export type ChainNode = { k: 'sum'; id: string } | { k: 'block'; label: string; hl?: boolean } | { k: 'pick'; id: string };
export interface Loop {
  from: string; // pick id
  to: string; // sum id
  label: string;
  side: 'below' | 'above';
  level: number;
  sign: '+' | '−';
  hl?: boolean;
}
export interface Chain {
  nodes: ChainNode[];
  loops: Loop[];
}

export function ChainDiagram({ chain, input = 'R(s)', output = 'Y(s)' }: { chain: Chain; input?: string; output?: string }) {
  const above = Math.max(0, ...chain.loops.filter((l) => l.side === 'above').map((l) => l.level));
  const below = Math.max(0, ...chain.loops.filter((l) => l.side === 'below').map((l) => l.level));
  const MY = 30 + above * 48 + 10;
  const parts: ReactNode[] = [];
  const xs: Record<string, number> = {};
  let x = 58;
  parts.push(<Lab key="in" x={6} y={MY - 8} t={input} anchor="start" cls="io" />);
  let prevRight = 10;
  chain.nodes.forEach((nd, i) => {
    const w = nd.k === 'sum' ? 20 : nd.k === 'pick' ? 0 : Math.max(48, nd.label.length * 7.4 + 18);
    const cx = x + w / 2;
    if (nd.k === 'pick') {
      parts.push(<Wire key={`c${i}`} d={`M ${prevRight} ${MY} L ${cx} ${MY}`} />, <Dot key={`p${i}`} x={cx} y={MY} />);
      xs[nd.id] = cx;
      prevRight = cx;
      x += 26;
      return;
    }
    parts.push(<Arrow key={`c${i}`} d={`M ${prevRight} ${MY} L ${x - 1} ${MY}`} />);
    if (nd.k === 'sum') {
      const loopsIn = chain.loops.filter((l) => l.to === nd.id);
      parts.push(<Sum key={`s${i}`} x={cx} y={MY} signs={[{ dx: -15, dy: -7, s: '+' }, ...loopsIn.map((l) => ({ dx: 12, dy: l.side === 'below' ? 22 : -14, s: l.sign }))]} />);
      xs[nd.id] = cx;
    } else parts.push(<Block key={`b${i}`} x={cx} y={MY} w={w} label={nd.label} cls={nd.hl ? 'hl' : ''} />);
    prevRight = x + w;
    x += w + 34;
  });
  parts.push(<Arrow key="out" d={`M ${prevRight} ${MY} L ${x + 6} ${MY}`} />, <Lab key="outl" x={x + 10} y={MY - 8} t={output} anchor="start" cls="io" />);
  chain.loops.forEach((l, i) => {
    const xf = xs[l.from], xt = xs[l.to];
    if (xf === undefined || xt === undefined) return;
    const dir = l.side === 'below' ? 1 : -1;
    const yl = MY + dir * l.level * 48;
    const w = Math.max(48, l.label.length * 7.4 + 18);
    // keep the block clear of the vertical wires of other loops that cross this one
    const lo = Math.min(xf, xt), hi = Math.max(xf, xt);
    const cuts = chain.loops.filter((o) => o !== l).map((o) => xs[o.from]).filter((v) => v !== undefined && v > lo + 1 && v < hi - 1).sort((a, b) => a - b);
    const bounds = [lo, ...cuts, hi];
    let mid = (xf + xt) / 2;
    if (cuts.length) {
      let bi = 0;
      for (let k = 1; k < bounds.length - 1; k++) if (bounds[k + 1] - bounds[k] > bounds[bi + 1] - bounds[bi]) bi = k;
      mid = (bounds[bi] + bounds[bi + 1]) / 2;
    }
    const toward = xt < xf ? -1 : 1; // direction along the loop
    parts.push(<Wire key={`l${i}a`} d={`M ${xf} ${MY} L ${xf} ${yl} L ${mid - (toward * w) / 2} ${yl}`} />);
    parts.push(<Block key={`lb${i}`} x={mid} y={yl} w={w} label={l.label} cls={l.hl ? 'hl' : ''} />);
    parts.push(<Wire key={`l${i}b`} d={`M ${mid + (toward * w) / 2} ${yl} L ${xt} ${yl}`} />, <Arrow key={`l${i}c`} d={`M ${xt} ${yl} L ${xt} ${MY + dir * 11}`} />);
  });
  const W = x + 60;
  const H = MY + below * 48 + 28;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W * 1.35} height={H * 1.35} className="bd-svg chain" role="img">
      {defs}
      {parts}
    </svg>
  );
}

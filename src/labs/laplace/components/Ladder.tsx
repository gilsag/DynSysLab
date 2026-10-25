// Drawing of a ladder circuit, in the time domain or transformed to the Laplace domain.
// In the Laplace domain each storage element carries its initial-condition source: in series (voltage source,
// used for mesh analysis) or in parallel (current source, used for nodal analysis).
import type { ReactNode } from 'react';
import { fmt } from '@shared/format';
import type { LabLang } from '@shared/suite';
import type { Element, Network } from '../math/circuits';

const TOP = 52, BOT = 184, MID = (TOP + BOT) / 2, H = 214;
const SX = 34; // source axis
const SER = 84; // width of a series slot
const SHUNT = 92; // width of a shunt slot
const CXO = 28; // shunt axis from the slot start

function Sub({ tex, x, y, anchor = 'start', cls = '' }: { tex: string; x: number; y: number; anchor?: 'start' | 'middle' | 'end'; cls?: string }) {
  // "R_1" → R with subscript; "v_{C_1}(0^-)" is not handled here (plain strings only)
  const [b, s] = tex.split('_');
  return (
    <text x={x} y={y} textAnchor={anchor} className={`cl ${cls}`}>
      <tspan className="it">{b}</tspan>
      {s && <tspan dy="4" fontSize="9" className={/^[A-Za-z]/.test(s) ? 'it' : ''}>{s}</tspan>}
    </text>
  );
}

const zigH = (x: number, y: number, len: number) => {
  let d = `M ${x} ${y}`;
  for (let k = 0; k < 6; k++) d += ` L ${x + (len / 6) * (k + 0.5)} ${y + (k % 2 ? 6 : -6)}`;
  return d + ` L ${x + len} ${y}`;
};
const zigV = (x: number, y: number, len: number) => {
  let d = '';
  for (let k = 0; k < 6; k++) d += ` L ${x + (k % 2 ? 6 : -6)} ${y + (len / 6) * (k + 0.5)}`;
  return d + ` L ${x} ${y + len}`;
};
/** element body between two points on a horizontal (h) or vertical (v) line */
function body(kind: Element['kind'], o: 'h' | 'v', x: number, y: number, len: number, cls: string, key: string): ReactNode {
  if (o === 'h') {
    if (kind === 'R') return <path key={key} d={zigH(x, y, len)} className={cls} />;
    if (kind === 'L') return <path key={key} d={`M ${x} ${y} L ${x + (len - 48) / 2} ${y} ${[0, 1, 2, 3].map(() => 'a 6 6 0 0 1 12 0').join(' ')} L ${x + len} ${y}`} className={cls} />;
    const m = x + len / 2;
    return <path key={key} d={`M ${x} ${y} L ${m - 4} ${y} M ${m - 4} ${y - 12} L ${m - 4} ${y + 12} M ${m + 4} ${y - 12} L ${m + 4} ${y + 12} M ${m + 4} ${y} L ${x + len} ${y}`} className={cls} />;
  }
  if (kind === 'R') return <path key={key} d={`M ${x} ${y}${zigV(x, y + (len - 40) / 2, 40)} L ${x} ${y + len}`} className={cls} />;
  if (kind === 'L') return <path key={key} d={`M ${x} ${y} L ${x} ${y + (len - 48) / 2} ${[0, 1, 2, 3].map(() => 'a 6 6 0 0 1 0 12').join(' ')} L ${x} ${y + len}`} className={cls} />;
  const m = y + len / 2;
  return <path key={key} d={`M ${x} ${y} L ${x} ${m - 4} M ${x - 13} ${m - 4} L ${x + 13} ${m - 4} M ${x - 13} ${m + 4} L ${x + 13} ${m + 4} M ${x} ${m + 4} L ${x} ${y + len}`} className={cls} />;
}

/** small voltage source (+ toward `plusFirst` end) or current source (arrow) on a line */
function vSrc(o: 'h' | 'v', x: number, y: number, plusFirst: boolean, key: string): ReactNode {
  const r = 9;
  const [p1, p2] = o === 'h' ? [[x - 4.5, y + 3], [x + 4.5, y + 3]] : [[x, y - 2], [x, y + 7.5]];
  return (
    <g key={key} className="ic-src">
      <circle cx={x} cy={y} r={r} />
      <text x={(plusFirst ? p1 : p2)[0]} y={(plusFirst ? p1 : p2)[1]} textAnchor="middle" className="pmx">+</text>
      <text x={(plusFirst ? p2 : p1)[0]} y={(plusFirst ? p2 : p1)[1]} textAnchor="middle" className="pmx">−</text>
    </g>
  );
}
function iSrc(o: 'h' | 'v', x: number, y: number, forward: boolean, key: string): ReactNode {
  const r = 9;
  const d = o === 'h' ? (forward ? `M ${x - 5} ${y} L ${x + 5} ${y} M ${x + 1} ${y - 3.5} L ${x + 5} ${y} L ${x + 1} ${y + 3.5}` : `M ${x + 5} ${y} L ${x - 5} ${y} M ${x - 1} ${y - 3.5} L ${x - 5} ${y} L ${x - 1} ${y + 3.5}`)
    : forward ? `M ${x} ${y - 5} L ${x} ${y + 5} M ${x - 3.5} ${y + 1} L ${x} ${y + 5} L ${x + 3.5} ${y + 1}` : `M ${x} ${y + 5} L ${x} ${y - 5} M ${x - 3.5} ${y - 1} L ${x} ${y - 5} L ${x + 3.5} ${y - 1}`;
  return (
    <g key={key} className="ic-src">
      <circle cx={x} cy={y} r={r} />
      <path d={d} className="ic-arrow" />
    </g>
  );
}

export interface LadderProps {
  net: Network;
  domain: 'time' | 's';
  /** in the Laplace domain: initial-condition sources in series (mesh) or in parallel (nodal) */
  form: 'mesh' | 'nodal';
  /** index of the element whose voltage or current is the output */
  out: { what: 'v' | 'i'; index: number };
  lang: LabLang;
  /** label nodes (nodal) or draw mesh currents (mesh) */
  marks: boolean;
}

export function Ladder({ net, domain, form, out, lang, marks }: LadderProps) {
  const n = (v: number) => fmt(v, lang, 3);
  const parts: ReactNode[] = [];
  const rungs: number[] = [SX];
  const nodeX: Record<number, number> = { 1: 54 };
  let x = 64;
  let lastCx = x;
  const sDomain = domain === 's';
  net.elements.forEach((e, k) => {
    const last = k === net.elements.length - 1;
    const isOut = out.index === k;
    const hasIc = sDomain && e.kind !== 'R' && e.ic !== 0;
    const nm = e.name;
    // labels: time domain value, or impedance in the s domain
    const valueText = !sDomain
      ? `${n(e.value)} ${e.kind === 'R' ? 'Ω' : e.kind === 'L' ? 'H' : 'F'}`
      : e.kind === 'R' ? `${n(e.value)}` : e.kind === 'L' ? `${n(e.value)}s` : `${n(1 / e.value)}/s`;
    const icText = !sDomain
      ? e.kind === 'C' ? `v(0⁻) = ${n(e.ic)} V` : e.kind === 'L' ? `i(0⁻) = ${n(e.ic)} A` : ''
      : !hasIc ? '' : form === 'mesh'
        ? e.kind === 'C' ? `${n(e.ic)}/s` : `${n(e.value * e.ic)}`
        : e.kind === 'C' ? `${n(e.value * e.ic)}` : `${n(e.ic)}/s`;
    const cls = 'el' + (isOut ? ' out-el' : '');
    if (e.pos === 'series') {
      const len = hasIc && form === 'mesh' ? 50 : 60;
      parts.push(body(e.kind, 'h', x, TOP, len, cls, `b${k}`));
      if (hasIc && form === 'mesh') {
        // V_ab = Z I + E: C → +v0/s (+ at a), L → −L i0 (+ at b)
        parts.push(<path key={`w${k}`} d={`M ${x + 50} ${TOP} L ${x + 57} ${TOP} M ${x + 75} ${TOP} L ${x + SER} ${TOP}`} className="w" />);
        parts.push(vSrc('h', x + 66, TOP, e.kind === 'C', `s${k}`));
        parts.push(<text key={`st${k}`} x={x + 66} y={TOP + 24} textAnchor="middle" className="cl small src-lab">{icText}</text>);
      } else {
        parts.push(<path key={`w${k}`} d={`M ${x + 60} ${TOP} L ${x + SER} ${TOP}`} className="w" />);
      }
      if (hasIc && form === 'nodal') {
        // parallel source carrying J from a to b: C → −C v0 (drawn from b to a), L → i0/s (from a to b)
        const y2 = TOP - 22;
        parts.push(<path key={`p${k}`} d={`M ${x + 4} ${TOP} L ${x + 4} ${y2} L ${x + 21} ${y2} M ${x + 39} ${y2} L ${x + 56} ${y2} L ${x + 56} ${TOP}`} className="w" />);
        parts.push(iSrc('h', x + 30, y2, e.kind === 'L', `s${k}`));
        parts.push(<text key={`st${k}`} x={x + 30} y={y2 - 13} textAnchor="middle" className="cl small src-lab">{icText}</text>);
        parts.push(<Sub key={`n${k}`} tex={nm} x={x + 30} y={TOP + 26} anchor="middle" cls={isOut ? 'outv' : ''} />);
        parts.push(<text key={`v${k}`} x={x + 30} y={TOP + 39} textAnchor="middle" className="cl small">{valueText}</text>);
      } else {
        parts.push(<Sub key={`n${k}`} tex={nm} x={x + (hasIc && form === 'mesh' ? 25 : 30)} y={TOP - 24} anchor="middle" cls={isOut ? 'outv' : ''} />);
        parts.push(<text key={`v${k}`} x={x + (hasIc && form === 'mesh' ? 25 : 30)} y={TOP - 11} textAnchor="middle" className="cl small">{valueText}</text>);
        if (!sDomain && icText) parts.push(<text key={`ic${k}`} x={x + 30} y={TOP + 24} textAnchor="middle" className="cl small ic-lab">{icText}</text>);
      }
      if (isOut) parts.push(out.what === 'v'
        ? <g key={`o${k}`}><text x={x - 1} y={TOP - 7} className="cl outv">+</text><text x={x + 56} y={TOP - 7} className="cl outv">−</text></g>
        : <path key={`o${k}`} d={`M ${x + 18} ${TOP + 11} L ${x + 42} ${TOP + 11}`} className="arr outv-stroke" markerEnd="url(#lap-arr)" />);
      x += SER;
      nodeX[e.b] = x - 10;
    } else {
      const cx = x + CXO;
      rungs.push(cx);
      parts.push(<path key={`t${k}`} d={`M ${x} ${TOP} L ${last ? cx : x + SHUNT} ${TOP}`} className="w" />);
      const top = MID - 30;
      if (hasIc && form === 'mesh') {
        parts.push(<path key={`w0${k}`} d={`M ${cx} ${TOP} L ${cx} ${top - 8}`} className="w" />);
        parts.push(body(e.kind, 'v', cx, top - 8, 50, cls, `b${k}`));
        parts.push(<path key={`w1${k}`} d={`M ${cx} ${top + 42} L ${cx} ${MID + 23} M ${cx} ${MID + 41} L ${cx} ${BOT}`} className="w" />);
        parts.push(vSrc('v', cx, MID + 32, e.kind === 'C', `s${k}`));
        parts.push(<text key={`st${k}`} x={cx + 14} y={MID + 36} className="cl small src-lab">{icText}</text>);
      } else {
        parts.push(<path key={`w0${k}`} d={`M ${cx} ${TOP} L ${cx} ${top}`} className="w" />);
        parts.push(body(e.kind, 'v', cx, top, 60, cls, `b${k}`));
        parts.push(<path key={`w1${k}`} d={`M ${cx} ${top + 60} L ${cx} ${BOT}`} className="w" />);
      }
      let labX = cx + (e.kind === 'C' ? 17 : 11);
      if (hasIc && form === 'nodal') {
        const xs = cx + 30;
        parts.push(<path key={`p${k}`} d={`M ${cx} ${top - 8} L ${xs} ${top - 8} L ${xs} ${MID - 9} M ${xs} ${MID + 9} L ${xs} ${top + 68} L ${cx} ${top + 68}`} className="w" />);
        parts.push(iSrc('v', xs, MID, e.kind === 'L', `s${k}`));
        parts.push(<text key={`st${k}`} x={xs + 13} y={MID + 4} className="cl small src-lab">{icText}</text>);
        labX = cx - 15;
      }
      const anchorLeft = hasIc && form === 'nodal';
      parts.push(<Sub key={`n${k}`} tex={nm} x={labX} y={MID - 4} anchor={anchorLeft ? 'end' : 'start'} cls={isOut ? 'outv' : ''} />);
      parts.push(<text key={`v${k}`} x={labX} y={MID + 10} textAnchor={anchorLeft ? 'end' : 'start'} className="cl small">{valueText}</text>);
      if (!sDomain && icText) parts.push(<text key={`ic${k}`} x={labX} y={MID + 23} className="cl small ic-lab">{icText}</text>);
      if (isOut) parts.push(out.what === 'v'
        ? <g key={`o${k}`}><text x={cx - 12} y={top + 4} textAnchor="middle" className="cl outv">+</text><text x={cx - 12} y={top + 60} textAnchor="middle" className="cl outv">−</text></g>
        : <path key={`o${k}`} d={`M ${cx - 11} ${top - 2} L ${cx - 11} ${top + 18}`} className="arr outv-stroke" markerEnd="url(#lap-arr)" />);
      if (!last) parts.push(<circle key={`d${k}`} cx={cx} cy={TOP} r={2.6} className="dotn" />, <circle key={`e${k}`} cx={cx} cy={BOT} r={2.6} className="dotn" />);
      nodeX[e.a] = nodeX[e.a] ?? cx;
      lastCx = cx;
      x += SHUNT;
    }
  });
  const PADL = 22; // room for the source label on the left
  const W = Math.max(lastCx + 70, 260) + PADL;
  // marks: node numbers (nodal) or mesh currents (mesh)
  const markParts: ReactNode[] = [];
  if (marks && form === 'nodal')
    Object.entries(nodeX).forEach(([k, nx]) => {
      markParts.push(
        <g key={`node${k}`} className="node-mark">
          <circle cx={nx} cy={TOP} r={3.4} />
          <text x={nx} y={TOP - 32} textAnchor="middle" className="cl node-lab">{k}</text>
        </g>,
      );
    });
  if (marks && form === 'mesh')
    rungs.slice(1).forEach((xr, j) => {
      const xl = rungs[j];
      const cxm = (xl + xr) / 2, r = 13;
      markParts.push(
        <g key={`mesh${j}`} className="mesh-mark">
          <path d={`M ${cxm - r} ${MID + 4} A ${r} ${r} 0 1 1 ${cxm + 4} ${MID + r}`} markerEnd="url(#lap-arr-m)" />
          <text x={cxm} y={MID + 5} textAnchor="middle" className="cl mesh-lab">{`I${j + 1}`}</text>
        </g>,
      );
    });
  const src = net.def.source;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ladder" role="img">
      <defs>
        <marker id="lap-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" className="arr-head" /></marker>
        <marker id="lap-arr-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" className="mesh-head" /></marker>
      </defs>
      <g transform={`translate(${PADL} 0)`}>
      {/* source */}
      <circle cx={SX} cy={MID} r={16} className="el" />
      {src === 'V' ? (
        <>
          <text x={SX} y={MID - 3} textAnchor="middle" className="pm">+</text>
          <text x={SX} y={MID + 11} textAnchor="middle" className="pm">−</text>
        </>
      ) : (
        <path d={`M ${SX} ${MID + 8} L ${SX} ${MID - 8} M ${SX - 4} ${MID - 3} L ${SX} ${MID - 8} L ${SX + 4} ${MID - 3}`} className="el" />
      )}
      <text x={SX - 20} y={MID + 4} textAnchor="end" className="cl it">{sDomain ? 'U(s)' : 'u(t)'}</text>
      <path d={`M ${SX} ${MID - 16} L ${SX} ${TOP} L 64 ${TOP}`} className="w" />
      <path d={`M ${SX} ${MID + 16} L ${SX} ${BOT} L ${lastCx} ${BOT}`} className="w" />
      <path d={`M ${SX} ${BOT} L ${SX} ${BOT + 8} M ${SX - 8} ${BOT + 8} L ${SX + 8} ${BOT + 8} M ${SX - 5} ${BOT + 11} L ${SX + 5} ${BOT + 11} M ${SX - 2} ${BOT + 14} L ${SX + 2} ${BOT + 14}`} className="w" />
      {parts}
      {markParts}
      </g>
    </svg>
  );
}

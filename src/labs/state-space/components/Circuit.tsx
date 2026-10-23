// Drawing of a ladder circuit from the catalogue: series elements on the top rail, shunt elements to the bottom rail.
import type { ReactNode } from 'react';
import { circuitDef, type CircuitId, type COutput, type LadderEl } from '../circuits';

const TOP = 30, BOT = 136, MID = (TOP + BOT) / 2, H = 160;
const SER = 56; // width taken by a series element (50) and its lead
const SHUNT = 58; // width taken by a shunt branch
const SH_X = 24; // shunt axis from the start of its slot

/** "R_1" → R with subscript 1 (letters in italics). */
function Name({ tex, x, y, anchor = 'start', cls = '' }: { tex: string; x: number; y: number; anchor?: 'start' | 'middle' | 'end'; cls?: string }) {
  const [base, sub] = tex.split('_');
  const it = (s: string) => (/^[A-Za-z]+$/.test(s) ? 'it' : '');
  return (
    <text x={x} y={y} textAnchor={anchor} className={`cl ${cls}`}>
      <tspan className={it(base)}>{base}</tspan>
      {sub && <tspan dy="4" fontSize="9" className={it(sub)}>{sub}</tspan>}
    </text>
  );
}

const zigH = (x: number, y: number, len: number) => {
  const n = 6, w = len / n;
  let d = `M ${x} ${y}`;
  for (let k = 0; k < n; k++) d += ` L ${x + w * (k + 0.5)} ${y + (k % 2 ? 6 : -6)}`;
  return d + ` L ${x + len} ${y}`;
};
/** vertical zigzag as line segments (continues the current path) */
const zigV = (x: number, y: number, len: number) => {
  const n = 6, w = len / n;
  let d = '';
  for (let k = 0; k < n; k++) d += ` L ${x + (k % 2 ? 6 : -6)} ${y + w * (k + 0.5)}`;
  return d + ` L ${x} ${y + len}`;
};

function Arrow({ x1, y1, x2, y2, on }: { x1: number; y1: number; x2: number; y2: number; on: boolean }) {
  return <path d={`M ${x1} ${y1} L ${x2} ${y2}`} className={`arr ${on ? 'outv' : ''}`} markerEnd="url(#carr)" />;
}

export function CircuitSVG({ id, output }: { id: CircuitId; output: COutput }) {
  const def = circuitDef(id);
  const parts: ReactNode[] = [];
  const stateOn = (i?: number) => i !== undefined && output.hl.includes(i);
  const nameOf = (e: LadderEl) => def.params.find((q) => q.key === e.param)?.tex ?? e.param;
  let x = 60;
  let lastCx = x;
  def.ladder.forEach((e, k) => {
    const last = k === def.ladder.length - 1;
    const elOn = output.el === e.param;
    if (e.pos === 'series') {
      if (e.kind === 'R') parts.push(<path key={`e${k}`} d={zigH(x, TOP, 50)} className="el" />);
      else if (e.kind === 'L') parts.push(<path key={`e${k}`} d={`M ${x} ${TOP} L ${x + 1} ${TOP} ${[0, 1, 2, 3].map(() => 'a 6 6 0 0 1 12 0').join(' ')} L ${x + 50} ${TOP}`} className="el" />);
      else parts.push(<path key={`e${k}`} d={`M ${x} ${TOP} L ${x + 22} ${TOP} M ${x + 22} ${TOP - 12} L ${x + 22} ${TOP + 12} M ${x + 28} ${TOP - 12} L ${x + 28} ${TOP + 12} M ${x + 28} ${TOP} L ${x + 50} ${TOP}`} className="el" />);
      parts.push(<Name key={`n${k}`} tex={nameOf(e)} x={x + 25} y={TOP - 12} anchor="middle" cls={elOn ? 'outv' : ''} />);
      if (elOn) parts.push(<text key={`p${k}`} x={x - 2} y={TOP - 9} className="cl pm outv">+</text>, <text key={`m${k}`} x={x + 46} y={TOP - 9} className="cl pm outv">−</text>);
      if (e.kind === 'L' && e.state !== undefined) {
        parts.push(<Arrow key={`a${k}`} x1={x + 13} y1={TOP + 13} x2={x + 37} y2={TOP + 13} on={stateOn(e.state)} />);
        parts.push(<Name key={`s${k}`} tex={def.states[e.state]} x={x + 25} y={TOP + 28} anchor="middle" cls={stateOn(e.state) ? 'outv' : ''} />);
      }
      parts.push(<path key={`w${k}`} d={`M ${x + 50} ${TOP} L ${x + SER} ${TOP}`} className="w" />);
      x += SER;
    } else {
      const cx = x + SH_X;
      parts.push(<path key={`t${k}`} d={`M ${x} ${TOP} L ${last ? cx : x + SHUNT} ${TOP}`} className="w" />);
      if (e.kind === 'C') {
        parts.push(<path key={`e${k}`} d={`M ${cx} ${TOP} L ${cx} ${MID - 5} M ${cx - 13} ${MID - 5} L ${cx + 13} ${MID - 5} M ${cx - 13} ${MID + 5} L ${cx + 13} ${MID + 5} M ${cx} ${MID + 5} L ${cx} ${BOT}`} className="el" />);
      } else if (e.kind === 'R') {
        parts.push(<path key={`e${k}`} d={`M ${cx} ${TOP} L ${cx} ${MID - 22} ${zigV(cx, MID - 22, 44)} L ${cx} ${BOT}`} className="el" />);
      } else {
        parts.push(<path key={`e${k}`} d={`M ${cx} ${TOP} L ${cx} ${MID - 24} ${[0, 1, 2, 3].map(() => 'a 6 6 0 0 1 0 12').join(' ')} L ${cx} ${BOT}`} className="el" />);
      }
      parts.push(<Name key={`n${k}`} tex={nameOf(e)} x={cx + (e.kind === 'C' ? 16 : 11)} y={MID + 4} cls={elOn ? 'outv' : ''} />);
      if (e.state !== undefined) {
        const on = stateOn(e.state);
        if (e.kind === 'C') {
          parts.push(<text key={`p${k}`} x={cx - 9} y={MID - 9} textAnchor="middle" className={`cl pm ${on ? 'outv' : ''}`}>+</text>);
          parts.push(<Name key={`s${k}`} tex={def.states[e.state]} x={cx - 16} y={MID + 4} anchor="end" cls={on ? 'outv' : ''} />);
        } else {
          parts.push(<Arrow key={`a${k}`} x1={cx - 11} y1={MID - 14} x2={cx - 11} y2={MID + 6} on={on} />);
          parts.push(<Name key={`s${k}`} tex={def.states[e.state]} x={cx - 15} y={MID + 2} anchor="end" cls={on ? 'outv' : ''} />);
        }
      }
      if (!last) parts.push(<circle key={`d${k}`} cx={cx} cy={TOP} r={2.5} className="dotn" />, <circle key={`b${k}`} cx={cx} cy={BOT} r={2.5} className="dotn" />);
      lastCx = cx;
      x += SHUNT;
    }
  });
  const W = Math.max(lastCx + 34, 240);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="circuit" role="img">
      <defs>
        <marker id="carr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      {/* source */}
      <circle cx={30} cy={MID} r={15} className="el" />
      <text x={30} y={MID - 3} textAnchor="middle" className="pm">+</text>
      <text x={30} y={MID + 11} textAnchor="middle" className="pm">−</text>
      <text x={49} y={MID + 4} className="cl it">u</text>
      <path d={`M 30 ${MID - 15} L 30 ${TOP} L 60 ${TOP}`} className="w" />
      <path d={`M 30 ${MID + 15} L 30 ${BOT} L ${lastCx} ${BOT}`} className="w" />
      <path d={`M 30 ${BOT} L 30 ${BOT + 8} M 22 ${BOT + 8} L 38 ${BOT + 8} M 25 ${BOT + 11} L 35 ${BOT + 11} M 28 ${BOT + 14} L 32 ${BOT + 14}`} className="w" />
      {parts}
    </svg>
  );
}

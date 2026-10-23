import type { JSX } from 'react';
import { SS } from '../math/ss';
import { useWidth } from './basic';
import { fmt, round } from '../format';

function Label({ x, y, tex, cls }: { x: number; y: number; tex: string; cls?: string }) {
  // "x_{1}" → x con subíndice 1
  const m = tex.match(/^([^_]+)(?:_\{?([^}]*)\}?)?$/);
  const base = m ? m[1] : tex, sub = m?.[2];
  return (
    <text x={x} y={y + 5} textAnchor="middle" className={cls ?? 'fg-node-t'}>
      <tspan fontStyle="italic">{base}</tspan>{sub && <tspan dy="5" fontSize="0.72em" fontStyle={/^\d+$/.test(sub) ? 'normal' : 'italic'}>{sub}</tspan>}
    </text>
  );
}

export function FlowGraph({ ss, stateTex, inputTex, outputTex, nodeClass, height }: {
  ss: SS; stateTex: string[]; inputTex: string[]; outputTex: string[]; nodeClass?: (i: number) => string; height?: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>(600);
  const n = ss.A.length, m = ss.B[0]?.length ?? 0, p = ss.C.length;
  const H = height ?? Math.max(300, 150 * n + 40);
  const cxS = W / 2, xIn = 60, xOut = W - 60;
  const yS = (i: number) => (H * (i + 0.5)) / n;
  const yIn = (j: number) => (H * (j + 0.5)) / m;
  const yOut = (k: number) => (H * (k + 0.5)) / p;
  const R = 23;
  const maxW = Math.max(1e-9, ...ss.A.flat().map(Math.abs), ...ss.B.flat().map(Math.abs), ...ss.C.flat().map(Math.abs));
  const sw = (v: number) => 1.2 + 2.6 * Math.sqrt(Math.abs(v) / maxW);
  const nz = (v: number) => round(v) !== 0;

  const lab = (x: number, y: number, v: number, cls: string) => {
    const s = fmt(v, 3);
    const w = 8 + s.length * 7.2;
    return <g className={`fg-w ${cls}`}><rect x={x - w / 2} y={y - 10} width={w} height={19} rx={4} /><text x={x} y={y + 4.5} textAnchor="middle">{s}</text></g>;
  };

  const edges: JSX.Element[] = [];
  // B
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const v = ss.B[i][j];
    if (!nz(v)) continue;
    const x1 = xIn + 18, y1 = yIn(j), x2 = cxS - R - 3, y2 = yS(i);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    edges.push(<g key={`b${i}${j}`}><line x1={x1} y1={y1} x2={x2 - 2 * Math.cos(ang)} y2={y2 - 2 * Math.sin(ang)} className="fg-e fg-b" strokeWidth={sw(v)} markerEnd="url(#fgah-b)" />{lab(x1 + (x2 - x1) * 0.42, y1 + (y2 - y1) * 0.42, v, 'b')}</g>);
  }
  // C
  for (let k = 0; k < p; k++) for (let i = 0; i < n; i++) {
    const v = ss.C[k][i];
    if (!nz(v)) continue;
    const x1 = cxS + R + 3, y1 = yS(i), x2 = xOut - 20, y2 = yOut(k);
    edges.push(<g key={`c${k}${i}`}><line x1={x1} y1={y1} x2={x2} y2={y2} className="fg-e fg-c" strokeWidth={sw(v)} markerEnd="url(#fgah-c)" />{lab(x1 + (x2 - x1) * 0.58, y1 + (y2 - y1) * 0.58, v, 'c')}</g>);
  }
  // D
  for (let k = 0; k < p; k++) for (let j = 0; j < m; j++) {
    const v = ss.D[k]?.[j] ?? 0;
    if (!nz(v)) continue;
    const y = 14 + 18 * (k * m + j);
    edges.push(<g key={`d${k}${j}`}><path d={`M ${xIn} ${yIn(j) - 18} C ${xIn} ${y}, ${xOut} ${y}, ${xOut} ${yOut(k) - 18}`} className="fg-e fg-d" markerEnd="url(#fgah-d)" />{lab(W / 2, y + 2, v, 'd')}</g>);
  }
  // A (acoplamientos)
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    const v = ss.A[i][k];
    if (!nz(v)) continue;
    if (i === k) {
      const y = yS(i);
      const up = i === 0 ? 1 : -1; // primer nodo: lazo arriba; los demás: abajo
      const y0 = y - up * (R - 1), yc = y - up * (R + 36), yl = y - up * (R + 30);
      edges.push(<g key={`a${i}${k}`}><path d={`M ${cxS - 9} ${y0} C ${cxS - 26} ${yc}, ${cxS + 26} ${yc}, ${cxS + 9} ${y0}`} className="fg-e fg-a" strokeWidth={sw(v)} markerEnd="url(#fgah-a)" />{lab(cxS, yl, v, 'a')}</g>);
      continue;
    }
    const y1 = yS(k), y2 = yS(i);
    const side = k > i ? -1 : 1; // hacia arriba por la izquierda, hacia abajo por la derecha
    const bulge = side * (52 + 34 * (Math.abs(i - k) - 1));
    const mx = cxS + bulge * 1.5, my = (y1 + y2) / 2;
    const sx = cxS + side * R * 0.7, ex = cxS + side * R * 0.7;
    const sy = y1 + (y2 > y1 ? 1 : -1) * R * 0.7, ey = y2 - (y2 > y1 ? 1 : -1) * R * 0.75;
    edges.push(<g key={`a${i}${k}`}><path d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`} className="fg-e fg-a" strokeWidth={sw(v)} markerEnd="url(#fgah-a)" />{lab(cxS + bulge * 0.78, my, v, 'a')}</g>);
  }

  return (
    <div className="flowgraph" ref={ref}>
      <svg width={W} height={H}>
        <defs>
          {['a', 'b', 'c', 'd'].map((k) => (
            <marker key={k} id={`fgah-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L10,5 L0,10 z" className={`fg-ah-${k}`} /></marker>
          ))}
        </defs>
        {edges}
        {inputTex.map((tx, j) => <g key={`u${j}`} className="fg-io in"><rect x={xIn - 22} y={yIn(j) - 17} width={40} height={34} rx={6} /><Label x={xIn - 2} y={yIn(j)} tex={tx} /></g>)}
        {outputTex.map((tx, k) => <g key={`y${k}`} className="fg-io out"><rect x={xOut - 20} y={yOut(k) - 17} width={40} height={34} rx={6} /><Label x={xOut} y={yOut(k)} tex={tx} /></g>)}
        {stateTex.map((tx, i) => (
          <g key={`x${i}`} className={`fg-node ${nodeClass?.(i) ?? ''}`}>
            <circle cx={cxS} cy={yS(i)} r={R} />
            <Label x={cxS} y={yS(i)} tex={tx} />
          </g>
        ))}
      </svg>
    </div>
  );
}

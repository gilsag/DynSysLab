import { fmt } from '../format';

const zig = (x: number, y: number, len: number) => {
  const n = 6, w = len / n;
  let d = `M ${x} ${y}`;
  for (let k = 0; k < n; k++) d += ` L ${x + w * (k + 0.5)} ${y + (k % 2 ? 6 : -6)}`;
  return d + ` L ${x + len} ${y}`;
};

export function CircuitSVG({ R1, R2, C, L, output }: { R1: number; R2: number; C: number; L: number; output: string }) {
  const top = 30, bot = 140;
  return (
    <svg viewBox="0 0 312 165" className="circuit">
      {/* fuente */}
      <circle cx={30} cy={(top + bot) / 2} r={16} className="el" />
      <text x={30} y={(top + bot) / 2 - 3} textAnchor="middle" className="pm">+</text>
      <text x={30} y={(top + bot) / 2 + 11} textAnchor="middle" className="pm">−</text>
      <text x={50} y={(top + bot) / 2 + 4} className="cl it">u(t)</text>
      <path d={`M 30 ${(top + bot) / 2 - 16} L 30 ${top} L 60 ${top}`} className="w" />
      <path d={`M 30 ${(top + bot) / 2 + 16} L 30 ${bot} L 260 ${bot}`} className="w" />
      {/* R1 */}
      <path d={zig(60, top, 50)} className="el" />
      <text x={85} y={top - 12} textAnchor="middle" className="cl"><tspan className="it">R</tspan><tspan dy="4" fontSize="9">1</tspan><tspan dy="-4"> = {fmt(R1)} Ω</tspan></text>
      <path d={`M 110 ${top} L 175 ${top}`} className="w" />
      {/* C */}
      <path d={`M 140 ${top} L 140 ${(top + bot) / 2 - 6}`} className="w" />
      <path d={`M 126 ${(top + bot) / 2 - 6} L 154 ${(top + bot) / 2 - 6} M 126 ${(top + bot) / 2 + 6} L 154 ${(top + bot) / 2 + 6}`} className="el" />
      <path d={`M 140 ${(top + bot) / 2 + 6} L 140 ${bot}`} className="w" />
      <text x={122} y={(top + bot) / 2 + 4} className="cl" textAnchor="end"><tspan className="it">C</tspan> = {fmt(C)} F</text>
      <text x={160} y={(top + bot) / 2 - 12} className={`cl it ${output !== 'iL' ? 'outv' : ''}`}>+</text>
      <text x={162} y={(top + bot) / 2 + 4} className={`cl ${output !== 'iL' ? 'outv' : ''}`}><tspan className="it">v</tspan><tspan dy="4" fontSize="9" className="it">C</tspan></text>
      <circle cx={140} cy={top} r={2.5} className="dotn" />
      <circle cx={140} cy={bot} r={2.5} className="dotn" />
      {/* R2 */}
      <path d={zig(175, top, 50)} className="el" />
      <text x={200} y={top - 12} textAnchor="middle" className="cl"><tspan className="it">R</tspan><tspan dy="4" fontSize="9">2</tspan><tspan dy="-4"> = {fmt(R2)} Ω</tspan></text>
      <path d={`M 225 ${top} L 260 ${top} L 260 ${(top + bot) / 2 - 24}`} className="w" />
      {/* L */}
      <path d={`M 260 ${(top + bot) / 2 - 24} ${[0, 1, 2, 3].map((k) => `a 6 6 0 0 1 0 12`).join(' ')} L 260 ${bot}`} className="el" />
      <text x={272} y={(top + bot) / 2 + 4} className="cl"><tspan className="it">L</tspan></text>
      <text x={272} y={(top + bot) / 2 + 18} className="cl">= {fmt(L)} H</text>
      <path d={`M 245 ${top + 10} L 245 ${top + 24}`} className={`arr ${output !== 'vC' ? 'outv' : ''}`} markerEnd="url(#carr)" />
      <text x={230} y={top + 24} className={`cl ${output !== 'vC' ? 'outv' : ''}`}><tspan className="it">i</tspan><tspan dy="4" fontSize="9" className="it">L</tspan></text>
      <defs><marker id="carr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" /></marker></defs>
      <path d={`M 140 ${bot} L 140 ${bot + 8} M 132 ${bot + 8} L 148 ${bot + 8} M 135 ${bot + 11} L 145 ${bot + 11} M 138 ${bot + 14} L 142 ${bot + 14}`} className="w" />
    </svg>
  );
}

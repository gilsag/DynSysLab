// Catalogue of physical example circuits (ladder networks driven by a voltage source u).
// Each circuit gives its parameters, its state variables, A and B, the available outputs and the drawing.

export type CircuitId = 'rc' | 'rlcSeries' | 'rlc2' | 'rcLadder' | 'lc3';

export interface CParam {
  key: string;
  tex: string;
  unit: 'Ω' | 'F' | 'H';
  def: number;
  min: number;
  max: number;
  log: boolean;
}

export interface COutput {
  key: string;
  /** label in the output selector (TeX) */
  tex: string;
  /** y = C x + D u */
  C: number[][];
  D: number[][];
  /** output relation shown under the drawing (TeX) */
  eq: string;
  /** state indices to highlight in the drawing */
  hl: number[];
  /** parameter whose element voltage is the output (highlighted) */
  el?: string;
  /** output names (TeX), one per row of C */
  names: string[];
}

export interface LadderEl {
  kind: 'R' | 'C' | 'L';
  param: string;
  pos: 'series' | 'shunt';
  /** index of the state variable carried by this element (capacitor voltage or inductor current) */
  state?: number;
}

export interface CircuitDef {
  id: CircuitId;
  params: CParam[];
  states: string[];
  ladder: LadderEl[];
  ss: (p: Record<string, number>) => { A: number[][]; B: number[][] };
  outputs: (p: Record<string, number>) => COutput[];
  /** quick parameter sets (label key in i18n, values) */
  cases?: { key: string; p: Record<string, number> }[];
}

const R = (key: string, tex: string, def: number, lin?: [number, number]): CParam =>
  lin ? { key, tex, unit: 'Ω', def, min: lin[0], max: lin[1], log: false } : { key, tex, unit: 'Ω', def, min: 0.05, max: 100, log: true };
const Cp = (key: string, tex: string, def: number): CParam => ({ key, tex, unit: 'F', def, min: 0.005, max: 10, log: true });
const Lp = (key: string, tex: string, def: number): CParam => ({ key, tex, unit: 'H', def, min: 0.02, max: 20, log: true });

/** output equal to state i */
const st = (key: string, tex: string, n: number, i: number): COutput => ({
  key, tex, C: [Array.from({ length: n }, (_, j) => (j === i ? 1 : 0))], D: [[0]], eq: `y = ${tex}`, hl: [i], names: [tex],
});
/** all the states as outputs */
const all = (states: string[]): COutput => ({
  key: 'all', tex: `[${states.join('\\;')}]^{\\mathsf T}`, C: states.map((_, i) => states.map((_s, j) => (i === j ? 1 : 0))), D: states.map(() => [0]),
  eq: `\\mathbf y = [${states.join('\\;\\;')}]^{\\mathsf T}`, hl: states.map((_, i) => i), names: states.map((_, i) => `y_{${i + 1}}`),
});

export const CIRCUITS: CircuitDef[] = [
  {
    id: 'rc',
    params: [R('R', 'R', 1), Cp('C', 'C', 1)],
    states: ['v_C'],
    ladder: [{ kind: 'R', param: 'R', pos: 'series' }, { kind: 'C', param: 'C', pos: 'shunt', state: 0 }],
    ss: (p) => ({ A: [[-1 / (p.R * p.C)]], B: [[1 / (p.R * p.C)]] }),
    outputs: () => [
      st('vC', 'v_C', 1, 0),
      { key: 'vR', tex: 'v_R', C: [[-1]], D: [[1]], eq: 'y = v_R = u - v_C', hl: [], el: 'R', names: ['v_R'] },
    ],
  },
  {
    id: 'rlcSeries',
    params: [R('R', 'R', 2, [0, 10]), Lp('L', 'L', 1), Cp('C', 'C', 0.25)],
    states: ['v_C', 'i_L'],
    ladder: [
      { kind: 'R', param: 'R', pos: 'series' },
      { kind: 'L', param: 'L', pos: 'series', state: 1 },
      { kind: 'C', param: 'C', pos: 'shunt', state: 0 },
    ],
    ss: (p) => ({ A: [[0, 1 / p.C], [-1 / p.L, -p.R / p.L]], B: [[0], [1 / p.L]] }),
    outputs: (p) => [
      st('vC', 'v_C', 2, 0),
      st('iL', 'i_L', 2, 1),
      { key: 'vR', tex: 'v_R', C: [[0, p.R]], D: [[0]], eq: 'y = v_R = R\\,i_L', hl: [], el: 'R', names: ['v_R'] },
      { key: 'vL', tex: 'v_L', C: [[-1, -p.R]], D: [[1]], eq: 'y = v_L = u - v_C - R\\,i_L', hl: [], el: 'L', names: ['v_L'] },
      all(['v_C', 'i_L']),
    ],
  },
  {
    id: 'rlc2',
    params: [R('R1', 'R_1', 10), R('R2', 'R_2', 8, [0, 30]), Cp('C', 'C', 0.1), Lp('L', 'L', 1)],
    states: ['v_C', 'i_L'],
    ladder: [
      { kind: 'R', param: 'R1', pos: 'series' },
      { kind: 'C', param: 'C', pos: 'shunt', state: 0 },
      { kind: 'R', param: 'R2', pos: 'series' },
      { kind: 'L', param: 'L', pos: 'shunt', state: 1 },
    ],
    ss: (p) => ({ A: [[-1 / (p.R1 * p.C), -1 / p.C], [1 / p.L, -p.R2 / p.L]], B: [[1 / (p.R1 * p.C)], [0]] }),
    outputs: () => [st('vC', 'v_C', 2, 0), st('iL', 'i_L', 2, 1), all(['v_C', 'i_L'])],
    cases: [
      { key: 'side.caseA', p: { R1: 10, R2: 8, C: 0.1, L: 1 } },
      { key: 'side.caseB', p: { R1: 10, R2: 3, C: 0.1, L: 1 } },
    ],
  },
  {
    id: 'rcLadder',
    params: [R('R1', 'R_1', 1), Cp('C1', 'C_1', 1), R('R2', 'R_2', 1), Cp('C2', 'C_2', 1)],
    states: ['v_1', 'v_2'],
    ladder: [
      { kind: 'R', param: 'R1', pos: 'series' },
      { kind: 'C', param: 'C1', pos: 'shunt', state: 0 },
      { kind: 'R', param: 'R2', pos: 'series' },
      { kind: 'C', param: 'C2', pos: 'shunt', state: 1 },
    ],
    ss: (p) => ({
      A: [[-1 / (p.R1 * p.C1) - 1 / (p.R2 * p.C1), 1 / (p.R2 * p.C1)], [1 / (p.R2 * p.C2), -1 / (p.R2 * p.C2)]],
      B: [[1 / (p.R1 * p.C1)], [0]],
    }),
    outputs: () => [st('v2', 'v_2', 2, 1), st('v1', 'v_1', 2, 0), all(['v_1', 'v_2'])],
  },
  {
    id: 'lc3',
    params: [R('Rs', 'R_s', 1), Cp('C1', 'C_1', 1), Lp('L', 'L', 2), Cp('C2', 'C_2', 1), R('RL', 'R_L', 1)],
    states: ['v_1', 'i_L', 'v_2'],
    ladder: [
      { kind: 'R', param: 'Rs', pos: 'series' },
      { kind: 'C', param: 'C1', pos: 'shunt', state: 0 },
      { kind: 'L', param: 'L', pos: 'series', state: 1 },
      { kind: 'C', param: 'C2', pos: 'shunt', state: 2 },
      { kind: 'R', param: 'RL', pos: 'shunt' },
    ],
    ss: (p) => ({
      A: [
        [-1 / (p.Rs * p.C1), -1 / p.C1, 0],
        [1 / p.L, 0, -1 / p.L],
        [0, 1 / p.C2, -1 / (p.RL * p.C2)],
      ],
      B: [[1 / (p.Rs * p.C1)], [0], [0]],
    }),
    outputs: () => [st('v2', 'v_2', 3, 2), st('iL', 'i_L', 3, 1), st('v1', 'v_1', 3, 0), all(['v_1', 'i_L', 'v_2'])],
  },
];

export const circuitDef = (id: CircuitId): CircuitDef => CIRCUITS.find((c) => c.id === id) ?? CIRCUITS[2];

export interface CircuitState {
  id: CircuitId;
  /** parameter values of every circuit (kept when switching between circuits) */
  p: Record<CircuitId, Record<string, number>>;
  /** chosen output of every circuit */
  output: Record<CircuitId, string>;
  /** parameter swept for the pole locus ('none' to hide it) */
  locus: Record<CircuitId, string>;
}

const defaults = (c: CircuitDef) => Object.fromEntries(c.params.map((q) => [q.key, q.def]));

export const defaultCircuit: CircuitState = {
  id: 'rlcSeries',
  p: Object.fromEntries(CIRCUITS.map((c) => [c.id, defaults(c)])) as CircuitState['p'],
  output: Object.fromEntries(CIRCUITS.map((c) => [c.id, c.outputs(defaults(c))[0].key])) as CircuitState['output'],
  locus: Object.fromEntries(CIRCUITS.map((c) => [c.id, c.params[c.id === 'rlc2' ? 1 : 0].key])) as CircuitState['locus'],
};

/** Accepts a saved state from earlier versions (single RLC circuit) or a partial one. */
export function restoreCircuit(saved: unknown): CircuitState {
  if (!saved || typeof saved !== 'object') return defaultCircuit;
  const s = saved as { id?: string; p?: Partial<Record<CircuitId, Record<string, number>>>; R1?: number; R2?: number; C?: number; L?: number; output?: unknown; locus?: unknown };
  if (!s.id || typeof s.p !== 'object') {
    // version with one fixed circuit
    const out = s.output === 'both' ? 'all' : typeof s.output === 'string' ? s.output : 'vC';
    const old = { R1: s.R1 ?? 10, R2: s.R2 ?? 8, C: s.C ?? 0.1, L: s.L ?? 1 };
    return { ...defaultCircuit, id: 'rlc2', p: { ...defaultCircuit.p, rlc2: old }, output: { ...defaultCircuit.output, rlc2: out }, locus: { ...defaultCircuit.locus, rlc2: typeof s.locus === 'string' ? s.locus : 'R2' } };
  }
  const id = CIRCUITS.some((c) => c.id === s.id) ? (s.id as CircuitId) : defaultCircuit.id;
  const p = { ...defaultCircuit.p }, output = { ...defaultCircuit.output }, locus = { ...defaultCircuit.locus };
  for (const c of CIRCUITS) {
    p[c.id] = { ...p[c.id], ...(s.p?.[c.id] ?? {}) };
    const o = (s.output as Record<string, string> | undefined)?.[c.id];
    if (o && c.outputs(p[c.id]).some((q) => q.key === o)) output[c.id] = o;
    const l = (s.locus as Record<string, string> | undefined)?.[c.id];
    if (l && (l === 'none' || c.params.some((q) => q.key === l))) locus[c.id] = l;
  }
  return { id, p, output, locus };
}

/** Realization with the physical variables of the chosen circuit and output. */
export function circuitSystem(c: CircuitState, override?: Record<string, number>) {
  const def = circuitDef(c.id);
  const p = { ...c.p[c.id], ...override };
  const { A, B } = def.ss(p);
  const outs = def.outputs(p);
  const out = outs.find((o) => o.key === c.output[c.id]) ?? outs[0];
  return { def, p, out, ss: { A, B, C: out.C, D: out.D } };
}

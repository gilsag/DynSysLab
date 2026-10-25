// Catalogue of ladder circuits: a source on the left, then series elements on the top rail and shunt elements to ground.

export type Kind = 'R' | 'L' | 'C';
export interface ElDef {
  kind: Kind;
  /** TeX name, e.g. R_1 */
  name: string;
  pos: 'series' | 'shunt';
  def: number;
}
export type CircuitId = 'rc' | 'rl' | 'rlcSeries' | 'rlcParallel' | 'twoMesh' | 'rcLadder' | 'lc3' | 'rcNorton';
export interface CircuitDef {
  id: CircuitId;
  source: 'V' | 'I';
  ladder: ElDef[];
  /** default output: 'v:<index>' or 'i:<index>' */
  output: string;
}

const R = (name: string, def: number, pos: 'series' | 'shunt' = 'series'): ElDef => ({ kind: 'R', name, pos, def });
const L = (name: string, def: number, pos: 'series' | 'shunt' = 'series'): ElDef => ({ kind: 'L', name, pos, def });
const C = (name: string, def: number, pos: 'series' | 'shunt' = 'shunt'): ElDef => ({ kind: 'C', name, pos, def });

export const CIRCUITS: CircuitDef[] = [
  { id: 'rc', source: 'V', ladder: [R('R', 1), C('C', 1)], output: 'v:1' },
  { id: 'rl', source: 'V', ladder: [R('R', 2), L('L', 1, 'shunt')], output: 'i:1' },
  { id: 'rlcSeries', source: 'V', ladder: [R('R', 2), L('L', 1), C('C', 0.25)], output: 'v:2' },
  { id: 'rlcParallel', source: 'I', ladder: [R('R', 2, 'shunt'), L('L', 1, 'shunt'), C('C', 0.25)], output: 'v:2' },
  { id: 'twoMesh', source: 'V', ladder: [R('R_1', 10), C('C', 0.1), R('R_2', 8), L('L', 1, 'shunt')], output: 'v:1' },
  { id: 'rcLadder', source: 'V', ladder: [R('R_1', 1), C('C_1', 1), R('R_2', 1), C('C_2', 1)], output: 'v:3' },
  { id: 'lc3', source: 'V', ladder: [R('R_s', 1), C('C_1', 1), L('L', 2), C('C_2', 1), R('R_L', 1, 'shunt')], output: 'v:4' },
  { id: 'rcNorton', source: 'I', ladder: [R('R', 1, 'shunt'), C('C', 1)], output: 'v:1' },
];
export const circuitDef = (id: CircuitId) => CIRCUITS.find((c) => c.id === id) ?? CIRCUITS[0];

export interface Element extends ElDef {
  index: number;
  value: number;
  /** initial condition: v_C(0⁻) (+ at a) for C, i_L(0⁻) (from a to b) for L */
  ic: number;
  /** terminals: a is the left node (series) or the top node (shunt); b is the right node or ground (0) */
  a: number;
  b: number;
  /** meshes the element belongs to, with +1 when the clockwise mesh current goes from a to b */
  meshes: [number, number][];
}

export interface Network {
  def: CircuitDef;
  elements: Element[];
  /** number of non-ground nodes (node 1 is the source's + terminal) */
  nodes: number;
  /** number of meshes (one per shunt element) */
  meshes: number;
}

/** Builds nodes and meshes from the ladder. */
export function buildNetwork(def: CircuitDef, values: number[], ics: number[]): Network {
  let node = 1, nodes = 1, mesh = 1;
  const shuntCount = def.ladder.filter((e) => e.pos === 'shunt').length;
  const elements: Element[] = def.ladder.map((e, index) => {
    const el: Element = { ...e, index, value: values[index] ?? e.def, ic: ics[index] ?? 0, a: 0, b: 0, meshes: [] };
    if (e.pos === 'series') {
      nodes++;
      el.a = node;
      el.b = nodes;
      node = nodes;
      el.meshes = [[mesh, 1]];
    } else {
      el.a = node;
      el.b = 0;
      el.meshes = mesh < shuntCount ? [[mesh, 1], [mesh + 1, -1]] : [[mesh, 1]];
      mesh++;
    }
    return el;
  });
  return { def, elements, nodes, meshes: shuntCount };
}

export const isStorage = (k: Kind) => k !== 'R';
export const unit = (k: Kind) => (k === 'R' ? 'Ω' : k === 'L' ? 'H' : 'F');
/** TeX of the initial-condition variable of a storage element. */
export const icTex = (e: { kind: Kind; name: string }) => (e.kind === 'C' ? `v_{${e.name}}(0^-)` : `i_{${e.name}}(0^-)`);

// Nodal and mesh formulations in the Laplace domain, and their solution.
// Matrix entries are Laurent polynomials a₋₁/s + a₀ + a₁s + a₂s²; they also keep their symbolic terms for display.
import type { Element, Network } from './circuits';
import { add, mul, reduce, scale, trim, type Poly, type Rational } from '@shared/poly';

export type Laurent = Record<number, number>; // power → coefficient
export interface Term {
  sign: 1 | -1;
  /** symbolic factor, e.g. \frac{1}{R_1}, sL, C\,v_{C}(0^-) */
  sym: string;
  /** true when the term multiplies U(s) */
  u?: boolean;
}
export interface Entry {
  val: Laurent;
  terms: Term[];
}
export interface LinSystem {
  kind: 'nodal' | 'mesh';
  /** names of the unknowns (TeX) */
  unknowns: string[];
  /** indices of the unknowns (node or mesh numbers) */
  ids: number[];
  A: Entry[][];
  /** right-hand side: coefficient of U(s) and initial-condition part */
  bU: Entry[];
  bIC: Entry[];
  /** what the source imposes (TeX), e.g. V_1 = U(s) */
  imposed?: string;
}

const L0 = (): Laurent => ({});
const ladd = (a: Laurent, b: Laurent, k = 1): Laurent => {
  const r = { ...a };
  for (const [p, v] of Object.entries(b)) r[+p] = (r[+p] ?? 0) + k * v;
  return r;
};
const entry = (): Entry => ({ val: L0(), terms: [] });
const push = (e: Entry, val: Laurent, sign: 1 | -1, sym: string, u = false) => {
  e.val = ladd(e.val, val, sign);
  e.terms.push({ sign, sym, u });
};

/** Admittance and the parallel current source of the initial condition (current from a to b: Y·V_ab + J).
 *  J = Jsgn·Jmag, where Jmag is the value written by Jsym. */
export function nodalModel(e: Element): { Y: Laurent; Ysym: string; J: Laurent; Jmag: Laurent; Jsgn: 1 | -1; Jsym: string } {
  if (e.kind === 'R') return { Y: { 0: 1 / e.value }, Ysym: `\\frac{1}{${e.name}}`, J: {}, Jmag: {}, Jsgn: 1, Jsym: '' };
  if (e.kind === 'C') return { Y: { 1: e.value }, Ysym: `s${e.name}`, J: e.ic ? { 0: -e.value * e.ic } : {}, Jmag: e.ic ? { 0: e.value * e.ic } : {}, Jsgn: -1, Jsym: `${e.name}\\,v_{${e.name}}(0^-)` };
  return { Y: { [-1]: 1 / e.value }, Ysym: `\\frac{1}{s${e.name}}`, J: e.ic ? { [-1]: e.ic } : {}, Jmag: e.ic ? { [-1]: e.ic } : {}, Jsgn: 1, Jsym: `\\frac{i_{${e.name}}(0^-)}{s}` };
}
/** Impedance and the series voltage source of the initial condition (V_ab = Z·I_ab + E); E = Esgn·Emag. */
export function meshModel(e: Element): { Z: Laurent; Zsym: string; E: Laurent; Emag: Laurent; Esgn: 1 | -1; Esym: string } {
  if (e.kind === 'R') return { Z: { 0: e.value }, Zsym: e.name, E: {}, Emag: {}, Esgn: 1, Esym: '' };
  if (e.kind === 'C') return { Z: { [-1]: 1 / e.value }, Zsym: `\\frac{1}{s${e.name}}`, E: e.ic ? { [-1]: e.ic } : {}, Emag: e.ic ? { [-1]: e.ic } : {}, Esgn: 1, Esym: `\\frac{v_{${e.name}}(0^-)}{s}` };
  return { Z: { 1: e.value }, Zsym: `s${e.name}`, E: e.ic ? { 0: -e.value * e.ic } : {}, Emag: e.ic ? { 0: e.value * e.ic } : {}, Esgn: -1, Esym: `${e.name}\\,i_{${e.name}}(0^-)` };
}

export function nodalSystem(net: Network): LinSystem {
  const vSource = net.def.source === 'V';
  const ids = Array.from({ length: net.nodes }, (_, k) => k + 1).filter((n) => !(vSource && n === 1));
  const row = (n: number) => ids.indexOf(n);
  const m = ids.length;
  const A = Array.from({ length: m }, () => Array.from({ length: m }, entry));
  const bU = Array.from({ length: m }, entry);
  const bIC = Array.from({ length: m }, entry);
  for (const e of net.elements) {
    const { Y, Ysym, Jmag, Jsgn, Jsym } = nodalModel(e);
    for (const [n, s] of [[e.a, 1], [e.b, -1]] as [number, 1 | -1][]) {
      const r = row(n);
      if (n === 0 || r < 0) continue;
      // current leaving n through e: s·(Y(V_a − V_b) + J)
      for (const [k, sk] of [[e.a, 1], [e.b, -1]] as [number, 1 | -1][]) {
        if (k === 0) continue;
        const sign = (s * sk) as 1 | -1;
        const c = row(k);
        if (c >= 0) push(A[r][c], Y, sign, Ysym);
        else push(bU[r], Y, (-sign) as 1 | -1, Ysym, true); // known node V_1 = U(s)
      }
      // the source term moves to the right-hand side: −s·J = −s·Jsgn·Jmag
      const sg = (-s * Jsgn) as 1 | -1;
      if (e.kind !== 'R' && e.ic !== 0) push(bIC[r], Jmag, sg, Jsym);
      else if (e.kind !== 'R') bIC[r].terms.push({ sign: sg, sym: Jsym }); // shown symbolically, value 0
    }
  }
  if (!vSource) push(bU[row(1)], { 0: 1 }, 1, '', true);
  return { kind: 'nodal', unknowns: ids.map((n) => `V_{${n}}(s)`), ids, A, bU, bIC, imposed: vSource ? 'V_{1}(s) = U(s)' : undefined };
}

export function meshSystem(net: Network): LinSystem {
  const iSource = net.def.source === 'I';
  const ids = Array.from({ length: net.meshes }, (_, k) => k + 1).filter((j) => !(iSource && j === 1));
  const row = (j: number) => ids.indexOf(j);
  const m = ids.length;
  const A = Array.from({ length: m }, () => Array.from({ length: m }, entry));
  const bU = Array.from({ length: m }, entry);
  const bIC = Array.from({ length: m }, entry);
  for (const e of net.elements) {
    const { Z, Zsym, Emag, Esgn, Esym } = meshModel(e);
    for (const [j, sj] of e.meshes) {
      const r = row(j);
      if (r < 0) continue;
      for (const [k, sk] of e.meshes) {
        const sign = (sj * sk) as 1 | -1;
        const c = row(k);
        if (c >= 0) push(A[r][c], Z, sign, Zsym);
        else push(bU[r], Z, (-sign) as 1 | -1, Zsym, true); // known mesh current I_1 = U(s)
      }
      const sg = (-sj * Esgn) as 1 | -1;
      if (e.kind !== 'R' && e.ic !== 0) push(bIC[r], Emag, sg, Esym);
      else if (e.kind !== 'R') bIC[r].terms.push({ sign: sg, sym: Esym });
    }
  }
  if (!iSource) push(bU[row(1)], { 0: 1 }, 1, '', true);
  return { kind: 'mesh', unknowns: ids.map((j) => `I_{${j}}(s)`), ids, A, bU, bIC, imposed: iSource ? 'I_{1}(s) = U(s)' : undefined };
}

// ---------- solution ----------
/** s·L as a polynomial (powers −1 … 2 become 0 … 3). */
const toPoly = (l: Laurent): Poly => {
  const p = [0, 0, 0, 0];
  for (const [k, v] of Object.entries(l)) p[+k + 1] += v;
  return p;
};
function det(M: Poly[][]): Poly {
  const n = M.length;
  if (n === 0) return [1];
  if (n === 1) return M[0][0];
  let r: Poly = [0];
  for (let j = 0; j < n; j++) {
    if (M[0][j].every((c) => c === 0)) continue;
    const minor = M.slice(1).map((row) => row.filter((_, k) => k !== j));
    const term = mul(M[0][j], det(minor));
    r = add(r, j % 2 ? scale(term, -1) : term);
  }
  return r;
}

/** Output y = c·x + dU·U + dIC, with Laurent coefficients. */
export interface OutputMap {
  c: Laurent[];
  dU: Laurent;
  dIC: Laurent;
}

/** Output 'v:i' or 'i:i' of element i expressed with the nodal unknowns. */
export function nodalOutput(net: Network, sys: LinSystem, out: string): OutputMap {
  const [what, idx] = out.split(':');
  const e = net.elements[+idx] ?? net.elements[0];
  const c: Laurent[] = sys.ids.map(() => ({}));
  let dU: Laurent = {};
  // V_ab
  const vab: Laurent[] = sys.ids.map(() => ({}));
  let vabU: Laurent = {};
  for (const [n, s] of [[e.a, 1], [e.b, -1]] as [number, number][]) {
    if (n === 0) continue;
    const k = sys.ids.indexOf(n);
    if (k >= 0) vab[k] = ladd(vab[k], { 0: s });
    else vabU = ladd(vabU, { 0: s });
  }
  if (what === 'v') return { c: vab, dU: vabU, dIC: {} };
  const { Y, J } = nodalModel(e);
  const times = (a: Laurent, b: Laurent) => {
    const r: Laurent = {};
    for (const [p, v] of Object.entries(a)) for (const [q, w] of Object.entries(b)) r[+p + +q] = (r[+p + +q] ?? 0) + v * w;
    return r;
  };
  vab.forEach((l, k) => (c[k] = times(l, Y)));
  dU = times(vabU, Y);
  return { c, dU, dIC: J };
}

export interface Solution {
  /** H(s) = Y_zs(s)/U(s), reduced */
  H: Rational;
  /** zero-input response (initial conditions only), reduced */
  Yci: Rational;
  /** characteristic polynomial of the circuit (monic) and its order */
  charPoly: Poly;
  /** unreduced pieces: y = (numU·U + numIC)/den */
  raw: { numU: Poly; numIC: Poly; den: Poly };
}

/** Solves A x = bU·U + bIC for the output map; order = number of storage elements. */
export function solve(sys: LinSystem, out: OutputMap, order: number): Solution {
  const A = sys.A.map((r) => r.map((e) => toPoly(e.val)));
  const bU = sys.bU.map((e) => toPoly(e.val));
  const bIC = sys.bIC.map((e) => toPoly(e.val));
  const c = out.c.map(toPoly);
  const dA = det(A);
  // c·adj(A)·b = −det([[A, b], [c, 0]])
  const border = (b: Poly[]) => [...A.map((r, i) => [...r, b[i]]), [...c, [0]]];
  const cAb = (b: Poly[]) => scale(det(border(b)), -1);
  // y·s = c'x + d'·U + d'_IC with c' = s·c … therefore y = (c'adj(A')b' + d'det A') / (s det A')
  const sdet = mul([0, 1], dA);
  const numU = add(cAb(bU), mul(toPoly(out.dU), dA));
  const numIC = add(cAb(bIC), mul(toPoly(out.dIC), dA));
  const H = reduce({ num: numU, den: sdet });
  const Yci = reduce({ num: numIC, den: sdet });
  // characteristic polynomial: det(s·A) without the factors of s that come only from the scaling
  let cp = trim(dA, 1e-14);
  while (cp.length - 1 > order && cp[0] === 0) cp = cp.slice(1);
  const lead = cp[cp.length - 1] || 1;
  return { H, Yci, charPoly: cp.map((v) => v / lead), raw: { numU, numIC, den: sdet } };
}

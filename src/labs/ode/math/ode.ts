// Response of Q(D) y = P(D) u: classical split (homogeneous + particular), zero-input + zero-state,
// transient + steady state. Computed exactly with the Laplace transform and partial fractions.
import { expand, type Expansion } from '@shared/pfe';
import { add, cabs, cluster, mul, reduce, roots, trim, type Cx, type Poly, type Rational } from '@shared/poly';

export type InputKind = 'step' | 'exp' | 'cos' | 'none';
export interface Input {
  kind: InputKind;
  A: number;
  a: number; // exp: e^{−at}
  w: number; // cos: frequency
  phi: number; // cos: phase in degrees
}

/** "1 3 2" → [2, 3, 1] (ascending powers); highest power first in the text. Decimal comma allowed. */
export function parseCoeffs(s: string): Poly | null {
  const parts = s.trim().split(/[\s;]+/).filter(Boolean);
  if (!parts.length) return null;
  const v = parts.map((x) => parseFloat(x.replace(',', '.').replace('−', '-')));
  if (v.some((x) => !Number.isFinite(x))) return null;
  while (v.length > 1 && v[0] === 0) v.shift();
  return v.reverse();
}

export function inputTransform(u: Input): Rational {
  const { A, a, w } = u;
  const ph = (u.phi * Math.PI) / 180;
  switch (u.kind) {
    case 'step': return { num: [A], den: [0, 1] };
    case 'exp': return { num: [A], den: [a, 1] };
    case 'cos': return { num: [-A * w * Math.sin(ph), A * Math.cos(ph)], den: [w * w, 0, 1] };
    default: return { num: [0], den: [1] };
  }
}
export function inputValue(u: Input, t: number): number {
  if (t < 0) return 0;
  switch (u.kind) {
    case 'step': return u.A;
    case 'exp': return u.A * Math.exp(-u.a * t);
    case 'cos': return u.A * Math.cos(u.w * t + (u.phi * Math.PI) / 180);
    default: return 0;
  }
}
/** exponent β of the input (u = Re{A e^{βt}}), or null */
export function inputBeta(u: Input): Cx | null {
  if (u.kind === 'step') return [0, 0];
  if (u.kind === 'exp') return [-u.a, 0];
  if (u.kind === 'cos') return [0, u.w];
  return null;
}

export type Part = 'hom' | 'part';
export interface Solution {
  q: Poly;
  p: Poly;
  /** characteristic roots with multiplicities */
  charRoots: [Cx, number][];
  Y: Rational;
  Yzs: Rational;
  Yzi: Rational;
  x: Expansion;
  xzs: Expansion;
  xzi: Expansion;
  /** multiplicity of the input root inside the characteristic polynomial (resonance), 0 if none */
  resonance: number;
  beta: Cx | null;
}

const near = (a: Cx, b: Cx) => cabs([a[0] - b[0], a[1] - b[1]]) < 2e-5 * Math.max(1, cabs(a));

export function solve(q: Poly, p: Poly, u: Input, ics: number[]): Solution {
  const n = q.length - 1;
  // Laplace of the initial conditions: Σ_k q_k Σ_{i<k} s^{k−1−i} y^{(i)}(0⁻)
  let I0: Poly = [0];
  for (let k = 1; k <= n; k++) {
    const term = new Array(k).fill(0);
    for (let i = 0; i < k; i++) term[k - 1 - i] += ics[i] ?? 0;
    I0 = add(I0, term.map((c) => c * q[k]));
  }
  const U = inputTransform(u);
  const Yzs = reduce({ num: mul(p, U.num), den: mul(q, U.den) });
  const Yzi = reduce({ num: I0, den: q });
  const Y = reduce({ num: add(mul(p, U.num), mul(I0, U.den)), den: mul(q, U.den) });
  const charRoots = cluster(roots(q));
  const beta = inputBeta(u);
  const hit = beta ? charRoots.find(([r]) => near(r, beta)) : undefined;
  return { q, p, charRoots, Y, Yzs, Yzi, x: expand(Y), xzs: expand(Yzs), xzi: expand(Yzi), resonance: hit ? hit[1] : 0, beta };
}

/** Keeps only the terms that satisfy `keep(p, j)`, where the term is t^j/j!·e^{pt}. */
export function select(x: Expansion, keep: (p: Cx, j: number) => boolean): Expansion {
  return {
    q: [],
    clusters: x.clusters.map((c) => ({ ...c, g: c.g.map((g, k) => (keep(c.p, c.m - k - 1) ? g : ([0, 0] as Cx))) })),
  };
}

/** Classical split: terms of the characteristic roots (up to their multiplicity) are homogeneous; the rest particular. */
export function classical(sol: Solution): { hom: Expansion; part: Expansion } {
  const mult = (p: Cx) => sol.charRoots.find(([r]) => near(r, p))?.[1] ?? 0;
  return {
    hom: select(sol.x, (p, j) => j < mult(p)),
    part: select(sol.x, (p, j) => j >= mult(p)),
  };
}

/** Transient (Re p < 0) and steady state (Re p = 0); unstable terms (Re p > 0) are reported apart. */
export function transientSteady(x: Expansion): { tr: Expansion; ss: Expansion; unstable: boolean } {
  const unstable = x.clusters.some((c) => c.p[0] > 1e-9 && c.g.some((g) => cabs(g) > 1e-12));
  const marginalGrow = x.clusters.some((c) => Math.abs(c.p[0]) <= 1e-9 && c.g.some((g, k) => c.m - k - 1 > 0 && cabs(g) > 1e-12));
  return {
    tr: select(x, (p) => p[0] < -1e-9),
    ss: select(x, (p) => Math.abs(p[0]) <= 1e-9),
    unstable: unstable || marginalGrow,
  };
}

/** Complex gain H(β) = P(β)/Q(β). */
export function gain(q: Poly, p: Poly, b: Cx): Cx {
  const ev = (c: Poly): Cx => {
    let r: Cx = [0, 0];
    for (let k = c.length - 1; k >= 0; k--) r = [r[0] * b[0] - r[1] * b[1] + c[k], r[0] * b[1] + r[1] * b[0]];
    return r;
  };
  const N = ev(p), D = ev(q);
  const d = D[0] * D[0] + D[1] * D[1];
  return [(N[0] * D[0] + N[1] * D[1]) / d, (N[1] * D[0] - N[0] * D[1]) / d];
}

export const order = (q: Poly) => trim(q).length - 1;

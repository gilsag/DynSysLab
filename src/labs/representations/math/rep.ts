// Equivalent representations of a SISO linear system: ODE, transfer function, state space (canonical forms).
import { polyDet, reduce, trim, type Poly, type Rational } from '@shared/poly';

export type Mat = number[][];
export interface SS {
  A: Mat;
  B: number[];
  C: number[];
  D: number;
}

/** "1 3 2" → ascending coefficients [2, 3, 1]. */
export function parseCoeffs(s: string): Poly | null {
  const parts = s.trim().split(/[\s;]+/).filter(Boolean);
  if (!parts.length) return null;
  const v = parts.map((x) => parseFloat(x.replace(',', '.').replace('−', '-')));
  if (v.some((x) => !Number.isFinite(x))) return null;
  while (v.length > 1 && v[0] === 0) v.shift();
  return v.reverse();
}

/** Monic Q, d = direct term, c = strictly proper numerator (ascending, length n). */
export function split(P: Poly, Q: Poly) {
  const n = Q.length - 1;
  const lead = Q[n];
  const q = Q.map((v) => v / lead);
  const p = P.map((v) => v / lead);
  const d = p.length - 1 === n ? p[n] : 0;
  const c = Array.from({ length: n }, (_, k) => (p[k] ?? 0) - d * q[k]);
  return { n, a: q.slice(0, n), c, d };
}

/** Controllable canonical form: x₁' = x₂, …, xₙ' = −a₀x₁ − … − aₙ₋₁xₙ + u, y = c₀x₁ + … + cₙ₋₁xₙ + d u. */
export function ccf(P: Poly, Q: Poly): SS {
  const { n, a, c, d } = split(P, Q);
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i < n - 1 ? (j === i + 1 ? 1 : 0) : -a[j])));
  return { A, B: Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0)), C: [...c], D: d };
}

/** Observable canonical form (dual): x₁' = −a₀xₙ + c₀u, x_k' = x_{k−1} − a_{k−1}xₙ + c_{k−1}u, y = xₙ + d u. */
export function ocf(P: Poly, Q: Poly): SS {
  const { n, a, c, d } = split(P, Q);
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (j === n - 1 ? -a[i] : j === i - 1 ? 1 : 0)));
  return { A, B: [...c], C: Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0)), D: d };
}

/** H(s) = C(sI − A)⁻¹B + D = det([[sI − A, B], [−C, D]]) / det(sI − A). */
export function tfOf(ss: SS): { H: Rational; charPoly: Poly } {
  const sIA = ss.A.map((r, i) => r.map((v, j) => (i === j ? [-v, 1] : [-v])));
  const den = polyDet(sIA);
  const big = [...sIA.map((r, i) => [...r, [ss.B[i]]]), [...ss.C.map((v) => [-v]), [ss.D]]];
  const num = polyDet(big);
  return { H: { num: trim(num, 1e-13), den: trim(den, 1e-13) }, charPoly: trim(den, 1e-13) };
}

/** Exact step response of a state-space model by matrix-exponential discretization (x(0) = 0). */
export function stepSS(ss: SS, T: number, N: number): number[] {
  const n = ss.A.length;
  const dt = T / N;
  // augmented matrix [[A, B], [0, 0]] gives Φ and Γ at once
  const M = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i < n ? (j < n ? ss.A[i][j] * dt : ss.B[i] * dt) : 0)));
  const E = expm(M);
  const Phi = E.slice(0, n).map((r) => r.slice(0, n));
  const Gam = E.slice(0, n).map((r) => r[n]);
  let x = new Array(n).fill(0);
  const y: number[] = [];
  for (let k = 0; k <= N; k++) {
    y.push(ss.C.reduce((s, c, i) => s + c * x[i], 0) + ss.D);
    x = Phi.map((r, i) => r.reduce((s, v, j) => s + v * x[j], 0) + Gam[i]);
  }
  return y;
}

/** Impulse response without its impulsive part: C e^{At} B on a uniform grid (the term D δ(t) is drawn apart). */
export function impulseSS(ss: SS, T: number, N: number): number[] {
  const n = ss.A.length;
  const dt = T / N;
  const Phi = expm(ss.A.map((r) => r.map((v) => v * dt)));
  let x = [...ss.B];
  const y: number[] = [];
  for (let k = 0; k <= N; k++) {
    y.push(ss.C.reduce((s, c, i) => s + c * x[i], 0));
    x = Phi.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));
  }
  return n ? y : y.map(() => 0);
}

function expm(A: Mat): Mat {
  const nrm = Math.max(...A.map((r) => r.reduce((s, v) => s + Math.abs(v), 0)));
  const sq = Math.max(0, Math.ceil(Math.log2(nrm || 1)) + 1);
  const h = 1 / 2 ** sq;
  const mul = (X: Mat, Y: Mat) => X.map((r) => Y[0].map((_, j) => r.reduce((s, v, k) => s + v * Y[k][j], 0)));
  let E: Mat = A.map((_, i) => A.map((_v, j) => (i === j ? 1 : 0)));
  let term: Mat = E.map((r) => [...r]);
  for (let k = 1; k <= 20; k++) {
    term = mul(term, A).map((r) => r.map((v) => (v * h) / k));
    E = E.map((r, i) => r.map((v, j) => v + term[i][j]));
  }
  for (let s = 0; s < sq; s++) E = mul(E, E);
  return E;
}

/** Reduced H(s) and whether some modes were cancelled (non-minimal realization). */
export function minimal(ss: SS) {
  const { H, charPoly } = tfOf(ss);
  const r = reduce(H);
  return { H: r, charPoly, cancelled: r.den.length < charPoly.length };
}


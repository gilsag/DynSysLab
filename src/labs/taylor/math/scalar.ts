// One-variable Taylor analysis: partial sums, radius of convergence, linearization residual.
import { taylor, type Node, type NumFn } from '@shared/expr';

/** Evaluates P_N(x) = Σ_{n≤N} c_n (x − a)^n (Horner). */
export function partialSum(c: ArrayLike<number>, a: number, N: number, x: number): number {
  const d = x - a;
  let s = 0;
  for (let n = N; n >= 0; n--) s = s * d + (Number.isFinite(c[n]) ? c[n] : NaN);
  return s;
}

/**
 * Radius of convergence estimated from the coefficients up to order 60.
 * Returns Infinity for entire-looking series, NaN when it cannot be estimated.
 */
export function estimateRadius(node: Node, a: number): number {
  const N = 60;
  const c = taylor(node, a, N);
  if (!Array.from(c).every(Number.isFinite)) return NaN;
  const idx: number[] = [];
  for (let n = 1; n <= N; n++) if (Math.abs(c[n]) > 1e-280) idx.push(n);
  if (idx.length === 0 || idx[idx.length - 1] < 25) return Infinity; // polynomial
  const root = (lo: number, hi: number) => {
    let m = 0;
    for (const n of idx) if (n >= lo && n <= hi) m = Math.max(m, Math.pow(Math.abs(c[n]), 1 / n));
    return m > 0 ? 1 / m : Infinity;
  };
  const early = root(18, 30);
  const late = root(45, 60);
  if (!(late < 1e6) || late > 1.4 * early) return Infinity;
  const [n1, n2] = idx.slice(-2);
  const ratio = Math.pow(Math.abs(c[n1] / c[n2]), 1 / (n2 - n1));
  return Math.abs(ratio - late) < 0.15 * late ? ratio : late;
}

/** Second derivative f''(x), exact. */
export function second(node: Node, x: number): number {
  return 2 * taylor(node, x, 2)[2];
}

export interface Residual {
  xs: number[];
  r1: number[]; // f(x) − [f(a) + f'(a)(x − a)]
  bound: number[]; // (M/2)(x − a)², M = max |f''| between a and x
  rel: number[]; // |R1| / |f(x)|
}

/** Linearization residual and its bound on a grid over [x0, x1]. */
export function residual(node: Node, f: NumFn, a: number, x0: number, x1: number, n = 600): Residual {
  const c = taylor(node, a, 1);
  const xs: number[] = [];
  for (let i = 0; i <= n; i++) xs.push(x0 + ((x1 - x0) * i) / n);
  const fpp = xs.map((x) => Math.abs(second(node, x)));
  const r1 = xs.map((x) => f(x) - (c[0] + c[1] * (x - a)));
  const rel = xs.map((x, i) => Math.abs(r1[i]) / Math.abs(f(x)));
  // cumulative max of |f''| moving outward from a
  const ia = Math.max(0, Math.min(n, Math.round(((a - x0) / (x1 - x0)) * n)));
  const M = new Array<number>(n + 1).fill(NaN);
  let m = Math.abs(second(node, a));
  for (let i = ia; i <= n; i++) { if (Number.isFinite(fpp[i])) m = Math.max(m, fpp[i]); M[i] = m; }
  m = Math.abs(second(node, a));
  for (let i = ia; i >= 0; i--) { if (Number.isFinite(fpp[i])) m = Math.max(m, fpp[i]); M[i] = m; }
  const bound = xs.map((x, i) => (M[i] / 2) * (x - a) ** 2);
  return { xs, r1, bound, rel };
}

/** Largest interval around a where the error measure stays within tol (scanning the residual grid). */
export function validRange(res: Residual, a: number, tol: number, relative: boolean): { lo: number; hi: number; loEdge: boolean; hiEdge: boolean } {
  const err = relative ? res.rel : res.r1.map(Math.abs);
  const { xs } = res;
  let ia = 0;
  while (ia < xs.length - 1 && xs[ia + 1] <= a) ia++;
  let hi = ia;
  while (hi + 1 < xs.length && err[hi + 1] <= tol) hi++;
  let lo = ia;
  while (lo - 1 >= 0 && err[lo - 1] <= tol) lo--;
  return { lo: xs[lo], hi: xs[hi], loEdge: lo === 0, hiEdge: hi === xs.length - 1 };
}

// Second-order nonlinear systems ẋ = f(x, u): equilibria, Jacobian, classification, trajectories.
import { gradient, type Node, type NumFn } from '@shared/expr';

export interface Sys {
  n1: Node;
  n2: Node;
  f1: NumFn; // (x1, x2, u)
  f2: NumFn;
  u: number;
}
export type V2 = [number, number];
export interface Window {
  x1: [number, number];
  x2: [number, number];
}

export const field = (s: Sys, x: V2): V2 => [s.f1(x[0], x[1], s.u), s.f2(x[0], x[1], s.u)];

export function jacobian(s: Sys, x: V2): { A: [V2, V2]; b: V2 } {
  const g1 = gradient(s.n1, [x[0], x[1], s.u]).grad;
  const g2 = gradient(s.n2, [x[0], x[1], s.u]).grad;
  return { A: [[g1[0], g1[1]], [g2[0], g2[1]]], b: [g1[2], g2[2]] };
}

export type Kind = 'stableNode' | 'unstableNode' | 'stableFocus' | 'unstableFocus' | 'saddle' | 'undecided';

export interface Eig {
  tr: number;
  det: number;
  re: V2;
  im: V2;
  /** real eigenvectors (only when eigenvalues are real), unit length */
  vec?: [V2, V2];
}

export function eig2(A: [V2, V2]): Eig {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const disc = (tr * tr) / 4 - det;
  if (disc >= 0) {
    const r = Math.sqrt(disc);
    const l1 = tr / 2 + r;
    const l2 = tr / 2 - r;
    const vecOf = (l: number): V2 => {
      // (A − λI)v = 0
      let v: V2 = Math.abs(A[0][1]) > 1e-12 || Math.abs(A[0][0] - l) > 1e-12 ? [A[0][1], l - A[0][0]] : [l - A[1][1], A[1][0]];
      if (Math.hypot(...v) < 1e-14) v = Math.abs(A[1][0]) > 1e-12 || Math.abs(A[1][1] - l) > 1e-12 ? [l - A[1][1], A[1][0]] : [1, 0];
      const h = Math.hypot(...v) || 1;
      return [v[0] / h, v[1] / h];
    };
    return { tr, det, re: [l1, l2], im: [0, 0], vec: [vecOf(l1), vecOf(l2)] };
  }
  const w = Math.sqrt(-disc);
  return { tr, det, re: [tr / 2, tr / 2], im: [w, -w] };
}

export function classify(e: Eig, scale = 1): Kind {
  const eps = 1e-7 * Math.max(1, scale);
  if (Math.abs(e.re[0]) < eps || Math.abs(e.re[1]) < eps) return 'undecided';
  if (e.im[0] !== 0) return e.re[0] < 0 ? 'stableFocus' : 'unstableFocus';
  if (e.re[0] > 0 && e.re[1] > 0) return 'unstableNode';
  if (e.re[0] < 0 && e.re[1] < 0) return 'stableNode';
  return 'saddle';
}

export interface Equilibrium {
  x: V2;
  A: [V2, V2];
  b: V2;
  eig: Eig;
  kind: Kind;
}

/** All equilibria in the window: Newton from a grid of starting points, then de-duplicated. */
export function equilibria(s: Sys, w: Window): Equilibrium[] {
  const sx = w.x1[1] - w.x1[0];
  const sy = w.x2[1] - w.x2[0];
  const found: V2[] = [];
  const G = 24;
  for (let i = 0; i <= G; i++) {
    for (let j = 0; j <= G; j++) {
      let x: V2 = [w.x1[0] + (sx * i) / G, w.x2[0] + (sy * j) / G];
      for (let it = 0; it < 40; it++) {
        const F = field(s, x);
        if (!Number.isFinite(F[0]) || !Number.isFinite(F[1])) break;
        const { A } = jacobian(s, x);
        const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        if (!Number.isFinite(det) || Math.abs(det) < 1e-14) break;
        let dx: V2 = [(A[1][1] * F[0] - A[0][1] * F[1]) / det, (-A[1][0] * F[0] + A[0][0] * F[1]) / det];
        const step = Math.hypot(dx[0] / sx, dx[1] / sy);
        if (step > 0.25) dx = [(dx[0] * 0.25) / step, (dx[1] * 0.25) / step];
        x = [x[0] - dx[0], x[1] - dx[1]];
        if (Math.hypot(dx[0] / sx, dx[1] / sy) < 1e-13) break;
      }
      const F = field(s, x);
      const ok = Math.hypot(F[0], F[1]) < 1e-9 * (1 + Math.abs(s.u));
      const inside = x[0] >= w.x1[0] - 1e-9 * sx && x[0] <= w.x1[1] + 1e-9 * sx && x[1] >= w.x2[0] - 1e-9 * sy && x[1] <= w.x2[1] + 1e-9 * sy;
      if (ok && inside && !found.some((q) => Math.hypot((q[0] - x[0]) / sx, (q[1] - x[1]) / sy) < 1e-6)) found.push(x);
    }
  }
  found.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  return found.map((x) => {
    const { A, b } = jacobian(s, x);
    const eig = eig2(A);
    const scale = Math.max(Math.abs(A[0][0]), Math.abs(A[0][1]), Math.abs(A[1][0]), Math.abs(A[1][1]));
    return { x: [Math.abs(x[0]) < 1e-12 ? 0 : x[0], Math.abs(x[1]) < 1e-12 ? 0 : x[1]], A, b, eig, kind: classify(eig, scale) };
  });
}

/** RK4 trajectory of a 2-D vector field; stops when leaving the (enlarged) window or blowing up. */
export function integrate(fn: (x: V2) => V2, x0: V2, T: number, w: Window, dt = 0.01, margin = 0.6): { t: number[]; x: V2[] } {
  const sx = w.x1[1] - w.x1[0];
  const sy = w.x2[1] - w.x2[0];
  const lo1 = w.x1[0] - margin * sx, hi1 = w.x1[1] + margin * sx, lo2 = w.x2[0] - margin * sy, hi2 = w.x2[1] + margin * sy;
  const steps = Math.min(200000, Math.ceil(Math.abs(T) / dt));
  const h = Math.sign(T) * dt;
  const ts = [0];
  const xs: V2[] = [x0];
  let x = x0;
  for (let k = 1; k <= steps; k++) {
    const k1 = fn(x);
    const k2 = fn([x[0] + (h / 2) * k1[0], x[1] + (h / 2) * k1[1]]);
    const k3 = fn([x[0] + (h / 2) * k2[0], x[1] + (h / 2) * k2[1]]);
    const k4 = fn([x[0] + h * k3[0], x[1] + h * k3[1]]);
    x = [x[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), x[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
    if (!Number.isFinite(x[0]) || !Number.isFinite(x[1])) break;
    ts.push(k * h);
    xs.push(x);
    if (x[0] < lo1 || x[0] > hi1 || x[1] < lo2 || x[1] > hi2) break;
  }
  return { t: ts, x: xs };
}

/** Linearized trajectory around an equilibrium: x(t) = xᵉ + Δx(t), Δẋ = A Δx. */
export function linearTrajectory(eq: Equilibrium, x0: V2, T: number, w: Window, dt = 0.01) {
  const [[a, b], [c, d]] = eq.A;
  const r = integrate((v) => [a * v[0] + b * v[1], c * v[0] + d * v[1]], [x0[0] - eq.x[0], x0[1] - eq.x[1]], T, {
    x1: [w.x1[0] - eq.x[0], w.x1[1] - eq.x[0]],
    x2: [w.x2[0] - eq.x[1], w.x2[1] - eq.x[1]],
  }, dt);
  return { t: r.t, x: r.x.map((v) => [v[0] + eq.x[0], v[1] + eq.x[1]] as V2) };
}

/** Separatrices of a saddle: stable manifold (integrated backwards) and unstable manifold (forwards). */
export function separatrices(s: Sys, eq: Equilibrium, w: Window): { stable: V2[][]; unstable: V2[][] } {
  const out = { stable: [] as V2[][], unstable: [] as V2[][] };
  if (eq.kind !== 'saddle' || !eq.eig.vec) return out;
  const scale = Math.hypot(w.x1[1] - w.x1[0], w.x2[1] - w.x2[0]);
  const eps = 1e-5 * scale;
  const fn = (x: V2) => field(s, x);
  eq.eig.re.forEach((l, i) => {
    const v = eq.eig.vec![i];
    for (const sg of [1, -1]) {
      const start: V2 = [eq.x[0] + sg * eps * v[0], eq.x[1] + sg * eps * v[1]];
      const T = l < 0 ? -60 : 60;
      const r = integrate(fn, start, T, w, 0.005, 0.3);
      (l < 0 ? out.stable : out.unstable).push([eq.x, ...r.x]);
    }
  });
  return out;
}

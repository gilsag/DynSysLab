import type { SystemDef } from './types';
import { expand, gains } from './tf';
import { polyFromRoots } from './poly';

type Mat = number[][];

const zeros = (n: number, m = n): Mat => Array.from({ length: n }, () => new Array(m).fill(0));
const eye = (n: number): Mat => zeros(n).map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
function mul(a: Mat, b: Mat): Mat {
  const n = a.length;
  const m = b[0].length;
  const p = b.length;
  const c = zeros(n, m);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < m; j++) c[i][j] += aik * b[k][j];
    }
  return c;
}
const add = (a: Mat, b: Mat, s = 1): Mat => a.map((r, i) => r.map((x, j) => x + s * b[i][j]));
const scale = (a: Mat, s: number): Mat => a.map((r) => r.map((x) => x * s));
function solve(a: Mat, b: Mat): Mat {
  const n = a.length;
  const m = b[0].length;
  const A = a.map((r) => r.slice());
  const B = b.map((r) => r.slice());
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    [B[c], B[piv]] = [B[piv], B[c]];
    const d = A[c][c] || 1e-300;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / d;
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      for (let k = 0; k < m; k++) B[r][k] -= f * B[c][k];
    }
  }
  return B.map((row, i) => row.map((x) => x / (A[i][i] || 1e-300)));
}
function norm1(a: Mat) {
  let best = 0;
  for (let j = 0; j < a.length; j++) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i][j]);
    best = Math.max(best, s);
  }
  return best;
}
/** Matrix exponential: scaling & squaring with a degree-6 Padé approximant. */
export function expm(a: Mat): Mat {
  const n = a.length;
  const nrm = norm1(a);
  const s = Math.max(0, Math.ceil(Math.log2(nrm || 1)) + 1);
  const A = scale(a, Math.pow(2, -s));
  const q = 6;
  let c = 0.5;
  let X = A;
  let N = add(eye(n), A, c);
  let D = add(eye(n), A, -c);
  let positive = true;
  for (let k = 2; k <= q; k++) {
    c = (c * (q - k + 1)) / (k * (2 * q - k + 1));
    X = mul(A, X);
    N = add(N, X, c);
    D = add(D, X, positive ? c : -c);
    positive = !positive;
  }
  let E = solve(D, N);
  for (let k = 0; k < s; k++) E = mul(E, E);
  return E;
}

export interface SimResult {
  t: number[];
  y: number[];
  ok: boolean;
}

/** Controllable-canonical realisation of H(s) in normalised time τ = w0·t. */
function realise(sys: SystemDef) {
  const zs = expand(sys.roots, 'zero');
  const ps = expand(sys.roots, 'pole');
  const n = ps.length;
  const m = zs.length;
  const mags = [...zs, ...ps].map((r) => Math.hypot(r.re, r.im)).filter((x) => x > 0);
  const w0 = mags.length ? Math.exp(mags.reduce((s, x) => s + Math.log(x), 0) / mags.length) : 1;
  const { kl } = gains(sys);
  const k = kl * Math.pow(w0, m - n);
  const b = polyFromRoots(zs.map((z) => ({ re: z.re / w0, im: z.im / w0 }))).map((x) => x * k);
  const a = polyFromRoots(ps.map((p) => ({ re: p.re / w0, im: p.im / w0 })));
  while (b.length < n + 1) b.push(0);
  const D = n === 0 ? b[0] : b[n];
  const A = zeros(n);
  for (let i = 0; i < n - 1; i++) A[i][i + 1] = 1;
  for (let j = 0; j < n; j++) if (n) A[n - 1][j] = -a[j];
  const B = zeros(n, 1);
  if (n) B[n - 1][0] = 1;
  const C = new Array(n).fill(0).map((_, j) => b[j] - D * a[j]);
  return { A, B, C, D, n, w0 };
}

/**
 * Simulate y(t) for a given input.
 *  - 'step' / 'impulse': exact zero-order-hold discretisation
 *  - 'sine': u(t) = sin(w t), midpoint-sampled input (2nd-order accurate)
 * Delay is applied by shifting the output.
 */
export function simulate(sys: SystemDef, input: 'step' | 'impulse' | 'sine', tEnd: number, N: number, w = 1): SimResult {
  const zs = expand(sys.roots, 'zero').length;
  const ps = expand(sys.roots, 'pole').length;
  const t: number[] = [];
  const y: number[] = [];
  if (zs > ps) return { t, y, ok: false };
  const { A, B, C, D, n, w0 } = realise(sys);
  const T = sys.delay;
  const dt = tEnd / N;
  const dtau = dt * w0;
  let Phi: Mat = [[1]];
  let Gam: Mat = [[0]];
  if (n) {
    const M = zeros(n + 1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) M[i][j] = A[i][j] * dtau;
      M[i][n] = B[i][0] * dtau;
    }
    const E = expm(M);
    Phi = E.slice(0, n).map((r) => r.slice(0, n));
    Gam = E.slice(0, n).map((r) => [r[n]]);
  }
  let x = new Array(n).fill(0);
  if (input === 'impulse') x = B.map((r) => r[0] * w0); // δ(t) = w0·δ(τ)
  const out = (xv: number[], u: number) => xv.reduce((s, xi, i) => s + C[i] * xi, 0) + (input === 'impulse' ? 0 : D * u);
  const uAt = (tt: number) => (input === 'step' ? (tt >= 0 ? 1 : 0) : input === 'sine' ? Math.sin(w * tt) : 0);
  const raw: number[] = [];
  for (let k = 0; k <= N; k++) {
    const tk = k * dt;
    raw.push(out(x, uAt(tk)));
    const u = input === 'sine' ? Math.sin(w * (tk + dt / 2)) : uAt(tk);
    const nx = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = Gam[i][0] * u;
      for (let j = 0; j < n; j++) s += Phi[i][j] * x[j];
      nx[i] = s;
    }
    x = nx;
    if (!x.every(isFinite)) break;
  }
  for (let k = 0; k <= N; k++) {
    const tk = k * dt;
    t.push(tk);
    if (tk < T) {
      y.push(0);
    } else {
      const idx = (tk - T) / dt;
      const i0 = Math.floor(idx);
      const f = idx - i0;
      const a = raw[i0] ?? NaN;
      const b = raw[i0 + 1] ?? a;
      y.push(a + f * (b - a));
    }
  }
  return { t, y, ok: true };
}

/** Automatic simulation horizon. */
export function autoHorizon(sys: SystemDef) {
  let slow = Infinity;
  let fastUnstable = 0;
  let anyNonzero = false;
  for (const r of sys.roots) {
    if (r.kind !== 'pole') continue;
    const mag = Math.hypot(r.re, r.im);
    if (mag > 0) anyNonzero = true;
    if (r.re < 0) slow = Math.min(slow, -r.re);
    if (r.re > 0) fastUnstable = Math.max(fastUnstable, r.re);
    if (r.re === 0 && r.im > 0) slow = Math.min(slow, r.im / 20);
  }
  let tEnd: number;
  if (fastUnstable > 0) tEnd = 5 / fastUnstable;
  else if (isFinite(slow)) tEnd = 6 / slow;
  else if (anyNonzero) tEnd = 10;
  else tEnd = 10;
  tEnd += 1.5 * sys.delay;
  return Math.min(Math.max(tEnd, 1e-6), 1e6);
}

/**
 * Exact response to u(t) = sin(ωt) from rest:
 *   y(t) = Im{G e^{jωt}} + C e^{At} (−x_ss(0)),  x_ss(t) = Im{(jωI − A)^{-1} B e^{jωt}}
 * The free part is propagated with the exact transition matrix, so any time step works.
 */
export function simulateSine(sys: SystemDef, w: number, tEnd: number, N: number, tStart = 0) {
  const zs = expand(sys.roots, 'zero').length;
  const ps = expand(sys.roots, 'pole').length;
  const t: number[] = [];
  const y: number[] = [];
  const yss: number[] = [];
  if (zs > ps) return { t, y, yss, ok: false };
  const { A, B, C, D, n, w0 } = realise(sys);
  const wt = w / w0;
  let Gr = D;
  let Gi = 0;
  let xi: number[] = [];
  if (n) {
    const M = zeros(2 * n);
    const rhs = zeros(2 * n, 1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        M[i][j] = -A[i][j];
        M[n + i][n + j] = -A[i][j];
      }
      M[i][n + i] = -wt;
      M[n + i][i] = wt;
      rhs[i][0] = B[i][0];
    }
    const sol = solve(M, rhs);
    const xr = sol.slice(0, n).map((r) => r[0]);
    xi = sol.slice(n).map((r) => r[0]);
    Gr += C.reduce((s, c, i) => s + c * xr[i], 0);
    Gi += C.reduce((s, c, i) => s + c * xi[i], 0);
  }
  const T = sys.delay;
  const dt = (tEnd - tStart) / N;
  const x0 = xi.map((v) => -v);
  const Phi = n ? expm(A.map((r) => r.map((v) => v * dt * w0))) : [[1]];
  let x: number[] | null = null;
  for (let k = 0; k <= N; k++) {
    const tk = tStart + k * dt;
    t.push(tk);
    const ss = Gr * Math.sin(w * (tk - T)) + Gi * Math.cos(w * (tk - T));
    yss.push(ss);
    if (tk < T) {
      y.push(0);
      continue;
    }
    if (x === null) {
      // first sample with tk >= T: propagate exactly to tk - T
      const s0 = tk - T;
      if (n && s0 > 0) {
        const E0 = expm(A.map((r) => r.map((v) => v * s0 * w0)));
        x = E0.map((row) => row.reduce((s, v, j) => s + v * x0[j], 0));
      } else x = x0.slice();
    } else if (n) {
      const xc: number[] = x;
      x = Phi.map((row) => row.reduce((s, v, j) => s + v * xc[j], 0));
    }
    const xv: number[] = x;
    const free = C.reduce((s, c, i) => s + c * xv[i], 0);
    y.push(ss + free);
  }
  return { t, y, yss, ok: true };
}

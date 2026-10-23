// Least-squares approximation by basic signals: Gram matrix, normal equations, IEC.

export type Family = 'pulses' | 'steps' | 'trig' | 'mono' | 'legendre';
export type Fn = (t: number) => number;

export interface Basis {
  family: Family;
  fns: Fn[];
  /** TeX name of each basic signal */
  names: string[];
  /** instants where some basic signal is discontinuous */
  breaks: number[];
  /** pulse/step instants τ0 … τn (pulses and steps only) */
  taus?: number[];
}

const mu = (x: number) => (x >= 0 ? 1 : 0);

function legendre(k: number, s: number): number {
  if (k === 0) return 1;
  let p0 = 1, p1 = s;
  for (let n = 1; n < k; n++) [p0, p1] = [p1, ((2 * n + 1) * s * p1 - n * p0) / (n + 1)];
  return p1;
}

/** n basic signals of a family on [t1, t2] (for 'trig', n = 2K + 1 with K harmonics). */
export function makeBasis(family: Family, n: number, t1: number, t2: number): Basis {
  const L = t2 - t1;
  if (family === 'pulses' || family === 'steps') {
    const taus = Array.from({ length: n + 1 }, (_, k) => t1 + (L * k) / n);
    const fns: Fn[] = [];
    const names: string[] = [];
    for (let k = 1; k <= n; k++) {
      const a = taus[k - 1], b = taus[k];
      if (family === 'pulses') {
        // closed at the right end of the interval so that u(t2) is covered
        fns.push(k === n ? (t) => (t >= a && t <= b ? 1 : 0) : (t) => (t >= a && t < b ? 1 : 0));
        names.push(`\\mu(t-\\tau_{${k - 1}})-\\mu(t-\\tau_{${k}})`);
      } else {
        fns.push((t) => mu(t - a));
        names.push(`\\mu(t-\\tau_{${k - 1}})`);
      }
    }
    return { family, fns, names, breaks: taus, taus };
  }
  if (family === 'trig') {
    const K = Math.max(0, Math.floor((n - 1) / 2));
    const w = (2 * Math.PI) / L;
    const fns: Fn[] = [() => 1];
    const names = ['1'];
    for (let k = 1; k <= K; k++) {
      fns.push((t) => Math.cos(k * w * (t - t1)), (t) => Math.sin(k * w * (t - t1)));
      const kk = k === 1 ? '' : String(k);
      names.push(`\\cos(${kk}\\omega_0 t)`, `\\operatorname{sen}(${kk}\\omega_0 t)`);
    }
    return { family, fns, names, breaks: [t1, t2] };
  }
  // polynomials in the scaled variable s = (2t − t1 − t2)/L ∈ [−1, 1]
  const sOf = (t: number) => (2 * t - t1 - t2) / L;
  const fns: Fn[] = [];
  const names: string[] = [];
  for (let k = 0; k < n; k++) {
    if (family === 'mono') {
      fns.push((t) => sOf(t) ** k);
      names.push(k === 0 ? '1' : k === 1 ? 's' : `s^{${k}}`);
    } else {
      fns.push((t) => legendre(k, sOf(t)));
      names.push(`P_{${k}}(s)`);
    }
  }
  return { family, fns, names, breaks: [t1, t2] };
}

// 16-point Gauss–Legendre nodes and weights on [−1, 1]
const GL_X = [-0.9894009349916499, -0.9445750230732326, -0.8656312023878318, -0.755404408355003, -0.6178762444026438, -0.45801677765722737, -0.2816035507792589, -0.09501250983763744, 0.09501250983763744, 0.2816035507792589, 0.45801677765722737, 0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326, 0.9894009349916499];
const GL_W = [0.027152459411754096, 0.062253523938647894, 0.09515851168249279, 0.12462897125553388, 0.14959598881657674, 0.16915651939500254, 0.18260341504492358, 0.18945061045506850, 0.18945061045506850, 0.18260341504492358, 0.16915651939500254, 0.14959598881657674, 0.12462897125553388, 0.09515851168249279, 0.062253523938647894, 0.027152459411754096];

export interface Quad {
  t: Float64Array;
  w: Float64Array;
}

/** Composite Gauss–Legendre rule on [t1, t2], split at the given breakpoints and into `segs` pieces. */
export function quadrature(t1: number, t2: number, breaks: number[], segs = 240): Quad {
  const cuts = new Set<number>();
  for (let i = 0; i <= segs; i++) cuts.add(t1 + ((t2 - t1) * i) / segs);
  for (const b of breaks) if (b > t1 && b < t2) cuts.add(b);
  const c = [...cuts].sort((p, q) => p - q);
  const t: number[] = [];
  const w: number[] = [];
  for (let i = 0; i + 1 < c.length; i++) {
    const a = c[i], b = c[i + 1];
    if (b - a < 1e-14) continue;
    const h = (b - a) / 2, m = (a + b) / 2;
    for (let j = 0; j < 16; j++) {
      t.push(m + h * GL_X[j]);
      w.push(h * GL_W[j]);
    }
  }
  return { t: Float64Array.from(t), w: Float64Array.from(w) };
}

export interface Fit {
  n: number;
  gram: number[][];
  rhs: number[]; // ⟨u, S_k⟩
  C: number[];
  uu: number; // ∫u²
  iec: number; // ∫(u − f)²
  orthogonal: boolean;
  cond: number;
}

/** Solves the normal equations Γ C = b by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c];
    if (Math.abs(piv) < 1e-300) continue;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / piv;
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = M[r][r] !== 0 ? s / M[r][r] : 0;
  }
  return x;
}

/** Ratio of extreme eigenvalues of a symmetric positive matrix (cyclic Jacobi). */
export function condition(A: number[][]): number {
  const n = A.length;
  const a = A.map((r) => [...r]);
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const tt = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(tt * tt + 1), s = tt * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
      }
    }
  }
  const ev = a.map((r, i) => Math.abs(r[i]));
  return Math.max(...ev) / Math.min(...ev);
}

/** Optimal coefficients and residual error of u on [t1, t2] with the given basis. */
export function fit(u: Fn, basis: Basis, t1: number, t2: number, extraBreaks: number[] = []): Fit {
  const q = quadrature(t1, t2, [...basis.breaks, ...extraBreaks]);
  const m = q.t.length;
  const n = basis.fns.length;
  const U = new Float64Array(m);
  for (let i = 0; i < m; i++) U[i] = u(q.t[i]);
  const S = basis.fns.map((f) => { const v = new Float64Array(m); for (let i = 0; i < m; i++) v[i] = f(q.t[i]); return v; });
  const dot = (x: Float64Array, y: Float64Array) => { let s = 0; for (let i = 0; i < m; i++) s += q.w[i] * x[i] * y[i]; return s; };
  const gram = S.map((a) => S.map((b) => dot(a, b)));
  const rhs = S.map((s) => dot(U, s));
  const C = solve(gram, rhs);
  let iec = 0;
  for (let i = 0; i < m; i++) {
    let f = 0;
    for (let k = 0; k < n; k++) f += C[k] * S[k][i];
    iec += q.w[i] * (U[i] - f) ** 2;
  }
  let offMax = 0, diagMin = Infinity;
  for (let j = 0; j < n; j++) {
    diagMin = Math.min(diagMin, gram[j][j]);
    for (let k = 0; k < n; k++) if (j !== k) offMax = Math.max(offMax, Math.abs(gram[j][k]));
  }
  return { n, gram, rhs, C, uu: dot(U, U), iec, orthogonal: offMax < 1e-9 * diagMin, cond: n > 1 ? condition(gram) : 1 };
}

export const evalFit = (basis: Basis, C: number[], t: number) => basis.fns.reduce((s, f, k) => s + C[k] * f(t), 0);

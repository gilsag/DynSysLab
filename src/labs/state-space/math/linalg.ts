// Álgebra lineal real y compleja para matrices pequeñas (n ≤ 8)
import { C, cx, cadd, csub, cmul, cdiv, cabs, cscale, cconj } from './complex';

export type Mat = number[][];
export type Vec = number[];
export type CMat = C[][];
export type CVec = C[];

export const zeros = (n: number, m: number): Mat => Array.from({ length: n }, () => new Array(m).fill(0));
export const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export const clone = (A: Mat): Mat => A.map((r) => r.slice());
export const rows = (A: Mat) => A.length;
export const cols = (A: Mat) => (A.length ? A[0].length : 0);

export function matmul(A: Mat, B: Mat): Mat {
  const n = A.length, k = B.length, m = k ? B[0].length : 0;
  const R = zeros(n, m);
  for (let i = 0; i < n; i++)
    for (let l = 0; l < k; l++) {
      const a = A[i][l];
      if (a === 0) continue;
      for (let j = 0; j < m; j++) R[i][j] += a * B[l][j];
    }
  return R;
}
export const matvec = (A: Mat, x: Vec): Vec => A.map((r) => r.reduce((s, a, j) => s + a * x[j], 0));
export const transpose = (A: Mat): Mat => (A.length ? A[0].map((_, j) => A.map((r) => r[j])) : []);
export const madd = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((a, j) => a + B[i][j]));
export const msub = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((a, j) => a - B[i][j]));
export const mscale = (A: Mat, s: number): Mat => A.map((r) => r.map((a) => a * s));
export const vadd = (a: Vec, b: Vec): Vec => a.map((x, i) => x + b[i]);
export const vscale = (a: Vec, s: number): Vec => a.map((x) => x * s);
export const norm2 = (v: Vec) => Math.hypot(...v);
export const frob = (A: Mat) => Math.sqrt(A.reduce((s, r) => s + r.reduce((t, a) => t + a * a, 0), 0));
export const trace = (A: Mat) => A.reduce((s, r, i) => s + r[i], 0);
export const col = (A: Mat, j: number): Vec => A.map((r) => r[j]);
export const hcat = (...Ms: Mat[]): Mat => Ms[0].map((_, i) => Ms.flatMap((M) => M[i]));
export const vcat = (...Ms: Mat[]): Mat => Ms.flatMap((M) => M.map((r) => r.slice()));
export const maxAbs = (A: Mat) => A.reduce((s, r) => Math.max(s, ...r.map(Math.abs)), 0);

export function det(A: Mat): number {
  const n = A.length;
  if (n === 0) return 1;
  const M = clone(A);
  let d = 1;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (M[p][k] === 0) return 0;
    if (p !== k) { [M[p], M[k]] = [M[k], M[p]]; d = -d; }
    d *= M[k][k];
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      for (let j = k; j < n; j++) M[i][j] -= f * M[k][j];
    }
  }
  return d;
}

/** Inversa por Gauss-Jordan con pivoteo parcial. Devuelve null si es singular. */
export function inv(A: Mat): Mat | null {
  const n = A.length;
  const M = A.map((r, i) => [...r, ...eye(n)[i]]);
  const scale = Math.max(maxAbs(A), 1e-300);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (Math.abs(M[p][k]) < 1e-13 * scale) return null;
    [M[p], M[k]] = [M[k], M[p]];
    const piv = M[k][k];
    for (let j = 0; j < 2 * n; j++) M[k][j] /= piv;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = M[i][k];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[i][j] -= f * M[k][j];
    }
  }
  return M.map((r) => r.slice(n));
}

export function solve(A: Mat, b: Vec): Vec | null {
  const Ai = inv(A);
  return Ai ? matvec(Ai, b) : null;
}

/** Valores y vectores propios de una matriz simétrica (Jacobi). */
export function jacobiEig(S: Mat): { values: Vec; vectors: Mat } {
  const n = S.length;
  const A = clone(S);
  const V = eye(n);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (off < 1e-30 * Math.max(1, frob(A) ** 2)) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
  }
  const values = A.map((r, i) => r[i]);
  const idx = values.map((_, i) => i).sort((a, b) => values[b] - values[a]);
  return { values: idx.map((i) => values[i]), vectors: V.map((r) => idx.map((i) => r[i])) };
}

/** Valores singulares en orden decreciente. */
export function singularValues(M: Mat): Vec {
  if (!M.length || !M[0].length) return [];
  const n = M.length, m = M[0].length;
  const G = n <= m ? matmul(M, transpose(M)) : matmul(transpose(M), M);
  return jacobiEig(G).values.map((v) => Math.sqrt(Math.max(0, v)));
}

export function rank(M: Mat, rtol = 1e-9): number {
  const s = singularValues(M);
  if (!s.length || s[0] === 0) return 0;
  return s.filter((x) => x > rtol * s[0]).length;
}

/** Base ortonormal del núcleo (vía Jacobi sobre MᵀM). */
export function nullspace(M: Mat, rtol = 1e-9): Mat {
  const m = M[0].length;
  const { values, vectors } = jacobiEig(matmul(transpose(M), M));
  const smax = Math.sqrt(Math.max(values[0], 0));
  const out: Mat = [];
  for (let k = 0; k < m; k++) if (Math.sqrt(Math.max(values[k], 0)) <= rtol * Math.max(smax, 1e-300)) out.push(col(vectors, k));
  return out; // lista de vectores
}

/** Base ortonormal de la imagen (columnas). */
export function rangeBasis(M: Mat, rtol = 1e-9): Mat {
  const n = M.length;
  const { values, vectors } = jacobiEig(matmul(M, transpose(M)));
  const smax = Math.sqrt(Math.max(values[0], 0));
  const out: Mat = [];
  for (let k = 0; k < n; k++) if (Math.sqrt(Math.max(values[k], 0)) > rtol * Math.max(smax, 1e-300)) out.push(col(vectors, k));
  return out;
}

/** Exponencial matricial: Padé (6,6) con escalamiento y cuadratura. */
export function expm(A: Mat): Mat {
  const n = A.length;
  if (n === 0) return [];
  const nrm = Math.max(...A.map((r) => r.reduce((s, a) => s + Math.abs(a), 0)));
  const s = nrm > 0.5 ? Math.max(0, Math.ceil(Math.log2(nrm / 0.5))) : 0;
  const As = mscale(A, 1 / 2 ** s);
  const c = [1, 1 / 2, 5 / 44, 1 / 66, 1 / 792, 1 / 15840, 1 / 665280];
  let X = eye(n);
  let N = eye(n), D = eye(n);
  for (let k = 1; k <= 6; k++) {
    X = matmul(As, X);
    const cX = mscale(X, c[k]);
    N = madd(N, cX);
    D = k % 2 === 0 ? madd(D, cX) : msub(D, cX);
  }
  const Di = inv(D)!;
  let E = matmul(Di, N);
  for (let k = 0; k < s; k++) E = matmul(E, E);
  return E;
}

/** Polinomio característico det(λI − A) = λⁿ + c₁λⁿ⁻¹ + … + cₙ. Devuelve coeficientes en potencias ascendentes [a0..an] con an = 1. */
export function charPoly(A: Mat): Vec {
  const n = A.length;
  // Faddeev–LeVerrier
  const c = new Array(n + 1).fill(0);
  c[n] = 1;
  let M = zeros(n, n);
  for (let k = 1; k <= n; k++) {
    M = madd(matmul(A, M), mscale(eye(n), c[n - k + 1]));
    c[n - k] = -trace(matmul(A, M)) / k;
  }
  return c;
}

// ---------- Complejos ----------
export const toC = (A: Mat): CMat => A.map((r) => r.map((a) => cx(a)));

/** Núcleo complejo por eliminación gaussiana con pivoteo completo. Devuelve vectores base. */
export function cnullspace(M: CMat, rtol = 1e-7): CVec[] {
  const n = M.length, m = M[0].length;
  const A = M.map((r) => r.slice());
  let scale = 0;
  for (const r of A) for (const a of r) scale = Math.max(scale, cabs(a));
  const tol = rtol * Math.max(scale, 1e-300);
  const colPerm = Array.from({ length: m }, (_, j) => j);
  let rnk = 0;
  for (let k = 0; k < Math.min(n, m); k++) {
    let bi = -1, bj = -1, best = tol;
    for (let i = k; i < n; i++) for (let j = k; j < m; j++) { const v = cabs(A[i][j]); if (v > best) { best = v; bi = i; bj = j; } }
    if (bi < 0) break;
    [A[k], A[bi]] = [A[bi], A[k]];
    if (bj !== k) { for (const r of A) [r[k], r[bj]] = [r[bj], r[k]]; [colPerm[k], colPerm[bj]] = [colPerm[bj], colPerm[k]]; }
    const piv = A[k][k];
    for (let j = k; j < m; j++) A[k][j] = cdiv(A[k][j], piv);
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = A[i][k];
      if (cabs(f) === 0) continue;
      for (let j = k; j < m; j++) A[i][j] = csub(A[i][j], cmul(f, A[k][j]));
    }
    rnk++;
  }
  const basis: CVec[] = [];
  for (let f = rnk; f < m; f++) {
    const v: CVec = new Array(m).fill(0).map(() => cx(0));
    v[colPerm[f]] = cx(1);
    for (let i = 0; i < rnk; i++) v[colPerm[i]] = cscale(A[i][f], -1);
    basis.push(v);
  }
  return basis;
}

export function crank(M: CMat, rtol = 1e-7): number {
  if (!M.length) return 0;
  return M[0].length - cnullspace(M, rtol).length;
}

/** Resuelve (posiblemente singular pero consistente) M x = b en mínimos términos libres = 0. */
export function csolveSingular(M: CMat, b: CVec, rtol = 1e-7): CVec {
  const n = M.length, m = M[0].length;
  const A = M.map((r, i) => [...r, b[i]]);
  let scale = 0;
  for (const r of M) for (const a of r) scale = Math.max(scale, cabs(a));
  const tol = rtol * Math.max(scale, 1e-300);
  const colPerm = Array.from({ length: m }, (_, j) => j);
  let rnk = 0;
  for (let k = 0; k < Math.min(n, m); k++) {
    let bi = -1, bj = -1, best = tol;
    for (let i = k; i < n; i++) for (let j = k; j < m; j++) { const v = cabs(A[i][j]); if (v > best) { best = v; bi = i; bj = j; } }
    if (bi < 0) break;
    [A[k], A[bi]] = [A[bi], A[k]];
    if (bj !== k) { for (const r of A) [r[k], r[bj]] = [r[bj], r[k]]; [colPerm[k], colPerm[bj]] = [colPerm[bj], colPerm[k]]; }
    const piv = A[k][k];
    for (let j = k; j <= m; j++) A[k][j] = cdiv(A[k][j], piv);
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = A[i][k];
      if (cabs(f) === 0) continue;
      for (let j = k; j <= m; j++) A[i][j] = csub(A[i][j], cmul(f, A[k][j]));
    }
    rnk++;
  }
  const x: CVec = new Array(m).fill(0).map(() => cx(0));
  for (let i = 0; i < rnk; i++) x[colPerm[i]] = A[i][m];
  return x;
}

export const cvnorm = (v: CVec) => Math.sqrt(v.reduce((s, a) => s + a.re * a.re + a.im * a.im, 0));
export const cvscale = (v: CVec, s: C) => v.map((a) => cmul(a, s));
export function cmatvec(A: CMat, x: CVec): CVec {
  return A.map((r) => r.reduce((s, a, j) => cadd(s, cmul(a, x[j])), cx(0)));
}
export const cconjv = (v: CVec) => v.map(cconj);

/** Inversa compleja (Gauss-Jordan). */
export function cinv(A: CMat): CMat | null {
  const n = A.length;
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => cx(i === j ? 1 : 0))]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (cabs(M[i][k]) > cabs(M[p][k])) p = i;
    if (cabs(M[p][k]) < 1e-300) return null;
    [M[p], M[k]] = [M[k], M[p]];
    const piv = M[k][k];
    for (let j = 0; j < 2 * n; j++) M[k][j] = cdiv(M[k][j], piv);
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = M[i][k];
      for (let j = 0; j < 2 * n; j++) M[i][j] = csub(M[i][j], cmul(f, M[k][j]));
    }
  }
  return M.map((r) => r.slice(n));
}

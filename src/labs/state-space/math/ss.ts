// Representación en variables de estado: realizaciones, modos, controlabilidad, observabilidad, simulación
import { C, cx, cabs, cmul, cscale, cdiv, csub } from './complex';
import {
  Mat, Vec, CVec, zeros, eye, matmul, matvec, transpose, msub, mscale, hcat, vcat, inv, expm, charPoly, singularValues,
  rank, toC, cnullspace, crank, csolveSingular, cvnorm, frob, maxAbs, rangeBasis, col, jacobiEig,
} from './linalg';
import { Poly, polyRoots, cleanRoots, clusterRoots, polyAdd, polyScale, trimPoly } from './poly';

export interface SS { A: Mat; B: Mat; C: Mat; D: Mat }

export const dims = (s: SS) => ({ n: s.A.length, m: s.B[0]?.length ?? 0, p: s.C.length });

export function eigenvalues(A: Mat, hint?: C[]): C[] {
  if (hint && hint.length === A.length) return cleanRoots(hint);
  if (A.length === 0) return [];
  const cp = charPoly(A);
  return cleanRoots(polyRoots(cp), 1e-6, cp);
}

// ---------- Funciones de transferencia ----------
export interface TF { num: Poly; den: Poly }

/** G(s) = c (sI−A)^{-1} b + d mediante el lema del determinante. */
export function tfSISO(A: Mat, b: Vec, c: Vec, d: number): TF {
  const den = charPoly(A);
  const bc = b.map((bi) => c.map((cj) => bi * cj));
  const p2 = charPoly(msub(A, bc));
  let num = polyAdd(polyAdd(p2, polyScale(den, -1)), polyScale(den, d));
  const scale = Math.max(...num.map(Math.abs), ...den.map(Math.abs), 1e-300);
  num = num.map((x) => (Math.abs(x) < 1e-10 * scale ? 0 : x));
  return { num: trimPoly(num), den };
}

export function tfPair(s: SS, out = 0, input = 0): TF {
  return tfSISO(s.A, col(s.B, input), s.C[out], s.D[out]?.[input] ?? 0);
}

export function evalTF(tf: TF, w: number): C {
  // G(jw)
  let N = cx(0), D = cx(0);
  const jw = cx(0, w);
  for (let k = tf.num.length - 1; k >= 0; k--) N = { re: N.re * jw.re - N.im * jw.im + tf.num[k], im: N.re * jw.im + N.im * jw.re };
  for (let k = tf.den.length - 1; k >= 0; k--) D = { re: D.re * jw.re - D.im * jw.im + tf.den[k], im: D.re * jw.im + D.im * jw.re };
  return cdiv(N, D);
}

// ---------- Realizaciones canónicas ----------
/** Forma canónica controlable (variables de fase): A compañera con última fila −a, B = e_n. */
export function ccf(tf: TF): SS {
  const den = tf.den.slice();
  const n = den.length - 1;
  const lead = den[n];
  const a = den.map((x) => x / lead);
  const num = tf.num.map((x) => x / lead);
  const bn = num[n] ?? 0;
  const A = zeros(n, n);
  for (let i = 0; i < n - 1; i++) A[i][i + 1] = 1;
  for (let j = 0; j < n; j++) A[n - 1][j] = -a[j];
  const B = zeros(n, 1);
  if (n) B[n - 1][0] = 1;
  const Cm = [Array.from({ length: n }, (_, k) => (num[k] ?? 0) - bn * a[k])];
  return { A, B, C: Cm, D: [[bn]] };
}

/** Forma canónica observable: dual de la controlable. */
export function ocf(tf: TF): SS {
  const c = ccf(tf);
  return { A: transpose(c.A), B: transpose(c.C), C: transpose(c.B), D: c.D };
}

// ---------- Cambio de coordenadas x = T z ----------
export function transform(s: SS, T: Mat): SS | null {
  const Ti = inv(T);
  if (!Ti) return null;
  return { A: matmul(matmul(Ti, s.A), T), B: matmul(Ti, s.B), C: matmul(s.C, T), D: s.D.map((r) => r.slice()) };
}

export function cleanMat(M: Mat, rel = 1e-10): Mat {
  const sc = Math.max(maxAbs(M), 1);
  return M.map((r) => r.map((x) => (Math.abs(x) < rel * sc ? 0 : x)));
}

// ---------- Descomposición modal real ----------
export type VecNorm = 'last' | 'first' | 'unit';
export interface ModalBlock { kind: 'real' | 'complex' | 'jordan-real' | 'jordan-complex'; lambda: C; size: number; start: number; mult: number }
export interface Modal {
  ok: boolean;
  diagonalizable: boolean;
  T: Mat; // columnas: base modal real
  J: Mat; // T^{-1} A T
  blocks: ModalBlock[];
  eig: C[]; // valores propios (todos)
  clusters: { value: C; mult: number; geom: number }[]; // sólo im ≥ 0
  rightVecs: { lambda: C; v: CVec }[]; // un vector propio por valor propio distinto (im ≥ 0)
  message?: string;
}

function normalizeC(vs: CVec[], mode: VecNorm): CVec[] {
  const v = vs[0];
  const mx = Math.max(...v.map(cabs));
  let idx = -1;
  if (mode === 'last') { for (let i = v.length - 1; i >= 0; i--) if (cabs(v[i]) > 1e-6 * mx) { idx = i; break; } }
  else if (mode === 'first') { for (let i = 0; i < v.length; i++) if (cabs(v[i]) > 1e-6 * mx) { idx = i; break; } }
  else { idx = v.findIndex((z) => cabs(z) === mx); }
  let f = cdiv(cx(1), v[idx]);
  if (mode === 'unit') {
    const nv = cvnorm(v.map((z) => cmul(z, f)));
    f = cscale(f, 1 / nv);
  }
  return vs.map((w) => w.map((z) => cmul(z, f)));
}

export function modal(A: Mat, hint?: C[], mode: VecNorm = 'last'): Modal {
  const n = A.length;
  const eig = eigenvalues(A, hint);
  const upper = clusterRoots(eig.filter((z) => z.im >= 0), 1e-7);
  const cols: Vec[] = [];
  const blocks: ModalBlock[] = [];
  const clusters: Modal['clusters'] = [];
  const rightVecs: Modal['rightVecs'] = [];
  let diagonalizable = true;
  let ok = true;
  let message: string | undefined;
  const Ac = toC(A);
  for (const { value: lam, mult } of upper) {
    const M = Ac.map((r, i) => r.map((a, j) => (i === j ? csub(a, lam) : a)));
    let N = cnullspace(M, 1e-6);
    if (N.length > mult) N = N.slice(0, mult);
    const g = N.length;
    clusters.push({ value: lam, mult, geom: g });
    const isReal = lam.im === 0;
    if (g === 0) { ok = false; message = 'eig'; break; }
    if (g === mult) {
      for (const v0 of N) {
        const [v] = normalizeC([v0], mode);
        rightVecs.push({ lambda: lam, v });
        const start = cols.length;
        if (isReal) { cols.push(v.map((z) => z.re)); blocks.push({ kind: 'real', lambda: lam, size: 1, start, mult }); }
        else { cols.push(v.map((z) => z.im), v.map((z) => z.re)); blocks.push({ kind: 'complex', lambda: lam, size: 2, start, mult }); }
      }
    } else if (g === 1) {
      diagonalizable = false;
      const chain: CVec[] = [N[0]];
      for (let k = 1; k < mult; k++) chain.push(csolveSingular(M, chain[k - 1], 1e-6));
      const ch = normalizeC(chain, mode);
      rightVecs.push({ lambda: lam, v: ch[0] });
      const start = cols.length;
      for (const v of ch) {
        if (isReal) cols.push(v.map((z) => z.re));
        else cols.push(v.map((z) => z.im), v.map((z) => z.re));
      }
      blocks.push({ kind: isReal ? 'jordan-real' : 'jordan-complex', lambda: lam, size: isReal ? mult : 2 * mult, start, mult });
    } else {
      diagonalizable = false;
      ok = false;
      message = 'jordan-general';
      break;
    }
  }
  if (!ok || cols.length !== n) {
    return { ok: false, diagonalizable, T: eye(n), J: A, blocks: [], eig, clusters, rightVecs, message: message ?? 'eig' };
  }
  const T = transpose(cols);
  const Ti = inv(T);
  if (!Ti) return { ok: false, diagonalizable, T: eye(n), J: A, blocks: [], eig, clusters, rightVecs, message: 'singular' };
  const J = cleanMat(matmul(matmul(Ti, A), T), 1e-9);
  return { ok: true, diagonalizable, T, J, blocks, eig, clusters, rightVecs };
}

// ---------- Controlabilidad y observabilidad ----------
export function ctrb(A: Mat, B: Mat): Mat {
  const n = A.length;
  const blocks: Mat[] = [B];
  for (let k = 1; k < n; k++) blocks.push(matmul(A, blocks[k - 1]));
  return hcat(...blocks);
}
export function obsv(A: Mat, C: Mat): Mat {
  const n = A.length;
  const blocks: Mat[] = [C];
  for (let k = 1; k < n; k++) blocks.push(matmul(blocks[k - 1], A));
  return vcat(...blocks);
}

export interface ModeCO {
  lambda: C; mult: number; geom: number;
  controllable: boolean; observable: boolean;
  cosC: number | null; cosO: number | null; // medidas modales (ángulo, Hamdan–Nayfeh)
}

export interface COAnalysis {
  Ct: Mat; Ob: Mat;
  rankC: number; rankO: number;
  svC: Vec; svO: Vec;
  minimalOrder: number;
  modes: ModeCO[];
  reach: Mat; // base ortonormal del subespacio alcanzable (lista de vectores)
  unobs: Mat; // base ortonormal del subespacio no observable
}

/** Balanceo diagonal (Parlett–Reinsch, potencias de 2): Ab = D⁻¹ A D, con x = D x_b. */
export function balance(A: Mat): { Ab: Mat; d: Vec } {
  const n = A.length;
  const M = A.map((r) => r.slice());
  const d = new Array(n).fill(1);
  const b = 2, b2 = 4;
  for (let it = 0, done = false; it < 200 && !done; it++) {
    done = true;
    for (let i = 0; i < n; i++) {
      let c = 0, r = 0;
      for (let j = 0; j < n; j++) if (j !== i) { c += Math.abs(M[j][i]); r += Math.abs(M[i][j]); }
      if (c === 0 || r === 0) continue;
      const s0 = c + r;
      let f = 1, g = r / b;
      while (c < g) { f *= b; c *= b2; }
      g = r * b;
      while (c >= g) { f /= b; c /= b2; }
      if ((c + r) / f < 0.95 * s0) {
        done = false;
        d[i] *= f;
        for (let j = 0; j < n; j++) { M[i][j] /= f; M[j][i] *= f; }
      }
    }
  }
  return { Ab: M, d };
}

/**
 * Forma escalonada de controlabilidad con transformaciones ortogonales (Rosenbrock / Van Dooren).
 * Devuelve la dimensión del subespacio controlable nc, la matriz ortogonal Q (x = Q x̃)
 * y Ã = Qᵀ A Q, cuyas primeras nc coordenadas forman el subsistema controlable.
 */
export function staircase(A: Mat, B: Mat, rtol = 1e-7): { nc: number; Q: Mat; At: Mat } {
  const n = A.length;
  let Q = eye(n);
  let At = A.map((r) => r.slice());
  const scale = Math.max(frob(A), frob(B), 1e-300);
  const tol = rtol * scale;
  let start = 0;
  let Bcur: Mat = B.map((r) => r.slice());
  while (start < n && Bcur[0]?.length) {
    const r = n - start;
    const { values, vectors } = jacobiEig(matmul(Bcur, transpose(Bcur)));
    const rho = values.filter((v) => Math.sqrt(Math.max(v, 0)) > tol).length;
    if (rho === 0) break;
    const T = eye(n);
    for (let a = 0; a < r; a++) for (let c = 0; c < r; c++) T[start + a][start + c] = vectors[a][c];
    At = matmul(matmul(transpose(T), At), T);
    Q = matmul(Q, T);
    const prev = start;
    start += rho;
    if (start >= n) break;
    Bcur = At.slice(start).map((row) => row.slice(prev, start));
  }
  return { nc: start, Q, At };
}

export function coAnalysis(s: SS, md: Modal): COAnalysis {
  const n = s.A.length;
  const Ct = ctrb(s.A, s.B), Ob = obsv(s.A, s.C);
  const svC = singularValues(Ct), svO = singularValues(Ob);
  // Las decisiones de rango se toman sobre el sistema balanceado y con transformaciones
  // ortogonales: la matriz de Kalman se vuelve muy mal condicionada al crecer n.
  const { Ab, d } = balance(s.A);
  const nB = frob(s.B) || 1, nC = frob(s.C) || 1;
  const Bb = s.B.map((row, i) => row.map((v) => v / d[i] / nB));
  const Cb = s.C.map((row) => row.map((v, j) => (v * d[j]) / nC));
  const sc = staircase(Ab, Bb);
  const so = staircase(transpose(Ab), transpose(Cb));
  const rankC = sc.nc, rankO = so.nc;
  // subsistema controlable y su parte observable ⇒ orden mínimo
  let minimalOrder = 0;
  if (rankC > 0) {
    const Ac = sc.At.slice(0, rankC).map((r) => r.slice(0, rankC));
    const Cc = matmul(Cb, sc.Q.map((r) => r.slice(0, rankC)));
    minimalOrder = staircase(transpose(Ac), transpose(Cc)).nc;
  }
  const nAb = Math.max(maxAbs(Ab), 1);
  const Abc = toC(Ab);
  const modes: ModeCO[] = md.clusters.map(({ value: lam, mult, geom }) => {
    const M = Abc.map((r, i) => r.map((a, j) => (i === j ? csub(a, lam) : a)));
    const MB = M.map((r, i) => [...r, ...Bb[i].map((b) => cx(b * nAb))]);
    const MC = [...M, ...Cb.map((r) => r.map((c) => cx(c * nAb)))];
    const controllable = crank(MB, 1e-7) === n;
    const observable = crank(MC, 1e-7) === n;
    let cosC: number | null = null, cosO: number | null = null;
    if (mult === 1) {
      const vr = cnullspace(M, 1e-6)[0];
      const ML = toC(transpose(Ab)).map((r, i) => r.map((a, j) => (i === j ? csub(a, lam) : a)));
      const ul = cnullspace(ML, 1e-6)[0];
      if (ul) {
        const uB = Bb[0].map((_, j) => Bb.reduce((acc, row, i) => ({ re: acc.re + ul[i].re * row[j], im: acc.im + ul[i].im * row[j] }), cx(0)));
        cosC = Math.min(1, cvnorm(uB) / (cvnorm(ul) * (frob(Bb) || 1)));
      }
      if (vr) {
        const Cv = Cb.map((row) => row.reduce((acc, c, j) => ({ re: acc.re + c * vr[j].re, im: acc.im + c * vr[j].im }), cx(0)));
        cosO = Math.min(1, cvnorm(Cv) / (cvnorm(vr) * (frob(Cb) || 1)));
      }
    }
    return { lambda: lam, mult, geom, controllable, observable, cosC, cosO };
  });
  // subespacios en las coordenadas originales (x = D x_b)
  const toOrig = (cols: Mat) => (cols.length ? rangeBasis(transpose(cols.map((v) => v.map((x, i) => x * d[i])))) : []);
  const reach = rankC < n ? toOrig(transpose(sc.Q).slice(0, rankC)) : rangeBasis(eye(n));
  const unobs = rankO < n ? toOrig(transpose(so.Q).slice(rankO)) : [];
  return { Ct, Ob, rankC, rankO, svC, svO, minimalOrder, modes, reach, unobs };
}

/** Gramiano de controlabilidad en horizonte finito (Van Loan). */
export function gramianC(A: Mat, B: Mat, Tf: number): Mat {
  const n = A.length;
  const Q = matmul(B, transpose(B));
  const M = zeros(2 * n, 2 * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    M[i][j] = -A[i][j] * Tf;
    M[i][n + j] = Q[i][j] * Tf;
    M[n + i][n + j] = A[j][i] * Tf;
  }
  const E = expm(M);
  const F12 = E.slice(0, n).map((r) => r.slice(n));
  const F22 = E.slice(n).map((r) => r.slice(n));
  const W = matmul(transpose(F22), F12);
  return W.map((r, i) => r.map((_, j) => (W[i][j] + W[j][i]) / 2));
}

// ---------- Simulación exacta (retenedor de orden cero) ----------
export function discretize(A: Mat, B: Mat, h: number): { Phi: Mat; Gam: Mat } {
  const n = A.length, m = B[0]?.length ?? 0;
  const M = zeros(n + m, n + m);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) M[i][j] = A[i][j] * h;
    for (let j = 0; j < m; j++) M[i][n + j] = B[i][j] * h;
  }
  const E = expm(M);
  return { Phi: E.slice(0, n).map((r) => r.slice(0, n)), Gam: E.slice(0, n).map((r) => r.slice(n)) };
}

export interface SimResult { t: Vec; x: Mat; y: Mat; u: Mat }

export function simulate(s: SS, x0: Vec, u: (t: number) => Vec, Tend: number, N = 500): SimResult {
  const h = Tend / N;
  const { Phi, Gam } = discretize(s.A, s.B, h);
  const t: Vec = [], X: Mat = [], Y: Mat = [], U: Mat = [];
  let x = x0.slice();
  for (let k = 0; k <= N; k++) {
    const tk = k * h;
    const uk = u(tk);
    t.push(tk); X.push(x); U.push(uk);
    Y.push(s.C.map((row, i) => row.reduce((a, c, j) => a + c * x[j], 0) + (s.D[i] ?? []).reduce((a, d, j) => a + d * (uk[j] ?? 0), 0)));
    const ukm = u(tk + h / 2);
    const xn = matvec(Phi, x);
    const gu = matvec(Gam, ukm);
    x = xn.map((v, i) => v + gu[i]);
  }
  return { t, x: X, y: Y, u: U };
}

/** Contribución de cada bloque modal a la respuesta libre: x(t) = Σ T_b e^{J_b t} z_b(0). */
export function modalContributions(md: Modal, x0: Vec, t: Vec): { block: ModalBlock; x: Mat }[] {
  if (!md.ok) return [];
  const Ti = inv(md.T)!;
  const z0 = matvec(Ti, x0);
  return md.blocks.map((b) => {
    const idx = Array.from({ length: b.size }, (_, k) => b.start + k);
    const Jb = idx.map((i) => idx.map((j) => md.J[i][j]));
    const zb = idx.map((i) => z0[i]);
    const Tb = md.T.map((r) => idx.map((j) => r[j]));
    const x = t.map((tk) => matvec(Tb, matvec(expm(mscale(Jb, tk)), zb)));
    return { block: b, x };
  });
}

/** Horizonte de simulación sugerido según los polos. */
export function suggestHorizon(eig: C[]): number {
  if (!eig.length) return 5;
  const re = eig.map((z) => z.re);
  const maxRe = Math.max(...re);
  const stableRates = re.filter((r) => r < -1e-9).map((r) => -r);
  const slow = stableRates.length ? Math.min(...stableRates) : 0;
  const maxIm = Math.max(...eig.map((z) => Math.abs(z.im)), 0);
  let T: number;
  if (maxRe > 1e-6) T = Math.min(4 / maxRe, 30);
  else if (slow > 0 && maxRe < -1e-6) T = 5 / slow;
  else T = maxIm > 0 ? (3 * 2 * Math.PI) / maxIm : 10;
  if (maxIm > 0) T = Math.max(T, Math.min((2 * 2 * Math.PI) / maxIm, 60));
  return Math.min(Math.max(T, 0.5), 60);
}

export function eqPoint(s: SS, u: Vec): Vec | null {
  const Ai = inv(s.A);
  if (!Ai) return null;
  return matvec(Ai, matvec(s.B, u)).map((v) => -v);
}

export function taylorExp(A: Mat, t: number, N: number): Mat {
  const n = A.length;
  let S = eye(n), term = eye(n);
  for (let k = 1; k <= N; k++) {
    term = mscale(matmul(term, A), t / k);
    S = S.map((r, i) => r.map((v, j) => v + term[i][j]));
  }
  return S;
}

export { singularValues, rank };

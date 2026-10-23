// Impulse response of Q(D) y = P(D) u, a linear ODE with constant coefficients:
// h(t) = C e^{At} B μ(t) + D δ(t), computed exactly on a grid through the transition matrix.

/** Parses "1 3 2" or "1; 3; 2" (highest power first); decimal comma allowed when separated by spaces or ';'. */
export function parseCoeffs(s: string): number[] | null {
  const parts = s.trim().split(/[\s;]+/).filter(Boolean);
  if (!parts.length) return null;
  const v = parts.map((p) => parseFloat(p.replace(',', '.').replace('−', '-')));
  if (v.some((x) => !Number.isFinite(x))) return null;
  while (v.length > 1 && v[0] === 0) v.shift();
  return v;
}

type C = [number, number];
const cmul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: C, b: C): C => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };

/** Roots of a polynomial (highest power first), Durand–Kerner. */
export function roots(q: number[]): C[] {
  const n = q.length - 1;
  if (n < 1) return [];
  const a = q.map((x) => x / q[0]);
  let z: C[] = Array.from({ length: n }, (_, k) => [Math.cos((2 * Math.PI * k) / n + 0.4) * 0.9, Math.sin((2 * Math.PI * k) / n + 0.4) * 0.9]);
  const R = 1 + Math.max(...a.slice(1).map(Math.abs));
  z = z.map(([x, y]) => [x * R, y * R]);
  for (let it = 0; it < 500; it++) {
    let moved = 0;
    z = z.map((zi, i) => {
      let p: C = [1, 0];
      for (let k = 1; k <= n; k++) p = [p[0] * zi[0] - p[1] * zi[1] + a[k], p[0] * zi[1] + p[1] * zi[0]];
      let den: C = [1, 0];
      z.forEach((zj, j) => { if (j !== i) den = cmul(den, [zi[0] - zj[0], zi[1] - zj[1]]); });
      const d = cdiv(p, den);
      moved = Math.max(moved, Math.hypot(d[0], d[1]));
      return [zi[0] - d[0], zi[1] - d[1]] as C;
    });
    if (moved < 1e-14 * R) break;
  }
  return z;
}

function expm(A: number[][], t: number): number[][] {
  const nrm = Math.max(...A.map((r) => r.reduce((s, v) => s + Math.abs(v * t), 0)));
  const sq = Math.max(0, Math.ceil(Math.log2(nrm)) + 1);
  const h = t / 2 ** sq;
  const mul = (X: number[][], Y: number[][]) => X.map((r, i) => Y[0].map((_, j) => r.reduce((s, _v, k) => s + X[i][k] * Y[k][j], 0)));
  let E: number[][] = A.map((_, i) => A.map((_v, j) => (i === j ? 1 : 0)));
  let term = E.map((r) => [...r]);
  for (let k = 1; k <= 18; k++) {
    term = mul(term, A).map((r) => r.map((v) => (v * h) / k));
    E = E.map((r, i) => r.map((v, j) => v + term[i][j]));
  }
  for (let s = 0; s < sq; s++) E = mul(E, E);
  return E;
}

export interface OdeResponse {
  /** regular part h(t) for t ≥ 0 (0 before) */
  f: (t: number) => number;
  /** coefficient of δ(t) (biproper systems) */
  D: number;
  poles: C[];
  /** time constant of the slowest mode (for sizing the view); Infinity if not asymptotically stable */
  slow: number;
}

/** Returns null when the system is improper (deg P > deg Q) or Q is constant. */
export function impulseResponse(q: number[], p: number[], tMax: number, N = 4000): OdeResponse | null {
  const n = q.length - 1;
  if (n < 1 || p.length - 1 > n) return null;
  const a = q.map((x) => x / q[0]);
  let b = [...Array(n + 1 - p.length).fill(0), ...p.map((x) => x / q[0])];
  const D = b[0];
  b = b.map((x, i) => x - D * a[i]); // strictly proper remainder
  // controllable canonical form: x' = A x + B u, y = C x
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_v, j) => (i < n - 1 ? (j === i + 1 ? 1 : 0) : -a[n - j])));
  const Cv = Array.from({ length: n }, (_, j) => b[n - j]);
  const dt = tMax / N;
  const Phi = expm(A, dt);
  const vals = new Float64Array(N + 1);
  let x: number[] = Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0)); // e^{A·0} B
  for (let k = 0; k <= N; k++) {
    vals[k] = Cv.reduce((s, c, j) => s + c * x[j], 0);
    x = Phi.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));
  }
  const poles = roots(q);
  const maxRe = Math.max(...poles.map((z) => z[0]));
  const minAbsRe = Math.min(...poles.map((z) => Math.abs(z[0])));
  const f = (t: number) => {
    if (t < 0) return 0;
    if (t >= tMax) return vals[N];
    const u = t / dt;
    const i = Math.floor(u);
    return vals[i] + (vals[Math.min(N, i + 1)] - vals[i]) * (u - i);
  };
  return { f, D, poles, slow: maxRe < -1e-9 ? 1 / minAbsRe : Infinity };
}

/** TeX of a polynomial in D (highest power first). */
export function polyTex(c: number[], v = 'D'): string {
  const n = c.length - 1;
  const terms: string[] = [];
  c.forEach((x, i) => {
    if (x === 0) return;
    const k = n - i;
    const mag = Math.abs(x);
    const coef = k > 0 && mag === 1 ? '' : String(+mag.toPrecision(4));
    const pw = k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`;
    terms.push(`${x < 0 ? '-' : terms.length ? '+' : ''} ${coef}${pw}`);
  });
  return terms.join(' ') || '0';
}

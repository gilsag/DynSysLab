// Partial-fraction expansion, inverse Laplace transform and the initial- and final-value theorems.
import { cadd, cdiv, cluster, cmul, divmod, evalC, roots, trim, type Cx, type Poly, type Rational } from './poly';

export interface Cluster {
  p: Cx;
  m: number;
  /** g[k] multiplies 1/(s − p)^(m − k) */
  g: Cx[];
}
export interface Expansion {
  /** polynomial part (impulses): q[0]·δ(t) + q[1]·δ'(t) + … */
  q: Poly;
  clusters: Cluster[];
}

/** Taylor coefficients of p around z: p(z + ε) = Σ c_k ε^k. */
function taylor(p: Poly, z: Cx, n: number): Cx[] {
  let a: Cx[] = p.map((v) => [v, 0] as Cx);
  const out: Cx[] = [];
  for (let k = 0; k < n; k++) {
    if (!a.length) { out.push([0, 0]); continue; }
    // synthetic division by (s − z): remainder is a(z)
    const q: Cx[] = new Array(Math.max(0, a.length - 1)).fill(0).map(() => [0, 0] as Cx);
    let r: Cx = [0, 0];
    for (let i = a.length - 1; i >= 0; i--) {
      r = cadd(cmul(r, z), a[i]);
      if (i > 0) q[i - 1] = r;
    }
    out.push(r);
    a = q;
  }
  return out;
}

export function expand(f: Rational): Expansion {
  const num = trim(f.num, 1e-14), den = trim(f.den, 1e-14);
  const { q, r } = divmod(num, den);
  const lead = den[den.length - 1];
  // a multiple root is found poorly by root finders; refine each cluster with Newton on the (m−1)-th derivative
  const deriv = (c: Poly) => c.slice(1).map((v, k) => v * (k + 1));
  const cl = cluster(roots(den)).map(([p, m]): [Cx, number] => {
    if (m < 2) return [p, m];
    let d: Poly = den;
    for (let k = 0; k < m - 1; k++) d = deriv(d);
    const dd = deriv(d);
    let z = p;
    for (let it = 0; it < 4; it++) {
      const f = evalC(d, z), fp = evalC(dd, z);
      if (Math.hypot(fp[0], fp[1]) < 1e-300) break;
      const step = cdiv(f, fp);
      z = [z[0] - step[0], z[1] - step[1]];
    }
    return [[z[0], Math.abs(z[1]) < 1e-12 ? 0 : z[1]], m];
  });
  const clusters: Cluster[] = cl.map(([p, m]) => {
    // Q(s) = den/(s − p)^m from the other roots
    const others = cl.filter(([o]) => o !== p);
    const Qt = (eps: number): Cx[] => {
      // Taylor coefficients of Π (s − r)^m around p, by multiplying the series of each factor
      let series: Cx[] = [[lead, 0]];
      for (const [o, mo] of others) {
        for (let k = 0; k < mo; k++) {
          const fac: Cx[] = [[p[0] - o[0], p[1] - o[1]], [1, 0]]; // (p − o) + ε
          const next: Cx[] = new Array(Math.min(eps, series.length + 1)).fill(0).map(() => [0, 0] as Cx);
          series.forEach((c, i) => fac.forEach((d, j) => { if (i + j < eps) next[i + j] = cadd(next[i + j], cmul(c, d)); }));
          series = next;
        }
      }
      while (series.length < eps) series.push([0, 0]);
      return series;
    };
    const Nt = taylor(r, p, m);
    const Q = Qt(m);
    const g: Cx[] = [];
    for (let k = 0; k < m; k++) {
      let acc = Nt[k];
      for (let j = 1; j <= k; j++) acc = [acc[0] - cmul(Q[j], g[k - j])[0], acc[1] - cmul(Q[j], g[k - j])[1]];
      g.push(cdiv(acc, Q[0]));
    }
    return { p, m, g };
  });
  return { q: trim(q, 1e-12).every((c) => Math.abs(c) < 1e-12) ? [] : trim(q, 1e-12), clusters };
}

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

/** f(t) for t > 0 (regular part). */
export function timeValue(x: Expansion, t: number): number {
  let y = 0;
  for (const { p, m, g } of x.clusters) {
    const e = Math.exp(p[0] * t);
    const c: Cx = [e * Math.cos(p[1] * t), e * Math.sin(p[1] * t)];
    for (let k = 0; k < m; k++) {
      const j = m - k - 1;
      const w = t ** j / fact(j);
      y += w * cmul(g[k], c)[0];
    }
  }
  return y;
}

/** Value of the expression at t = 0⁺. */
export const atZero = (x: Expansion) => x.clusters.reduce((s, { g, m }) => s + g[m - 1][0], 0);

export type FinalStatus = 'ok' | 'osc' | 'unstable' | 'grows';
export function finalValue(x: Expansion): { status: FinalStatus; value: number } {
  let value = 0;
  for (const { p, m, g } of x.clusters) {
    const re = p[0], im = p[1];
    const atOrigin = Math.abs(re) < 1e-9 && Math.abs(im) < 1e-9;
    if (atOrigin) {
      if (m > 1) return { status: 'grows', value: NaN };
      value += g[0][0];
      continue;
    }
    if (re > 1e-9) return { status: 'unstable', value: NaN };
    if (Math.abs(re) <= 1e-9) return { status: 'osc', value: NaN };
  }
  return { status: 'ok', value };
}

/** lim s→∞ s·F(s); NaN when F is improper (impulses at t = 0). */
export function initialValueTheorem(f: Rational): number {
  const num = trim(f.num, 1e-14), den = trim(f.den, 1e-14);
  const dn = num.length - 1, dd = den.length - 1;
  if (num.every((c) => c === 0)) return 0;
  if (dn >= dd) return NaN;
  if (dn === dd - 1) return num[dn] / den[dd];
  return 0;
}

/** lim s→0 s·F(s) evaluated directly (meaningful only when the final-value theorem applies). */
export function finalValueTheorem(f: Rational): number {
  const s = 1e-9;
  const v = cdiv(cmul([s, 0], evalC(f.num, [s, 0])), evalC(f.den, [s, 0]));
  return v[0];
}

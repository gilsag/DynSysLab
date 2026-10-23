// Polinomios reales con coeficientes en potencias ascendentes: p[0] + p[1] s + ... + p[n] s^n
import { C, cx, cadd, csub, cmul, cdiv, cabs } from './complex';

export type Poly = number[];

export function trimPoly(p: Poly, tol = 0): Poly {
  const q = p.slice();
  const scale = Math.max(...q.map(Math.abs), 0);
  while (q.length > 1 && Math.abs(q[q.length - 1]) <= tol * scale) q.pop();
  return q;
}
export const degree = (p: Poly) => trimPoly(p).length - 1;

export function polyMul(a: Poly, b: Poly): Poly {
  const r = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y)));
  return r;
}
export function polyAdd(a: Poly, b: Poly): Poly {
  const n = Math.max(a.length, b.length);
  return Array.from({ length: n }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0));
}
export const polyScale = (a: Poly, s: number): Poly => a.map((x) => x * s);

export function polyEvalC(p: Poly, s: C): C {
  let r = cx(0);
  for (let k = p.length - 1; k >= 0; k--) r = cadd(cmul(r, s), cx(p[k]));
  return r;
}
function polyEvalCC(p: C[], s: C): C {
  let r = cx(0);
  for (let k = p.length - 1; k >= 0; k--) r = cadd(cmul(r, s), p[k]);
  return r;
}

/** Polinomio mónico real con las raíces dadas (se incluyen conjugadas explícitamente en la lista). */
export function polyFromRoots(roots: C[]): Poly {
  let p: C[] = [cx(1)];
  for (const r of roots) {
    const q: C[] = new Array(p.length + 1).fill(0).map(() => cx(0));
    for (let i = 0; i < p.length; i++) {
      q[i + 1] = cadd(q[i + 1], p[i]);
      q[i] = csub(q[i], cmul(p[i], r));
    }
    p = q;
  }
  return p.map((c) => c.re);
}

/** Raíces por Aberth–Ehrlich con pulido de Newton. */
export function polyRoots(pIn: Poly): C[] {
  const p = trimPoly(pIn, 1e-14);
  const n = p.length - 1;
  if (n < 1) return [];
  const lead = p[n];
  const a = p.map((x) => x / lead);
  // raíces en cero
  let z0 = 0;
  while (z0 < n && a[z0] === 0) z0++;
  const q = a.slice(z0);
  const m = q.length - 1;
  const roots: C[] = Array.from({ length: z0 }, () => cx(0));
  if (m === 0) return roots;
  if (m === 1) return [...roots, cx(-q[0] / q[1])];
  if (m === 2) {
    const [c0, c1] = q;
    const disc = c1 * c1 - 4 * c0;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const r1 = c1 >= 0 ? (-c1 - sq) / 2 : (-c1 + sq) / 2;
      const r2 = r1 !== 0 ? c0 / r1 : -c1 - r1;
      return [...roots, cx(r1), cx(r2)];
    }
    const sq = Math.sqrt(-disc) / 2;
    return [...roots, cx(-c1 / 2, sq), cx(-c1 / 2, -sq)];
  }
  const dq = q.slice(1).map((c, k) => c * (k + 1));
  const qc = q.map((x) => cx(x)), dqc = dq.map((x) => cx(x));
  const R = 1 + Math.max(...q.slice(0, m).map(Math.abs));
  let z: C[] = Array.from({ length: m }, (_, k) => {
    const th = (2 * Math.PI * k) / m + 0.4;
    return cx(0.5 * R * Math.cos(th), 0.5 * R * Math.sin(th));
  });
  for (let it = 0; it < 500; it++) {
    let maxStep = 0;
    const nz = z.slice();
    for (let k = 0; k < m; k++) {
      const ratio = cdiv(polyEvalCC(qc, z[k]), polyEvalCC(dqc, z[k]));
      let sum = cx(0);
      for (let j = 0; j < m; j++) if (j !== k) sum = cadd(sum, cdiv(cx(1), csub(z[k], z[j])));
      const w = cdiv(ratio, csub(cx(1), cmul(ratio, sum)));
      if (!isFinite(w.re) || !isFinite(w.im)) continue;
      nz[k] = csub(z[k], w);
      maxStep = Math.max(maxStep, cabs(w) / (1 + cabs(z[k])));
    }
    z = nz;
    if (maxStep < 1e-15) break;
  }
  return [...roots, ...z];
}

/** Limpia partes imaginarias pequeñas y agrupa raíces casi repetidas (promediando cada grupo). */
const deriv = (p: Poly): Poly => p.slice(1).map((c, k) => c * (k + 1));

/** Pule una raíz de multiplicidad m con Newton sobre p^{(m-1)}. */
function polishMultiple(p: Poly, z: C, m: number): C {
  let q = p;
  for (let k = 1; k < m; k++) q = deriv(q);
  const dq = deriv(q);
  let x = z;
  for (let it = 0; it < 30; it++) {
    const f = polyEvalC(q, x), df = polyEvalC(dq, x);
    if (cabs(df) === 0) break;
    const step = cdiv(f, df);
    if (!isFinite(step.re) || !isFinite(step.im)) break;
    const xn = csub(x, step);
    if (cabs(csub(xn, z)) > 1e-3 * (1 + cabs(z))) break; // no alejarse del grupo
    x = xn;
    if (cabs(step) < 1e-16 * (1 + cabs(x))) break;
  }
  return x;
}

export function cleanRoots(r: C[], tol = 1e-6, p?: Poly): C[] {
  const out = r.slice();
  // agrupamiento
  const used = new Array(out.length).fill(false);
  const res: C[] = new Array(out.length);
  for (let i = 0; i < out.length; i++) {
    if (used[i]) continue;
    const grp = [i];
    used[i] = true;
    for (let j = i + 1; j < out.length; j++) {
      if (!used[j] && cabs(csub(out[i], out[j])) <= 5e-5 * (1 + cabs(out[i]))){ grp.push(j); used[j] = true; }
    }
    let s = cx(0);
    grp.forEach((g) => (s = cadd(s, out[g])));
    let avg = cx(s.re / grp.length, s.im / grp.length);
    if (p && grp.length > 1) avg = polishMultiple(p, avg, grp.length);
    if (Math.abs(avg.im) <= tol * (1 + Math.abs(avg.re))) avg = cx(avg.re);
    grp.forEach((g) => (res[g] = avg));
  }
  // simetría conjugada exacta
  for (let i = 0; i < res.length; i++) {
    if (res[i].im > 0) {
      let bj = -1, bd = Infinity;
      for (let j = 0; j < res.length; j++) if (res[j].im < 0) {
        const d = Math.abs(res[j].re - res[i].re) + Math.abs(res[j].im + res[i].im);
        if (d < bd) { bd = d; bj = j; }
      }
      if (bj >= 0 && bd < 1e-6 * (1 + cabs(res[i]))) {
        const re = (res[i].re + res[bj].re) / 2, im = (res[i].im - res[bj].im) / 2;
        res[i] = cx(re, im); res[bj] = cx(re, -im);
      }
    }
  }
  return res.sort((a, b) => b.re - a.re || b.im - a.im);
}

/** Agrupa raíces iguales: [{value, mult}] (sólo im ≥ 0 si onlyUpper). */
export function clusterRoots(r: C[], tol = 1e-7): { value: C; mult: number }[] {
  const out: { value: C; mult: number }[] = [];
  for (const z of r) {
    const g = out.find((o) => cabs(csub(o.value, z)) <= tol * (1 + cabs(z)));
    if (g) g.mult++;
    else out.push({ value: z, mult: 1 });
  }
  return out;
}

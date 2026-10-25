// Polynomials in s with real coefficients (ascending order: p[k] multiplies s^k) and complex helpers.

export type Poly = number[];
export type Cx = [number, number];

export const cadd = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]];
export const csub = (a: Cx, b: Cx): Cx => [a[0] - b[0], a[1] - b[1]];
export const cmul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const cdiv = (a: Cx, b: Cx): Cx => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
export const cabs = (a: Cx) => Math.hypot(a[0], a[1]);

export function trim(p: Poly, tol = 0): Poly {
  const q = [...p];
  const scale = Math.max(1e-300, ...q.map(Math.abs));
  while (q.length > 1 && Math.abs(q[q.length - 1]) <= tol * scale) q.pop();
  return q.length ? q : [0];
}
export const deg = (p: Poly) => trim(p).length - 1;
export const isZero = (p: Poly) => p.every((c) => c === 0);
export function add(a: Poly, b: Poly): Poly {
  const n = Math.max(a.length, b.length);
  return Array.from({ length: n }, (_, k) => (a[k] ?? 0) + (b[k] ?? 0));
}
export const scale = (a: Poly, k: number): Poly => a.map((c) => c * k);
export const sub = (a: Poly, b: Poly) => add(a, scale(b, -1));
export function mul(a: Poly, b: Poly): Poly {
  const r = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y)));
  return r;
}
export const evalC = (p: Poly, z: Cx): Cx => {
  let r: Cx = [0, 0];
  for (let k = p.length - 1; k >= 0; k--) r = cadd(cmul(r, z), [p[k], 0]);
  return r;
};
export const evalR = (p: Poly, x: number) => p.reduceRight((r, c) => r * x + c, 0);
/** Product of (s − r) over complex roots given in conjugate pairs; returns real coefficients. */
export function fromRoots(roots: Cx[], lead = 1): Poly {
  let p: Cx[] = [[1, 0]];
  for (const r of roots) {
    const q: Cx[] = new Array(p.length + 1).fill(0).map(() => [0, 0] as Cx);
    p.forEach((c, k) => {
      q[k + 1] = cadd(q[k + 1], c);
      q[k] = csub(q[k], cmul(c, r));
    });
    p = q;
  }
  return p.map((c) => c[0] * lead);
}

/** Roots by Durand–Kerner, polished with Newton, conjugates made exact. */
export function roots(p0: Poly): Cx[] {
  let p = trim(p0, 1e-14);
  // exact roots at the origin
  let zeros = 0;
  while (p.length > 1 && p[0] === 0) {
    p = p.slice(1);
    zeros++;
  }
  const out: Cx[] = Array.from({ length: zeros }, () => [0, 0] as Cx);
  const n = p.length - 1;
  if (n < 1) return out;
  const a = p.map((c) => c / p[n]);
  const R = 1 + Math.max(...a.slice(0, n).map(Math.abs));
  let z: Cx[] = Array.from({ length: n }, (_, k) => [R * 0.8 * Math.cos((2 * Math.PI * k) / n + 0.4), R * 0.8 * Math.sin((2 * Math.PI * k) / n + 0.4)]);
  for (let it = 0; it < 800; it++) {
    let moved = 0;
    z = z.map((zi, i) => {
      const num = evalC(a, zi);
      let den: Cx = [1, 0];
      z.forEach((zj, j) => {
        if (j !== i) den = cmul(den, csub(zi, zj));
      });
      if (cabs(den) === 0) den = [1e-12, 0];
      const d = cdiv(num, den);
      moved = Math.max(moved, cabs(d));
      return csub(zi, d);
    });
    if (moved < 1e-15 * R) break;
  }
  // Newton polish on the original polynomial
  const dp = a.slice(1).map((c, k) => c * (k + 1));
  z = z.map((zi) => {
    let x = zi;
    for (let k = 0; k < 3; k++) {
      const d = evalC(dp, x);
      if (cabs(d) < 1e-14) break;
      x = csub(x, cdiv(evalC(a, x), d));
    }
    return Number.isFinite(x[0]) && Number.isFinite(x[1]) ? x : zi;
  });
  const scaleR = Math.max(1, ...z.map(cabs));
  z = z.map(([re, im]) => [re, Math.abs(im) < 1e-9 * scaleR ? 0 : im]);
  // make conjugate pairs exact
  const used = new Array(z.length).fill(false);
  for (let i = 0; i < z.length; i++) {
    if (used[i] || z[i][1] === 0) continue;
    let best = -1, bd = Infinity;
    for (let j = 0; j < z.length; j++) {
      if (j === i || used[j]) continue;
      const d = cabs(csub(z[j], [z[i][0], -z[i][1]]));
      if (d < bd) { bd = d; best = j; }
    }
    if (best >= 0) {
      const re = (z[i][0] + z[best][0]) / 2, im = (Math.abs(z[i][1]) + Math.abs(z[best][1])) / 2;
      z[i] = [re, im];
      z[best] = [re, -im];
      used[i] = used[best] = true;
    }
  }
  return [...out, ...z];
}

/** Groups nearly equal roots: [root, multiplicity]. */
export function cluster(rs: Cx[], tol = 2e-5): [Cx, number][] {
  const out: [Cx, number, Cx[]][] = [];
  for (const r of rs) {
    const hit = out.find(([c]) => cabs(csub(c, r)) <= tol * Math.max(1, cabs(r)));
    if (hit) {
      hit[2].push(r);
      hit[1]++;
      hit[0] = [hit[2].reduce((s, q) => s + q[0], 0) / hit[2].length, hit[2].reduce((s, q) => s + q[1], 0) / hit[2].length];
    } else out.push([r, 1, [r]]);
  }
  return out.map(([c, m]) => [[c[0], Math.abs(c[1]) < 1e-12 ? 0 : c[1]], m]);
}

export interface Rational {
  num: Poly;
  den: Poly;
}

/** Cancels common roots of numerator and denominator; the denominator is made monic. */
export function reduce(f: Rational, tol = 1e-6): Rational & { cancelled: Cx[] } {
  let num = trim(f.num, 1e-13), den = trim(f.den, 1e-13);
  if (isZero(num)) return { num: [0], den: [1], cancelled: [] };
  // common powers of s, exactly
  while (num.length > 1 && den.length > 1 && num[0] === 0 && den[0] === 0) {
    num = num.slice(1);
    den = den.slice(1);
  }
  const ln = num[num.length - 1], ld = den[den.length - 1];
  const rn = roots(num), rd = roots(den);
  const cancelled: Cx[] = [];
  const keepN: Cx[] = [];
  const usedD = new Array(rd.length).fill(false);
  for (const r of rn) {
    let best = -1, bd = Infinity;
    rd.forEach((q, j) => {
      if (usedD[j]) return;
      const d = cabs(csub(q, r));
      if (d < bd) { bd = d; best = j; }
    });
    if (best >= 0 && bd <= tol * Math.max(1, cabs(rd[best]))) {
      usedD[best] = true;
      cancelled.push(rd[best]);
    } else keepN.push(r);
  }
  if (!cancelled.length) return { num: scale(num, 1 / ld), den: scale(den, 1 / ld), cancelled };
  const keepD = rd.filter((_, j) => !usedD[j]);
  return { num: fromRoots(keepN, ln / ld), den: fromRoots(keepD, 1), cancelled };
}

/** Polynomial division a = q·b + r. */
export function divmod(a: Poly, b: Poly): { q: Poly; r: Poly } {
  const A = trim(a), B = trim(b);
  const db = B.length - 1;
  if (A.length - 1 < db) return { q: [0], r: A };
  const r = [...A];
  const q = new Array(A.length - db).fill(0);
  for (let k = A.length - 1; k >= db; k--) {
    const c = r[k] / B[db];
    q[k - db] = c;
    for (let j = 0; j <= db; j++) r[k - db + j] -= c * B[j];
  }
  return { q, r: trim(r.slice(0, db).length ? r.slice(0, db) : [0]) };
}

/** Determinant of a matrix of polynomials (Laplace expansion; meant for small sizes). */
export function polyDet(M: Poly[][]): Poly {
  const n = M.length;
  if (n === 0) return [1];
  if (n === 1) return M[0][0];
  let r: Poly = [0];
  for (let j = 0; j < n; j++) {
    if (M[0][j].every((c) => c === 0)) continue;
    const minor = M.slice(1).map((row) => row.filter((_, k) => k !== j));
    const term = mul(M[0][j], polyDet(minor));
    r = add(r, j % 2 ? scale(term, -1) : term);
  }
  return r;
}

// ---------- rational arithmetic ----------
export const rat = (num: Poly, den: Poly = [1]): Rational => ({ num, den });
export const rmul = (a: Rational, b: Rational): Rational => ({ num: mul(a.num, b.num), den: mul(a.den, b.den) });
export const radd = (a: Rational, b: Rational): Rational => ({ num: add(mul(a.num, b.den), mul(b.num, a.den)), den: mul(a.den, b.den) });
/** G/(1 ± G·H): sign −1 for negative feedback. */
export const feedback = (G: Rational, H: Rational, sign: 1 | -1 = -1): Rational => ({
  num: mul(G.num, H.den),
  den: sign < 0 ? add(mul(G.den, H.den), mul(G.num, H.num)) : sub(mul(G.den, H.den), mul(G.num, H.num)),
});

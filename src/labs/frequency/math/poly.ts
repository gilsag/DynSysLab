import type { Complex } from './types';

/** Polynomials are stored with ascending powers: c[0] + c[1] s + c[2] s^2 + ... */

/** Real polynomial with the given (conjugate-closed) roots, monic. */
export function polyFromRoots(roots: Complex[]): number[] {
  let re = [1];
  let im = [0];
  for (const r of roots) {
    const nre = new Array(re.length + 1).fill(0);
    const nim = new Array(re.length + 1).fill(0);
    for (let k = 0; k < re.length; k++) {
      // multiply by (s - r)
      nre[k + 1] += re[k];
      nim[k + 1] += im[k];
      nre[k] += -(r.re * re[k] - r.im * im[k]);
      nim[k] += -(r.re * im[k] + r.im * re[k]);
    }
    re = nre;
    im = nim;
  }
  return re;
}

export function polyAdd(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}

export function polyScale(a: number[], k: number): number[] {
  return a.map((c) => c * k);
}

/** Roots of a real polynomial (ascending coefficients) using the Aberth–Ehrlich method. */
export function polyRoots(coeffs: number[]): Complex[] {
  const c = coeffs.slice();
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-300) c.pop();
  const n = c.length - 1;
  if (n < 1) return [];
  // roots at the origin
  let zerosAtOrigin = 0;
  while (c.length > 1 && c[0] === 0) {
    c.shift();
    zerosAtOrigin++;
  }
  const deg = c.length - 1;
  const out: Complex[] = [];
  for (let i = 0; i < zerosAtOrigin; i++) out.push({ re: 0, im: 0 });
  if (deg === 0) return out;
  const lead = c[deg];
  const a = c.map((x) => x / lead); // monic
  if (deg === 1) {
    out.push({ re: -a[0], im: 0 });
    return out;
  }
  if (deg === 2) {
    const b = a[1];
    const cc = a[0];
    const disc = b * b - 4 * cc;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const r1 = (-b - Math.sign(b || 1) * sq) / 2;
      const r2 = r1 !== 0 ? cc / r1 : -b - r1;
      out.push({ re: r1, im: 0 }, { re: r2, im: 0 });
    } else {
      const sq = Math.sqrt(-disc) / 2;
      out.push({ re: -b / 2, im: sq }, { re: -b / 2, im: -sq });
    }
    return out;
  }
  // Cauchy-type bound for initial radius
  let radius = 0;
  for (let k = 0; k < deg; k++) radius = Math.max(radius, Math.abs(a[k]));
  radius = Math.min(1 + radius, Math.pow(Math.abs(a[0]) || 1, 1 / deg) * 2 + 1);
  const zr: number[] = [];
  const zi: number[] = [];
  for (let k = 0; k < deg; k++) {
    const ang = (2 * Math.PI * k) / deg + 0.4;
    zr.push(radius * Math.cos(ang));
    zi.push(radius * Math.sin(ang));
  }
  const evalP = (xr: number, xi: number) => {
    // Horner for p and p'
    let pr = 1;
    let pi = 0;
    let dr = 0;
    let di = 0;
    for (let k = deg - 1; k >= 0; k--) {
      // d = d*x + p
      const ndr = dr * xr - di * xi + pr;
      const ndi = dr * xi + di * xr + pi;
      dr = ndr;
      di = ndi;
      // p = p*x + a_k
      const npr = pr * xr - pi * xi + a[k];
      const npi = pr * xi + pi * xr;
      pr = npr;
      pi = npi;
    }
    return [pr, pi, dr, di];
  };
  for (let iter = 0; iter < 500; iter++) {
    let maxStep = 0;
    for (let k = 0; k < deg; k++) {
      const [pr, pi, dr, di] = evalP(zr[k], zi[k]);
      // ratio = p/p'
      const dd = dr * dr + di * di || 1e-300;
      const rr = (pr * dr + pi * di) / dd;
      const ri = (pi * dr - pr * di) / dd;
      // sum 1/(z_k - z_j)
      let sr = 0;
      let si = 0;
      for (let j = 0; j < deg; j++) {
        if (j === k) continue;
        const xr = zr[k] - zr[j];
        const xi = zi[k] - zi[j];
        const d2 = xr * xr + xi * xi || 1e-300;
        sr += xr / d2;
        si += -xi / d2;
      }
      // w = ratio / (1 - ratio*sum)
      const den_r = 1 - (rr * sr - ri * si);
      const den_i = -(rr * si + ri * sr);
      const d2 = den_r * den_r + den_i * den_i || 1e-300;
      const wr = (rr * den_r + ri * den_i) / d2;
      const wi = (ri * den_r - rr * den_i) / d2;
      zr[k] -= wr;
      zi[k] -= wi;
      const step = Math.hypot(wr, wi) / (1 + Math.hypot(zr[k], zi[k]));
      if (step > maxStep) maxStep = step;
    }
    if (maxStep < 1e-14) break;
  }
  for (let k = 0; k < deg; k++) {
    const scale = 1 + Math.hypot(zr[k], zi[k]);
    out.push({ re: zr[k], im: Math.abs(zi[k]) < 1e-9 * scale ? 0 : zi[k] });
  }
  return out;
}

import type { Complex, Root, SystemDef } from './types';
import { polyFromRoots, polyAdd, polyScale, polyRoots } from './poly';

export const RAD2DEG = 180 / Math.PI;
const isOrigin = (r: Root) => r.re === 0 && r.im === 0;

export function gainValue(sys: SystemDef) {
  return (sys.gainNeg ? -1 : 1) * Math.pow(10, sys.gainDb / 20);
}

/** Expanded list of roots (conjugates included). */
export function expand(roots: Root[], kind: 'pole' | 'zero'): Complex[] {
  const out: Complex[] = [];
  for (const r of roots) {
    if (r.kind !== kind) continue;
    out.push({ re: r.re, im: r.im });
    if (r.im > 0) out.push({ re: r.re, im: -r.im });
  }
  return out;
}

/** Π(-r) over nonzero roots of the given kind (real number since roots come in conjugate pairs). */
function prodNeg(roots: Root[], kind: 'pole' | 'zero') {
  let p = 1;
  for (const r of roots) {
    if (r.kind !== kind || isOrigin(r)) continue;
    p *= r.im > 0 ? r.re * r.re + r.im * r.im : -r.re;
  }
  return p;
}

/** Gains in both forms: kb (Bode form) and kl (leading-coefficient / root-locus form). */
export function gains(sys: SystemDef) {
  const g = gainValue(sys);
  const pz = prodNeg(sys.roots, 'zero');
  const pp = prodNeg(sys.roots, 'pole');
  if (sys.gainMode === 'bode') return { kb: g, kl: (g * pp) / pz };
  return { kb: (g * pz) / pp, kl: g };
}

export interface Factor {
  key: string;
  type: 'gain' | 'origin' | 'real' | 'pair' | 'delay';
  kind: 'pole' | 'zero' | null;
  root?: Root;
  wc?: number; // corner frequency (rad/s)
  zeta?: number;
  mag: (w: number) => number; // dB
  ph: (w: number) => number; // deg
  amag: (w: number) => number; // asymptotic dB
  aph: (w: number) => number; // asymptotic deg
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function factorsOf(sys: SystemDef): Factor[] {
  const { kb } = gains(sys);
  const out: Factor[] = [];
  const gdb = 20 * Math.log10(Math.abs(kb));
  const gph = kb < 0 ? -180 : 0;
  out.push({
    key: 'gain',
    type: 'gain',
    kind: null,
    mag: () => gdb,
    ph: () => gph,
    amag: () => gdb,
    aph: () => gph,
  });
  for (const r of sys.roots) {
    const sgn = r.kind === 'zero' ? 1 : -1;
    if (isOrigin(r)) {
      out.push({
        key: r.id,
        type: 'origin',
        kind: r.kind,
        root: r,
        mag: (w) => sgn * 20 * Math.log10(w),
        ph: () => sgn * 90,
        amag: (w) => sgn * 20 * Math.log10(w),
        aph: () => sgn * 90,
      });
    } else if (r.im === 0) {
      const a = r.re; // factor (1 - s/a)
      const wc = Math.abs(a);
      const lhp = a < 0;
      out.push({
        key: r.id,
        type: 'real',
        kind: r.kind,
        root: r,
        wc,
        mag: (w) => sgn * 10 * Math.log10(1 + (w / wc) ** 2),
        ph: (w) => sgn * Math.atan2(-w / a, 1) * RAD2DEG,
        amag: (w) => (w <= wc ? 0 : sgn * 20 * Math.log10(w / wc)),
        aph: (w) => sgn * (lhp ? 1 : -1) * 45 * (clamp(Math.log10(w / wc), -1, 1) + 1),
      });
    } else {
      const wn = Math.hypot(r.re, r.im);
      const zeta = -r.re / wn; // negative for RHP
      const lhp = r.re < 0;
      const az = Math.abs(zeta);
      out.push({
        key: r.id,
        type: 'pair',
        kind: r.kind,
        root: r,
        wc: wn,
        zeta,
        mag: (w) => {
          const x = w / wn;
          const re = 1 - x * x;
          const im = 2 * zeta * x;
          return sgn * 10 * Math.log10(re * re + im * im || 1e-300);
        },
        ph: (w) => {
          const x = w / wn;
          const re = 1 - x * x;
          let im = 2 * zeta * x;
          if (im === 0) im = 0; // normalise -0
          return sgn * Math.atan2(im, re) * RAD2DEG;
        },
        amag: (w) => (w <= wn ? 0 : sgn * 40 * Math.log10(w / wn)),
        aph: (w) => {
          const width = Math.max(az, 1e-4);
          const f = clamp((Math.log10(w / wn) + width) / (2 * width), 0, 1);
          return sgn * (lhp || r.re === 0 ? 1 : -1) * 180 * f;
        },
      });
    }
  }
  if (sys.delay > 0) {
    const T = sys.delay;
    out.push({
      key: 'delay',
      type: 'delay',
      kind: null,
      mag: () => 0,
      ph: (w) => -w * T * RAD2DEG,
      amag: () => 0,
      aph: (w) => -w * T * RAD2DEG,
    });
  }
  return out;
}

export interface BodeData {
  w: number[];
  mag: number[];
  ph: number[];
  amag: number[];
  aph: number[];
}

export function logspace(lo: number, hi: number, n: number) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.pow(10, lo + ((hi - lo) * i) / (n - 1)));
  return out;
}

export function bode(factors: Factor[], w: number[]): BodeData {
  const mag = w.map((x) => factors.reduce((s, f) => s + f.mag(x), 0));
  const ph = w.map((x) => factors.reduce((s, f) => s + f.ph(x), 0));
  const amag = w.map((x) => factors.reduce((s, f) => s + f.amag(x), 0));
  const aph = w.map((x) => factors.reduce((s, f) => s + f.aph(x), 0));
  return { w, mag, ph, amag, aph };
}

export function evalAt(factors: Factor[], w: number) {
  return {
    mag: factors.reduce((s, f) => s + f.mag(w), 0),
    ph: factors.reduce((s, f) => s + f.ph(w), 0),
  };
}

/** Suggested frequency range in decades [lo, hi] from the corner frequencies. */
export function autoRange(sys: SystemDef): [number, number] {
  const ws: number[] = [];
  for (const r of sys.roots) {
    const m = Math.hypot(r.re, r.im);
    if (m > 0) ws.push(m);
  }
  if (sys.delay > 0) ws.push(1 / sys.delay);
  if (!ws.length) return [-2, 2];
  const lo = Math.floor(Math.log10(Math.min(...ws))) - 2;
  const hi = Math.ceil(Math.log10(Math.max(...ws))) + 2;
  return [Math.max(lo, -6), Math.min(Math.max(hi, lo + 3), 7)];
}

export interface Margins {
  wgc: number[]; // gain crossover frequencies
  wpc: number[]; // phase crossover frequencies
  pm: number | null; // most critical phase margin (deg)
  pmW: number | null;
  gm: number | null; // most critical gain margin (dB)
  gmW: number | null;
}

/** Gain/phase margins from a dense sweep. */
export function margins(factors: Factor[], lo: number, hi: number): Margins {
  const w = logspace(lo - 1, hi + 1, 4000);
  const b = bode(factors, w);
  const wgc: number[] = [];
  const wpc: number[] = [];
  let pm: number | null = null;
  let pmW: number | null = null;
  let gm: number | null = null;
  let gmW: number | null = null;
  const lerpW = (i: number, t: number) => Math.pow(10, Math.log10(w[i]) + t * (Math.log10(w[i + 1]) - Math.log10(w[i])));
  const EPS = 1e-6; // dB: ignore curves that merely graze 0 dB (e.g. biproper systems with |H(∞)| = 1)
  let lastSign = 0;
  let lastIdx = -1;
  for (let i = 0; i < w.length - 1; i++) {
    const m0 = b.mag[i];
    const m1 = b.mag[i + 1];
    const s1 = m1 > EPS ? 1 : m1 < -EPS ? -1 : 0;
    if (lastSign === 0 && isFinite(m0)) {
      lastSign = m0 > EPS ? 1 : m0 < -EPS ? -1 : 0;
      lastIdx = i;
    }
    const crossed = isFinite(m0) && isFinite(m1) && s1 !== 0 && lastSign !== 0 && s1 !== lastSign && lastIdx >= i - 1;
    if (s1 !== 0) {
      lastSign = s1;
      lastIdx = i + 1;
    }
    if (crossed) {
      const t = m0 / (m0 - m1);
      const wc = lerpW(i, t);
      const phc = b.ph[i] + t * (b.ph[i + 1] - b.ph[i]);
      let m = ((((phc + 180) % 360) + 540) % 360) - 180; // wrap to (-180,180]
      if (m === -180) m = 180;
      wgc.push(wc);
      if (pm === null || m < pm) {
        pm = m;
        pmW = wc;
      }
    }
    const p0 = b.ph[i];
    const p1 = b.ph[i + 1];
    if (Math.abs(p1 - p0) > 170) continue; // genuine jump (pure imaginary root), skip
    const k0 = Math.floor((p0 + 180) / 360);
    const k1 = Math.floor((p1 + 180) / 360);
    if (k0 !== k1) {
      const target = -180 + 360 * Math.max(k0, k1);
      const t = (target - p0) / (p1 - p0);
      if (t >= 0 && t <= 1) {
        const wc = lerpW(i, t);
        const mc = m0 + t * (m1 - m0);
        wpc.push(wc);
        const g = -mc;
        if (gm === null || g < gm) {
          gm = g;
          gmW = wc;
        }
      }
    }
  }
  return { wgc, wpc, pm, pmW, gm, gmW };
}

/** Numerator/denominator polynomials (ascending) of the rational part, using the leading-coefficient gain. */
export function polys(sys: SystemDef) {
  const { kl } = gains(sys);
  const num = polyScale(polyFromRoots(expand(sys.roots, 'zero')), kl);
  const den = polyFromRoots(expand(sys.roots, 'pole'));
  return { num, den };
}

/** Closed-loop poles under unity negative feedback with extra loop gain k (delay ignored). */
export function closedLoopPoles(sys: SystemDef, k = 1): Complex[] {
  const { num, den } = polys(sys);
  return polyRoots(polyAdd(den, polyScale(num, k)));
}

/** Root-locus points: closed-loop poles of den + k·num, k swept over many decades around a reference gain. */
export function rootLocus(sys: SystemDef): Complex[] {
  const { kl } = gains(sys);
  const num = polyFromRoots(expand(sys.roots, 'zero'));
  const den = polyFromRoots(expand(sys.roots, 'pole'));
  if (den.length <= 1) return [];
  // reference gain: makes |k·num/den| = 1 at the geometric-mean corner frequency
  const mags = sys.roots.map((r) => Math.hypot(r.re, r.im)).filter((m) => m > 0);
  const w0 = mags.length ? Math.exp(mags.reduce((s, m) => s + Math.log(m), 0) / mags.length) : 1;
  const evalAbs = (c: number[]) => {
    let re = 0;
    let im = 0;
    for (let k = c.length - 1; k >= 0; k--) {
      const nre = re * 0 - im * w0 + c[k];
      const nim = re * w0 + im * 0;
      re = nre;
      im = nim;
    }
    return Math.hypot(re, im);
  };
  const kref = evalAbs(den) / (evalAbs(num) || 1);
  const sign = kl < 0 ? -1 : 1;
  const pts: Complex[] = [];
  const N = 400;
  for (let i = 0; i < N; i++) {
    const k = sign * kref * Math.pow(10, -5 + (10 * i) / (N - 1));
    pts.push(...polyRoots(polyAdd(den, polyScale(num, k))));
  }
  return pts;
}

export function isProper(sys: SystemDef) {
  const nz = expand(sys.roots, 'zero').length;
  const np = expand(sys.roots, 'pole').length;
  return nz <= np;
}

export function counts(sys: SystemDef) {
  return {
    nz: expand(sys.roots, 'zero').length,
    np: expand(sys.roots, 'pole').length,
    z0: sys.roots.filter((r) => r.kind === 'zero' && isOrigin(r)).length,
    p0: sys.roots.filter((r) => r.kind === 'pole' && isOrigin(r)).length,
    rhpZ: sys.roots.filter((r) => r.kind === 'zero' && r.re > 0).length,
    rhpP: sys.roots.filter((r) => r.kind === 'pole' && r.re > 0).length,
    imP: sys.roots.filter((r) => r.kind === 'pole' && r.re === 0 && r.im > 0).length,
  };
}

/** Points of H(jω) for ω on a log grid (positive frequencies). */
export function nyquistPoints(factors: Factor[], lo: number, hi: number, n = 1500) {
  const w = logspace(lo, hi, n);
  return w.map((x) => {
    const { mag, ph } = evalAt(factors, x);
    const r = Math.pow(10, mag / 20);
    const a = (ph * Math.PI) / 180;
    return { w: x, re: r * Math.cos(a), im: r * Math.sin(a) };
  });
}

/**
 * Clockwise encirclements of −1 by H(jω), ω: −∞ → +∞.
 * Returns null when the contour needs an indentation (poles on the imaginary axis).
 */
export function encirclements(sys: SystemDef, factors: Factor[], lo: number, hi: number): number | null {
  if (sys.roots.some((r) => r.kind === 'pole' && r.re === 0)) return null;
  const pts = nyquistPoints(factors, lo - 3, hi + 3, 6000);
  const path = [...pts.slice().reverse().map((p) => ({ re: p.re, im: -p.im })), ...pts];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a0 = Math.atan2(path[i - 1].im, path[i - 1].re + 1);
    const a1 = Math.atan2(path[i].im, path[i].re + 1);
    let d = a1 - a0;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    total += d;
  }
  // close the contour (large semicircle maps to a single point for proper systems)
  const a0 = Math.atan2(path[path.length - 1].im, path[path.length - 1].re + 1);
  const a1 = Math.atan2(path[0].im, path[0].re + 1);
  let d = a1 - a0;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  total += d;
  return -Math.round(total / (2 * Math.PI));
}

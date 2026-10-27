// Canonical second-order system H(s) = ωn² / (s² + 2ζωn s + ωn²): poles, time responses, specifications.

export interface Poles {
  /** p1 = p2* when underdamped; both real (p1 ≥ p2) otherwise */
  p1: [number, number];
  p2: [number, number];
  kind: 'undamped' | 'under' | 'critical' | 'over';
}

const EPS = 1e-9;

export function poles(z: number, wn: number): Poles {
  if (z < EPS) return { p1: [0, wn], p2: [0, -wn], kind: 'undamped' };
  if (z < 1 - EPS) {
    const wd = wn * Math.sqrt(1 - z * z);
    return { p1: [-z * wn, wd], p2: [-z * wn, -wd], kind: 'under' };
  }
  if (z <= 1 + EPS) return { p1: [-wn, 0], p2: [-wn, 0], kind: 'critical' };
  const r = Math.sqrt(z * z - 1);
  return { p1: [-wn * (z - r), 0], p2: [-wn * (z + r), 0], kind: 'over' };
}

/** ζ and ωn from the two poles (a conjugate pair or two real poles). */
export function fromPoles(a: [number, number], b: [number, number]): { z: number; wn: number } {
  // s² − (a + b) s + a·b
  const sum = a[0] + b[0];
  const prod = a[0] * b[0] - a[1] * b[1];
  const wn = Math.sqrt(Math.max(prod, 1e-12));
  return { z: Math.max(0, -sum / (2 * wn)), wn };
}

/** Unit-step response y(t). */
export function step(z: number, wn: number, t: number): number {
  if (t < 0) return 0;
  const p = poles(z, wn);
  if (p.kind === 'undamped') return 1 - Math.cos(wn * t);
  if (p.kind === 'under') {
    const wd = p.p1[1];
    const th = Math.acos(z);
    return 1 - (Math.exp(-z * wn * t) / Math.sqrt(1 - z * z)) * Math.sin(wd * t + th);
  }
  if (p.kind === 'critical') return 1 - Math.exp(-wn * t) * (1 + wn * t);
  const a = p.p1[0], b = p.p2[0];
  return 1 + (b * Math.exp(a * t) - a * Math.exp(b * t)) / (a - b);
}

/** Impulse response h(t) = dy/dt. */
export function impulse(z: number, wn: number, t: number): number {
  if (t < 0) return 0;
  const p = poles(z, wn);
  if (p.kind === 'undamped') return wn * Math.sin(wn * t);
  if (p.kind === 'under') {
    const wd = p.p1[1];
    return ((wn * wn) / wd) * Math.exp(-z * wn * t) * Math.sin(wd * t);
  }
  if (p.kind === 'critical') return wn * wn * t * Math.exp(-wn * t);
  const a = p.p1[0], b = p.p2[0];
  return (wn * wn * (Math.exp(a * t) - Math.exp(b * t))) / (a - b);
}

/** Envelope 1 ± e^{−ζωn t}/√(1−ζ²) of the underdamped step response. */
export const envelope = (z: number, wn: number, t: number) => Math.exp(-z * wn * t) / Math.sqrt(1 - z * z);

export interface Specs {
  Mp: number; // overshoot (fraction of the final value)
  tp: number; // time of the first peak
  tr: number; // rise time
  ts: number; // settling time
}

/** Specifications from the formulas (NaN where they do not apply). */
export function formulas(z: number, wn: number, band: 0.02 | 0.05, rise: '0-100' | '10-90'): Specs {
  const p = poles(z, wn);
  const under = p.kind === 'under' || p.kind === 'undamped';
  const wd = under ? p.p1[1] : NaN;
  const Mp = under ? Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z)) : 0;
  const tp = under ? Math.PI / wd : Infinity;
  // 10–90 %: polynomial fit ωn·tr ≈ 1.76ζ³ − 0.417ζ² + 1.039ζ + 1 (good for 0 < ζ < 0.9)
  const tr = rise === '0-100' ? (under ? (Math.PI - Math.acos(z)) / wd : NaN) : z < 0.9 ? (1.76 * z ** 3 - 0.417 * z * z + 1.039 * z + 1) / wn : NaN;
  // envelope criterion: e^{−ζωn t} = band (√(1−ζ²) ignored), i.e. ≈ 4/(ζωn) for 2 % and 3/(ζωn) for 5 %
  const ts = p.kind === 'undamped' ? Infinity : under ? -Math.log(band) / (z * wn) : NaN;
  return { Mp, tp, tr, ts };
}

/** Specifications measured on a sampled step response. */
export function measured(z: number, wn: number, band: 0.02 | 0.05, rise: '0-100' | '10-90', T: number, N = 6000): Specs {
  let peak = -Infinity, tp = NaN;
  let t10 = NaN, t90 = NaN, t100 = NaN;
  let lastOut = 0;
  let prev = 0;
  for (let k = 0; k <= N; k++) {
    const t = (T * k) / N;
    const y = step(z, wn, t);
    if (y > peak + 1e-12) { peak = y; tp = t; }
    if (Number.isNaN(t10) && y >= 0.1) t10 = t;
    if (Number.isNaN(t90) && y >= 0.9) t90 = t;
    if (Number.isNaN(t100) && y >= 1 && prev < 1) t100 = t;
    if (Math.abs(y - 1) > band) lastOut = t;
    prev = y;
  }
  const settled = lastOut < T * 0.98;
  const overshoot = Math.max(0, peak - 1);
  return {
    Mp: overshoot,
    tp: overshoot > 1e-6 ? tp : Infinity,
    tr: rise === '0-100' ? t100 : t90 - t10,
    ts: settled ? lastOut : NaN,
  };
}

/** Frequency response. */
export function freq(z: number, wn: number, w: number): { mag: number; ph: number } {
  const re = wn * wn - w * w, im = 2 * z * wn * w;
  return { mag: (wn * wn) / Math.hypot(re, im), ph: (-Math.atan2(im, re) * 180) / Math.PI };
}

/** Resonance peak and frequency (only for ζ < 1/√2), and −3 dB bandwidth. */
export function freqSpecs(z: number, wn: number): { Mr: number; wr: number; wb: number } {
  const res = z < Math.SQRT1_2 - 1e-9;
  const Mr = res ? (z < EPS ? Infinity : 1 / (2 * z * Math.sqrt(1 - z * z))) : 1;
  const wr = res ? wn * Math.sqrt(1 - 2 * z * z) : NaN;
  const a = 1 - 2 * z * z;
  const wb = wn * Math.sqrt(a + Math.sqrt(a * a + 1));
  return { Mr, wr, wb };
}

/** Series RLC with output v_C. */
export const rlc = (R: number, L: number, C: number) => ({ wn: 1 / Math.sqrt(L * C), z: (R / 2) * Math.sqrt(C / L) });
/** R and L that give (ζ, ωn) for a given C. */
export const rlcFor = (z: number, wn: number, C: number) => {
  const L = 1 / (wn * wn * C);
  return { L, R: 2 * z * Math.sqrt(L / C) };
};

/** Time span that shows the transient. */
export function horizon(z: number, wn: number): number {
  const p = poles(z, wn);
  if (p.kind === 'undamped') return (4 * 2 * Math.PI) / wn;
  const slow = -p.p1[0];
  const ts = 4 / slow;
  if (p.kind === 'under') return Math.min(1.3 * ts, 5 * ((2 * Math.PI) / p.p1[1]));
  // with real poles the factor (1 + ωn t) or the second exponential delays settling beyond 4/σ:
  // for ζ = 1 the 2 % band is reached at ωn t ≈ 5.83
  return 1.3 * Math.max(ts, 6.5 / wn);
}

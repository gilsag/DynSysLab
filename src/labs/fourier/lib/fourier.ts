// Core Fourier utilities.
//
// Convention used throughout the app (one-sided, complex amplitudes):
//   x(t) = C_0 + sum_{k>=1} Re{ C_k e^{j k w0 t} },   t measured in periods (T = 1)
//   C_k = a_k - j b_k = A_k e^{j phi_k}
//   so that each term equals a_k cos(k w0 t) + b_k sin(k w0 t) = A_k cos(k w0 t + phi_k).
// The two-sided coefficients are c_k = C_k / 2 (k >= 1), c_0 = C_0.

export const M = 8192; // samples per period used for synthesis
export const K_REF = 2048; // harmonics kept for analytic reference signals
export const N_MAX = 200; // max number of terms selectable in the UI

export interface Coeffs {
  re: Float64Array;
  im: Float64Array;
}

export function zeros(K: number): Coeffs {
  return { re: new Float64Array(K + 1), im: new Float64Array(K + 1) };
}

export function cloneC(c: Coeffs): Coeffs {
  return { re: c.re.slice(), im: c.im.slice() };
}

/** In-place iterative radix-2 FFT (forward, e^{-j...}). Length must be a power of 2. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    for (let k = 0; k < half; k++) {
      const wr = Math.cos(ang * k);
      const wi = Math.sin(ang * k);
      for (let i = k; i < n; i += len) {
        const j = i + half;
        const br = re[j] * wr - im[j] * wi;
        const bi = re[j] * wi + im[j] * wr;
        re[j] = re[i] - br;
        im[j] = im[i] - bi;
        re[i] += br;
        im[i] += bi;
      }
    }
  }
}

/** Fourier coefficients (one-sided C_k) of one period sampled uniformly. */
export function coeffsFromSamples(x: ArrayLike<number>, K: number): Coeffs {
  const n = x.length;
  const re = Float64Array.from(x);
  const im = new Float64Array(n);
  fft(re, im);
  const Kc = Math.min(K, n / 2 - 1);
  const c = zeros(Kc);
  c.re[0] = re[0] / n;
  for (let k = 1; k <= Kc; k++) {
    c.re[k] = (2 * re[k]) / n;
    c.im[k] = (2 * im[k]) / n;
  }
  return c;
}

/**
 * Synthesizes one period (size samples) of sum_k w_k Re{C_k e^{jk2pi t}} with an inverse FFT.
 * w (optional) is a real weight per harmonic (0 drops it).
 */
export function synthesize(c: Coeffs, w?: Float64Array | null, size = M): Float64Array {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const K = Math.min(c.re.length - 1, size / 2 - 1);
  re[0] = c.re[0] * (w ? w[0] : 1);
  for (let k = 1; k <= K; k++) {
    const g = 0.5 * (w ? w[k] : 1);
    if (g === 0) continue;
    const a = c.re[k] * g;
    const b = c.im[k] * g;
    // conj(X) so that a forward FFT followed by taking the real part gives the inverse transform
    re[k] = a;
    im[k] = -b;
    re[size - k] = a;
    im[size - k] = b;
  }
  fft(re, im);
  return re;
}

/** Mean-square value (power) from coefficients, by Parseval. */
export function sumSq(c: Coeffs): number {
  let s = c.re[0] * c.re[0];
  for (let k = 1; k < c.re.length; k++) s += 0.5 * (c.re[k] * c.re[k] + c.im[k] * c.im[k]);
  return s;
}

export function meanSq(x: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s / x.length;
}

export function mean(x: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return s / x.length;
}

export function maxAbs(x: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > m) m = a;
  }
  return m;
}

export function minMax(x: ArrayLike<number>): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < x.length; i++) {
    if (x[i] < lo) lo = x[i];
    if (x[i] > hi) hi = x[i];
  }
  return [lo, hi];
}

/** Linear interpolation of a periodic sampled signal at time t (in periods). */
export function interpPeriodic(x: ArrayLike<number>, t: number): number {
  const n = x.length;
  const u = (t - Math.floor(t)) * n;
  const i = Math.floor(u);
  const f = u - i;
  return x[i % n] * (1 - f) + x[(i + 1) % n] * f;
}

export function resamplePeriodic(x: ArrayLike<number>, n: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = interpPeriodic(x, i / n);
  return out;
}

/** Repeats one period to cover two periods (2*len+1 points, closing point included). */
export function twoPeriods(x: ArrayLike<number>): Float64Array {
  const n = x.length;
  const out = new Float64Array(2 * n + 1);
  for (let i = 0; i <= 2 * n; i++) out[i] = x[i % n];
  return out;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function amplitude(c: Coeffs, k: number): number {
  return k === 0 ? Math.abs(c.re[0]) : Math.hypot(c.re[k], c.im[k]);
}

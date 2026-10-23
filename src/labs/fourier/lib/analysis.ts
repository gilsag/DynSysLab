import {
  cloneC,
  Coeffs,
  M,
  maxAbs,
  minMax,
  mulberry32,
  N_MAX,
  sumSq,
  synthesize,
} from './fourier';
import { LtiSettings, ltiHighFreqGain, ltiResponse } from './lti';
import type { SignalContext, SignalDef } from './signals';

export type PhaseMode = 'original' | 'random' | 'cosine';
export type Smoothing = 'none' | 'fejer' | 'lanczos';

export interface AnalysisInput {
  signal: SignalDef;
  ctx: SignalContext;
  N: number;
  shift: number; // time shift in periods: x(t - shift)
  phaseMode: PhaseMode;
  phaseSeed: number;
  smoothing: Smoothing;
  mask: Uint8Array; // mask[k] = 1 keeps harmonic k (k = 0 is the mean value)
  lti: LtiSettings;
}

export interface Analysis {
  K: number;
  input: Coeffs; // coefficients before the LTI system
  ref: Coeffs; // coefficients of the signal being approximated (after the LTI system)
  weights: Float64Array; // weight applied to each harmonic in the partial sum
  inputWave: Float64Array; // one period, M samples
  refWave: Float64Array;
  approxWave: Float64Array;
  errWave: Float64Array;
  power: number;
  errPower: number;
  relRms: number;
  captured: number;
  maxErr: number;
  overshoot: number;
  convergence: Float64Array; // relative RMS error for N = 0..Nc (all harmonics, no smoothing)
  symmetry: { even: boolean; odd: boolean; halfWave: boolean };
  ltiOn: boolean;
}

function shiftC(c: Coeffs, tau: number): Coeffs {
  const o = cloneC(c);
  for (let k = 1; k < c.re.length; k++) {
    const th = -2 * Math.PI * k * tau;
    const cr = Math.cos(th);
    const ci = Math.sin(th);
    o.re[k] = c.re[k] * cr - c.im[k] * ci;
    o.im[k] = c.re[k] * ci + c.im[k] * cr;
  }
  return o;
}

function rephase(c: Coeffs, mode: PhaseMode, seed: number): Coeffs {
  const o = cloneC(c);
  const rnd = mulberry32(seed);
  for (let k = 1; k < c.re.length; k++) {
    const A = Math.hypot(c.re[k], c.im[k]);
    const ph = mode === 'cosine' ? 0 : 2 * Math.PI * rnd();
    o.re[k] = A * Math.cos(ph);
    o.im[k] = A * Math.sin(ph);
  }
  return o;
}

function filter(c: Coeffs, f0: number, lti: LtiSettings): Coeffs {
  const o = cloneC(c);
  o.re[0] = c.re[0] * ltiResponse(0, lti)[0];
  for (let k = 1; k < c.re.length; k++) {
    const [hr, hi] = ltiResponse(k * f0, lti);
    o.re[k] = c.re[k] * hr - c.im[k] * hi;
    o.im[k] = c.re[k] * hi + c.im[k] * hr;
  }
  return o;
}

export function sigma(k: number, N: number, sm: Smoothing): number {
  if (sm === 'none' || k === 0) return 1;
  const x = k / (N + 1);
  if (sm === 'fejer') return 1 - x;
  return Math.sin(Math.PI * x) / (Math.PI * x);
}

export function analyze(inp: AnalysisInput): Analysis {
  const { signal, ctx, N, shift, phaseMode, phaseSeed, smoothing, mask, lti } = inp;
  const base0 = signal.coeffs(ctx);
  const K = base0.re.length - 1;
  const base = shift ? shiftC(base0, shift) : base0;
  const input = phaseMode === 'original' ? base : rephase(base, phaseMode, phaseSeed);
  const ltiOn = lti.type !== 'none';
  const ref = ltiOn ? filter(input, ctx.f0, lti) : input;

  // Time-domain reference. Use the exact definition when the waveform has not been altered in the
  // frequency domain, so that discontinuities are drawn exactly.
  let inputWave: Float64Array;
  let basePower: number;
  if (signal.evaluate && phaseMode === 'original') {
    inputWave = new Float64Array(M);
    let p = 0;
    for (let i = 0; i < M; i++) {
      inputWave[i] = signal.evaluate(i / M - shift, ctx);
      // power on a staggered (midpoint) grid so that jump points are never sampled
      const v = signal.evaluate((i + 0.5) / M - shift, ctx);
      p += v * v;
    }
    basePower = p / M;
  } else {
    inputWave = synthesize(input);
    basePower = sumSq(base);
  }
  const refWave = ltiOn ? synthesize(ref) : inputWave;
  const power = ltiOn
    ? sumSq(ref) + Math.max(0, basePower - sumSq(base)) * ltiHighFreqGain(lti.type) ** 2
    : basePower;

  const weights = new Float64Array(K + 1);
  weights[0] = mask[0] ? 1 : 0;
  for (let k = 1; k <= K; k++) weights[k] = k <= N && mask[k] ? sigma(k, N, smoothing) : 0;

  const approxWave = synthesize(ref, weights);
  const errWave = new Float64Array(M);
  for (let i = 0; i < M; i++) errWave[i] = refWave[i] - approxWave[i];

  // Error power by Parseval: energy of what the partial sum does not reproduce.
  let errPower = (ref.re[0] * (1 - weights[0])) ** 2;
  for (let k = 1; k <= K; k++) {
    const d = 1 - weights[k];
    if (d !== 0) errPower += 0.5 * d * d * (ref.re[k] ** 2 + ref.im[k] ** 2);
  }
  errPower += Math.max(0, power - sumSq(ref)); // tail beyond the computed harmonics

  const safeP = power > 1e-15 ? power : 1;
  const relRms = power > 1e-15 ? Math.sqrt(errPower / safeP) : 0;
  const captured = power > 1e-15 ? Math.max(0, 1 - errPower / safeP) : 1;
  const maxErr = maxAbs(errWave);
  const [rLo, rHi] = minMax(refWave);
  const [aLo, aHi] = minMax(approxWave);
  const range = rHi - rLo;
  const overshoot = range > 1e-12 ? Math.max(0, aHi - rHi, rLo - aLo) / range : 0;

  const Nc = Math.min(K, N_MAX);
  const convergence = new Float64Array(Nc + 1);
  let cum = ref.re[0] ** 2;
  for (let n = 0; n <= Nc; n++) {
    if (n > 0) cum += 0.5 * (ref.re[n] ** 2 + ref.im[n] ** 2);
    convergence[n] = power > 1e-15 ? Math.sqrt(Math.max(0, power - cum) / power) : 0;
  }

  let amax = Math.abs(ref.re[0]);
  const Ks = Math.min(K, 512);
  for (let k = 1; k <= Ks; k++) amax = Math.max(amax, Math.hypot(ref.re[k], ref.im[k]));
  const eps = 1e-6 * amax + 1e-12;
  let even = true;
  let odd = Math.abs(ref.re[0]) <= eps;
  let halfWave = Math.abs(ref.re[0]) <= eps;
  for (let k = 1; k <= Ks; k++) {
    if (Math.abs(ref.im[k]) > eps) even = false;
    if (Math.abs(ref.re[k]) > eps) odd = false;
    if (k % 2 === 0 && Math.hypot(ref.re[k], ref.im[k]) > eps) halfWave = false;
  }

  return {
    K,
    input,
    ref,
    weights,
    inputWave,
    refWave,
    approxWave,
    errWave,
    power,
    errPower,
    relRms,
    captured,
    maxErr,
    overshoot,
    convergence,
    symmetry: { even, odd, halfWave },
    ltiOn,
  };
}

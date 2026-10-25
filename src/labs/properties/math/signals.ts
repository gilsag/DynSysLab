// Basic continuous-time signals, their classification, and discrete-time periodicity.
import type { Fn } from './systems';

export type SigKind = 'step' | 'impulse' | 'ramp' | 'rect' | 'exp' | 'cos' | 'dampcos' | 'texp' | 'tcos' | 'tdampcos' | 'custom';
export const SIG_KINDS: SigKind[] = ['step', 'impulse', 'ramp', 'rect', 'exp', 'cos', 'dampcos', 'texp', 'tcos', 'tdampcos', 'custom'];
/** products of the ramp with other basic signals: the modes of repeated roots */
export const RAMP_PRODUCTS: SigKind[] = ['texp', 'tcos', 'tdampcos'];
export interface SigPar {
  /** exponent a in e^{at} */
  a: number;
  /** angular frequency ω (rad/s) */
  w: number;
  /** phase φ in degrees */
  phi: number;
  /** width of the pulse that stands for δ(t) */
  eps: number;
}

export function sigFn(k: SigKind, p: SigPar, custom?: Fn): Fn {
  const ph = (p.phi * Math.PI) / 180;
  switch (k) {
    case 'step': return (t) => (t >= 0 ? 1 : 0);
    case 'impulse': return (t) => (Math.abs(t) <= p.eps / 2 ? 1 / p.eps : 0);
    case 'ramp': return (t) => (t >= 0 ? t : 0);
    case 'rect': return (t) => (t >= 0 && t < 1 ? 1 : 0);
    case 'exp': return (t) => (t >= 0 ? Math.exp(p.a * t) : 0);
    case 'cos': return (t) => Math.cos(p.w * t + ph);
    case 'dampcos': return (t) => (t >= 0 ? Math.exp(p.a * t) * Math.cos(p.w * t) : 0);
    case 'texp': return (t) => (t >= 0 ? t * Math.exp(p.a * t) : 0);
    case 'tcos': return (t) => (t >= 0 ? t * Math.cos(p.w * t) : 0);
    case 'tdampcos': return (t) => (t >= 0 ? t * Math.exp(p.a * t) * Math.cos(p.w * t) : 0);
    case 'custom': return custom ?? (() => 0);
  }
}

export type SigClassName = 'energy' | 'power' | 'neither';
export interface SigClass {
  causal: boolean;
  even: boolean;
  odd: boolean;
  /** fundamental period; null when not periodic; undefined when unknown (own formula) */
  period?: number | null;
  /** Infinity when infinite; undefined when unknown */
  energy?: number;
  power?: number;
  cls?: SigClassName;
}

const SPAN = 10;
const STEP = 1 / 64;
/** numerical checks of causality and symmetry on [−10, 10] */
function symmetry(x: Fn) {
  let even = true, odd = true, causal = true;
  for (let k = 0; k <= SPAN / STEP; k++) {
    const t = k * STEP;
    const a = x(t), b = x(-t);
    const sc = 1e-9 * (1 + Math.abs(a) + Math.abs(b));
    if (!(Math.abs(a - b) <= sc)) even = false;
    if (!(Math.abs(a + b) <= sc)) odd = false;
    if (k > 0 && !(Math.abs(b) <= 1e-12)) causal = false;
  }
  return { even, odd, causal };
}

export function classify(k: SigKind, p: SigPar, x: Fn): SigClass {
  const s = symmetry(x);
  const cls = (energy: number, power: number): SigClass => ({
    ...s, energy, power,
    period: k === 'cos' ? (Math.abs(p.w) > 1e-12 ? (2 * Math.PI) / Math.abs(p.w) : null) : null,
    cls: Number.isFinite(energy) ? 'energy' : Number.isFinite(power) && power > 0 ? 'power' : 'neither',
  });
  switch (k) {
    case 'step': return cls(Infinity, 0.5);
    case 'impulse': return { ...cls(Infinity, NaN), causal: true, even: true, odd: false };
    case 'ramp': return cls(Infinity, Infinity);
    case 'rect': return cls(1, 0);
    case 'exp':
      if (p.a < -1e-12) return cls(1 / (-2 * p.a), 0);
      if (p.a > 1e-12) return cls(Infinity, Infinity);
      return cls(Infinity, 0.5);
    case 'cos': {
      const ph = (p.phi * Math.PI) / 180;
      const P = Math.abs(p.w) > 1e-12 ? 0.5 : Math.cos(ph) ** 2;
      return P > 1e-12 ? cls(Infinity, P) : cls(0, 0);
    }
    case 'dampcos': {
      const a = p.a, w = p.w;
      if (a < -1e-12) return cls(1 / (-4 * a) + -a / (4 * (a * a + w * w)), 0);
      if (a > 1e-12) return cls(Infinity, Infinity);
      return cls(Infinity, Math.abs(w) > 1e-12 ? 0.25 : 0.5);
    }
    case 'texp':
      // ∫₀^∞ t² e^{2at} dt = 2/(−2a)³
      return p.a < -1e-12 ? cls(1 / (4 * (-p.a) ** 3), 0) : cls(Infinity, Infinity);
    case 'tcos': return cls(Infinity, Infinity);
    case 'tdampcos': {
      if (!(p.a < -1e-12)) return cls(Infinity, Infinity);
      // ∫ t² e^{2at} (1 + cos 2ωt)/2 dt = 1/(−2a)³ + Re[1/(−2a − 2jω)³]
      const re = -2 * p.a, im = -2 * p.w;
      const r2 = re * re + im * im;
      const cubeRe = re * (re * re - 3 * im * im); // Re[(re + j im)³]
      return cls(1 / re ** 3 + cubeRe / r2 ** 3, 0);
    }
    case 'custom': return { ...s };
  }
}

/* ------------------------------------------------------------------ discrete periodicity */
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/**
 * Period of x[n] = cos(Ω n). With Ω = (p/q)·π the signal is periodic with N = 2q / gcd(p, 2q).
 * With Ω typed in rad/sample (a rational number), it is periodic only when Ω = 0.
 */
export function discretePeriodPi(p: number, q: number): { N: number; num: number; den: number } {
  // Ω / 2π = p / (2q)
  const g = gcd(Math.abs(p), 2 * q) || 1;
  return { N: (2 * q) / g, num: p / g, den: (2 * q) / g };
}

import type { Lang, TKey } from '../i18n';
import { Coeffs, coeffsFromSamples, interpPeriodic, K_REF, mulberry32, zeros } from './fourier';

export type SignalGroup = 'classic' | 'custom';

export interface ParamDef {
  key: string;
  label: TKey;
  min: number;
  max: number;
  step: number;
  def: number;
}

export interface SignalContext {
  params: Record<string, number>;
  f0: number;
  custom: Float64Array | null;
}

export interface SignalDef {
  id: string;
  group: SignalGroup;
  name: TKey;
  params?: ParamDef[];
  /** One-sided complex coefficients C_k, k = 0..K. */
  coeffs: (c: SignalContext) => Coeffs;
  /** Exact time-domain definition (t in periods), when available. */
  evaluate?: (t: number, c: SignalContext) => number;
  formula?: (c: SignalContext, lang: Lang) => string;
  note?: TKey;
}

const PI = Math.PI;
const frac = (t: number) => t - Math.floor(t);
const ODD: Record<Lang, string> = { es: 'impar', en: 'odd', fr: 'impair', de: 'ungerade', it: 'dispari', pt: 'ímpar' };
const EVEN: Record<Lang, string> = { es: 'par', en: 'even', fr: 'pair', de: 'gerade', it: 'pari', pt: 'par' };
const oddTxt = (l: Lang) => `\\text{ ${ODD[l]}}`;
const evenTxt = (l: Lang) => `\\text{ ${EVEN[l]}}`;
const sinc = (x: number) => (x === 0 ? 1 : Math.sin(PI * x) / (PI * x));

/** Builds coefficients from a function returning [a_k, b_k]. */
function trig(K: number, f: (k: number) => [number, number]): Coeffs {
  const c = zeros(K);
  for (let k = 0; k <= K; k++) {
    const [a, b] = f(k);
    c.re[k] = a;
    c.im[k] = -b;
  }
  return c;
}

/** High-resolution FFT of an exact time function (used where no closed form is coded). */
const numericCache = new Map<string, Coeffs>();
function numeric(key: string, f: (t: number) => number): Coeffs {
  let c = numericCache.get(key);
  if (!c) {
    const n = 1 << 16;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = f(i / n);
    c = coeffsFromSamples(x, K_REF);
    if (numericCache.size > 64) numericCache.clear();
    numericCache.set(key, c);
  }
  return c;
}

function trapezoid(t: number, r: number): number {
  const u = frac(t + 0.5) - 0.5; // [-0.5, 0.5)
  const a = Math.abs(u);
  const h = r / 2;
  const v = a < h ? a / h : a <= 0.5 - h ? 1 : (0.5 - a) / h;
  return u < 0 ? -v : v;
}

function asymTriangle(t: number, p: number): number {
  const u = frac(t);
  return u < p ? -1 + (2 * u) / p : 1 - (2 * (u - p)) / (1 - p);
}

const NOISE_M = 4096; // samples per period of the frozen noise
const NOISE_SIGMA = 0.35;
const noiseCache = new Map<number, { x: Float64Array; c: Coeffs }>();
/** One period of Gaussian white noise (Box-Muller on a seeded generator), repeated every T. */
function noisePeriod(seed: number): { x: Float64Array; c: Coeffs } {
  let e = noiseCache.get(seed);
  if (!e) {
    const rnd = mulberry32(0x9e3779b9 ^ (seed * 2654435761));
    const x = new Float64Array(NOISE_M);
    for (let i = 0; i < NOISE_M; i += 2) {
      const u1 = Math.max(rnd(), 1e-12);
      const u2 = rnd();
      const r = NOISE_SIGMA * Math.sqrt(-2 * Math.log(u1));
      x[i] = r * Math.cos(2 * PI * u2);
      x[i + 1] = r * Math.sin(2 * PI * u2);
    }
    e = { x, c: coeffsFromSamples(x, 1024) };
    if (noiseCache.size > 32) noiseCache.clear();
    noiseCache.set(seed, e);
  }
  return e;
}

function clippedSine(t: number, c: number): number {
  const s = Math.sin(2 * PI * t);
  return Math.max(-c, Math.min(c, s)) / c;
}

export const SIGNALS: SignalDef[] = [
  {
    id: 'square',
    group: 'classic',
    name: 'sigSquare',
    evaluate: (t) => {
      const u = frac(t);
      return u === 0 || u === 0.5 ? 0 : u < 0.5 ? 1 : -1;
    },
    coeffs: () => trig(K_REF, (k) => (k % 2 === 1 ? [0, 4 / (PI * k)] : [0, 0])),
    formula: (_, l) => `x(t)=\\frac{4}{\\pi}\\sum_{k${oddTxt(l)}}\\frac{1}{k}\\sin(k\\omega_0 t)`,
  },
  {
    id: 'trapezoid',
    group: 'classic',
    name: 'sigTrapezoid',
    params: [{ key: 'r', label: 'pRise', min: 0.01, max: 0.5, step: 0.01, def: 0.1 }],
    evaluate: (t, { params }) => trapezoid(t, params.r),
    // square wave convolved with a box of width t_r: coefficients multiply by sinc(k t_r / T)
    coeffs: ({ params }) => trig(K_REF, (k) => (k % 2 === 1 ? [0, (4 / (PI * k)) * sinc(k * params.r)] : [0, 0])),
    formula: ({ params }, l) =>
      `x(t)=\\frac{4}{\\pi}\\sum_{k${oddTxt(l)}}\\frac{1}{k}\\,\\frac{\\sin(\\pi k t_r/T)}{\\pi k t_r/T}\\,\\sin(k\\omega_0 t),\\quad t_r=${params.r.toFixed(2)}\\,T`,
    note: 'noteTrapezoid',
  },
  {
    id: 'saw',
    group: 'classic',
    name: 'sigSaw',
    evaluate: (t) => {
      const u = frac(t + 0.5);
      return u === 0 ? 0 : 2 * u - 1;
    },
    coeffs: () => trig(K_REF, (k) => (k === 0 ? [0, 0] : [0, (2 * (k % 2 ? 1 : -1)) / (PI * k)])),
    formula: () => 'x(t)=\\frac{2}{\\pi}\\sum_{k=1}^{\\infty}\\frac{(-1)^{k+1}}{k}\\sin(k\\omega_0 t)',
  },
  {
    id: 'triangle',
    group: 'classic',
    name: 'sigTriangle',
    evaluate: (t) => 1 - 4 * Math.abs(frac(t + 0.5) - 0.5),
    coeffs: () => trig(K_REF, (k) => (k % 2 === 1 ? [8 / (PI * PI * k * k), 0] : [0, 0])),
    formula: (_, l) => `x(t)=\\frac{8}{\\pi^2}\\sum_{k${oddTxt(l)}}\\frac{1}{k^2}\\cos(k\\omega_0 t)`,
  },
  {
    id: 'asymtri',
    group: 'classic',
    name: 'sigAsymTri',
    params: [{ key: 'p', label: 'pPeak', min: 0.02, max: 0.98, step: 0.01, def: 0.25 }],
    evaluate: (t, { params }) => asymTriangle(t, params.p),
    coeffs: ({ params }) => {
      // x'' is a pair of impulses, so c_k = -(1 - e^{-j2πkp}) / (2π²k² p(1-p))
      const p = params.p;
      const c = zeros(K_REF);
      for (let k = 1; k <= K_REF; k++) {
        const th = 2 * PI * k * p;
        const s = 1 / (2 * PI * PI * k * k * p * (1 - p));
        // C_k = 2 c_k
        c.re[k] = -2 * s * (1 - Math.cos(th));
        c.im[k] = -2 * s * Math.sin(th);
      }
      return c;
    },
    formula: ({ params }) =>
      `c_k=-\\frac{1-e^{-j2\\pi k p}}{2\\pi^2k^2\\,p\\,(1-p)},\\quad p=t_p/T=${params.p.toFixed(2)}`,
    note: 'noteAsymTri',
  },
  {
    id: 'parabola',
    group: 'classic',
    name: 'sigParabola',
    evaluate: (t) => {
      const u = frac(t + 0.5) - 0.5;
      return 1 - 8 * u * u;
    },
    coeffs: () => trig(K_REF, (k) => (k === 0 ? [1 / 3, 0] : [(8 * (k % 2 ? 1 : -1)) / (PI * PI * k * k), 0])),
    formula: () =>
      'x(t)=1-8\\left(\\tfrac{t}{T}\\right)^2\\;(|t|\\le T/2)=\\frac{1}{3}+\\frac{8}{\\pi^2}\\sum_{k=1}^{\\infty}\\frac{(-1)^{k+1}}{k^2}\\cos(k\\omega_0 t)',
  },
  {
    id: 'pulse',
    group: 'classic',
    name: 'sigPulse',
    params: [{ key: 'D', label: 'pDuty', min: 0.02, max: 0.98, step: 0.01, def: 0.25 }],
    evaluate: (t, { params }) => {
      const u = Math.abs(frac(t + 0.5) - 0.5);
      const h = params.D / 2;
      return u < h ? 1 : u === h ? 0.5 : 0;
    },
    coeffs: ({ params }) =>
      trig(K_REF, (k) => (k === 0 ? [params.D, 0] : [(2 * Math.sin(PI * k * params.D)) / (PI * k), 0])),
    formula: ({ params }) =>
      `x(t)=D+\\sum_{k=1}^{\\infty}\\frac{2\\sin(\\pi k D)}{\\pi k}\\cos(k\\omega_0 t),\\quad D=${params.D.toFixed(2)}`,
  },
  {
    id: 'halfwave',
    group: 'classic',
    name: 'sigHalf',
    evaluate: (t) => Math.max(Math.sin(2 * PI * t), 0),
    coeffs: () =>
      trig(K_REF, (k) => {
        if (k === 0) return [1 / PI, 0];
        if (k === 1) return [0, 0.5];
        if (k % 2 === 0) return [-2 / (PI * (k * k - 1)), 0];
        return [0, 0];
      }),
    formula: (_, l) =>
      `x(t)=\\frac{1}{\\pi}+\\frac{1}{2}\\sin(\\omega_0 t)-\\frac{2}{\\pi}\\sum_{k${evenTxt(l)}}\\frac{\\cos(k\\omega_0 t)}{k^2-1}`,
  },
  {
    id: 'fullwave',
    group: 'classic',
    name: 'sigFull',
    evaluate: (t) => Math.abs(Math.sin(PI * t)),
    coeffs: () => trig(K_REF, (k) => (k === 0 ? [2 / PI, 0] : [-4 / (PI * (4 * k * k - 1)), 0])),
    formula: () => 'x(t)=\\frac{2}{\\pi}-\\frac{4}{\\pi}\\sum_{k=1}^{\\infty}\\frac{\\cos(k\\omega_0 t)}{4k^2-1}',
  },
  {
    id: 'clipped',
    group: 'classic',
    name: 'sigClipped',
    params: [{ key: 'c', label: 'pClip', min: 0.05, max: 1, step: 0.01, def: 0.5 }],
    evaluate: (t, { params }) => clippedSine(t, params.c),
    coeffs: ({ params }) => numeric('clipped:' + params.c, (t) => clippedSine(t, params.c)),
    formula: ({ params }) =>
      `x(t)=\\frac{1}{c}\\,\\operatorname{sat}_c\\!\\big(\\sin\\omega_0 t\\big),\\quad c=${params.c.toFixed(2)},\\qquad C_k\\ \\text{(FFT)}`,
    note: 'noteClipped',
  },
  {
    id: 'exp',
    group: 'classic',
    name: 'sigExp',
    params: [{ key: 'tau', label: 'pTau', min: 0.02, max: 2, step: 0.01, def: 0.2 }],
    evaluate: (t, { params }) => Math.exp(-frac(t) / params.tau),
    coeffs: ({ params }) => {
      const tau = params.tau;
      const A = 1 - Math.exp(-1 / tau);
      const c = zeros(K_REF);
      c.re[0] = tau * A;
      for (let k = 1; k <= K_REF; k++) {
        const w = 2 * PI * k;
        const den = 1 / (tau * tau) + w * w;
        c.re[k] = (2 * A * (1 / tau)) / den;
        c.im[k] = (-2 * A * w) / den;
      }
      return c;
    },
    formula: ({ params }) =>
      `x(t)=e^{-t/\\tau}\\;(0\\le t<T),\\quad c_k=\\frac{1-e^{-T/\\tau}}{T\\,(1/\\tau+jk\\omega_0)},\\quad \\tau=${params.tau.toFixed(2)}\\,T`,
  },
  {
    id: 'noise',
    group: 'classic',
    name: 'sigNoise',
    params: [{ key: 'seed', label: 'pSeed', min: 1, max: 50, step: 1, def: 1 }],
    evaluate: (t, { params }) => interpPeriodic(noisePeriod(params.seed).x, t),
    coeffs: ({ params }) => noisePeriod(params.seed).c,
    formula: () =>
      `x(t+T)=x(t),\\quad x\\!\\left(\\tfrac{i}{M}T\\right)=n_i\\sim\\mathcal{N}(0,\\sigma^2)\\ \\text{i.i.d.},\\quad M=${NOISE_M},\\quad \\mathbb{E}\\{A_k^2\\}\\approx\\text{const.}`,
    note: 'noteNoise',
  },
  {
    id: 'const',
    group: 'classic',
    name: 'sigConst',
    params: [{ key: 'c', label: 'pLevel', min: -1, max: 1, step: 0.01, def: 0.5 }],
    evaluate: (_, { params }) => params.c,
    coeffs: ({ params }) => trig(0, () => [params.c, 0]),
    formula: ({ params }) =>
      `x(t)=c=${params.c.toFixed(2)}\\quad\\Rightarrow\\quad a_0=c,\\;\\; a_k=b_k=0\\;\\;(k\\ge 1)`,
    note: 'noteConst',
  },
  {
    id: 'sine',
    group: 'classic',
    name: 'sigSine',
    evaluate: (t) => Math.sin(2 * PI * t),
    coeffs: () => trig(1, (k) => (k === 1 ? [0, 1] : [0, 0])),
    formula: () => 'x(t)=\\sin(\\omega_0 t)',
  },

  {
    id: 'draw',
    group: 'custom',
    name: 'sigDraw',
    coeffs: ({ custom }) => (custom ? coeffsFromSamples(custom, 1024) : zeros(1)),
    evaluate: (t, { custom }) => (custom ? interpPeriodic(custom, t) : 0),
    note: 'noteDraw',
  },
  {
    id: 'mic',
    group: 'custom',
    name: 'sigMic',
    coeffs: ({ custom }) => (custom ? coeffsFromSamples(custom, 1024) : zeros(1)),
    evaluate: (t, { custom }) => (custom ? interpPeriodic(custom, t) : 0),
    note: 'noteMic',
  },
];

export const SIGNAL_MAP: Record<string, SignalDef> = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));

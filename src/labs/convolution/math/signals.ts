// Signal catalogue for the convolution lab: regular part, impulses and support.
import { tryFormula } from '@shared/expr';
import { impulseResponse, parseCoeffs, polyTex } from './ode';

export type Kind = 'pulse' | 'step' | 'rc' | 'exp' | 'ramp' | 'tri' | 'halfsine' | 'second' | 'integrator' | 'ode' | 'impulse' | 'custom';

/** Inputs may be any signal. */
export const U_KINDS: Kind[] = ['pulse', 'step', 'exp', 'ramp', 'tri', 'halfsine', 'impulse', 'custom'];
/**
 * Impulse responses of systems described by a linear ODE with constant coefficients: combinations of modes
 * e^{λt}, t^k e^{λt}, e^{σt}cos/sin(ωt) times μ(t), plus D·δ(t) when biproper; δ(t − c) is a pure delay.
 */
export const H_KINDS: Kind[] = ['rc', 'exp', 'second', 'integrator', 'ode', 'impulse'];
export interface SigDef {
  kind: Kind;
  p: Record<string, number>;
  src?: string; // formula for 'custom'
  q?: string; // 'ode': coefficients of Q(D), highest power first
  pn?: string; // 'ode': coefficients of P(D)
}
export interface Impulse {
  t: number;
  w: number;
}
export interface Signal {
  f: (t: number) => number; // regular part
  imp: Impulse[];
  /** support of the regular part [a, b] (b may be Infinity); for impulses only, the impulse span */
  sup: [number, number];
  /** instants where the regular part has a corner or jump */
  breaks: number[];
  /** characteristic time used to size the view when the support is infinite */
  scale: number;
  tex: (v: string) => string;
}

/** Parameters of each kind, with defaults (TeX label, default, min). */
export const PARAMS: Record<Kind, [string, string, number, number?][]> = {
  pulse: [['A', 'A', 1], ['T', 'T_p', 1, 1e-3], ['d', 'd', 0]],
  step: [['A', 'A', 1], ['d', 'd', 0]],
  rc: [['RC', 'RC', 1, 1e-3], ['d', 'd', 0]],
  exp: [['A', 'A', 1], ['tau', '\\tau', 1, 1e-3], ['d', 'd', 0]],
  ramp: [['A', 'A', 1], ['T', 'T_p', 1, 1e-3], ['d', 'd', 0]],
  tri: [['A', 'A', 1], ['T', 'T_p', 1, 1e-3], ['d', 'd', 0]],
  halfsine: [['A', 'A', 2 * Math.PI], ['T', 'T_p', 1, 1e-3], ['d', 'd', 0]],
  second: [['wn', '\\omega_n', 4, 1e-3], ['zeta', '\\zeta', 0.2, 0], ['d', 'd', 0]],
  integrator: [['K', 'K', 1]],
  ode: [],
  impulse: [['w', 'w', 1], ['c', 'c', 0.5]],
  custom: [],
};

export function defaults(kind: Kind): Record<string, number> {
  return Object.fromEntries(PARAMS[kind].map(([k, , v]) => [k, v]));
}

const mu = (x: number) => (x >= 0 ? 1 : 0);
const num = (x: number) => String(+x.toPrecision(4));
const shift = (v: string, d: number) => (d === 0 ? v : `${v} ${d > 0 ? '-' : '+'} ${num(Math.abs(d))}`);
/** shifted argument wrapped in parentheses only when there is a shift */
const par = (v: string, d: number) => (d === 0 ? v : `(${shift(v, d)})`);

export function build(def: SigDef, window: [number, number]): Signal {
  const p = { ...defaults(def.kind), ...def.p };
  const d = p.d ?? 0;
  switch (def.kind) {
    case 'pulse':
      return { f: (t) => p.A * (mu(t - d) - mu(t - d - p.T)), imp: [], sup: [d, d + p.T], breaks: [d, d + p.T], scale: p.T,
        tex: (v) => `${num(p.A)}\\left[\\mu(${shift(v, d)}) - \\mu(${shift(v, d + p.T)})\\right]` };
    case 'step':
      return { f: (t) => p.A * mu(t - d), imp: [], sup: [d, Infinity], breaks: [d], scale: 1, tex: (v) => `${num(p.A)}\\,\\mu(${shift(v, d)})` };
    case 'rc':
      return { f: (t) => (t >= d ? Math.exp(-(t - d) / p.RC) / p.RC : 0), imp: [], sup: [d, Infinity], breaks: [d], scale: p.RC,
        tex: (v) => `\\frac{1}{RC}\\,e^{-${par(v, d)}/RC}\\,\\mu(${shift(v, d)}),\\ RC = ${num(p.RC)}` };
    case 'exp':
      return { f: (t) => (t >= d ? p.A * Math.exp(-(t - d) / p.tau) : 0), imp: [], sup: [d, Infinity], breaks: [d], scale: p.tau,
        tex: (v) => `${num(p.A)}\\,e^{-${par(v, d)}/${num(p.tau)}}\\,\\mu(${shift(v, d)})` };
    case 'ramp':
      return { f: (t) => (t >= d && t < d + p.T ? (p.A * (t - d)) / p.T : 0), imp: [], sup: [d, d + p.T], breaks: [d, d + p.T], scale: p.T,
        tex: (v) => `${num(p.A)}\\,\\frac{${shift(v, d)}}{${num(p.T)}}\\left[\\mu(${shift(v, d)}) - \\mu(${shift(v, d + p.T)})\\right]` };
    case 'tri':
      return { f: (t) => (t >= d && t <= d + p.T ? p.A * (1 - Math.abs((2 * (t - d)) / p.T - 1)) : 0), imp: [], sup: [d, d + p.T], breaks: [d, d + p.T / 2, d + p.T], scale: p.T,
        tex: () => `\\text{triángulo},\\ A = ${num(p.A)},\\ T_p = ${num(p.T)}` };
    case 'halfsine':
      return { f: (t) => (t >= d && t <= d + p.T ? p.A * Math.sin((Math.PI * (t - d)) / p.T) : 0), imp: [], sup: [d, d + p.T], breaks: [d, d + p.T], scale: p.T,
        tex: (v) => `${num(p.A)}\\operatorname{sen}\\!\\left(\\tfrac{\\pi ${par(v, d)}}{${num(p.T)}}\\right)\\left[\\mu(${shift(v, d)}) - \\mu(${shift(v, d + p.T)})\\right]` };
    case 'second': {
      // impulse response of ωn²/(s² + 2ζωn s + ωn²) for any ζ ≥ 0
      const z = Math.max(0, p.zeta), w = p.wn;
      let f: (x: number) => number;
      if (z < 1 - 1e-9) {
        const wd = w * Math.sqrt(1 - z * z);
        f = (x) => (w / Math.sqrt(1 - z * z)) * Math.exp(-z * w * x) * Math.sin(wd * x);
      } else if (z <= 1 + 1e-9) {
        f = (x) => w * w * x * Math.exp(-w * x);
      } else {
        const r = Math.sqrt(z * z - 1);
        f = (x) => (w / (2 * r)) * (Math.exp(-(z - r) * w * x) - Math.exp(-(z + r) * w * x));
      }
      return { f: (t) => (t >= d ? f(t - d) : 0), imp: [], sup: [d, Infinity], breaks: [d],
        scale: z < 1 ? 1 / Math.max(z * w, 0.05 * w) : 1 / ((z - Math.sqrt(Math.max(0, z * z - 1))) * w),
        tex: (v) => {
          const a = par(v, d), m = `\\,\\mu(${shift(v, d)})`;
          const ex = (k: number) => (k === 0 ? '' : `e^{-${num(k)}${a}}`);
          if (z < 1 - 1e-9) {
            const wd = w * Math.sqrt(1 - z * z);
            return `${num(w / Math.sqrt(1 - z * z))}\\,${ex(z * w)}\\operatorname{sen}(${num(wd)}${a})${m}`;
          }
          if (z <= 1 + 1e-9) return `${num(w * w)}\\,${a}\\,${ex(w)}${m}`;
          const r = Math.sqrt(z * z - 1);
          return `${num(w / (2 * r))}\\left(${ex((z - r) * w)} - ${ex((z + r) * w)}\\right)${m}`;
        } };
    }
    case 'integrator':
      return { f: (t) => (t >= 0 ? p.K : 0), imp: [], sup: [0, Infinity], breaks: [0], scale: 1, tex: (v) => `${num(p.K)}\\,\\mu(${v})` };
    case 'ode': {
      const q = parseCoeffs(def.q ?? '') ?? [1, 1];
      const pn = parseCoeffs(def.pn ?? '') ?? [1];
      const span = Math.max(1, window[1] - Math.min(0, window[0]));
      const r = impulseResponse(q, pn, 2 * span);
      if (!r) return { f: () => 0, imp: [], sup: [0, 0], breaks: [], scale: 1, tex: () => '\\text{—}' };
      return { f: r.f, imp: Math.abs(r.D) > 0 ? [{ t: 0, w: r.D }] : [], sup: [0, Infinity], breaks: [0], scale: Number.isFinite(r.slow) ? r.slow : span / 5,
        tex: () => `\\mathcal L^{-1}\\!\\left\\{\\dfrac{${polyTex(pn, 's')}}{${polyTex(q, 's')}}\\right\\}` };
    }
    case 'impulse':
      return { f: () => 0, imp: [{ t: p.c, w: p.w }], sup: [p.c, p.c], breaks: [], scale: 0, tex: (v) => `${num(p.w)}\\,\\delta(${shift(v, p.c)})` };
    case 'custom': {
      const r = tryFormula(def.src ?? '0', ['t']);
      const f = r.ok ? r.formula.f : () => 0;
      // support: where the formula is non-zero inside the window
      let a = Infinity, b = -Infinity;
      const N = 800;
      for (let i = 0; i <= N; i++) {
        const t = window[0] + ((window[1] - window[0]) * i) / N;
        if (Math.abs(f(t)) > 1e-12) { a = Math.min(a, t); b = Math.max(b, t); }
      }
      if (a > b) { a = 0; b = 0; }
      return { f: (t) => { const v = f(t); return Number.isFinite(v) ? v : 0; }, imp: [], sup: [a, b], breaks: [], scale: (window[1] - window[0]) / 4, tex: (v) => (def.src ?? '').replace(/t/g, v) };
    }
  }
}

/** Default view for u * h: covers the supports of u, h and the result. */
export function autoWindow(u: Signal, h: Signal): [number, number] {
  const end = (s: Signal) => (Number.isFinite(s.sup[1]) ? s.sup[1] : s.sup[0] + 5 * s.scale);
  const lo = Math.min(0, u.sup[0], h.sup[0], u.sup[0] + h.sup[0]);
  const hi = Math.max(end(u) + end(h), end(u), end(h), lo + 1);
  const pad = 0.12 * (hi - lo);
  return [lo - pad, hi + pad];
}

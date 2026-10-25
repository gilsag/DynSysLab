// Input signals and their Laplace transforms.
import type { Poly, Rational } from '@shared/poly';

export type InputKind = 'step' | 'impulse' | 'ramp' | 'sin' | 'cos' | 'exp' | 'none';
export const INPUTS: InputKind[] = ['step', 'impulse', 'ramp', 'sin', 'cos', 'exp', 'none'];
export interface InputDef {
  kind: InputKind;
  A: number;
  w: number;
  a: number;
}

export function transform(u: InputDef): Rational {
  const { A, w, a } = u;
  switch (u.kind) {
    case 'step': return { num: [A], den: [0, 1] };
    case 'impulse': return { num: [A], den: [1] };
    case 'ramp': return { num: [A], den: [0, 0, 1] };
    case 'sin': return { num: [A * w], den: [w * w, 0, 1] };
    case 'cos': return { num: [0, A], den: [w * w, 0, 1] };
    case 'exp': return { num: [A], den: [a, 1] };
    default: return { num: [0], den: [1] };
  }
}

/** u(t) for t ≥ 0 (impulse drawn separately). */
export function inputValue(u: InputDef, t: number): number {
  if (t < 0) return 0;
  switch (u.kind) {
    case 'step': return u.A;
    case 'ramp': return u.A * t;
    case 'sin': return u.A * Math.sin(u.w * t);
    case 'cos': return u.A * Math.cos(u.w * t);
    case 'exp': return u.A * Math.exp(-u.a * t);
    default: return 0;
  }
}

/** TeX of u(t) and U(s) with numbers formatted by `n`. */
export function inputTex(u: InputDef, n: (v: number) => string): { t: string; s: string } {
  const A = n(u.A), w = n(u.w), a = n(u.a);
  switch (u.kind) {
    case 'step': return { t: `${A}\\,\\mu(t)`, s: `\\frac{${A}}{s}` };
    case 'impulse': return { t: `${A}\\,\\delta(t)`, s: A };
    case 'ramp': return { t: `${A}\\,t\\,\\mu(t)`, s: `\\frac{${A}}{s^2}` };
    case 'sin': return { t: `${A}\\operatorname{sen}(${w}\\,t)\\,\\mu(t)`, s: `\\frac{${n(u.A * u.w)}}{s^2 + ${n(u.w * u.w)}}` };
    case 'cos': return { t: `${A}\\cos(${w}\\,t)\\,\\mu(t)`, s: `\\frac{${A}\\,s}{s^2 + ${n(u.w * u.w)}}` };
    case 'exp': return { t: u.a < 0 ? `${A}\\,e^{${n(-u.a)}t}\\,\\mu(t)` : `${A}\\,e^{-${a}t}\\,\\mu(t)`, s: u.a < 0 ? `\\frac{${A}}{s - ${n(-u.a)}}` : `\\frac{${A}}{s + ${a}}` };
    default: return { t: '0', s: '0' };
  }
}
export type { Poly };

// Systems catalogue, test inputs and the numerical experiments for system properties.
// All signals live on a uniform grid with step DT = 1/64 s, so that shifts by multiples of DT are
// exact in floating point: a shifted grid evaluates exactly the same instants.

export type Fn = (t: number) => number;
export const DT = 1 / 64;
export const snap = (x: number) => Math.round(x / DT) * DT;

/** grid t_k = a + k·DT, k = 0..n */
export interface Grid {
  a: number;
  n: number;
}
export const gridOf = (a: number, b: number): Grid => ({ a: snap(a), n: Math.round((snap(b) - snap(a)) / DT) });
export const WIN: [number, number] = [-4, 12];
export const BIBO_WIN: [number, number] = [-4, 60];

export type Prop = 'linear' | 'ti' | 'causal' | 'memoryless' | 'stable';
export const PROPS: Prop[] = ['linear', 'ti', 'causal', 'memoryless', 'stable'];

export type SysId =
  | 'gain' | 'square' | 'offset' | 'tvgain' | 'delay' | 'advance' | 'compress' | 'reverse' | 'integrator'
  | 'derivative' | 'sat' | 'abs' | 'mod' | 'rc' | 'unstable' | 'ltv' | 'mavg' | 'cavg';
export type Run = (u: Fn, g: Grid) => Float64Array;
export interface SysDef {
  id: SysId;
  tex: string;
  props: Record<Prop, boolean>;
  run: Run;
}

const P = (l: number, ti: number, c: number, m: number, s: number): Record<Prop, boolean> => ({ linear: !!l, ti: !!ti, causal: !!c, memoryless: !!m, stable: !!s });

/** memoryless system y(t) = f(u(t), t) */
export const pointwise = (f: (v: number, t: number) => number): Run => (u, g) => {
  const y = new Float64Array(g.n + 1);
  for (let k = 0; k <= g.n; k++) {
    const t = g.a + k * DT;
    y[k] = f(u(t), t);
  }
  return y;
};

/** y(t) = u(t + s) for a fixed time map */
const remap = (m: (t: number) => number): Run => (u, g) => {
  const y = new Float64Array(g.n + 1);
  for (let k = 0; k <= g.n; k++) y[k] = u(m(g.a + k * DT));
  return y;
};

/** cumulative integral from the start of the grid (Simpson on each step) */
function cumulative(u: Fn, a: number, n: number): Float64Array {
  const I = new Float64Array(n + 1);
  for (let k = 0; k < n; k++) {
    const t = a + k * DT;
    I[k + 1] = I[k] + (DT / 6) * (u(t) + 4 * u(t + DT / 2) + u(t + DT));
  }
  return I;
}

/** first-order equation y' + c(t) y = u, at rest at the start of the grid (RK4) */
const ode1 = (c: (t: number) => number): Run => (u, g) => {
  const y = new Float64Array(g.n + 1);
  const f = (t: number, v: number) => -c(t) * v + u(t);
  const h = DT;
  for (let k = 0; k < g.n; k++) {
    const t = g.a + k * DT;
    const v = y[k];
    const k1 = f(t, v);
    const k2 = f(t + h / 2, v + (h / 2) * k1);
    const k3 = f(t + h / 2, v + (h / 2) * k2);
    const k4 = f(t + h, v + h * k3);
    y[k + 1] = v + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  }
  return y;
};

const STEPS_1S = Math.round(1 / DT);

export const SYSTEMS: SysDef[] = [
  { id: 'gain', tex: 'y(t) = 2\\,u(t)', props: P(1, 1, 1, 1, 1), run: pointwise((v) => 2 * v) },
  { id: 'square', tex: 'y(t) = u^2(t)', props: P(0, 1, 1, 1, 1), run: pointwise((v) => v * v) },
  { id: 'offset', tex: 'y(t) = u(t) + 1', props: P(0, 1, 1, 1, 1), run: pointwise((v) => v + 1) },
  { id: 'tvgain', tex: 'y(t) = t\\,u(t)', props: P(1, 0, 1, 1, 0), run: pointwise((v, t) => t * v) },
  { id: 'delay', tex: 'y(t) = u(t - 1)', props: P(1, 1, 1, 0, 1), run: remap((t) => t - 1) },
  { id: 'advance', tex: 'y(t) = u(t + 1)', props: P(1, 1, 0, 0, 1), run: remap((t) => t + 1) },
  { id: 'compress', tex: 'y(t) = u(2t)', props: P(1, 0, 0, 0, 1), run: remap((t) => 2 * t) },
  { id: 'reverse', tex: 'y(t) = u(-t)', props: P(1, 0, 0, 0, 1), run: remap((t) => -t) },
  { id: 'integrator', tex: 'y(t) = \\int_{-\\infty}^{t} u(\\tau)\\,d\\tau', props: P(1, 1, 1, 0, 0), run: (u, g) => cumulative(u, g.a, g.n) },
  {
    id: 'derivative', tex: 'y(t) = \\dfrac{du}{dt}', props: P(1, 1, 1, 0, 0),
    run: (u, g) => {
      const y = new Float64Array(g.n + 1);
      for (let k = 0; k <= g.n; k++) {
        const t = g.a + k * DT;
        y[k] = (u(t) - u(t - DT)) / DT;
      }
      return y;
    },
  },
  { id: 'sat', tex: 'y(t) = \\operatorname{sat}\\big(u(t)\\big) = \\max\\big({-1},\\ \\min(1, u(t))\\big)', props: P(0, 1, 1, 1, 1), run: pointwise((v) => Math.max(-1, Math.min(1, v))) },
  { id: 'abs', tex: 'y(t) = |u(t)|', props: P(0, 1, 1, 1, 1), run: pointwise((v) => Math.abs(v)) },
  { id: 'mod', tex: 'y(t) = u(t)\\cos(4t)', props: P(1, 0, 1, 1, 1), run: pointwise((v, t) => v * Math.cos(4 * t)) },
  { id: 'rc', tex: '\\dot y(t) + y(t) = u(t)', props: P(1, 1, 1, 0, 1), run: ode1(() => 1) },
  { id: 'unstable', tex: '\\dot y(t) - y(t) = u(t)', props: P(1, 1, 1, 0, 0), run: ode1(() => -1) },
  { id: 'ltv', tex: '\\dot y(t) + (2 + \\sin t)\\,y(t) = u(t)', props: P(1, 0, 1, 0, 1), run: ode1((t) => 2 + Math.sin(t)) },
  {
    id: 'mavg', tex: 'y(t) = \\int_{t-1}^{t} u(\\tau)\\,d\\tau', props: P(1, 1, 1, 0, 1),
    run: (u, g) => {
      const I = cumulative(u, g.a - 1, g.n + STEPS_1S);
      return Float64Array.from({ length: g.n + 1 }, (_, k) => I[k + STEPS_1S] - I[k]);
    },
  },
  {
    id: 'cavg', tex: 'y(t) = \\frac{1}{2}\\int_{t-1}^{t+1} u(\\tau)\\,d\\tau', props: P(1, 1, 0, 0, 1),
    run: (u, g) => {
      const I = cumulative(u, g.a - 1, g.n + 2 * STEPS_1S);
      return Float64Array.from({ length: g.n + 1 }, (_, k) => (I[k + 2 * STEPS_1S] - I[k]) / 2);
    },
  },
];
export const sysById = (id: SysId) => SYSTEMS.find((s) => s.id === id)!;

/* ------------------------------------------------------------------ inputs */
export type InKind = 'step' | 'pulse' | 'exp' | 'sin' | 'cos' | 'square' | 'ramp' | 'custom';
export const IN_KINDS: InKind[] = ['step', 'pulse', 'exp', 'sin', 'cos', 'square', 'ramp', 'custom'];
/** inputs with |u| ≤ 1 (the ramp is left out of the stability experiment) */
export const BOUNDED_KINDS: InKind[] = ['step', 'pulse', 'exp', 'sin', 'cos', 'square', 'custom'];

export function inputFn(k: InKind, custom?: Fn): Fn {
  switch (k) {
    case 'step': return (t) => (t >= 0 ? 1 : 0);
    case 'pulse': return (t) => (t >= 0 && t < 2 ? 1 : 0);
    case 'exp': return (t) => (t >= 0 ? Math.exp(-t) : 0);
    case 'sin': return (t) => (t >= 0 ? Math.sin(2 * t) : 0);
    case 'cos': return (t) => Math.cos(t);
    case 'square': return (t) => (((Math.floor(t / 2) % 2) + 2) % 2 === 0 ? 1 : -1);
    case 'ramp': return (t) => (t >= 0 ? t : 0);
    case 'custom': return custom ?? (() => 0);
  }
}

/** smooth bump (raised cosine) on [c0, c1], zero elsewhere */
export const bump = (c0: number, c1: number): Fn => (t) => (t <= c0 || t >= c1 ? 0 : 0.5 * (1 - Math.cos((2 * Math.PI * (t - c0)) / (c1 - c0))));

export const sample = (u: Fn, g: Grid) => Float64Array.from({ length: g.n + 1 }, (_, k) => u(g.a + k * DT));

/* ------------------------------------------------------------------ comparisons */
const supAbs = (y: ArrayLike<number>, from = 0, to = y.length - 1) => {
  let m = 0;
  for (let k = from; k <= to; k++) {
    const v = Math.abs(y[k]);
    if (!(v <= m)) m = v; // NaN and ∞ propagate
  }
  return m;
};
const differs = (a: number, b: number, scale: number) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return !(a === b);
  return Math.abs(a - b) > 1e-6 * (1 + scale);
};
export interface Compare {
  /** largest difference */
  d: number;
  /** instants where the two curves differ (first and last), or null */
  first: number | null;
  last: number | null;
}
/** compares two arrays on the indices accepted by `use` */
export function compare(a: ArrayLike<number>, b: ArrayLike<number>, g: Grid, use: (t: number) => boolean = () => true): Compare {
  const scale = Math.max(supAbs(a), supAbs(b));
  const sc = Number.isFinite(scale) ? scale : 0;
  let d = 0, first: number | null = null, last: number | null = null;
  for (let k = 0; k <= g.n; k++) {
    const t = g.a + k * DT;
    if (!use(t)) continue;
    if (differs(a[k], b[k], sc)) {
      const dd = Math.abs(a[k] - b[k]);
      d = Number.isFinite(dd) ? Math.max(d, dd) : Infinity;
      if (first === null) first = t;
      last = t;
    }
  }
  return { d, first, last };
}

/* ------------------------------------------------------------------ experiments */
export function linearityExp(run: Run, u1: Fn, u2: Fn, A: number, B: number) {
  const g = gridOf(...WIN);
  const uc: Fn = (t) => A * u1(t) + B * u2(t);
  const y1 = run(u1, g), y2 = run(u2, g);
  const lhs = run(uc, g);
  const rhs = y1.map((v, k) => A * v + B * y2[k]);
  return { g, u1: sample(u1, g), u2: sample(u2, g), uc: sample(uc, g), y1, y2, lhs, rhs, cmp: compare(lhs, rhs, g) };
}

export function invarianceExp(run: Run, u: Fn, tau0: number) {
  const tau = snap(tau0);
  const g = gridOf(...WIN);
  const us: Fn = (t) => u(t - tau);
  const y = run(u, g);
  const yOfShifted = run(us, g);
  const yShifted = run(u, { a: g.a - tau, n: g.n }); // y(t − τ) on the same instants
  return { g, tau, u: sample(u, g), us: sample(us, g), y, yOfShifted, yShifted, cmp: compare(yOfShifted, yShifted, g) };
}

export function causalityExp(run: Run, u: Fn, t10: number) {
  const t1 = snap(t10);
  const g = gridOf(...WIN);
  const d = bump(t1, t1 + 2);
  const ub: Fn = (t) => u(t) + d(t);
  const ya = run(u, g), yb = run(ub, g);
  return { g, t1, ua: sample(u, g), ub: sample(ub, g), ya, yb, before: compare(ya, yb, g, (t) => t < t1) };
}

export const MEM_HALF = 0.5;
export function memoryExp(run: Run, u: Fn, c0: number) {
  const c = snap(c0);
  const g = gridOf(...WIN);
  const lo = c - MEM_HALF, hi = c + MEM_HALF;
  const ub: Fn = (t) => u(t) + bump(lo, hi)(t);
  const ya = run(u, g), yb = run(ub, g);
  const m = 2 * DT;
  return { g, c, lo, hi, ua: sample(u, g), ub: sample(ub, g), ya, yb, before: compare(ya, yb, g, (t) => t < lo - m), after: compare(ya, yb, g, (t) => t > hi + m) };
}

export function stabilityExp(run: Run, u: Fn) {
  const g = gridOf(...BIBO_WIN);
  const us = sample(u, g);
  const y = run(u, g);
  const M = supAbs(us);
  const Y = supAbs(y);
  const k0 = Math.round(-g.a / DT), kh = Math.round((g.n + k0) / 2);
  const s1 = supAbs(y, k0, kh), s2 = supAbs(y, kh, g.n);
  const grows = !Number.isFinite(Y) || (s2 > 1.5 * s1 + 1e-9 && s2 > 1e-6);
  return { g, u: us, y, M, Y, grows };
}

/* ------------------------------------------------------------------ automatic tests for y = f(u, t) */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Numerical verdicts for a memoryless system y(t) = f(u(t), t). Causal and memoryless by construction. */
export function battery(f: (v: number, t: number) => number): Record<Prop, boolean> {
  const r = prng(12345);
  const U = (lo: number, hi: number) => lo + (hi - lo) * r();
  let linear = true, ti = true;
  for (let i = 0; i < 400 && (linear || ti); i++) {
    const v1 = U(-3, 3), v2 = U(-3, 3), t = U(-5, 5), A = U(-2, 2), B = U(-2, 2);
    const l = f(A * v1 + B * v2, t), rr = A * f(v1, t) + B * f(v2, t);
    if (differs(l, rr, Math.max(Math.abs(l), Math.abs(rr)) || 0)) linear = false;
    const t2 = U(-5, 5);
    const a = f(v1, t), b = f(v1, t2);
    if (differs(a, b, Math.max(Math.abs(a), Math.abs(b)) || 0)) ti = false;
  }
  let stable = true;
  for (const M of [1, 3]) {
    let s1 = 0, s2 = 0;
    for (let i = 0; i <= 400; i++) {
      const v = -M + (2 * M * i) / 400;
      for (let j = 0; j <= 200; j++) {
        const a = Math.abs(f(v, -10 + j / 10)), b = Math.abs(f(v, -1000 + 10 * j));
        if (!(a <= s1)) s1 = a;
        if (!(b <= s2)) s2 = b;
      }
    }
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || s2 > 1e6 || s2 > 10 * s1 + 1) stable = false;
  }
  return { linear, ti, causal: true, memoryless: true, stable };
}

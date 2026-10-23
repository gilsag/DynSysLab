// Convolution y = u * h by quadrature, plus the step (Duhamel I) and impulse (Duhamel II) decompositions.
import type { Signal } from './signals';

/** Composite Simpson on [a, b] with at least `n` panels, splitting at the breakpoints. */
function integrate(f: (x: number) => number, a: number, b: number, breaks: number[], n = 400): number {
  if (!(b > a)) return 0;
  const cuts = [a, ...breaks.filter((x) => x > a && x < b).sort((p, q) => p - q), b];
  let s = 0;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const lo = cuts[i], hi = cuts[i + 1];
    const m = Math.max(2, 2 * Math.ceil((n * (hi - lo)) / (b - a) / 2));
    const h = (hi - lo) / m;
    // evaluate just inside the ends so one-sided limits are used at jumps
    const eps = 1e-12 * Math.max(1, Math.abs(lo), Math.abs(hi));
    let acc = f(lo + eps) + f(hi - eps);
    for (let k = 1; k < m; k++) acc += (k % 2 ? 4 : 2) * f(lo + k * h);
    s += (h / 3) * acc;
  }
  return s;
}

/** y(t) = ∫ u(τ) h(t − τ) dτ, regular part plus impulse terms. Impulse·impulse terms are returned separately. */
export function convAt(u: Signal, h: Signal, t: number, n = 600): number {
  const a = Math.max(u.sup[0], t - h.sup[1]);
  const b = Math.min(u.sup[1], t - h.sup[0]);
  let y = 0;
  if (b > a && (u.imp.length === 0 || u.sup[0] !== u.sup[1]) && (h.imp.length === 0 || h.sup[0] !== h.sup[1])) {
    const br = [...u.breaks, ...h.breaks.map((x) => t - x)];
    y += integrate((tau) => u.f(tau) * h.f(t - tau), a, b, br, n);
  }
  for (const i of u.imp) y += i.w * h.f(t - i.t);
  for (const i of h.imp) y += i.w * u.f(t - i.t);
  return y;
}

/** Impulses of y when both u and h contain impulses. */
export function convImpulses(u: Signal, h: Signal) {
  return u.imp.flatMap((a) => h.imp.map((b) => ({ t: a.t + b.t, w: a.w * b.w })));
}

/** Instants where the expression of y changes: sums of the support ends (and breakpoints) of u and h. */
export function segmentBreaks(u: Signal, h: Signal): number[] {
  const eu = [...new Set([u.sup[0], u.sup[1], ...u.breaks])].filter(Number.isFinite);
  const eh = [...new Set([h.sup[0], h.sup[1], ...h.breaks, ...h.imp.map((i) => i.t)])].filter(Number.isFinite);
  const out = new Set<number>();
  for (const x of eu) for (const y of eh) out.add(+(x + y).toPrecision(10));
  return [...out].sort((p, q) => p - q);
}

/** Step response g(t) = ∫_{−∞}^{t} h, sampled on the grid ts (cumulative Simpson by pieces). */
export function stepResponse(h: Signal, ts: number[]): number[] {
  return ts.map((t) => {
    let g = 0;
    const a = h.sup[0];
    if (t > a) g += integrate(h.f, a, Math.min(t, h.sup[1]), h.breaks, 300);
    for (const i of h.imp) if (t >= i.t) g += i.w;
    return g;
  });
}

/** Step approximation of u on [a, b] with n steps: instants τ_k and increments. */
export function stepDecomposition(u: Signal, a: number, b: number, n: number) {
  const dt = (b - a) / n;
  const taus = Array.from({ length: n + 1 }, (_, k) => a + k * dt);
  const vals = taus.map((x, k) => (k === n ? 0 : u.f(x + 1e-12)));
  const inc = vals.map((v, k) => v - (k ? vals[k - 1] : 0));
  return { taus, inc, dt };
}

/** Impulse approximation: areas u(τ_k)Δτ at the centres of n pulses. */
export function impulseDecomposition(u: Signal, a: number, b: number, n: number) {
  const dt = (b - a) / n;
  const taus = Array.from({ length: n }, (_, k) => a + (k + 0.5) * dt);
  return { taus, areas: taus.map((x) => u.f(x) * dt), dt };
}

/** Samples a signal on t_k = k·dt, k = 0…N (impulses become spikes of area w). */
export function sample(s: Signal, dt: number, N: number): Float64Array {
  const v = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) v[k] = s.f(k * dt);
  for (const i of s.imp) {
    const k = Math.round(i.t / dt);
    if (k >= 0 && k <= N) v[k] += i.w / dt;
  }
  return v;
}

/** Discrete causal convolution of sampled signals (trapezoidal weights). */
export function convSampled(a: Float64Array, b: Float64Array, dt: number): Float64Array {
  const N = a.length - 1;
  const y = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) {
    let s = 0;
    for (let i = 0; i <= k; i++) s += (i === 0 || i === k ? 0.5 : 1) * a[i] * b[k - i];
    y[k] = s * dt;
  }
  return y;
}

/** Sampled causal signal: regular part on the grid plus Dirac impulses (index, weight) kept apart. */
export interface Sampled {
  v: Float64Array;
  imp: { k: number; w: number }[];
}

export function sampleSig(s: Signal, dt: number, N: number): Sampled {
  const v = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) v[k] = s.f(k * dt);
  const imp = s.imp.map((i) => ({ k: Math.round(i.t / dt), w: i.w })).filter((i) => i.k >= 0 && i.k <= N);
  return { v, imp };
}

function mergeImp(list: { k: number; w: number }[]): { k: number; w: number }[] {
  const m = new Map<number, number>();
  for (const i of list) m.set(i.k, (m.get(i.k) ?? 0) + i.w);
  return [...m].filter(([, w]) => w !== 0).map(([k, w]) => ({ k, w })).sort((a, b) => a.k - b.k);
}

/** a ∗ b with impulses handled exactly: δ ∗ g shifts g, δ ∗ δ stays an impulse. */
export function convS(a: Sampled, b: Sampled, dt: number): Sampled {
  const N = a.v.length - 1;
  const v = convSampled(a.v, b.v, dt);
  for (const i of a.imp) for (let k = i.k; k <= N; k++) v[k] += i.w * b.v[k - i.k];
  for (const i of b.imp) for (let k = i.k; k <= N; k++) v[k] += i.w * a.v[k - i.k];
  const imp: { k: number; w: number }[] = [];
  for (const i of a.imp) for (const j of b.imp) if (i.k + j.k <= N) imp.push({ k: i.k + j.k, w: i.w * j.w });
  return { v, imp: mergeImp(imp) };
}

export function addS(a: Sampled, b: Sampled): Sampled {
  return { v: a.v.map((x, i) => x + b.v[i]), imp: mergeImp([...a.imp, ...b.imp]) };
}

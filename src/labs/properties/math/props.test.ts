import { describe, expect, it } from 'vitest';
import { battery, BOUNDED_KINDS, causalityExp, inputFn, invarianceExp, linearityExp, memoryExp, stabilityExp, SYSTEMS } from './systems';
import { classify, discretePeriodPi, sigFn } from './signals';

const step = inputFn('step'), sin = inputFn('sin'), pulse = inputFn('pulse');

describe('catalogue experiments agree with the theory', () => {
  for (const s of SYSTEMS) {
    it(s.id, () => {
      // linearity: a step and a sinusoid, with a = 2, b = 0.5
      const L = linearityExp(s.run, step, sin, 2, 0.5);
      expect(L.cmp.first === null).toBe(s.props.linear);
      // time invariance: a pulse shifted by 2
      const T = invarianceExp(s.run, pulse, 2);
      expect(T.cmp.first === null).toBe(s.props.ti);
      // causality: perturbation after t1 = 2
      const C = causalityExp(s.run, step, 2);
      expect(C.before.first === null).toBe(s.props.causal);
      // memory: a bump around t = 3 (the derivative's memory is infinitesimal: not detectable)
      const M = memoryExp(s.run, step, 3);
      const noMem = M.before.first === null && M.after.first === null;
      expect(noMem).toBe(s.props.memoryless || s.id === 'derivative');
      // stability: a step (the derivative's impulse is not detectable as growth)
      const B = stabilityExp(s.run, step);
      expect(!B.grows).toBe(s.props.stable || s.id === 'derivative');
    });
  }
  it('bounded inputs are bounded by 1', () => {
    for (const k of BOUNDED_KINDS.filter((k) => k !== 'custom')) {
      const B = stabilityExp(SYSTEMS[0].run, inputFn(k));
      expect(B.M).toBeLessThanOrEqual(1);
    }
  });
});

describe('numerical battery for y = f(u, t)', () => {
  it('detects the properties', () => {
    expect(battery((v) => 3 * v)).toMatchObject({ linear: true, ti: true, stable: true });
    expect(battery((v) => v * v)).toMatchObject({ linear: false, ti: true, stable: true });
    expect(battery((v, t) => t * v)).toMatchObject({ linear: true, ti: false, stable: false });
    expect(battery((v, t) => v * Math.sin(t))).toMatchObject({ linear: true, ti: false, stable: true });
    expect(battery((v) => 1 / v)).toMatchObject({ linear: false, stable: false });
    expect(battery((v) => Math.exp(v))).toMatchObject({ linear: false, ti: true, stable: true });
  });
});

describe('signals', () => {
  const p = { a: -1, w: 2, phi: 0, eps: 0.2 };
  it('classifies', () => {
    expect(classify('step', p, sigFn('step', p))).toMatchObject({ causal: true, even: false, cls: 'power', power: 0.5 });
    expect(classify('cos', p, sigFn('cos', p))).toMatchObject({ causal: false, even: true, odd: false, cls: 'power' });
    expect(classify('cos', { ...p, phi: 90 }, sigFn('cos', { ...p, phi: 90 }))).toMatchObject({ even: false, odd: true });
    expect(classify('exp', p, sigFn('exp', p))).toMatchObject({ cls: 'energy', energy: 0.5 });
    expect(classify('ramp', p, sigFn('ramp', p)).cls).toBe('neither');
    const e = classify('dampcos', p, sigFn('dampcos', p)).energy!;
    // ∫ e^{-2t} cos²(2t) dt by the trapezoid rule
    let s = 0;
    for (let k = 0; k < 400000; k++) { const t = k * 1e-4; s += Math.exp(-2 * t) * Math.cos(2 * t) ** 2 * 1e-4; }
    expect(e).toBeCloseTo(s - 0.5e-4, 4);
  });
  it('ramp products', () => {
    const num = (f: (t: number) => number) => { let s = 0; for (let k = 0; k < 600000; k++) { const t = (k + 0.5) * 1e-4; s += f(t) ** 2 * 1e-4; } return s; };
    for (const q of [{ ...p, a: -1, w: 2 }, { ...p, a: -0.7, w: 0 }, { ...p, a: -2, w: 5 }]) {
      for (const k of ['texp', 'tdampcos'] as const) {
        const c = classify(k, q, sigFn(k, q));
        expect(c.cls).toBe('energy');
        expect(c.energy!).toBeCloseTo(num(sigFn(k, q)), 4);
        expect(c.causal).toBe(true);
      }
    }
    expect(classify('tcos', p, sigFn('tcos', p)).cls).toBe('neither');
    expect(classify('texp', { ...p, a: 0.2 }, sigFn('texp', { ...p, a: 0.2 })).cls).toBe('neither');
  });
  it('discrete periods', () => {
    expect(discretePeriodPi(1, 4).N).toBe(8); // π/4
    expect(discretePeriodPi(3, 5).N).toBe(10); // 3π/5
    expect(discretePeriodPi(2, 1).N).toBe(1); // 2π
    expect(discretePeriodPi(0, 3).N).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { formulas, fromPoles, freq, freqSpecs, horizon, impulse, measured, poles, rlc, rlcFor, step } from './second';

describe('canonical second-order system', () => {
  it('poles for every damping and back', () => {
    for (const z of [0, 0.3, 1, 2.5]) {
      const p = poles(z, 3);
      const r = fromPoles(p.p1, p.p2);
      expect(r.wn).toBeCloseTo(3, 9);
      expect(r.z).toBeCloseTo(z, 9);
    }
  });
  it('step response starts at 0 with zero slope and tends to 1', () => {
    for (const z of [0.2, 1, 3]) {
      expect(step(z, 2, 0)).toBeCloseTo(0, 12);
      expect((step(z, 2, 1e-5) - step(z, 2, 0)) / 1e-5).toBeCloseTo(0, 3);
      expect(step(z, 2, 60)).toBeCloseTo(1, 6);
    }
  });
  it('impulse response is the derivative of the step response', () => {
    for (const z of [0, 0.4, 1, 1.8]) for (const t of [0.3, 1.1, 2.7]) {
      const d = (step(z, 1.5, t + 1e-6) - step(z, 1.5, t - 1e-6)) / 2e-6;
      expect(impulse(z, 1.5, t)).toBeCloseTo(d, 5);
    }
  });
  it('measured overshoot, peak time and rise time match the formulas', () => {
    const z = 0.3, wn = 2;
    const f = formulas(z, wn, 0.02, '0-100');
    const m = measured(z, wn, 0.02, '0-100', 20, 40000);
    expect(m.Mp).toBeCloseTo(f.Mp, 5);
    expect(m.tp).toBeCloseTo(f.tp, 3);
    expect(m.tr).toBeCloseTo(f.tr, 3);
    expect(f.Mp).toBeCloseTo(0.3723, 4);
  });
  it('settling-time formula is close to the measured value for small ζ', () => {
    const f = formulas(0.1, 1, 0.02, '0-100');
    const m = measured(0.1, 1, 0.02, '0-100', 80, 40000);
    expect(Math.abs(m.ts - f.ts) / f.ts).toBeLessThan(0.12);
  });
  it('resonance peak and bandwidth', () => {
    const z = 0.2, wn = 1;
    const { Mr, wr, wb } = freqSpecs(z, wn);
    expect(freq(z, wn, wr).mag).toBeCloseTo(Mr, 9);
    expect(freq(z, wn, wb).mag).toBeCloseTo(Math.SQRT1_2, 9);
    expect(freq(z, wn, wn).ph).toBeCloseTo(-90, 9);
    expect(freqSpecs(0.8, 1).Mr).toBe(1);
  });
  it('series RLC mapping is invertible', () => {
    const { z, wn } = rlc(2, 1, 0.25);
    expect(wn).toBeCloseTo(2, 12);
    expect(z).toBeCloseTo(0.5, 12);
    const back = rlcFor(z, wn, 0.25);
    expect(back.L).toBeCloseTo(1, 12);
    expect(back.R).toBeCloseTo(2, 12);
  });
});

describe('10–90 % rise time', () => {
  it('fit within a few percent for 0.2 ≤ ζ ≤ 0.8', () => {
    for (const z of [0.2, 0.5, 0.8]) {
      const f = formulas(z, 1, 0.02, '10-90').tr;
      const m = measured(z, 1, 0.02, '10-90', 30, 30000).tr;
      expect(Math.abs(f - m) / m).toBeLessThan(0.05);
    }
  });
});

describe('settling with real poles', () => {
  it('critically damped, ωn = 2: the 2 % band is reached at t ≈ 2.917 s within the horizon', () => {
    const T = horizon(1, 2);
    expect(T).toBeGreaterThan(2.917);
    const m = measured(1, 2, 0.02, '0-100', 2 * T, 12000);
    expect(m.ts).toBeCloseTo(2.917, 2);
  });
  it('overdamped ζ = 2: settling is measured too', () => {
    const m = measured(2, 2, 0.02, '0-100', 2 * horizon(2, 2), 12000);
    expect(Number.isFinite(m.ts)).toBe(true);
  });
});

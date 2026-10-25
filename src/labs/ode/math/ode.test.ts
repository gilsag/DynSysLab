import { describe, expect, it } from 'vitest';
import { timeValue, atZero } from '@shared/pfe';
import { classical, gain, parseCoeffs, solve, transientSteady, type Input } from './ode';

const step: Input = { kind: 'step', A: 1, a: 1, w: 1, phi: 0 };
const v = (x: Parameters<typeof timeValue>[0], t: number) => timeValue(x, t);

describe('linear ODE response', () => {
  it('parses coefficients highest power first', () => {
    expect(parseCoeffs('1 3 2')).toEqual([2, 3, 1]);
    expect(parseCoeffs('0,5 1')).toEqual([1, 0.5]);
  });
  it('first order with initial condition: y = 1 + (y0 − 1)e^{−t/2}', () => {
    const s = solve([0.5, 1], [0.5], step, [2]);
    for (const t of [0.5, 2, 5]) expect(v(s.x, t)).toBeCloseTo(1 + Math.exp(-0.5 * t), 9);
    // zero-input and zero-state
    for (const t of [0.5, 2]) {
      expect(v(s.xzi, t)).toBeCloseTo(2 * Math.exp(-0.5 * t), 9);
      expect(v(s.xzs, t)).toBeCloseTo(1 - Math.exp(-0.5 * t), 9);
    }
    // classical: particular = 1, homogeneous = e^{−t/2}
    const c = classical(s);
    expect(v(c.part, 3)).toBeCloseTo(1, 9);
    expect(v(c.hom, 0)).toBeCloseTo(1, 9);
  });
  it('second order with initial conditions matches the classical solution', () => {
    // y'' + 3y' + 2y = 2u, y(0) = 1, y'(0) = 0, step: y = 1 + 0·e^{−t} …
    const s = solve([2, 3, 1], [2], step, [1, 0]);
    // y − 1 satisfies the homogeneous equation with (y−1)(0) = 0, (y−1)'(0) = 0 → y ≡ 1
    for (const t of [0.3, 1, 4]) expect(v(s.x, t)).toBeCloseTo(1, 9);
  });
  it('sinusoidal steady state is A|H(jω)| cos(ωt + φ + ∠H)', () => {
    const u: Input = { kind: 'cos', A: 2, a: 1, w: 1.5, phi: 30 };
    const q = [4, 0.4, 1], p = [4];
    const s = solve(q, p, u, [0, 0]);
    const ss = transientSteady(s.x).ss;
    const H = gain(q, p, [0, 1.5]);
    const amp = 2 * Math.hypot(H[0], H[1]), ph = Math.atan2(H[1], H[0]) + Math.PI / 6;
    for (const t of [0, 1.1, 3]) expect(v(ss, t)).toBeCloseTo(amp * Math.cos(1.5 * t + ph), 8);
  });
  it('resonance: (D² + 4)y = u with u = cos 2t gives t sin(2t)/4', () => {
    const s = solve([4, 0, 1], [1], { kind: 'cos', A: 1, a: 1, w: 2, phi: 0 }, [0, 0]);
    expect(s.resonance).toBe(1);
    for (const t of [0.5, 2, 7]) expect(v(s.x, t)).toBeCloseTo((t * Math.sin(2 * t)) / 4, 8);
    const c = classical(s);
    for (const t of [1, 3]) expect(v(c.part, t)).toBeCloseTo((t * Math.sin(2 * t)) / 4, 8);
    expect(transientSteady(s.x).unstable).toBe(true);
  });
  it('a zero in P(D) makes y jump at t = 0 with a step input', () => {
    // y' + y = u' + u … wait: (D+1)y = (D+2)u → y(0⁺) = y(0⁻) + 1
    const s = solve([1, 1], [2, 1], step, [0]);
    expect(atZero(s.x)).toBeCloseTo(1, 9);
  });
  it('triple root: (D + 1)³ y = u, step → 1 − e^{−t}(1 + t + t²/2)', () => {
    const s = solve([1, 3, 3, 1], [1], step, [0, 0, 0]);
    for (const t of [0.5, 2]) expect(v(s.x, t)).toBeCloseTo(1 - Math.exp(-t) * (1 + t + (t * t) / 2), 6);
  });
});

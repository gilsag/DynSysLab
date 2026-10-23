import { describe, expect, it } from 'vitest';
import { fit, makeBasis } from './approx';

const half = (t: number) => (t >= 0 && t <= 1 ? 2 * Math.PI * Math.sin(Math.PI * t) : 0);

describe('apunte 07', () => {
  it('section 11: semi-sine pulse with three pulses gives C = 3, 6, 3 and IEC = 2π² − 18', () => {
    const r = fit(half, makeBasis('pulses', 3, 0, 1), 0, 1);
    expect(r.C[0]).toBeCloseTo(3, 10);
    expect(r.C[1]).toBeCloseTo(6, 10);
    expect(r.C[2]).toBeCloseTo(3, 10);
    expect(r.iec).toBeCloseTo(2 * Math.PI ** 2 - 18, 8);
    expect(r.uu).toBeCloseTo(2 * Math.PI ** 2, 8);
    expect(r.orthogonal).toBe(true);
    const one = fit(half, makeBasis('pulses', 1, 0, 1), 0, 1);
    expect(one.C[0]).toBeCloseTo(4, 10);
    expect(one.iec).toBeCloseTo(2 * Math.PI ** 2 - 16, 8);
  });
  it('section 5: the staircase signal is reproduced without error', () => {
    const u = (t: number) => (t < 0 ? 0 : t < 1 ? 1 : t < 2 ? 2 : t < 3 ? 1 : 0);
    const r = fit(u, makeBasis('pulses', 3, 0, 3), 0, 3);
    expect(r.C.map((c) => +c.toFixed(10))).toEqual([1, 2, 1]);
    expect(r.iec).toBeLessThan(1e-20);
    // steps span the same subspace: coefficients are the increments
    const s = fit(u, makeBasis('steps', 3, 0, 3), 0, 3);
    expect(s.C.map((c) => +c.toFixed(8))).toEqual([1, 1, -1]);
    expect(s.orthogonal).toBe(false);
    expect(s.iec).toBeLessThan(1e-18);
  });
  it('trigonometric basis gives the Fourier coefficients of a square wave', () => {
    const sq = (t: number) => (t < 0.5 ? 1 : -1);
    const r = fit(sq, makeBasis('trig', 7, 0, 1), 0, 1, [0.5]);
    expect(r.orthogonal).toBe(true);
    expect(r.C[0]).toBeCloseTo(0, 10);
    expect(r.C[2]).toBeCloseTo(4 / Math.PI, 8); // sin(ω0 t)
    expect(r.C[6]).toBeCloseTo(4 / (3 * Math.PI), 8); // sin(3ω0 t)
  });
  it('monomials and Legendre polynomials give the same approximation; only Legendre is orthogonal', () => {
    const u = (t: number) => Math.exp(t);
    const m = fit(u, makeBasis('mono', 5, -1, 1), -1, 1);
    const l = fit(u, makeBasis('legendre', 5, -1, 1), -1, 1);
    expect(Math.abs(m.iec - l.iec)).toBeLessThan(1e-12);
    expect(l.orthogonal).toBe(true);
    expect(m.orthogonal).toBe(false);
    expect(m.cond).toBeGreaterThan(30 * l.cond); // 358 vs 9 for n = 5
  });
});

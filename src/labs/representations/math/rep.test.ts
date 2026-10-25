import { describe, expect, it } from 'vitest';
import { expand, timeValue } from '@shared/pfe';
import { feedback, mul, radd, rat, reduce, rmul } from '@shared/poly';
import { ccf, impulseSS, minimal, ocf, stepSS, tfOf } from './rep';

const ev = (f: { num: number[]; den: number[] }, s: number) => f.num.reduceRight((r, c) => r * s + c, 0) / f.den.reduceRight((r, c) => r * s + c, 0);

describe('equivalent representations', () => {
  const P = [3, 1], Q = [2, 3, 1]; // (s + 3)/(s² + 3s + 2)
  it('both canonical forms give back H(s)', () => {
    for (const ss of [ccf(P, Q), ocf(P, Q)]) {
      const { H } = tfOf(ss);
      for (const s of [0.4, 1.7, 3]) expect(ev(H, s)).toBeCloseTo(ev({ num: P, den: Q }, s), 10);
    }
  });
  it('biproper H(s) puts the direct term in D', () => {
    const ss = ccf([1, 2, 1], [2, 3, 1]); // (s² + 2s + 1)/(s² + 3s + 2)
    expect(ss.D).toBe(1);
    expect(ev(tfOf(ss).H, 2.2)).toBeCloseTo(ev({ num: [1, 2, 1], den: [2, 3, 1] }, 2.2), 10);
  });
  it('state-space step response equals the inverse Laplace of H(s)/s', () => {
    const ss = ocf(P, Q);
    const y = stepSS(ss, 5, 500);
    const x = expand(reduce({ num: P, den: mul(Q, [0, 1]) }));
    for (const k of [50, 200, 500]) expect(y[k]).toBeCloseTo(timeValue(x, (5 * k) / 500), 8);
  });
  it('a non-minimal realization loses a mode in H(s)', () => {
    // pole at −2 is cancelled by a zero at −2
    const ss = { A: [[-1, 0], [0, -2]], B: [1, 1], C: [1, 0], D: 0 };
    const m = minimal(ss);
    expect(m.cancelled).toBe(true);
    expect(m.H.den.length - 1).toBe(1);
  });
  it('block-diagram algebra: overlapping loops by moving a pickoff point', () => {
    const G1 = rat([1], [1, 1]), G2 = rat([2], [0, 1]), G3 = rat([1], [2, 1]), H1 = rat([1]), H2 = rat([0.5]);
    // after moving the pickoff: inner loop G2G3 with H2, outer loop G1·inner with H1/G3
    const inner = feedback(rmul(G2, G3), H2);
    const step2 = feedback(rmul(G1, inner), rmul(H1, { num: G3.den, den: G3.num }));
    // closed form G1G2G3/(1 + G2G3H2 + G1G2H1)
    const g123 = rmul(rmul(G1, G2), G3);
    const den = radd(radd(rat([1]), rmul(rmul(G2, G3), H2)), rmul(rmul(G1, G2), H1));
    const closed = { num: mul(g123.num, den.den), den: mul(g123.den, den.num) };
    for (const s of [0.3, 1.5, 4]) expect(ev(step2, s)).toBeCloseTo(ev(closed, s), 10);
  });
});

describe('impulse response', () => {
  it('C e^{At} B matches the inverse transform of H(s)', () => {
    const P = [3, 1], Q = [2, 3, 1];
    const x = expand(reduce({ num: P, den: Q }));
    for (const ss of [ccf(P, Q), ocf(P, Q)]) {
      const y = impulseSS(ss, 5, 100);
      for (const k of [0, 10, 37, 100]) expect(y[k]).toBeCloseTo(timeValue(x, (5 * k) / 100), 9);
    }
  });
});

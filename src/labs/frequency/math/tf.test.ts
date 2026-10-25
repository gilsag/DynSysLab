import { describe, expect, it } from 'vitest';
import { closedLoopPoles, counts, encirclements, factorsOf } from './tf';
import type { SystemDef } from './types';

describe('Nyquist criterion', () => {
  it('counts a right-half-plane conjugate pair as two poles', () => {
    // H(s) = 4s/(s² − 2s + 2): K_B = 2, zero at 0, poles 1 ± j; closed loop s² + 2s + 2 is stable
    const sys: SystemDef = {
      roots: [{ id: 'p', kind: 'pole', re: 1, im: 1 }, { id: 'z', kind: 'zero', re: 0, im: 0 }],
      gainMode: 'bode', gainDb: 20 * Math.log10(2), gainNeg: false, delay: 0,
    };
    const c = counts(sys);
    expect(c.rhpP).toBe(2);
    const N = encirclements(sys, factorsOf(sys), -3, 3);
    expect(N).toBe(-2);
    expect(N! + c.rhpP).toBe(0);
    for (const p of closedLoopPoles(sys)) expect(p.re).toBeLessThan(0);
  });
});

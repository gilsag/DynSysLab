import { describe, expect, it } from 'vitest';
import { build, H_KINDS } from './signals';
import { impulseResponse, parseCoeffs, roots } from './ode';
import { convAt, convS, sampleSig, segmentBreaks, stepDecomposition, stepResponse } from './conv';

const W: [number, number] = [-1, 6];

describe('apunte 07, §10: RC circuit and a rectangular pulse', () => {
  const A = 1.5, Tp = 1, RC = 0.25;
  const u = build({ kind: 'pulse', p: { A, T: Tp, d: 0 } }, W);
  const h = build({ kind: 'rc', p: { RC, d: 0 } }, W);
  it('matches A(1 − e^{−t/RC}) during the pulse and the free decay after it', () => {
    for (const t of [0.1, 0.5, 0.99]) expect(convAt(u, h, t)).toBeCloseTo(A * (1 - Math.exp(-t / RC)), 6);
    for (const t of [1.2, 2]) expect(convAt(u, h, t)).toBeCloseTo(A * (Math.exp(-(t - Tp) / RC) - Math.exp(-t / RC)), 6);
    expect(convAt(u, h, -0.3)).toBe(0);
  });
  it('agrees with the superposition A g(t) − A g(t − T_p)', () => {
    const [g1, g2] = stepResponse(h, [1.7, 0.7]);
    expect(convAt(u, h, 1.7)).toBeCloseTo(A * g1 - A * g2, 6);
  });
  it('segments change at the sums of the support ends', () => {
    expect(segmentBreaks(u, h)).toEqual([0, 1]);
  });
});

describe('apunte 07, §11: RC = 1 s and the half-sine pulse', () => {
  const u = build({ kind: 'halfsine', p: { A: 2 * Math.PI, T: 1, d: 0 } }, W);
  const h = build({ kind: 'rc', p: { RC: 1, d: 0 } }, W);
  it('y(1) ≈ 2.484 and the maximum 2.658 near t ≈ 0.86', () => {
    expect(convAt(u, h, 1)).toBeCloseTo((2 * Math.PI ** 2 * (1 + Math.exp(-1))) / (1 + Math.PI ** 2), 6);
    let best = 0, tb = 0;
    for (let t = 0.7; t < 1; t += 0.001) { const y = convAt(u, h, t); if (y > best) { best = y; tb = t; } }
    expect(best).toBeCloseTo(2.658, 3);
    expect(tb).toBeCloseTo(0.86, 2);
  });
  it('three-step staircase of the notes gives y_f(1) ≈ 2.506 (with interval means)', () => {
    // the notes use the optimal pulse heights 3, 6, 3 → increments +3, +3, −3, −3
    const g = (t: number) => (t > 0 ? 1 - Math.exp(-t) : 0);
    const yf = 3 * (g(1) + g(1 - 1 / 3) - g(1 - 2 / 3) - g(0));
    expect(yf).toBeCloseTo(2.506, 3);
    const s = stepDecomposition(u, 0, 1, 3);
    expect(s.taus.length).toBe(4);
  });
});

describe('impulses', () => {
  it('a delayed impulse delays the input (pure delay)', () => {
    const u = build({ kind: 'halfsine', p: { A: 1, T: 1, d: 0 } }, W);
    const h = build({ kind: 'impulse', p: { w: 1, c: 0.5 } }, W);
    expect(convAt(u, h, 1)).toBeCloseTo(Math.sin(Math.PI * 0.5), 12);
  });
});

describe('impulse responses of linear ODE systems', () => {
  it('(D² + 3D + 2) y = 2u gives h = 2(e^{-t} − e^{-2t})', () => {
    const r = impulseResponse([1, 3, 2], [2], 10)!;
    for (const t of [0, 0.3, 1, 2.5, 6]) expect(r.f(t)).toBeCloseTo(2 * (Math.exp(-t) - Math.exp(-2 * t)), 5);
    expect(r.D).toBe(0);
    expect(r.slow).toBeCloseTo(1, 6);
  });
  it('biproper system splits off D·δ(t): (D + 1) y = (2D + 3) u → 2δ + e^{-t}', () => {
    const r = impulseResponse([1, 1], [2, 3], 8)!;
    expect(r.D).toBeCloseTo(2, 12);
    for (const t of [0, 0.5, 2]) expect(r.f(t)).toBeCloseTo(Math.exp(-t), 6);
  });
  it('rejects improper systems', () => {
    expect(impulseResponse([1, 1], [1, 0, 0], 5)).toBeNull();
  });
  it('oscillatory roots and parsing', () => {
    const z = roots([1, 2, 5]).sort((a, b) => a[1] - b[1]);
    expect(z[0][0]).toBeCloseTo(-1, 9);
    expect(z[0][1]).toBeCloseTo(-2, 9);
    expect(parseCoeffs('1 0,5 ; 2')).toEqual([1, 0.5, 2]);
    expect(parseCoeffs('1 x')).toBeNull();
  });
  it('second-order kind matches the ODE for every damping', () => {
    for (const zeta of [0.3, 1, 2.5]) {
      const wn = 3;
      const s = build({ kind: 'second', p: { wn, zeta, d: 0 } }, [0, 8]);
      const r = impulseResponse([1, 2 * zeta * wn, wn * wn], [wn * wn], 8)!;
      for (const t of [0.1, 0.7, 2]) expect(s.f(t)).toBeCloseTo(r.f(t), 4);
    }
  });
  it('pulse into an integrator: ramp up to Tp, then a plateau', () => {
    const u = build({ kind: 'pulse', p: { A: 1, T: 1, d: 0 } }, [0, 4]);
    const h = build({ kind: 'integrator', p: { K: 1 } }, [0, 4]);
    expect(convAt(u, h, 0.5)).toBeCloseTo(0.5, 6);
    expect(convAt(u, h, 3)).toBeCloseTo(1, 6);
  });
  it('the h catalogue only lists realizable responses', () => {
    for (const k of ['pulse', 'ramp', 'tri', 'halfsine', 'custom', 'step'] as const) expect(H_KINDS).not.toContain(k);
  });
});

describe('sampled cascade with impulses', () => {
  it('2δ + e^{-t} in cascade with δ(t − 1) keeps the impulse and shifts the rest', () => {
    const dt = 0.01, N = 400;
    const a = sampleSig(build({ kind: 'ode', p: {}, q: '1 1', pn: '2 3' }, [0, 4]), dt, N);
    const b = sampleSig(build({ kind: 'impulse', p: { w: 1, c: 1 } }, [0, 4]), dt, N);
    const c = convS(a, b, dt);
    expect(c.imp).toEqual([{ k: 100, w: 2 }]);
    expect(c.v[150]).toBeCloseTo(Math.exp(-0.5), 4);
    expect(c.v[50]).toBe(0);
  });
});

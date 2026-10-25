import { describe, expect, it } from 'vitest';
import { buildNetwork, circuitDef, type CircuitId } from './circuits';
import { meshSystem, nodalOutput, nodalSystem, solve } from './network';
import { atZero, expand, finalValue, initialValueTheorem, timeValue } from '@shared/pfe';
import { add, mul, reduce, roots } from '@shared/poly';
import { transform, type InputDef } from './inputs';

function response(id: CircuitId, values: number[] | null, ics: number[], out: string | null, u: InputDef) {
  const def = circuitDef(id);
  const net = buildNetwork(def, values ?? def.ladder.map((e) => e.def), ics);
  const sys = nodalSystem(net);
  const order = def.ladder.filter((e) => e.kind !== 'R').length;
  const sol = solve(sys, nodalOutput(net, sys, out ?? def.output), order);
  const U = transform(u);
  const F = reduce({ num: add(mul(sol.raw.numU, U.num), mul(sol.raw.numIC, U.den)), den: mul(sol.raw.den, U.den) });
  return { net, sol, F, x: expand(F) };
}
const step: InputDef = { kind: 'step', A: 1, w: 1, a: 1 };
const none: InputDef = { kind: 'none', A: 0, w: 1, a: 1 };

describe('circuits in the Laplace domain', () => {
  it('RC with a step and an initial voltage: v_C = 1 − (1 − v0)e^{−t/RC}', () => {
    const { sol, x } = response('rc', [2, 0.5], [0, 0.3], null, step);
    expect(sol.H.num[0] / sol.H.den[0]).toBeCloseTo(1, 9); // DC gain 1
    for (const t of [0.1, 1, 3]) expect(timeValue(x, t)).toBeCloseTo(1 - 0.7 * Math.exp(-t), 8);
    expect(atZero(x)).toBeCloseTo(0.3, 9);
    expect(finalValue(x)).toEqual({ status: 'ok', value: expect.closeTo(1, 9) });
  });
  it('series RLC step response matches the closed form (ζ = 0.5, ωn = 2)', () => {
    const { x, sol } = response('rlcSeries', [2, 1, 0.25], [0, 0, 0], null, step);
    expect(roots(sol.charPoly).every((r) => Math.abs(Math.hypot(r[0], r[1]) - 2) < 1e-9)).toBe(true);
    const z = 0.5, wn = 2, wd = wn * Math.sqrt(1 - z * z);
    for (const t of [0.3, 1, 2.5]) {
      const exact = 1 - (Math.exp(-z * wn * t) / Math.sqrt(1 - z * z)) * Math.sin(wd * t + Math.acos(z));
      expect(timeValue(x, t)).toBeCloseTo(exact, 8);
    }
  });
  it('critically damped series RLC has a double pole and the right response', () => {
    const { x } = response('rlcSeries', [2, 1, 1], [0, 0, 0], null, step); // ωn = 1, ζ = 1
    expect(x.clusters.some((c) => c.m === 2)).toBe(true);
    for (const t of [0.5, 2]) expect(timeValue(x, t)).toBeCloseTo(1 - Math.exp(-t) * (1 + t), 6);
  });
  it('nodal and mesh formulations agree (two-mesh RLC: current in R1)', () => {
    const def = circuitDef('twoMesh');
    const net = buildNetwork(def, def.ladder.map((e) => e.def), [0, 1, 0, 0.5]);
    const ns = nodalSystem(net);
    const nodal = solve(ns, nodalOutput(net, ns, 'i:0'), 2);
    const ms = meshSystem(net);
    // mesh current I_1 is the current in R_1
    const mesh = solve(ms, { c: ms.ids.map((j): Record<number, number> => (j === 1 ? { 0: 1 } : {})), dU: {}, dIC: {} }, 2);
    for (const s of [0.7, 2.3, 5]) {
      const ev = (f: { num: number[]; den: number[] }) => f.num.reduceRight((r, c) => r * s + c, 0) / f.den.reduceRight((r, c) => r * s + c, 0);
      expect(ev(nodal.H)).toBeCloseTo(ev(mesh.H), 9);
      expect(ev(nodal.Yci)).toBeCloseTo(ev(mesh.Yci), 9);
    }
  });
  it('inductor initial current in the RL circuit decays with τ = L/R', () => {
    const { x } = response('rl', [2, 1], [0, 0.5], 'i:1', none);
    for (const t of [0.2, 1]) expect(timeValue(x, t)).toBeCloseTo(0.5 * Math.exp(-2 * t), 9);
  });
  it('initial-value theorem agrees with the expression at 0⁺', () => {
    const { F, x } = response('rlcSeries', [2, 1, 0.25], [0.4, 1, -0.2], 'i:1', step);
    expect(initialValueTheorem(F)).toBeCloseTo(atZero(x), 9);
    expect(atZero(x)).toBeCloseTo(1, 9); // i_L(0⁺) = i_L(0⁻) (ics are per element: R, L, C)
  });
  it('a sinusoidal input gives no final value', () => {
    const { x } = response('rc', null, [0, 0], null, { kind: 'sin', A: 1, w: 2, a: 1 });
    expect(finalValue(x).status).toBe('osc');
  });
  it('Butterworth LC filter: poles on the unit circle and DC gain 1/2', () => {
    const { sol } = response('lc3', null, [0, 0, 0, 0, 0], null, step);
    for (const r of roots(sol.H.den)) expect(Math.hypot(r[0], r[1])).toBeCloseTo(1, 8);
    expect(sol.H.num[0] / sol.H.den[0]).toBeCloseTo(0.5, 9);
  });
  it('parallel RLC driven by a current: voltage impulse response', () => {
    const { sol } = response('rlcParallel', [2, 1, 0.25], [0, 0, 0], null, step);
    // Z(s) = 1/(1/R + 1/(sL) + sC) = (s/C)/(s² + s/(RC) + 1/(LC))
    const H = sol.H;
    const s = 1.3;
    const ev = (p: number[]) => p.reduceRight((r, c) => r * s + c, 0);
    expect(ev(H.num) / ev(H.den)).toBeCloseTo(1 / (1 / 2 + 1 / s + s * 0.25), 9);
  });
});

describe('symbolic right-hand sides', () => {
  it('signs of the initial-condition terms match their values', () => {
    const def = circuitDef('rlcSeries');
    const net = buildNetwork(def, [2, 1, 0.25], [0, 1, -0.5]);
    const ns = nodalSystem(net);
    const node3 = ns.ids.indexOf(3);
    expect(ns.bIC[node3].val[0]).toBeCloseTo(-0.125, 12); // + C v_C(0⁻)
    expect(ns.bIC[node3].terms.find((t) => t.sym.includes('v_{C}'))?.sign).toBe(1);
    const ms = meshSystem(net);
    expect(ms.bIC[0].val[0]).toBeCloseTo(1, 12); // + L i_L(0⁻)
    expect(ms.bIC[0].terms.find((t) => t.sym.includes('i_{L}'))?.sign).toBe(1);
    expect(ms.bIC[0].terms.find((t) => t.sym.includes('v_{C}'))?.sign).toBe(-1); // − v_C(0⁻)/s
  });
});

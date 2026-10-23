import { describe, it, expect } from 'vitest';
import { eigenvalues, tfSISO } from '../math/ss';
import { CIRCUITS, circuitSystem, defaultCircuit, restoreCircuit, type CircuitId } from '../circuits';

const sys = (id: CircuitId, output?: string, p?: Record<string, number>) =>
  circuitSystem({ ...defaultCircuit, id, output: { ...defaultCircuit.output, ...(output ? { [id]: output } : {}) } }, p);
const sorted = (A: number[][]) => eigenvalues(A).map((z) => [z.re, z.im]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

describe('example circuits', () => {
  it('every output has matching dimensions', () => {
    for (const c of CIRCUITS) {
      const p = Object.fromEntries(c.params.map((q) => [q.key, q.def]));
      const { A, B } = c.ss(p);
      expect(A.length).toBe(c.states.length);
      expect(B.length).toBe(c.states.length);
      for (const o of c.outputs(p)) {
        expect(o.C.every((r) => r.length === c.states.length)).toBe(true);
        expect(o.D.length).toBe(o.C.length);
        expect(o.names.length).toBe(o.C.length);
      }
    }
  });
  it('RC: pole −1/RC; v_R output has D = 1 and a zero at the origin', () => {
    const s = sys('rc', 'vR', { R: 2, C: 0.5 });
    expect(s.ss.A[0][0]).toBeCloseTo(-1, 12);
    expect(s.ss.D[0][0]).toBe(1);
    const tf = tfSISO(s.ss.A, s.ss.B.map((r) => r[0]), s.ss.C[0], s.ss.D[0][0]);
    expect(Math.abs(tf.num[0])).toBeLessThan(1e-12); // numerator s + 0
  });
  it('series RLC: ωn = 1/√(LC), ζ = (R/2)√(C/L)', () => {
    const s = sys('rlcSeries', 'vC', { R: 2, L: 1, C: 0.25 });
    const [[re, im]] = sorted(s.ss.A);
    expect(Math.hypot(re, im)).toBeCloseTo(2, 9);
    expect(-re / 2).toBeCloseTo(0.5, 9);
  });
  it('two-mesh RLC keeps the earlier matrices', () => {
    const s = sys('rlc2');
    expect(s.ss.A).toEqual([[-1, -10], [1, -8]]);
  });
  it('RC ladder: two distinct negative real poles', () => {
    const e = sorted(sys('rcLadder').ss.A);
    expect(Math.abs(e[0][1]) + Math.abs(e[1][1])).toBeLessThan(1e-9);
    expect(e[0][0]).toBeCloseTo(-(3 + Math.sqrt(5)) / 2, 9);
    expect(e[1][0]).toBeCloseTo(-(3 - Math.sqrt(5)) / 2, 9);
  });
  it('third-order LC filter with the default values is Butterworth', () => {
    const e = sorted(sys('lc3').ss.A);
    for (const [re, im] of e) expect(Math.hypot(re, im)).toBeCloseTo(1, 8);
    expect(e.some(([re, im]) => Math.abs(re + 1) < 1e-8 && Math.abs(im) < 1e-8)).toBe(true);
  });
  it('restores the single-circuit state saved by earlier versions', () => {
    const c = restoreCircuit({ R1: 10, R2: 3, C: 0.1, L: 1, output: 'both', locus: 'R2' });
    expect(c.id).toBe('rlc2');
    expect(c.p.rlc2.R2).toBe(3);
    expect(c.output.rlc2).toBe('all');
    expect(circuitSystem(c).ss.C).toEqual([[1, 0], [0, 1]]);
  });
});

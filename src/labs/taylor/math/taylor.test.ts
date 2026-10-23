import { describe, expect, it } from 'vitest';
import { compile, parse } from '@shared/expr';
import { equilibria, type Sys } from './system';
import { estimateRadius, partialSum, residual, validRange } from './scalar';
import { taylor } from '@shared/expr';

const sys = (f1: string, f2: string, u = 0): Sys => {
  const v = ['x1', 'x2', 'u'];
  const n1 = parse(f1, v);
  const n2 = parse(f2, v);
  return { n1, n2, f1: compile(n1), f2: compile(n2), u };
};

describe('apunte 06, sección 6: equilibria and their classification', () => {
  it('representation B', () => {
    const s = sys('x2', '-(3 + cos(x1))*x2 - 3*sin(x1) + x1^2 + u');
    const eq = equilibria(s, { x1: [-2, 3.5], x2: [-3, 3] });
    expect(eq.length).toBe(2);
    expect(eq[0].x[0]).toBeCloseTo(0, 9);
    expect(eq[0].kind).toBe('stableNode');
    expect(eq[0].eig.re[0]).toBeCloseTo(-1, 9);
    expect(eq[0].eig.re[1]).toBeCloseTo(-3, 9);
    expect(eq[1].x[0]).toBeCloseTo(1.7221251, 6);
    expect(eq[1].kind).toBe('saddle');
    expect(eq[1].eig.tr).toBeCloseTo(-2.84925, 5);
    expect(eq[1].eig.det).toBeCloseTo(-3.89651, 5);
    expect(eq[1].eig.re[0]).toBeCloseTo(1.00973, 5);
    expect(eq[1].eig.re[1]).toBeCloseTo(-3.85897, 5);
  });
  it('representation A gives the same equilibria and eigenvalues', () => {
    const s = sys('-3*x1 + x2^2 + u', 'x1 - sin(x2)');
    const eq = equilibria(s, { x1: [-1, 2.5], x2: [-1.5, 3] });
    expect(eq.length).toBe(2);
    expect(eq[1].x[0]).toBeCloseTo(0.98857, 5);
    expect(eq[1].x[1]).toBeCloseTo(1.72213, 5);
    expect(eq[1].A[0][1]).toBeCloseTo(3.44425, 5);
    expect(eq[1].A[1][1]).toBeCloseTo(0.15075, 5);
    expect(eq[1].eig.re[0]).toBeCloseTo(1.00973, 5);
    expect(eq[0].kind).toBe('stableNode');
  });
  it('a centre of the linearization is reported as undecided', () => {
    const eq = equilibria(sys('x2', '-x1 - x1^2*x2'), { x1: [-2, 2], x2: [-2, 2] });
    expect(eq.length).toBe(1);
    expect(eq[0].kind).toBe('undecided');
  });
});

describe('apunte 06, secciones 1–3', () => {
  it('radius of convergence', () => {
    const r = (s: string, a: number) => estimateRadius(parse(s, ['x']), a);
    expect(r('1/(1-x)', 0)).toBeCloseTo(1, 6);
    expect(r('1/x', 1)).toBeCloseTo(1, 6);
    expect(Math.abs(r('ln(x)', 1) - 1)).toBeLessThan(0.05);
    expect(r('exp(x)', 0)).toBe(Infinity);
    expect(r('sin(x)', 0)).toBe(Infinity);
    expect(r('x^3 - 2x', 1)).toBe(Infinity);
    expect(Math.abs(r('atan(x)', 0) - 1)).toBeLessThan(0.05);
    expect(Math.abs(r('sqrt(x)', 4) - 4)).toBeLessThan(0.2);
  });
  it('√4,001 by the tangent line, with its error and bound', () => {
    const n = parse('sqrt(x)', ['x']);
    const c = taylor(n, 4, 1);
    const approx = partialSum(c, 4, 1, 4.001);
    expect(approx).toBeCloseTo(2.00025, 12);
    expect(Math.abs(approx - Math.sqrt(4.001))).toBeCloseTo(1.5625e-8, 10);
    const res = residual(n, compile(n), 4, 4, 4.001, 100);
    expect(res.bound[100]).toBeCloseTo((1 / 64) * 1e-6, 12);
  });
  it('sin δ ≈ δ: 1 % relative error near 14°, 5 % near 31°', () => {
    const n = parse('sin(x)', ['x']);
    const res = residual(n, compile(n), 0, -1.2, 1.2, 4800);
    const deg = (x: number) => (x * 180) / Math.PI;
    expect(Math.round(deg(validRange(res, 0, 0.01, true).hi))).toBe(14);
    expect(Math.round(deg(validRange(res, 0, 0.05, true).hi))).toBe(31);
  });
});

import { describe, it, expect } from 'vitest';
import { modal, tfSISO, ctrb, obsv, coAnalysis, ccf, simulate, modalContributions, gramianC, transform } from '../math/ss';
import { expm, det, rank } from '../math/linalg';
import { cx } from '../math/complex';
import { polyFromRoots, polyRoots, cleanRoots } from '../math/poly';

const close = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b)).toBeLessThan(tol);
const closeM = (A: number[][], B: number[][], tol = 1e-8) => A.forEach((r, i) => r.forEach((v, j) => close(v, B[i][j], tol)));

describe('Variables de estado', () => {
  it('caso A: valores propios reales y base modal', () => {
    const md = modal([[-1, -10], [1, -8]]);
    expect(md.ok).toBe(true);
    closeM(md.T, [[5, 2], [1, 1]]);
    closeM(md.J, [[-3, 0], [0, -6]]);
  });
  it('caso B: bloque real del par complejo', () => {
    const md = modal([[-1, -10], [1, -3]]);
    closeM(md.T, [[3, 1], [0, 1]]);
    closeM(md.J, [[-2, -3], [3, -2]]);
  });
  it('función de transferencia del circuito', () => {
    const tf = tfSISO([[-1, -10], [1, -8]], [1, 0], [1, 0], 0);
    closeM([tf.num], [[8, 1]]);
    closeM([tf.den], [[18, 9, 1]]);
  });
  it('Jordan en forma controlable con polo doble', () => {
    const s = ccf({ num: [1], den: polyFromRoots([cx(-1), cx(-1)]) });
    const md = modal(s.A, [cx(-1), cx(-1)]);
    expect(md.ok).toBe(true);
    expect(md.diagonalizable).toBe(false);
    closeM(md.J, [[-1, 1], [0, -1]]);
  });
  it('Jordan complejo', () => {
    const r = [cx(-1, 2), cx(-1, -2), cx(-1, 2), cx(-1, -2)];
    const s = ccf({ num: [1], den: polyFromRoots(r) });
    const md = modal(s.A, r);
    expect(md.ok).toBe(true);
    expect(md.blocks[0].kind).toBe('jordan-complex');
    closeM(md.J, [[-1, -2, 1, 0], [2, -1, 0, 1], [0, 0, -1, -2], [0, 0, 2, -1]], 1e-6);
  });
  it('raíces con multiplicidad', () => {
    const pp = polyFromRoots([cx(-2), cx(-2), cx(-2), cx(-1, 1), cx(-1, -1)]);
    const r = cleanRoots(polyRoots(pp), 1e-6, pp);
    expect(r.filter((z) => Math.abs(z.re + 2) < 1e-9 && z.im === 0).length).toBe(3);
  });
  it('expm diagonal y suma modal', () => {
    const E = expm([[-1, 0], [0, -2]]);
    closeM(E, [[Math.exp(-1), 0], [0, Math.exp(-2)]], 1e-12);
    const A = [[-1, -10], [1, -3]];
    const sim = simulate({ A, B: [[1], [0]], C: [[1, 0]], D: [[0]] }, [1, 1], () => [0], 3, 300);
    const md = modal(A);
    const contrib = modalContributions(md, [1, 1], sim.t);
    sim.t.forEach((_, k) => {
      const s0 = contrib.reduce((a, c) => a + c.x[k][0], 0);
      close(s0, sim.x[k][0], 1e-8);
    });
    // nota: x(t) del caso A con x0 = [1,1]
    const simA = simulate({ A: [[-1, -10], [1, -8]], B: [[1], [0]], C: [[1, 0]], D: [[0]] }, [1, 1], () => [0], 1, 100);
    close(simA.x[100][0], (-5 / 3) * Math.exp(-3) + (8 / 3) * Math.exp(-6), 1e-9);
  });
});

describe('Controlabilidad y observabilidad', () => {
  it('controlabilidad y observabilidad del circuito', () => {
    const A = [[-1, -10], [1, -8]];
    closeM(ctrb(A, [[1], [0]]), [[1, -1], [0, 1]]);
    closeM(obsv(A, [[1, 0]]), [[1, 0], [-1, -10]]);
  });
  it('RC no controlable', () => {
    const s = { A: [[-1, 0], [0, -2]], B: [[1], [0]], C: [[1, 1]], D: [[0]] };
    const co = coAnalysis(s, modal(s.A));
    expect(co.rankC).toBe(1);
    expect(co.rankO).toBe(2);
    expect(co.minimalOrder).toBe(1);
    const m2 = co.modes.find((m) => m.lambda.re === -2)!;
    expect(m2.controllable).toBe(false);
    close(m2.cosC!, 0);
  });
  it('cancelación polo-cero hace no observable la forma controlable', () => {
    const tf = { num: polyFromRoots([cx(-1)]), den: polyFromRoots([cx(-1), cx(-2)]) };
    const s = ccf(tf);
    const co = coAnalysis(s, modal(s.A, [cx(-1), cx(-2)]));
    expect(co.rankC).toBe(2);
    expect(co.rankO).toBe(1);
    expect(co.modes.find((m) => m.lambda.re === -1)!.observable).toBe(false);
  });
  it('gramiano', () => {
    const W = gramianC([[-1]], [[1]], 50);
    close(W[0][0], 0.5, 1e-9);
    const W2 = gramianC([[-1, 0], [0, -2]], [[1], [0]], 10);
    close(W2[1][1], 0, 1e-12);
  });
  it('transformación preserva valores propios', () => {
    const s = { A: [[-1, -10], [1, -8]], B: [[1], [0]], C: [[1, 0]], D: [[0]] };
    const z = transform(s, [[2, 1], [0.5, 3]])!;
    close(det(z.A), 18, 1e-9);
    expect(rank(ctrb(z.A, z.B))).toBe(2);
  });
  it('orden alto: la forma controlable sigue siendo controlable y mínima', () => {
    const P = [cx(-3), cx(-6), cx(-3.5, 3.3), cx(-3.5, -3.3), cx(-3.5, 1.6), cx(-3.5, -1.6), cx(-3.5, 0.9), cx(-3.5, -0.9)];
    const s = ccf({ num: polyFromRoots([cx(-8)]), den: polyFromRoots(P) });
    const co = coAnalysis(s, modal(s.A, P));
    expect(co.rankC).toBe(8);
    expect(co.rankO).toBe(8);
    expect(co.minimalOrder).toBe(8);
    expect(co.modes.every((m) => m.controllable && m.observable)).toBe(true);
    // con un cero sobre un polo se pierde exactamente un modo observable
    const s2 = ccf({ num: polyFromRoots([cx(-6)]), den: polyFromRoots(P) });
    const co2 = coAnalysis(s2, modal(s2.A, P));
    expect(co2.rankC).toBe(8);
    expect(co2.rankO).toBe(7);
    expect(co2.minimalOrder).toBe(7);
    expect(co2.modes.filter((m) => !m.observable).map((m) => m.lambda.re)).toEqual([-6]);
  });
});

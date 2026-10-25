import { describe, expect, it } from 'vitest';
import { evalAt, factorsOf, margins, polys } from './tf';
import { simulate } from './sim';
import type { Root, SystemDef } from './types';

let nid = 0;
const R = (kind: 'pole' | 'zero', re: number, im = 0): Root => ({ id: `r${nid++}`, kind, re, im });
const evalPoly = (c: number[], wr: number, wi: number) => { let re = 0, im = 0; for (let k = c.length - 1; k >= 0; k--) { const nr = re * wr - im * wi + c[k]; const ni = re * wi + im * wr; re = nr; im = ni; } return [re, im]; };
function direct(sys: SystemDef, w: number) {
  const { num, den } = polys(sys);
  const [nr, ni] = evalPoly(num, 0, w), [dr, di] = evalPoly(den, 0, w);
  const d2 = dr * dr + di * di;
  let re = (nr * dr + ni * di) / d2, im = (ni * dr - nr * di) / d2;
  const a = -w * sys.delay; const c = Math.cos(a), s = Math.sin(a);
  [re, im] = [re * c - im * s, re * s + im * c];
  return { mag: 20 * Math.log10(Math.hypot(re, im)), ph: Math.atan2(im, re) * 180 / Math.PI };
}
const wrap = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

describe('frequency response checks', () => {
  const cases: SystemDef[] = [
    { roots: [R('pole', -1), R('pole', -2, 3), R('zero', 2)], gainMode: 'bode', gainDb: 6, gainNeg: false, delay: 0 },
    { roots: [R('pole', 1, 1), R('zero', 0)], gainMode: 'bode', gainDb: 6.0206, gainNeg: false, delay: 0 },
    { roots: [R('pole', 0), R('pole', -1), R('zero', -3, 2)], gainMode: 'lead', gainDb: 0, gainNeg: true, delay: 0.3 },
    { roots: [R('pole', 2), R('pole', -5), R('zero', 1, 4)], gainMode: 'lead', gainDb: 10, gainNeg: false, delay: 0 },
    { roots: [R('pole', 0, 2), R('pole', -1)], gainMode: 'bode', gainDb: -3, gainNeg: true, delay: 0 },
  ];
  it('Bode factors match direct evaluation of H(jω)', () => {
    for (const sys of cases) {
      const f = factorsOf(sys);
      for (const w of [0.013, 0.37, 1.9, 7.3, 55]) {
        const a = evalAt(f, w), b = direct(sys, w);
        if (!Number.isFinite(b.mag)) continue;
        expect(a.mag).toBeCloseTo(b.mag, 6);
        expect(Math.abs(wrap(a.ph - b.ph))).toBeLessThan(1e-6);
      }
    }
  });
  it('margins of 10/(s+1)³', () => {
    const sys: SystemDef = { roots: [R('pole', -1), R('pole', -1), R('pole', -1)], gainMode: 'lead', gainDb: 20, gainNeg: false, delay: 0 };
    const m = margins(factorsOf(sys), -2, 2);
    expect(m.gm!).toBeCloseTo(-20 * Math.log10(10 / 8), 2);
  });
  it('step response final value equals H(0)', () => {
    const sys: SystemDef = { roots: [R('pole', -1), R('pole', -2, 3), R('zero', -4)], gainMode: 'bode', gainDb: 6, gainNeg: false, delay: 0.2 };
    const r = simulate(sys, 'step', 30, 3000);
    expect(r.y[r.y.length - 1]).toBeCloseTo(10 ** (6 / 20), 4);
  });
});

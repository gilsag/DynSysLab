import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples';
import { coeffString, parseCoeffs } from './coeffs';

const ev = (f: { num: number[]; den: number[] }, s: number) => f.num.reduceRight((r, c) => r * s + c, 0) / f.den.reduceRight((r, c) => r * s + c, 0);
type V = Record<string, { num: number[]; den: number[] }>;

describe('reduction examples', () => {
  it('numeric results match the final formulas', () => {
    const closed: Record<string, (v: V, s: number) => number> = {
      seriesParallel: (v, s) => (ev(v.G_1, s) + ev(v.G_3, s)) * ev(v.G_2, s),
      feedback: (v, s) => ev(v.G, s) / (1 + ev(v.G, s) * ev(v.H, s)),
      feedforward: (v, s) => { const g = (ev(v.G_1, s) + ev(v.K, s)) * ev(v.G_2, s); return g / (1 + g * ev(v.H, s)); },
      nested: (v, s) => { const g = ev(v.G_1, s) * ev(v.G_2, s) * ev(v.G_3, s); return g / (1 + ev(v.G_2, s) * ev(v.H_1, s) + g * ev(v.H_2, s)); },
      moving: (v, s) => { const g = ev(v.G_1, s) * ev(v.G_2, s) * ev(v.G_3, s); return g / (1 + ev(v.G_2, s) * ev(v.G_3, s) * ev(v.H_2, s) + ev(v.G_1, s) * ev(v.G_2, s) * ev(v.H_1, s)); },
      movingSum: (v, s) => { const g = ev(v.G_1, s) * ev(v.G_2, s) * ev(v.G_3, s); return g / (1 + ev(v.G_1, s) * ev(v.G_2, s) * ev(v.H_1, s) + ev(v.G_2, s) * ev(v.G_3, s) * ev(v.H_2, s)); },
    };
    for (const ex of EXAMPLES) {
      const v = Object.fromEntries(ex.values);
      const r = ex.result(v);
      for (const s of [0.7, 2.1]) expect(ev(r, s)).toBeCloseTo(closed[ex.id](v, s), 10);
    }
  });
  it('every loop joins nodes that exist in its chain', () => {
    for (const ex of EXAMPLES) for (const st of ex.stages) {
      const ids = new Set(st.chain.nodes.flatMap((n) => (n.k === 'block' ? [] : [n.id])));
      for (const l of st.chain.loops) { expect(ids.has(l.from)).toBe(true); expect(ids.has(l.to)).toBe(true); }
    }
  });
  it('coefficient strings round-trip', () => {
    expect(parseCoeffs('1 3 2')).toEqual([2, 3, 1]);
    expect(coeffString([2, 3, 1])).toBe('1 3 2');
    expect(parseCoeffs('0,5')).toEqual([0.5]);
    expect(parseCoeffs('a')).toBeNull();
  });
});

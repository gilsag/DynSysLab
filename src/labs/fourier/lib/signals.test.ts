import { describe, expect, it } from 'vitest';
import { SIGNALS } from './signals';

// compare coded coefficients C_k = a_k − j b_k with a direct numerical integral of evaluate(t)
describe('Fourier coefficients', () => {
  it('coded coefficients match the time-domain definitions', () => {
    const report: string[] = [];
    for (const s of SIGNALS) {
      if (!s.evaluate) continue;
      const params = Object.fromEntries((s.params ?? []).map((p) => [p.key, p.def]));
      const ctx = { params, f0: 220, custom: null };
      const c = s.coeffs(ctx);
      const M = 200000;
      const x = Array.from({ length: M }, (_, i) => s.evaluate!((i + 0.5) / M, ctx));
      for (const k of [0, 1, 2, 3, 5]) {
        let re = 0, im = 0;
        for (let i = 0; i < M; i++) { const t = (i + 0.5) / M; re += x[i] * Math.cos(2 * Math.PI * k * t); im += x[i] * Math.sin(2 * Math.PI * k * t); }
        const a = k === 0 ? re / M : (2 * re) / M, b = k === 0 ? 0 : (2 * im) / M;
        const cr = c.re[k] ?? 0, ci = c.im[k] ?? 0;
        if (Math.abs(cr - a) > 2e-3 || Math.abs(ci + b) > 2e-3) report.push(`${s.id} k=${k}: coded ${cr.toFixed(4)} ${ci.toFixed(4)}  numeric a=${a.toFixed(4)} b=${b.toFixed(4)}`);
      }
    }
    expect(report.length).toBe(0);
  });
});

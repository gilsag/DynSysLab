// Coefficient strings ↔ polynomials (ascending order, as in shared/poly).
import type { Poly } from '@shared/poly';

/** "1 3 2" → ascending coefficients [2, 3, 1]. */
export function parseCoeffs(s: string): Poly | null {
  const parts = s.trim().split(/[\s;]+/).filter(Boolean);
  if (!parts.length) return null;
  const v = parts.map((x) => parseFloat(x.replace(',', '.').replace('−', '-')));
  if (v.some((x) => !Number.isFinite(x))) return null;
  while (v.length > 1 && v[0] === 0) v.shift();
  return v.reverse();
}

/** ascending coefficients → "1 3 2" */
export const coeffString = (p: Poly) => [...p].reverse().map((v) => String(+v.toPrecision(6))).join(' ');

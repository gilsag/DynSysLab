// Formato numérico y generación de TeX
import { C } from './math/complex';
import { Poly } from './math/poly';
import { Mat } from './math/linalg';

export type Lang = 'es' | 'en' | 'pt' | 'fr' | 'it' | 'de';
let currentLang: Lang = 'es';
export const setFormatLang = (l: Lang) => (currentLang = l);
const comma = () => currentLang !== 'en';

export function round(x: number, sig = 4): number {
  if (!isFinite(x)) return x;
  if (Math.abs(x) < 1e-10) return 0;
  const p = Math.pow(10, sig - 1 - Math.floor(Math.log10(Math.abs(x))));
  const r = Math.round(x * p) / p;
  return Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r;
}

/** Número para texto plano (con coma decimal salvo inglés). */
export function fmt(x: number, sig = 4): string {
  if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '—';
  const r = round(x, sig);
  if (r === 0) return '0';
  const a = Math.abs(r);
  let s: string;
  if (a >= 1e5 || a < 1e-3) {
    const [m, e] = r.toExponential(Math.max(0, sig - 2)).split('e');
    const sup: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    s = `${String(+m)}·10${String(+e).split('').map((c) => sup[c] ?? c).join('')}`;
  }
  else s = String(r);
  if (comma()) s = s.replace('.', ',');
  return s.replace('-', '−');
}

/** Número para TeX. */
export function tn(x: number, sig = 4): string {
  if (!isFinite(x)) return x > 0 ? '\\infty' : x < 0 ? '-\\infty' : '\\text{—}';
  const r = round(x, sig);
  if (r === 0) return '0';
  const a = Math.abs(r);
  if (a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = round(r / Math.pow(10, e), sig);
    return `${dec(String(m))}\\cdot 10^{${e}}`;
  }
  return dec(String(r));
}
const dec = (s: string) => (comma() ? s.replace('.', '{,}') : s);

/** Fracción "bonita" si x es racional simple (denominador ≤ 12). */
export function tnFrac(x: number): string {
  if (Math.abs(x - Math.round(x)) < 1e-9) return tn(x);
  for (let d = 2; d <= 12; d++) {
    const nmr = x * d;
    if (Math.abs(nmr - Math.round(nmr)) < 1e-9) {
      const k = Math.round(nmr);
      return `${k < 0 ? '-' : ''}\\tfrac{${Math.abs(k)}}{${d}}`;
    }
  }
  return tn(x);
}

export function texMatrix(M: Mat, frac = false): string {
  if (!M.length || !M[0].length) return '[\\;]';
  const f = frac ? tnFrac : (v: number) => tn(v);
  return `\\begin{bmatrix}${M.map((r) => r.map(f).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
}

export function texComplex(z: C, sig = 4): string {
  const re = round(z.re, sig), im = round(z.im, sig);
  if (im === 0) return tn(re, sig);
  const ims = Math.abs(im) === 1 ? 'j' : `j${tn(Math.abs(im), sig)}`;
  if (re === 0) return `${im < 0 ? '-' : ''}${ims}`;
  return `${tn(re, sig)} ${im < 0 ? '-' : '+'} ${ims}`;
}

export function fmtComplex(z: C, sig = 4): string {
  const re = round(z.re, sig), im = round(z.im, sig);
  if (im === 0) return fmt(re, sig);
  const ims = `${fmt(Math.abs(im), sig)}j`;
  if (re === 0) return `${im < 0 ? '−' : ''}${ims}`;
  return `${fmt(re, sig)} ${im < 0 ? '−' : '+'} ${ims}`;
}

/** Polinomio (potencias ascendentes) en TeX, potencias descendentes. */
export function texPoly(p: Poly, v = 's', sig = 4): string {
  const terms: string[] = [];
  for (let k = p.length - 1; k >= 0; k--) {
    const c = round(p[k], sig);
    if (c === 0) continue;
    const a = Math.abs(c);
    const coef = k > 0 && a === 1 ? '' : tn(a, sig);
    const pw = k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`;
    terms.push(`${c < 0 ? '-' : terms.length ? '+' : ''} ${coef}${pw}`);
  }
  return terms.length ? terms.join(' ') : '0';
}

/** Factor (s − r) o par conjugado (s² − 2αs + α² + β²). */
export function texFactors(roots: C[], v = 's'): string {
  const parts: string[] = [];
  const seen: C[] = [];
  for (const z of roots) {
    if (z.im < 0) continue;
    if (z.im === 0) {
      const r = round(z.re);
      parts.push(r === 0 ? v : `(${v} ${r < 0 ? '+' : '-'} ${tn(Math.abs(r))})`);
    } else {
      const b = round(-2 * z.re), c = round(z.re * z.re + z.im * z.im);
      parts.push(`(${v}^2 ${b === 0 ? '' : `${b < 0 ? '-' : '+'} ${tn(Math.abs(b))}${v}`} + ${tn(c)})`);
    }
    seen.push(z);
  }
  // potencias
  const counts = new Map<string, number>();
  parts.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
  return [...counts.entries()].map(([p, k]) => (k > 1 ? `${p}^{${k}}` : p)).join('') || '1';
}

/** Ecuación ẋ_i = Σ a_ij x_j + Σ b_ik u_k */
export function texLinComb(coefs: number[], vars: string[], extra?: { coefs: number[]; vars: string[] }): string {
  const terms: string[] = [];
  const push = (c: number, v: string) => {
    const r = round(c);
    if (r === 0) return;
    const a = Math.abs(r);
    terms.push(`${r < 0 ? '-' : terms.length ? '+' : ''} ${a === 1 ? '' : tn(a)}${v}`);
  };
  coefs.forEach((c, j) => push(c, vars[j]));
  if (extra) extra.coefs.forEach((c, j) => push(c, extra.vars[j]));
  return terms.length ? terms.join(' ') : '0';
}

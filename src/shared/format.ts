// Number formatting shared by the labs: decimal comma in every language except English.
import type { LabLang } from './suite';

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** Plain-text number with `sig` significant digits; scientific form a·10ⁿ outside [1e-3, 1e5). */
export function fmt(x: number, lang: LabLang, sig = 4): string {
  if (Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
  if (x === 0) return '0';
  const comma = lang !== 'en';
  const ax = Math.abs(x);
  let s: string;
  if (ax >= 1e5 || ax < 1e-3) {
    const e = Math.floor(Math.log10(ax));
    let m = x / 10 ** e;
    m = parseFloat(m.toPrecision(Math.max(1, sig - 1)));
    if (Math.abs(m) >= 10) return fmt(x * 1.0000001, lang, sig);
    s = `${String(m)}·10${String(e).split('').map((c) => SUP[c] ?? c).join('')}`;
  } else {
    s = String(parseFloat(x.toPrecision(sig)));
  }
  if (comma) s = s.replace('.', ',');
  return s.replace('-', '−');
}

/** Same number as TeX (decimal comma protected as {,}). */
export function tex(x: number, lang: LabLang, sig = 4): string {
  if (Number.isNaN(x)) return '\\text{—}';
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (ax >= 1e5 || ax < 1e-3) {
    const e = Math.floor(Math.log10(ax));
    const m = parseFloat((x / 10 ** e).toPrecision(Math.max(1, sig - 1)));
    const ms = String(m).replace('.', lang !== 'en' ? '{,}' : '.');
    return `${ms}\\cdot 10^{${e}}`;
  }
  const s = String(parseFloat(x.toPrecision(sig)));
  return lang !== 'en' ? s.replace('.', '{,}') : s;
}

/** Tick labels for canvas plots (short form). */
export function tick(x: number, lang: LabLang): string {
  return fmt(x, lang, 4);
}

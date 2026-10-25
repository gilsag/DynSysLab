// TeX of the nodal and mesh matrices; polynomials, rational functions and expansions come from @shared/rationalTex.
import type { LabLang } from '@shared/suite';
import { makeRationalTex } from '@shared/rationalTex';
import type { Entry, Laurent, LinSystem } from './network';

const SMALL = 1e-10;

export function makeTex(lang: LabLang) {
  const R = makeRationalTex(lang);
  const { n, coefBody, join } = R;
  const laurent = (l: Laurent) => {
    const parts: [string, string][] = [];
    for (const k of [2, 1, 0, -1]) {
      const c = l[k] ?? 0;
      if (Math.abs(c) < SMALL) continue;
      if (k === -1) parts.push([c < 0 ? '-' : '+', `\\frac{${n(Math.abs(c))}}{s}`]);
      else parts.push(coefBody(c, k === 0 ? '' : k === 1 ? 's' : 's^2'));
    }
    return join(parts);
  };
  const nTerms = (l: Laurent) => [2, 1, 0, -1].filter((k) => Math.abs(l[k] ?? 0) >= SMALL).length;

  /** Symbolic entry (sum of element terms). */
  const symEntry = (e: Entry, withU = false) => {
    const ts = e.terms.filter((t) => !!t.u === withU);
    if (!ts.length) return '';
    return ts.map((t, i) => {
      const body = withU ? (t.sym ? `${t.sym}\\,U(s)` : 'U(s)') : t.sym;
      return i === 0 ? (t.sign < 0 ? `-${body}` : body) : ` ${t.sign < 0 ? '-' : '+'} ${body}`;
    }).join('');
  };
  const rhsSym = (u: Entry, ic: Entry) => {
    const a = symEntry(u, true), b = symEntry(ic);
    if (!a && !b) return '0';
    if (!a) return b;
    if (!b) return a;
    return `${a} ${b.startsWith('-') ? '- ' + b.slice(1) : '+ ' + b}`;
  };
  const rhsNum = (u: Entry, ic: Entry) => {
    const parts: string[] = [];
    const k = nTerms(u.val);
    if (k) {
      const lt = laurent(u.val);
      parts.push(k > 1 ? `\\left(${lt}\\right)U(s)` : lt === '1' ? 'U(s)' : lt === '-1' ? '-U(s)' : `${lt}\\,U(s)`);
    }
    if (nTerms(ic.val)) {
      const lt = laurent(ic.val);
      parts.push(parts.length && !lt.startsWith('-') ? `+ ${lt}` : lt);
    }
    return parts.length ? parts.join(' ') : '0';
  };

  const matrixEq = (sys: LinSystem, numeric: boolean) => {
    const M = sys.A.map((r) => r.map((e) => (numeric ? laurent(e.val) : symEntry(e) || '0')).join(' & ')).join(' \\\\ ');
    const x = sys.unknowns.join(' \\\\ ');
    const b = sys.bU.map((u, i) => (numeric ? rhsNum(u, sys.bIC[i]) : rhsSym(u, sys.bIC[i]))).join(' \\\\ ');
    return `\\begin{bmatrix} ${M} \\end{bmatrix} \\begin{bmatrix} ${x} \\end{bmatrix} = \\begin{bmatrix} ${b} \\end{bmatrix}`;
  };


  return { ...R, laurent, matrixEq };
}

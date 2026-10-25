// TeX of polynomials, rational functions, partial-fraction expansions and time functions (decimal comma by language).
import { tex as texNum } from '@shared/format';
import type { LabLang } from '@shared/suite';
import type { Expansion } from './pfe';
import { trim, type Cx, type Poly, type Rational } from './poly';

const SMALL = 1e-10;

export function makeRationalTex(lang: LabLang) {
  const n = (v: number, sig = 4) => texNum(Math.abs(v) < SMALL ? 0 : v, lang, sig);
  const sinName = lang === 'es' || lang === 'pt' || lang === 'it' ? '\\operatorname{sen}' : '\\sin';

  /** a term "coef·x" with sign handling; returns [sign, body] */
  const coefBody = (c: number, x: string): [string, string] => {
    const sg = c < 0 ? '-' : '+';
    const a = Math.abs(c);
    if (!x) return [sg, n(a)];
    return [sg, Math.abs(a - 1) < 1e-12 ? x : `${n(a)}\\,${x}`];
  };
  const join = (parts: [string, string][]) => {
    if (!parts.length) return '0';
    return parts.map(([sg, b], i) => (i === 0 ? (sg === '-' ? `-${b}` : b) : ` ${sg} ${b}`)).join('');
  };

  /** Polynomial in s, highest power first. */
  const poly = (p: Poly, v = 's') => {
    const q = trim(p, 1e-12);
    const parts: [string, string][] = [];
    for (let k = q.length - 1; k >= 0; k--) {
      if (Math.abs(q[k]) < SMALL * Math.max(1, ...q.map(Math.abs))) continue;
      parts.push(coefBody(q[k], k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`));
    }
    return join(parts);
  };
  const rational = (f: Rational) => {
    const num = trim(f.num, 1e-12);
    if (num.every((c) => Math.abs(c) < SMALL)) return '0';
    const den = trim(f.den, 1e-12);
    if (den.length === 1) return poly(num.map((c) => c / den[0]));
    return `\\frac{${poly(num)}}{${poly(den)}}`;
  };

  const cx = (z: Cx) => {
    const re = Math.abs(z[0]) < SMALL ? 0 : z[0], im = Math.abs(z[1]) < SMALL ? 0 : z[1];
    if (im === 0) return n(re);
    if (re === 0) return `${im < 0 ? '-' : ''}j\\,${n(Math.abs(im))}`;
    return `${n(re)} ${im < 0 ? '-' : '+'} j\\,${n(Math.abs(im))}`;
  };
  const sMinus = (p: Cx) => {
    if (Math.abs(p[0]) < SMALL && Math.abs(p[1]) < SMALL) return 's';
    if (Math.abs(p[1]) < SMALL) return `s ${p[0] < 0 ? '+' : '-'} ${n(Math.abs(p[0]))}`;
    return `s - (${cx(p)})`;
  };

  /** Partial-fraction expansion; complex pairs written with conjugate residues. */
  const expansion = (x: Expansion) => {
    const parts: string[] = [];
    x.q.forEach((c, k) => {
      if (Math.abs(c) < SMALL) return;
      parts.push(`${c < 0 ? '-' : '+'} ${k === 0 ? n(Math.abs(c)) : `${n(Math.abs(c))}\\,s${k > 1 ? `^{${k}}` : ''}`}`);
    });
    for (const { p, m, g } of x.clusters) {
      if (p[1] < -SMALL) continue;
      for (let k = 0; k < m; k++) {
        const pw = m - k;
        const den = pw > 1 ? `(${sMinus(p)})^{${pw}}` : sMinus(p);
        if (Math.abs(p[1]) < SMALL) {
          const c = g[k][0];
          if (Math.abs(c) < SMALL) continue;
          parts.push(`${c < 0 ? '-' : '+'} \\frac{${n(Math.abs(c))}}{${den}}`);
        } else {
          const denC = pw > 1 ? `(${sMinus([p[0], -p[1]])})^{${pw}}` : sMinus([p[0], -p[1]]);
          parts.push(`+ \\frac{${cx(g[k])}}{${den}} + \\frac{${cx([g[k][0], -g[k][1]])}}{${denC}}`);
        }
      }
    }
    if (!parts.length) return '0';
    const s = parts.join(' ');
    return s.startsWith('+ ') ? s.slice(2) : s.replace(/^- /, '-');
  };

  /** y(t) for t > 0, with complex pairs as damped cosines and sines. */
  const timeFn = (x: Expansion) => {
    const parts: string[] = [];
    const tPow = (j: number) => (j === 0 ? '' : j === 1 ? 't\\,' : `\\tfrac{t^{${j}}}{${[1, 1, 2, 6, 24, 120][j] ?? j}}\\,`);
    const ex = (a: number) => (Math.abs(a) < SMALL ? '' : Math.abs(Math.abs(a) - 1) < 1e-12 ? `e^{${a < 0 ? '-' : ''}t}` : `e^{${n(a)}t}`);
    for (const { p, m, g } of x.clusters) {
      if (p[1] < -SMALL) continue;
      for (let k = 0; k < m; k++) {
        const j = m - k - 1;
        if (Math.abs(p[1]) < SMALL) {
          const c = g[k][0];
          if (Math.abs(c) < 1e-9) continue;
          const body = `${tPow(j)}${ex(p[0])}`.replace(/\\,$/, '');
          parts.push(`${c < 0 ? '-' : '+'} ${body ? (Math.abs(Math.abs(c) - 1) < 1e-12 ? body : `${n(Math.abs(c))}\\,${body}`) : n(Math.abs(c))}`);
        } else {
          const a = 2 * g[k][0], b = -2 * g[k][1];
          const w = n(p[1]);
          const trig: string[] = [];
          if (Math.abs(a) > 1e-9) trig.push(`${a < 0 ? '-' : '+'} ${Math.abs(Math.abs(a) - 1) < 1e-12 ? '' : n(Math.abs(a))}\\cos(${w}\\,t)`);
          if (Math.abs(b) > 1e-9) trig.push(`${b < 0 ? '-' : '+'} ${Math.abs(Math.abs(b) - 1) < 1e-12 ? '' : `${n(Math.abs(b))}\\,`}${sinName}(${w}\\,t)`);
          if (!trig.length) continue;
          let inner = trig.join(' ');
          inner = inner.startsWith('+ ') ? inner.slice(2) : inner.replace(/^- /, '-');
          const pre = `${tPow(j)}${ex(p[0])}`;
          parts.push(pre ? `+ ${pre}\\left(${inner}\\right)` : `+ ${inner}`);
        }
      }
    }
    if (!parts.length) return '0';
    const s = parts.join(' ');
    return s.startsWith('+ ') ? s.slice(2) : s.replace(/^- /, '-');
  };

  const impulses = (x: Expansion) => {
    const parts: string[] = [];
    x.q.forEach((c, k) => {
      if (Math.abs(c) < SMALL) return;
      const d = k === 0 ? '\\delta(t)' : k === 1 ? "\\delta'(t)" : `\\delta^{(${k})}(t)`;
      parts.push(`${c < 0 ? '-' : '+'} ${n(Math.abs(c))}\\,${d}`);
    });
    const s = parts.join(' ');
    return s.startsWith('+ ') ? s.slice(2) : s;
  };

  return { n, coefBody, join, poly, rational, cx, sMinus, expansion, timeFn, impulses };
}

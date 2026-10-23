/* ==========================================================================
   Formula engine shared by the labs.

   parse()      text → syntax tree, with error codes and positions
   compile()    tree → fast numeric function of the declared variables
   taylor()     exact Taylor coefficients f⁽ⁿ⁾(a)/n! up to any order, by
                truncated power-series arithmetic (no finite differences)
   gradient()   value and exact partial derivatives (forward dual numbers)

   Syntax: + − * / ^ (also **), parentheses, implicit products (2x, 3sin(x)),
   decimal point or comma (2,5), functions sin/sen cos tan/tg exp ln/log sqrt
   atan asin acos sinh/senh cosh tanh abs sign/sgn mu/step/escalon (unit step μ),
   constants pi (π) and e. Function arguments may omit parentheses: sin x^2 = sin(x²).
   ========================================================================== */

export type Node =
  | { k: 'num'; v: number }
  | { k: 'var'; i: number }
  | { k: 'neg'; a: Node }
  | { k: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { k: 'fn'; name: FnName; a: Node };

export type FnName =
  | 'sin' | 'cos' | 'tan' | 'exp' | 'ln' | 'sqrt' | 'atan' | 'asin' | 'acos'
  | 'sinh' | 'cosh' | 'tanh' | 'abs' | 'sign' | 'mu';

const FN_ALIASES: Record<string, FnName> = {
  sin: 'sin', sen: 'sin', cos: 'cos', tan: 'tan', tg: 'tan', exp: 'exp', ln: 'ln', log: 'ln',
  sqrt: 'sqrt', raiz: 'sqrt', atan: 'atan', arctan: 'atan', asin: 'asin', arcsin: 'asin',
  acos: 'acos', arccos: 'acos', sinh: 'sinh', senh: 'sinh', cosh: 'cosh', tanh: 'tanh',
  abs: 'abs', sign: 'sign', sgn: 'sign', mu: 'mu', step: 'mu', escalon: 'mu', heaviside: 'mu',
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, 'π': Math.PI, e: Math.E };

export type ExprErrorCode = 'empty' | 'unexpected' | 'unknownName' | 'unclosed' | 'missingArg' | 'trailing';
export class ExprError extends Error {
  constructor(public code: ExprErrorCode, public pos: number, public token: string) {
    super(`${code} at ${pos}: ${token}`);
  }
}

type Tok = { t: 'num' | 'id' | 'op' | 'end'; s: string; v?: number; pos: number };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = src.replace(/[−–]/g, '-').replace(/[·×]/g, '*');
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || ((c === '.' || c === ',') && /[0-9]/.test(s[i + 1] ?? ''))) {
      const m = /^[0-9]*(?:[.,][0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(s.slice(i))!;
      let str = m[0];
      // "2e" followed by a non-digit is 2·e, not an exponent
      out.push({ t: 'num', s: str, v: parseFloat(str.replace(',', '.')), pos: i });
      i += str.length;
      continue;
    }
    if (/[A-Za-zα-ωπ_]/.test(c)) {
      const m = /^[A-Za-zα-ωπ_][A-Za-z0-9α-ωπ_]*/.exec(s.slice(i))!;
      out.push({ t: 'id', s: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (c === '*' && s[i + 1] === '*') {
      out.push({ t: 'op', s: '^', pos: i });
      i += 2;
      continue;
    }
    if ('+-*/^()'.includes(c)) {
      out.push({ t: 'op', s: c, pos: i });
      i++;
      continue;
    }
    throw new ExprError('unexpected', i, c);
  }
  out.push({ t: 'end', s: '', pos: s.length });
  return out;
}

/** Parses `src`; `vars` are the allowed variable names (their index is the argument order). */
export function parse(src: string, vars: string[]): Node {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const isOp = (s: string) => peek().t === 'op' && peek().s === s;
  if (toks.length === 1) throw new ExprError('empty', 0, '');

  const startsPrimary = (tk: Tok) => tk.t === 'num' || tk.t === 'id' || (tk.t === 'op' && tk.s === '(');

  function expr(): Node {
    let a = term();
    while (isOp('+') || isOp('-')) {
      const op = next().s as '+' | '-';
      a = { k: 'bin', op, a, b: term() };
    }
    return a;
  }
  function term(): Node {
    let a = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = next().s as '*' | '/';
        a = { k: 'bin', op, a, b: unary() };
      } else if (startsPrimary(peek())) {
        a = { k: 'bin', op: '*', a, b: power() }; // implicit product
      } else return a;
    }
  }
  function unary(): Node {
    if (isOp('-')) {
      next();
      return { k: 'neg', a: unary() };
    }
    if (isOp('+')) {
      next();
      return unary();
    }
    return power();
  }
  function power(): Node {
    const a = primary();
    if (isOp('^')) {
      next();
      return { k: 'bin', op: '^', a, b: unary() };
    }
    return a;
  }
  function primary(): Node {
    const tk = next();
    if (tk.t === 'num') return { k: 'num', v: tk.v! };
    if (tk.t === 'op' && tk.s === '(') {
      const e = expr();
      if (!isOp(')')) throw new ExprError('unclosed', tk.pos, '(');
      next();
      return e;
    }
    if (tk.t === 'id') {
      const lower = tk.s.toLowerCase();
      const vi = vars.indexOf(tk.s);
      if (vi >= 0) return { k: 'var', i: vi };
      const fn = FN_ALIASES[lower];
      if (fn) {
        const nt = peek();
        if (nt.t === 'end' || (nt.t === 'op' && nt.s !== '(' && nt.s !== '-')) throw new ExprError('missingArg', tk.pos, tk.s);
        if (isOp('(')) {
          const open = next();
          const a = expr();
          if (!isOp(')')) throw new ExprError('unclosed', open.pos, '(');
          next();
          return { k: 'fn', name: fn, a };
        }
        return { k: 'fn', name: fn, a: unary() };
      }
      if (lower in CONSTANTS || tk.s in CONSTANTS) return { k: 'num', v: CONSTANTS[lower] ?? CONSTANTS[tk.s] };
      throw new ExprError('unknownName', tk.pos, tk.s);
    }
    if (tk.t === 'end') throw new ExprError('missingArg', tk.pos, '');
    throw new ExprError('unexpected', tk.pos, tk.s);
  }

  const tree = expr();
  if (peek().t !== 'end') throw new ExprError(peek().s === ')' ? 'unexpected' : 'trailing', peek().pos, peek().s);
  return tree;
}

/* ---------------------------------------------------------------- numbers */
const mu = (x: number) => (x >= 0 ? 1 : 0);
const NUM_FN: Record<FnName, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, sqrt: Math.sqrt,
  atan: Math.atan, asin: Math.asin, acos: Math.acos, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  abs: Math.abs, sign: Math.sign, mu,
};

export type NumFn = (...args: number[]) => number;

/** Compiles a tree into a plain numeric function f(v0, v1, …). */
export function compile(node: Node): NumFn {
  const build = (n: Node): ((v: number[]) => number) => {
    switch (n.k) {
      case 'num': {
        const c = n.v;
        return () => c;
      }
      case 'var': {
        const i = n.i;
        return (v) => v[i];
      }
      case 'neg': {
        const a = build(n.a);
        return (v) => -a(v);
      }
      case 'fn': {
        const a = build(n.a);
        const f = NUM_FN[n.name];
        return (v) => f(a(v));
      }
      case 'bin': {
        const a = build(n.a);
        const b = build(n.b);
        switch (n.op) {
          case '+': return (v) => a(v) + b(v);
          case '-': return (v) => a(v) - b(v);
          case '*': return (v) => a(v) * b(v);
          case '/': return (v) => a(v) / b(v);
          case '^': {
            if (n.b.k === 'num' && n.b.v === 2) return (v) => { const x = a(v); return x * x; };
            return (v) => powNum(a(v), b(v));
          }
        }
      }
    }
  };
  const f = build(node);
  return (...args: number[]) => f(args);
}

/** x^y that also handles negative bases with integer or odd-root exponents (−8^(1/3) = −2). */
function powNum(x: number, y: number): number {
  if (x >= 0 || Number.isInteger(y)) return Math.pow(x, y);
  const inv = 1 / y;
  if (Number.isInteger(inv) && Math.abs(inv) % 2 === 1) return -Math.pow(-x, y);
  return NaN;
}

/* ---------------------------------------------------------------- truncated power series */
/** Coefficients c[0..N] of the series of f around the evaluation point (c[n] = f⁽ⁿ⁾/n!). */
export type Series = Float64Array;

function sConst(c: number, N: number): Series {
  const s = new Float64Array(N + 1);
  s[0] = c;
  return s;
}
function sMul(a: Series, b: Series): Series {
  const N = a.length - 1;
  const c = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) {
    let s = 0;
    for (let i = 0; i <= k; i++) s += a[i] * b[k - i];
    c[k] = s;
  }
  return c;
}
function sDiv(a: Series, b: Series): Series {
  const N = a.length - 1;
  const c = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) {
    let s = a[k];
    for (let i = 1; i <= k; i++) s -= b[i] * c[k - i];
    c[k] = s / b[0];
  }
  return c;
}
function sExp(a: Series): Series {
  const N = a.length - 1;
  const e = new Float64Array(N + 1);
  e[0] = Math.exp(a[0]);
  for (let k = 1; k <= N; k++) {
    let s = 0;
    for (let j = 1; j <= k; j++) s += j * a[j] * e[k - j];
    e[k] = s / k;
  }
  return e;
}
function sLog(a: Series): Series {
  const N = a.length - 1;
  const l = new Float64Array(N + 1);
  l[0] = Math.log(a[0]);
  for (let k = 1; k <= N; k++) {
    let s = 0;
    for (let j = 1; j < k; j++) s += j * l[j] * a[k - j];
    l[k] = (a[k] - s / k) / a[0];
  }
  return l;
}
function sSinCos(a: Series, hyperbolic: boolean): [Series, Series] {
  const N = a.length - 1;
  const s = new Float64Array(N + 1);
  const c = new Float64Array(N + 1);
  s[0] = hyperbolic ? Math.sinh(a[0]) : Math.sin(a[0]);
  c[0] = hyperbolic ? Math.cosh(a[0]) : Math.cos(a[0]);
  const sg = hyperbolic ? 1 : -1;
  for (let k = 1; k <= N; k++) {
    let ss = 0;
    let cc = 0;
    for (let j = 1; j <= k; j++) {
      ss += j * a[j] * c[k - j];
      cc += j * a[j] * s[k - j];
    }
    s[k] = ss / k;
    c[k] = (sg * cc) / k;
  }
  return [s, c];
}
function sSqrt(a: Series): Series {
  const N = a.length - 1;
  const r = new Float64Array(N + 1);
  r[0] = Math.sqrt(a[0]);
  for (let k = 1; k <= N; k++) {
    let s = a[k];
    for (let j = 1; j < k; j++) s -= r[j] * r[k - j];
    r[k] = s / (2 * r[0]);
  }
  return r;
}
function sPowConst(a: Series, p: number): Series {
  const N = a.length - 1;
  if (Number.isInteger(p) && p >= 0) {
    let res = sConst(1, N);
    let base = a;
    let e = p;
    while (e > 0) {
      if (e & 1) res = sMul(res, base);
      e >>= 1;
      if (e) base = sMul(base, base);
    }
    return res;
  }
  if (Number.isInteger(p) && p < 0) return sDiv(sConst(1, N), sPowConst(a, -p));
  const q = new Float64Array(N + 1);
  q[0] = powNum(a[0], p);
  for (let k = 1; k <= N; k++) {
    let s = 0;
    for (let j = 1; j <= k; j++) s += ((p + 1) * j - k) * a[j] * q[k - j];
    q[k] = s / (k * a[0]);
  }
  return q;
}
/** Derivative then integral, for atan/asin/acos: y' = a'·g(a) with g given as a series. */
function sIntegrateDeriv(y0: number, a: Series, g: Series): Series {
  const N = a.length - 1;
  const da = new Float64Array(N + 1);
  for (let k = 0; k < N; k++) da[k] = (k + 1) * a[k + 1];
  const d = sMul(da, g);
  const y = new Float64Array(N + 1);
  y[0] = y0;
  for (let k = 1; k <= N; k++) y[k] = d[k - 1] / k;
  return y;
}
function sFn(name: FnName, a: Series): Series {
  const N = a.length - 1;
  switch (name) {
    case 'sin': return sSinCos(a, false)[0];
    case 'cos': return sSinCos(a, false)[1];
    case 'tan': { const [s, c] = sSinCos(a, false); return sDiv(s, c); }
    case 'sinh': return sSinCos(a, true)[0];
    case 'cosh': return sSinCos(a, true)[1];
    case 'tanh': { const [s, c] = sSinCos(a, true); return sDiv(s, c); }
    case 'exp': return sExp(a);
    case 'ln': return sLog(a);
    case 'sqrt': return sSqrt(a);
    case 'atan': return sIntegrateDeriv(Math.atan(a[0]), a, sDiv(sConst(1, N), sAdd(sConst(1, N), sMul(a, a))));
    case 'asin': return sIntegrateDeriv(Math.asin(a[0]), a, sPowConst(sSub(sConst(1, N), sMul(a, a)), -0.5));
    case 'acos': return sIntegrateDeriv(Math.acos(a[0]), a, sScale(sPowConst(sSub(sConst(1, N), sMul(a, a)), -0.5), -1));
    case 'abs': {
      if (a[0] === 0) { const r = sConst(0, N); for (let k = 1; k <= N; k++) r[k] = NaN; return r; }
      return sScale(a, Math.sign(a[0]));
    }
    case 'sign':
    case 'mu': {
      const v = NUM_FN[name](a[0]);
      const r = sConst(v, N);
      if (a[0] === 0) for (let k = 1; k <= N; k++) r[k] = NaN;
      return r;
    }
  }
}
const sAdd = (a: Series, b: Series) => a.map((x, i) => x + b[i]) as Series;
const sSub = (a: Series, b: Series) => a.map((x, i) => x - b[i]) as Series;
const sScale = (a: Series, k: number) => a.map((x) => x * k) as Series;

/**
 * Taylor coefficients of a one-variable formula around x = a: c[n] = f⁽ⁿ⁾(a)/n!, n = 0…N.
 * Exact up to rounding (truncated power-series arithmetic); NaN where f is not analytic at a.
 */
export function taylor(node: Node, a: number, N: number): Series {
  const ev = (n: Node): Series => {
    switch (n.k) {
      case 'num': return sConst(n.v, N);
      case 'var': { const s = sConst(a, N); if (N >= 1) s[1] = 1; return s; }
      case 'neg': return sScale(ev(n.a), -1);
      case 'fn': return sFn(n.name, ev(n.a));
      case 'bin': {
        const x = ev(n.a);
        if (n.op === '^' && isConstant(n.b)) return sPowConst(x, compile(n.b)());
        const y = ev(n.b);
        switch (n.op) {
          case '+': return sAdd(x, y);
          case '-': return sSub(x, y);
          case '*': return sMul(x, y);
          case '/': return sDiv(x, y);
          case '^': return sExp(sMul(y, sLog(x)));
        }
      }
    }
  };
  return ev(node);
}

/** True when the tree contains no variables. */
export function isConstant(n: Node): boolean {
  switch (n.k) {
    case 'num': return true;
    case 'var': return false;
    case 'neg':
    case 'fn': return isConstant(n.a);
    case 'bin': return isConstant(n.a) && isConstant(n.b);
  }
}

/** True when the formula uses variable number i. */
export function usesVar(n: Node, i: number): boolean {
  switch (n.k) {
    case 'num': return false;
    case 'var': return n.i === i;
    case 'neg':
    case 'fn': return usesVar(n.a, i);
    case 'bin': return usesVar(n.a, i) || usesVar(n.b, i);
  }
}

/* ---------------------------------------------------------------- dual numbers (gradients) */
/** [value, ∂/∂v0, ∂/∂v1, …] */
type Dual = Float64Array;

/** Value and exact gradient of a formula at the point `at`. */
export function gradient(node: Node, at: number[]): { value: number; grad: number[] } {
  const m = at.length;
  const mk = (v: number) => { const d = new Float64Array(m + 1); d[0] = v; return d; };
  const chain = (a: Dual, f: number, df: number) => { const r = new Float64Array(m + 1); r[0] = f; for (let i = 1; i <= m; i++) r[i] = df * a[i]; return r; };
  const ev = (n: Node): Dual => {
    switch (n.k) {
      case 'num': return mk(n.v);
      case 'var': { const d = mk(at[n.i]); d[n.i + 1] = 1; return d; }
      case 'neg': return ev(n.a).map((x) => -x) as Dual;
      case 'fn': {
        const a = ev(n.a);
        const x = a[0];
        switch (n.name) {
          case 'sin': return chain(a, Math.sin(x), Math.cos(x));
          case 'cos': return chain(a, Math.cos(x), -Math.sin(x));
          case 'tan': { const t = Math.tan(x); return chain(a, t, 1 + t * t); }
          case 'exp': { const e = Math.exp(x); return chain(a, e, e); }
          case 'ln': return chain(a, Math.log(x), 1 / x);
          case 'sqrt': { const r = Math.sqrt(x); return chain(a, r, 0.5 / r); }
          case 'atan': return chain(a, Math.atan(x), 1 / (1 + x * x));
          case 'asin': return chain(a, Math.asin(x), 1 / Math.sqrt(1 - x * x));
          case 'acos': return chain(a, Math.acos(x), -1 / Math.sqrt(1 - x * x));
          case 'sinh': return chain(a, Math.sinh(x), Math.cosh(x));
          case 'cosh': return chain(a, Math.cosh(x), Math.sinh(x));
          case 'tanh': { const t = Math.tanh(x); return chain(a, t, 1 - t * t); }
          case 'abs': return chain(a, Math.abs(x), x === 0 ? NaN : Math.sign(x));
          case 'sign':
          case 'mu': return chain(a, NUM_FN[n.name](x), x === 0 ? NaN : 0);
        }
      }
      case 'bin': {
        const a = ev(n.a);
        const b = ev(n.b);
        const r = new Float64Array(m + 1);
        switch (n.op) {
          case '+': for (let i = 0; i <= m; i++) r[i] = a[i] + b[i]; return r;
          case '-': for (let i = 0; i <= m; i++) r[i] = a[i] - b[i]; return r;
          case '*': r[0] = a[0] * b[0]; for (let i = 1; i <= m; i++) r[i] = a[i] * b[0] + a[0] * b[i]; return r;
          case '/': r[0] = a[0] / b[0]; for (let i = 1; i <= m; i++) r[i] = (a[i] * b[0] - a[0] * b[i]) / (b[0] * b[0]); return r;
          case '^': {
            const v = powNum(a[0], b[0]);
            r[0] = v;
            const constExp = isConstant(n.b);
            for (let i = 1; i <= m; i++) {
              const da = b[0] * powNum(a[0], b[0] - 1) * a[i];
              const db = constExp ? 0 : v * Math.log(a[0]) * b[i];
              r[i] = da + db;
            }
            return r;
          }
        }
      }
    }
  };
  const d = ev(node);
  return { value: d[0], grad: Array.from(d.slice(1)) };
}

/* ---------------------------------------------------------------- convenience */
export interface Formula {
  src: string;
  node: Node;
  f: NumFn;
}
export type ParseResult = { ok: true; formula: Formula } | { ok: false; error: ExprError };

/** Parses and compiles, never throws. */
export function tryFormula(src: string, vars: string[]): ParseResult {
  try {
    const node = parse(src, vars);
    return { ok: true, formula: { src, node, f: compile(node) } };
  } catch (e) {
    if (e instanceof ExprError) return { ok: false, error: e };
    return { ok: false, error: new ExprError('unexpected', 0, String(e)) };
  }
}

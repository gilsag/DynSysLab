import { describe, expect, it } from 'vitest';
import { compile, ExprError, gradient, parse, taylor } from './expr';

const near = (a: number, b: number, tol = 1e-12) => expect(Math.abs(a - b)).toBeLessThan(tol * (1 + Math.abs(b)));
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

describe('parse and evaluate', () => {
  it('handles precedence, implicit products, aliases and decimal comma', () => {
    const f = compile(parse('2x^2 - 3sen(x) + 1,5', ['x']));
    near(f(2), 8 - 3 * Math.sin(2) + 1.5);
    near(compile(parse('-x^2', ['x']))(3), -9);
    near(compile(parse('2^3^2', []))(), 512);
    near(compile(parse('sin x^2', ['x']))(1.3), Math.sin(1.69));
    near(compile(parse('pi*e', []))(), Math.PI * Math.E);
    near(compile(parse('x1*x2 - u', ['x1', 'x2', 'u']))(2, 3, 1), 5);
    near(compile(parse('mu(t-1) - step(t-2)', ['t']))(1.5), 1);
  });
  it('reports errors with codes and positions', () => {
    const code = (s: string, v = ['x']) => {
      try { parse(s, v); return 'ok'; } catch (e) { return (e as ExprError).code; }
    };
    expect(code('')).toBe('empty');
    expect(code('y + 1')).toBe('unknownName');
    expect(code('(x + 1')).toBe('unclosed');
    expect(code('x + ')).toBe('missingArg');
    expect(code('sin')).toBe('missingArg');
    expect(code('x $ 2')).toBe('unexpected');
    expect(code('x)')).toBe('unexpected');
  });
});

describe('Taylor coefficients (apunte 06, tabla de desarrollos)', () => {
  it('sin, cos, exp at 0', () => {
    const s = taylor(parse('sin(x)', ['x']), 0, 9);
    for (let n = 0; n <= 9; n++) near(s[n], n % 2 ? (-1) ** ((n - 1) / 2) / fact(n) : 0);
    const c = taylor(parse('cos x', ['x']), 0, 8);
    for (let n = 0; n <= 8; n++) near(c[n], n % 2 ? 0 : (-1) ** (n / 2) / fact(n));
    const e = taylor(parse('exp(x)', ['x']), 0, 12);
    for (let n = 0; n <= 12; n++) near(e[n], 1 / fact(n));
  });
  it('1/(1-x) at 0, 1/x and ln x at 1', () => {
    const g = taylor(parse('1/(1-x)', ['x']), 0, 10);
    for (let n = 0; n <= 10; n++) near(g[n], 1);
    const r = taylor(parse('1/x', ['x']), 1, 10);
    for (let n = 0; n <= 10; n++) near(r[n], (-1) ** n);
    const l = taylor(parse('ln x', ['x']), 1, 10);
    near(l[0], 0);
    for (let n = 1; n <= 10; n++) near(l[n], (-1) ** (n + 1) / n);
  });
  it('sqrt at 4 gives the √4,001 example', () => {
    const q = taylor(parse('sqrt(x)', ['x']), 4, 3);
    near(q[0], 2);
    near(q[1], 0.25);
    near(q[2], -1 / 64); // f''(4)/2 = (−1/32)/2
    near(q[0] + q[1] * 0.001, 2.00025);
  });
  it('powers, quotients, atan, asin, x^x', () => {
    const p = taylor(parse('(1+x)^3', ['x']), 0, 5);
    expect(Array.from(p)).toEqual([1, 3, 3, 1, 0, 0]);
    const h = taylor(parse('(1+x)^0.5', ['x']), 0, 3);
    near(h[2], -1 / 8);
    const a = taylor(parse('atan(x)', ['x']), 0, 9);
    for (let n = 0; n <= 9; n++) near(a[n], n % 2 ? (-1) ** ((n - 1) / 2) / n : 0);
    const as = taylor(parse('asin(x)', ['x']), 0, 5);
    near(as[1], 1);
    near(as[3], 1 / 6);
    near(as[5], 3 / 40);
    const xx = taylor(parse('x^x', ['x']), 1, 3);
    near(xx[0], 1);
    near(xx[1], 1);
    near(xx[2], 1);
    near(xx[3], 0.5);
  });
});

describe('gradients (apunte 06, sección 6)', () => {
  const g = parse('(3 + cos(y))*yd + 3*sin(y) - y^2', ['y', 'yd']);
  it('linearization of g(y, ẏ) at the origin: ∂g/∂y = 3, ∂g/∂ẏ = 4', () => {
    const r = gradient(g, [0, 0]);
    near(r.value, 0);
    near(r.grad[0], 3);
    near(r.grad[1], 4);
  });
  it('Jacobian of representation B at the second equilibrium', () => {
    const f2 = parse('-(3 + cos(z1))*z2 - 3*sin(z1) + z1^2 + u', ['z1', 'z2', 'u']);
    const z1 = 1.7221251;
    const r = gradient(f2, [z1, 0, 0]);
    near(r.grad[0], 3.89651, 1e-5);
    near(r.grad[1], -2.84925, 1e-5);
    near(r.grad[2], 1);
  });
});

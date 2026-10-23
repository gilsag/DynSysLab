import type { Root, SystemDef } from '../math/types';
import { gains } from '../math/tf';
import { fmt, tr, type Lang } from '../i18n';
import type { Factor } from '../math/tf';

const n = (x: number, lang: Lang) => fmt(x, lang, 4);

/** Signed term "+ 3" / "− 3" */
const sgn = (x: number, lang: Lang) => `${x < 0 ? '−' : '+'} ${n(Math.abs(x), lang)}`;

function rootFactor(r: Root, lang: Lang): string {
  if (r.re === 0 && r.im === 0) return 's';
  if (r.im === 0) return `(s ${sgn(-r.re, lang)})`;
  const c1 = -2 * r.re;
  const c0 = r.re * r.re + r.im * r.im;
  return c1 === 0 ? `(s² + ${n(c0, lang)})` : `(s² ${sgn(c1, lang)}s + ${n(c0, lang)})`;
}

function bodeFactor(r: Root, lang: Lang): string {
  if (r.re === 0 && r.im === 0) return 's';
  if (r.im === 0) {
    const a = Math.abs(r.re);
    return `(1 ${r.re < 0 ? '+' : '−'} s/${n(a, lang)})`;
  }
  const wn2 = r.re * r.re + r.im * r.im;
  const c1 = (-2 * r.re) / wn2;
  const c2 = 1 / wn2;
  const s2 = `${Math.abs(c2 - 1) < 1e-6 ? '' : n(c2, lang)}s²`;
  return c1 === 0 ? `(1 + ${s2})` : `(1 ${sgn(c1, lang)}s + ${s2})`;
}

function group(list: string[]) {
  const m = new Map<string, number>();
  for (const s of list) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m.entries()];
}

function Product({ items }: { items: string[] }) {
  if (!items.length) return <span>1</span>;
  return (
    <span>
      {group(items).map(([s, k]) => (
        <span key={s} className="fac">
          {s}
          {k > 1 && <sup>{k}</sup>}
        </span>
      ))}
    </span>
  );
}

export default function TFDisplay({ sys, lang }: { sys: SystemDef; lang: Lang }) {
  const { kb, kl } = gains(sys);
  const zs = sys.roots.filter((r) => r.kind === 'zero');
  const ps = sys.roots.filter((r) => r.kind === 'pole');
  const delay = sys.delay > 0 ? (
    <span className="delay">
      e<sup>−{n(sys.delay, lang)}s</sup>
    </span>
  ) : null;
  const row = (k: number, f: (r: Root, l: Lang) => string, label: string) => (
    <div className="tfrow">
      <span className="tflabel">{label}</span>
      <span className="tfexpr">
        <span className="lhs">H(s) =</span>
        <span className="k">{n(k, lang)}</span>
        {ps.length > 0 ? (
          <span className="frac">
            <span className="num">
              <Product items={zs.map((r) => f(r, lang))} />
            </span>
            <span className="den">
              <Product items={ps.map((r) => f(r, lang))} />
            </span>
          </span>
        ) : (
          zs.length > 0 && <Product items={zs.map((r) => f(r, lang))} />
        )}
        {delay}
      </span>
    </div>
  );
  return (
    <div className="tf">
      {row(kl, rootFactor, tr(lang)('poleZeroForm'))}
      {row(kb, bodeFactor, 'Bode')}
    </div>
  );
}

export function factorLabel(f: Factor, lang: Lang): string {
  const t = tr(lang);
  if (f.type === 'gain') return t('gainFactor');
  if (f.type === 'delay') return t('delayFactor');
  const r = f.root!;
  const kind = r.kind === 'pole' ? t('pole') : t('zero');
  if (f.type === 'origin') return `${kind} ${t('atOrigin')}`;
  if (f.type === 'real') return `${kind} ${t('at')} ${fmt(r.re, lang)}`;
  const kinds = r.kind === 'pole' ? t('polePair') : t('zeroPair');
  return `${kinds} ${fmt(r.re, lang)} ± j${fmt(r.im, lang)}`;
}

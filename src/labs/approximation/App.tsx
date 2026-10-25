import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { ExprInput } from '@shared/ExprInput';
import { tryFormula } from '@shared/expr';
import { fmt, tex } from '@shared/format';
import { Plot, type PlotSpec, type Series } from '@shared/Plot';
import { Card, Check, InfoTip, NumField, Rich, Slider, Tex } from '@shared/ui';
import type { LabLang } from '@shared/suite';
import { translate, type Lang, type TKey } from './i18n';
import { evalFit, fit, makeBasis, type Family } from './math/approx';

type S6 = Record<LabLang, string>;
interface Preset {
  id: string;
  name: S6;
  src: string;
  t: [number, number];
  family: Family;
  n: number;
}
const PRESETS: Preset[] = [
  { id: 'semi', name: { es: 'Pulso semisinusoidal', en: 'Half-sine pulse', fr: 'Impulsion demi-sinus', de: 'Halbsinuspuls', it: 'Impulso semisinusoidale', pt: 'Pulso semissenoidal' }, src: '2*pi*sin(pi*t)', t: [0, 1], family: 'pulses', n: 3 },
  { id: 'stair', name: { es: 'Señal escalonada', en: 'Staircase signal', fr: 'Signal en escalier', de: 'Treppensignal', it: 'Segnale a gradini', pt: 'Sinal em degraus' }, src: 'mu(t) + mu(t-1) - mu(t-2) - mu(t-3)', t: [0, 3], family: 'pulses', n: 3 },
  { id: 'square', name: { es: 'Onda cuadrada, un período', en: 'Square wave, one period', fr: 'Signal carré, une période', de: 'Rechteckschwingung, eine Periode', it: 'Onda quadra, un periodo', pt: 'Onda quadrada, um período' }, src: 'sign(sin(2*pi*t))', t: [0, 1], family: 'trig', n: 7 },
  { id: 'saw', name: { es: 'Diente de sierra, un período', en: 'Sawtooth, one period', fr: 'Dent de scie, une période', de: 'Sägezahn, eine Periode', it: 'Dente di sega, un periodo', pt: 'Dente de serra, um período' }, src: 't', t: [0, 1], family: 'trig', n: 9 },
  { id: 'exp', name: { es: 'Exponencial decreciente', en: 'Decaying exponential', fr: 'Exponentielle décroissante', de: 'Abklingende Exponentialfunktion', it: 'Esponenziale decrescente', pt: 'Exponencial decrescente' }, src: 'exp(-t)', t: [0, 3], family: 'pulses', n: 6 },
  { id: 'abs', name: { es: 'Valor absoluto', en: 'Absolute value', fr: 'Valeur absolue', de: 'Betragsfunktion', it: 'Valore assoluto', pt: 'Valor absoluto' }, src: 'abs(t)', t: [-1, 1], family: 'legendre', n: 5 },
  { id: 'runge', name: { es: 'Función de Runge 1/(1 + 25t²)', en: 'Runge function 1/(1 + 25t²)', fr: 'Fonction de Runge 1/(1 + 25t²)', de: 'Runge-Funktion 1/(1 + 25t²)', it: 'Funzione di Runge 1/(1 + 25t²)', pt: 'Função de Runge 1/(1 + 25t²)' }, src: '1/(1 + 25*t^2)', t: [-1, 1], family: 'mono', n: 9 },
];
const FAMILIES: Family[] = ['pulses', 'steps', 'trig', 'mono', 'legendre'];
const FAMILY_NOTE: Record<Family, TKey> = { pulses: 'fPulses', steps: 'fSteps', trig: 'fTrig', mono: 'fMono', legendre: 'fLegendre' };
const NESTED = new Set<Family>(['trig', 'mono', 'legendre']);
const T = ['t'];

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);

  const [preset, setPreset] = useState('semi');
  const [src, setSrc] = useState(PRESETS[0].src);
  const [iv, setIv] = useState<[number, number]>(PRESETS[0].t);
  const [family, setFamily] = useState<Family>('pulses');
  const [n, setN] = useState(3);
  const [comp, setComp] = useState(true);
  const u = useMemo(() => {
    const r = tryFormula(src, T);
    return r.ok ? r.formula.f : () => NaN;
  }, [src]);
  const pr = PRESETS.find((p) => p.id === preset);
  const load = (id: string) => {
    setPreset(id);
    const p = PRESETS.find((q) => q.id === id);
    if (!p) return;
    setSrc(p.src);
    setIv(p.t);
    setFamily(p.family);
    setN(p.n);
  };

  const [t1, t2] = iv;
  const nEff = family === 'trig' ? 2 * Math.floor((n - 1) / 2) + 1 : n;
  const basis = useMemo(() => makeBasis(family, nEff, t1, t2), [family, nEff, t1, t2]);
  const res = useMemo(() => fit(u, basis, t1, t2), [u, basis, t1, t2]);
  const prev = useMemo(() => {
    const m = family === 'trig' ? nEff - 2 : nEff - 1;
    if (!NESTED.has(family) || m < 1) return null;
    return fit(u, makeBasis(family, m, t1, t2), t1, t2);
  }, [u, family, nEff, t1, t2]);
  const curve = useMemo(() => {
    const N = 1200;
    const pad = 0.04 * (t2 - t1);
    const xs = Array.from({ length: N + 1 }, (_, i) => t1 - pad + ((t2 - t1 + 2 * pad) * i) / N);
    const inside = (x: number) => x >= t1 && x <= t2;
    return {
      xs,
      u: xs.map((x) => u(x)),
      f: xs.map((x) => (inside(x) ? evalFit(basis, res.C, x) : NaN)),
      parts: basis.fns.map((fn, k) => xs.map((x) => (inside(x) ? res.C[k] * fn(x) : NaN))),
      basis: basis.fns.map((fn) => xs.map((x) => (inside(x) ? fn(x) : NaN))),
    };
  }, [u, basis, res, t1, t2]);
  const iecN = useMemo(() => {
    const maxN = family === 'trig' ? 41 : family === 'mono' ? 18 : 30;
    const ns: number[] = [];
    for (let m = 1; m <= maxN; m += family === 'trig' ? 2 : 1) ns.push(m);
    return { ns, iec: ns.map((m) => Math.max(1e-16, fit(u, makeBasis(family, m, t1, t2), t1, t2).iec)) };
  }, [u, family, t1, t2]);

  const ys = [...curve.u, ...curve.f].filter(Number.isFinite);
  const lo = Math.min(0, ...ys), hi = Math.max(0, ...ys);
  const pad = 0.1 * (hi - lo || 1);
  const xr: [number, number] = [curve.xs[0], curve.xs[curve.xs.length - 1]];
  const main: PlotSpec = {
    series: [
      ...(comp && (family === 'pulses' || family === 'steps')
        ? [{ x: curve.xs, y: curve.f, color: '--c-approx', kind: 'area', alpha: 0.18 } as Series]
        : comp
          ? curve.parts.map((p, k) => ({ x: curve.xs, y: p, color: `--s${(k % 8) + 1}`, width: 1, alpha: 0.6 }) as Series)
          : []),
      { x: curve.xs, y: curve.u, color: '--c-signal', width: 2.2, label: 'u(t)' },
      { x: curve.xs, y: curve.f, color: '--c-approx', width: 2, label: 'f(t)' },
    ],
    xRange: xr,
    yRange: [lo - pad, hi + pad],
    xLabel: 't',
    legend: true,
    vLines: basis.taus?.map((v) => ({ v, color: '--grid', dash: [2, 3] })) ?? [],
  };
  const errSpec: PlotSpec = {
    series: [{ x: curve.xs, y: curve.xs.map((x, i) => (x >= t1 && x <= t2 ? curve.u[i] - curve.f[i] : NaN)), color: '--c-error', width: 1.5 }],
    xRange: xr,
    yRange: (() => {
      const e = curve.xs.map((x, i) => curve.u[i] - curve.f[i]).filter(Number.isFinite);
      const m = Math.max(1e-9, ...e.map(Math.abs)) * 1.15;
      return [-m, m] as [number, number];
    })(),
    xLabel: 't',
    hLines: [{ v: 0, color: '--axis' }],
  };
  const showB = Math.min(basis.fns.length, 12);
  const bLo = Math.min(0, ...curve.basis.slice(0, showB).flat().filter(Number.isFinite));
  const bHi = Math.max(1, ...curve.basis.slice(0, showB).flat().filter(Number.isFinite));
  const basisSpec: PlotSpec = {
    series: curve.basis.slice(0, showB).map((b, k) => ({ x: curve.xs, y: b.map((v) => (family === 'pulses' || family === 'steps' ? v * (1 - 0.06 * k) : v)), color: `--s${(k % 8) + 1}`, width: 1.6 })),
    xRange: xr,
    yRange: [bLo - 0.1 * (bHi - bLo), bHi + 0.1 * (bHi - bLo)],
    xLabel: 't',
  };
  const iecSpec: PlotSpec = {
    series: [
      { x: iecN.ns, y: iecN.iec, color: '--c-error', kind: 'stem', width: 1.2 },
      { x: [nEff], y: [Math.max(1e-16, res.iec)], color: '--c-approx', kind: 'points', width: 5 },
    ],
    xRange: [0, iecN.ns[iecN.ns.length - 1] + 1],
    yRange: [Math.max(1e-16, Math.min(...iecN.iec) / 3), Math.max(...iecN.iec, res.uu) * 2],
    yLog: true,
    xLabel: 'n',
    yLabel: 'IEC',
  };

  // pulses → steps: f = C1 μ(t − τ0) + Σ (C_{k+1} − C_k) μ(t − τ_k) − C_n μ(t − τ_n)
  const stepsTex = useMemo(() => {
    if (!(family === 'pulses' || family === 'steps') || !basis.taus || nEff > 10) return '';
    const inc: number[] = [];
    const levels = family === 'pulses' ? res.C : res.C.reduce<number[]>((acc, c) => [...acc, (acc[acc.length - 1] ?? 0) + c], []);
    for (let k = 0; k <= nEff; k++) inc.push((levels[k] ?? 0) - (levels[k - 1] ?? 0));
    const terms = inc
      .map((d, k) => ({ d, tau: basis.taus![k] }))
      .filter((x) => Math.abs(x.d) > 1e-10)
      .map((x, i) => {
        const sg = x.d < 0 ? '-' : i ? '+' : '';
        const tau = Math.abs(x.tau) < 1e-12 ? 't' : `t ${x.tau < 0 ? '+' : '-'} ${tex(Math.abs(x.tau), lang)}`;
        return `${sg} ${tex(Math.abs(x.d), lang)}\\,\\mu(${tau})`;
      });
    return `f(t) = ${terms.join(' ')}`;
  }, [family, basis, res, nEff, lang]);

  const gramMax = Math.max(...res.gram.flat().map(Math.abs));
  const snap = (v: number, ref: number) => (Math.abs(v) < 1e-9 * ref ? 0 : v);
  const rhsMax = Math.max(1e-300, ...res.rhs.map(Math.abs));
  const cMax = Math.max(1e-300, ...res.C.map(Math.abs));
  const famLabel = (f: Family) => t(f);

  return (
    <div className="lab-app approxlab">
      <LabHeader logo={logoUrl} glyph={GLYPHS.approximation} lab="approximation" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Card title={t('secSignal')} info={t('tipSignal')}>
            <label className="field">
              <span>{t('examples')}</span>
              <select value={pr && pr.src === src ? preset : ''} onChange={(e) => load(e.target.value)}>
                <option value="">{t('custom')}</option>
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name[lang]}
                  </option>
                ))}
              </select>
            </label>
            <ExprInput label="u(t) =" value={src} vars={T} lang={lang} onChange={(s) => setSrc(s)} />
            <div className="field-row">
              <span>{t('interval')}</span>
              <NumField value={t1} width={64} onChange={(v) => v < t2 && setIv([v, t2])} />
              <Tex tex="\le t \le" />
              <NumField value={t2} width={64} onChange={(v) => v > t1 && setIv([t1, v])} />
            </div>
          </Card>
          <Card title={t('secFamily')} info={t('tipFamily')}>
            <div className="fam-list">
              {FAMILIES.map((f) => (
                <label key={f} className="check">
                  <input type="radio" name="family" checked={family === f} onChange={() => setFamily(f)} />
                  <span>{famLabel(f)}</span>
                </label>
              ))}
            </div>
            {family === 'trig' ? (
              <Slider label={t('harmonics')} value={(nEff - 1) / 2} min={0} max={20} step={1} onChange={(v) => setN(2 * Math.round(v) + 1)} display={`K = ${(nEff - 1) / 2}`} />
            ) : (
              <Slider label={t('nBasic')} value={n} min={1} max={family === 'mono' ? 18 : 30} step={1} onChange={(v) => setN(Math.round(v))} display={`n = ${n}`} />
            )}
            <div className="row wrap">
              {(family === 'trig' ? [1, 3, 5, 7, 11, 21] : [1, 2, 3, 5, 8, 12]).map((v) => (
                <button key={v} className={'tiny' + (nEff === v ? ' on' : '')} onClick={() => setN(v)}>
                  {v}
                </button>
              ))}
            </div>
            <p className="hint">{t(FAMILY_NOTE[family])}</p>
            <Check label={t('showComp')} checked={comp} onChange={setComp} />
          </Card>
        </aside>
        <main className="lab-main">
          <p className="callout">
            <Rich text={t('idea')} />
          </p>
          <div className="metrics">
            <Metric label="n" value={String(nEff)} />
            <Metric label={t('mIec')} tip={t('tipIec')} value={fmt(res.iec < 1e-14 * res.uu ? 0 : res.iec, lang, 4)} />
            <Metric label={t('mRel')} value={`${fmt((100 * res.iec) / res.uu < 1e-12 ? 0 : (100 * res.iec) / res.uu, lang, 3)} %`} />
            <Metric label="∫u² dt" value={fmt(res.uu, lang, 5)} />
            <Metric label={t('mOrth')} value={res.orthogonal ? t('yes') : t('no')} />
            <Metric label={t('mCond')} tip={t('tipCond')} value={fmt(res.cond, lang, 3)} />
          </div>
          <Card title={t('plotMain')} info={t('tipMain')}>
            <Plot spec={main} height={320} />
          </Card>
          {stepsTex && (
            <Card title={t('stepsTitle')} info={t('tipSteps')}>
              <Tex block tex={stepsTex} />
            </Card>
          )}
          <div className="two-col">
            <Card title={t('plotErr')}>
              <Plot spec={errSpec} height={190} />
            </Card>
            <Card title={t('iecTitle')} info={t('tipIecN')}>
              <Plot spec={iecSpec} height={190} />
            </Card>
          </div>
          <div className="two-col">
            <Card title={t('plotBasis')} info={t('tipBasis')}>
              <Plot spec={basisSpec} height={220} />
            </Card>
            <Card title={t('gramTitle')} info={t('tipGram')}>
              {nEff <= 6 ? (
                <Tex block tex={`\\boldsymbol\\Gamma = \\begin{bmatrix} ${res.gram.map((r) => r.map((v) => tex(Math.abs(v) < 1e-12 * gramMax ? 0 : v, lang, 4)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`} />
              ) : null}
              <div className="gram" style={{ gridTemplateColumns: `repeat(${nEff}, 1fr)` }}>
                {res.gram.flatMap((r, j) =>
                  r.map((v, k) => {
                    const m = Math.abs(v) / gramMax;
                    const pct = m < 1e-9 ? 0 : Math.round(12 + 88 * Math.sqrt(m));
                    return <span key={`${j}-${k}`} title={`Γ${j + 1},${k + 1} = ${fmt(v, lang, 4)}`} style={{ background: pct ? `color-mix(in srgb, var(${v < 0 ? '--bad' : '--accent'}) ${pct}%, var(--panel))` : 'var(--panel-2)' }} />;
                  }),
                )}
              </div>
            </Card>
          </div>
          <Card title={t('coefTitle')} info={t('tipCoef')}>
            <div className="table-wrap coef-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>k</th>
                    <th>
                      <Tex tex="S_k(t)" />
                    </th>
                    <th>
                      <Tex tex="\langle u, S_k\rangle" />
                    </th>
                    <th>
                      <Tex tex="\langle S_k, S_k\rangle" />
                    </th>
                    <th>
                      <Tex tex="C_k" />
                    </th>
                    {NESTED.has(family) && (
                      <th>
                        <Tex tex="C_k" /> ({t('withLess')})
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {res.C.map((c, k) => (
                    <tr key={k}>
                      <td>{k + 1}</td>
                      <td>
                        <Tex tex={lang === 'es' || lang === 'pt' || lang === 'it' ? basis.names[k] : basis.names[k].replace('\\operatorname{sen}', '\\sin')} />
                      </td>
                      <td className="mono">{fmt(snap(res.rhs[k], rhsMax), lang, 5)}</td>
                      <td className="mono">{fmt(res.gram[k][k], lang, 5)}</td>
                      <td className="mono">
                        <b>{fmt(snap(c, cMax), lang, 5)}</b>
                      </td>
                      {NESTED.has(family) && (
                        <td className={'mono ' + (prev && k < prev.C.length && Math.abs(prev.C[k] - c) > 1e-6 * cMax ? 'changed' : '')}>
                          {prev && k < prev.C.length ? fmt(snap(prev.C[k], cMax), lang, 5) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!NESTED.has(family) && <p className="hint">{t('notNested')}</p>}
          </Card>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className="metric">
      <span className="mlabel">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className="mval">{value}</span>
    </div>
  );
}

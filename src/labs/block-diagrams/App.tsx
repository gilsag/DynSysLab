import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { ChainDiagram } from '@shared/BlockDiagram';
import { Plot, type PlotSpec } from '@shared/Plot';
import { Card, Check, Rich, Tex } from '@shared/ui';
import { expand, timeValue } from '@shared/pfe';
import { cluster, mul, reduce, roots, trim, type Poly, type Rational } from '@shared/poly';
import { makeRationalTex } from '@shared/rationalTex';
import { EXAMPLE_NAMES, RULES, translate, type Lang, type TKey } from './i18n';
import { EXAMPLES } from './math/examples';
import { coeffString, parseCoeffs } from './math/coeffs';

type Edit = { n: string; d: string };

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);
  const X = useMemo(() => makeRationalTex(lang), [lang]);

  const [exId, setExId] = useState<string>('nested');
  const [stage, setStage] = useState(0);
  const [all, setAll] = useState(false);
  const [edits, setEdits] = useState<Record<string, Edit>>({});

  const ex = EXAMPLES.find((e) => e.id === exId) ?? EXAMPLES[0];
  const st = Math.min(stage, ex.stages.length - 1);
  const shown = all ? ex.stages.map((_, i) => i) : [st];

  // block values: the example's defaults, replaced by valid edits
  const entries = ex.values.map(([k, r]) => {
    const e = edits[`${ex.id}:${k}`] ?? { n: coeffString(r.num), d: coeffString(r.den) };
    const num = parseCoeffs(e.n), den = parseCoeffs(e.d);
    const ok = !!num && !!den && trim(den).some((c) => c !== 0);
    return { k, e, value: ok ? ({ num: num!, den: den! } as Rational) : r, ok };
  });
  const allOk = entries.every((x) => x.ok);
  const vals = Object.fromEntries(entries.map((x) => [x.k, x.value]));
  const res = useMemo(() => reduce(ex.result(vals)), [ex, JSON.stringify(vals)]);
  const setEdit = (k: string, e: Edit) => setEdits({ ...edits, [`${ex.id}:${k}`]: e });
  const resetValues = () => setEdits(Object.fromEntries(Object.entries(edits).filter(([key]) => !key.startsWith(`${ex.id}:`))));

  const pzTex = (p: Poly) => {
    const r = cluster(roots(p)).filter(([z]) => z[1] >= -1e-12);
    if (!r.length || trim(p).length < 2) return `\\text{${t('none')}}`;
    return r.map(([z, m]) => (Math.abs(z[1]) < 1e-9 ? X.n(z[0]) : `${X.n(z[0])} \\pm j\\,${X.n(z[1])}`) + (m > 1 ? `\\ (\\times ${m})` : '')).join(',\\ ');
  };
  const poles = useMemo(() => (trim(res.den).length > 1 ? roots(res.den) : []), [res]);
  const unstable = poles.some((p) => p[0] > -1e-9);

  const stepSpec: PlotSpec = useMemo(() => {
    let T = 0;
    for (const r of poles) {
      if (r[0] < -1e-9) T = Math.max(T, 6 / -r[0]);
      if (Math.abs(r[1]) > 1e-9) T = Math.max(T, (3 * 2 * Math.PI) / Math.abs(r[1]));
      if (r[0] > -1e-9) T = Math.max(T, 10);
    }
    T = Math.min(Math.max(T, 2), 100);
    const N = 500;
    const tt = Array.from({ length: N + 1 }, (_, k) => (T * k) / N);
    const x = expand(reduce({ num: res.num, den: mul(res.den, [0, 1]) }));
    const y = tt.map((v) => timeValue(x, v));
    const fin = y.filter(Number.isFinite);
    const lo = Math.min(0, ...fin), hi = Math.max(0.1, ...fin);
    return {
      series: [{ x: tt, y, color: '--s1', width: 2.4, label: 'y(t)' }],
      xRange: [0, T], yRange: [lo - 0.06 * (hi - lo), hi + 0.06 * (hi - lo)], xLabel: 't', legend: false, hLines: [{ v: 0, color: '--axis' }],
    };
  }, [res, poles]);

  return (
    <div className="lab-app bdlab">
      <LabHeader logo={logoUrl} glyph={GLYPHS['block-diagrams']} lab="block-diagrams" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Card title={t('example')}>
            <select value={exId} onChange={(e) => { setExId(e.target.value); setStage(0); }}>
              {EXAMPLES.map((e) => <option key={e.id} value={e.id}>{EXAMPLE_NAMES[e.id][lang]}</option>)}
            </select>
            <Check label={t('showAll')} checked={all} onChange={setAll} />
          </Card>
          <Card title={t('secValues')} info={t('tipValues')}>
            <div className="val-grid">
              {entries.map(({ k, e, ok }) => (
                <div key={k} className="val-row">
                  <Tex tex={`${k}(s) =`} />
                  <div className="frac-in">
                    <input className={'coeff-input' + (parseCoeffs(e.n) ? '' : ' bad')} value={e.n} spellCheck={false} onChange={(ev) => setEdit(k, { ...e, n: ev.target.value })} />
                    <input className={'coeff-input' + (ok || !parseCoeffs(e.n) ? '' : ' bad')} value={e.d} spellCheck={false} onChange={(ev) => setEdit(k, { ...e, d: ev.target.value })} />
                  </div>
                </div>
              ))}
            </div>
            {!allOk && <p className="hint warn">{t('badValue')}</p>}
            <button type="button" className="small" onClick={resetValues}>{t('reset')}</button>
          </Card>
        </aside>
        <main className="lab-main">
          <p className="callout"><Rich text={t('ideaReduce')} /></p>
          {shown.map((i) => (
            <Card key={i} title={`${EXAMPLE_NAMES[ex.id][lang]} · ${t('stepN')} ${i + 1}/${ex.stages.length}`}>
              <p className="rule">{RULES[ex.stages[i].rule][lang]}</p>
              <div className="bd-scroll"><ChainDiagram chain={ex.stages[i].chain} /></div>
              {ex.stages[i].tex && <Tex block tex={ex.stages[i].tex!} />}
            </Card>
          ))}
          {!all && (
            <div className="row wrap step-nav">
              <button type="button" disabled={st === 0} onClick={() => setStage(st - 1)}>{t('prev')}</button>
              <button type="button" className="primary" disabled={st === ex.stages.length - 1} onClick={() => setStage(st + 1)}>{t('next')}</button>
            </div>
          )}
          {(all || st === ex.stages.length - 1) && (
            <div className="two-col stack-narrow">
              <Card title={t('result')}>
                <div className="eq-scroll"><Tex block tex={ex.final} /></div>
                <h4 className="sub">{t('withValues')}</h4>
                <div className="eq-scroll">
                  <Tex block tex={entries.map(({ k, value }) => `${k} = ${X.rational(value)}`).join(',\\quad ')} />
                  <Tex block tex={`\\frac{Y(s)}{R(s)} = ${X.rational(res)}`} />
                  <Tex block tex={`\\text{${t('poles')}}: ${pzTex(res.den)}`} />
                </div>
              </Card>
              <Card title={t('stepTitle')}>
                <Plot spec={stepSpec} height={240} />
                {unstable && <p className="hint warn">{t('unstable')}</p>}
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

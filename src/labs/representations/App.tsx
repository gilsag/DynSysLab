import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { Plot, type PlotSpec } from '@shared/Plot';
import { Card, Rich, Seg, Tex } from '@shared/ui';
import { expand, timeValue } from '@shared/pfe';
import { cluster, mul, reduce, roots, trim, type Poly } from '@shared/poly';
import { makeRationalTex } from '@shared/rationalTex';
import type { LabLang } from '@shared/suite';
import { translate, type Lang, type TKey } from './i18n';
import { CanonicalDiagram } from '@shared/BlockDiagram';
import { ccf, impulseSS, minimal, ocf, parseCoeffs, split, stepSS, type SS } from './math/rep';

type Src = 'poly' | 'ss';
type Form = 'ccf' | 'ocf' | 'given';
type Resp = 'step' | 'impulse';
type S6 = Record<LabLang, string>;
const POLY_PRESETS: { id: string; name: S6; q: string; p: string }[] = [
  { id: 'first', name: { es: 'Primer orden 2/(s + 2)', en: 'First order 2/(s + 2)', fr: 'Premier ordre 2/(s + 2)', de: 'Erste Ordnung 2/(s + 2)', it: 'Primo ordine 2/(s + 2)', pt: 'Primeira ordem 2/(s + 2)' }, q: '1 2', p: '2' },
  { id: 'second', name: { es: 'Segundo orden 5/(s² + 2s + 5)', en: 'Second order 5/(s² + 2s + 5)', fr: 'Second ordre 5/(s² + 2s + 5)', de: 'Zweite Ordnung 5/(s² + 2s + 5)', it: 'Secondo ordine 5/(s² + 2s + 5)', pt: 'Segunda ordem 5/(s² + 2s + 5)' }, q: '1 2 5', p: '5' },
  { id: 'zero', name: { es: 'Con un cero (s + 3)/(s² + 3s + 2)', en: 'With a zero (s + 3)/(s² + 3s + 2)', fr: 'Avec un zéro (s + 3)/(s² + 3s + 2)', de: 'Mit Nullstelle (s + 3)/(s² + 3s + 2)', it: 'Con uno zero (s + 3)/(s² + 3s + 2)', pt: 'Com um zero (s + 3)/(s² + 3s + 2)' }, q: '1 3 2', p: '1 3' },
  { id: 'biproper', name: { es: 'Bipropia (s² + 1)/(s² + 3s + 2): D ≠ 0', en: 'Biproper (s² + 1)/(s² + 3s + 2): D ≠ 0', fr: 'Biprope (s² + 1)/(s² + 3s + 2) : D ≠ 0', de: 'Biproper (s² + 1)/(s² + 3s + 2): D ≠ 0', it: 'Bipropria (s² + 1)/(s² + 3s + 2): D ≠ 0', pt: 'Biprópria (s² + 1)/(s² + 3s + 2): D ≠ 0' }, q: '1 3 2', p: '1 0 1' },
  { id: 'third', name: { es: 'Tercer orden 6/((s + 1)(s + 2)(s + 3))', en: 'Third order 6/((s + 1)(s + 2)(s + 3))', fr: 'Troisième ordre 6/((s + 1)(s + 2)(s + 3))', de: 'Dritte Ordnung 6/((s + 1)(s + 2)(s + 3))', it: 'Terzo ordine 6/((s + 1)(s + 2)(s + 3))', pt: 'Terceira ordem 6/((s + 1)(s + 2)(s + 3))' }, q: '1 6 11 6', p: '6' },
];
const SS_PRESETS: { id: string; name: S6; A: string[][]; B: string[]; C: string[]; D: string }[] = [
  { id: 'rlc', name: { es: 'Circuito RLC (vC, iL)', en: 'RLC circuit (vC, iL)', fr: 'Circuit RLC (vC, iL)', de: 'RLC-Schaltung (vC, iL)', it: 'Circuito RLC (vC, iL)', pt: 'Circuito RLC (vC, iL)' }, A: [['-1', '-10'], ['1', '-8']], B: ['1', '0'], C: ['1', '0'], D: '0' },
  { id: 'modal', name: { es: 'Forma modal, polos −1 y −3', en: 'Modal form, poles −1 and −3', fr: 'Forme modale, pôles −1 et −3', de: 'Modalform, Pole −1 und −3', it: 'Forma modale, poli −1 e −3', pt: 'Forma modal, polos −1 e −3' }, A: [['-1', '0'], ['0', '-3']], B: ['1', '1'], C: ['1', '2'], D: '0' },
  { id: 'nonmin', name: { es: 'No mínima: un modo no observable', en: 'Not minimal: an unobservable mode', fr: 'Non minimale : un mode non observable', de: 'Nicht minimal: eine nicht beobachtbare Eigenbewegung', it: 'Non minima: un modo non osservabile', pt: 'Não mínima: um modo não observável' }, A: [['-1', '0'], ['0', '-2']], B: ['1', '1'], C: ['1', '0'], D: '0' },
];
const num = (s: string) => {
  const v = parseFloat(s.replace(',', '.').replace('−', '-'));
  return Number.isFinite(v) ? v : NaN;
};

function CoeffField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const ok = parseCoeffs(text) !== null;
  return (
    <label className="field-row coeff-row">
      <Tex tex={`${label}:`} />
      <input className={'coeff-input' + (ok ? '' : ' bad')} value={text} spellCheck={false}
        onChange={(e) => { setText(e.target.value); if (parseCoeffs(e.target.value)) onChange(e.target.value); }} />
    </label>
  );
}
function Cell({ v, onChange }: { v: string; onChange: (s: string) => void }) {
  return <input className={'mcell' + (Number.isNaN(num(v)) ? ' bad' : '')} value={v} onChange={(e) => onChange(e.target.value)} />;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);
  const X = useMemo(() => makeRationalTex(lang), [lang]);

  const [resp, setResp] = useState<Resp>('step');
  const [src, setSrc] = useState<Src>('poly');
  const [preset, setPreset] = useState('zero');
  const [qs, setQs] = useState('1 3 2');
  const [ps, setPs] = useState('1 3');
  const [ssPreset, setSsPreset] = useState('rlc');
  const [mA, setA] = useState(SS_PRESETS[0].A);
  const [mB, setB] = useState(SS_PRESETS[0].B);
  const [mC, setC] = useState(SS_PRESETS[0].C);
  const [mD, setD] = useState(SS_PRESETS[0].D);
  const [form, setForm] = useState<Form>('ccf');

  const loadSS = (id: string) => {
    const p = SS_PRESETS.find((x) => x.id === id);
    setSsPreset(id);
    if (!p) return;
    setA(p.A); setB(p.B); setC(p.C); setD(p.D);
  };
  const resize = (n: number) => {
    setA(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => mA[i]?.[j] ?? '0')));
    setB(Array.from({ length: n }, (_, i) => mB[i] ?? '0'));
    setC(Array.from({ length: n }, (_, i) => mC[i] ?? '0'));
    setSsPreset('');
  };

  // ---------- the system in every form
  const model = useMemo(() => {
    if (src === 'poly') {
      const Q = parseCoeffs(qs), P = parseCoeffs(ps);
      if (!Q || !P || Q.length < 2 || Q.length > 5 || P.length > Q.length || Q[Q.length - 1] === 0) return null;
      const lead = Q[Q.length - 1];
      return { Q, P, H: reduce({ num: P, den: Q }), given: null as SS | null, cancelled: false, lead };
    }
    const n = mA.length;
    const A = mA.map((r) => r.map(num)), B = mB.map(num), C = mC.map(num), Dv = num(mD);
    if ([...A.flat(), ...B, ...C, Dv].some(Number.isNaN)) return null;
    const given: SS = { A, B, C, D: Dv };
    const m = minimal(given);
    // ODE from the reduced transfer function
    return { Q: m.H.den, P: m.H.num, H: m.H, given, cancelled: m.cancelled, lead: 1, n };
  }, [src, qs, ps, mA, mB, mC, mD]);

  const realization: SS | null = useMemo(() => {
    if (!model) return null;
    if (src === 'ss' && form === 'given') return model.given;
    return form === 'ocf' ? ocf(model.P, model.Q) : ccf(model.P, model.Q);
  }, [model, form, src]);
  const parts = model ? split(model.P, model.Q) : null;

  // ---------- step responses
  const stepSpec: PlotSpec | null = useMemo(() => {
    if (!model || !realization) return null;
    const ps2 = roots(model.H.den);
    let T = 0;
    for (const r of ps2) {
      if (r[0] < -1e-9) T = Math.max(T, 6 / -r[0]);
      if (Math.abs(r[1]) > 1e-9) T = Math.max(T, (3 * 2 * Math.PI) / Math.abs(r[1]));
      if (r[0] > 1e-9) T = Math.max(T, 3 / r[0]);
    }
    T = Math.min(Math.max(T, 2), 200);
    const N = 400;
    const tt = Array.from({ length: N + 1 }, (_, k) => (T * k) / N);
    const imp = resp === 'impulse';
    const x = expand(imp ? model.H : reduce({ num: model.H.num, den: mul(model.H.den, [0, 1]) }));
    const yH = tt.map((v) => timeValue(x, v));
    const ySS = imp ? impulseSS(realization, T, N) : stepSS(realization, T, N);
    const dW = imp ? realization.D : 0;
    const allY = [...yH, ...ySS, dW].filter(Number.isFinite);
    const lo = Math.min(0, ...allY), hi = Math.max(0.1, ...allY);
    return {
      series: [
        { x: tt, y: yH, color: '--s1', width: 4, alpha: 0.45, label: t('fromH') },
        { x: tt, y: ySS, color: '--c-approx', width: 1.8, dash: [6, 4], label: t('fromSS') },
        ...(Math.abs(dW) > 1e-12 ? [{ x: [0], y: [dW], color: '--c-comp', kind: 'arrow' as const, width: 2.6, label: 'D δ(t)' }] : []),
      ],
      xRange: [Math.abs(dW) > 1e-12 ? -0.04 * T : 0, T], yRange: [lo - 0.06 * (hi - lo), hi + 0.06 * (hi - lo)], xLabel: 't', legend: true, hLines: [{ v: 0, color: '--axis' }],
    };
  }, [model, realization, lang, resp]);

  // ---------- TeX
  const matTex = (M: number[][]) => `\\begin{bmatrix} ${M.map((r) => r.map((v) => X.n(v, 4)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
  const colTex = (v: number[]) => matTex(v.map((x) => [x]));
  const rowTex = (v: number[]) => matTex([v]);
  const paren = (p: Poly, v: string) => (trim(p).filter((c) => c !== 0).length > 1 ? `\\left(${X.poly(p, v)}\\right)` : X.poly(p, v));
  const odeTex = model ? `${paren(model.Q, 'D')}\\,y = ${model.P.length === 1 && Math.abs(model.P[0] - 1) < 1e-12 ? '' : paren(model.P, 'D') + '\\,'}u` : '';
  const pzTex = (p: Poly) => {
    const r = cluster(roots(p)).filter(([z]) => z[1] >= -1e-12);
    if (!r.length || trim(p).length < 2) return t('none');
    return r.map(([z, m]) => (Math.abs(z[1]) < 1e-9 ? X.n(z[0]) : `${X.n(z[0])} \\pm j\\,${X.n(z[1])}`) + (m > 1 ? `\\ (\\times ${m})` : '')).join(',\\ ');
  };
  const stateEqs = (ss: SS) => {
    const n = ss.A.length;
    const lines = ss.A.map((r, i) => {
      const terms: [number, string][] = [...r.map((v, j): [number, string] => [v, `x_{${j + 1}}`]), [ss.B[i], 'u']];
      const nz = terms.filter(([v]) => Math.abs(v) > 1e-12).map(([v, s]) => X.coefBody(v, s));
      return `\\dot x_{${i + 1}} &= ${X.join(nz)}`;
    });
    const yTerms: [number, string][] = [...ss.C.map((v, j): [number, string] => [v, `x_{${j + 1}}`]), [ss.D, 'u']];
    lines.push(`y &= ${X.join(yTerms.filter(([v]) => Math.abs(v) > 1e-12).map(([v, s]) => X.coefBody(v, s)))}`);
    return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}${n ? '' : ''}`;
  };

  return (
    <div className="lab-app replab">
      <LabHeader logo={logoUrl} glyph={GLYPHS.representations} lab="representations" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Card title={t('secSource')} info={src === 'poly' ? t('tipPoly') : t('tipSS')}>
            <Seg<Src> value={src} onChange={(v) => { setSrc(v); if (v === 'poly' && form === 'given') setForm('ccf'); if (v === 'ss') setForm('given'); }} options={[['poly', t('srcPoly')], ['ss', t('srcSS')]]} />
            {src === 'poly' ? (
              <>
                <label className="field">
                  <span>{t('examples')}</span>
                  <select value={preset} onChange={(e) => { const p = POLY_PRESETS.find((x) => x.id === e.target.value); setPreset(e.target.value); if (p) { setQs(p.q); setPs(p.p); } }}>
                    <option value="">{t('custom')}</option>
                    {POLY_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name[lang]}</option>)}
                  </select>
                </label>
                <CoeffField label="Q" value={qs} onChange={(s) => { setQs(s); setPreset(''); }} />
                <CoeffField label="P" value={ps} onChange={(s) => { setPs(s); setPreset(''); }} />
                {!model && <p className="hint warn">{t('badPoly')}</p>}
              </>
            ) : (
              <>
                <label className="field">
                  <span>{t('examples')}</span>
                  <select value={ssPreset} onChange={(e) => loadSS(e.target.value)}>
                    <option value="">{t('custom')}</option>
                    {SS_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name[lang]}</option>)}
                  </select>
                </label>
                <div className="field-row">
                  <span>n</span>
                  <button type="button" className="small" disabled={mA.length <= 1} onClick={() => resize(mA.length - 1)}>−</button>
                  <b>{mA.length}</b>
                  <button type="button" className="small" disabled={mA.length >= 4} onClick={() => resize(mA.length + 1)}>+</button>
                </div>
                <div className="mats">
                  <div className="mblock"><Tex tex="\mathbf{A}" /><div className="mgrid" style={{ gridTemplateColumns: `repeat(${mA.length}, 1fr)` }}>{mA.map((r, i) => r.map((v, j) => <Cell key={`${i}${j}`} v={v} onChange={(s) => { setA(mA.map((rr, ii) => rr.map((vv, jj) => (ii === i && jj === j ? s : vv)))); setSsPreset(''); }} />))}</div></div>
                  <div className="mblock"><Tex tex="\mathbf{B}" /><div className="mgrid" style={{ gridTemplateColumns: '1fr' }}>{mB.map((v, i) => <Cell key={i} v={v} onChange={(s) => { setB(mB.map((x, k) => (k === i ? s : x))); setSsPreset(''); }} />)}</div></div>
                  <div className="mblock"><Tex tex="\mathbf{C}" /><div className="mgrid" style={{ gridTemplateColumns: `repeat(${mC.length}, 1fr)` }}>{mC.map((v, i) => <Cell key={i} v={v} onChange={(s) => { setC(mC.map((x, k) => (k === i ? s : x))); setSsPreset(''); }} />)}</div></div>
                  <div className="mblock"><Tex tex="\mathbf{D}" /><div className="mgrid" style={{ gridTemplateColumns: '1fr' }}><Cell v={mD} onChange={(s) => { setD(s); setSsPreset(''); }} /></div></div>
                </div>
              </>
            )}
          </Card>
          <Card title={t('secForm')} info={t('tipForm')}>
            <Seg<Form> value={form} onChange={setForm} options={[...(src === 'ss' ? [['given', t('given')] as [Form, string]] : []), ['ccf', t('ccf')], ['ocf', t('ocf')]]} />
          </Card>
        </aside>
        <main className="lab-main">
          <p className="callout"><Rich text={t('ideaReps')} /></p>
          {!model || !realization || !parts ? (
            <p className="callout warn-callout">{t('badPoly')}</p>
          ) : (
            <>
              {model.cancelled && <p className="callout warn-callout">{t('cancelled')}</p>}
              <div className="two-col stack-narrow">
                <Card title={t('ode')}>
                  <Tex block tex={odeTex} />
                  <p className="hint">D = d/dt</p>
                </Card>
                <Card title={t('tf')}>
                  <Tex block tex={`H(s) = \\frac{Y(s)}{U(s)} = ${X.rational(model.H)}`} />
                  <Tex block tex={`\\text{${t('poles')}}: ${pzTex(model.H.den)};\\quad \\text{${t('zeros')}}: ${pzTex(model.H.num)}`} />
                </Card>
              </div>
              <div className="two-col stack-narrow">
                <Card title={`${t('ss')} · ${t(form === 'given' ? 'given' : form)}`}>
                  <div className="eq-scroll">
                    <Tex block tex={`\\mathbf{A} = ${matTex(realization.A)},\\ \\mathbf{B} = ${colTex(realization.B)},\\ \\mathbf{C} = ${rowTex(realization.C)},\\ \\mathbf{D} = ${X.n(realization.D)}`} />
                  </div>
                  <h4 className="sub">{t('firstOrder')}</h4>
                  <div className="eq-scroll"><Tex block tex={stateEqs(realization)} /></div>
                </Card>
                <Card title={t(resp === 'step' ? 'step' : 'impulse')} info={t(resp === 'step' ? 'tipStep' : 'tipImpulse')}>
                  <Seg<Resp> value={resp} onChange={setResp} options={[['step', t('segStep')], ['impulse', t('segImpulse')]]} />
                  {stepSpec && <Plot spec={stepSpec} height={240} />}
                  {resp === 'impulse' && Math.abs(realization.D) > 1e-12 && <p className="hint">{t('deltaNote')}</p>}
                </Card>
              </div>
              <Card title={`${t('bd')} · ${t(form === 'ocf' ? 'ocf' : 'ccf')}`} info={t('tipBd')}>
                <div className="bd-scroll">
                  <CanonicalDiagram form={form === 'ocf' ? 'ocf' : 'ccf'} a={parts.a} c={parts.c} d={parts.d} lang={lang} />
                </div>
                {form === 'given' && <p className="hint">{t('bdFromH')}</p>}
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

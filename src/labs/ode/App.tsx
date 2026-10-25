import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { fmt } from '@shared/format';
import { Plot, type PlotSpec, type Series } from '@shared/Plot';
import { Card, Check, NumField, Rich, Tex } from '@shared/ui';
import { atZero, timeValue, type Expansion } from '@shared/pfe';
import { cabs } from '@shared/poly';
import { makeRationalTex } from '@shared/rationalTex';
import type { LabLang } from '@shared/suite';
import { INPUT_NAMES, translate, type Lang, type TKey } from './i18n';
import { classical, gain, inputValue, parseCoeffs, solve, transientSteady, type Input, type InputKind } from './math/ode';

type Tab = 'classic' | 'z' | 'ts';
type S6 = Record<LabLang, string>;
interface Preset {
  id: string;
  name: S6;
  q: string;
  p: string;
  u: Input;
  ics: number[];
}
const st = (A = 1): Input => ({ kind: 'step', A, a: 1, w: 1, phi: 0 });
const PRESETS: Preset[] = [
  { id: 'first', name: { es: 'Primer orden: (D + 2) y = 2u', en: 'First order: (D + 2) y = 2u', fr: 'Premier ordre : (D + 2) y = 2u', de: 'Erste Ordnung: (D + 2) y = 2u', it: 'Primo ordine: (D + 2) y = 2u', pt: 'Primeira ordem: (D + 2) y = 2u' }, q: '1 2', p: '2', u: st(), ics: [0] },
  { id: 'firstIc', name: { es: 'Primer orden con y(0⁻) = 2', en: 'First order with y(0⁻) = 2', fr: 'Premier ordre avec y(0⁻) = 2', de: 'Erste Ordnung mit y(0⁻) = 2', it: 'Primo ordine con y(0⁻) = 2', pt: 'Primeira ordem com y(0⁻) = 2' }, q: '1 0,5', p: '0,5', u: st(), ics: [2] },
  { id: 'under', name: { es: 'Subamortiguado: (D² + 2D + 5) y = 5u', en: 'Underdamped: (D² + 2D + 5) y = 5u', fr: 'Sous-amorti : (D² + 2D + 5) y = 5u', de: 'Schwach gedämpft: (D² + 2D + 5) y = 5u', it: 'Sottosmorzato: (D² + 2D + 5) y = 5u', pt: 'Subamortecido: (D² + 2D + 5) y = 5u' }, q: '1 2 5', p: '5', u: st(), ics: [0, 0] },
  { id: 'critical', name: { es: 'Raíz doble: (D² + 4D + 4) y = 4u', en: 'Double root: (D² + 4D + 4) y = 4u', fr: 'Racine double : (D² + 4D + 4) y = 4u', de: 'Doppelwurzel: (D² + 4D + 4) y = 4u', it: 'Radice doppia: (D² + 4D + 4) y = 4u', pt: 'Raiz dupla: (D² + 4D + 4) y = 4u' }, q: '1 4 4', p: '4', u: st(), ics: [0, 0] },
  { id: 'over', name: { es: 'Raíces reales, y(0⁻) = 1: (D² + 5D + 4) y = 4u', en: 'Real roots, y(0⁻) = 1: (D² + 5D + 4) y = 4u', fr: 'Racines réelles, y(0⁻) = 1 : (D² + 5D + 4) y = 4u', de: 'Reelle Wurzeln, y(0⁻) = 1: (D² + 5D + 4) y = 4u', it: 'Radici reali, y(0⁻) = 1: (D² + 5D + 4) y = 4u', pt: 'Raízes reais, y(0⁻) = 1: (D² + 5D + 4) y = 4u' }, q: '1 5 4', p: '4', u: { kind: 'step', A: 2, a: 1, w: 1, phi: 0 }, ics: [1, 0] },
  { id: 'forced', name: { es: 'Oscilación forzada: (D² + 0,4D + 4) y = 4u, u = cos 1,5t', en: 'Forced oscillation: (D² + 0.4D + 4) y = 4u, u = cos 1.5t', fr: 'Oscillation forcée : (D² + 0,4D + 4) y = 4u, u = cos 1,5t', de: 'Erzwungene Schwingung: (D² + 0,4D + 4) y = 4u, u = cos 1,5t', it: 'Oscillazione forzata: (D² + 0,4D + 4) y = 4u, u = cos 1,5t', pt: 'Oscilação forçada: (D² + 0,4D + 4) y = 4u, u = cos 1,5t' }, q: '1 0,4 4', p: '4', u: { kind: 'cos', A: 1, a: 1, w: 1.5, phi: 0 }, ics: [0, 0] },
  { id: 'resonance', name: { es: 'Resonancia: (D² + 4) y = u, u = cos 2t', en: 'Resonance: (D² + 4) y = u, u = cos 2t', fr: 'Résonance : (D² + 4) y = u, u = cos 2t', de: 'Resonanz: (D² + 4) y = u, u = cos 2t', it: 'Risonanza: (D² + 4) y = u, u = cos 2t', pt: 'Ressonância: (D² + 4) y = u, u = cos 2t' }, q: '1 0 4', p: '1', u: { kind: 'cos', A: 1, a: 1, w: 2, phi: 0 }, ics: [0, 0] },
  { id: 'nonmin', name: { es: 'Respuesta inversa: (D² + 3D + 2) y = (−D + 2) u', en: 'Inverse response: (D² + 3D + 2) y = (−D + 2) u', fr: 'Réponse inverse : (D² + 3D + 2) y = (−D + 2) u', de: 'Gegenläufige Antwort: (D² + 3D + 2) y = (−D + 2) u', it: 'Risposta inversa: (D² + 3D + 2) y = (−D + 2) u', pt: 'Resposta inversa: (D² + 3D + 2) y = (−D + 2) u' }, q: '1 3 2', p: '-1 2', u: st(), ics: [0, 0] },
  { id: 'triple', name: { es: 'Raíz triple: (D + 1)³ y = u', en: 'Triple root: (D + 1)³ y = u', fr: 'Racine triple : (D + 1)³ y = u', de: 'Dreifache Wurzel: (D + 1)³ y = u', it: 'Radice tripla: (D + 1)³ y = u', pt: 'Raiz tripla: (D + 1)³ y = u' }, q: '1 3 3 1', p: '1', u: st(), ics: [0, 0, 0] },
  { id: 'unstable', name: { es: 'Inestable: (D − 0,5) y = u', en: 'Unstable: (D − 0.5) y = u', fr: 'Instable : (D − 0,5) y = u', de: 'Instabil: (D − 0,5) y = u', it: 'Instabile: (D − 0,5) y = u', pt: 'Instável: (D − 0,5) y = u' }, q: '1 -0,5', p: '1', u: st(), ics: [0] },
];
const INPUT_KINDS: InputKind[] = ['step', 'exp', 'cos', 'none'];
const NPTS = 700;

function CoeffField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const ok = parseCoeffs(text) !== null;
  return (
    <label className="field-row coeff-row">
      <Tex tex={`${label}:`} />
      <input className={'coeff-input' + (ok ? '' : ' bad')} value={text} spellCheck={false} inputMode="text"
        onChange={(e) => { setText(e.target.value); if (parseCoeffs(e.target.value)) onChange(e.target.value); }} />
    </label>
  );
}

const derivName = (i: number) => (i === 0 ? 'y' : i === 1 ? "y'" : i === 2 ? "y''" : `y^{(${i})}`);

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);
  const X = useMemo(() => makeRationalTex(lang), [lang]);

  const [preset, setPreset] = useState('under');
  const [qs, setQs] = useState(PRESETS[2].q);
  const [ps, setPs] = useState(PRESETS[2].p);
  const [u, setU] = useState<Input>(PRESETS[2].u);
  const [ics, setIcs] = useState<number[]>(PRESETS[2].ics);
  const [tab, setTab] = useState<Tab>('classic');
  const [showU, setShowU] = useState(true);
  const load = (id: string) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setQs(p.q);
    setPs(p.p);
    setU(p.u);
    setIcs(p.ics);
  };
  const edited = () => setPreset('');

  const q = parseCoeffs(qs) ?? [1, 1];
  const p = parseCoeffs(ps) ?? [1];
  const n = q.length - 1;
  const valid = n >= 1 && n <= 6 && p.length - 1 <= n && q[n] !== 0;
  const icv = Array.from({ length: Math.max(0, n) }, (_, i) => ics[i] ?? 0);
  const sol = useMemo(() => (valid ? solve(q, p, u, icv) : null), [qs, ps, u, icv.join(','), valid]);
  const cl = useMemo(() => (sol ? classical(sol) : null), [sol]);
  const ts = useMemo(() => (sol ? transientSteady(sol.x) : null), [sol]);

  // horizon from the slowest decaying mode and the input
  const T = useMemo(() => {
    if (!sol) return 10;
    let tt = 0;
    for (const [r] of sol.charRoots) {
      if (r[0] < -1e-9) tt = Math.max(tt, 6 / -r[0]);
      if (Math.abs(r[1]) > 1e-9) tt = Math.max(tt, (3 * 2 * Math.PI) / Math.abs(r[1]));
      if (r[0] > 1e-9) tt = Math.max(tt, 4 / r[0]);
    }
    if (u.kind === 'cos') tt = Math.max(tt, (4 * 2 * Math.PI) / u.w);
    if (u.kind === 'exp' && u.a > 0) tt = Math.max(tt, 5 / u.a);
    return Math.min(Math.max(tt, 1), 500);
  }, [sol, u]);
  const tsArr = useMemo(() => Array.from({ length: NPTS + 1 }, (_, k) => (T * k) / NPTS), [T]);

  const mk = (parts: [Expansion, string, string, number[]?][]): PlotSpec => {
    const s: Series[] = [];
    if (showU && u.kind !== 'none') s.push({ x: tsArr, y: tsArr.map((x) => inputValue(u, x)), color: '--c-muted', width: 1, dash: [2, 3], label: 'u(t)' });
    parts.forEach(([e, color, label, dash]) => s.push({ x: tsArr, y: tsArr.map((x) => timeValue(e, x)), color, width: color === '--s1' ? 2.6 : 1.7, dash, label }));
    const all = s.flatMap((q2) => Array.from(q2.y)).filter(Number.isFinite);
    let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const pad = 0.08 * (hi - lo);
    return { series: s, xRange: [0, T], yRange: [lo - pad, hi + pad], xLabel: 't', legend: true, hLines: [{ v: 0, color: '--axis' }] };
  };

  const eqTex = `${q.filter((c) => c !== 0).length > 1 ? `\\left(${X.poly(q, 'D')}\\right)` : X.poly(q, 'D')}\\, y = ${p.length > 1 ? `\\left(${X.poly(p, 'D')}\\right)` : p.length === 1 ? (Math.abs(p[0] - 1) < 1e-12 ? '' : Math.abs(p[0] + 1) < 1e-12 ? '-' : X.poly(p, 'D') + '\\,') : X.poly(p, 'D')}u`;
  const uTex = (() => {
    const A = Math.abs(u.A - 1) < 1e-12 ? '' : Math.abs(u.A + 1) < 1e-12 ? '-' : X.n(u.A);
    if (u.kind === 'step') return `u(t) = ${A}${A ? '\\,' : ''}\\mu(t)`;
    if (u.kind === 'exp') return `u(t) = ${A}\\,e^{${u.a < 0 ? '' : '-'}${X.n(Math.abs(u.a))}t}\\,\\mu(t)`;
    if (u.kind === 'cos') return `u(t) = ${A}\\cos(${X.n(u.w)}\\,t${u.phi === 0 ? '' : ` ${u.phi < 0 ? '-' : '+'} ${X.n(Math.abs(u.phi))}^\\circ`})\\,\\mu(t)`;
    return 'u(t) = 0';
  })();

  const modeTex = (r: [number, number], m: number) => {
    const ex = Math.abs(r[0]) < 1e-9 ? '' : Math.abs(Math.abs(r[0]) - 1) < 1e-12 ? `e^{${r[0] < 0 ? '-' : ''}t}` : `e^{${X.n(r[0])}t}`;
    const base = Math.abs(r[1]) < 1e-9 ? ex || '1' : `${ex}\\cos(${X.n(Math.abs(r[1]))}t),\\ ${ex}\\,${lang === 'es' || lang === 'pt' || lang === 'it' ? '\\operatorname{sen}' : '\\sin'}(${X.n(Math.abs(r[1]))}t)`;
    if (m === 1) return base;
    if (Math.abs(r[1]) < 1e-9) return Array.from({ length: m }, (_, j) => `${j === 0 ? '' : j === 1 ? 't\\,' : `t^{${j}}\\,`}${ex || '1'}`.replace(/\\,1$/, '')).join(',\\ ');
    return `${base}\\ \\ (\\times\\, t^{k},\\ k < ${m})`;
  };

  const beta = sol?.beta;
  const H = sol && beta && !sol.resonance ? gain(q, p, beta) : null;
  const y0p = sol ? atZero(sol.x) : NaN;
  const slow = sol ? Math.min(...sol.charRoots.map(([r]) => (r[0] < -1e-9 ? -r[0] : Infinity))) : Infinity;
  const marginal = sol ? sol.charRoots.some(([r]) => Math.abs(r[0]) <= 1e-9) : false;

  return (
    <div className="lab-app odelab">
      <LabHeader logo={logoUrl} glyph={GLYPHS.ode} lab="ode" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Card title={t('secEq')} info={t('tipEq')}>
            <label className="field">
              <span>{t('examples')}</span>
              <select value={preset} onChange={(e) => load(e.target.value)}>
                <option value="">{t('custom')}</option>
                {PRESETS.map((x) => <option key={x.id} value={x.id}>{x.name[lang]}</option>)}
              </select>
            </label>
            <CoeffField label="Q(D)" value={qs} onChange={(s) => { setQs(s); edited(); }} />
            <CoeffField label="P(D)" value={ps} onChange={(s) => { setPs(s); edited(); }} />
            {valid ? <Tex block tex={eqTex} /> : <p className="hint warn">{t('badEq')}</p>}
          </Card>
          <Card title={t('secInput')}>
            <p className="hint"><Rich text={t('tipInput')} /></p>
            <select value={u.kind} onChange={(e) => { setU({ ...u, kind: e.target.value as InputKind }); edited(); }}>
              {INPUT_KINDS.map((k) => <option key={k} value={k}>{INPUT_NAMES[k][lang]}</option>)}
            </select>
            {u.kind !== 'none' && (
              <div className="el-grid">
                <label className="field-row"><Tex tex="A =" /><NumField value={u.A} width={70} onChange={(v) => { setU({ ...u, A: v }); edited(); }} /></label>
                {u.kind === 'exp' && <label className="field-row"><Tex tex="a =" /><NumField value={u.a} width={70} onChange={(v) => { setU({ ...u, a: v }); edited(); }} /></label>}
                {u.kind === 'cos' && (
                  <>
                    <label className="field-row"><Tex tex="\omega =" /><NumField value={u.w} min={1e-3} width={70} onChange={(v) => { setU({ ...u, w: v }); edited(); }} /><span>rad/s</span></label>
                    <label className="field-row"><Tex tex="\varphi =" /><NumField value={u.phi} width={70} onChange={(v) => { setU({ ...u, phi: v }); edited(); }} /><span>°</span></label>
                  </>
                )}
              </div>
            )}
            <Tex block tex={uTex} />
          </Card>
          {valid && (
            <Card title={t('secIc')} info={t('tipIc')}>
              <div className="el-grid">
                {icv.map((v, i) => (
                  <label key={i} className="field-row">
                    <Tex tex={`${derivName(i)}(0^-) =`} />
                    <NumField value={v} width={70} onChange={(x) => { const a = [...icv]; a[i] = x; setIcs(a); edited(); }} />
                  </label>
                ))}
              </div>
              <button type="button" className="small" onClick={() => { setIcs(icv.map(() => 0)); edited(); }}>{t('allZero')}</button>
            </Card>
          )}
        </aside>
        <main className="lab-main">
          <nav className="tabs main-tabs">
            {(['classic', 'z', 'ts'] as Tab[]).map((k) => (
              <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {t(k === 'classic' ? 'tabClassic' : k === 'z' ? 'tabZ' : 'tabTs')}
              </button>
            ))}
          </nav>
          {!sol || !cl || !ts ? (
            <p className="callout warn-callout">{t('badEq')}</p>
          ) : (
            <>
              {tab === 'classic' && (
                <>
                  <p className="callout"><Rich text={t('ideaClassic')} /></p>
                  <div className="two-col stack-narrow">
                    <Card title={t('modes')} info={t('tipModes')}>
                      <Tex block tex={`Q(\\lambda) = ${X.poly(q, '\\lambda')} = 0`} />
                      <div className="tbl-scroll">
                        <table className="ode-table">
                          <thead><tr><th>{t('root')}</th><th>{t('mult')}</th><th>{t('mode')}</th><th>{t('tau')}</th></tr></thead>
                          <tbody>
                            {sol.charRoots.filter(([r]) => r[1] >= -1e-12).map(([r, m], i) => (
                              <tr key={i}>
                                <td><Tex tex={Math.abs(r[1]) < 1e-9 ? X.n(r[0]) : `${X.n(r[0])} \\pm j\\,${X.n(r[1])}`} /></td>
                                <td>{m}</td>
                                <td><Tex tex={modeTex(r, m)} /></td>
                                <td>{r[0] < -1e-9 ? `${fmt(-1 / r[0], lang, 3)} s` : r[0] > 1e-9 ? t('grows') : t('persists')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                    <Card title={t('forced')}>
                      {!beta || u.kind === 'none' ? (
                        <p className="hint">{t('noInput')}</p>
                      ) : sol.resonance ? (
                        <>
                          <Tex block tex={`\\beta = ${X.cx(beta)}`} />
                          <p className="hint warn"><Rich text={t('resonance')} /></p>
                        </>
                      ) : (
                        <>
                          <Tex block tex={`\\beta = ${X.cx(beta)},\\qquad H(\\beta) = \\frac{P(\\beta)}{Q(\\beta)} = ${H ? X.cx(H) : '—'}`} />
                          {u.kind === 'cos' && H && (
                            <Tex block tex={`|H(j\\omega)| = ${X.n(cabs(H))},\\quad \\angle H(j\\omega) = ${X.n((Math.atan2(H[1], H[0]) * 180) / Math.PI)}^\\circ`} />
                          )}
                        </>
                      )}
                      <div className="eq-scroll">
                        <Tex block tex={`y_p(t) = ${X.timeFn(cl.part)}`} />
                      </div>
                    </Card>
                  </div>
                  <Card title={t('solution')} info={t('tipSolution')}>
                    <div className="eq-scroll">
                      <Tex block tex={`y_h(t) = ${X.timeFn(cl.hom)}`} />
                      <Tex block tex={`y(t) = y_h(t) + y_p(t),\\quad t > 0`} />
                    </div>
                    <Check label={t('showInput')} checked={showU} onChange={setShowU} />
                    <Plot spec={mk([[cl.hom, '--c-comp', `y_h (${t('hom')})`, [3, 3]], [cl.part, '--c-approx', `y_p (${t('part')})`, [6, 4]], [sol.x, '--s1', 'y(t)']])} height={290} />
                  </Card>
                </>
              )}
              {tab === 'z' && (
                <>
                  <p className="callout"><Rich text={t('ideaZ')} /></p>
                  <Card title={t('laplaceTitle')}>
                    <p className="hint"><Rich text={t('tipLaplace')} /></p>
                    <div className="eq-scroll">
                      <Tex block tex={`Y(s) = \\underbrace{${X.rational(sol.Yzs)}}_{\\text{${t('zs')}}} + \\underbrace{${X.rational(sol.Yzi)}}_{\\text{${t('zi')}}}`} />
                      <Tex block tex={`y_{zs}(t) = ${X.timeFn(sol.xzs)}`} />
                      <Tex block tex={`y_{zi}(t) = ${X.timeFn(sol.xzi)}`} />
                    </div>
                  </Card>
                  <Card title={t('plot')}>
                    <Check label={t('showInput')} checked={showU} onChange={setShowU} />
                    <Plot spec={mk([[sol.xzi, '--c-comp', `y_zi (${t('zi')})`, [3, 3]], [sol.xzs, '--c-approx', `y_zs (${t('zs')})`, [6, 4]], [sol.x, '--s1', 'y(t)']])} height={290} />
                  </Card>
                  <Card title={t('initialValues')}>
                    <Tex block tex={`y(0^-) = ${X.n(icv[0] ?? 0)},\\qquad y(0^+) = ${X.n(y0p)}`} />
                    {Math.abs(y0p - (icv[0] ?? 0)) > 1e-6 && <p className="hint">{t('jumpNote')}</p>}
                  </Card>
                </>
              )}
              {tab === 'ts' && (
                <>
                  <p className="callout"><Rich text={t('ideaTs')} /></p>
                  <Card title={t('ssTitle')}>
                    {ts.unstable ? (
                      <p className="hint warn">{t('noSs')}</p>
                    ) : (
                      <>
                        <div className="eq-scroll">
                          <Tex block tex={`y_{tr}(t) = ${X.timeFn(ts.tr)}`} />
                          <Tex block tex={`y_{ss}(t) = ${X.timeFn(ts.ss)}`} />
                        </div>
                        {Number.isFinite(slow) && <p className="hint">{t('settle')}: {fmt(4 / slow, lang, 3)} s</p>}
                        {marginal && <p className="hint">{t('marginal')}</p>}
                        {u.kind === 'cos' && <p className="hint"><Rich text={t('sinSs')} /></p>}
                      </>
                    )}
                  </Card>
                  <Card title={t('plot')}>
                    <Check label={t('showInput')} checked={showU} onChange={setShowU} />
                    <Plot spec={mk(ts.unstable ? [[sol.x, '--s1', 'y(t)']] : [[ts.tr, '--c-comp', `y_tr (${t('tr')})`, [3, 3]], [ts.ss, '--c-approx', `y_ss (${t('ss')})`, [6, 4]], [sol.x, '--s1', 'y(t)']])} height={290} />
                  </Card>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}


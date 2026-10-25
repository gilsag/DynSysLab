import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { ExprInput } from '@shared/ExprInput';
import { tryFormula } from '@shared/expr';
import { fmt, tex as texNum } from '@shared/format';
import { autoRange, Plot, type PlotSpec, type RefLine, type Series } from '@shared/Plot';
import { Card, Check, NumField, Rich, Seg, Tex } from '@shared/ui';
import { IN_NAMES, SIG_NAMES, SYS_NAMES, SYS_WHY, translate, type Lang, type TKey } from './i18n';
import { classify, discretePeriodPi, RAMP_PRODUCTS, SIG_KINDS, sigFn, type SigKind, type SigPar } from './math/signals';
import {
  battery, BOUNDED_KINDS, causalityExp, DT, IN_KINDS, inputFn, invarianceExp, linearityExp, memoryExp, pointwise, PROPS, snap,
  stabilityExp, SYSTEMS, type Fn, type Grid, type InKind, type Prop, type Run, type SysId,
} from './math/systems';

type Tab = 'signals' | 'linear' | 'ti' | 'causal' | 'memory' | 'stable' | 'summary';
const TABS: [Tab, TKey][] = [
  ['signals', 'tabSignals'], ['linear', 'tabLinear'], ['ti', 'tabTi'], ['causal', 'tabCausal'],
  ['memory', 'tabMemory'], ['stable', 'tabStable'], ['summary', 'tabSummary'],
];
const PROP_KEY: Record<Prop, TKey> = { linear: 'pLinear', ti: 'pTi', causal: 'pCausal', memoryless: 'pMemoryless', stable: 'pStable' };
type SysChoice = SysId | 'custom';

const SIG_WIN: [number, number] = [-6, 6];
const SIG_DT = 1 / 128;
const sigGrid = Array.from({ length: Math.round((SIG_WIN[1] - SIG_WIN[0]) / SIG_DT) + 1 }, (_, k) => SIG_WIN[0] + k * SIG_DT);

const sinWord = (lang: Lang, s: string) => (lang === 'es' || lang === 'pt' || lang === 'it' ? s.replace(/\\sin/g, '\\operatorname{sen}') : s);
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w)\}/g, (m, k: string) => v[k] ?? m);

function Verdict({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={'verdict ' + (ok ? 'ok' : 'bad')}>
      <span className={'badge ' + (ok ? 'ok' : 'bad')}>{ok ? '✓' : '✗'}</span>
      <span><Rich text={text} /></span>
    </p>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);
  const [tab, setTab] = useState<Tab>('signals');

  /* ---------------------------------------------------------------- signals state */
  const [sk, setSk] = useState<SigKind>('rect');
  const [par, setPar] = useState<SigPar>({ a: -1, w: 2, phi: 0, eps: 0.25 });
  const [xSrc, setXSrc] = useState('exp(-t^2) * cos(3t)');
  const [A, setA] = useState(1);
  const [alpha, setAlpha] = useState(2);
  const [t0, setT0] = useState(1);
  const [Ts, setTs] = useState(0.25);
  const [dMode, setDMode] = useState<'pi' | 'rad'>('pi');
  const [dp, setDp] = useState(1);
  const [dq, setDq] = useState(4);
  const [dOm, setDOm] = useState(1);

  /* ---------------------------------------------------------------- systems state */
  const [sys, setSys] = useState<SysChoice>('delay');
  const [sysSrc, setSysSrc] = useState('u^3');
  const [uSrc, setUSrc] = useState('exp(-(t-2)^2)');
  const [lin, setLin] = useState({ u1: 'step' as InKind, u2: 'sin' as InKind, a: 2, b: 0.5 });
  const [tiP, setTiP] = useState({ u: 'pulse' as InKind, tau: 2 });
  const [caP, setCaP] = useState({ u: 'step' as InKind, t1: 2 });
  const [meP, setMeP] = useState({ u: 'step' as InKind, c: 3 });
  const [stP, setStP] = useState<InKind>('step');
  const [showTheory, setShowTheory] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowTheory(false), [sys, tab]);

  const xCustom = useMemo(() => {
    const r = tryFormula(xSrc, ['t']);
    return r.ok ? (r.formula.f as Fn) : undefined;
  }, [xSrc]);
  const uCustom = useMemo(() => {
    const r = tryFormula(uSrc, ['t']);
    return r.ok ? (r.formula.f as Fn) : undefined;
  }, [uSrc]);
  const sysF = useMemo(() => {
    const r = tryFormula(sysSrc, ['u', 't']);
    return r.ok ? r.formula.f : undefined;
  }, [sysSrc]);
  const ownBattery = useMemo(() => (sysF ? battery((v, tt) => sysF(v, tt)) : null), [sysF]);
  const run: Run = useMemo(() => (sys === 'custom' ? pointwise((v, tt) => (sysF ? sysF(v, tt) : NaN)) : SYSTEMS.find((s) => s.id === sys)!.run), [sys, sysF]);
  const inp = (k: InKind) => inputFn(k, uCustom);
  const sysDef = sys === 'custom' ? null : SYSTEMS.find((s) => s.id === sys)!;

  /* ---------------------------------------------------------------- experiments */
  const L = useMemo(() => (tab === 'linear' ? linearityExp(run, inp(lin.u1), inp(lin.u2), lin.a, lin.b) : null), [tab, run, lin, uCustom]);
  const TI = useMemo(() => (tab === 'ti' ? invarianceExp(run, inp(tiP.u), tiP.tau) : null), [tab, run, tiP, uCustom]);
  const CA = useMemo(() => (tab === 'causal' ? causalityExp(run, inp(caP.u), caP.t1) : null), [tab, run, caP, uCustom]);
  const ME = useMemo(() => (tab === 'memory' ? memoryExp(run, inp(meP.u), meP.c) : null), [tab, run, meP, uCustom]);
  const ST = useMemo(() => (tab === 'stable' ? stabilityExp(run, inp(stP)) : null), [tab, run, stP, uCustom]);

  const ser = (y: ArrayLike<number>, g: Grid, color: string, label: string, dash?: number[], width = 1.8): Series => ({ y, xStart: g.a, xStep: DT, color, label, dash, width });
  const spec = (series: Series[], g: Grid, vLines: RefLine[] = []): PlotSpec => ({
    series,
    xRange: [g.a, g.a + g.n * DT],
    yRange: autoRange(series.map((s) => s.y)),
    xLabel: 't',
    legend: true,
    hLines: [{ v: 0, color: '--axis' }],
    vLines,
  });

  /* ---------------------------------------------------------------- signals computations */
  const x = useMemo(() => sigFn(sk, par, xCustom), [sk, par, xCustom]);
  const xc = useMemo(() => classify(sk, par, x), [sk, par, x]);
  const yT: Fn = (tt) => A * x(alpha * tt - t0);
  const sigSpec = (series: Series[]): PlotSpec => ({ series, xRange: SIG_WIN, yRange: autoRange(series.map((s) => s.y)), xLabel: 't', legend: true, hLines: [{ v: 0, color: '--axis' }] });
  const sline = (f: Fn, color: string, label: string, dash?: number[], width = 2): Series => ({ x: sigGrid, y: sigGrid.map(f), color, label, dash, width });
  const nRange = useMemo(() => {
    const T = Math.max(Ts, 0.05);
    const n0 = Math.ceil(SIG_WIN[0] / T), n1 = Math.floor(SIG_WIN[1] / T);
    return Array.from({ length: n1 - n0 + 1 }, (_, i) => n0 + i);
  }, [Ts]);
  const disc = dMode === 'pi' ? { Om: (dp / Math.max(1, dq)) * Math.PI, per: discretePeriodPi(Math.round(dp), Math.max(1, Math.round(dq))) } : { Om: dOm, per: Math.abs(dOm) < 1e-15 ? { N: 1, num: 0, den: 1 } : null };
  const nDisc = Array.from({ length: 41 }, (_, i) => i);
  const tDisc = Array.from({ length: 801 }, (_, i) => i / 20);

  const yesNo = (b: boolean) => t(b ? 'yes' : 'no');
  const sysTex = (id: SysId) => sinWord(lang, SYSTEMS.find((s) => s.id === id)!.tex);
  const n3 = (v: number) => fmt(v, lang, 3);
  const tx = (v: number) => texNum(v, lang, 3);
  const coef = (c: number) => (Math.abs(c - 1) < 1e-12 ? '' : Math.abs(c + 1) < 1e-12 ? '-' : tx(c) + '\\,');
  const shiftTex = (v: number) => (Math.abs(v) < 1e-12 ? '' : ` ${v < 0 ? '+' : '-'} ${tx(Math.abs(v))}`);
  const transformTex = Math.abs(t0) < 1e-12
    ? `y(t) = ${coef(A)}x(${coef(alpha)}t)`
    : `y(t) = ${coef(A)}x(${coef(alpha)}t${shiftTex(t0)}) = ${coef(A)}x\\big(${Math.abs(alpha - 1) < 1e-12 ? `t${shiftTex(t0)}` : `${coef(alpha)}(t${shiftTex(t0 / alpha)})`}\\big)`;

  /* ---------------------------------------------------------------- theory box */
  const theory = (p: Prop) => {
    const v = sysDef ? sysDef.props[p] : ownBattery?.[p];
    return (
      <div className="theory">
        <button type="button" className="small" onClick={() => setShowTheory(!showTheory)}>{t(showTheory ? 'hideTheory' : 'showTheory')}</button>
        {showTheory && (
          <div className="theory-body">
            <p>
              <strong>{t(PROP_KEY[p])}: </strong>
              {v === undefined ? '—' : <span className={'badge ' + (v ? 'ok' : 'bad')}>{yesNo(v)}</span>}
              {!sysDef && <span className="hint"> ({p === 'causal' || p === 'memoryless' ? t('byConstruction') : t('autoTests')})</span>}
            </p>
            <p className="hint"><Rich text={sysDef ? SYS_WHY[sysDef.id][lang] : t('ownNote')} /></p>
          </div>
        )}
      </div>
    );
  };

  const inSel = (value: InKind, onChange: (k: InKind) => void, kinds: InKind[] = IN_KINDS) => (
    <select value={value} onChange={(e) => onChange(e.target.value as InKind)}>
      {kinds.map((k) => <option key={k} value={k}>{IN_NAMES[k][lang]}</option>)}
    </select>
  );
  const usesOwnInput =
    (tab === 'linear' && (lin.u1 === 'custom' || lin.u2 === 'custom')) || (tab === 'ti' && tiP.u === 'custom') || (tab === 'causal' && caP.u === 'custom') ||
    (tab === 'memory' && meP.u === 'custom') || (tab === 'stable' && stP === 'custom');

  return (
    <div className="lab-app proplab">
      <LabHeader logo={logoUrl} glyph={GLYPHS.properties} lab="properties" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          {tab === 'signals' ? (
            <>
              <Card title={t('secSignal')}>
                <select value={sk} onChange={(e) => setSk(e.target.value as SigKind)}>
                  {SIG_KINDS.map((k) => <option key={k} value={k}>{SIG_NAMES[k][lang]}</option>)}
                </select>
                <div className="el-grid">
                  {(sk === 'exp' || sk === 'dampcos' || sk === 'texp' || sk === 'tdampcos') && <label className="field-row"><Tex tex="a =" /><NumField value={par.a} width={70} onChange={(v) => setPar({ ...par, a: v })} /></label>}
                  {(sk === 'cos' || sk === 'dampcos' || sk === 'tcos' || sk === 'tdampcos') && <label className="field-row"><Tex tex="\omega =" /><NumField value={par.w} width={70} onChange={(v) => setPar({ ...par, w: v })} /><span>rad/s</span></label>}
                  {sk === 'cos' && <label className="field-row"><Tex tex="\varphi =" /><NumField value={par.phi} width={70} onChange={(v) => setPar({ ...par, phi: v })} /><span>°</span></label>}
                  {sk === 'impulse' && <label className="field-row"><Tex tex="\varepsilon =" /><NumField value={par.eps} min={0.05} max={2} width={70} onChange={(v) => setPar({ ...par, eps: v })} /></label>}
                </div>
                {sk === 'custom' && <ExprInput label="x(t) =" value={xSrc} vars={['t']} lang={lang} onChange={(s) => setXSrc(s)} />}
              </Card>
              <Card title={t('secTransform')} info={t('tipTransform')}>
                <div className="el-grid">
                  <label className="field-row"><Tex tex="A =" /><NumField value={A} width={70} onChange={setA} /></label>
                  <label className="field-row"><Tex tex="\alpha =" /><NumField value={alpha} width={70} onChange={(v) => setAlpha(Math.abs(v) < 0.05 ? (v < 0 ? -0.05 : 0.05) : v)} /></label>
                  <label className="field-row"><Tex tex="t_0 =" /><NumField value={t0} width={70} onChange={setT0} /></label>
                </div>
                <button type="button" className="small" onClick={() => { setA(1); setAlpha(1); setT0(0); }}>y = x</button>
              </Card>
              <Card title={t('secSampling')}>
                <label className="field-row"><Tex tex="T_s =" /><NumField value={Ts} min={0.1} max={3} width={70} onChange={setTs} /><span>s</span></label>
              </Card>
              <Card title={t('secDiscrete')}>
                <Seg value={dMode} options={[['pi', t('modePi')], ['rad', t('modeRad')]]} onChange={setDMode} />
                {dMode === 'pi' ? (
                  <div className="el-grid">
                    <label className="field-row"><Tex tex="p =" /><NumField value={dp} width={70} onChange={(v) => setDp(Math.round(v))} /></label>
                    <label className="field-row"><Tex tex="q =" /><NumField value={dq} min={1} width={70} onChange={(v) => setDq(Math.max(1, Math.round(v)))} /></label>
                  </div>
                ) : (
                  <label className="field-row"><Tex tex="\Omega =" /><NumField value={dOm} width={70} onChange={setDOm} /></label>
                )}
              </Card>
            </>
          ) : (
            <>
              <Card title={t('secSystem')} info={t('tipSystem')}>
                <select value={sys} onChange={(e) => setSys(e.target.value as SysChoice)}>
                  {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{SYS_NAMES[s.id][lang]}</option>)}
                  <option value="custom">{t('ownSystem')}</option>
                </select>
                {sys === 'custom' ? (
                  <>
                    <ExprInput label="y(t) =" value={sysSrc} vars={['u', 't']} lang={lang} onChange={(s) => setSysSrc(s)} />
                    <p className="hint">{t('ownNote')}</p>
                  </>
                ) : (
                  <div className="eq-scroll"><Tex block tex={sysTex(sys)} /></div>
                )}
              </Card>
              {tab !== 'summary' && (
                <Card title={t('secExp')}>
                  {tab === 'linear' && (
                    <>
                      <label className="field"><Tex tex="u_1(t)" />{inSel(lin.u1, (k) => setLin({ ...lin, u1: k }))}</label>
                      <label className="field"><Tex tex="u_2(t)" />{inSel(lin.u2, (k) => setLin({ ...lin, u2: k }))}</label>
                      <div className="el-grid two">
                        <label className="field-row"><Tex tex="a =" /><NumField value={lin.a} width={64} onChange={(v) => setLin({ ...lin, a: v })} /></label>
                        <label className="field-row"><Tex tex="b =" /><NumField value={lin.b} width={64} onChange={(v) => setLin({ ...lin, b: v })} /></label>
                      </div>
                    </>
                  )}
                  {tab === 'ti' && (
                    <>
                      <label className="field"><span>{t('input')}</span>{inSel(tiP.u, (k) => setTiP({ ...tiP, u: k }))}</label>
                      <label className="field-row"><span>{t('shift')}</span><Tex tex="\tau =" /><NumField value={tiP.tau} min={-4} max={6} width={64} onChange={(v) => setTiP({ ...tiP, tau: snap(v) })} /><span>s</span></label>
                    </>
                  )}
                  {tab === 'causal' && (
                    <>
                      <label className="field"><span>{t('input')}</span>{inSel(caP.u, (k) => setCaP({ ...caP, u: k }))}</label>
                      <label className="field-row"><span>{t('changeAt')}</span><Tex tex="t_1 =" /><NumField value={caP.t1} min={-3} max={9} width={64} onChange={(v) => setCaP({ ...caP, t1: snap(v) })} /><span>s</span></label>
                    </>
                  )}
                  {tab === 'memory' && (
                    <>
                      <label className="field"><span>{t('input')}</span>{inSel(meP.u, (k) => setMeP({ ...meP, u: k }))}</label>
                      <label className="field-row"><span>{t('bumpAt')}</span><Tex tex="c =" /><NumField value={meP.c} min={-3} max={10} width={64} onChange={(v) => setMeP({ ...meP, c: snap(v) })} /><span>s</span></label>
                    </>
                  )}
                  {tab === 'stable' && (
                    <>
                      <label className="field"><span>{t('input')}</span>{inSel(stP, setStP, BOUNDED_KINDS)}</label>
                      <p className="hint">{t('boundedOnly')}</p>
                    </>
                  )}
                  {usesOwnInput && <ExprInput label="u(t) =" value={uSrc} vars={['t']} lang={lang} onChange={(s) => setUSrc(s)} />}
                  {(tab === 'ti' || tab === 'causal' || tab === 'memory') && <p className="hint">{t('snapped')}</p>}
                </Card>
              )}
            </>
          )}
        </aside>
        <main className="lab-main">
          <nav className="tabs main-tabs">
            {TABS.map(([k, key]) => (
              <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t(key)}</button>
            ))}
          </nav>

          {tab === 'signals' && (
            <>
              <p className="callout"><Rich text={t('ideaSignals')} /></p>
              <Card title={t('transformTitle')}>
                <div className="eq-scroll">
                  <Tex block tex={transformTex} />
                </div>
                <Plot spec={sigSpec([sline(x, '--c-muted', 'x(t)', [5, 3], 1.8), sline(yT, '--s1', 'y(t)')])} height={260} />
                {sk === 'impulse' && <p className="hint"><Rich text={t('impulseNote')} /></p>}
                {RAMP_PRODUCTS.includes(sk) && <p className="hint"><Rich text={t('rampNote')} /></p>}
              </Card>
              <div className="two-col stack-narrow">
                <Card title={t('classTitle')}>
                  <table className="prop-table">
                    <tbody>
                      <tr><th>{t('cCausal')}</th><td>{yesNo(xc.causal)}</td></tr>
                      <tr><th>{t('cEven')}</th><td>{yesNo(xc.even)}</td></tr>
                      <tr><th>{t('cOdd')}</th><td>{yesNo(xc.odd)}</td></tr>
                      <tr><th>{t('cPeriodic')}</th><td>{sk === 'custom' ? '—' : xc.period ? <Tex tex={`T = 2\\pi/${tx(Math.abs(par.w))} = ${tx(xc.period)}`} /> : sk === 'cos' ? t('yes') : t('no')}</td></tr>
                      <tr><th>{t('cEnergy')}</th><td>{xc.energy === undefined ? '—' : <Tex tex={`E = ${tx(xc.energy)}`} />}</td></tr>
                      <tr><th>{t('cPower')}</th><td>{xc.power === undefined || Number.isNaN(xc.power) ? '—' : <Tex tex={`P = ${tx(xc.power)}`} />}</td></tr>
                      <tr><th>{t('cClass')}</th><td>{xc.cls ? t(xc.cls === 'energy' ? 'clsEnergy' : xc.cls === 'power' ? 'clsPower' : 'clsNeither') : '—'}</td></tr>
                    </tbody>
                  </table>
                  <p className="hint">{t('checkedOn')}{sk === 'custom' ? ` ${t('cPeriodic')}, ${t('cEnergy').toLowerCase()}, ${t('cPower').toLowerCase()}: ${t('notComputed')}.` : ''}</p>
                </Card>
                <Card title={t('evenOddTitle')}>
                  <Tex block tex={`y_e(t) = \\tfrac{y(t) + y(-t)}{2},\\qquad y_o(t) = \\tfrac{y(t) - y(-t)}{2}`} />
                  <Plot
                    spec={sigSpec([
                      sline(yT, '--c-muted', 'y(t)', undefined, 3),
                      sline((tt) => (yT(tt) + yT(-tt)) / 2, '--c-comp', `y_e (${t('even')})`, [6, 3]),
                      sline((tt) => (yT(tt) - yT(-tt)) / 2, '--c-approx', `y_o (${t('odd')})`, [2, 2]),
                    ])}
                    height={240}
                  />
                </Card>
              </div>
              <div className="two-col stack-narrow">
                <Card title={t('sampledTitle')}>
                  <Plot
                    spec={sigSpec([
                      sline(x, '--c-muted', 'x(t)', [4, 3], 1.4),
                      { x: nRange.map((n) => n * Ts), y: nRange.map((n) => x(n * Ts)), color: '--s1', kind: 'stem', label: 'x[n]' },
                    ])}
                    height={240}
                  />
                  <p className="hint"><Rich text={t('sampledNote')} /></p>
                </Card>
                <Card title={t('discTitle')}>
                  <Tex block tex={dMode === 'pi' ? `x[n] = \\cos\\big(\\tfrac{${Math.round(dp)}}{${Math.max(1, Math.round(dq))}}\\pi\\, n\\big)` : `x[n] = \\cos(${tx(dOm)}\\, n)`} />
                  <Plot
                    spec={{
                      series: [
                        { x: tDisc, y: tDisc.map((tt) => Math.cos(disc.Om * tt)), color: '--c-muted', width: 1.2, dash: [4, 3], label: t('envelope') },
                        { x: nDisc, y: nDisc.map((n) => Math.cos(disc.Om * n)), color: '--s1', kind: 'stem', label: 'x[n]' },
                      ],
                      xRange: [0, 40],
                      yRange: [-1.15, 1.15],
                      xLabel: 'n',
                      legend: true,
                      hLines: [{ v: 0, color: '--axis' }],
                      vLines: disc.per && disc.per.N > 1 && disc.per.N <= 40 ? [{ v: disc.per.N, color: '--c-comp', dash: [5, 4], label: 'N' }] : [],
                    }}
                    height={220}
                  />
                  {disc.per ? (
                    disc.per.N === 1 && disc.per.num === 0 && dMode === 'rad' ? <p className="hint">{t('discConst')}</p> : <Verdict ok text={fill(t('discPeriodic'), { N: String(disc.per.N), f: disc.per.num === 0 ? '0' : `\\tfrac{${disc.per.num}}{${disc.per.den}}` })} />
                  ) : (
                    <Verdict ok={false} text={t('discNot')} />
                  )}
                  <p className="hint"><Rich text={t('discIdea')} /></p>
                </Card>
              </div>
            </>
          )}

          {tab === 'linear' && L && (
            <>
              <p className="callout"><Rich text={t('ideaLinear')} /></p>
              <Card title={t('inputs')}>
                <Plot spec={spec([ser(L.u1, L.g, '--s2', 'u₁', undefined, 1.4), ser(L.u2, L.g, '--s3', 'u₂', undefined, 1.4), ser(L.uc, L.g, '--s1', 'a u₁ + b u₂', undefined, 2.2)], L.g)} height={220} />
              </Card>
              <Card title={t('outputs')}>
                <Plot spec={spec([ser(L.lhs, L.g, '--s1', 'S{a u₁ + b u₂}', undefined, 2.6), ser(L.rhs, L.g, '--c-approx', 'a y₁ + b y₂', [6, 4], 2)], L.g)} height={260} />
              </Card>
              <Card title={t('result')}>
                <Verdict ok={L.cmp.first === null} text={L.cmp.first === null ? t('linOk') : fill(t('linFail'), { d: n3(L.cmp.d) })} />
                <p className="hint">{t('oneWay')}</p>
                {theory('linear')}
              </Card>
            </>
          )}

          {tab === 'ti' && TI && (
            <>
              <p className="callout"><Rich text={t('ideaTi')} /></p>
              <Card title={t('inputs')}>
                <Plot spec={spec([ser(TI.u, TI.g, '--c-muted', 'u(t)', undefined, 1.6), ser(TI.us, TI.g, '--s1', 'u(t − τ)', undefined, 2.2)], TI.g)} height={220} />
              </Card>
              <Card title={t('outputs')}>
                <Plot spec={spec([ser(TI.y, TI.g, '--c-muted', 'y(t)', undefined, 1.6), ser(TI.yOfShifted, TI.g, '--s1', 'S{u(t − τ)}', undefined, 2.6), ser(TI.yShifted, TI.g, '--c-approx', 'y(t − τ)', [6, 4], 2)], TI.g)} height={260} />
              </Card>
              <Card title={t('result')}>
                <Verdict ok={TI.cmp.first === null} text={TI.cmp.first === null ? t('tiOk') : fill(t('tiFail'), { d: n3(TI.cmp.d) })} />
                <p className="hint">{t('oneWay')}</p>
                {theory('ti')}
              </Card>
            </>
          )}

          {tab === 'causal' && CA && (
            <>
              <p className="callout"><Rich text={t('ideaCausal')} /></p>
              <Card title={t('inputs')}>
                <Plot spec={spec([ser(CA.ub, CA.g, '--c-approx', 'u_b', [6, 4], 2), ser(CA.ua, CA.g, '--s1', 'u_a', undefined, 2)], CA.g, [{ v: CA.t1, color: '--c-comp', dash: [5, 4], label: 't₁' }])} height={220} />
              </Card>
              <Card title={t('outputs')}>
                <Plot spec={spec([ser(CA.yb, CA.g, '--c-approx', 'y_b', [6, 4], 2), ser(CA.ya, CA.g, '--s1', 'y_a', undefined, 2.4)], CA.g, [{ v: CA.t1, color: '--c-comp', dash: [5, 4], label: 't₁' }])} height={260} />
              </Card>
              <Card title={t('result')}>
                <Verdict ok={CA.before.first === null} text={CA.before.first === null ? t('causalOk') : fill(t('causalFail'), { t: tx(CA.before.first) })} />
                <p className="hint">{t('oneWay')}</p>
                {theory('causal')}
              </Card>
            </>
          )}

          {tab === 'memory' && ME && (
            <>
              <p className="callout"><Rich text={t('ideaMemory')} /></p>
              <Card title={t('inputs')}>
                <Plot spec={spec([ser(ME.ub, ME.g, '--c-approx', 'u_b', [6, 4], 2), ser(ME.ua, ME.g, '--s1', 'u_a', undefined, 2)], ME.g, [{ v: ME.lo, color: '--c-comp', dash: [5, 4] }, { v: ME.hi, color: '--c-comp', dash: [5, 4] }])} height={220} />
              </Card>
              <Card title={t('outputs')}>
                <Plot spec={spec([ser(ME.yb, ME.g, '--c-approx', 'y_b', [6, 4], 2), ser(ME.ya, ME.g, '--s1', 'y_a', undefined, 2.4)], ME.g, [{ v: ME.lo, color: '--c-comp', dash: [5, 4] }, { v: ME.hi, color: '--c-comp', dash: [5, 4] }])} height={260} />
              </Card>
              <Card title={t('result')}>
                {(() => {
                  const b = ME.before.first !== null, a = ME.after.first !== null;
                  return <Verdict ok={!a && !b} text={t(!a && !b ? 'memOk' : a && b ? 'memBoth' : a ? 'memPast' : 'memFuture')} />;
                })()}
                <p className="hint">{t('oneWay')}</p>
                {theory('memoryless')}
              </Card>
            </>
          )}

          {tab === 'stable' && ST && (
            <>
              <p className="callout"><Rich text={t('ideaStable')} /></p>
              {!(ST.M <= 1e3) ? (
                <p className="callout warn-callout">{t('ownInputUnbounded')}</p>
              ) : (
                <>
                  <Card title={t('input')}>
                    <Plot spec={spec([ser(ST.u, ST.g, '--s1', 'u(t)')], ST.g)} height={200} />
                  </Card>
                  <Card title={t('output')}>
                    <Plot spec={spec([ser(ST.y, ST.g, '--s1', 'y(t)', undefined, 2.2)], ST.g)} height={260} />
                  </Card>
                  <Card title={t('result')}>
                    <Verdict ok={!ST.grows} text={fill(t(ST.grows ? 'stabFail' : 'stabOk'), { Y: tx(ST.Y), M: tx(ST.M) })} />
                    <p className="hint">{t('oneWay')}</p>
                    {theory('stable')}
                  </Card>
                </>
              )}
            </>
          )}

          {tab === 'summary' && (
            <>
              <p className="callout"><Rich text={t('ideaSummary')} /></p>
              <Card title={t('tabSummary')} right={<Check label={t('showAnswers')} checked={showAll} onChange={setShowAll} />}>
                <div className="tbl-scroll">
                  <table className="sum-table">
                    <thead>
                      <tr><th>{t('sysCol')}</th>{PROPS.map((p) => <th key={p}>{t(PROP_KEY[p])}</th>)}</tr>
                    </thead>
                    <tbody>
                      {SYSTEMS.map((s) => (
                        <tr key={s.id} className={sys === s.id ? 'sel' : ''} onClick={() => setSys(s.id)}>
                          <td><Tex tex={sysTex(s.id)} /></td>
                          {PROPS.map((p) => <td key={p} className="mark">{showAll ? <span className={'badge ' + (s.props[p] ? 'ok' : 'bad')}>{s.props[p] ? '✓' : '✗'}</span> : '?'}</td>)}
                        </tr>
                      ))}
                      <tr className={sys === 'custom' ? 'sel' : ''} onClick={() => setSys('custom')}>
                        <td><Tex tex={`y(t) = f(u, t)`} /> <span className="mono">{sysSrc}</span></td>
                        {PROPS.map((p) => <td key={p} className="mark">{showAll && ownBattery ? <span className={'badge ' + (ownBattery[p] ? 'ok' : 'bad')}>{ownBattery[p] ? '✓' : '✗'}</span> : '?'}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="hint">{t('ownNote')}</p>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { fmt, localSin } from '@shared/format';
import { Plot, type PlotSpec, type Series } from '@shared/Plot';
import { Card, NumField, Rich, Seg, Tex } from '@shared/ui';
import { CIRCUIT_NAMES, INPUT_NAMES, translate, type Lang, type TKey } from './i18n';
import { Ladder } from './components/Ladder';
import { buildNetwork, CIRCUITS, circuitDef, icTex, unit, type CircuitId } from './math/circuits';
import { INPUTS, inputTex, inputValue, transform, type InputDef, type InputKind } from './math/inputs';
import { meshSystem, nodalOutput, nodalSystem, solve } from './math/network';
import { atZero, expand, finalValue, finalValueTheorem, initialValueTheorem, timeValue } from '@shared/pfe';
import { add, cabs, mul, reduce, roots } from '@shared/poly';
import { makeTex } from './math/texs';

type Tab = 'circuit' | 'eq' | 'resp';
type Form = 'nodal' | 'mesh';
const NPTS = 600;

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);
  const X = useMemo(() => makeTex(lang), [lang]);

  const [cid, setCid] = useState<CircuitId>('rlcSeries');
  const def = circuitDef(cid);
  const [values, setValues] = useState<Record<string, number[]>>({});
  const [ics, setIcs] = useState<Record<string, number[]>>({});
  const [outs, setOuts] = useState<Record<string, string>>({});
  const vals = values[cid] ?? def.ladder.map((e) => e.def);
  const icv = ics[cid] ?? def.ladder.map(() => 0);
  const out = outs[cid] ?? def.output;
  const [u, setU] = useState<InputDef>({ kind: 'step', A: 1, w: 2, a: 1 });
  const [tab, setTab] = useState<Tab>('circuit');
  const [form, setForm] = useState<Form>('nodal');

  const setVal = (i: number, v: number) => setValues({ ...values, [cid]: vals.map((x, k) => (k === i ? v : x)) });
  const setIc = (i: number, v: number) => setIcs({ ...ics, [cid]: icv.map((x, k) => (k === i ? v : x)) });

  const net = useMemo(() => buildNetwork(def, vals, icv), [def, vals, icv]);
  const order = def.ladder.filter((e) => e.kind !== 'R').length;
  const nodal = useMemo(() => nodalSystem(net), [net]);
  const mesh = useMemo(() => meshSystem(net), [net]);
  const sol = useMemo(() => solve(nodal, nodalOutput(net, nodal, out), order), [net, nodal, out, order]);
  const U = transform(u);
  const F = useMemo(() => reduce({ num: add(mul(sol.raw.numU, U.num), mul(sol.raw.numIC, U.den)), den: mul(sol.raw.den, U.den) }), [sol, u]);
  const Fzs = useMemo(() => reduce({ num: mul(sol.raw.numU, U.num), den: mul(sol.raw.den, U.den) }), [sol, u]);
  const x = useMemo(() => expand(F), [F]);
  const xzs = useMemo(() => expand(Fzs), [Fzs]);
  const xzi = useMemo(() => expand(sol.Yci), [sol]);
  const natural = useMemo(() => roots(sol.charPoly), [sol]);

  const [what, idxS] = out.split(':');
  const oel = net.elements[+idxS] ?? net.elements[0];
  const yName = (what === 'v' ? 'v' : 'i') + `_{${oel.name}}`;
  const Yname = (what === 'v' ? 'V' : 'I') + `_{${oel.name}}`;
  const yUnit = what === 'v' ? 'V' : 'A';
  const srcIsV = def.source === 'V';

  // horizon from the slowest mode and the input
  const T = useMemo(() => {
    let tt = 0;
    for (const { p } of x.clusters) {
      if (cabs(p) < 1e-9) continue;
      if (p[0] < -1e-9) tt = Math.max(tt, 5 / -p[0]);
      if (Math.abs(p[1]) > 1e-9) tt = Math.max(tt, (3 * 2 * Math.PI) / Math.abs(p[1]));
      if (p[0] > 1e-9) tt = Math.max(tt, 3 / p[0]);
    }
    for (const r of natural) if (r[0] < -1e-9) tt = Math.max(tt, 5 / -r[0]);
    return tt > 0 ? Math.min(tt, 1e4) : 5;
  }, [x, natural]);

  const plot: PlotSpec = useMemo(() => {
    const ts = Array.from({ length: NPTS + 1 }, (_, k) => (T * k) / NPTS);
    const y = ts.map((tt) => timeValue(x, tt));
    const s: Series[] = [];
    if (u.kind !== 'none' && u.kind !== 'impulse') s.push({ x: ts, y: ts.map((tt) => inputValue(u, tt)), color: '--c-muted', width: 1, dash: [2, 3], label: `u(t) (${t('source')})` });
    s.push({ x: ts, y: ts.map((tt) => timeValue(xzs, tt)), color: '--c-approx', width: 1.6, dash: [6, 4], label: t('zs') });
    s.push({ x: ts, y: ts.map((tt) => timeValue(xzi, tt)), color: '--c-comp', width: 1.6, dash: [3, 3], label: t('zi') });
    s.push({ x: ts, y, color: '--s1', width: 2.6, label: `y(t) (${t('total')})` });
    // y(0⁻): the value before the change, drawn on t < 0
    const all = s.flatMap((q) => Array.from(q.y)).filter(Number.isFinite);
    let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const pad = 0.08 * (hi - lo);
    return { series: s, xRange: [0, T], yRange: [lo - pad, hi + pad], xLabel: 't [s]', yLabel: `y [${yUnit}]`, legend: true, hLines: [{ v: 0, color: '--axis' }] };
  }, [x, xzs, xzi, T, u, lang, yUnit]);

  // initial and final values
  const y0minus = (() => {
    // only capacitor voltages and inductor currents have a defined value before t = 0 here
    if (what === 'v' && oel.kind === 'C') return oel.ic;
    if (what === 'i' && oel.kind === 'L') return oel.ic;
    return NaN;
  })();
  const ivt = initialValueTheorem(F);
  const y0p = atZero(x);
  const fv = finalValue(x);
  const fvt = fv.status === 'ok' ? finalValueTheorem(F) : NaN;
  const num = (v: number, unitS = '') => (Number.isFinite(v) ? `${fmt(Math.abs(v) < 1e-10 ? 0 : v, lang, 4)}${unitS}` : '—');

  const uT = inputTex(u, (v) => X.n(v));
  const hasYci = sol.Yci.num.some((c) => Math.abs(c) > 1e-12);
  const cancelled = sol.H.den.length - 1 < order || (hasYci && sol.Yci.den.length - 1 < order);
  const sys = form === 'nodal' ? nodal : mesh;

  const kindName = (k: 'R' | 'L' | 'C') => t(k === 'R' ? 'resistor' : k === 'L' ? 'inductor' : 'capacitor');

  return (
    <div className="lab-app laplab">
      <LabHeader logo={logoUrl} glyph={GLYPHS.laplace} lab="laplace" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Card title={t('secCircuit')} info={t('tipCircuit')}>
            <select value={cid} onChange={(e) => setCid(e.target.value as CircuitId)}>
              {CIRCUITS.map((c) => (
                <option key={c.id} value={c.id}>{CIRCUIT_NAMES[c.id][lang]}</option>
              ))}
            </select>
            <div className="el-grid">
              {net.elements.map((e, i) => (
                <label key={i} className="field-row">
                  <Tex tex={`${e.name} =`} />
                  <NumField value={vals[i]} min={e.kind === 'R' ? 0 : 1e-6} width={70} onChange={(v) => setVal(i, v)} />
                  <span>{unit(e.kind)}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card title={t('secInput')} info={t('tipInput')}>
            <p className="hint src-kind">{t(srcIsV ? 'voltageSrc' : 'currentSrc')}</p>
            <select value={u.kind} onChange={(e) => setU({ ...u, kind: e.target.value as InputKind })}>
              {INPUTS.map((k) => (
                <option key={k} value={k}>{INPUT_NAMES[k][lang]}</option>
              ))}
            </select>
            {u.kind !== 'none' && (
              <div className="el-grid">
                <label className="field-row"><Tex tex="A =" /><NumField value={u.A} width={70} onChange={(v) => setU({ ...u, A: v })} /><span>{srcIsV ? 'V' : 'A'}</span></label>
                {(u.kind === 'sin' || u.kind === 'cos') && <label className="field-row"><Tex tex="\omega =" /><NumField value={u.w} min={1e-3} width={70} onChange={(v) => setU({ ...u, w: v })} /><span>rad/s</span></label>}
                {u.kind === 'exp' && <label className="field-row"><Tex tex="a =" /><NumField value={u.a} width={70} onChange={(v) => setU({ ...u, a: v })} /><span>1/s</span></label>}
              </div>
            )}
            <Tex block tex={localSin(`u(t) = ${uT.t} \\quad\\Longrightarrow\\quad U(s) = ${uT.s}`, lang)} />
          </Card>
          {order > 0 && (
            <Card title={t('secIc')} info={t('tipIc')}>
              <div className="el-grid">
                {net.elements.map((e, i) =>
                  e.kind === 'R' ? null : (
                    <label key={i} className="field-row">
                      <Tex tex={`${icTex(e)} =`} />
                      <NumField value={icv[i]} width={64} onChange={(v) => setIc(i, v)} />
                      <span>{e.kind === 'C' ? 'V' : 'A'}</span>
                    </label>
                  ),
                )}
              </div>
              <button type="button" className="small" onClick={() => setIcs({ ...ics, [cid]: icv.map(() => 0) })}>{t('allZero')}</button>
            </Card>
          )}
          <Card title={t('secOutput')}>
            <select value={out} onChange={(e) => setOuts({ ...outs, [cid]: e.target.value })}>
              {net.elements.flatMap((e, i) => [
                <option key={`v${i}`} value={`v:${i}`}>{`${t('voltageOf')} ${e.name.replace('_', '')}`}</option>,
                <option key={`i${i}`} value={`i:${i}`}>{`${t('currentOf')} ${e.name.replace('_', '')}`}</option>,
              ])}
            </select>
            <Tex block tex={`y(t) = ${yName}(t)`} />
          </Card>
        </aside>
        <main className="lab-main">
          <nav className="tabs main-tabs">
            {(['circuit', 'eq', 'resp'] as Tab[]).map((k) => (
              <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {t(k === 'circuit' ? 'tabCircuit' : k === 'eq' ? 'tabEq' : 'tabResp')}
              </button>
            ))}
          </nav>

          {tab === 'circuit' && (
            <>
              <p className="callout"><Rich text={t('ideaCircuit')} /></p>
              <div className="two-col stack-narrow">
                <Card title={t('timeCircuit')}>
                  <Ladder net={net} domain="time" form={form} out={{ what: what as 'v' | 'i', index: +idxS }} lang={lang} marks={false} />
                </Card>
                <Card title={t('sCircuit')} info={t('tipSCircuit')} right={<Seg<Form> value={form} onChange={setForm} options={[['mesh', t('formSeries')], ['nodal', t('formParallel')]]} />}>
                  <Ladder net={net} domain="s" form={form} out={{ what: what as 'v' | 'i', index: +idxS }} lang={lang} marks={false} />
                </Card>
              </div>
              <Card title={t('tableTitle')}>
                <div className="tbl-scroll">
                  <table className="lap-table">
                    <thead>
                      <tr><th>{t('colElement')}</th><th>{t('colTime')}</th><th>{t('colSeries')}</th><th>{t('colParallel')}</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>{kindName('R')}</td><td><Tex tex="v = R\,i" /></td><td><Tex tex="V = R\,I" /></td><td><Tex tex="I = \tfrac{1}{R}\,V" /></td></tr>
                      <tr><td>{kindName('L')}</td><td><Tex tex="v = L\,\tfrac{di}{dt}" /></td><td><Tex tex="V = sL\,I - L\,i(0^-)" /></td><td><Tex tex="I = \tfrac{1}{sL}\,V + \tfrac{i(0^-)}{s}" /></td></tr>
                      <tr><td>{kindName('C')}</td><td><Tex tex="i = C\,\tfrac{dv}{dt}" /></td><td><Tex tex="V = \tfrac{1}{sC}\,I + \tfrac{v(0^-)}{s}" /></td><td><Tex tex="I = sC\,V - C\,v(0^-)" /></td></tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {tab === 'eq' && (
            <>
              <p className="callout"><Rich text={t('ideaEq')} /></p>
              <Card title={t('eqTitle')} info={t('tipEq')} right={<Seg<Form> value={form} onChange={setForm} options={[['nodal', t('nodal')], ['mesh', t('mesh')]]} />}>
                <Ladder net={net} domain="s" form={form} out={{ what: what as 'v' | 'i', index: +idxS }} lang={lang} marks />
                {sys.imposed && <p className="hint">{t('imposed')}: <Tex tex={sys.imposed} /></p>}
                <h4 className="sub">{t('symbolic')}</h4>
                <div className="eq-scroll"><Tex block tex={X.matrixEq(sys, false)} /></div>
                <h4 className="sub">{t('numeric')}</h4>
                <div className="eq-scroll"><Tex block tex={X.matrixEq(sys, true)} /></div>
              </Card>
              <Card title={t('solTitle')} info={t('tipSol')}>
                <div className="eq-scroll">
                  <Tex block tex={`${Yname}(s) = \\underbrace{${X.rational(sol.H)}}_{H(s)}\\,U(s) \\;+\\; \\underbrace{${X.rational(sol.Yci)}}_{\\text{${t('zi')}}}`} />
                </div>
                <h4 className="sub">{t('charPoly')}</h4>
                <div className="eq-scroll">
                  <Tex block tex={`\\Delta(s) = ${X.poly(sol.charPoly)} \\qquad s = ${natural.length ? natural.filter((r) => r[1] >= -1e-12).map((r) => X.cx(r).replace(/\+ j/, '\\pm j')).join(',\\; ') : '—'}`} />
                </div>
                {cancelled && <p className="hint">{t('cancelNote')}</p>}
              </Card>
            </>
          )}

          {tab === 'resp' && (
            <>
              <p className="callout"><Rich text={t('ideaResp')} /></p>
              <Card title={t('pfeTitle')} info={t('tipPfe')}>
                <div className="eq-scroll">
                  <Tex block tex={`${Yname}(s) = ${X.rational(F)}`} />
                  <Tex block tex={`${Yname}(s) = ${X.expansion(x)}`} />
                </div>
                <div className="tbl-scroll">
                  <table className="lap-table">
                    <thead><tr><th>{t('pole')}</th><th>{t('mult')}</th><th>{t('residues')}</th><th>{t('origin')}</th></tr></thead>
                    <tbody>
                      {x.clusters.filter((c) => c.p[1] >= -1e-12).map((c, i) => {
                        const isNat = natural.some((r) => cabs([r[0] - c.p[0], r[1] - c.p[1]]) < 1e-5 * Math.max(1, cabs(c.p)));
                        return (
                          <tr key={i}>
                            <td><Tex tex={X.cx(c.p) + (Math.abs(c.p[1]) > 1e-12 ? ' \\;(\\pm)' : '')} /></td>
                            <td>{c.m}</td>
                            <td><Tex tex={c.g.map((g) => X.cx(g)).join(',\\; ')} /></td>
                            <td>{isNat ? t('fromCircuit') : t('fromSource')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card title={t('timeTitle')} info={t('tipTime')}>
                <div className="eq-scroll">
                  <Tex block tex={`${yName}(t) = ${X.timeFn(x)}, \\quad t > 0`} />
                  {x.q.length > 0 && <Tex block tex={`\\text{${t('impulses')}}: \\; ${X.impulses(x)}`} />}
                </div>
                <Plot spec={plot} height={300} />
              </Card>
              <div className="two-col">
                <Card title={t('ivt')} info={t('tipIvt')}>
                  <Tex block tex={`${yName}(0^+) = \\lim_{s\\to\\infty} s\\,${Yname}(s)`} />
                  {Number.isNaN(ivt) ? (
                    <p className="hint warn">{t('improper')}</p>
                  ) : (
                    <table className="lap-table kv">
                      <tbody>
                        <tr><td>{t('byTheorem')}</td><td>{num(ivt, ` ${yUnit}`)}</td></tr>
                        <tr><td>{t('byExpr')}</td><td>{num(y0p, ` ${yUnit}`)}</td></tr>
                        {Number.isFinite(y0minus) && <tr><td>{t('before')}</td><td>{num(y0minus, ` ${yUnit}`)}</td></tr>}
                      </tbody>
                    </table>
                  )}
                  {Number.isFinite(y0minus) && !Number.isNaN(ivt) && Math.abs(ivt - y0minus) > 1e-6 * Math.max(1, Math.abs(ivt)) && <p className="hint">{t('jump')}</p>}
                </Card>
                <Card title={t('fvt')} info={t('tipFvt')}>
                  <Tex block tex={`${yName}(\\infty) = \\lim_{s\\to 0} s\\,${Yname}(s)`} />
                  {fv.status === 'ok' ? (
                    <>
                      <table className="lap-table kv">
                        <tbody>
                          <tr><td>{t('byTheorem')}</td><td>{num(fvt, ` ${yUnit}`)}</td></tr>
                          <tr><td>{t('byExpr')}</td><td>{num(fv.value, ` ${yUnit}`)}</td></tr>
                        </tbody>
                      </table>
                      <p className="hint">{t('fvOk')}</p>
                    </>
                  ) : (
                    <p className="hint warn">{t(fv.status === 'osc' ? 'fvOsc' : fv.status === 'grows' ? 'fvGrows' : 'fvUnstable')}</p>
                  )}
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

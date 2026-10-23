import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { ExprInput } from '@shared/ExprInput';
import { tryFormula, type Formula } from '@shared/expr';
import { fmt } from '@shared/format';
import { Card, Check, NumField, Seg, Slider, Tex } from '@shared/ui';
import { LangContext, translate, type Lang, type TKey } from './i18n';
import { SCALAR, SYSTEMS } from './presets';
import { TabTaylor } from './tabs/TabTaylor';
import { TabLinear, type TolState } from './tabs/TabLinear';
import { TabSystem, type SystemState } from './tabs/TabSystem';
import type { V2, Window } from './math/system';

type Tab = 'taylor' | 'linear' | 'system';
const X = ['x'];
const XU = ['x1', 'x2', 'u'];
const must = (src: string, vars: string[]): Formula => {
  const r = tryFormula(src, vars);
  if (!r.ok) throw new Error(src);
  return r.formula;
};

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);
  const [tab, setTab] = useState<Tab>('taylor');

  // ---------------------------------------------------------------- one-variable function
  const p0 = SCALAR[0];
  const [preset, setPreset] = useState<string>(p0.id);
  const [src, setSrc] = useState(p0.src);
  const formula = useMemo(() => must(src, X), [src]);
  const [a, setA] = useState(p0.a);
  const [view, setView] = useState<[number, number]>(p0.view);
  const [N, setN] = useState(p0.N ?? 3);
  const [family, setFamily] = useState(true);
  const [anim, setAnim] = useState(false);
  const [xEval, setXEval] = useState(p0.xEval ?? p0.a + 0.5);
  const [tol, setTol] = useState<TolState>(p0.tol ?? { relative: true, value: 0.01 });
  const sp = SCALAR.find((q) => q.id === preset);
  const radius = sp && sp.src === src && sp.a === a ? sp.radius : undefined;

  const loadScalar = (id: string) => {
    setPreset(id);
    const q = SCALAR.find((x) => x.id === id);
    if (!q) return;
    setSrc(q.src);
    setA(q.a);
    setView(q.view);
    if (q.N !== undefined) setN(q.N);
    setXEval(q.xEval ?? q.a + 0.3 * (q.view[1] - q.view[0]) / 2);
    if (q.tol) setTol(q.tol);
  };
  useEffect(() => {
    if (!anim) return;
    const id = setInterval(() => setN((n) => (n >= 15 ? 0 : n + 1)), 900);
    return () => clearInterval(id);
  }, [anim]);

  // ---------------------------------------------------------------- second-order system
  const s0 = SYSTEMS[0];
  const [sysPreset, setSysPreset] = useState<string>(s0.id);
  const [f1, setF1] = useState(s0.f1);
  const [f2, setF2] = useState(s0.f2);
  const [u, setU] = useState(s0.u);
  const [win, setWin] = useState<Window>(s0.win);
  const [names, setNames] = useState<[string, string]>(s0.names);
  const [x0, setX0] = useState<V2>(s0.x0);
  const [T, setT] = useState(s0.T);
  const [sel, setSel] = useState(0);
  const [show, setShow] = useState({ field: true, family: false, sep: true, eig: false, lin: true });
  const sysp = SYSTEMS.find((q) => q.id === sysPreset);
  const sys = useMemo(() => {
    const a1 = must(f1, XU), a2 = must(f2, XU);
    return { n1: a1.node, n2: a2.node, f1: a1.f, f2: a2.f, u };
  }, [f1, f2, u]);
  const loadSystem = (id: string) => {
    setSysPreset(id);
    const q = SYSTEMS.find((x) => x.id === id);
    if (!q) return;
    setF1(q.f1);
    setF2(q.f2);
    setU(q.u);
    setWin(q.win);
    setNames(q.names);
    setX0(q.x0);
    setT(q.T);
    setSel(0);
  };
  const sysState: SystemState = { sys, win, names, x0, T, show, sel, note: sysp && sysp.f1 === f1 && sysp.f2 === f2 ? sysp.note[lang] : undefined };

  const scalarSidebar = (
    <>
      <Card title={t('secFunction')} info={t('tipFunction')}>
        <label className="field">
          <span>{t('examples')}</span>
          <select value={sp && sp.src === src ? preset : ''} onChange={(e) => loadScalar(e.target.value)}>
            <option value="">{t('custom')}</option>
            {SCALAR.map((q) => (
              <option key={q.id} value={q.id}>
                {lang === 'es' || lang === 'pt' ? q.name : q.name.replace('sen ', 'sin ')}
              </option>
            ))}
          </select>
        </label>
        <ExprInput label="f(x) =" value={src} vars={X} lang={lang} onChange={(s) => setSrc(s)} />
        <div className="field-row">
          <span>
            {t('pointA')} <Tex tex="a" />
          </span>
          <NumField value={a} onChange={setA} />
        </div>
        <Slider label={<Tex tex="a" />} value={a} min={view[0]} max={view[1]} step={(view[1] - view[0]) / 400} onChange={(v) => setA(+v.toPrecision(4))} display={fmt(a, lang, 4)} />
        {sp?.note && sp.src === src && <p className="hint">{sp.note[lang]}</p>}
      </Card>
      {tab === 'taylor' && (
        <Card title={t('secOrder')} info={t('tipOrder')}>
          <Slider label={<Tex tex="N" />} value={N} min={0} max={30} step={1} onChange={(v) => setN(Math.round(v))} display={String(N)} />
          <div className="row wrap">
            {[1, 2, 3, 5, 7, 10, 20].map((v) => (
              <button key={v} className={'tiny' + (N === v ? ' on' : '')} onClick={() => setN(v)}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setAnim(!anim)}>{anim ? '■ ' + t('stop') : '▶ ' + t('animate')}</button>
          <Check label={t('family')} checked={family} onChange={setFamily} />
        </Card>
      )}
      {tab === 'linear' && (
        <Card title={t('secTol')} info={t('tipTol')}>
          <Seg
            value={tol.relative ? 'rel' : 'abs'}
            options={[
              ['rel', t('relative')],
              ['abs', t('absolute')],
            ]}
            onChange={(v) => setTol({ relative: v === 'rel', value: v === 'rel' ? 0.01 : 0.01 })}
          />
          <div className="field-row">
            {tol.relative ? (
              <>
                <span>p =</span>
                <NumField value={tol.value * 100} min={1e-6} onChange={(v) => setTol({ ...tol, value: v / 100 })} />
                <span>%</span>
              </>
            ) : (
              <>
                <span>ε =</span>
                <NumField value={tol.value} min={1e-15} onChange={(v) => setTol({ ...tol, value: v })} />
              </>
            )}
          </div>
        </Card>
      )}
      <Card title={t('view')}>
        <div className="field-row">
          <NumField value={view[0]} onChange={(v) => v < view[1] && setView([v, view[1]])} />
          <span>≤ x ≤</span>
          <NumField value={view[1]} onChange={(v) => v > view[0] && setView([view[0], v])} />
        </div>
        <div className="field-row">
          <span>{t('evalAt')}</span>
          <NumField value={xEval} onChange={setXEval} width={96} />
        </div>
      </Card>
    </>
  );

  const systemSidebar = (
    <>
      <Card title={t('secSystem')} info={t('tipSystem')}>
        <label className="field">
          <span>{t('examples')}</span>
          <select value={sysp && sysp.f1 === f1 && sysp.f2 === f2 ? sysPreset : ''} onChange={(e) => loadSystem(e.target.value)}>
            <option value="">{t('custom')}</option>
            {SYSTEMS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name[lang]}
              </option>
            ))}
          </select>
        </label>
        <ExprInput label="\dot x_1 =" value={f1} vars={XU} lang={lang} onChange={(s) => setF1(s)} />
        <ExprInput label="\dot x_2 =" value={f2} vars={XU} lang={lang} onChange={(s) => setF2(s)} />
        <div className="field-row">
          <span>
            {t('input')} <Tex tex="u^e =" />
          </span>
          <NumField value={u} onChange={setU} />
        </div>
      </Card>
      <Card title={t('window')}>
        <div className="field-row">
          <NumField value={win.x1[0]} width={64} onChange={(v) => v < win.x1[1] && setWin({ ...win, x1: [v, win.x1[1]] })} />
          <Tex tex="\le x_1 \le" />
          <NumField value={win.x1[1]} width={64} onChange={(v) => v > win.x1[0] && setWin({ ...win, x1: [win.x1[0], v] })} />
        </div>
        <div className="field-row">
          <NumField value={win.x2[0]} width={64} onChange={(v) => v < win.x2[1] && setWin({ ...win, x2: [v, win.x2[1]] })} />
          <Tex tex="\le x_2 \le" />
          <NumField value={win.x2[1]} width={64} onChange={(v) => v > win.x2[0] && setWin({ ...win, x2: [win.x2[0], v] })} />
        </div>
        <div className="field-row">
          <span>{t('x0')}</span>
          <Tex tex="\mathbf x(0) =" />
          <NumField value={+x0[0].toPrecision(4)} width={64} onChange={(v) => setX0([v, x0[1]])} />
          <NumField value={+x0[1].toPrecision(4)} width={64} onChange={(v) => setX0([x0[0], v])} />
        </div>
        <Slider label={t('horizon')} value={T} min={1} max={80} step={1} onChange={(v) => setT(Math.round(v))} display={`${T} s`} />
      </Card>
      <Card title={t('secShow')}>
        <Check label={t('showField')} checked={show.field} onChange={(v) => setShow({ ...show, field: v })} />
        <Check label={t('showFamily')} checked={show.family} onChange={(v) => setShow({ ...show, family: v })} />
        <Check label={t('showSep')} checked={show.sep} onChange={(v) => setShow({ ...show, sep: v })} />
        <Check label={t('showEig')} checked={show.eig} onChange={(v) => setShow({ ...show, eig: v })} />
        <Check label={t('showLin')} checked={show.lin} onChange={(v) => setShow({ ...show, lin: v })} />
      </Card>
    </>
  );

  const tabs: [Tab, TKey][] = [
    ['taylor', 'tabTaylor'],
    ['linear', 'tabLinear'],
    ['system', 'tabSystem'],
  ];
  const scalarState = { formula, a, view, N, family, xEval, radius };

  return (
    <LangContext.Provider value={lang}>
      <div className="lab-app taylorlab">
        <LabHeader logo={logoUrl} glyph={GLYPHS.taylor} lab="taylor" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
        <div className="lab-layout">
          <aside className="lab-sidebar">{tab === 'system' ? systemSidebar : scalarSidebar}</aside>
          <main className="lab-main">
            <nav className="tabs main-tabs">
              {tabs.map(([id, k]) => (
                <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                  {t(k)}
                </button>
              ))}
            </nav>
            {tab === 'taylor' && <TabTaylor s={scalarState} lang={lang} />}
            {tab === 'linear' && <TabLinear s={scalarState} tol={tol} lang={lang} />}
            {tab === 'system' && <TabSystem st={sysState} lang={lang} setX0={setX0} setSel={setSel} />}
          </main>
        </div>
      </div>
    </LangContext.Provider>
  );
}

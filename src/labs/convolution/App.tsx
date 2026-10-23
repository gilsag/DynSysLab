import { useEffect, useMemo, useRef, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { ExprInput } from '@shared/ExprInput';
import { fmt, tex as texNum } from '@shared/format';
import { Plot, type PlotSpec, type Series } from '@shared/Plot';
import { Card, Check, InfoTip, NumField, Rich, Slider, Tex } from '@shared/ui';
import type { LabLang } from '@shared/suite';
import { KIND_NAMES, translate, type Lang, type TKey } from './i18n';
import { autoWindow, build, defaults, H_KINDS, PARAMS, U_KINDS, type Kind, type SigDef, type Signal } from './math/signals';
import { parseCoeffs, polyTex, roots } from './math/ode';
import { addS, convAt, convImpulses, convS, impulseDecomposition, sampleSig, segmentBreaks, stepDecomposition, stepResponse, type Sampled } from './math/conv';

type S6 = Record<LabLang, string>;
type Tab = 'graphic' | 'duhamel' | 'systems';

interface Preset {
  id: string;
  name: S6;
  u: SigDef;
  h: SigDef;
  h2?: SigDef;
}
const PRESETS: Preset[] = [
  { id: 'rc1', name: { es: 'RC ante un pulso, RC = Tₚ/4', en: 'RC and a pulse, RC = Tₚ/4', fr: 'RC et une impulsion, RC = Tₚ/4', de: 'RC und Puls, RC = Tₚ/4', it: 'RC e impulso, RC = Tₚ/4', pt: 'RC e um pulso, RC = Tₚ/4' }, u: { kind: 'pulse', p: { A: 1, T: 1, d: 0 } }, h: { kind: 'rc', p: { RC: 0.25, d: 0 } } },
  { id: 'rc2', name: { es: 'RC ante un pulso, RC = Tₚ', en: 'RC and a pulse, RC = Tₚ', fr: 'RC et une impulsion, RC = Tₚ', de: 'RC und Puls, RC = Tₚ', it: 'RC e impulso, RC = Tₚ', pt: 'RC e um pulso, RC = Tₚ' }, u: { kind: 'pulse', p: { A: 1, T: 1, d: 0 } }, h: { kind: 'rc', p: { RC: 1, d: 0 } } },
  { id: 'rcsine', name: { es: 'RC ante un pulso semisinusoidal', en: 'RC and a half-sine pulse', fr: 'RC et une impulsion demi-sinus', de: 'RC und Halbsinuspuls', it: 'RC e impulso semisinusoidale', pt: 'RC e pulso semissenoidal' }, u: { kind: 'halfsine', p: { A: 2 * Math.PI, T: 1, d: 0 } }, h: { kind: 'rc', p: { RC: 1, d: 0 } } },
  { id: 'int', name: { es: 'Pulso e integrador: rampa y meseta', en: 'Pulse and integrator: ramp and plateau', fr: 'Impulsion et intégrateur : rampe et palier', de: 'Puls und Integrator: Rampe und Plateau', it: 'Impulso e integratore: rampa e plateau', pt: 'Pulso e integrador: rampa e patamar' }, u: { kind: 'pulse', p: { A: 1, T: 1, d: 0 } }, h: { kind: 'integrator', p: { K: 1 } } },
  { id: 'ode', name: { es: 'Pulso y EDO (D² + 3D + 2) y = 2u', en: 'Pulse and ODE (D² + 3D + 2) y = 2u', fr: 'Impulsion et EDO (D² + 3D + 2) y = 2u', de: 'Puls und DGL (D² + 3D + 2) y = 2u', it: 'Impulso ed EDO (D² + 3D + 2) y = 2u', pt: 'Pulso e EDO (D² + 3D + 2) y = 2u' }, u: { kind: 'pulse', p: { A: 1, T: 2, d: 0 } }, h: { kind: 'ode', p: {}, q: '1 3 2', pn: '2' } },
  { id: 'delay', name: { es: 'Retardo puro: h = δ(t − c)', en: 'Pure delay: h = δ(t − c)', fr: 'Retard pur : h = δ(t − c)', de: 'Reine Totzeit: h = δ(t − c)', it: 'Ritardo puro: h = δ(t − c)', pt: 'Atraso puro: h = δ(t − c)' }, u: { kind: 'halfsine', p: { A: 1, T: 1, d: 0 } }, h: { kind: 'impulse', p: { w: 1, c: 0.7 } } },
  { id: 'so', name: { es: 'Escalón y segundo orden: y = g(t)', en: 'Step and second order: y = g(t)', fr: 'Échelon et second ordre : y = g(t)', de: 'Sprung und 2. Ordnung: y = g(t)', it: 'Gradino e secondo ordine: y = g(t)', pt: 'Degrau e segunda ordem: y = g(t)' }, u: { kind: 'step', p: { A: 1, d: 0 } }, h: { kind: 'second', p: { wn: 4, zeta: 0.2, d: 0 } } },
];

function CoeffField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const ok = parseCoeffs(text) !== null;
  return (
    <label className="field-row">
      <Tex tex={`${label}:`} />
      <input className={'coeff-input' + (ok ? '' : ' bad')} value={text} spellCheck={false}
        onChange={(e) => { setText(e.target.value); if (parseCoeffs(e.target.value)) onChange(e.target.value); }} />
    </label>
  );
}

const wrapPoly = (c: number[]) => (c.filter((x) => x !== 0).length > 1 ? `\\left(${polyTex(c)}\\right)` : polyTex(c));

function OdeEditor({ def, onChange, lang, name }: { def: SigDef; onChange: (d: SigDef) => void; lang: Lang; name: string }) {
  const t = (k: TKey) => translate(lang, k);
  const q = parseCoeffs(def.q ?? '') ?? [1, 1];
  const pn = parseCoeffs(def.pn ?? '') ?? [1];
  const improper = pn.length > q.length || q.length < 2;
  const poles = improper ? [] : roots(q);
  const pole = ([re, im]: [number, number]) => {
    const r = Math.abs(re) < 1e-9 ? 0 : re;
    if (Math.abs(im) < 1e-7) return `{${texNum(r, lang, 4)}}`;
    return `{${texNum(r, lang, 4)}} ${im < 0 ? '-' : '+'} ${texNum(Math.abs(im), lang, 4)}\\,j`;
  };
  return (
    <>
      <div className="param-grid ode-grid">
        <CoeffField label="Q(D)" value={def.q ?? '1 1'} onChange={(s) => onChange({ ...def, q: s })} />
        <CoeffField label="P(D)" value={def.pn ?? '1'} onChange={(s) => onChange({ ...def, pn: s })} />
      </div>
      <p className="ode-help">{t('odeHelp')}</p>
      {improper ? (
        <p className="callout warn-callout">{t('odeImproper')}</p>
      ) : (
        <div className="sig-tex">
          <Tex tex={`${wrapPoly(q)}\\, y = ${wrapPoly(pn)}\\, u`} />
          <Tex tex={`${name}(t) = \\mathcal L^{-1}\\!\\left\\{\\dfrac{${polyTex(pn, 's')}}{${polyTex(q, 's')}}\\right\\}`} />
          <Tex tex={`\\text{${t('poles')}: } ${poles.map(pole).join(';\\ ')}`} />
        </div>
      )}
    </>
  );
}

function SignalEditor({ def, onChange, lang, window, name }: { def: SigDef; onChange: (d: SigDef) => void; lang: Lang; window: [number, number]; name: 'u' | 'h' | 'h_2' }) {
  const p = { ...defaults(def.kind), ...def.p };
  const sig = build(def, window);
  const kinds = name === 'u' ? U_KINDS : H_KINDS;
  const fresh = (k: Kind): SigDef => ({ kind: k, p: defaults(k), src: k === 'custom' ? 'mu(t) - mu(t-1)' : undefined, ...(k === 'ode' ? { q: '1 3 2', pn: '2' } : {}) });
  return (
    <>
      <select value={def.kind} onChange={(e) => onChange(fresh(e.target.value as Kind))}>
        {kinds.map((k) => (
          <option key={k} value={k}>
            {KIND_NAMES[k][lang]}
          </option>
        ))}
      </select>
      {def.kind === 'custom' ? (
        <ExprInput label={`${name}(t) =`} value={def.src ?? ''} vars={['t']} lang={lang} onChange={(s) => onChange({ ...def, src: s })} />
      ) : def.kind === 'ode' ? (
        <OdeEditor def={def} onChange={onChange} lang={lang} name={name} />
      ) : (
        <>
          <div className="param-grid">
            {PARAMS[def.kind].map(([k, label, , min]) => (
              <label key={k} className="field-row">
                <Tex tex={`${label} =`} />
                <NumField value={p[k]} min={min} width={70} onChange={(v) => onChange({ ...def, p: { ...p, [k]: v } })} />
              </label>
            ))}
          </div>
          <div className="sig-tex">
            <Tex tex={`${name}(t) = ${sig.tex('t')}`} />
          </div>
        </>
      )}
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);
  const [tab, setTab] = useState<Tab>('graphic');
  const [preset, setPreset] = useState('rc1');
  const [uDef, setUDef] = useState<SigDef>(PRESETS[0].u);
  const [hDef, setHDef] = useState<SigDef>(PRESETS[0].h);
  const [h2Def, setH2Def] = useState<SigDef>({ kind: 'rc', p: { RC: 0.5, d: 0 } });
  const [autoWin, setAutoWin] = useState(true);
  const [manual, setManual] = useState<[number, number]>([-0.5, 3]);
  const [flipU, setFlipU] = useState(false);
  const [nParts, setNParts] = useState(6);

  const probe: [number, number] = autoWin ? [-5, 20] : manual;
  const u0 = useMemo(() => build(uDef, probe), [uDef, probe[0], probe[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const h0 = useMemo(() => build(hDef, probe), [hDef, probe[0], probe[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const win: [number, number] = autoWin ? autoWindow(u0, h0) : manual;
  const u = useMemo(() => build(uDef, win), [uDef, win[0], win[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const h = useMemo(() => build(hDef, win), [hDef, win[0], win[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tc, setTc] = useState(0.6);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTc((x) => {
        const nx = x + ((win[1] - win[0]) / 8) * dt;
        return nx > win[1] ? win[0] : nx;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, win[0], win[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const tNow = Math.min(win[1], Math.max(win[0], tc));

  const load = (id: string) => {
    const p = PRESETS.find((q) => q.id === id);
    setPreset(id);
    if (!p) return;
    setUDef(p.u);
    setHDef(p.h);
    setAutoWin(true);
    setTc(0.6 * (p.u.p.T ?? 1));
  };
  const pr = PRESETS.find((q) => q.id === preset);
  const isPreset = !!pr && JSON.stringify(pr.u) === JSON.stringify(uDef) && JSON.stringify(pr.h) === JSON.stringify(hDef);

  // ---------------------------------------------------------------- output y(t)
  const N = 700;
  const ts = useMemo(() => Array.from({ length: N + 1 }, (_, i) => win[0] + ((win[1] - win[0]) * i) / N), [win[0], win[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const y = useMemo(() => ts.map((x) => convAt(u, h, x, 300)), [u, h, ts]);
  const yImp = useMemo(() => convImpulses(u, h), [u, h]);
  const breaks = useMemo(() => segmentBreaks(u, h), [u, h]);
  const yNow = convAt(u, h, tNow, 1200);
  const range = (vals: number[], extra: number[] = []) => {
    const v = [...vals, ...extra].filter(Number.isFinite);
    const lo = Math.min(0, ...v), hi = Math.max(0, ...v);
    const pad = 0.1 * (hi - lo || 1);
    return [lo - pad, hi + pad] as [number, number];
  };

  // ---------------------------------------------------------------- graphic tab
  const fixed: Signal = flipU ? h : u;
  const moving: Signal = flipU ? u : h;
  const graphic: PlotSpec = useMemo(() => {
    const fx = ts.map((x) => fixed.f(x));
    const mv = ts.map((x) => moving.f(tNow - x));
    const pr = ts.map((x, i) => fx[i] * mv[i]);
    const series: Series[] = [
      { x: ts, y: pr, color: '--c-comp', kind: 'area', alpha: 0.28, label: t('product') },
      { x: ts, y: fx, color: '--c-signal', width: 2.2, label: flipU ? 'h(τ)' : 'u(τ)' },
      { x: ts, y: mv, color: '--c-approx', width: 2, label: flipU ? 'u(t − τ)' : 'h(t − τ)' },
    ];
    if (fixed.imp.length) series.push({ x: fixed.imp.map((i) => i.t), y: fixed.imp.map((i) => i.w), color: '--c-signal', kind: 'arrow' });
    if (moving.imp.length) series.push({ x: moving.imp.map((i) => tNow - i.t), y: moving.imp.map((i) => i.w), color: '--c-approx', kind: 'arrow' });
    const all = [...fx, ...mv, ...pr, ...fixed.imp.map((i) => i.w), ...moving.imp.map((i) => i.w)];
    return { series, xRange: win, yRange: range(all), xLabel: 'τ', legend: true, vLines: [{ v: tNow, color: '--axis', dash: [4, 3], label: 'τ = t' }] };
  }, [ts, fixed, moving, tNow, win, flipU, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const out: PlotSpec = useMemo(() => {
    const past = ts.map((x, i) => (x <= tNow ? y[i] : NaN));
    const series: Series[] = [
      { x: ts, y, color: '--c-input', width: 1.2, alpha: 0.6 },
      { x: ts, y: past, color: '--s1', width: 2.4, label: 'y(t)' },
      { x: [tNow], y: [yNow], color: '--c-comp', kind: 'points', width: 5 },
    ];
    if (yImp.length) series.push({ x: yImp.map((i) => i.t), y: yImp.map((i) => i.w), color: '--s1', kind: 'arrow' });
    return {
      series,
      xRange: win,
      yRange: range(y, yImp.map((i) => i.w)),
      xLabel: 't',
      vLines: [...breaks.filter((b) => b > win[0] && b < win[1]).map((b) => ({ v: b, color: '--c-input', dash: [2, 4] })), { v: tNow, color: '--axis', dash: [4, 3] }],
    };
  }, [ts, y, tNow, yNow, win, breaks, yImp]);

  // ---------------------------------------------------------------- Duhamel tab
  const [ua, ub] = [Math.max(u.sup[0], win[0]), Math.min(u.sup[1], win[1])];
  const duh = useMemo(() => {
    if (tab !== 'duhamel') return null;
    const g = stepResponse(h, ts.map((x) => x - win[0]));
    const gAt = (x: number) => stepResponse(h, [x])[0];
    const sd = stepDecomposition(u, ua, ub, nParts);
    const stair = ts.map((x) => { let s = 0; sd.taus.forEach((tk, k) => { if (x >= tk) s += sd.inc[k]; }); return s; });
    // tabulate g on a fine grid for speed
    const G0 = win[0] - (win[1] - win[0]), G1 = win[1] - win[0] + Math.max(0, -win[0]);
    const M = 2000;
    const gs = Array.from({ length: M + 1 }, (_, i) => G0 + ((G1 - G0) * i) / M);
    const gv = stepResponse(h, gs);
    const gLook = (x: number) => { if (x <= G0) return 0; if (x >= G1) return gAt(x); const p = ((x - G0) / (G1 - G0)) * M; const i = Math.floor(p); return gv[i] + (gv[Math.min(M, i + 1)] - gv[i]) * (p - i); };
    const ySteps = ts.map((x) => sd.taus.reduce((s, tk, k) => s + sd.inc[k] * gLook(x - tk), 0));
    const id = impulseDecomposition(u, ua, ub, nParts);
    // impulses of h (D·δ or a delay) turn each input impulse into an impulse; drawn as a box of width Δτ and the same area
    const yImps = ts.map((x) => id.taus.reduce((s, tk, k) => s + id.areas[k] * h.f(x - tk), 0)
      + h.imp.reduce((s, i) => s + id.taus.reduce((q, tk, k) => q + (Math.abs(x - tk - i.t) < id.dt / 2 ? (id.areas[k] * i.w) / id.dt : 0), 0), 0));
    const hOnTs = ts.map((x) => h.f(x - win[0]));
    return { g, sd, stair, ySteps, id, yImps, hOnTs };
  }, [tab, h, u, ts, win, ua, ub, nParts]);

  // ---------------------------------------------------------------- systems tab
  const sysCalc = useMemo(() => {
    if (tab !== 'systems') return null;
    const T1 = Math.max(win[1], 0.5);
    const M = 900;
    const dt = T1 / M;
    const h2 = build(h2Def, [0, T1]);
    const su = sampleSig(u, dt, M), s1 = sampleSig(h, dt, M), s2 = sampleSig(h2, dt, M);
    const heq = convS(s1, s2, dt);
    const hpar = addS(s1, s2);
    const yCas = convS(su, heq, dt);
    const yCas2 = convS(convS(su, s1, dt), s2, dt);
    const yPar = convS(su, hpar, dt);
    const tt = Array.from({ length: M + 1 }, (_, i) => i * dt);
    return { tt, dt, s1, s2, heq, hpar, yCas, yCas2, yPar, T1 };
  }, [tab, u, h, h2Def, win]);

  const tabs: [Tab, TKey][] = [
    ['graphic', 'tabGraphic'],
    ['duhamel', 'tabDuhamel'],
    ['systems', 'tabSystems'],
  ];
  const supY: [number, number] = [u.sup[0] + h.sup[0], u.sup[1] + h.sup[1]];

  return (
    <div className="lab-app convlab">
      <LabHeader logo={logoUrl} glyph={GLYPHS.convolution} lab="convolution" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Card title={t('examples')}>
            <select value={isPreset ? preset : ''} onChange={(e) => load(e.target.value)}>
              <option value="">{t('custom')}</option>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]}
                </option>
              ))}
            </select>
          </Card>
          <Card title={t('secInput')} info={t('tipSig')}>
            <SignalEditor def={uDef} onChange={setUDef} lang={lang} window={win} name="u" />
          </Card>
          <Card title={t('secH')} info={t('tipH')}>
            <SignalEditor def={hDef} onChange={setHDef} lang={lang} window={win} name="h" />
          </Card>
          {tab === 'systems' && (
            <Card title={t('secH2')} info={t('tipH')}>
              <SignalEditor def={h2Def} onChange={setH2Def} lang={lang} window={win} name="h_2" />
            </Card>
          )}
          <Card title={t('secWindow')}>
            <Check label={t('auto')} checked={autoWin} onChange={(v) => { if (!v) setManual(win); setAutoWin(v); }} />
            {!autoWin && (
              <div className="field-row">
                <NumField value={manual[0]} width={64} onChange={(v) => v < manual[1] && setManual([v, manual[1]])} />
                <Tex tex="\le t \le" />
                <NumField value={manual[1]} width={64} onChange={(v) => v > manual[0] && setManual([manual[0], v])} />
              </div>
            )}
          </Card>
        </aside>
        <main className="lab-main">
          <nav className="tabs main-tabs">
            {tabs.map(([id, k]) => (
              <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {t(k)}
              </button>
            ))}
          </nav>

          {tab === 'graphic' && (
            <>
              <p className="callout">
                <Rich text={t('ideaGraphic')} />
              </p>
              <div className="card time-bar">
                <div className="row wrap">
                  <button className="primary" onClick={() => setPlaying(!playing)}>
                    {playing ? '❚❚ ' + t('pause') : '▶ ' + t('play')}
                  </button>
                  <div className="grow">
                    <Slider label={t('secTime')} value={tNow} min={win[0]} max={win[1]} step={(win[1] - win[0]) / 1000} onChange={setTc} display={`t = ${fmt(tNow, lang, 3)}`} />
                  </div>
                  <label className="check">
                    <input type="checkbox" checked={flipU} onChange={(e) => setFlipU(e.target.checked)} />
                    <span>{t('flipU')}</span>
                    <InfoTip text={t('tipFlip')} />
                  </label>
                </div>
              </div>
              <div className="metrics">
                <Metric label={t('mArea')} value={fmt(yNow, lang, 4)} />
                <Metric label={t('mSupY')} value={`[${fmt(supY[0], lang, 3)}; ${fmt(supY[1], lang, 3)}${Number.isFinite(supY[1]) ? ']' : ')'}`} />
                <Metric label={t('mBreaks')} value={breaks.length ? breaks.map((b) => fmt(b, lang, 3)).join(' · ') : '—'} />
              </div>
              <Card title={t('plotTau')} info={t('tipTau')}>
                <Plot spec={graphic} height={290} />
              </Card>
              <Card title={t('plotY')} info={t('tipY')}>
                <Plot spec={out} height={230} />
              </Card>
            </>
          )}

          {tab === 'duhamel' && duh && (
            <>
              <p className="callout">
                <Rich text={t('ideaDuhamel')} />
              </p>
              <div className="card time-bar">
                <Slider label={t('nParts')} value={nParts} min={1} max={60} step={1} onChange={(v) => setNParts(Math.round(v))} display={`n = ${nParts},  Δτ = ${fmt((ub - ua) / nParts, lang, 3)}`} />
              </div>
              <div className="two-col stack-narrow">
                <Card title={t('stepsCard')} info={t('tipStepsCard')}>
                  <Plot
                    height={170}
                    spec={{
                      series: [
                        { x: ts, y: ts.map((x) => u.f(x)), color: '--c-signal', width: 2, label: 'u(t)' },
                        { x: ts, y: duh.stair, color: '--c-approx', width: 1.8, label: t('approxIn') },
                      ],
                      xRange: win, yRange: range(ts.map((x) => u.f(x)), duh.stair), xLabel: 't', legend: true,
                    }}
                  />
                  <Plot
                    height={190}
                    spec={{
                      series: [
                        { x: ts, y, color: '--s1', width: 2.2, label: `y (${t('exact')})` },
                        { x: ts, y: duh.ySteps, color: '--c-approx', width: 1.6, dash: [6, 4], label: `Σ Δuₖ g(t − τₖ)` },
                      ],
                      xRange: win, yRange: range(y, duh.ySteps), xLabel: 't', legend: true,
                    }}
                  />
                  <p className="hint">
                    {t('maxErr')}: {fmt(Math.max(...duh.ySteps.map((v, i) => Math.abs(v - y[i]))), lang, 3)}
                  </p>
                </Card>
                <Card title={t('impCard')} info={t('tipImpCard')}>
                  <Plot
                    height={170}
                    spec={{
                      series: [
                        { x: ts, y: ts.map((x) => u.f(x)), color: '--c-signal', width: 2, label: 'u(t)' },
                        { x: duh.id.taus, y: duh.id.taus.map((x) => u.f(x)), color: '--c-approx', kind: 'arrow', width: 1.6, label: 'u(τₖ)Δτ · δ(t − τₖ) / Δτ' },
                      ],
                      xRange: win, yRange: range(ts.map((x) => u.f(x))), xLabel: 't', legend: true,
                    }}
                  />
                  <Plot
                    height={190}
                    spec={{
                      series: [
                        { x: ts, y, color: '--s1', width: 2.2, label: `y (${t('exact')})` },
                        { x: ts, y: duh.yImps, color: '--c-approx', width: 1.6, dash: [6, 4], label: `Σ u(τₖ)Δτ h(t − τₖ)` },
                      ],
                      xRange: win, yRange: range(y, duh.yImps), xLabel: 't', legend: true,
                    }}
                  />
                  <p className="hint">
                    {t('maxErr')}: {fmt(Math.max(...duh.yImps.map((v, i) => Math.abs(v - y[i]))), lang, 3)}
                  </p>
                </Card>
              </div>
              <Card title={t('gTitle')} info={t('tipG')}>
                <Plot
                  height={200}
                  spec={{
                    series: [
                      { x: ts.map((x) => x - win[0]), y: duh.g, color: '--s3', width: 2.2, label: 'g(t)' },
                      { x: ts.map((x) => x - win[0]), y: duh.hOnTs, color: '--s2', width: 1.8, label: 'h(t) = dg/dt' },
                      ...(h.imp.length ? [{ x: h.imp.map((i) => i.t), y: h.imp.map((i) => i.w), color: '--s2', kind: 'arrow' } as Series] : []),
                    ],
                    xRange: [0, win[1] - win[0]], yRange: range(duh.g, duh.hOnTs), xLabel: 't', legend: true,
                  }}
                />
              </Card>
            </>
          )}

          {tab === 'systems' && sysCalc && (
            <>
              <p className="callout">
                <Rich text={t('ideaSystems')} />
              </p>
              <p className="hint">{t('causalNote')}</p>
              <div className="two-col stack-narrow">
                <Card title={t('plotHeq')}>
                  <Plot
                    height={260}
                    spec={{
                      series: [
                        ...sampledSeries(sysCalc.tt, sysCalc.dt, sysCalc.s1, { color: '--s1', width: 1.4, label: 'h₁' }),
                        ...sampledSeries(sysCalc.tt, sysCalc.dt, sysCalc.s2, { color: '--s2', width: 1.4, label: 'h₂' }),
                        ...sampledSeries(sysCalc.tt, sysCalc.dt, sysCalc.heq, { color: '--s3', width: 2.4, label: `h₁ ∗ h₂ (${t('cascade')})` }),
                        ...sampledSeries(sysCalc.tt, sysCalc.dt, sysCalc.hpar, { color: '--s4', width: 2, dash: [6, 4], label: `h₁ + h₂ (${t('parallel')})` }),
                      ],
                      xRange: [0, sysCalc.T1], yRange: range(sampledValues(sysCalc.s1, sysCalc.s2, sysCalc.heq, sysCalc.hpar)), xLabel: 't', legend: true,
                    }}
                  />
                </Card>
                <Card title={t('plotOut')} info={t('tipOut')}>
                  <Plot
                    height={260}
                    spec={{
                      series: [
                        ...sampledSeries(sysCalc.tt, sysCalc.dt, sysCalc.yCas, { color: '--s3', width: 2.6, label: `u ∗ (h₁ ∗ h₂)` }),
                        ...sampledSeries(sysCalc.tt, sysCalc.dt, sysCalc.yCas2, { color: '--text', width: 1.2, dash: [3, 3], label: `(u ∗ h₁) ∗ h₂` }),
                        ...sampledSeries(sysCalc.tt, sysCalc.dt, sysCalc.yPar, { color: '--s4', width: 2, dash: [6, 4], label: `u ∗ (h₁ + h₂)` }),
                      ],
                      xRange: [0, sysCalc.T1], yRange: range(sampledValues(sysCalc.yCas, sysCalc.yPar)), xLabel: 't', legend: true,
                    }}
                  />
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/** Regular part as a line, impulses as arrows of height equal to their weight. */
function sampledSeries(tt: number[], dt: number, s: Sampled, style: Omit<Series, 'x' | 'y'>): Series[] {
  const out: Series[] = [{ ...style, x: tt, y: Array.from(s.v) }];
  if (s.imp.length) out.push({ color: style.color, width: 1.6, kind: 'arrow', x: s.imp.map((i) => i.k * dt), y: s.imp.map((i) => i.w) });
  return out;
}
function sampledValues(...list: Sampled[]): number[] {
  return list.flatMap((s) => [...Array.from(s.v), ...s.imp.map((i) => i.w)]);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="mlabel">{label}</span>
      <span className="mval">{value}</span>
    </div>
  );
}

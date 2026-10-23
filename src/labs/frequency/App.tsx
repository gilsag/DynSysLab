import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Root, SystemDef } from './math/types';
import { newId } from './math/types';
import { autoRange, bode, encirclements, factorsOf, logspace, margins as computeMargins, evalAt, gains } from './math/tf';
import { presets } from './math/presets';
import SPlane, { type EditMode } from './components/SPlane';
import BodePlot, { FACTOR_COLORS } from './components/BodePlot';
import RootTable, { NumField } from './components/RootTable';
import TFDisplay, { factorLabel } from './components/TFDisplay';
import Insights from './components/Insights';
import { TimePanel, SinePanel, NyquistPanel, ContribPanel } from './components/Panels';
import ChallengePanel, { randomSystem, score, type Difficulty } from './components/Challenge';
import { fmt, tr, type Lang } from './i18n';
import usmLogo from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';

type Overlay =
  | { kind: 'snapshot'; sys: SystemDef }
  | { kind: 'challenge'; sys: SystemDef; revealed: boolean };

type Tab = 'time' | 'sine' | 'nyq' | 'contrib' | 'challenge';

function encodeSys(s: SystemDef) {
  const c = {
    r: s.roots.map((r) => [r.kind === 'pole' ? 1 : 0, r.re, r.im]),
    m: s.gainMode === 'bode' ? 1 : 0,
    g: s.gainDb,
    n: s.gainNeg ? 1 : 0,
    d: s.delay,
  };
  return btoa(JSON.stringify(c));
}
function decodeSys(h: string): SystemDef | null {
  try {
    const c = JSON.parse(atob(h));
    return {
      roots: (c.r as [number, number, number][]).map(([k, re, im]) => ({
        id: newId(),
        kind: k ? 'pole' : 'zero',
        re: +re,
        im: Math.abs(+im),
      })),
      gainMode: c.m ? 'bode' : 'lead',
      gainDb: +c.g || 0,
      gainNeg: !!c.n,
      delay: Math.max(0, +c.d || 0),
    };
  } catch {
    return null;
  }
}

function initialSys(): SystemDef {
  try {
    const m = location.hash.match(/s=([^&]+)/);
    if (m) {
      const s = decodeSys(decodeURIComponent(m[1]));
      if (s) return s;
    }
  } catch {
    /* ignore */
  }
  return presets.find((p) => p.key === 'second')!.make();
}

const embedded = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang(['bodelab.lang']));
  const t = tr(lang);
  useEffect(() => persistLang(lang), [lang]);

  // ---------------------------------------------------------------- system + history
  const [sys, setSys] = useState<SystemDef>(initialSys);
  const committed = useRef<SystemDef>(sys);
  const [past, setPast] = useState<SystemDef[]>([]);
  const [future, setFuture] = useState<SystemDef[]>([]);

  const commit = useCallback((next: SystemDef) => {
    const prev = committed.current;
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      setPast((p) => [...p.slice(-80), prev]);
      setFuture([]);
    }
    committed.current = next;
    setSys(next);
  }, []);
  const setRoots = useCallback(
    (roots: Root[], doCommit: boolean) => {
      setSys((s) => {
        const next = { ...s, roots };
        if (doCommit) {
          // defer the history push to keep the state update pure
          queueMicrotask(() => commit(next));
        }
        return next;
      });
    },
    [commit],
  );
  const patch = (p: Partial<SystemDef>) => commit({ ...sys, ...p });
  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([committed.current, ...future]);
    committed.current = prev;
    setSys(prev);
  };
  const redo = () => {
    if (!future.length) return;
    const nx = future[0];
    setFuture(future.slice(1));
    setPast([...past, committed.current]);
    committed.current = nx;
    setSys(nx);
  };

  // ---------------------------------------------------------------- UI state
  const [mode, setMode] = useState<EditMode>('move');
  const [selected, setSelected] = useState<string | null>(null);
  const [opt, setOpt] = useState({
    asym: true,
    factors: false,
    margins: true,
    vectors: true,
    cl: false,
    locus: false,
    snap: true,
  });
  const toggle = (k: keyof typeof opt) => setOpt((o) => ({ ...o, [k]: !o[k] }));
  const [units, setUnits] = useState<'rad' | 'hz'>('rad');
  const [rangeAuto, setRangeAuto] = useState(true);
  const [rangeManual, setRangeManual] = useState<[number, number]>([-2, 3]);
  const [wStar, setWStar] = useState<number | null>(1);
  const [pinned, setPinned] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [tab, setTab] = useState<Tab>('time');
  const [fitSignal, setFitSignal] = useState(0);
  const [presetKey, setPresetKey] = useState<string>('second');
  const [copied, setCopied] = useState(false);

  // ---------------------------------------------------------------- derived
  const range = useMemo<[number, number]>(() => {
    if (!rangeAuto) return rangeManual;
    const a = autoRange(sys);
    if (overlay) {
      const b = autoRange(overlay.sys);
      return [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
    }
    return a;
  }, [sys, overlay, rangeAuto, rangeManual]);
  const grid = useMemo(() => logspace(range[0], range[1], 900), [range]);
  const factors = useMemo(() => factorsOf(sys), [sys]);
  const data = useMemo(() => bode(factors, grid), [factors, grid]);
  const oFactors = useMemo(() => (overlay ? factorsOf(overlay.sys) : null), [overlay]);
  const oData = useMemo(() => (oFactors ? bode(oFactors, grid) : null), [oFactors, grid]);
  const mg = useMemo(() => computeMargins(factors, range[0], range[1]), [factors, range]);
  const nEnc = useMemo(() => encirclements(sys, factors, range[0], range[1]), [sys, factors, range]);
  const wEff = wStar ?? Math.pow(10, (range[0] + range[1]) / 2);
  const challengeResult = useMemo(
    () => (overlay?.kind === 'challenge' && oData ? score(data, oData) : null),
    [overlay, data, oData],
  );

  const freqUnit = useCallback(
    (w: number) => (units === 'hz' ? `${fmt(w / (2 * Math.PI), lang)} Hz` : `${fmt(w, lang)} rad/s`),
    [units, lang],
  );

  // keep the URL hash in sync (shareable state)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        history.replaceState(null, '', `#s=${encodeURIComponent(encodeSys(sys))}`);
      } catch {
        /* sandboxed */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [sys]);

  // keyboard shortcuts
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (!mod && (e.key === 'Delete' || e.key === 'Backspace') && selected) {
        commit({ ...sys, roots: sys.roots.filter((r) => r.id !== selected) });
        setSelected(null);
      } else if (!mod && e.key === 'p') setMode('pole');
      else if (!mod && e.key === 'z') setMode('zero');
      else if (!mod && e.key === 'm') setMode('move');
      else if (!mod && e.key === 'd') setMode('delete');
      else if (!mod && e.key === 'Escape') {
        setMode('move');
        setSelected(null);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  });

  const loadPreset = (key: string) => {
    const p = presets.find((x) => x.key === key);
    if (!p) return;
    setPresetKey(key);
    commit(p.make());
    setSelected(null);
    setFitSignal((n) => n + 1);
    if (overlay?.kind === 'challenge') setOverlay(null);
  };

  const startChallenge = () => {
    const target = randomSystem(difficulty);
    setOverlay({ kind: 'challenge', sys: target, revealed: false });
    commit({ roots: [], gainMode: 'bode', gainDb: 0, gainNeg: false, delay: 0 });
    setPresetKey('');
    setRangeAuto(true);
    setFitSignal((n) => n + 1);
  };

  const { kb, kl } = gains(sys);
  const gainShown = sys.gainMode === 'bode' ? kb : kl;
  const preset = presets.find((p) => p.key === presetKey);
  const at = wStar !== null ? evalAt(factors, wStar) : null;
  const overlayLabel = overlay ? (overlay.kind === 'snapshot' ? t('frozen') : t('target')) : '';
  const hint = mode === 'move' ? t('hintMove') : mode === 'delete' ? t('hintDel') : t('hintAdd');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href.split('#')[0] + `#s=${encodeURIComponent(encodeSys(sys))}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="lab-app bode">
      <LabHeader
        logo={usmLogo}
        glyph={GLYPHS.frequency}
        lab="frequency"
        subtitle={t('subtitle')}
        lang={lang}
        onLang={setLang}
        tools={
          <>
            <div className="seg" title={t('units')}>
              <button className={units === 'rad' ? 'on' : ''} onClick={() => setUnits('rad')}>
                rad/s
              </button>
              <button className={units === 'hz' ? 'on' : ''} onClick={() => setUnits('hz')}>
                Hz
              </button>
            </div>
            <button className="icon" onClick={undo} disabled={!past.length} title={`${t('ctrlZ')} (Ctrl+Z)`} aria-label={t('ctrlZ')}>
              ↶
            </button>
            <button className="icon" onClick={redo} disabled={!future.length} title={`${t('ctrlY')} (Ctrl+Y)`} aria-label={t('ctrlY')}>
              ↷
            </button>
            {!embedded && (
              <button onClick={copyLink} title={t('share')}>
                {copied ? t('copied') : t('share')}
              </button>
            )}
          </>
        }
      />

      <div className="lab-layout">
        <aside className="lab-sidebar">
          <div className="card">
            <div className="card-head">
              <h3>{t('splane')}</h3>
              <button className="tiny" onClick={() => setFitSignal((n) => n + 1)}>
                {t('fit')}
              </button>
            </div>
            <div className="seg full">
              <button className={mode === 'move' ? 'on' : ''} onClick={() => setMode('move')} title="M">
                {t('move')}
              </button>
              <button className={`pole ${mode === 'pole' ? 'on' : ''}`} onClick={() => setMode('pole')} title="P">
                {t('addPole')}
              </button>
              <button className={`zero ${mode === 'zero' ? 'on' : ''}`} onClick={() => setMode('zero')} title="Z">
                {t('addZero')}
              </button>
              <button className={mode === 'delete' ? 'on' : ''} onClick={() => setMode('delete')} title="D">
                {t('del')}
              </button>
            </div>
            <SPlane
              sys={sys}
              onRoots={setRoots}
              mode={mode}
              selected={selected}
              onSelect={setSelected}
              wStar={wStar}
              showVectors={opt.vectors}
              showCL={opt.cl}
              showLocus={opt.locus}
              snap={opt.snap}
              overlayRoots={
                overlay && (overlay.kind === 'snapshot' || overlay.revealed) ? overlay.sys.roots : null
              }
              lang={lang}
              fitSignal={fitSignal}
            />
            <p className="hint">{hint}</p>
            <div className="checks">
              <label className="check">
                <input type="checkbox" checked={opt.snap} onChange={() => toggle('snap')} />
                {t('snap')}
              </label>
              <label className="check">
                <input type="checkbox" checked={opt.vectors} onChange={() => toggle('vectors')} />
                {t('vectors')}
              </label>
              <label className="check">
                <input type="checkbox" checked={opt.cl} onChange={() => toggle('cl')} />
                <span className="clmark" /> {t('clPoles')}
              </label>
              <label className="check">
                <input type="checkbox" checked={opt.locus} onChange={() => toggle('locus')} />
                {t('locus')}
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{t('gain')}</h3>
            </div>
            <div className="seg full">
              <button
                className={sys.gainMode === 'bode' ? 'on' : ''}
                onClick={() => {
                  const g = gains(sys).kb;
                  patch({ gainMode: 'bode', gainDb: 20 * Math.log10(Math.abs(g)), gainNeg: g < 0 });
                }}
              >
                {t('gainBode')}
              </button>
              <button
                className={sys.gainMode === 'lead' ? 'on' : ''}
                onClick={() => {
                  const g = gains(sys).kl;
                  patch({ gainMode: 'lead', gainDb: 20 * Math.log10(Math.abs(g)), gainNeg: g < 0 });
                }}
              >
                {t('gainLead')}
              </button>
            </div>
            <p className="hint">{t('gainModeHelp')}</p>
            <div className="row gap">
              <input
                className="grow"
                type="range"
                min={-60}
                max={60}
                step={0.5}
                value={Math.max(-60, Math.min(60, sys.gainDb))}
                onChange={(e) => setSys({ ...sys, gainDb: +e.target.value })}
                onPointerUp={() => commit(sys)}
                onKeyUp={() => commit(sys)}
              />
              <NumField
                value={sys.gainDb}
                onCommit={(v) => patch({ gainDb: v })}
                width={64}
                title="dB"
              />
              <span className="small muted">dB</span>
            </div>
            <div className="row gap small">
              <span className="muted">{sys.gainMode === 'bode' ? 'K_B' : 'K'} =</span>
              <NumField
                value={gainShown}
                onCommit={(v) => v !== 0 && patch({ gainDb: 20 * Math.log10(Math.abs(v)), gainNeg: v < 0 })}
                width={90}
              />
              <label className="check">
                <input type="checkbox" checked={sys.gainNeg} onChange={() => patch({ gainNeg: !sys.gainNeg })} />
                {t('negative')}
              </label>
            </div>
            <div className="row gap">
              <span className="small">{t('delay')}</span>
              <input
                className="grow"
                type="range"
                min={0}
                max={Math.max(2, sys.delay)}
                step={0.01}
                value={sys.delay}
                onChange={(e) => setSys({ ...sys, delay: +e.target.value })}
                onPointerUp={() => commit(sys)}
                onKeyUp={() => commit(sys)}
              />
              <NumField value={sys.delay} min={0} onCommit={(v) => patch({ delay: v })} width={64} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{t('roots')}</h3>
              <button
                className="tiny"
                onClick={() => {
                  commit({ ...sys, roots: [] });
                  setPresetKey('');
                }}
              >
                {t('clearAll')}
              </button>
            </div>
            <RootTable
              roots={sys.roots}
              onRoots={(r) => commit({ ...sys, roots: r })}
              selected={selected}
              onSelect={setSelected}
              lang={lang}
            />
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{t('tf')}</h3>
            </div>
            <TFDisplay sys={sys} lang={lang} />
          </div>
        </aside>

        <main className="lab-main bode-main">
        <section className="center">
          <div className="card bodecard">
            <div className="card-head">
              <h3>{t('bode')}</h3>
              <div className="row gap wrap">
                <select
                  value={presetKey}
                  onChange={(e) => loadPreset(e.target.value)}
                  aria-label={t('examples')}
                  className="select"
                >
                  <option value="">{t('choose')}</option>
                  {presets.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name[lang]}
                    </option>
                  ))}
                </select>
                {overlay?.kind === 'snapshot' ? (
                  <button onClick={() => setOverlay(null)}>
                    {t('clearSnapshot')}
                  </button>
                ) : (
                  <button
                   
                    onClick={() => setOverlay({ kind: 'snapshot', sys: { ...sys, roots: sys.roots.map((r) => ({ ...r, id: newId() })) } })}
                    disabled={overlay?.kind === 'challenge'}
                  >
                    {t('snapshot')}
                  </button>
                )}
              </div>
            </div>
            {preset && <p className="callout">{preset.note[lang]}</p>}
            <div className="bodebar">
              <div className="checks">
                <label className="check">
                  <input type="checkbox" checked={opt.asym} onChange={() => toggle('asym')} />
                  <span className="lg asym" /> {t('asym')}
                </label>
                <label className="check">
                  <input type="checkbox" checked={opt.factors} onChange={() => toggle('factors')} />
                  {t('factors')}
                </label>
                <label className="check">
                  <input type="checkbox" checked={opt.margins} onChange={() => toggle('margins')} />
                  {t('margins')}
                </label>
                {overlay && <span className="lg overlay">{overlayLabel}</span>}
              </div>
              <div className="row gap small">
                <span className="muted">{t('range')}</span>
                <label className="check">
                  <input type="checkbox" checked={rangeAuto} onChange={() => {
                    if (rangeAuto) setRangeManual(range);
                    setRangeAuto(!rangeAuto);
                  }} />
                  {t('auto')}
                </label>
                {!rangeAuto && (
                  <>
                    <span>10^</span>
                    <NumField
                      value={rangeManual[0]}
                      width={44}
                      onCommit={(v) => setRangeManual([Math.round(v), Math.max(Math.round(v) + 1, rangeManual[1])])}
                    />
                    <span>…10^</span>
                    <NumField
                      value={rangeManual[1]}
                      width={44}
                      onCommit={(v) => setRangeManual([Math.min(rangeManual[0], Math.round(v) - 1), Math.round(v)])}
                    />
                    <span className="muted">rad/s</span>
                  </>
                )}
              </div>
            </div>
            <div className="readout">
              {at && wStar !== null ? (
                <>
                  <span>
                    ω = <b className="mono">{freqUnit(wStar)}</b>
                    {pinned && <em className="pin">{t('pinned')}</em>}
                  </span>
                  <span>
                    |H| = <b className="mono">{fmt(at.mag, lang)} dB</b> ({fmt(Math.pow(10, at.mag / 20), lang)})
                  </span>
                  <span>
                    ∠H = <b className="mono">{fmt(at.ph, lang)}°</b>
                  </span>
                </>
              ) : (
                <span className="muted">{t('pinHint')}</span>
              )}
              {opt.margins && (
                <span className="margins-txt">
                  {t('pm')}: <b className="mono">{mg.pm !== null ? `${fmt(mg.pm, lang)}°` : t('noCross')}</b>
                  {' · '}
                  {t('gm')}: <b className="mono">{mg.gm !== null ? `${fmt(mg.gm, lang)} dB` : t('noCross')}</b>
                </span>
              )}
            </div>
            <BodePlot
              data={data}
              overlay={oData ? { data: oData, label: overlayLabel } : null}
              factors={factors}
              showAsym={opt.asym}
              showFactors={opt.factors}
              showMargins={opt.margins}
              margins={mg}
              range={range}
              wStar={wStar}
              pinned={pinned}
              onHover={(w) => {
                if (!pinned) setWStar(w);
              }}
              onPin={() => setPinned((p) => !p)}
              units={units}
              lang={lang}
              labels={{
                mag: t('magnitude'),
                phase: t('phase'),
                freq: units === 'hz' ? t('freqHz') : t('freqRad'),
                pm: t('pm'),
                gm: t('gm'),
              }}
            />
            {opt.factors && (
              <div className="factorlegend small">
                {factors.map((f, i) => (
                  <span key={f.key}>
                    <span className={`swatch ${FACTOR_COLORS[i % FACTOR_COLORS.length]}`} />
                    {factorLabel(f, lang)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="side">
          <div className="card">
            <div className="tabs" role="tablist">
              {(
                [
                  ['time', t('tabTime')],
                  ['sine', t('tabSine')],
                  ['nyq', t('tabNyquist')],
                  ['contrib', t('tabContrib')],
                  ['challenge', t('tabChallenge')],
                ] as [Tab, string][]
              ).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="tabbody">
              {tab === 'time' && <TimePanel sys={sys} overlay={overlay?.kind === 'snapshot' || (overlay?.kind === 'challenge' && overlay.revealed) ? overlay.sys : null} lang={lang} />}
              {tab === 'sine' && (
                <SinePanel
                  sys={sys}
                  factors={factors}
                  w={wEff}
                  setW={(w) => {
                    setWStar(w);
                    setPinned(true);
                  }}
                  range={range}
                  lang={lang}
                  freqUnit={freqUnit}
                />
              )}
              {tab === 'nyq' && (
                <NyquistPanel sys={sys} factors={factors} overlayFactors={oFactors} range={range} wStar={wStar} lang={lang} />
              )}
              {tab === 'contrib' && <ContribPanel sys={sys} factors={factors} w={wEff} lang={lang} freqUnit={freqUnit} />}
              {tab === 'challenge' && (
                <ChallengePanel
                  active={overlay?.kind === 'challenge'}
                  revealed={overlay?.kind === 'challenge' && overlay.revealed}
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                  onStart={startChallenge}
                  onReveal={() => overlay?.kind === 'challenge' && setOverlay({ ...overlay, revealed: true })}
                  onEnd={() => setOverlay(null)}
                  result={challengeResult}
                  lang={lang}
                />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{t('insights')}</h3>
            </div>
            <Insights sys={sys} factors={factors} margins={mg} nEnc={nEnc} lang={lang} freqUnit={freqUnit} />
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}

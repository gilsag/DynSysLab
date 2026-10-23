import { useCallback, useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { ConvergencePanel } from './components/ConvergencePanel';
import { DrawPad } from './components/DrawPad';
import { Epicycles } from './components/Epicycles';
import { HarmonicsTable, Preset } from './components/HarmonicsTable';
import { LtiPanel } from './components/LtiPanel';
import { MicPanel } from './components/MicPanel';
import { autoRange, Plot, PlotSpec, Series } from '@shared/Plot';
import { Theory } from './components/Theory';
import { Card, Check, InfoTip, Seg, Slider, Tex } from '@shared/ui';
import { Lang, LangContext, translate, TKey } from './i18n';
import { analyze, Analysis, PhaseMode, Smoothing } from './lib/analysis';
import { audio, WaveData } from './lib/audio';
import { fmtCents, midiToFreq, NOTE_NAMES, nearestNote } from './lib/music';
import { M, maxAbs, mean, N_MAX, resamplePeriodic, twoPeriods } from './lib/fourier';
import { LtiSettings } from './lib/lti';
import { SIGNAL_MAP, SIGNALS } from './lib/signals';

type Tab = 'harmonics' | 'epicycles' | 'convergence' | 'lti' | 'mic' | 'theory';
type Source = 'ref' | 'approx' | 'error';


function buildAudio(a: Analysis, src: Source, volume: number, normalize: boolean): WaveData {
  const K = Math.max(1, Math.min(a.K, 2047));
  const real = new Float32Array(K + 1);
  const imag = new Float32Array(K + 1);
  for (let k = 1; k <= Math.min(a.K, K); k++) {
    const g = src === 'ref' ? 1 : src === 'approx' ? a.weights[k] : 1 - a.weights[k];
    real[k] = a.ref.re[k] * g;
    imag[k] = -a.ref.im[k] * g;
  }
  const wave = src === 'ref' ? a.refWave : src === 'approx' ? a.approxWave : a.errWave;
  const peakOf = (x: Float64Array) => {
    const mu = mean(x);
    let p = 0;
    for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i] - mu));
    return p;
  };
  const own = peakOf(wave);
  const denom = normalize ? own : peakOf(a.refWave);
  let level = denom > 1e-9 ? (0.8 * volume) / denom : 0;
  if (own * level > 0.95) level = 0.95 / Math.max(own, 1e-9);
  return { real, imag, level };
}

function fmtPct(x: number): string {
  const p = x * 100;
  if (p >= 99.99 && p < 100) return p.toFixed(4) + ' %';
  if (p < 0.01 && p > 0) return p.toExponential(1) + ' %';
  return p.toFixed(2) + ' %';
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang(['fourier-lang']));
  useEffect(() => persistLang(lang), [lang]);
  const t = useCallback((k: TKey, v?: Record<string, string | number>) => translate(lang, k, v), [lang]);

  const [signalId, setSignalId] = useState('square');
  const [params, setParams] = useState<Record<string, Record<string, number>>>({});
  const [drawSamples, setDrawSamples] = useState<Float64Array | null>(null);
  const [micSamples, setMicSamples] = useState<Float64Array | null>(null);
  const [N, setN] = useState(5);
  const [animN, setAnimN] = useState(false);
  const [f0, setF0] = useState(220);
  const [a4, setA4] = useState(440);
  const [shift, setShift] = useState(0);
  const [phaseMode, setPhaseMode] = useState<PhaseMode>('original');
  const [phaseSeed, setPhaseSeed] = useState(1);
  const [smoothing, setSmoothing] = useState<Smoothing>('none');
  const [mask, setMask] = useState<Uint8Array>(() => new Uint8Array(N_MAX + 1).fill(1));
  const [lti, setLti] = useState<LtiSettings>({ type: 'none', fc: 660, zeta: 0.05 });

  const [showComponents, setShowComponents] = useState(false);
  const [specScale, setSpecScale] = useState<'lin' | 'db'>('lin');
  const [specSides, setSpecSides] = useState<'one' | 'two'>('one');
  const [specAxis, setSpecAxis] = useState<'k' | 'hz'>('k');
  const [showPhase, setShowPhase] = useState(false);
  const [tab, setTab] = useState<Tab>('harmonics');

  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<Source>('approx');
  const [abMode, setAbMode] = useState(false);
  const [abPhase, setAbPhase] = useState<'ref' | 'approx'>('ref');
  const [volume, setVolume] = useState(0.35);
  const [normalize, setNormalize] = useState(true);

  const def = SIGNAL_MAP[signalId];
  const p = useMemo(() => {
    const out: Record<string, number> = {};
    def.params?.forEach((pd) => (out[pd.key] = params[signalId]?.[pd.key] ?? pd.def));
    return out;
  }, [def, params, signalId]);
  const custom = signalId === 'draw' ? drawSamples : signalId === 'mic' ? micSamples : null;
  const sigCtx = useMemo(() => ({ params: p, f0, custom }), [p, f0, custom]);

  const a = useMemo(
    () => analyze({ signal: def, ctx: sigCtx, N, shift, phaseMode, phaseSeed, smoothing, mask, lti }),
    [def, sigCtx, N, shift, phaseMode, phaseSeed, smoothing, mask, lti],
  );

  // ---------- audio ----------
  const effSource: Source = abMode ? abPhase : source;
  const waveData = useMemo(() => buildAudio(a, effSource, volume, normalize), [a, effSource, volume, normalize]);

  useEffect(() => {
    if (playing) {
      audio.setWave(waveData);
      audio.start(f0, waveData.level);
      audio.setFreq(f0);
      audio.setLevel(waveData.level);
    } else audio.stop();
  }, [playing, waveData, f0]);

  useEffect(() => {
    if (!abMode || !playing) return;
    const id = setInterval(() => setAbPhase((x) => (x === 'ref' ? 'approx' : 'ref')), 1000);
    return () => clearInterval(id);
  }, [abMode, playing]);

  const togglePlay = () => {
    audio.ensure();
    setPlaying((x) => !x);
  };


  // ---------- animation of N ----------
  const animLimit = Math.min(a.K, 60);
  useEffect(() => {
    if (!animN) return;
    const id = setInterval(() => setN((n) => Math.min(n + 1, N_MAX)), 450);
    return () => clearInterval(id);
  }, [animN]);
  useEffect(() => {
    if (animN && N >= animLimit) setAnimN(false);
  }, [animN, N, animLimit]);

  // ---------- handlers ----------
  const changeSignal = (id: string) => {
    if (id === 'draw' && !drawSamples) setDrawSamples(resamplePeriodic(a.refWave, 4096));
    setSignalId(id);
  };
  const setParam = (key: string, v: number) => setParams((ps) => ({ ...ps, [signalId]: { ...ps[signalId], [key]: v } }));
  const toggleMask = (k: number) =>
    setMask((m) => {
      const n = m.slice();
      n[k] = n[k] ? 0 : 1;
      return n;
    });
  const applyPreset = (pr: Preset) => {
    const m = new Uint8Array(N_MAX + 1);
    for (let k = 0; k <= N_MAX; k++) {
      if (typeof pr === 'object') m[k] = k === pr.solo ? 1 : 0;
      else if (pr === 'all') m[k] = 1;
      else if (pr === 'odd') m[k] = k === 0 || k % 2 === 1 ? 1 : 0;
      else if (pr === 'even') m[k] = k % 2 === 0 ? 1 : 0;
      else if (pr === 'noFund') m[k] = k === 1 ? 0 : 1;
      else if (pr === 'fund') m[k] = k <= 1 ? 1 : 0;
    }
    setMask(m);
    if (typeof pr === 'object' && N < pr.solo) setN(pr.solo);
  };
  const maskModified = useMemo(() => {
    for (let k = 0; k <= Math.min(N, a.K); k++) if (!mask[k]) return true;
    return false;
  }, [mask, N, a.K]);
  const onCapture = (s: Float64Array, f: number) => {
    setMicSamples(s);
    setSignalId('mic');
    setF0(f);
  };

  // ---------- derived display data ----------
  const audibleK = Math.floor(20000 / f0);
  const nn = nearestNote(f0, a4, lang);
  const pitchClass = ((nn.midi % 12) + 12) % 12;
  const noteOctave = Math.floor(nn.midi / 12) - 1;
  const changeA4 = (v: number) => {
    if (!(v >= 400 && v <= 480)) return;
    setF0((f) => (f * v) / a4);
    setA4(v);
  };

  const timeSpec = useMemo<PlotSpec>(() => {
    const series: Series[] = [];
    const step = 1 / M;
    if (a.ltiOn) series.push({ y: twoPeriods(a.inputWave), xStep: step, color: '--c-input', dash: [5, 4], width: 1.2, label: t('legendInput') });
    series.push({ y: twoPeriods(a.refWave), xStep: step, color: '--c-signal', width: 2, label: t('legendSignal') });
    if (showComponents) {
      let shown = 0;
      const n = 1001;
      for (let k = 1; k <= a.K && shown < 10; k++) {
        const w = a.weights[k];
        if (!w) continue;
        const A = Math.hypot(a.ref.re[k], a.ref.im[k]) * w;
        if (A < 1e-9) continue;
        const ph = Math.atan2(a.ref.im[k], a.ref.re[k]);
        const y = new Float64Array(n);
        for (let i = 0; i < n; i++) y[i] = A * Math.cos(2 * Math.PI * k * (2 * i) / (n - 1) + ph);
        series.push({ y, xStep: 2 / (n - 1), color: '--c-comp', width: 1, alpha: 0.75 - shown * 0.05 });
        shown++;
      }
    }
    series.push({ y: twoPeriods(a.approxWave), xStep: step, color: '--c-approx', width: 2, label: t('legendApprox') });
    const yr = autoRange(a.ltiOn ? [a.refWave, a.approxWave, a.inputWave] : [a.refWave, a.approxWave], 0.08, 0.2);
    return {
      series,
      xRange: [0, 2],
      yRange: yr,
      xLabel: t('tOverT'),
      legend: true,
      hLines: showComponents ? [{ v: a.ref.re[0] * a.weights[0], color: '--c-comp', dash: [2, 3] }] : [{ v: 0, color: '--axis' }],
      vLines: [{ v: 1, color: '--axis', dash: [3, 4] }],
    };
  }, [a, showComponents, t]);

  const errSpec = useMemo<PlotSpec>(() => {
    const e = maxAbs(a.errWave);
    const lim = Math.max(e * 1.15, 1e-6);
    return {
      series: [{ y: twoPeriods(a.errWave), xStep: 1 / M, color: '--c-error', width: 1.6 }],
      xRange: [0, 2],
      yRange: [-lim, lim],
      xLabel: t('tOverT'),
      hLines: [{ v: 0, color: '--axis' }],
      vLines: [{ v: 1, color: '--axis', dash: [3, 4] }],
    };
  }, [a, t]);

  const kShow = Math.min(a.K, Math.max(12, Math.ceil(N * 1.3) + 2));
  const kAxis = Math.max(kShow, 12); // keep a readable k axis even for signals with few harmonics
  const { ampSpec, phaseSpec } = useMemo(() => {
    const amps = new Float64Array(kShow + 1);
    const ins = new Float64Array(kShow + 1);
    for (let k = 0; k <= kShow; k++) {
      amps[k] = k === 0 ? Math.abs(a.ref.re[0]) : Math.hypot(a.ref.re[k], a.ref.im[k]);
      ins[k] = k === 0 ? Math.abs(a.input.re[0]) : Math.hypot(a.input.re[k], a.input.im[k]);
    }
    const two = specSides === 'two';
    let amax = 1e-15;
    for (let k = 0; k <= kShow; k++) {
      const s = two && k !== 0 ? 0.5 : 1;
      amax = Math.max(amax, amps[k] * s, a.ltiOn ? ins[k] * s : 0);
    }
    const db = specScale === 'db';
    const xOf = (k: number) => (specAxis === 'hz' ? k * f0 : k);
    const yOf = (A: number, k: number) => {
      const v = two && k !== 0 ? A / 2 : A;
      return db ? 20 * Math.log10(Math.max(v, 1e-12) / amax) : v;
    };
    const incX: number[] = [];
    const incY: number[] = [];
    const excX: number[] = [];
    const excY: number[] = [];
    const inX: number[] = [];
    const inY: number[] = [];
    const phX: number[] = [];
    const phY: number[] = [];
    const ks = two ? Array.from({ length: 2 * kShow + 1 }, (_, i) => i - kShow) : Array.from({ length: kShow + 1 }, (_, i) => i);
    for (const ks_ of ks) {
      const k = Math.abs(ks_);
      const A = amps[k];
      const included = a.weights[k] > 0;
      const x = xOf(ks_);
      const y = yOf(A, k);
      if (A > 1e-12 || !db) {
        (included ? incX : excX).push(x);
        (included ? incY : excY).push(y);
      }
      if (a.ltiOn) {
        inX.push(x);
        inY.push(yOf(ins[k], k));
      }
      if (k > 0 && A > 1e-6 * amax) {
        phX.push(x);
        const ph = (Math.atan2(a.ref.im[k], a.ref.re[k]) * 180) / Math.PI;
        phY.push(ks_ < 0 ? -ph : ph);
      }
    }
    const xr: [number, number] = two ? [xOf(-kAxis - 0.8), xOf(kAxis + 0.8)] : [xOf(-0.8), xOf(kAxis + 0.8)];
    const yr: [number, number] = db ? [-80, 5] : [0, amax * 1.1];
    const vLines = [];
    if (audibleK <= kAxis) {
      vLines.push({ v: xOf(audibleK + 0.5), color: '--c-error', dash: [4, 4], label: '20 kHz' });
      if (two) vLines.push({ v: xOf(-audibleK - 0.5), color: '--c-error', dash: [4, 4] });
    }
    const series: Series[] = [];
    if (a.ltiOn) series.push({ x: inX, y: inY, color: '--c-input', kind: 'hollow', width: 3.5, label: t('inputSpectrum') });
    series.push({ x: excX, y: excY, color: '--c-muted', kind: 'stem', label: t('excluded') });
    series.push({ x: incX, y: incY, color: '--c-approx', kind: 'stem', label: t('included') });
    const ampSpec: PlotSpec = {
      series,
      xRange: xr,
      yRange: yr,
      stemBase: db ? -80 : 0,
      xLabel: specAxis === 'hz' ? t('frequencyHz') : t('harmonicK'),
      yLabel: db ? 'dB' : two ? '|c_k|' : 'A_k',
      legend: true,
      vLines,
    };
    const phaseSpec: PlotSpec = {
      series: [{ x: phX, y: phY, color: '--c-phase', kind: 'stem' }],
      xRange: xr,
      yRange: [-200, 200],
      xLabel: specAxis === 'hz' ? t('frequencyHz') : t('harmonicK'),
      yLabel: t('phaseDeg'),
      hLines: [{ v: 0, color: '--axis' }],
    };
    return { ampSpec, phaseSpec };
  }, [a, kShow, kAxis, specScale, specSides, specAxis, f0, audibleK, t]);


  const formula = def.formula ? def.formula(sigCtx, lang) : null;
  const tabTips: Record<Tab, TKey> = {
    harmonics: 'tipHarmonics',
    epicycles: 'tipEpicycles',
    convergence: 'tipConvergence',
    lti: 'tipLti',
    mic: 'tipMic',
    theory: 'tipTheory',
  };
  const tabs: [Tab, TKey][] = [
    ['harmonics', 'tabHarmonics'],
    ['epicycles', 'tabEpicycles'],
    ['convergence', 'tabConvergence'],
    ['lti', 'tabLti'],
    ['mic', 'tabMic'],
    ['theory', 'tabTheory'],
  ];

  return (
    <LangContext.Provider value={lang}>
      <div className="lab-app fourier">
        <LabHeader
          logo={logoUrl}
          glyph={GLYPHS.fourier}
          lab="fourier"
          subtitle={t('appSubtitle')}
          lang={lang}
          onLang={setLang}
        />

        <div className="lab-layout">
          <aside className="lab-sidebar">
            <Card title={t('secSignal')} info={t('tipSignal')}>
              <select value={signalId} onChange={(e) => changeSignal(e.target.value)}>
                {(['classic', 'custom'] as const).map((g) => (
                  <optgroup key={g} label={t(g === 'classic' ? 'grpClassic' : 'grpCustom')}>
                    {SIGNALS.filter((s) => s.group === g).map((s) => (
                      <option key={s.id} value={s.id}>
                        {t(s.name)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {def.params?.map((pd) => (
                <Slider
                  key={pd.key}
                  label={t(pd.label)}
                  value={p[pd.key]}
                  min={pd.min}
                  max={pd.max}
                  step={pd.step}
                  onChange={(v) => setParam(pd.key, v)}
                  display={p[pd.key].toFixed(2)}
                />
              ))}
              {def.note && <p className="hint">{t(def.note)}</p>}
            </Card>

            <Card title={t('secTerms')} info={t('tipTerms')}>
              <div className="row">
                <button className="sq" onClick={() => setN(Math.max(1, N - 1))}>
                  −
                </button>
                <input className="grow" type="range" min={1} max={N_MAX} value={N} onChange={(e) => setN(parseInt(e.target.value))} />
                <button className="sq" onClick={() => setN(Math.min(N_MAX, N + 1))}>
                  +
                </button>
                <input
                  className="num"
                  type="number"
                  min={1}
                  max={N_MAX}
                  value={N}
                  onChange={(e) => setN(Math.max(1, Math.min(N_MAX, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div className="row wrap">
                {[1, 3, 5, 10, 25, 50, 200].map((v) => (
                  <button key={v} className={'tiny' + (N === v ? ' on' : '')} onClick={() => setN(v)}>
                    {v}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (!animN) setN(1);
                  setAnimN(!animN);
                }}
              >
                {animN ? '■ ' + t('stop') : '▶ ' + t('animateN')}
              </button>
              {a.K > 1 && a.K < N_MAX && N >= a.K && <p className="hint">{t('limitedK', { K: a.K })}</p>}
              <label className="field">
                <span>{t('smoothing')}</span>
                <Seg
                  value={smoothing}
                  options={[
                    ['none', t('smNone')],
                    ['fejer', t('smFejer')],
                    ['lanczos', t('smLanczos')],
                  ]}
                  onChange={setSmoothing}
                />
              </label>
            </Card>

            <Card title={t('secPitch')} info={t('tipPitch')}>
              <div className="row">
                <label className="field compact">
                  <span>{t('note')}</span>
                  <select value={pitchClass} onChange={(e) => setF0(midiToFreq(12 * (noteOctave + 1) + parseInt(e.target.value), a4))}>
                    {NOTE_NAMES[lang].map((n, i) => (
                      <option key={i} value={i}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field compact">
                  <span>{t('octave')}</span>
                  <select value={noteOctave} onChange={(e) => setF0(midiToFreq(12 * (parseInt(e.target.value) + 1) + pitchClass, a4))}>
                    {[0, 1, 2, 3, 4, 5, 6].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field compact">
                  <span>{t('a4ref')}</span>
                  <input className="num" type="number" min={400} max={480} step={1} value={a4} onChange={(e) => changeA4(parseFloat(e.target.value))} />
                </label>
              </div>
              <div className="readout big">
                {f0.toFixed(2)} Hz <span className="muted">·</span> {nn.name} {fmtCents(nn.cents)}
                <span className="muted small"> · T = {(1000 / f0).toFixed(2)} ms</span>
              </div>
              <Slider
                label={t('freq')}
                value={Math.log2(f0)}
                min={Math.log2(20)}
                max={Math.log2(2000)}
                step={0.001}
                onChange={(v) => setF0(2 ** v)}
                display={f0.toFixed(1) + ' Hz'}
              />
              <div className="row wrap">
                {[45, 57, 69, 81].map((m) => {
                  const f = midiToFreq(m, a4);
                  return (
                    <button key={m} className={'tiny' + (Math.abs(f0 - f) < 0.01 ? ' on' : '')} onClick={() => setF0(f)}>
                      {nearestNote(f, a4, lang).name} · {Math.round(f)} Hz
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title={t('secSound')} info={t('tipSound')}>
              <button className={'play' + (playing ? ' on' : '')} onClick={togglePlay}>
                {playing ? '■ ' + t('stop') : '▶ ' + t('play')}
              </button>
              <Seg
                value={source}
                disabled={abMode}
                options={[
                  ['ref', t('srcRef')],
                  ['approx', t('srcApprox')],
                  ['error', t('srcError')],
                ]}
                onChange={setSource}
              />
              <Check label={t('abMode')} checked={abMode} onChange={setAbMode} />
              {abMode && playing && (
                <div className={'ab ' + abPhase}>
                  {t('nowPlaying')} <b>{abPhase === 'ref' ? t('srcRef') : t('srcApprox')}</b>
                </div>
              )}
              <Slider label={t('volume')} value={volume} min={0} max={1} step={0.01} onChange={setVolume} display={Math.round(volume * 100) + ' %'} />
              <Check label={t('normalize')} checked={normalize} onChange={setNormalize} />
              <p className="hint">{t('audibleHint', { f: f0.toFixed(0), k: audibleK })}</p>
            </Card>

            <Card title={t('secTransform')} info={t('tipTransform')}>
              <Slider
                label={t('shift')}
                value={shift}
                min={-0.5}
                max={0.5}
                step={0.01}
                onChange={setShift}
                display={shift.toFixed(2)}
              />
              <label className="field">
                <span>{t('phases')}</span>
                <Seg
                  value={phaseMode}
                  options={[
                    ['original', t('phOriginal')],
                    ['cosine', t('phCosine')],
                    ['random', t('phRandom')],
                  ]}
                  onChange={setPhaseMode}
                />
              </label>
              {phaseMode === 'random' && <button onClick={() => setPhaseSeed((s) => s + 1)}>🎲 {t('newPhases')}</button>}
              {maskModified && (
                <p className="hint warnish">
                  {t('maskActive')}{' '}
                  <button className="tiny" onClick={() => applyPreset('all')}>
                    {t('resetMask')}
                  </button>
                </p>
              )}
              {a.ltiOn && (
                <p className="hint warnish">
                  {t('ltiActive')}{' '}
                  <button className="tiny" onClick={() => setTab('lti')}>
                    {t('open')}
                  </button>
                </p>
              )}
            </Card>
          </aside>

          <main className="lab-main">
            {formula && (
              <div className="card formula">
                <Tex block tex={formula} />
                <span className="corner-tip">
                  <InfoTip text={t('tipFormula')} />
                </span>
              </div>
            )}
            {signalId === 'draw' && (
              <Card title={t('sigDraw')} info={t('tipDraw')}>
                <DrawPad
                  samples={drawSamples}
                  onChange={setDrawSamples}
                  onFromCurrent={() => setDrawSamples(resamplePeriodic(a.refWave, 4096))}
                />
              </Card>
            )}
            {signalId === 'mic' && !micSamples && (
              <div className="card">
                <p className="hint">
                  {t('noteMic')}{' '}
                  <button className="tiny" onClick={() => setTab('mic')}>
                    {t('open')}
                  </button>
                </p>
              </div>
            )}

            <div className="metrics">
              <Metric label={t('mN')} tip={t('tipMN')} value={String(Math.min(N, a.K))} />
              <Metric label={t('mCaptured')} tip={t('tipCaptured')} value={fmtPct(a.captured)} />
              <Metric label={t('mRelRms')} tip={t('tipRelRms')} value={fmtPct(a.relRms)} />
              <Metric label={t('mMaxErr')} tip={t('tipMaxErr')} value={a.maxErr.toPrecision(3)} />
              <Metric label={t('mOvershoot')} tip={t('tipOvershoot')} value={fmtPct(a.overshoot)} />
              <Metric label={t('mAudible')} tip={t('tipAudible')} value={'k ≤ ' + audibleK} />
            </div>

            <Card title={t('plotTime')} info={t('tipTime')} right={<Check label={t('showComponents')} checked={showComponents} onChange={setShowComponents} />}>
              <Plot spec={timeSpec} height={340} />
            </Card>

            <Card title={t('plotError')} info={t('tipError')}>
              <Plot spec={errSpec} height={180} />
            </Card>

            <Card
              title={t('plotSpectrum')}
              info={t('tipSpectrum')}
              right={
                <div className="row wrap">
                  <Seg value={specScale} options={[['lin', t('scaleLin')], ['db', t('scaleDb')]]} onChange={setSpecScale} />
                  <Seg value={specSides} options={[['one', t('oneSided')], ['two', t('twoSided')]]} onChange={setSpecSides} />
                  <Seg value={specAxis} options={[['k', t('axisK')], ['hz', t('axisHz')]]} onChange={setSpecAxis} />
                  <Check label={t('showPhase')} checked={showPhase} onChange={setShowPhase} />
                </div>
              }
            >
              <div className="badges">
                <span className="badge">
                  {t('dcValue')} = {Math.abs(a.ref.re[0]) < 1e-12 ? '0' : a.ref.re[0].toPrecision(3)}
                </span>
                {a.symmetry.even && <span className="badge">{t('symEven')}</span>}
                {a.symmetry.odd && <span className="badge">{t('symOdd')}</span>}
                {a.symmetry.halfWave && <span className="badge">{t('symHalf')}</span>}
              </div>
              <Plot spec={ampSpec} height={260} />
              {showPhase && <Plot spec={phaseSpec} height={160} />}
            </Card>


            <section className="card">
              <div className="tabs">
                {tabs.map(([id, key]) => (
                  <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                    {t(key)}
                  </button>
                ))}
                <span className="tab-tip">
                  <InfoTip text={t(tabTips[tab])} />
                </span>
              </div>
              <div className="tab-body">
                {tab === 'harmonics' && (
                  <HarmonicsTable a={a} N={N} f0={f0} mask={mask} onToggle={toggleMask} onPreset={applyPreset} />
                )}
                {tab === 'epicycles' && <Epicycles a={a} />}
                {tab === 'convergence' && <ConvergencePanel a={a} N={N} />}
                {tab === 'lti' && <LtiPanel lti={lti} setLti={setLti} f0={f0} a={a} />}
                {tab === 'mic' && <MicPanel onCapture={onCapture} />}
                {tab === 'theory' && <Theory />}
              </div>
            </section>
          </main>
        </div>
      </div>
    </LangContext.Provider>
  );
}

function Metric({ label, value, tip }: { label: string; value: string; tip: string }) {
  return (
    <div className="metric">
      <span className="mlabel">
        {label}
        <InfoTip text={tip} />
      </span>
      <span className="mval">{value}</span>
    </div>
  );
}

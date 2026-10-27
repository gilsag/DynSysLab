import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { GLYPHS, initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { fmt, tex } from '@shared/format';
import { Plot, type PlotSpec, type Series } from '@shared/Plot';
import { Card, Check, Rich, Seg, Slider, Tex } from '@shared/ui';
import { translate, type Lang, type TKey } from './i18n';
import { PolePlane } from './components/PolePlane';
import { envelope, formulas, freq, freqSpecs, horizon, impulse, measured, poles, rlc, rlcFor, step } from './math/second';

type Mode = 'canon' | 'rlc';
type Tab = 'time' | 'freq';
type Resp = 'step' | 'impulse';
const FAMILY = [0, 0.1, 0.2, 0.4, 0.7, 1, 2];
const QUICK = [0, 0.2, 0.5, 0.707, 1, 2];
const N = 700;

/** Slider on a logarithmic scale. */
function LogSlider({ label, value, min, max, onChange, display }: { label: React.ReactNode; value: number; min: number; max: number; onChange: (v: number) => void; display: string }) {
  return (
    <Slider label={label} value={Math.log10(value)} min={Math.log10(min)} max={Math.log10(max)} step={0.005} onChange={(v) => onChange(+(10 ** v).toPrecision(3))} display={display} />
  );
}

function RlcSvg() {
  const zig = (x: number, y: number) => {
    let d = `M ${x} ${y}`;
    for (let k = 0; k < 6; k++) d += ` L ${x + 7 * (k + 0.5)} ${y + (k % 2 ? 5 : -5)}`;
    return d + ` L ${x + 42} ${y}`;
  };
  return (
    <svg viewBox="0 0 250 104" className="rlc-svg" role="img">
      <circle cx={24} cy={56} r={13} className="el" />
      <text x={24} y={53} textAnchor="middle" className="pm">+</text>
      <text x={24} y={66} textAnchor="middle" className="pm">−</text>
      <text x={42} y={60} className="cl it">u</text>
      <path d="M 24 43 L 24 18 L 60 18" className="w" />
      <path d={zig(60, 18)} className="el" />
      <text x={81} y={9} textAnchor="middle" className="cl it">R</text>
      <path d="M 102 18 L 116 18" className="w" />
      <path d={`M 116 18 ${[0, 1, 2, 3].map(() => 'a 6 6 0 0 1 12 0').join(' ')} L 172 18`} className="el" />
      <text x={140} y={9} textAnchor="middle" className="cl it">L</text>
      <path d="M 172 18 L 200 18 L 200 51 M 186 51 L 214 51 M 186 61 L 214 61 M 200 61 L 200 94 L 24 94 L 24 69" className="w" />
      <text x={220} y={60} className="cl it">C</text>
      <text x={184} y={46} textAnchor="end" className="cl outv">+</text>
      <text x={182} y={62} textAnchor="end" className="cl outv"><tspan className="it">y</tspan> = <tspan className="it">v</tspan><tspan dy="3" fontSize="8" className="it">C</tspan></text>
    </svg>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);

  const [mode, setMode] = useState<Mode>('canon');
  const [z, setZ] = useState(0.3);
  const [wn, setWn] = useState(2);
  const [C, setC] = useState(0.25);
  const [tab, setTab] = useState<Tab>('time');
  const [resp, setResp] = useState<Resp>('step');
  const [frozen, setFrozen] = useState<{ z: number; wn: number } | null>(null);
  const [family, setFamily] = useState(false);
  const [env, setEnv] = useState(true);
  const [marks, setMarks] = useState(true);
  const [asym, setAsym] = useState(true);
  const [band, setBand] = useState<'2' | '5'>('2');
  const [rise, setRise] = useState<'0-100' | '10-90'>('0-100');
  const bandV = band === '2' ? 0.02 : 0.05;

  const { R, L } = rlcFor(z, wn, C);
  const setRlc = (r: number, l: number, c: number) => {
    const q = rlc(r, l, c);
    setZ(+q.z.toPrecision(4));
    setWn(+q.wn.toPrecision(4));
  };
  const p = poles(z, wn);
  const wd = p.kind === 'under' || p.kind === 'undamped' ? p.p1[1] : NaN;
  const T = useMemo(() => Math.max(horizon(z, wn), frozen ? horizon(frozen.z, frozen.wn) : 0), [z, wn, frozen]);
  const ts = useMemo(() => Array.from({ length: N + 1 }, (_, k) => (T * k) / N), [T]);
  const f = formulas(z, wn, bandV, rise);
  const m = useMemo(() => measured(z, wn, bandV, rise, Math.max(2 * T, 1.5 * (Number.isFinite(f.ts) ? f.ts : 0)), 12000), [z, wn, bandV, rise, T, f.ts]);
  const fs = freqSpecs(z, wn);

  // ---------- time plot
  const timeSpec: PlotSpec = useMemo(() => {
    const g = resp === 'step' ? step : impulse;
    const series: Series[] = [];
    if (family)
      FAMILY.forEach((zz) => series.push({ x: ts, y: ts.map((x) => g(zz, wn, x)), color: '--c-muted', width: 1, alpha: 0.55 }));
    if (frozen) series.push({ x: ts, y: ts.map((x) => g(frozen.z, frozen.wn, x)), color: '--c-approx', width: 1.8, dash: [6, 4], label: t('frozen') });
    const y = ts.map((x) => g(z, wn, x));
    if (resp === 'step' && env && z > 0 && z < 1) {
      series.push({ x: ts, y: ts.map((x) => 1 + envelope(z, wn, x)), color: '--c-comp', width: 1, dash: [3, 3], label: t('showEnv') });
      series.push({ x: ts, y: ts.map((x) => 1 - envelope(z, wn, x)), color: '--c-comp', width: 1, dash: [3, 3] });
    }
    series.push({ x: ts, y, color: '--s1', width: 2.4, label: resp === 'step' ? 'y(t)' : 'h(t)' });
    const vLines: PlotSpec['vLines'] = [];
    const hLines: PlotSpec['hLines'] = [{ v: resp === 'step' ? 1 : 0, color: '--axis' }];
    if (resp === 'step' && marks) {
      hLines.push({ v: 1 + bandV, color: '--c-muted', dash: [2, 3] }, { v: 1 - bandV, color: '--c-muted', dash: [2, 3] });
      if (Number.isFinite(m.tp) && m.tp <= T) {
        series.push({ x: [m.tp], y: [1 + m.Mp], color: '--c-error', kind: 'points', width: 5 });
        vLines.push({ v: m.tp, color: '--c-error', dash: [4, 3], label: 'tp' });
      }
      if (Number.isFinite(m.tr) && m.tr <= T) vLines.push({ v: rise === '0-100' ? m.tr : m.tr, color: '--s3', dash: [4, 3], label: 'tr' });
      if (Number.isFinite(m.ts) && m.ts <= T) vLines.push({ v: m.ts, color: '--s4', dash: [4, 3], label: 'ts' });
    }
    const all = series.flatMap((s) => Array.from(s.y));
    let lo = Math.min(0, ...all), hi = Math.max(resp === 'step' ? 1.1 : 0.1, ...all);
    if (!Number.isFinite(hi) || hi > 1e3) hi = 3;
    if (!Number.isFinite(lo) || lo < -1e3) lo = -3;
    const pad = 0.06 * (hi - lo);
    return { series, xRange: [0, T], yRange: [lo - pad, hi + pad], xLabel: 't [s]', legend: true, vLines, hLines };
  }, [resp, family, frozen, z, wn, ts, T, env, marks, bandV, m, rise, lang]);

  // ---------- Bode
  const ws = useMemo(() => {
    const a = Math.log10(wn) - 2, b = Math.log10(wn) + 2;
    return Array.from({ length: 600 }, (_, k) => 10 ** (a + ((b - a) * k) / 599));
  }, [wn]);
  const bode = useMemo(() => {
    const db = (v: number) => 20 * Math.log10(v);
    const magS: Series[] = [], phS: Series[] = [];
    if (family)
      FAMILY.forEach((zz) => {
        magS.push({ x: ws, y: ws.map((w) => db(freq(Math.max(zz, 0.004), wn, w).mag)), color: '--c-muted', width: 1, alpha: 0.55 });
        phS.push({ x: ws, y: ws.map((w) => freq(zz, wn, w).ph), color: '--c-muted', width: 1, alpha: 0.55 });
      });
    if (frozen) {
      magS.push({ x: ws, y: ws.map((w) => db(freq(Math.max(frozen.z, 0.004), frozen.wn, w).mag)), color: '--c-approx', width: 1.8, dash: [6, 4], label: t('frozen') });
      phS.push({ x: ws, y: ws.map((w) => freq(frozen.z, frozen.wn, w).ph), color: '--c-approx', width: 1.8, dash: [6, 4] });
    }
    if (asym) {
      magS.push({ x: [ws[0], wn, ws[ws.length - 1]], y: [0, 0, -40 * Math.log10(ws[ws.length - 1] / wn)], color: '--c-comp', width: 1.2, dash: [5, 4], label: t('showAsym') });
      phS.push({ x: [ws[0], wn, wn, ws[ws.length - 1]], y: [0, 0, -180, -180], color: '--c-comp', width: 1.2, dash: [5, 4] });
    }
    magS.push({ x: ws, y: ws.map((w) => db(freq(Math.max(z, 0.004), wn, w).mag)), color: '--s1', width: 2.4, label: '|H(jω)|' });
    phS.push({ x: ws, y: ws.map((w) => freq(z, wn, w).ph), color: '--s1', width: 2.4, label: '∠H(jω)' });
    const mags = magS.flatMap((s) => Array.from(s.y)).filter(Number.isFinite);
    const top = Math.min(40, Math.max(6, ...mags) + 4);
    const vl: PlotSpec['vLines'] = [{ v: wn, color: '--c-muted', dash: [3, 3], label: 'ωₙ' }];
    if (Number.isFinite(fs.wr)) vl.push({ v: fs.wr, color: '--c-error', dash: [4, 3], label: 'ωr' });
    vl.push({ v: fs.wb, color: '--s4', dash: [4, 3], label: 'ωb' });
    const mag: PlotSpec = { series: magS, xRange: [ws[0], ws[ws.length - 1]], yRange: [-80, top], xLog: true, xLabel: 'ω [rad/s]', yLabel: t('mag'), legend: true, vLines: vl, hLines: [{ v: 0, color: '--axis' }, { v: -3, color: '--c-muted', dash: [2, 3] }] };
    const ph: PlotSpec = { series: phS, xRange: [ws[0], ws[ws.length - 1]], yRange: [-190, 10], xLog: true, xLabel: 'ω [rad/s]', yLabel: t('phase'), legend: false, vLines: [{ v: wn, color: '--c-muted', dash: [3, 3] }], hLines: [{ v: -90, color: '--c-muted', dash: [2, 3] }] };
    return { mag, ph };
  }, [ws, family, frozen, asym, z, wn, fs, lang]);

  // ---------- texts
  const num = (v: number, sig = 4) => tex(v, lang, sig);
  const val = (v: number, unit = ' s', sig = 3) => (Number.isNaN(v) ? '—' : !Number.isFinite(v) ? t('never') : `${fmt(v, lang, sig)}${unit}`);
  const pct = (v: number) => `${fmt(100 * v, lang, 3)} %`;
  const poleTex = (() => {
    if (p.kind === 'under' || p.kind === 'undamped') return `s_{1,2} = ${p.kind === 'undamped' ? '' : num(p.p1[0])} \\pm j\\,${num(p.p1[1])}`;
    if (p.kind === 'critical') return `s_{1} = s_{2} = ${num(p.p1[0])}`;
    return `s_1 = ${num(p.p1[0])},\\quad s_2 = ${num(p.p2[0])}`;
  })();
  const under = p.kind === 'under' || p.kind === 'undamped';

  const onPoles = (zz: number, ww: number) => {
    setZ(zz);
    setWn(ww);
  };

  return (
    <div className="lab-app solab">
      <LabHeader logo={logoUrl} glyph={GLYPHS['second-order']} lab="second-order" subtitle={t('subtitle')} lang={lang} onLang={setLang} />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Card title={t('secParams')} info={t('tipParams')}>
            <Seg<Mode> value={mode} onChange={setMode} options={[['canon', t('modeCanon')], ['rlc', t('modeRlc')]]} />
            {mode === 'canon' ? (
              <>
                <Slider label={t('zeta')} value={z} min={0} max={3} step={0.005} onChange={(v) => setZ(+v.toFixed(3))} display={`ζ = ${fmt(z, lang, 3)}`} />
                <div className="row wrap quick">
                  {QUICK.map((q) => (
                    <button key={q} type="button" className={'tiny' + (Math.abs(z - q) < 1e-3 ? ' on' : '')} onClick={() => setZ(q)}>
                      {fmt(q, lang, 3)}
                    </button>
                  ))}
                </div>
                <LogSlider label={t('wn')} value={wn} min={0.1} max={50} onChange={setWn} display={`${fmt(wn, lang, 3)} rad/s`} />
              </>
            ) : (
              <>
                <RlcSvg />
                <Slider label={<Tex tex="R" />} value={R} min={0} max={Math.max(20, R)} step={0.05} onChange={(v) => setRlc(v, L, C)} display={`${fmt(R, lang, 3)} Ω`} />
                <LogSlider label={<Tex tex="L" />} value={L} min={0.001} max={100} onChange={(v) => setRlc(R, v, C)} display={`${fmt(L, lang, 3)} H`} />
                <LogSlider label={<Tex tex="C" />} value={C} min={0.0001} max={10} onChange={(v) => { setC(v); setRlc(R, L, v); }} display={`${fmt(C, lang, 3)} F`} />
                <p className="hint">
                  <Rich text={t('rlcNote')} />
                </p>
                <p className="derived">
                  <Tex tex={`\\zeta = ${num(z, 3)},\\quad \\omega_n = ${num(wn, 3)}\\ \\mathrm{rad/s}`} />
                </p>
              </>
            )}
            <p className={'kind kind-' + p.kind}>{t(`kind_${p.kind}` as TKey)}</p>
          </Card>
          <Card title={t('secCompare')} info={t('tipCompare')}>
            <div className="row wrap">
              <button type="button" onClick={() => setFrozen({ z, wn })}>{t('freeze')}</button>
              {frozen && <button type="button" onClick={() => setFrozen(null)}>{t('unfreeze')}</button>}
            </div>
            <Check label={t('family')} checked={family} onChange={setFamily} />
          </Card>
          <Card title={t('secCriteria')} info={t('tipCriteria')}>
            <div className="field-row">
              <span>{t('riseDef')}</span>
              <Seg value={rise} onChange={setRise} options={[['0-100', '0–100 %'], ['10-90', '10–90 %']]} />
            </div>
            <div className="field-row">
              <span>{t('bandDef')}</span>
              <Seg value={band} onChange={setBand} options={[['2', '2 %'], ['5', '5 %']]} />
            </div>
          </Card>
        </aside>
        <main className="lab-main">
          <p className="callout">
            <Rich text={t('idea')} />
          </p>
          <div className="two-col stack-narrow so-top">
            <Card title={t('plane')} info={t('tipPlane')}>
              <PolePlane z={z} wn={wn} frozen={frozen} lang={lang} onChange={onPoles} />
            </Card>
            <Card title={t('sysCard')}>
              <Tex block tex={`H(s) = \\frac{\\omega_n^2}{s^2 + 2\\zeta\\omega_n s + \\omega_n^2} = \\frac{${num(wn * wn)}}{s^2 + ${num(2 * z * wn)}\\,s + ${num(wn * wn)}}`} />
              <Tex block tex={poleTex} />
              <table className="so-table">
                <tbody>
                  <tr><td><Tex tex={z <= 1 ? '\\zeta = \\cos\\theta' : '\\zeta = \\tfrac{|s_1| + |s_2|}{2\\sqrt{s_1 s_2}}'} /></td><td>{fmt(z, lang, 3)}</td><td><Tex tex={z <= 1 ? '\\omega_n = |s_{1,2}|' : '\\omega_n = \\sqrt{s_1 s_2}'} /></td><td>{fmt(wn, lang, 3)} rad/s</td></tr>
                  <tr><td><Tex tex="\sigma = \zeta\omega_n" /></td><td>{fmt(z * wn, lang, 3)} 1/s</td><td><Tex tex="\omega_d = \omega_n\sqrt{1-\zeta^2}" /></td><td>{under ? `${fmt(wd, lang, 3)} rad/s` : '—'}</td></tr>
                  <tr><td><Tex tex="\theta" /></td><td>{z <= 1 ? `${fmt((Math.acos(Math.min(1, z)) * 180) / Math.PI, lang, 3)}°` : '—'}</td><td><Tex tex={z <= 1 ? '\\tau = 1/\\sigma' : '\\tau = 1/|s_1|'} /></td><td>{z > 1 ? `${fmt(1 / (wn * (z - Math.sqrt(z * z - 1))), lang, 3)} s` : z > 0 ? `${fmt(1 / (z * wn), lang, 3)} s` : '—'}</td></tr>
                </tbody>
              </table>
            </Card>
          </div>
          <nav className="tabs main-tabs">
            <button type="button" className={tab === 'time' ? 'on' : ''} onClick={() => setTab('time')}>{t('tabTime')}</button>
            <button type="button" className={tab === 'freq' ? 'on' : ''} onClick={() => setTab('freq')}>{t('tabFreq')}</button>
          </nav>
          {tab === 'time' ? (
            <>
              <Card
                title={t('timeTitle')}
                info={t('tipTime')}
                right={<Seg value={resp} onChange={setResp} options={[['step', t('stepResp')], ['impulse', t('impResp')]]} />}
              >
                {resp === 'step' && (
                  <div className="row wrap">
                    <Check label={t('showEnv')} checked={env} onChange={setEnv} />
                    <Check label={t('showMarks')} checked={marks} onChange={setMarks} />
                  </div>
                )}
                <Plot spec={timeSpec} height={300} />
              </Card>
              <Card title={t('specsTitle')} info={t('tipSpecs')}>
                <table className="so-specs">
                  <thead>
                    <tr><th>{t('colSpec')}</th><th>{t('colMeas')}</th><th>{t('colForm')}</th><th /></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t('Mp')} <Tex tex="M_p" /></td>
                      <td>{pct(m.Mp)}</td>
                      <td>{pct(f.Mp)}</td>
                      <td><Tex tex="e^{-\pi\zeta/\sqrt{1-\zeta^2}}" /></td>
                    </tr>
                    <tr>
                      <td>{t('tp')} <Tex tex="t_p" /></td>
                      <td>{val(m.tp)}</td>
                      <td>{val(f.tp)}</td>
                      <td><Tex tex="\pi/\omega_d" /></td>
                    </tr>
                    <tr>
                      <td>{t('tr')} <Tex tex="t_r" /> ({rise === '0-100' ? '0–100 %' : '10–90 %'})</td>
                      <td>{val(m.tr)}</td>
                      <td>{val(f.tr)}{rise === '10-90' && !Number.isNaN(f.tr) ? ` (${t('approx')})` : ''}</td>
                      <td><Tex tex={rise === '0-100' ? '(\\pi-\\theta)/\\omega_d' : '\\tfrac{1+1{,}04\\zeta-0{,}42\\zeta^2+1{,}76\\zeta^3}{\\omega_n}'} /></td>
                    </tr>
                    <tr>
                      <td>{t('ts')} <Tex tex="t_s" /> ({band} %)</td>
                      <td>{val(m.ts)}</td>
                      <td>{val(f.ts)}</td>
                      <td><Tex tex={`${band === '2' ? '\\approx 4' : '\\approx 3'}/(\\zeta\\omega_n)`} /></td>
                    </tr>
                  </tbody>
                </table>
                {p.kind === 'undamped' && <p className="hint warn">{t('undampedNote')}</p>}
                {(p.kind === 'critical' || p.kind === 'over') && <p className="hint">{t('noOvershoot')}</p>}
                {p.kind === 'under' && <p className="hint">{t('tsNote')}</p>}
              </Card>
            </>
          ) : (
            <>
              <Card title={t('bodeTitle')} info={t('tipBode')} right={<Check label={t('showAsym')} checked={asym} onChange={setAsym} />}>
                <Plot spec={bode.mag} height={250} />
                <Plot spec={bode.ph} height={190} />
              </Card>
              <Card title={t('freqSpecs')}>
                <table className="so-specs">
                  <tbody>
                    <tr>
                      <td>{t('Mr')} <Tex tex="M_r" /></td>
                      <td>{fs.Mr === 1 ? t('infinite') : !Number.isFinite(fs.Mr) ? '∞' : `${fmt(fs.Mr, lang, 4)} (${fmt(20 * Math.log10(fs.Mr), lang, 3)} dB)`}</td>
                      <td><Tex tex="\dfrac{1}{2\zeta\sqrt{1-\zeta^2}}" /></td>
                    </tr>
                    <tr>
                      <td>{t('wr')} <Tex tex="\omega_r" /></td>
                      <td>{Number.isFinite(fs.wr) ? `${fmt(fs.wr, lang, 4)} rad/s` : t('infinite')}</td>
                      <td><Tex tex="\omega_n\sqrt{1-2\zeta^2}" /></td>
                    </tr>
                    <tr>
                      <td>{t('wb')} <Tex tex="\omega_b" /></td>
                      <td>{fmt(fs.wb, lang, 4)} rad/s</td>
                      <td><Tex tex="\omega_n\sqrt{1-2\zeta^2+\sqrt{(1-2\zeta^2)^2+1}}" /></td>
                    </tr>
                    <tr>
                      <td>{t('phWn')}</td>
                      <td>{z > 1e-9 ? '−90°' : t('phUndef')}</td>
                      <td><Tex tex="\angle H(j\omega_n) = -\tfrac{\pi}{2}\ \ (\zeta > 0)" /></td>
                    </tr>
                  </tbody>
                </table>
                <p className="hint">{fs.Mr === 1 ? t('noRes') : t('resNote')}</p>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

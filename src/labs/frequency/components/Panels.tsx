import { useMemo, useState } from 'react';
import type { SystemDef } from '../math/types';
import type { Factor } from '../math/tf';
import { counts, evalAt, isProper, nyquistPoints, encirclements, RAD2DEG } from '../math/tf';
import { autoHorizon, simulate, simulateSine } from '../math/sim';
import LinePlot, { type Series } from './LinePlot';
import { factorLabel } from './TFDisplay';
import { FACTOR_COLORS } from './BodePlot';
import { fmt, pick, tr, type Lang } from '../i18n';

const isStable = (sys: SystemDef) => sys.roots.every((r) => r.kind === 'zero' || r.re < 0);

/* ------------------------------------------------------------------ time response */

export function TimePanel({ sys, overlay, lang }: { sys: SystemDef; overlay: SystemDef | null; lang: Lang }) {
  const t = tr(lang);
  const [input, setInput] = useState<'step' | 'impulse'>('step');
  const [hz, setHz] = useState(0); // log2 horizon factor
  const proper = isProper(sys);
  const tEnd = autoHorizon(sys) * Math.pow(2, hz);
  const res = useMemo(() => (proper ? simulate(sys, input, tEnd, 1500) : null), [sys, input, tEnd, proper]);
  const ores = useMemo(
    () => (overlay && isProper(overlay) ? simulate(overlay, input, tEnd, 1500) : null),
    [overlay, input, tEnd],
  );
  if (!proper) return <p className="note warn">{t('improper')}</p>;

  const series: Series[] = [];
  if (ores?.ok) series.push({ x: ores.t, y: ores.y, cls: 'overlay' });
  if (res?.ok) series.push({ x: res.t, y: res.y, cls: 'main' });

  // metrics
  const stable = isStable(sys);
  const c = counts(sys);
  let metrics: { k: string; v: string }[] = [];
  let finalV: number | null = null;
  if (input === 'step' && res?.ok) {
    if (!stable) metrics = [{ k: t('finalValue'), v: t('unstable') }];
    else {
      const fv = c.z0 > 0 ? 0 : evalDc(sys);
      finalV = fv;
      const y = res.y;
      const tt = res.t;
      const peak = fv >= 0 ? Math.max(...y) : Math.min(...y);
      const os = fv !== 0 ? Math.max(0, ((peak - fv) / fv) * 100) : NaN;
      const cross = (lvl: number) => {
        for (let i = 1; i < y.length; i++) if ((y[i] - lvl * fv) * Math.sign(fv) >= 0) return tt[i];
        return NaN;
      };
      const tr10 = cross(0.1);
      const tr90 = cross(0.9);
      let ts = NaN;
      if (fv !== 0) {
        ts = 0;
        for (let i = y.length - 1; i >= 0; i--)
          if (Math.abs(y[i] - fv) > 0.02 * Math.abs(fv)) {
            ts = tt[Math.min(i + 1, tt.length - 1)];
            break;
          }
      }
      metrics = [
        { k: t('finalValue'), v: fmt(fv, lang) },
        { k: t('overshoot'), v: isFinite(os) ? `${fmt(os, lang)} %` : '—' },
        { k: t('riseTime'), v: isFinite(tr90 - tr10) ? `${fmt(tr90 - tr10, lang)} s` : '—' },
        { k: t('settling'), v: isFinite(ts) ? `${fmt(ts, lang)} s` : '—' },
      ];
    }
  }

  return (
    <div>
      <div className="row gap wrap">
        <div className="seg">
          <button className={input === 'step' ? 'on' : ''} onClick={() => setInput('step')}>
            {t('step')}
          </button>
          <button className={input === 'impulse' ? 'on' : ''} onClick={() => setInput('impulse')}>
            {t('impulse')}
          </button>
        </div>
        <label className="row gap small">
          {t('horizon')}
          <input type="range" min={-4} max={4} step={0.25} value={hz} onChange={(e) => setHz(+e.target.value)} />
          <span className="mono">{fmt(tEnd, lang)} s</span>
        </label>
      </div>
      <LinePlot series={series} xLabel={t('time')} yLabel="y(t)" lang={lang} height={280} xlim={[0, tEnd]}>
        {(sx, sy) =>
          finalV !== null && (
            <line x1={sx(0)} x2={sx(tEnd)} y1={sy(finalV)} y2={sy(finalV)} className="refline" />
          )
        }
      </LinePlot>
      {metrics.length > 0 && (
        <div className="metrics">
          {metrics.map((m) => (
            <div key={m.k}>
              <span>{m.k}</span>
              <b className="mono">{m.v}</b>
            </div>
          ))}
        </div>
      )}
      {input === 'impulse' && c.np === c.nz && (
        <p className="note small">
          {t('biproperImpulse')}
        </p>
      )}
    </div>
  );
}

function evalDc(sys: SystemDef) {
  // DC gain = K_B when there are no roots at the origin
  const g = (sys.gainNeg ? -1 : 1) * Math.pow(10, sys.gainDb / 20);
  if (sys.gainMode === 'bode') return g;
  let num = g;
  for (const r of sys.roots) {
    const v = r.im > 0 ? r.re * r.re + r.im * r.im : -r.re;
    if (r.kind === 'zero') num *= v;
    else num /= v;
  }
  return num;
}

/* ------------------------------------------------------------------ sinusoid */

export function SinePanel(props: {
  sys: SystemDef;
  factors: Factor[];
  w: number;
  setW: (w: number) => void;
  range: [number, number];
  lang: Lang;
  freqUnit: (w: number) => string;
}) {
  const { sys, factors, w, setW, range, lang } = props;
  const t = tr(lang);
  const proper = isProper(sys);
  const originPoles = sys.roots.filter((r) => r.kind === 'pole' && r.re === 0 && r.im === 0).length;
  const marginal =
    originPoles === 1 && sys.roots.every((r) => r.kind === 'zero' || r.re < 0 || (r.re === 0 && r.im === 0));
  const stable = isStable(sys) || marginal;
  const period = (2 * Math.PI) / w;
  const settle = autoHorizon(sys);
  let tEnd = Math.max(6 * period, settle + 4 * period);
  const perPeriod = 40;
  let N = Math.ceil((tEnd / period) * perPeriod);
  let tStart = 0;
  let windowed = false;
  if (N > 6000) {
    // too many periods to draw: show the transient start and the steady-state window separately
    windowed = true;
    tStart = Math.max(0, tEnd - 8 * period);
    N = 8 * perPeriod;
  }
  const res = useMemo(
    () => (proper ? simulateSine(sys, w, tEnd, N, tStart) : null),
    [sys, w, tEnd, N, tStart, proper],
  );
  const at = evalAt(factors, w);
  const amp = Math.pow(10, at.mag / 20);
  if (!proper) return <p className="note warn">{t('improper')}</p>;
  const lw = Math.log10(w);

  const series: Series[] = res?.ok
    ? [
        { x: res.t, y: res.t.map((x) => Math.sin(w * x)), cls: 'input' },
        ...(stable ? [{ x: res.t, y: res.yss, cls: 'steady' }] : []),
        { x: res.t, y: res.y, cls: 'main' },
      ]
    : [];
  let ylim: [number, number] | undefined;
  if (!stable && res?.ok) {
    const m = Math.max(1, ...res.y.slice(0, Math.floor(res.y.length / 2)).map(Math.abs).filter(isFinite));
    ylim = [-m * 1.5, m * 1.5];
  }
  const phase = at.ph;

  return (
    <div>
      <div className="row gap wrap">
        <label className="row gap grow">
          {t('sineFreq')}
          <input
            className="grow"
            type="range"
            min={range[0]}
            max={range[1]}
            step={0.01}
            value={lw}
            onChange={(e) => setW(Math.pow(10, +e.target.value))}
          />
          <span className="mono">{props.freqUnit(w)}</span>
        </label>
      </div>
      <div className="legend small">
        <span className="lg input">{t('input')}</span>
        <span className="lg main">{t('output')}</span>
        {stable && <span className="lg steady">{t('steady')}</span>}
      </div>
      <LinePlot
        series={series}
        xLabel={t('time')}
        yLabel=""
        lang={lang}
        height={260}
        xlim={res?.ok ? [res.t[0], res.t[res.t.length - 1]] : undefined}
        ylim={ylim}
      />
      <div className="metrics">
        <div>
          <span>{t('ampRatio')} |H(jω)|</span>
          <b className="mono">
            {fmt(amp, lang)} ({fmt(at.mag, lang)} dB)
          </b>
        </div>
        <div>
          <span>{t('phaseShift')} ∠H(jω)</span>
          <b className="mono">{fmt(phase, lang)}°</b>
        </div>
        <div>
          <span>{t('timeShift')} −∠H/ω</span>
          <b className="mono">{fmt(-(phase / RAD2DEG) / w, lang)} s</b>
        </div>
      </div>
      <p className="note small">
        {stable ? t('sineExplain') : t('sineUnstable')}
        {marginal && ` ${t('marginalNote')}`}
      </p>
      {windowed && (
        <p className="note small">
          {pick(lang, {
            es: `Se muestran los últimos 8 periodos (t ≥ ${fmt(tStart, lang)} s): el transitorio dura mucho más que un periodo.`,
            en: `Showing the last 8 periods (t ≥ ${fmt(tStart, lang)} s): the transient lasts far longer than one period.`,
            pt: `Mostrando os últimos 8 períodos (t ≥ ${fmt(tStart, lang)} s): o transitório dura muito mais que um período.`,
            fr: `Affichage des 8 dernières périodes (t ≥ ${fmt(tStart, lang)} s) : le transitoire dure bien plus qu’une période.`,
            it: `Sono mostrati gli ultimi 8 periodi (t ≥ ${fmt(tStart, lang)} s): il transitorio dura molto più di un periodo.`,
            de: `Gezeigt werden die letzten 8 Perioden (t ≥ ${fmt(tStart, lang)} s): Der Einschwingvorgang dauert viel länger als eine Periode.`,
          })}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Nyquist */

export function NyquistPanel(props: {
  sys: SystemDef;
  factors: Factor[];
  overlayFactors: Factor[] | null;
  range: [number, number];
  wStar: number | null;
  lang: Lang;
}) {
  const { sys, factors, range, wStar, lang } = props;
  const t = tr(lang);
  const [compress, setCompress] = useState(true);
  const [mirror, setMirror] = useState(true);
  const map = (re: number, im: number) => {
    if (!compress) return { re, im };
    const r = Math.hypot(re, im);
    if (r === 0) return { re, im };
    const rr = Math.log10(1 + r) / Math.log10(2);
    return { re: (re / r) * rr, im: (im / r) * rr };
  };
  const pts = useMemo(() => nyquistPoints(factors, range[0] - 2, range[1] + 2, 1600), [factors, range]);
  const opts = useMemo(
    () => (props.overlayFactors ? nyquistPoints(props.overlayFactors, range[0] - 2, range[1] + 2, 1600) : null),
    [props.overlayFactors, range],
  );
  const mp = pts.map((p) => map(p.re, p.im));
  const series: Series[] = [];
  if (opts) {
    const mo = opts.map((p) => map(p.re, p.im));
    series.push({ x: mo.map((p) => p.re), y: mo.map((p) => p.im), cls: 'overlay' });
  }
  if (mirror) series.push({ x: mp.map((p) => p.re), y: mp.map((p) => -p.im), cls: 'mirror' });
  series.push({ x: mp.map((p) => p.re), y: mp.map((p) => p.im), cls: 'main' });

  // limits
  let lim: [number, number, number, number];
  {
    const rs = mp.map((p) => Math.hypot(p.re, p.im)).filter(isFinite).sort((a, b) => a - b);
    const cap = compress ? Infinity : Math.max(2, (rs[Math.floor(rs.length * 0.85)] ?? 2) * 1.3);
    const keep = mp.filter((p) => isFinite(p.re) && Math.hypot(p.re, p.im) <= cap);
    const xs = [...keep.map((p) => p.re), -1.2, 0.2];
    const ys = [...keep.map((p) => p.im), ...keep.map((p) => -p.im), -0.5, 0.5];
    lim = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const px = (lim[1] - lim[0]) * 0.08;
    const py = (lim[3] - lim[2]) * 0.08;
    lim = [lim[0] - px, lim[1] + px, lim[2] - py, lim[3] + py];
  }
  const N = useMemo(() => encirclements(sys, factors, range[0], range[1]), [sys, factors, range]);
  const P = counts(sys).rhpP;
  const star = wStar !== null ? (() => {
    const e = evalAt(factors, wStar);
    const r = Math.pow(10, e.mag / 20);
    const a = e.ph / RAD2DEG;
    return map(r * Math.cos(a), r * Math.sin(a));
  })() : null;
  // direction arrows
  const arrows = [0.3, 0.5, 0.7].map((f) => {
    const i = Math.floor(f * (mp.length - 2));
    return { a: mp[i], b: mp[i + 1] };
  });

  return (
    <div>
      <div className="row gap wrap small">
        <label className="check">
          <input type="checkbox" checked={compress} onChange={(e) => setCompress(e.target.checked)} />
          {t('logCompress')}
        </label>
        <label className="check">
          <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} />
          {t('negFreq')}
        </label>
      </div>
      <LinePlot
        series={series}
        xLabel="Re H(jω)"
        yLabel="Im H(jω)"
        lang={lang}
        height={360}
        equal
        xlim={[lim[0], lim[1]]}
        ylim={[lim[2], lim[3]]}
      >
        {(sx, sy) => (
          <g>
            <circle
              cx={sx(0)}
              cy={sy(0)}
              r={Math.abs(sx(1) - sx(0))}
              className="unitcircle"
            />
            {arrows.map(({ a, b }, i) => {
              if (!a || !b || !isFinite(a.re) || !isFinite(b.re)) return null;
              const x = sx(a.re);
              const y = sy(a.im);
              const ang = Math.atan2(sy(b.im) - y, sx(b.re) - x) * RAD2DEG;
              return (
                <path key={i} d="M-6,-4L4,0L-6,4Z" transform={`translate(${x} ${y}) rotate(${ang})`} className="arrow" />
              );
            })}
            <path
              d={`M${sx(-1) - 6},${sy(0)}L${sx(-1) + 6},${sy(0)}M${sx(-1)},${sy(0) - 6}L${sx(-1)},${sy(0) + 6}`}
              className="minusone"
            />
            <text x={sx(-1) - 4} y={sy(0) + 16} className="tick" textAnchor="middle">
              −1
            </text>
            {star && <circle cx={sx(star.re)} cy={sy(star.im)} r={4.5} className="wstar" />}
          </g>
        )}
      </LinePlot>
      <div className="metrics">
        <div>
          <span>P ({t('nyqP')})</span>
          <b className="mono">{P}</b>
        </div>
        <div>
          <span>N ({t('nyqN')})</span>
          <b className="mono">{N === null ? '—' : N}</b>
        </div>
        <div>
          <span>Z = N + P</span>
          <b className="mono">{N === null ? '—' : N + P}</b>
        </div>
      </div>
      <p className="note small">
        {t('nyqNote')}
        {N === null && t('nyqIndent')}
        {compress && t('nyqCompress')}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ contributions */

export function ContribPanel(props: {
  sys: SystemDef;
  factors: Factor[];
  w: number;
  lang: Lang;
  freqUnit: (w: number) => string;
}) {
  const { factors, w, lang } = props;
  const t = tr(lang);
  const tot = evalAt(factors, w);
  const geo = (re: number, im: number) => {
    const dx = 0 - re;
    const dy = w - im;
    return { d: Math.hypot(dx, dy), a: Math.atan2(dy, dx) * RAD2DEG };
  };
  return (
    <div>
      <p className="small">
        ω = <b className="mono">{props.freqUnit(w)}</b>
      </p>
      <table className="contrib">
        <thead>
          <tr>
            <th></th>
            <th>{t('factor')}</th>
            <th className="r">dB</th>
            <th className="r">°</th>
            <th className="r">{t('distance')} |jω − r|</th>
            <th className="r">{t('angle')} ∠(jω − r)</th>
          </tr>
        </thead>
        <tbody>
          {factors.map((f, i) => {
            const r = f.root;
            let dist = '';
            let ang = '';
            if (r) {
              const g1 = geo(r.re, r.im);
              if (r.im > 0) {
                const g2 = geo(r.re, -r.im);
                dist = `${fmt(g1.d, lang)} · ${fmt(g2.d, lang)}`;
                ang = `${fmt(g1.a, lang)}° + ${fmt(g2.a, lang)}°`;
              } else {
                dist = fmt(g1.d, lang);
                ang = `${fmt(g1.a, lang)}°`;
              }
            }
            return (
              <tr key={f.key}>
                <td>
                  <span className={`swatch ${FACTOR_COLORS[i % FACTOR_COLORS.length]}`} />
                </td>
                <td>{factorLabel(f, lang)}</td>
                <td className="r mono">{fmt(f.mag(w), lang)}</td>
                <td className="r mono">{fmt(f.ph(w), lang)}</td>
                <td className="r mono muted">{dist}</td>
                <td className="r mono muted">{ang}</td>
              </tr>
            );
          })}
          <tr className="total">
            <td></td>
            <td>{t('total')}</td>
            <td className="r mono">{fmt(tot.mag, lang)}</td>
            <td className="r mono">{fmt(tot.ph, lang)}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <p className="note small">{t('contribExplain')}</p>
      <p className="note small">
        {t('contribNote')}
      </p>
    </div>
  );
}

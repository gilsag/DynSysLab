import { useMemo } from 'react';
import { taylor, type Formula } from '@shared/expr';
import { fmt, tex } from '@shared/format';
import { Plot, type PlotSpec, type Series } from '@shared/Plot';
import { Card, InfoTip, Rich, Tex } from '@shared/ui';
import { useT, type Lang } from '../i18n';
import { estimateRadius, partialSum } from '../math/scalar';

export interface ScalarState {
  formula: Formula;
  a: number;
  view: [number, number];
  N: number;
  family: boolean;
  xEval: number;
  radius?: number; // exact, from the preset
}

/** Robust y-range of f over the view (ignores poles and spikes). */
export function yRangeOf(ys: number[], extra: number[] = []): [number, number] {
  const v = ys.filter(Number.isFinite).sort((p, q) => p - q);
  if (!v.length) return [-1, 1];
  let lo = v[Math.floor(0.02 * (v.length - 1))];
  let hi = v[Math.ceil(0.98 * (v.length - 1))];
  for (const e of extra) if (Number.isFinite(e)) { lo = Math.min(lo, e); hi = Math.max(hi, e); }
  const pad = 0.15 * (hi - lo || Math.abs(hi) || 1);
  return [lo - pad, hi + pad];
}

export function grid(view: [number, number], n = 800): number[] {
  return Array.from({ length: n + 1 }, (_, i) => view[0] + ((view[1] - view[0]) * i) / n);
}

export function TabTaylor({ s, lang }: { s: ScalarState; lang: Lang }) {
  const t = useT();
  const { formula, a, view, N } = s;
  const c = useMemo(() => taylor(formula.node, a, Math.max(N, 12)), [formula, a, N]);
  const analytic = Array.from(c.slice(0, N + 1)).every(Number.isFinite);
  const R = useMemo(() => s.radius ?? estimateRadius(formula.node, a), [s.radius, formula, a]);
  const xs = useMemo(() => grid(view), [view]);
  const fy = useMemo(() => xs.map((x) => formula.f(x)), [xs, formula]);
  const yr = yRangeOf(fy, [c[0]]);

  const spec: PlotSpec = useMemo(() => {
    const series: Series[] = [];
    if (s.family && analytic) {
      for (let n = 0; n < N; n++) {
        series.push({ x: xs, y: xs.map((x) => partialSum(c, a, n, x)), color: '--c-input', width: 1, alpha: 0.35 + (0.4 * n) / Math.max(1, N) });
      }
    }
    series.push({ x: xs, y: fy, color: '--c-signal', width: 2.2, label: 'f(x)' });
    if (analytic) series.push({ x: xs, y: xs.map((x) => partialSum(c, a, N, x)), color: '--c-approx', width: 2, label: `P${toSub(N)}(x)` });
    series.push({ x: [a], y: [c[0]], color: '--c-approx', kind: 'points', width: 4 });
    const vLines = [{ v: a, color: '--axis', dash: [3, 3], label: 'a' }];
    if (Number.isFinite(R)) {
      vLines.push({ v: a - R, color: '--c-error', dash: [6, 4], label: 'a − R' }, { v: a + R, color: '--c-error', dash: [6, 4], label: 'a + R' });
    }
    return { series, xRange: view, yRange: yr, xLabel: 'x', legend: true, vLines };
  }, [s.family, analytic, N, xs, c, a, fy, view, yr, R]);

  const errSpec: PlotSpec = useMemo(() => {
    const e = xs.map((x, i) => Math.max(1e-16, Math.abs(fy[i] - partialSum(c, a, N, x))));
    const fin = e.filter((v) => Number.isFinite(v));
    const hi = Math.max(1e-12, ...fin) * 3;
    const vLines = Number.isFinite(R) ? [{ v: a - R, color: '--c-error', dash: [6, 4] }, { v: a + R, color: '--c-error', dash: [6, 4] }] : [];
    return { series: [{ x: xs, y: e, color: '--c-error', width: 1.6 }], xRange: view, yRange: [1e-16, hi], yLog: true, xLabel: 'x', yLabel: '|f − P_N|', vLines };
  }, [xs, fy, c, a, N, view, R]);

  const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
  const rows = Math.min(Math.max(N, 4), 12);
  const errAt = Math.abs(formula.f(s.xEval) - partialSum(c, a, N, s.xEval));
  const polyTex = useMemo(() => {
    if (!analytic) return '';
    const d = a === 0 ? 'x' : `(x ${a < 0 ? '+' : '-'} ${tex(Math.abs(a), lang)})`;
    const terms: string[] = [];
    for (let n = 0; n <= Math.min(N, 7); n++) {
      const v = c[n];
      if (Math.abs(v) < 1e-14) continue;
      const mag = tex(Math.abs(v), lang);
      const pw = n === 0 ? '' : n === 1 ? d : `${d}^{${n}}`;
      const coef = n > 0 && Math.abs(Math.abs(v) - 1) < 1e-12 ? '' : mag;
      terms.push(`${v < 0 ? '-' : terms.length ? '+' : ''} ${coef}${coef && pw ? '\\,' : ''}${pw}`);
    }
    return `P_{${N}}(x) = ${terms.join(' ') || '0'}${N > 7 ? ' + \\cdots' : ''}`;
  }, [analytic, c, N, a, lang]);

  return (
    <>
      <p className="callout">
        <Rich text={t('ideaTaylor')} />
      </p>
      {!analytic && <p className="callout warn-callout">{t('notAnalytic')}</p>}
      <div className="metrics">
        <Metric label="f(a)" value={fmt(c[0], lang, 6)} />
        <Metric label="f′(a)" value={fmt(c[1], lang, 6)} />
        <Metric label="f″(a)" value={fmt(2 * c[2], lang, 6)} />
        <Metric
          label={t('mRadius')}
          tip={t('tipRadius')}
          value={R === Infinity ? t('allX') : Number.isFinite(R) ? `${s.radius === undefined ? '≈ ' : ''}${fmt(R, lang, 3)}` : '—'}
          note={s.radius === undefined ? (Number.isFinite(R) || R === Infinity ? t('estimated') : t('unknown')) : undefined}
        />
        <Metric label={`${t('mErrAt')} = ${fmt(s.xEval, lang)}`} value={fmt(errAt, lang, 3)} />
      </div>
      {polyTex && (
        <div className="card formula">
          <Tex block tex={polyTex} />
        </div>
      )}
      <Card title={t('plotSeries')} info={t('tipPlotSeries')}>
        <Plot spec={spec} height={360} />
      </Card>
      <div className="two-col">
        <Card title={t('plotError')} info={t('tipPlotError')}>
          <Plot spec={errSpec} height={230} />
        </Card>
        <Card title={t('coefTitle')} info={t('tipCoef')}>
          <div className="table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>n</th>
                  <th>
                    <Tex tex="f^{(n)}(a)" />
                  </th>
                  <th>
                    <Tex tex="c_n = f^{(n)}(a)/n!" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows + 1 }, (_, n) => (
                  <tr key={n} className={n > N ? 'off' : ''}>
                    <td>{n}</td>
                    <td className="mono">{fmt(c[n] * fact(n), lang, 6)}</td>
                    <td className="mono">{fmt(c[n], lang, 6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function toSub(n: number) {
  const s = '₀₁₂₃₄₅₆₇₈₉';
  return String(n).split('').map((d) => s[+d]).join('');
}

export function Metric({ label, value, tip, note }: { label: string; value: string; tip?: string; note?: string }) {
  return (
    <div className="metric">
      <span className="mlabel">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className="mval">{value}</span>
      {note && <span className="mnote">{note}</span>}
    </div>
  );
}

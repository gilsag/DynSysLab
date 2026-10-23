import { useMemo } from 'react';
import { taylor } from '@shared/expr';
import { fmt } from '@shared/format';
import { Plot, type PlotSpec } from '@shared/Plot';
import { Card, Rich } from '@shared/ui';
import { useT, type Lang } from '../i18n';
import { residual, second, validRange } from '../math/scalar';
import { grid, Metric, yRangeOf, type ScalarState } from './TabTaylor';

export interface TolState {
  relative: boolean;
  value: number; // absolute ε, or relative fraction
}

export function TabLinear({ s, tol, lang }: { s: ScalarState; tol: TolState; lang: Lang }) {
  const t = useT();
  const { formula, a, view } = s;
  const c = useMemo(() => taylor(formula.node, a, 2), [formula, a]);
  const res = useMemo(() => residual(formula.node, formula.f, a, view[0], view[1], 1200), [formula, a, view]);
  const range = validRange(res, a, tol.value, tol.relative);
  const xs = useMemo(() => grid(view), [view]);
  const fy = useMemo(() => xs.map((x) => formula.f(x)), [xs, formula]);
  const lin = (x: number) => c[0] + c[1] * (x - a);
  const fpp = 2 * c[2];
  const scale = Math.max(1e-12, ...fy.filter(Number.isFinite).map(Math.abs));
  const inflection = Math.abs(fpp) < 1e-9 * scale;

  const spec: PlotSpec = useMemo(
    () => ({
      series: [
        { x: xs, y: fy, color: '--c-signal', width: 2.2, label: 'f(x)' },
        { x: xs, y: xs.map(lin), color: '--c-approx', width: 1.8, label: t('tangent') },
        { x: [a, s.xEval], y: [c[0], formula.f(s.xEval)], color: '--c-approx', kind: 'points', width: 4 },
      ],
      xRange: view,
      yRange: yRangeOf(fy, [c[0]]),
      xLabel: 'x',
      legend: true,
      vLines: [
        { v: a, color: '--axis', dash: [3, 3], label: 'a' },
        { v: range.lo, color: '--c-comp', dash: [5, 4] },
        { v: range.hi, color: '--c-comp', dash: [5, 4] },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [xs, fy, c, a, s.xEval, view, range.lo, range.hi, lang],
  );

  const resSpec: PlotSpec = useMemo(() => {
    const err = tol.relative ? res.rel : res.r1.map(Math.abs);
    const series = [{ x: res.xs, y: err.map((v) => Math.max(v, 1e-18)), color: '--c-error', width: 1.8, label: tol.relative ? t('relErr') : '|R₁(x)|' }];
    if (!tol.relative) series.push({ x: res.xs, y: res.bound.map((v) => Math.max(v, 1e-18)), color: '--c-approx', width: 1.4, label: t('boundLeg') });
    const fin = err.filter(Number.isFinite);
    const hi = Math.min(Math.max(...fin, tol.value) * 3, 1e6);
    return {
      series,
      xRange: view,
      yRange: [Math.max(1e-12, Math.min(tol.value * 1e-4, hi / 1e8)), hi],
      yLog: true,
      xLabel: 'x',
      legend: true,
      hLines: [{ v: tol.value, color: '--c-comp', dash: [5, 4], label: t('tolLeg') }],
      vLines: [{ v: a, color: '--axis', dash: [3, 3] }],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, tol, view, a, lang]);

  const x = s.xEval;
  const exact = formula.f(x);
  const approx = lin(x);
  const r1 = Math.abs(exact - approx);
  const M = useMemo(() => {
    let m = 0;
    for (let i = 0; i <= 200; i++) {
      const xi = a + ((x - a) * i) / 200;
      const v = Math.abs(second(formula.node, xi));
      if (Number.isFinite(v)) m = Math.max(m, v);
    }
    return m;
  }, [formula, a, x]);
  const bnd = (M / 2) * (x - a) ** 2;
  const show = (v: number) => (tol.relative ? `${fmt(v * 100, lang, 3)} %` : fmt(v, lang, 3));

  return (
    <>
      <p className="callout">
        <Rich text={t('ideaLinear')} />
      </p>
      {inflection && <p className="callout">{t('inflection')}</p>}
      <div className="metrics">
        <Metric label="f(a)" value={fmt(c[0], lang, 6)} />
        <Metric label={t('mSlope')} value={fmt(c[1], lang, 6)} />
        <Metric label={t('mCurv')} value={fmt(fpp, lang, 6)} />
        <Metric
          label={`${t('mRange')} (${show(tol.value)})`}
          value={`[${fmt(range.lo, lang, 4)}; ${fmt(range.hi, lang, 4)}]`}
          note={range.loEdge || range.hiEdge ? t('edge') : `Δx ∈ [${fmt(range.lo - a, lang, 3)}; ${fmt(range.hi - a, lang, 3)}]`}
        />
      </div>
      <Card title={t('plotTangent')} info={t('tipTangent')}>
        <Plot spec={spec} height={330} />
      </Card>
      <div className="two-col">
        <Card title={t('plotResidual')} info={t('tipResidual')}>
          <Plot spec={resSpec} height={240} />
        </Card>
        <Card title={`${t('evalTitle')}: x = ${fmt(x, lang, 6)}`} info={t('tipEval')}>
          <table className="dtable">
            <tbody>
              <tr>
                <td>{t('approxLin')}</td>
                <td className="mono">{fmt(approx, lang, 9)}</td>
              </tr>
              <tr>
                <td>{t('exact')}</td>
                <td className="mono">{fmt(exact, lang, 12)}</td>
              </tr>
              <tr>
                <td>{t('errAbs')}</td>
                <td className="mono">{fmt(r1, lang, 3)}</td>
              </tr>
              <tr>
                <td>{t('bound')}</td>
                <td className="mono">{fmt(bnd, lang, 3)}</td>
              </tr>
              <tr>
                <td>{t('relErr')}</td>
                <td className="mono">{fmt((100 * r1) / Math.abs(exact), lang, 3)} %</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

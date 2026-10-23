import { useMemo } from 'react';
import { useT } from '../i18n';
import type { Analysis } from '../lib/analysis';
import { logRange, Plot, PlotSpec } from '@shared/Plot';

export function ConvergencePanel({ a, N }: { a: Analysis; N: number }) {
  const t = useT();

  const errSpec = useMemo<PlotSpec>(() => {
    const Nc = a.convergence.length - 1;
    const ys = new Float64Array(Math.max(1, Nc));
    for (let n = 1; n <= Nc; n++) ys[n - 1] = Math.max(a.convergence[n] * 100, 1e-6);
    const cur = Math.min(N, Nc);
    return {
      series: [
        { y: ys, xStart: 1, xStep: 1, color: '--c-error', width: 2, label: t('mRelRms') + ' [%]' },
        { y: [Math.max(a.convergence[Math.max(cur, 0)] * 100, 1e-6)], x: [Math.max(cur, 1)], color: '--c-approx', kind: 'points', width: 5 },
      ],
      xRange: [1, Math.max(2, Nc)],
      yRange: logRange(ys, 7),
      xLog: true,
      yLog: true,
      xLabel: t('nLabel'),
      yLabel: '%',
      vLines: [{ v: Math.max(cur, 1), color: '--c-approx', dash: [4, 4] }],
    };
  }, [a, N, t]);

  const ampSpec = useMemo<PlotSpec>(() => {
    const Kp = Math.min(a.K, 1024);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 1; k <= Kp; k++) {
      const A = Math.hypot(a.ref.re[k], a.ref.im[k]);
      if (A > 1e-12) {
        xs.push(k);
        ys.push(A);
      }
    }
    const series: PlotSpec['series'] = [{ x: xs, y: ys, color: '--c-signal', kind: 'points', width: 2.2, label: '|C_k|' }];
    if (xs.length > 1) {
      const k1 = xs[0];
      const A1 = ys[0];
      const kEnd = Math.max(xs[xs.length - 1], k1 * 2);
      series.push({ x: [k1, kEnd], y: [A1, A1 * (k1 / kEnd)], color: '--c-approx', dash: [6, 4], width: 1.5, label: t('slope1') });
      series.push({ x: [k1, kEnd], y: [A1, A1 * (k1 / kEnd) ** 2], color: '--c-comp', dash: [2, 4], width: 1.5, label: t('slope2') });
    }
    const allY = ys.length ? ys : [1];
    return {
      series,
      xRange: [1, Math.max(2, xs.length ? xs[xs.length - 1] : 2)],
      yRange: logRange(allY, 9),
      xLog: true,
      yLog: true,
      xLabel: t('harmonicK'),
      legend: true,
    };
  }, [a, t]);

  return (
    <div className="two-col">
      <div>
        <h4>{t('convErrTitle')}</h4>
        <Plot spec={errSpec} height={260} />
      </div>
      <div>
        <h4>{t('convAmpTitle')}</h4>
        <Plot spec={ampSpec} height={260} />
      </div>
      <p className="hint span2">{t('convExplain')}</p>
    </div>
  );
}

import { useT } from '../i18n';
import type { Analysis } from '../lib/analysis';

export type Preset = 'all' | 'odd' | 'even' | 'noFund' | 'fund' | { solo: number };

interface Props {
  a: Analysis;
  N: number;
  f0: number;
  mask: Uint8Array;
  onToggle: (k: number) => void;
  onPreset: (p: Preset) => void;
}

export function HarmonicsTable({ a, N, f0, mask, onToggle, onPreset }: Props) {
  const t = useT();
  const Kmax = Math.min(N, a.K);
  const amps: number[] = [];
  for (let k = 0; k <= Kmax; k++) amps.push(k === 0 ? Math.abs(a.ref.re[0]) : Math.hypot(a.ref.re[k], a.ref.im[k]));
  const Amax = Math.max(1e-15, ...amps);
  const tiny = 1e-9 * Amax;
  const fmt = (v: number) => (Math.abs(v) < tiny ? '0' : v.toPrecision(3));

  return (
    <div>
      <div className="row wrap">
        <button onClick={() => onPreset('all')}>{t('presetAll')}</button>
        <button onClick={() => onPreset('odd')}>{t('presetOdd')}</button>
        <button onClick={() => onPreset('even')}>{t('presetEven')}</button>
        <button onClick={() => onPreset('noFund')}>{t('presetNoFund')}</button>
        <button onClick={() => onPreset('fund')}>{t('presetFund')}</button>
      </div>
      <p className="hint">{t('harmonicsHint')}</p>
      <div className="table-wrap">
        <table className="htable">
          <thead>
            <tr>
              <th>{t('hOn')}</th>
              <th>{t('hK')}</th>
              <th>{t('hFreq')}</th>
              <th className="bar-col">{t('hAmp')}</th>
              <th>{t('hDb')}</th>
              <th>{t('hPhase')}</th>
              <th>a_k</th>
              <th>b_k</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {amps.map((A, k) => {
              const re = a.ref.re[k];
              const im = a.ref.im[k];
              const on = !!mask[k];
              const db = A > tiny ? 20 * Math.log10(A / Amax) : -Infinity;
              const ph = A > tiny && k > 0 ? (Math.atan2(im, re) * 180) / Math.PI : 0;
              return (
                <tr key={k} className={on ? '' : 'off'}>
                  <td>
                    <input type="checkbox" checked={on} onChange={() => onToggle(k)} />
                  </td>
                  <td className="mono">{k === 0 ? 'DC' : k}</td>
                  <td className="mono">{(k * f0).toFixed(1)}</td>
                  <td className="bar-col">
                    <div className="bar">
                      <div style={{ width: `${(100 * A) / Amax}%` }} />
                      <span className="mono">{fmt(A)}</span>
                    </div>
                  </td>
                  <td className="mono">{Number.isFinite(db) ? db.toFixed(1) : '−∞'}</td>
                  <td className="mono">{ph.toFixed(1)}</td>
                  <td className="mono">{fmt(re)}</td>
                  <td className="mono">{k === 0 ? '' : fmt(-im)}</td>
                  <td>
                    {k > 0 && (
                      <button className="tiny" onClick={() => onPreset({ solo: k })}>
                        {t('solo')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

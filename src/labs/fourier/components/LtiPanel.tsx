import { useMemo, useState } from 'react';
import { useT } from '../i18n';
import type { Analysis } from '../lib/analysis';
import { isSecondOrder, LtiSettings, ltiResponse, ltiTex, LtiType } from '../lib/lti';
import { Plot, PlotSpec } from '@shared/Plot';
import { Seg, Slider, Tex } from '@shared/ui';

const F_MIN = 10;
const F_MAX = 20000;

interface Props {
  lti: LtiSettings;
  setLti: (l: LtiSettings) => void;
  f0: number;
  a: Analysis;
}

export function LtiPanel({ lti, setLti, f0, a }: Props) {
  const t = useT();
  const [tuneK, setTuneK] = useState(3);
  const second = isSecondOrder(lti.type);

  const { magSpec, phSpec } = useMemo(() => {
    const n = 400;
    const fs = new Float64Array(n);
    const mag = new Float64Array(n);
    const ph = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const f = F_MIN * (F_MAX / F_MIN) ** (i / (n - 1));
      const [hr, hi] = ltiResponse(f, lti);
      fs[i] = f;
      mag[i] = 20 * Math.log10(Math.max(Math.hypot(hr, hi), 1e-9));
      ph[i] = (Math.atan2(hi, hr) * 180) / Math.PI;
    }
    const hx: number[] = [];
    const hm: number[] = [];
    const hp: number[] = [];
    for (let k = 1; k <= Math.min(a.K, 200); k++) {
      const f = k * f0;
      if (f > F_MAX) break;
      if (Math.hypot(a.input.re[k], a.input.im[k]) < 1e-9) continue;
      const [hr, hi] = ltiResponse(f, lti);
      hx.push(f);
      hm.push(20 * Math.log10(Math.max(Math.hypot(hr, hi), 1e-9)));
      hp.push((Math.atan2(hi, hr) * 180) / Math.PI);
    }
    let lo = Math.min(...mag);
    const hi = Math.max(...mag);
    lo = Math.max(lo, hi - 80);
    const magSpec: PlotSpec = {
      series: [
        { x: fs, y: mag, color: '--c-signal', width: 2 },
        { x: hx, y: hm, color: '--c-approx', kind: 'points', width: 3.2, label: t('harmonicsOnH') },
      ],
      xRange: [F_MIN, F_MAX],
      yRange: [Math.floor(lo / 10) * 10 - 5, Math.ceil(hi / 10) * 10 + 5],
      xLog: true,
      yLabel: t('bodeMag'),
      legend: true,
      vLines: [{ v: lti.fc, color: '--c-comp', dash: [4, 4], label: second ? 'f_n' : 'f_c' }],
    };
    const phSpec: PlotSpec = {
      series: [
        { x: fs, y: ph, color: '--c-phase', width: 2 },
        { x: hx, y: hp, color: '--c-approx', kind: 'points', width: 3.2 },
      ],
      xRange: [F_MIN, F_MAX],
      yRange: [-190, 190],
      xLog: true,
      xLabel: t('frequencyHz'),
      yLabel: t('bodePhase'),
      vLines: [{ v: lti.fc, color: '--c-comp', dash: [4, 4] }],
    };
    return { magSpec, phSpec };
  }, [lti, f0, a, t, second]);

  const types: [LtiType, string][] = [
    ['none', t('ltiNone')],
    ['lp1', t('ltiLp1')],
    ['hp1', t('ltiHp1')],
    ['lp2', t('ltiLp2')],
    ['bp2', t('ltiBp2')],
  ];
  const logFc = Math.log10(lti.fc);

  return (
    <div>
      <p className="hint">{t('ltiExplain')}</p>
      <Seg value={lti.type} options={types} onChange={(type) => setLti({ ...lti, type })} />
      {lti.type !== 'none' && (
        <div className="lti-controls">
          <Slider
            label={second ? t('ltiFn') : t('ltiFc')}
            value={logFc}
            min={1}
            max={4}
            step={0.001}
            onChange={(v) => setLti({ ...lti, fc: 10 ** v })}
            display={`${lti.fc.toFixed(lti.fc < 100 ? 1 : 0)} Hz  (${second ? 'f_n' : 'f_c'} / f₀ = ${(lti.fc / f0).toFixed(2)})`}
          />
          {second && (
            <Slider
              label={t('ltiZeta')}
              value={lti.zeta}
              min={0.01}
              max={2}
              step={0.01}
              onChange={(zeta) => setLti({ ...lti, zeta })}
              display={lti.zeta.toFixed(2)}
            />
          )}
          <div className="row">
            <span>{t('ltiTune')}</span>
            <input
              className="num"
              type="number"
              min={1}
              max={60}
              value={tuneK}
              onChange={(e) => setTuneK(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
            />
            <button onClick={() => setLti({ ...lti, fc: Math.min(10000, Math.max(10, tuneK * f0)) })}>
              f = {tuneK}·f₀
            </button>
          </div>
        </div>
      )}
      <div className="formula-row">
        <Tex block tex={ltiTex(lti.type)} />
        <Tex
          block
          tex={'y(t)=H(0)\\,a_0+\\sum_{k=1}^{\\infty}\\left|H(jk\\omega_0)\\right|A_k\\cos\\!\\big(k\\omega_0 t+\\varphi_k+\\angle H(jk\\omega_0)\\big)'}
        />
      </div>
      <Plot spec={magSpec} height={220} />
      <Plot spec={phSpec} height={170} />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import logoUrl from '@shared/logo-utfsm-die.jpg';
import { initialLang, LabHeader, persistLang } from '@shared/LabChrome';
import { Plot, PlotSpec } from '@shared/Plot';
import { Card, InfoTip, Rich, Seg, Slider, Tex } from '@shared/ui';
import { Lang, LangContext, translate, TKey } from './i18n';

/** App glyph: 24×24, stroke only, drawn in currentColor. Use the same path in the favicon of <id>.html. */
const GLYPH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 20 C7 20 8 6 12 6 S17 20 21 20" />
  </svg>
);

type Input = 'step' | 'impulse';
type Tab = 'theory' | 'exercise';

export default function App() {
  // language: remembered choice (shared by all labs) → browser language → Spanish
  const [lang, setLang] = useState<Lang>(() => initialLang());
  useEffect(() => persistLang(lang), [lang]);
  const t = (k: TKey) => translate(lang, k);

  const [K, setK] = useState(1);
  const [tau, setTau] = useState(1);
  const [input, setInput] = useState<Input>('step');
  const [tab, setTab] = useState<Tab>('theory');

  const spec = useMemo<PlotSpec>(() => {
    const T = 6 * tau;
    const n = 400;
    const y = Array.from({ length: n + 1 }, (_, i) => {
      const tt = (i / n) * T;
      return input === 'step' ? K * (1 - Math.exp(-tt / tau)) : (K / tau) * Math.exp(-tt / tau);
    });
    const top = Math.max(...y.map(Math.abs)) * 1.15 || 1;
    return {
      // colours are token names from lab-theme.css so plots follow theme and palette
      series: [{ y, xStart: 0, xStep: T / n, color: '--c-signal', width: 2, label: t('output') }],
      xRange: [0, T],
      yRange: [Math.min(0, -0.05 * top), top],
      xLabel: t('time'),
      yLabel: 'y(t)',
      vLines: [{ v: tau, color: '--c-approx', dash: [4, 4], label: 'τ' }],
      hLines: input === 'step' ? [{ v: K, color: '--axis', dash: [5, 4] }] : [],
      legend: true,
    };
  }, [K, tau, input, lang]);

  return (
    <LangContext.Provider value={lang}>
      <div className="lab-app myapp">
        <LabHeader logo={logoUrl} glyph={GLYPH} title={t('title')} subtitle={t('subtitle')} lang={lang} onLang={setLang} />

        <div className="lab-layout">
          {/* Sidebar: every control that defines the system or the experiment */}
          <aside className="lab-sidebar">
            <Card title={t('secSystem')} info={t('tipSystem')}>
              <Slider label={t('gain')} value={K} min={0.1} max={5} step={0.1} onChange={setK} display={K.toFixed(1)} />
              <Slider label={t('tau')} value={tau} min={0.1} max={5} step={0.05} onChange={setTau} display={`${tau.toFixed(2)} s`} />
              <Tex block tex={`G(s) = \\frac{${K.toFixed(1)}}{${tau.toFixed(2)}\\,s + 1}`} />
            </Card>
            <Card title={t('input')}>
              <Seg value={input} options={[['step', t('step')], ['impulse', t('impulse')]]} onChange={setInput} />
            </Card>
          </aside>

          {/* Main: key idea, metrics, plots, then secondary tabs */}
          <main className="lab-main">
            <p className="callout">
              <Rich text={t('idea')} />
            </p>

            <div className="metrics">
              <Metric label={t('mFinal')} value={input === 'step' ? K.toFixed(2) : '0'} />
              <Metric label={t('mSettle')} tip={t('tipSettle')} value={`${(4 * tau).toFixed(2)} s`} />
            </div>

            <Card title={t('plotTime')} info={t('tipTime')}>
              <Plot spec={spec} height={320} />
            </Card>

            <section className="card">
              <div className="tabs">
                {(
                  [
                    ['theory', 'tabA'],
                    ['exercise', 'tabB'],
                  ] as [Tab, TKey][]
                ).map(([id, key]) => (
                  <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                    {t(key)}
                  </button>
                ))}
              </div>
              <div className="tab-body">
                {tab === 'theory' && <Tex block tex="y(t) = K\left(1 - e^{-t/\tau}\right)" />}
                {tab === 'exercise' && <p>{t('exercise')}</p>}
              </div>
            </section>
          </main>
        </div>
      </div>
    </LangContext.Provider>
  );
}

function Metric({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className="metric">
      <span className="mlabel">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span className="mval">{value}</span>
    </div>
  );
}

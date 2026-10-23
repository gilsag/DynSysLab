import { useMemo } from 'react';
import { fmt, tex } from '@shared/format';
import { Plot, type PlotSpec } from '@shared/Plot';
import { Card, Rich, Tex } from '@shared/ui';
import { useT, type Lang, type TKey } from '../i18n';
import { PhasePlane } from '../components/PhasePlane';
import { equilibria, field, integrate, linearTrajectory, separatrices, type Kind, type Sys, type V2, type Window } from '../math/system';

export interface SystemState {
  sys: Sys;
  win: Window;
  names: [string, string];
  x0: V2;
  T: number;
  show: { field: boolean; family: boolean; sep: boolean; eig: boolean; lin: boolean };
  sel: number;
  note?: string;
}

const KIND_KEY: Record<Kind, [TKey, TKey]> = {
  stableNode: ['stableNode', 'kStableNode'],
  unstableNode: ['unstableNode', 'kUnstableNode'],
  stableFocus: ['stableFocus', 'kStableFocus'],
  unstableFocus: ['unstableFocus', 'kUnstableFocus'],
  saddle: ['saddle', 'kSaddle'],
  undecided: ['undecided', 'kUndecided'],
};
const BADGE: Record<Kind, string> = {
  stableNode: 'ok', stableFocus: 'ok', unstableNode: 'bad', unstableFocus: 'bad', saddle: 'bad', undecided: 'mid',
};

export function TabSystem({ st, lang, setX0, setSel }: { st: SystemState; lang: Lang; setX0: (x: V2) => void; setSel: (i: number) => void }) {
  const t = useT();
  const { sys, win } = st;
  const eqs = useMemo(() => equilibria(sys, win), [sys, win]);
  const sel = Math.min(st.sel, Math.max(0, eqs.length - 1));
  const eq = eqs[sel];
  const fn = useMemo(() => (x: V2) => field(sys, x), [sys]);
  const seps = useMemo(() => {
    const out = { stable: [] as V2[][], unstable: [] as V2[][] };
    if (!st.show.sep) return out;
    for (const e of eqs) {
      const s = separatrices(sys, e, win);
      out.stable.push(...s.stable);
      out.unstable.push(...s.unstable);
    }
    return out;
  }, [eqs, sys, win, st.show.sep]);
  const family = useMemo(() => {
    if (!st.show.family) return [];
    const out: V2[][] = [];
    const n1 = 7, n2 = 5;
    for (let i = 0; i < n1; i++) {
      for (let j = 0; j < n2; j++) {
        const x: V2 = [win.x1[0] + ((i + 0.5) / n1) * (win.x1[1] - win.x1[0]), win.x2[0] + ((j + 0.5) / n2) * (win.x2[1] - win.x2[0])];
        out.push(integrate(fn, x, Math.min(st.T, 15), win, 0.01, 0.05).x);
      }
    }
    return out;
  }, [fn, win, st.show.family, st.T]);
  const main = useMemo(() => integrate(fn, st.x0, st.T, win, 0.005, 2), [fn, st.x0, st.T, win]);
  const lin = useMemo(() => (eq && st.show.lin ? linearTrajectory(eq, st.x0, st.T, win, 0.005) : null), [eq, st.x0, st.T, win, st.show.lin]);

  const timeSpec: PlotSpec = useMemo(() => {
    const series: PlotSpec['series'] = [
      { x: main.t, y: main.x.map((v) => v[0]), color: '--s1', width: 2.2, label: `x₁ (${t('nonlinear')})` },
      { x: main.t, y: main.x.map((v) => v[1]), color: '--s2', width: 2.2, label: `x₂ (${t('nonlinear')})` },
    ];
    if (lin) {
      series.push(
        { x: lin.t, y: lin.x.map((v) => v[0]), color: '--s1', width: 1.4, dash: [6, 4], label: `x₁ (${t('linearized')})` },
        { x: lin.t, y: lin.x.map((v) => v[1]), color: '--s2', width: 1.4, dash: [6, 4], label: `x₂ (${t('linearized')})` },
      );
    }
    const all = series.flatMap((s) => Array.from(s.y)).filter(Number.isFinite);
    const lo = Math.min(...all), hi = Math.max(...all);
    const sx = win.x1[1] - win.x1[0], sy = win.x2[1] - win.x2[0];
    const cap = 1.5 * Math.max(sx, sy, Math.abs(win.x1[0]), Math.abs(win.x1[1]), Math.abs(win.x2[0]), Math.abs(win.x2[1]));
    const y0 = Math.max(lo, -cap), y1 = Math.min(hi, cap);
    const pad = 0.08 * (y1 - y0 || 1);
    const hLines = eq ? [{ v: eq.x[0], color: '--s1', dash: [2, 4] }, { v: eq.x[1], color: '--s2', dash: [2, 4] }] : [];
    return { series, xRange: [0, st.T], yRange: [y0 - pad, y1 + pad], xLabel: t('time'), legend: true, hLines };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main, lin, st.T, win, eq, lang]);

  const mtx = (A: [V2, V2]) => `\\begin{bmatrix} ${tex(A[0][0], lang)} & ${tex(A[0][1], lang)} \\\\ ${tex(A[1][0], lang)} & ${tex(A[1][1], lang)} \\end{bmatrix}`;
  const lam = (i: number) => {
    if (!eq) return '';
    const re = eq.eig.re[i], im = eq.eig.im[i];
    return im === 0 ? tex(re, lang, 5) : `${tex(re, lang, 4)} ${im < 0 ? '-' : '+'} j\\,${tex(Math.abs(im), lang, 4)}`;
  };
  const lamTxt = (e: (typeof eqs)[number], i: number) => {
    const re = e.eig.re[i], im = e.eig.im[i];
    return im === 0 ? fmt(re, lang, 5) : `${fmt(re, lang, 4)} ${im < 0 ? '−' : '+'} j${fmt(Math.abs(im), lang, 4)}`;
  };

  return (
    <>
      <p className="callout">
        <Rich text={t('ideaSystem')} />
      </p>
      {st.note && <p className="callout note-callout">{st.note}</p>}
      <div className="sys-layout">
        <Card title={t('phaseTitle')} info={t('tipPhase')}>
          <div className="phase-wrap">
            <PhasePlane
              win={win}
              names={st.names}
              lang={lang}
              field={st.show.field ? fn : undefined}
              family={family}
              stable={seps.stable}
              unstable={seps.unstable}
              eqs={eqs}
              selected={sel}
              eigLines={st.show.eig}
              main={main.x}
              lin={lin?.x}
              x0={st.x0}
              onPick={setX0}
              height={470}
            />
            <span className="ax-x">
              <Tex tex={st.names[0]} />
            </span>
            <span className="ax-y">
              <Tex tex={st.names[1]} />
            </span>
          </div>
          <div className="legend-row small">
            <span className="lg-line main" /> {t('nonlinear')}
            {st.show.lin && (
              <>
                <span className="lg-line main dashed" /> {t('linearized')}
              </>
            )}
            {st.show.sep && (
              <>
                <span className="lg-line sep" /> {t('sepStable')}
                <span className="lg-line sep dashed" /> {t('sepUnstable')}
              </>
            )}
          </div>
        </Card>
        <div className="sys-side">
          <Card title={t('eqTitle')} info={t('tipEq')}>
            {eqs.length === 0 ? (
              <p className="hint">{t('noEq')}</p>
            ) : (
              <div className="table-wrap">
                <table className="dtable eq-table">
                  <thead>
                    <tr>
                      <th>
                        <Tex tex="\mathbf x^e" />
                      </th>
                      <th>
                        <Tex tex="\lambda_1,\ \lambda_2" />
                      </th>
                      <th>{t('colClass')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eqs.map((e, i) => (
                      <tr key={i} className={i === sel ? 'sel' : ''} onClick={() => setSel(i)}>
                        <td className="mono">
                          ({fmt(e.x[0], lang, 5)}; {fmt(e.x[1], lang, 5)})
                        </td>
                        <td className="mono">
                          {lamTxt(e, 0)}
                          <br />
                          {lamTxt(e, 1)}
                        </td>
                        <td>
                          <span className={`badge ${BADGE[e.kind]}`}>{t(KIND_KEY[e.kind][0])}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          {eq && (
            <Card title={t('linTitle')} info={t('tipLin')}>
              <Tex
                block
                tex={`\\Delta\\dot{\\mathbf x} = ${mtx(eq.A)}\\,\\Delta\\mathbf x + \\begin{bmatrix} ${tex(eq.b[0], lang)} \\\\ ${tex(eq.b[1], lang)} \\end{bmatrix}\\Delta u`}
              />
              <Tex
                block
                tex={`\\operatorname{tr}\\mathbf A = ${tex(eq.eig.tr, lang, 5)},\\quad \\det\\mathbf A = ${tex(eq.eig.det, lang, 5)},\\quad \\lambda_{1,2} = ${lam(0)},\\ ${lam(1)}`}
              />
              <p className="hint">
                <b>{t(KIND_KEY[eq.kind][0])}.</b> {t(KIND_KEY[eq.kind][1])}
              </p>
            </Card>
          )}
        </div>
      </div>
      <Card title={t('timeTitle')} info={t('tipTime')}>
        <Plot spec={timeSpec} height={240} />
      </Card>
    </>
  );
}

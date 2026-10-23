import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { useT } from '../i18n';
import { Box, Check, MatrixGrid, Slider, Tex, modeColors, Rich } from '../components/basic';
import { FlowGraph } from '../components/FlowGraph';
import { PhasePlane, ExtraTraj } from '../components/PhasePlane';
import { Plot } from '../components/Plot';
import { coAnalysis, gramianC, simulate, suggestHorizon, transform, ccf, ocf, modal, ctrb, obsv, singularValues, SS } from '../math/ss';
import { Vec } from '../math/linalg';
import { cx } from '../math/complex';
import { fmt, tn, texComplex } from '../format';
import { expandRoots, pzFromPreset, pzPresets } from '../model';
import { polyFromRoots, polyScale } from '../math/poly';

function SVBars({ sv, n }: { sv: number[]; n: number }) {
  const smax = sv[0] || 1;
  return (
    <div className="svbars">
      {sv.slice(0, n).map((s, i) => {
        const r = s / smax;
        const w = r <= 0 ? 0 : Math.max(0, (Math.log10(r) + 12) / 12);
        return <div key={i} className="svb"><Tex tex={`\\sigma_${i + 1}`} /><span className="bar"><span style={{ width: `${w * 100}%` }} className={r < 1e-8 ? 'zero' : r < 1e-3 ? 'weak' : ''} /></span><span className="v">{fmt(s, 3)}</span></div>;
      })}
      <div className="svscale"><span>10⁻¹²</span><span>10⁻⁶</span><span>1 · σ₁</span></div>
    </div>
  );
}

// entradas pseudoaleatorias reproducibles
function randInput(seed: number) {
  const a = [Math.sin(seed * 12.9898) * 2, Math.cos(seed * 78.233) * 2, Math.sin(seed * 3.1) * 1.5];
  const w = [0.7 + (seed % 3) * 0.6, 1.9 + (seed % 2), 3.3];
  return (t: number) => a.reduce((s, ai, k) => s + ai * Math.sin(w[k] * t + seed), 0);
}

export function TabCO() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const co = useMemo(() => coAnalysis(sys.ss, sys.md), [sys]);
  const n = sys.n;
  const [Tg, setTg] = useState(2);
  const [opts, setOpts] = useState({ gram: true, rand: true, subs: true });
  const ctrlOK = co.rankC === n, obsOK = co.rankO === n;
  const H = suggestHorizon(sys.md.eig);

  const modalSS = useMemo(() => (sys.md.ok ? transform(sys.ss, sys.md.T) : null), [sys]);
  const nodeClass = (i: number) => {
    if (!sys.md.ok) return '';
    const b = sys.md.blocks.find((bb) => i >= bb.start && i < bb.start + bb.size);
    if (!b) return '';
    const m = co.modes.find((mm) => Math.abs(mm.lambda.re - b.lambda.re) + Math.abs(mm.lambda.im - b.lambda.im) < 1e-7 * (1 + Math.abs(b.lambda.re)));
    if (!m) return '';
    return `${m.controllable ? '' : 'nc'} ${m.observable ? '' : 'no'}`;
  };

  // plano de fase: subespacio alcanzable, gramiano y trayectorias con entradas arbitrarias
  const W = useMemo(() => (n >= 2 && opts.gram ? gramianC(sys.ss.A, sys.ss.B, Tg) : null), [sys.ss, Tg, n, opts.gram]);
  const Wp = W ? [[W[0][0], W[0][1]], [W[1][0], W[1][1]]] : null;
  const randTraj: ExtraTraj[] = useMemo(() => {
    if (n < 2 || !opts.rand) return [];
    return [1, 2, 3, 4, 5].map((s) => {
      const f = randInput(s);
      const sim = simulate(sys.ss, sys.ss.A.map(() => 0), (tt) => sys.ss.B[0].map((_, j) => f(tt + j)), Tg, 300);
      return { x0: sys.ss.A.map(() => 0), pts: sim.x, color: modeColors[(s + 2) % 8], dash: '' };
    });
  }, [sys.ss, Tg, n, opts.rand]);

  // demostración de no observabilidad
  const obsDemo = useMemo(() => {
    const x0a = st.x0;
    const dir = co.unobs[0] ?? sys.ss.A.map((_, i) => (i === n - 1 ? 1 : 0));
    const x0b = x0a.map((v, i) => v + 1.2 * dir[i]);
    const sa = simulate(sys.ss, x0a, () => sys.ss.B[0].map(() => 0), H, 300);
    const sb = simulate(sys.ss, x0b, () => sys.ss.B[0].map(() => 0), H, 300);
    return { sa, sb, x0b, unobs: co.unobs.length > 0 };
  }, [sys.ss, st.x0, co.unobs, H, n]);

  // barrido: un cero real recorre el eje real
  const sweep = useMemo(() => {
    if (sys.kind !== 'pz') return null;
    const zr = st.pz.zeros.find((z) => z.im === 0);
    if (!zr) return null;
    const P = expandRoots(st.pz.poles);
    const others = expandRoots(st.pz.zeros.filter((z) => z.id !== zr.id));
    const reals = P.filter((p) => p.im === 0).map((p) => p.re);
    const lo = Math.min(...reals, zr.re, 0) - 2, hi = Math.max(...reals, zr.re, 0) + 1;
    const xs: number[] = [], sc: number[] = [], so: number[] = [];
    const grid = [...Array.from({ length: 241 }, (_, k) => lo + ((hi - lo) * k) / 240), ...reals].sort((a, b) => a - b);
    for (const z of grid) {
      const tf = { num: polyScale(polyFromRoots([...others, cx(z)]), st.pz.K), den: polyFromRoots(P) };
      let s: SS = ccf(tf);
      if (sys.realization === 'ocf') s = ocf(tf);
      else if (sys.realization === 'modal') { const md = modal(s.A, P); if (md.ok) s = transform(s, md.T) ?? s; }
      const a = singularValues(ctrb(s.A, s.B)), b = singularValues(obsv(s.A, s.C));
      xs.push(z); sc.push(Math.log10(Math.max(a[a.length - 1] / a[0], 1e-8))); so.push(Math.log10(Math.max(b[b.length - 1] / b[0], 1e-8)));
    }
    return { xs, sc, so, reals, cur: zr.re };
  }, [sys.kind, sys.realization, st.pz]);

  const cat = (c: boolean, o: boolean) => (c && o ? 'co.catCO' : c ? 'co.catCnO' : o ? 'co.catnCO' : 'co.catnCnO');

  return (
    <div className="tab tab-co">
      <Box kind="idea" title={t('idea')}>{t('cob.idea')}</Box>
      <div className="three">
        <Box kind={ctrlOK ? 'blue' : 'red'} title={<>{t('cob.ctrbMatrix')} <span className={`badge ${ctrlOK ? 'ok' : 'bad'}`}>{ctrlOK ? t('cob.controllable') : t('cob.notControllable')}</span></>}>
          <Tex display tex={`\\mathcal{C} = [\\,\\mathbf{B}\\ \\ \\mathbf{AB}${n > 2 ? '\\ \\cdots\\ \\mathbf{A}^{n-1}\\mathbf{B}' : ''}\\,]`} />
          <MatrixGrid M={co.Ct} label="\mathcal{C}" />
          <p><Tex tex={`\\operatorname{rank}(\\mathcal{C}) = ${co.rankC}`} /> {t('cob.of')} <Tex tex={`n = ${n}`} /></p>
          <SVBars sv={co.svC} n={n} />
          {ctrlOK && co.svC[n - 1] / (co.svC[0] || 1) < 1e-8 && <p className="hint"><Rich text={t('cob.illCond')} /></p>}
        </Box>
        <Box kind={obsOK ? 'green' : 'red'} title={<>{t('cob.obsvMatrix')} <span className={`badge ${obsOK ? 'ok' : 'bad'}`}>{obsOK ? t('cob.observable') : t('cob.notObservable')}</span></>}>
          <Tex display tex={`\\mathcal{O} = \\begin{bmatrix}\\mathbf{C}\\\\ \\mathbf{CA}${n > 2 ? '\\\\ \\vdots \\\\ \\mathbf{CA}^{n-1}' : ''}\\end{bmatrix}`} />
          <MatrixGrid M={co.Ob} label="\mathcal{O}" />
          <p><Tex tex={`\\operatorname{rank}(\\mathcal{O}) = ${co.rankO}`} /> {t('cob.of')} <Tex tex={`n = ${n}`} /></p>
          <SVBars sv={co.svO} n={n} />
          {obsOK && co.svO[n - 1] / (co.svO[0] || 1) < 1e-8 && <p className="hint"><Rich text={t('cob.illCond')} /></p>}
        </Box>
        <Box kind="gray" title={t('cob.summary')}>
          <p><Tex tex={`n_{\\min} = \\operatorname{rank}(\\mathcal{O}\\,\\mathcal{C}) = ${co.minimalOrder}`} /></p>
          <p className={co.minimalOrder === n ? 'ok' : 'warn'}>{co.minimalOrder === n ? t('cob.minimal') : t('cob.notMinimal', { k: n - co.minimalOrder })}</p>
          <table className="tbl">
            <thead><tr><th><Tex tex="\lambda" /></th><th>{t('cob.ctrlShort')}</th><th>{t('cob.obsShort')}</th><th>{t('cob.cat')}</th></tr></thead>
            <tbody>{co.modes.map((m, i) => (
              <tr key={i}>
                <td><Tex tex={m.lambda.im ? texComplex(m.lambda).replace(/[+-] j/, '\\pm j') : texComplex(m.lambda)} />{m.mult > 1 && <span className="muted"> ×{m.mult}</span>}</td>
                <td>{m.controllable ? '✓' : '✗'} {m.cosC != null && <span className="meas" title="cos θ"><span style={{ width: `${m.cosC * 100}%` }} /></span>}</td>
                <td>{m.observable ? '✓' : '✗'} {m.cosO != null && <span className="meas o" title="cos θ"><span style={{ width: `${m.cosO * 100}%` }} /></span>}</td>
                <td className="small">{t(cat(m.controllable, m.observable) as never)}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="hint">{t('cob.pbhHint')}</p>
        </Box>
      </div>
      <div className="two">
        <Box kind="plain" title={t('cob.modalGraph')}>
          {modalSS ? <FlowGraph ss={{ ...modalSS, A: sys.md.J }} stateTex={sys.stateTex.map((_, i) => `z_{${i + 1}}`)} inputTex={sys.inputTex} outputTex={sys.outputTex} nodeClass={nodeClass} />
            : <p className="hint warn">{t('real.noModal')}</p>}
          <p className="hint"><Rich text={t('cob.graphHint')} /></p>
        </Box>
        {n >= 2 ? (
          <Box kind="plain" title={t('cob.reachTitle')}>
            <div className="checks">
              <Check label={t('cob.gram')} checked={opts.gram} onChange={(v) => setOpts({ ...opts, gram: v })} />
              <Check label={t('cob.rand')} checked={opts.rand} onChange={(v) => setOpts({ ...opts, rand: v })} />
              <Check label={t('cob.subs')} checked={opts.subs} onChange={(v) => setOpts({ ...opts, subs: v })} />
            </div>
            <Slider label={<Tex tex="t_f" />} value={Tg} min={0.2} max={10} log onChange={setTg} fmtV={(v) => `${fmt(v, 3)} s`} />
            <PhasePlane A={sys.ss.A} B={sys.ss.B} ix={0} iy={1} x0={sys.ss.A.map(() => 0)} u={sys.ss.B[0].map(() => 0)} horizon={Tg} showField={false} showFamily={false}
              hideMain ellipse={Wp} extra={randTraj} labels={[sys.stateTex[0], sys.stateTex[1]]} fitKey={`${st.fitKey}-${sys.realization}-${Tg > 1}`}
              sub={opts.subs ? [
                ...(co.rankC < n ? co.reach.map((v) => ({ v, color: 'var(--s1)', label: 'Im 𝒞' })) : []),
                ...co.unobs.map((v) => ({ v, color: 'var(--s2)', label: 'ker 𝒪', dash: '3 5' })),
              ] : []} />
            <p className="hint"><Rich text={t('cob.reachHint')} /></p>
            {W && <p className="hint"><Tex tex={`\\mathbf{W}_c(t_f) = \\int_0^{t_f} e^{\\mathbf{A}\\tau}\\mathbf{B}\\mathbf{B}^{\\mathsf T} e^{\\mathbf{A}^{\\mathsf T}\\tau} d\\tau,\\quad \\det \\mathbf{W}_c = ${tn(W.length === 2 ? W[0][0] * W[1][1] - W[0][1] * W[1][0] : NaN)}`} /></p>}
          </Box>
        ) : <div />}
      </div>
      <div className="two">
        <Box kind={obsDemo.unobs ? 'red' : 'green'} title={t('cob.sameOutTitle')}>
          <Plot height={200} xLabel="t\;[\mathrm{s}]" series={[
            { x: obsDemo.sa.t, y: obsDemo.sa.y.map((r) => r[0]), color: 'var(--s1)', label: 'y_a(t)', width: 3 },
            { x: obsDemo.sb.t, y: obsDemo.sb.y.map((r) => r[0]), color: 'var(--s4)', label: 'y_b(t)', width: 2, dash: '6 4' },
          ]} />
          <Plot height={170} xLabel="t\;[\mathrm{s}]" series={sys.stateTex.flatMap((s, i) => [
            { x: obsDemo.sa.t, y: obsDemo.sa.x.map((r) => r[i]), color: modeColors[i % 8], label: `${s}^{(a)}`, width: 2 },
            { x: obsDemo.sb.t, y: obsDemo.sb.x.map((r) => r[i]), color: modeColors[i % 8], label: `${s}^{(b)}`, width: 1.5, dash: '6 4' },
          ])} />
          <p className="hint">
            <Tex tex={`\\mathbf{x}_a(0) = [${st.x0.map((v) => tn(v)).join(',\\ ')}]^{\\mathsf T},\\ \\mathbf{x}_b(0) = [${obsDemo.x0b.map((v: Vec[number]) => tn(v)).join(',\\ ')}]^{\\mathsf T}`} />{' '}
            {obsDemo.unobs ? t('cob.sameOutYes') : t('cob.sameOutNo')}
          </p>
        </Box>
        <Box kind="blue" title={t('cob.sweepTitle')}>
          {sweep ? (
            <>
              <Plot height={260} xLabel="z_0\ (\text{cero})" yLabel="\log_{10}(\sigma_{\min}/\sigma_{\max})" cursorX={sweep.cur}
                vlines={sweep.reals.map((r) => ({ x: r, color: 'var(--s2)', label: '×' }))}
                series={[
                  { x: sweep.xs, y: sweep.sc, color: 'var(--s1)', label: '\\mathcal{C}', width: 2.2 },
                  { x: sweep.xs, y: sweep.so, color: 'var(--s3)', label: '\\mathcal{O}', width: 2.2 },
                ]} />
              <p className="hint"><Rich text={t('cob.sweepHint')} /></p>
            </>
          ) : (
            <>
              <p className="hint">{t('cob.sweepNeed')}</p>
              <button onClick={() => set((s) => ({ source: 'pz', pz: pzFromPreset(pzPresets.find((p) => p.key === 'pz.preset.cancel')!), realization: 'ccf', fitKey: s.fitKey + 1 }))}>{t('cob.loadCancel')}</button>
            </>
          )}
        </Box>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { useT } from '../i18n';
import { Box, Check, MatrixGrid, NumInput, Seg, Tex, modeColors, Rich } from '../components/basic';
import { SPlane, poleData, PZTool, ModeFlag } from '../components/SPlane';
import { Plot } from '../components/Plot';
import { C } from '../math/complex';
import { circuitSS, Realization } from '../model';
import { circuitDef } from '../circuits';
import { eigenvalues, simulate, suggestHorizon, coAnalysis, tfPair, TF } from '../math/ss';
import { fmt, tn, texPoly, texFactors, texComplex, round } from '../format';
import { trimPoly } from '../math/poly';
import { zerosOf } from '../model';

export function modeTex(z: C): string {
  const a = round(z.re), b = round(Math.abs(z.im));
  const ex = a === 0 ? '' : `e^{${a === -1 ? '-' : a === 1 ? '' : tn(a)}t}`;
  if (b === 0) return ex || '1';
  return `${ex}\\cos(${b === 1 ? '' : tn(b)}t+\\varphi)`;
}

export function GTex({ tf, zeros, poles, factored = true }: { tf: TF; zeros: C[]; poles: C[]; factored?: boolean }) {
  const num = trimPoly(tf.num, 1e-12);
  const lead = num[num.length - 1];
  const K = round(lead);
  if (factored) {
    const nf = zeros.length ? texFactors(zeros) : '';
    const numTex = zeros.length ? (K === 1 ? nf : K === -1 ? `-${nf}` : `${tn(K)}\\,${nf}`) : tn(K);
    return <Tex display tex={`G(s) = \\frac{${numTex}}{${texFactors(poles)}}`} />;
  }
  return <Tex display tex={`G(s) = \\frac{${texPoly(num)}}{${texPoly(tf.den)}}`} />;
}

export function SparkMode({ z, color, T }: { z: C; color: string; T: number }) {
  const N = 60;
  const ys = Array.from({ length: N + 1 }, (_, k) => { const t = (k / N) * T; return Math.exp(z.re * t) * Math.cos(z.im * t); });
  const m = Math.max(1, ...ys.map(Math.abs).filter(isFinite));
  const d = ys.map((y, k) => `${k ? 'L' : 'M'}${(k / N) * 80},${(14 - (Math.max(-3, Math.min(3, y / m)) * 12)).toFixed(1)}`).join('');
  return <svg width={80} height={28} className="spark"><line x1={0} x2={80} y1={14} y2={14} className="axis0" /><path style={{ stroke: color }} d={d} fill="none" strokeWidth={1.6} /></svg>;
}

export function TabSPlane() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const [pair, setPair] = useState<[number, number]>([0, 0]);
  const [factored, setFactored] = useState(true);
  const out = Math.min(pair[0], sys.p - 1), inp = Math.min(pair[1], sys.m - 1);
  const poles = sys.md.eig;
  const tfSel = useMemo(() => (sys.kind === 'pz' ? sys.tf : sys.n ? tfPair(sys.base, out, inp) : undefined), [sys, out, inp]);
  const zerosSel = useMemo(() => (sys.kind === 'pz' ? sys.tfZeros : tfSel ? zerosOf(tfSel) : []), [sys, tfSel]);

  const loci = useMemo(() => {
    const key = st.circuit.locus[st.circuit.id];
    if (sys.kind !== 'circuit' || !key || key === 'none') return undefined;
    const prm = circuitDef(st.circuit.id).params.find((q) => q.key === key);
    if (!prm) return undefined;
    const v0 = st.circuit.p[st.circuit.id][key];
    const pts: C[] = [];
    const lo = prm.log ? v0 / 4 : prm.min, hi = prm.log ? v0 * 4 : Math.max(prm.max * 0.6, v0 * 2.5);
    for (let k = 0; k <= 160; k++) {
      const v = prm.log ? lo * Math.pow(hi / lo, k / 160) : lo + ((hi - lo) * k) / 160;
      pts.push(...eigenvalues(circuitSS(st.circuit, { [key]: v }).A));
    }
    return [{ pts, label: `${prm.tex.replace('_', '')} ↑` }];
  }, [sys.kind, st.circuit]);

  const co = useMemo(() => (sys.md.ok || sys.n ? coAnalysis(sys.ss, sys.md) : null), [sys]);
  const flags: ModeFlag[] | undefined = co?.modes.map((m) => ({ lambda: m.lambda, c: m.controllable, o: m.observable }));

  const T = suggestHorizon(poles);
  const step = useMemo(() => simulate(sys.ss, sys.ss.A.map(() => 0), () => sys.ss.B[0].map((_, j) => (j === inp ? 1 : 0)), T, 300), [sys, T, inp]);

  const upper = sys.md.clusters.length ? sys.md.clusters : poles.filter((z) => z.im >= 0).map((value) => ({ value, mult: 1, geom: 1 }));
  const stable = poles.every((z) => z.re < -1e-12);
  const marginal = !stable && poles.every((z) => z.re <= 1e-12);

  const realLabel: Record<Realization, string> = { source: t(sys.kind === 'circuit' ? 'real.physicalShort' : 'real.entered'), ccf: t('real.ccfShort'), ocf: t('real.ocfShort'), modal: t('real.modalShort') };

  return (
    <div className="tab tab-splane">
      <div className="col-main">
        <Box kind="idea" title={t('idea')}>{t('sp.idea')}</Box>
        {sys.kind === 'pz' ? (
          <div className="toolbar">
            <Seg value={st.tool} onChange={(v: PZTool) => set({ tool: v })} options={[
              { v: 'move', label: `✥ ${t('sp.toolMove')}` }, { v: 'pole', label: `× ${t('sp.toolPole')}` }, { v: 'zero', label: `○ ${t('sp.toolZero')}` }, { v: 'delete', label: `⌫ ${t('sp.toolDelete')}` },
            ]} />
            <span className="tb-group">{t('sp.snap')}
              <Seg small value={String(st.snap)} onChange={(v) => set({ snap: +v })} options={[{ v: '0', label: t('sp.snapFree') }, { v: '0.1', label: fmt(0.1) }, { v: '0.5', label: fmt(0.5) }, { v: '1', label: '1' }]} />
            </span>
            <Check label={<><Tex tex="\zeta,\ \omega_n" /></>} checked={st.showDamping} onChange={(v) => set({ showDamping: v })} />
            <span className="order-badge">{t('sp.order')} <Tex tex={`n = ${sys.n}`} /></span>
            <span className="tb-group"><Tex tex="K" /><NumInput value={st.pz.K} onChange={(K) => set({ pz: { ...st.pz, K } })} width={58} /></span>
          </div>
        ) : (
          <div className="toolbar"><span className="hint">{t('sp.readOnly')}</span><Check label={<Tex tex="\zeta,\ \omega_n" />} checked={st.showDamping} onChange={(v) => set({ showDamping: v })} /></div>
        )}
        <SPlane pz={sys.kind === 'pz' ? st.pz : undefined} onPZ={(pz) => set({ pz })} poles={poles} zeros={zerosSel} editable={sys.kind === 'pz'}
          tool={st.tool} snap={st.snap} height={520} showDamping={st.showDamping} loci={loci} flags={flags} fitKey={`${st.fitKey}-${sys.kind}`} />
        <p className="hint">{sys.kind === 'pz' ? t('sp.help') : t('sp.helpRO')}</p>
      </div>
      <div className="col-side">
        <Box kind="gray" title={<>{t('sp.ssTitle')} · {realLabel[sys.realization]}</>} right={
          <Seg small value={sys.realization} onChange={(v) => set({ realization: v })} options={(['source', 'ccf', 'ocf', 'modal'] as Realization[]).filter((r) => sys.available[r]).map((r) => ({ v: r, label: realLabel[r] }))} />
        }>
          <div className="mats4">
            <MatrixGrid M={sys.ss.A} label="\mathbf{A}" />
            <MatrixGrid M={sys.ss.B} label="\mathbf{B}" />
            <MatrixGrid M={sys.ss.C} label="\mathbf{C}" />
            <MatrixGrid M={sys.ss.D} label="\mathbf{D}" />
          </div>
          <p className="hint">{t(`sp.realHint.${sys.realization}` as never)}</p>
        </Box>
        {tfSel && (
          <Box kind="blue" title={<>{t('sp.tf')} {sys.m * sys.p > 1 && <Tex tex={`G_{${out + 1}${inp + 1}}`} />}</>} right={
            <Seg small value={factored ? 'f' : 'e'} onChange={(v) => setFactored(v === 'f')} options={[{ v: 'f', label: t('sp.factored') }, { v: 'e', label: t('sp.expanded') }]} />
          }>
            {sys.m * sys.p > 1 && (
              <div className="row">{t('sp.pair')}
                <select value={out} onChange={(e) => setPair([+e.target.value, inp])}>{sys.outputTex.map((_, i) => <option key={i} value={i}>y{i + 1}</option>)}</select>
                <select value={inp} onChange={(e) => setPair([out, +e.target.value])}>{sys.inputTex.map((_, i) => <option key={i} value={i}>u{i + 1}</option>)}</select>
              </div>
            )}
            <GTex tf={tfSel} zeros={zerosSel} poles={poles} factored={factored} />
            <Tex display tex={`|s\\mathbf{I}-\\mathbf{A}| = ${texPoly(sys.kind === 'pz' ? sys.tf!.den : tfSel.den)}`} />
            {flags?.some((f) => !f.c || !f.o) && <p className="hint warn">{t('sp.cancelWarn')}</p>}
          </Box>
        )}
        <Box kind="gray" title={<>{t('sp.poles')} <span className={`badge ${stable ? 'ok' : marginal ? 'mid' : 'bad'}`}>{stable ? t('sp.stable') : marginal ? t('sp.marginal') : t('sp.unstable')}</span></>}>
          <table className="tbl">
            <thead><tr><th><Tex tex="\lambda_i" /></th><th><Tex tex="\zeta" /></th><th><Tex tex="\omega_n" /></th><th><Tex tex="\tau" /></th><th>{t('sp.mode')}</th><th /></tr></thead>
            <tbody>
              {upper.map((c, i) => {
                const d = poleData(c.value);
                return (
                  <tr key={i}>
                    <td><Tex tex={`${c.value.im ? texComplex(c.value).replace(/\+ j/, '\\pm j').replace(/- j/, '\\pm j') : texComplex(c.value)}${c.mult > 1 ? `\\;(\\times ${c.mult})` : ''}`} /></td>
                    <td>{c.value.im ? fmt(d.zeta, 3) : '—'}</td>
                    <td>{c.value.im ? fmt(d.wn, 3) : '—'}</td>
                    <td>{c.value.re < 0 ? fmt(d.tau, 3) : '—'}</td>
                    <td><Tex tex={`${c.mult > 1 && c.geom < c.mult ? `t^{k}` : ''}${modeTex(c.value)}`} /></td>
                    <td><SparkMode z={c.value} color={modeColors[i % modeColors.length]} T={T} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!sys.md.diagonalizable && sys.md.ok && <p className="hint warn"><Rich text={t('sp.jordanNote')} /></p>}
        </Box>
        <Box kind="plain" title={t('sp.stepTitle')}>
          <Plot height={170} series={step.y[0].map((_, k) => ({ x: step.t, y: step.y.map((r) => r[k]), color: modeColors[k], label: sys.outputTex[k] + '(t)' }))} xLabel="t\;[\mathrm{s}]" />
        </Box>
      </div>
    </div>
  );
}

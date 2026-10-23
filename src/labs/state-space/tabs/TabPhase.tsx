import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { useT } from '../i18n';
import { Box, Check, NumInput, Slider, Tex, modeColors } from '../components/basic';
import { PhasePlane, EigLine } from '../components/PhasePlane';
import { Plot } from '../components/Plot';
import { TraceDet } from '../components/TraceDet';
import { useAnim } from '../components/useAnim';
import { suggestHorizon, simulate, modalContributions } from '../math/ss';
import { inv, matvec, matmul, Vec } from '../math/linalg';
import { fmt, texComplex, tn } from '../format';

export function eigLinesFor(sys: ReturnType<typeof useApp>['sys']): EigLine[] {
  return sys.md.rightVecs.filter((r) => r.lambda.im === 0).map((r, i) => ({
    v: r.v.map((z) => z.re), color: modeColors[(i + 1) % modeColors.length],
    label: `λ = ${fmt(r.lambda.re)}`,
  }));
}

export function TabPhase() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const n = sys.n;
  const [axes, setAxes] = useState<[number, number]>([0, 1]);
  const ix = Math.min(axes[0], n - 1), iy = n > 1 ? Math.min(axes[1], n - 1) : 0;
  const [opt, setOpt] = useState({ field: true, family: true, eig: true, modal: false, decomp: true });
  const [uc, setUc] = useState(0);
  const [hMul, setHMul] = useState(1);
  const [family, setFamily] = useState<Vec[]>([]);
  const T = suggestHorizon(sys.md.eig) * hMul;
  const anim = useAnim(T);
  const u = sys.ss.B[0].map((_, j) => (j === 0 ? uc : 0));
  const eig = opt.eig ? eigLinesFor(sys) : [];
  const x0 = st.x0;
  const setX0 = (x: Vec) => set({ x0: x });

  const sim = useMemo(() => simulate(sys.ss, x0, () => u, T, 400), [sys.ss, x0, uc, T]);
  const contrib = useMemo(() => (uc === 0 && sys.md.ok ? modalContributions(sys.md, x0, sim.t) : []), [sys.md, x0, sim.t, uc]);

  // plano modal
  const modalSys = useMemo(() => {
    if (!sys.md.ok || n < 2) return null;
    const Ti = inv(sys.md.T)!;
    return { A: sys.md.J, B: matmul(Ti, sys.ss.B), z0: matvec(Ti, x0), Ti };
  }, [sys.md, sys.ss, x0, n]);
  const modalEig: EigLine[] = sys.md.ok ? sys.md.blocks.filter((b) => b.kind === 'real').map((b, i) => ({
    v: sys.md.J.map((_, k) => (k === b.start ? 1 : 0)), color: modeColors[(i + 1) % modeColors.length], label: `λ = ${fmt(b.lambda.re)}`,
  })) : [];

  const fitKey = `${st.fitKey}-${sys.kind}-${sys.realization}-${n}`;
  const lab = (i: number) => sys.stateTex[i];

  if (n < 2) {
    return <div className="tab"><Box kind="idea" title={t('idea')}>{t('ph.n1')}</Box>
      <Plot height={260} series={[{ x: sim.t, y: sim.x.map((r) => r[0]), color: modeColors[0], label: `${lab(0)}(t)` }]} xLabel="t\;[\mathrm{s}]" /></div>;
  }

  return (
    <div className="tab tab-phase">
      <Box kind="idea" title={t('idea')}>{t('ph.idea')}</Box>
      <div className="phase-layout">
        <div className={`phase-planes ${opt.modal && modalSys ? 'two' : ''}`}>
          <PhasePlane A={sys.ss.A} B={sys.ss.B} ix={ix} iy={iy} x0={x0} onX0={setX0} u={u} horizon={T} showField={opt.field} showFamily={opt.family}
            eig={eig} labels={[lab(ix), lab(iy)]} tAnim={anim.t} fitKey={fitKey} family={family} onFamilyAdd={(x) => setFamily([...family, x])}
            title={opt.modal && modalSys ? <>{t('ph.origCoords')} <Tex tex={`(${lab(ix)}, ${lab(iy)})`} /></> : undefined} />
          {opt.modal && modalSys && (
            <PhasePlane A={modalSys.A} B={modalSys.B} ix={ix} iy={iy} x0={modalSys.z0} onX0={(z) => setX0(matvec(sys.md.T, z))} u={u} horizon={T}
              showField={opt.field} showFamily={opt.family} eig={opt.eig ? modalEig : []} labels={[`z_{${ix + 1}}`, `z_{${iy + 1}}`]} tAnim={anim.t} fitKey={fitKey}
              title={<>{t('ph.modalCoords')} <Tex tex="\mathbf{z} = \mathbf{T}^{-1}\mathbf{x}" /></>} />
          )}
        </div>
        <div className="phase-side">
          <Box kind="gray" title={t('ph.controls')}>
            {n > 2 && (
              <div className="row">{t('ph.axes')}
                <select value={ix} onChange={(e) => setAxes([+e.target.value, iy])}>{sys.stateTex.map((s, i) => <option key={i} value={i}>{s.replace(/[_{}]/g, '')}</option>)}</select>
                <select value={iy} onChange={(e) => setAxes([ix, +e.target.value])}>{sys.stateTex.map((s, i) => <option key={i} value={i}>{s.replace(/[_{}]/g, '')}</option>)}</select>
                <span className="hint">{t('ph.projection')}</span>
              </div>
            )}
            <div className="checks">
              <Check label={t('ph.field')} checked={opt.field} onChange={(v) => setOpt({ ...opt, field: v })} />
              <Check label={t('ph.family')} checked={opt.family} onChange={(v) => setOpt({ ...opt, family: v })} />
              <Check label={t('ph.eigLines')} checked={opt.eig} onChange={(v) => setOpt({ ...opt, eig: v })} />
              <Check label={t('ph.sideModal')} checked={opt.modal} disabled={!modalSys} onChange={(v) => setOpt({ ...opt, modal: v })} />
            </div>
            <Slider label={<Tex tex={`u = \\text{${t('ph.const')}}`} />} value={uc} min={-3} max={3} step={0.1} onChange={(v) => setUc(+v.toFixed(1))} fmtV={(v) => fmt(v)} />
            <Slider label={t('ph.horizon')} value={hMul} min={0.25} max={4} log onChange={setHMul} fmtV={() => `${fmt(T, 3)} s`} />
            <div className="row x0row"><Tex tex="\mathbf{x}(0) =" />
              {x0.map((v, i) => <NumInput key={i} value={v} onChange={(nv) => setX0(x0.map((w, k) => (k === i ? nv : w)))} width={56} />)}
            </div>
            <div className="row btns">
              {sys.md.rightVecs.filter((r) => r.lambda.im === 0).map((r, i) => (
                <button key={i} className="small" onClick={() => { const v = r.v.map((z) => z.re); const s = 1 / Math.max(...v.map(Math.abs)); setX0(v.map((w) => +(w * s).toFixed(4))); }}>
                  <Tex tex={`\\mathbf{x}(0)\\parallel\\mathbf{v}_{${i + 1}}`} />
                </button>
              ))}
              <button className="small" onClick={() => setFamily([])} disabled={!family.length}>{t('ph.clear')}</button>
            </div>
            <div className="row btns">
              {anim.playing ? <button onClick={anim.pause}>❚❚ {t('ph.pause')}</button> : <button onClick={anim.play}>▶ {t('ph.play')}</button>}
              <button onClick={anim.reset}>↺</button>
              {anim.t != null && <span className="muted">t = {fmt(anim.t, 3)} s</span>}
            </div>
            <p className="hint">{t('ph.help')}</p>
          </Box>
          {n === 2 ? (
            <Box kind="blue" title={t('ph.traceDet')}><TraceDet A={sys.ss.A} width={330} /><p className="hint">{t('ph.tdHint')}</p></Box>
          ) : (
            <Box kind="blue" title={t('ph.eigs')}>
              <Tex tex={sys.md.eig.map((z) => texComplex(z)).join(',\\ ')} />
            </Box>
          )}
        </div>
      </div>
      <Box kind="plain" title={t('ph.timeTitle')} right={<Check label={t('ph.decomp', { x: '' })} checked={opt.decomp} disabled={!contrib.length} onChange={(v) => setOpt({ ...opt, decomp: v })} />}>
        <Plot height={230} cursorX={anim.t ?? undefined} xLabel="t\;[\mathrm{s}]"
          series={[
            ...x0.map((_, i) => ({ x: sim.t, y: sim.x.map((r) => r[i]), color: modeColors[i], label: `${lab(i)}(t)`, width: 2.2 })),
            ...(opt.decomp ? contrib.map((c, k) => ({ x: sim.t, y: c.x.map((r) => r[ix]), color: modeColors[(k + 1) % modeColors.length], dash: '5 4', width: 1.4, label: `${lab(ix)}^{(${k + 1})}`, opacity: 0.9 })) : []),
          ]} />
        {opt.decomp && contrib.length > 0 && <p className="hint">{t('ph.decompHint', { x: lab(ix) })} <Tex tex={`\\mathbf{z}(0) = \\mathbf{T}^{-1}\\mathbf{x}(0) = [${matvec(inv(sys.md.T)!, x0).map((v) => tn(v)).join(',\\ ')}]^{\\mathsf T}`} /></p>}
      </Box>
    </div>
  );
}

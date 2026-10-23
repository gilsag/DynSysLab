import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { useT } from '../i18n';
import { Box, Check, MatrixGrid, NumInput, Seg, Slider, Tex, modeColors, Rich } from '../components/basic';
import { Plot } from '../components/Plot';
import { simulate, suggestHorizon, modalContributions, tfPair, evalTF, taylorExp, Modal } from '../math/ss';
import { expm, inv, matvec, mscale, Vec, frob, msub } from '../math/linalg';
import { cabs } from '../math/complex';
import { fmt, tn, round } from '../format';
import { zerosOf } from '../model';

type Mode = 'free' | 'step' | 'impulse' | 'sine' | 'bode' | 'expm';

/** Expresión cerrada de x_i(t) para la respuesta libre. */
function freeExprTex(md: Modal, x0: Vec, i: number, name: string): string | null {
  if (!md.ok) return null;
  const Ti = inv(md.T)!;
  const z0 = matvec(Ti, x0);
  const terms: string[] = [];
  const num = (c: number, first: boolean) => { const r = round(c, 4); if (r === 0) return null; return `${r < 0 ? '-' : first ? '' : '+'}${tn(Math.abs(r))}`; };
  for (const b of md.blocks) {
    const lam = b.lambda;
    const ex = round(lam.re) === 0 ? '' : `e^{${tn(lam.re)}t}`;
    if (b.kind === 'real') {
      const c = num(md.T[i][b.start] * z0[b.start], !terms.length);
      if (c) terms.push(ex ? `${c}${ex}`.replace(/^([+-]?)1e/, '$1e') : c);
    } else if (b.kind === 'complex') {
      // contribución: T_b e^{J t} z_b, con J = [[α,−β],[β,α]] → e^{αt}[ (T_i0 za + T_i1 zb) cos βt + (T_i1 za − T_i0 zb) sin βt ]
      const za = z0[b.start], zb = z0[b.start + 1];
      const t0 = md.T[i][b.start], t1 = md.T[i][b.start + 1];
      const cc = t0 * za + t1 * zb, cs = t1 * za - t0 * zb;
      const beta = tn(Math.abs(lam.im));
      const parts: string[] = [];
      if (round(cc) !== 0) parts.push(`${tn(cc)}\\cos ${beta}t`);
      if (round(cs) !== 0) parts.push(`${round(cs) < 0 || !parts.length ? '' : '+'}${tn(cs)}\\sin ${beta}t`);
      if (parts.length) terms.push(`${terms.length ? '+' : ''}${ex}\\left(${parts.join(' ')}\\right)`);
    } else if (b.kind === 'jordan-real') {
      // e^{λt} Σ_k t^k/k! (T_b N^k z_b)_i
      const m = b.size;
      const coeffs: number[] = [];
      for (let k = 0; k < m; k++) {
        let s = 0;
        for (let j = 0; j + k < m; j++) s += md.T[i][b.start + j] * z0[b.start + j + k];
        let f = 1; for (let q = 2; q <= k; q++) f *= q;
        coeffs.push(s / f);
      }
      const poly = coeffs.map((c, k) => (round(c) === 0 ? '' : `${round(c) < 0 ? '-' : '+'}${tn(Math.abs(c))}${k ? (k === 1 ? 't' : `t^{${k}}`) : ''}`)).filter(Boolean).join('').replace(/^\+/, '');
      if (poly) terms.push(`${terms.length ? '+' : ''}\\left(${poly}\\right)${ex}`);
    } else return null;
  }
  return `${name}(t) = ${terms.join(' ') || '0'}`;
}

export function TabResp() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('free');
  const [inp, setInp] = useState(0);
  const [out, setOut] = useState(0);
  const [hMul, setHMul] = useState(1);
  const [decomp, setDecomp] = useState(true);
  const [w0, setW0] = useState(2);
  const [tE, setTE] = useState(1);
  const [NE, setNE] = useState(3);
  const j = Math.min(inp, sys.m - 1), o = Math.min(out, sys.p - 1);
  const T = suggestHorizon(sys.md.eig) * hMul;
  const x0 = st.x0;
  const zeroU = () => sys.ss.B[0].map(() => 0);

  const sim = useMemo(() => {
    const e = sys.ss.B[0].map((_, k) => (k === j ? 1 : 0));
    if (mode === 'free') return simulate(sys.ss, x0, zeroU, T, 500);
    if (mode === 'step') return simulate(sys.ss, sys.ss.A.map(() => 0), () => e, T, 500);
    if (mode === 'impulse') return simulate(sys.ss, sys.ss.B.map((r) => r[j]), zeroU, T, 500);
    return simulate(sys.ss, sys.ss.A.map(() => 0), (tt) => e.map((v) => v * Math.sin(w0 * tt)), Math.max(T, (6 * 2 * Math.PI) / w0), 800);
  }, [sys.ss, mode, x0, T, j, w0]);
  const contrib = useMemo(() => (mode === 'free' && sys.md.ok ? modalContributions(sys.md, x0, sim.t) : []), [mode, sys.md, x0, sim.t]);

  const finalVal = useMemo(() => {
    if (mode !== 'step') return null;
    const Ai = inv(sys.ss.A);
    if (!Ai || sys.md.eig.some((z) => z.re >= -1e-12)) return null;
    const xs = matvec(Ai, sys.ss.B.map((r) => r[j])).map((v) => -v);
    return sys.ss.C.map((row, k) => row.reduce((a, c, q) => a + c * xs[q], 0) + (sys.ss.D[k]?.[j] ?? 0));
  }, [mode, sys, j]);

  const bode = useMemo(() => {
    if (mode !== 'bode' && mode !== 'sine') return null;
    const tf = tfPair(sys.ss, o, j);
    const z = zerosOf(tf);
    const brk = [...sys.md.eig, ...z].map(cabs).filter((v) => v > 1e-6);
    const lo = Math.min(0.1, ...brk.map((b) => b / 20)), hi = Math.max(10, ...brk.map((b) => b * 20));
    const w: number[] = [], mag: number[] = [], ph: number[] = [];
    let prev = 0, off = 0;
    for (let k = 0; k <= 400; k++) {
      const om = lo * Math.pow(hi / lo, k / 400);
      const g = evalTF(tf, om);
      w.push(om); mag.push(20 * Math.log10(Math.max(cabs(g), 1e-12)));
      let p = (Math.atan2(g.im, g.re) * 180) / Math.PI;
      if (k) { while (p + off - prev > 180) off -= 360; while (p + off - prev < -180) off += 360; }
      prev = p + off; ph.push(prev);
    }
    return { w, mag, ph, brk: [...sys.md.eig.filter((e) => e.im >= 0).map((e) => ({ x: cabs(e), c: 'var(--c-pole)' })), ...z.filter((e) => e.im >= 0).map((e) => ({ x: cabs(e), c: 'var(--c-zero)' }))].filter((b) => b.x > 1e-6), tf };
  }, [mode, sys, o, j]);

  const sel = (
    <span className="row">
      {sys.m > 1 && <>{t('resp.input')} <select value={j} onChange={(e) => setInp(+e.target.value)}>{sys.inputTex.map((_, k) => <option key={k} value={k}>u{k + 1}</option>)}</select></>}
      {sys.p > 1 && (mode === 'bode' || mode === 'sine') && <>{t('resp.output')} <select value={o} onChange={(e) => setOut(+e.target.value)}>{sys.outputTex.map((_, k) => <option key={k} value={k}>y{k + 1}</option>)}</select></>}
    </span>
  );

  return (
    <div className="tab tab-resp">
      <Box kind="idea" title={t('idea')}>{t(`resp.idea.${mode}` as never)}</Box>
      <div className="toolbar">
        <Seg value={mode} onChange={setMode} options={[
          { v: 'free', label: t('resp.free') }, { v: 'step', label: t('resp.step') }, { v: 'impulse', label: t('resp.impulse') },
          { v: 'sine', label: t('resp.sine') }, { v: 'bode', label: t('resp.bode') }, { v: 'expm', label: <Tex tex="e^{\mathbf{A}t}" /> },
        ]} />
        {mode !== 'bode' && mode !== 'expm' && <Slider label={t('ph.horizon')} value={hMul} min={0.25} max={4} log onChange={setHMul} fmtV={() => `${fmt(T, 3)} s`} />}
        {sel}
      </div>

      {mode === 'free' && (
        <div className="two wide-left">
          <div>
            <Box kind="plain" title={t('resp.states')} right={<Check label={t('resp.decomp')} checked={decomp} onChange={setDecomp} disabled={!contrib.length} />}>
              {x0.map((_, i) => (
                <Plot key={i} height={170} xLabel="t\;[\mathrm{s}]" series={[
                  { x: sim.t, y: sim.x.map((r) => r[i]), color: modeColors[i % 8], label: `${sys.stateTex[i]}(t)`, width: 2.4 },
                  ...(decomp ? contrib.map((c, k) => ({ x: sim.t, y: c.x.map((r) => r[i]), color: modeColors[(k + 1) % 8], dash: '5 4', width: 1.4, label: `${sys.stateTex[i]}^{(${k + 1})}`, opacity: 0.9 })) : []),
                ]} />
              ))}
            </Box>
            <Box kind="plain" title={t('resp.output')}>
              <Plot height={160} xLabel="t\;[\mathrm{s}]" series={sys.outputTex.map((y, k) => ({ x: sim.t, y: sim.y.map((r) => r[k]), color: modeColors[k + 3], label: `${y}(t)` }))} />
            </Box>
          </div>
          <div>
            <Box kind="gray" title={t('resp.ic')}>
              <div className="row x0row"><Tex tex="\mathbf{x}(0) =" />{x0.map((v, i) => <NumInput key={i} value={v} onChange={(nv) => set({ x0: x0.map((w, k) => (k === i ? nv : w)) })} width={56} />)}</div>
              <Tex display tex="\mathbf{x}(t) = e^{\mathbf{A}t}\mathbf{x}(0) = \sum_k \mathbf{v}_k\, z_k(0)\, e^{\lambda_k t}" />
            </Box>
            <Box kind="blue" title={t('resp.closed')}>
              {sys.md.ok ? (
                <>
                  <Tex display tex={`\\mathbf{z}(0) = \\mathbf{T}^{-1}\\mathbf{x}(0) = [${matvec(inv(sys.md.T)!, x0).map((v) => tn(v)).join(',\\ ')}]^{\\mathsf T}`} />
                  {x0.map((_, i) => { const e = freeExprTex(sys.md, x0, i, sys.stateTex[i]); return e ? <Tex key={i} display tex={e} /> : null; })}
                  <p className="hint">{t('resp.closedTry')}</p>
                </>
              ) : <p className="hint warn">{t('real.noModal')}</p>}
            </Box>
          </div>
        </div>
      )}

      {(mode === 'step' || mode === 'impulse' || mode === 'sine') && (
        <div className="two">
          <Box kind="plain" title={t('resp.output')}>
            <Plot height={300} xLabel="t\;[\mathrm{s}]" hlines={finalVal?.map((v, k) => ({ y: v, color: modeColors[k + 3] }))} series={[
              ...sys.outputTex.map((y, k) => ({ x: sim.t, y: sim.y.map((r) => r[k]), color: modeColors[k + 3], label: `${y}(t)`, width: 2.4 })),
              ...(mode === 'sine' ? [{ x: sim.t, y: sim.u.map((r) => r[j]), color: 'var(--c-input)', label: `u(t)`, dash: '4 3', width: 1.3 }] : []),
            ]} />
            {finalVal && <p className="hint"><Tex tex={`y(\\infty) = -\\mathbf{C}\\mathbf{A}^{-1}\\mathbf{B} + \\mathbf{D} = ${finalVal.map((v) => tn(v)).join(',\\ ')}`} /></p>}
            {mode === 'impulse' && <p className="hint">{t('resp.impulseHint')}</p>}
            {mode === 'sine' && (
              <>
                <Slider label={<Tex tex="\omega" />} value={w0} min={0.05} max={50} log onChange={setW0} fmtV={(v) => `${fmt(v, 3)} rad/s`} />
                {bode && (() => { const g = evalTF(bode.tf, w0); return <p className="hint"><Tex tex={`|G(j\\omega)| = ${tn(cabs(g))},\\quad \\angle G(j\\omega) = ${tn((Math.atan2(g.im, g.re) * 180) / Math.PI)}^\\circ`} /> {t('resp.sineHint')}</p>; })()}
              </>
            )}
          </Box>
          <Box kind="plain" title={t('resp.states')}>
            <Plot height={300} xLabel="t\;[\mathrm{s}]" series={sys.stateTex.map((s, i) => ({ x: sim.t, y: sim.x.map((r) => r[i]), color: modeColors[i % 8], label: `${s}(t)` }))} />
          </Box>
        </div>
      )}

      {mode === 'bode' && bode && (
        <div className="two">
          <Box kind="plain" title={<>{t('resp.mag')} <Tex tex={`|G_{${o + 1}${j + 1}}(j\\omega)|`} /></>}>
            <Plot height={280} logX xLabel="\omega\;[\mathrm{rad/s}]" yLabel="\mathrm{dB}" series={[{ x: bode.w, y: bode.mag, color: 'var(--s1)', label: '|G|_{\\mathrm{dB}}' }]}
              vlines={bode.brk.map((b) => ({ x: b.x, color: b.c }))} />
          </Box>
          <Box kind="plain" title={<>{t('resp.phase')} <Tex tex={`\\angle G(j\\omega)`} /></>}>
            <Plot height={280} logX xLabel="\omega\;[\mathrm{rad/s}]" yLabel="^\circ" series={[{ x: bode.w, y: bode.ph, color: 'var(--s2)', label: '\\angle G' }]}
              vlines={bode.brk.map((b) => ({ x: b.x, color: b.c }))} />
            <p className="hint">{t('resp.bodeHint')}</p>
          </Box>
        </div>
      )}

      {mode === 'expm' && <ExpmPanel tE={tE} setTE={setTE} NE={NE} setNE={setNE} />}
    </div>
  );
}

function ExpmPanel({ tE, setTE, NE, setNE }: { tE: number; setTE: (v: number) => void; NE: number; setNE: (v: number) => void }) {
  const { sys } = useApp();
  const { t } = useT();
  const A = sys.ss.A;
  const E = expm(mscale(A, tE));
  const S = taylorExp(A, tE, NE);
  const W = A.map((r) => r.map((a) => Math.exp(a * tE)));
  const errS = frob(msub(E, S)) / Math.max(frob(E), 1e-12);
  const errW = frob(msub(E, W)) / Math.max(frob(E), 1e-12);
  const Tmax = Math.min(suggestHorizon(sys.md.eig), 10);
  const ts = Array.from({ length: 201 }, (_, k) => (k / 200) * Tmax);
  const entries = ts.map((tt) => expm(mscale(A, tt)));
  const tays = ts.map((tt) => taylorExp(A, tt, NE));
  const md = sys.md;
  const diagForm = md.ok && md.diagonalizable && md.blocks.every((b) => b.kind === 'real');
  return (
    <div className="two">
      <div>
        <Box kind="gray" title={t('expm.compare')}>
          <Slider label={<Tex tex="t" />} value={tE} min={0} max={Tmax} step={Tmax / 200} onChange={setTE} fmtV={(v) => `${fmt(v, 3)} s`} />
          <Slider label={<Tex tex="N" />} value={NE} min={0} max={20} step={1} onChange={(v) => setNE(Math.round(v))} fmtV={(v) => String(Math.round(v))} />
          <div className="mats4">
            <MatrixGrid M={E} label="e^{\mathbf{A}t}" highlight={false} />
            <MatrixGrid M={S} label={`\\sum_{k=0}^{${NE}}\\tfrac{(\\mathbf{A}t)^k}{k!}`} highlight={false} />
          </div>
          <p className="hint"><Tex tex={`\\|e^{\\mathbf{A}t}-S_N\\|/\\|e^{\\mathbf{A}t}\\| = ${tn(errS, 3)}`} /></p>
          <div className="mats4"><MatrixGrid M={W} label="[e^{a_{ij}t}]" highlight={false} /></div>
          <p className="hint warn"><Tex tex={`\\|e^{\\mathbf{A}t}-[e^{a_{ij}t}]\\|/\\|e^{\\mathbf{A}t}\\| = ${tn(errW, 3)}`} /> {t('expm.wrong')}</p>
          {diagForm && <Tex display tex={`e^{\\mathbf{A}t} = \\mathbf{V}\\,\\mathrm{diag}(${md.blocks.map((b) => `e^{${tn(b.lambda.re)}t}`).join(',')})\\,\\mathbf{V}^{-1}`} />}
          <p className="hint"><Rich text={t('expm.props')} /></p>
        </Box>
      </div>
      <Box kind="plain" title={t('expm.entries')}>
        <Plot height={330} xLabel="t\;[\mathrm{s}]" cursorX={tE} series={[
          ...A.flatMap((r, i) => r.map((_, k) => ({ x: ts, y: entries.map((M) => M[i][k]), color: modeColors[(i * A.length + k) % 8], label: `\\Phi_{${i + 1}${k + 1}}`, width: 2.2 }))),
          ...A.flatMap((r, i) => r.map((_, k) => ({ x: ts, y: tays.map((M) => M[i][k]), color: modeColors[(i * A.length + k) % 8], dash: '4 4', width: 1.2, hideHover: true }))),
        ]} yRange={(() => { const all = entries.flat(2); const m = Math.max(1, ...all.map(Math.abs)); return [-m * 1.15, m * 1.15] as [number, number]; })()} />
        <p className="hint">{t('expm.entriesHint', { N: NE })}</p>
      </Box>
    </div>
  );
}


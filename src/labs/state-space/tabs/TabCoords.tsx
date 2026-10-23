import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state';
import { useT } from '../i18n';
import { Box, MatrixGrid, Seg, Slider, Tex, modeColors, useWidth, Rich } from '../components/basic';
import { PhasePlane } from '../components/PhasePlane';
import { niceTicks } from '../components/Plot';
import { Mat, Vec, eye, inv, matmul, matvec, det, trace } from '../math/linalg';
import { transform, eigenvalues, ccf, ocf, ctrb, obsv, tfPair, cleanMat, suggestHorizon } from '../math/ss';
import { fmt, texComplex, texPoly, texMatrix } from '../format';
import { eigLinesFor } from './TabPhase';

function CoordCanvas({ T, setT, p, setP, A, mode, s }: { T: Mat; setT: (T: Mat) => void; p: Vec; setP: (p: Vec) => void; A: Mat; mode: 'basis' | 'action'; s: number }) {
  const { t } = useT();
  const [ref, W0] = useWidth<HTMLDivElement>(560);
  const W = Math.min(W0, 620), H = W;
  const [r, setR] = useState(3);
  // en modo activo la vista se amplía para contener la imagen del círculo unitario
  const Mfull = [[1 - s + s * A[0][0], s * A[0][1]], [s * A[1][0], 1 - s + s * A[1][1]]];
  const stretch = Math.max(Math.hypot(Mfull[0][0], Mfull[1][0]), Math.hypot(Mfull[0][1], Mfull[1][1]), Math.hypot(Mfull[0][0] + Mfull[0][1], Mfull[1][0] + Mfull[1][1]));
  const rv = mode === 'action' ? Math.max(r, 1.2 * stretch) : r;
  const sc = W / (2 * rv);
  const X = (x: number) => W / 2 + x * sc, Y = (y: number) => H / 2 - y * sc;
  const toW = (px: number, py: number) => [(px - W / 2) / sc, -(py - H / 2) / sc];
  const drag = useRef<null | 't1' | 't2' | 'p'>(null);
  const svg = useRef<SVGSVGElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const b = svg.current!.getBoundingClientRect();
    let [x, y] = toW(e.clientX - b.left, e.clientY - b.top);
    if (!e.altKey) { x = Math.round(x * 10) / 10; y = Math.round(y * 10) / 10; }
    if (drag.current === 'p') setP([x, y]);
    else {
      const k = drag.current === 't1' ? 0 : 1;
      const nT = T.map((row) => row.slice());
      nT[0][k] = x; nT[1][k] = y;
      setT(nT);
    }
  };
  const ticks = niceTicks(-rv, rv, 6);
  const Ti = inv(T);
  const z = Ti ? matvec(Ti, p) : [NaN, NaN];
  const t1 = [T[0][0], T[1][0]], t2 = [T[0][1], T[1][1]];
  const arrow = (a: Vec, b: Vec, cls: string, key: string, markId: string) => <line key={key} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} className={cls} markerEnd={`url(#${markId})`} />;
  // matriz de la transformación activa interpolada
  const M = [[1 - s + s * A[0][0], s * A[0][1]], [s * A[1][0], 1 - s + s * A[1][1]]];
  const mv = (v: Vec) => matvec(M, v);
  const gridLines: JSX.Element[] = [];
  const K = mode === 'action' ? 3 : Math.ceil(rv) + 1;
  if (mode === 'basis' && Ti) {
    for (let k = -3 * K; k <= 3 * K; k++) {
      const a1 = [k * t1[0] - 20 * t2[0], k * t1[1] - 20 * t2[1]], b1 = [k * t1[0] + 20 * t2[0], k * t1[1] + 20 * t2[1]];
      const a2 = [k * t2[0] - 20 * t1[0], k * t2[1] - 20 * t1[1]], b2 = [k * t2[0] + 20 * t1[0], k * t2[1] + 20 * t1[1]];
      gridLines.push(<line key={`g1${k}`} x1={X(a1[0])} y1={Y(a1[1])} x2={X(b1[0])} y2={Y(b1[1])} className="zgrid1" />);
      gridLines.push(<line key={`g2${k}`} x1={X(a2[0])} y1={Y(a2[1])} x2={X(b2[0])} y2={Y(b2[1])} className="zgrid2" />);
    }
  }
  if (mode === 'action') {
    for (let k = -K; k <= K; k++) {
      const pts1 = [mv([k, -K]), mv([k, K])], pts2 = [mv([-K, k]), mv([K, k])];
      gridLines.push(<line key={`a1${k}`} x1={X(pts1[0][0])} y1={Y(pts1[0][1])} x2={X(pts1[1][0])} y2={Y(pts1[1][1])} className="agrid" />);
      gridLines.push(<line key={`a2${k}`} x1={X(pts2[0][0])} y1={Y(pts2[0][1])} x2={X(pts2[1][0])} y2={Y(pts2[1][1])} className="agrid" />);
    }
  }
  const circ = Array.from({ length: 97 }, (_, k) => { const th = (2 * Math.PI * k) / 96; const q = mv([Math.cos(th), Math.sin(th)]); return `${k ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`; }).join('');
  const sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map((v) => mv(v)).map((q) => `${X(q[0])},${Y(q[1])}`).join(' ');
  const eigs = eigenvalues(A).filter((e) => e.im === 0);
  return (
    <div className="coordcanvas" ref={ref}>
      <svg ref={svg} width={W} height={H} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}
        onWheel={(e) => setR((v) => Math.min(Math.max(v * Math.exp(e.deltaY * 0.0012), 0.5), 50))}>
        <defs>
          {[['m1', 'var(--s3)'], ['m2', 'var(--s3)'], ['mx', 'var(--s1)'], ['mr', 'var(--s2)'], ['mg', 'var(--muted)']].map(([id, c]) => (
            <marker key={id} id={`cc-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path style={{ fill: c }} d="M0,0 L10,5 L0,10 z" /></marker>
          ))}
        </defs>
        {ticks.map((v) => <line key={`x${v}`} x1={X(v)} x2={X(v)} y1={0} y2={H} className="grid" />)}
        {ticks.map((v) => <line key={`y${v}`} y1={Y(v)} y2={Y(v)} x1={0} x2={W} className="grid" />)}
        <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} className="axis" />
        <line y1={0} y2={H} x1={X(0)} x2={X(0)} className="axis" />
        {ticks.map((v) => v !== 0 && <text key={`tx${v}`} x={X(v)} y={Y(0) + 14} className="tick" textAnchor="middle">{fmt(v)}</text>)}
        {ticks.map((v) => v !== 0 && <text key={`ty${v}`} x={X(0) - 5} y={Y(v) + 4} className="tick" textAnchor="end">{fmt(v)}</text>)}
        {gridLines}
        {mode === 'basis' && Ti && (
          <g>
            <line x1={X(0)} y1={Y(0)} x2={X(z[0] * t1[0])} y2={Y(z[0] * t1[1])} className="zcomp" markerEnd="url(#cc-mg)" />
            <line x1={X(z[0] * t1[0])} y1={Y(z[0] * t1[1])} x2={X(p[0])} y2={Y(p[1])} className="zcomp" markerEnd="url(#cc-mg)" />
            <line x1={X(z[1] * t2[0])} y1={Y(z[1] * t2[1])} x2={X(p[0])} y2={Y(p[1])} className="zcomp light" />
            <line x1={X(0)} y1={Y(0)} x2={X(z[1] * t2[0])} y2={Y(z[1] * t2[1])} className="zcomp light" />
            <text x={X(z[0] * t1[0] / 2) + 4} y={Y(z[0] * t1[1] / 2) + 16} className="zlab">z₁t₁</text>
            <text x={X(z[0] * t1[0] + z[1] * t2[0] / 2) + 6} y={Y(z[0] * t1[1] + z[1] * t2[1] / 2)} className="zlab">z₂t₂</text>
            {arrow([0, 0], t1, 'tvec', 't1', 'cc-m1')}
            {arrow([0, 0], t2, 'tvec', 't2', 'cc-m2')}
            {arrow([0, 0], p, 'xvec', 'xv', 'cc-mx')}
            <circle cx={X(t1[0])} cy={Y(t1[1])} r={9} className="handle" onPointerDown={(e) => { drag.current = 't1'; (e.target as Element).setPointerCapture(e.pointerId); }} />
            <circle cx={X(t2[0])} cy={Y(t2[1])} r={9} className="handle" onPointerDown={(e) => { drag.current = 't2'; (e.target as Element).setPointerCapture(e.pointerId); }} />
            <circle cx={X(p[0])} cy={Y(p[1])} r={8} className="handle x" onPointerDown={(e) => { drag.current = 'p'; (e.target as Element).setPointerCapture(e.pointerId); }} />
            <text x={X(t1[0]) + 10} y={Y(t1[1]) - 8} className="tlab">t₁</text>
            <text x={X(t2[0]) + 10} y={Y(t2[1]) - 8} className="tlab">t₂</text>
            <text x={X(p[0]) + 10} y={Y(p[1]) - 10} className="xlab">x</text>
          </g>
        )}
        {mode === 'action' && (
          <g>
            <polygon points={sq} className="usq" />
            <path d={circ} className="ucirc" />
            {eigs.map((e, i) => {
              const Mx = [[A[0][0] - e.re, A[0][1]], [A[1][0], A[1][1] - e.re]];
              const v = Math.abs(Mx[0][1]) + Math.abs(Mx[0][0]) > 1e-9 ? [-Mx[0][1], Mx[0][0]] : [-Mx[1][1], Mx[1][0]];
              const nv = Math.hypot(v[0], v[1]) || 1;
              const L = 2 * rv;
              return <g key={i}><line style={{ stroke: modeColors[(i + 1) % modeColors.length] }} x1={X((-L * v[0]) / nv)} y1={Y((-L * v[1]) / nv)} x2={X((L * v[0]) / nv)} y2={Y((L * v[1]) / nv)} strokeDasharray="7 4" strokeWidth={1.6} />
                <text style={{ fill: modeColors[(i + 1) % modeColors.length] }} x={X((0.8 * rv * v[0]) / nv) + 6} y={Y((0.8 * rv * v[1]) / nv) - 6} className="eiglabel">λ = {fmt(e.re)}</text></g>;
            })}
            {arrow([0, 0], mv([1, 0]), 'avec1', 'e1', 'cc-mx')}
            {arrow([0, 0], mv([0, 1]), 'avec2', 'e2', 'cc-mr')}
            <text x={X(mv([1, 0])[0]) + 6} y={Y(mv([1, 0])[1]) + 14} className="xlab">{s === 0 ? 'e₁' : 'Ae₁'}</text>
            <text x={X(mv([0, 1])[0]) + 6} y={Y(mv([0, 1])[1]) - 6} className="xlab red">{s === 0 ? 'e₂' : 'Ae₂'}</text>
          </g>
        )}
      </svg>
      <p className="hint">{mode === 'basis' ? t('co.dragHint') : t('co.actionHint')}</p>
    </div>
  );
}

export function TabCoords() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const n = sys.n;
  const [T, setT] = useState<Mat>(eye(n));
  const [p, setP] = useState<Vec>([1, 1]);
  const [mode, setMode] = useState<'basis' | 'action'>('basis');
  const [s, setS] = useState(1);
  useEffect(() => { setT(eye(n)); }, [n, sys.realization, sys.kind]);
  const Tn = T.length === n ? T : eye(n);
  const z = useMemo(() => transform(sys.ss, Tn), [sys.ss, Tn]);
  const Ti = inv(Tn);

  const siso = sys.m === 1 && sys.p === 1;
  const presets: { key: string; T: () => Mat | null }[] = [
    { key: 'co.pI', T: () => eye(n) },
    { key: 'co.pModal', T: () => (sys.md.ok ? sys.md.T : null) },
    ...(n === 2 ? [
      { key: 'co.pRot', T: () => [[Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6)], [Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)]] },
      { key: 'co.pShear', T: () => [[1, 0.5], [0, 1]] },
      { key: 'co.pSwap', T: () => [[0, 1], [1, 0]] },
      { key: 'co.pScale', T: () => [[2, 0], [0, 0.5]] },
    ] : []),
    { key: 'co.pCCF', T: () => { if (!siso) return null; const c = ccf(tfPair(sys.ss)); const Ci = inv(ctrb(c.A, c.B)); return Ci ? matmul(ctrb(sys.ss.A, sys.ss.B), Ci) : null; } },
    { key: 'co.pOCF', T: () => { if (!siso) return null; const o = ocf(tfPair(sys.ss)); const Oi = inv(obsv(sys.ss.A, sys.ss.C)); return Oi ? matmul(Oi, obsv(o.A, o.C)) : null; } },
  ];
  const applyPreset = (k: number) => { const M = presets[k].T(); if (M && inv(M)) setT(M.map((r) => r.map((v) => +v.toFixed(6)))); };

  const eA = sys.md.eig, eZ = z ? eigenvalues(z.A, sys.poleHint) : [];
  const tfX = siso ? tfPair(sys.ss) : null, tfZ = siso && z ? tfPair(z) : null;
  const H = suggestHorizon(eA);
  const fitKey = `${st.fitKey}-${n}-${sys.realization}`;
  const zsys = z ? { ...z, A: cleanMat(z.A, 1e-9) } : null;

  return (
    <div className="tab tab-coords">
      <Box kind="idea" title={t('idea')}><Rich text={t('co.idea')} /></Box>
      <div className="coords-layout">
        <div className="coords-left">
          {n === 2 ? (
            <>
              <div className="toolbar">
                <Seg value={mode} onChange={setMode} options={[{ v: 'basis', label: <>{t('co.modeBasis')} <Tex tex="\mathbf{x}=\mathbf{T}\mathbf{z}" /></> }, { v: 'action', label: <>{t('co.modeAction')} <Tex tex="\mathbf{x}\mapsto\mathbf{A}\mathbf{x}" /></> }]} />
                {mode === 'action' && <Slider label={<Tex tex="s" />} value={s} min={0} max={1} step={0.01} onChange={setS} fmtV={(v) => fmt(v, 2)} />}
              </div>
              <CoordCanvas T={Tn} setT={setT} p={p} setP={setP} A={sys.ss.A} mode={mode} s={s} />
              {mode === 'action' && <p className="hint"><Tex tex={`\\mathbf{M}(s) = (1-s)\\mathbf{I} + s\\mathbf{A} = ${texMatrix([[1 - s + s * sys.ss.A[0][0], s * sys.ss.A[0][1]], [s * sys.ss.A[1][0], 1 - s + s * sys.ss.A[1][1]]])}`} /> {t('co.actionNote')}</p>}
            </>
          ) : (
            <Box kind="gray" title={t('co.editT')}>
              <table className="mat edit"><tbody>
                {Tn.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}><input value={String(+v.toFixed(4))} onChange={(e) => { const x = parseFloat(e.target.value.replace(',', '.')); if (isFinite(x)) setT(Tn.map((rr, ii) => rr.map((vv, jj) => (ii === i && jj === j ? x : vv)))); }} /></td>)}</tr>)}
              </tbody></table>
              <p className="hint">{t('co.nGt2')}</p>
            </Box>
          )}
          <div className="row btns presets-row">
            <span>{t('co.presets')}</span>
            {presets.map((pr, k) => <button key={pr.key} className="small" onClick={() => applyPreset(k)} disabled={!pr.T()}>{t(pr.key as never)}</button>)}
          </div>
        </div>
        <div className="coords-right">
          <Box kind="gray" title={t('co.matrices')}>
            {!Ti ? <p className="warn">{t('co.singular')}</p> : (
              <>
                <div className="mats4">
                  <MatrixGrid M={Tn} label="\mathbf{T}" />
                  <MatrixGrid M={Ti} label="\mathbf{T}^{-1}" />
                </div>
                {zsys && (
                  <div className="mats4">
                    <MatrixGrid M={zsys.A} label="\mathbf{A}_z = \mathbf{T}^{-1}\mathbf{A}\mathbf{T}" />
                    <MatrixGrid M={zsys.B} label="\mathbf{B}_z = \mathbf{T}^{-1}\mathbf{B}" />
                    <MatrixGrid M={zsys.C} label="\mathbf{C}_z = \mathbf{C}\mathbf{T}" />
                    <MatrixGrid M={zsys.D} label="\mathbf{D}_z = \mathbf{D}" />
                  </div>
                )}
                <Tex display tex={`\\mathbf{z}(0) = \\mathbf{T}^{-1}\\mathbf{x}(0) = ${texMatrix(matvec(Ti, st.x0).map((v) => [v]))}`} />
              </>
            )}
          </Box>
          {zsys && (
            <Box kind="green" title={t('co.invariants')}>
              <table className="tbl">
                <thead><tr><th /><th><Tex tex="\mathbf{A}" /></th><th><Tex tex="\mathbf{A}_z" /></th></tr></thead>
                <tbody>
                  <tr><td>{t('co.eigs')}</td><td><Tex tex={eA.map((e) => texComplex(e, 3)).join(',\\,')} /></td><td><Tex tex={eZ.map((e) => texComplex(e, 3)).join(',\\,')} /></td></tr>
                  <tr><td><Tex tex="\operatorname{tr}" /></td><td>{fmt(trace(sys.ss.A))}</td><td>{fmt(trace(zsys.A))}</td></tr>
                  <tr><td><Tex tex="\det" /></td><td>{fmt(det(sys.ss.A))}</td><td>{fmt(det(zsys.A))}</td></tr>
                  {tfX && tfZ && <tr><td><Tex tex="G(s)" /></td><td><Tex tex={`\\frac{${texPoly(tfX.num, 's', 3)}}{${texPoly(tfX.den, 's', 3)}}`} /></td><td><Tex tex={`\\frac{${texPoly(tfZ.num, 's', 3)}}{${texPoly(tfZ.den, 's', 3)}}`} /></td></tr>}
                </tbody>
              </table>
              <p className="hint">{t('co.invHint')}</p>
            </Box>
          )}
        </div>
      </div>
      {zsys && n >= 2 && Ti && (
        <div className="two">
          <PhasePlane A={sys.ss.A} B={sys.ss.B} ix={0} iy={1} x0={st.x0} onX0={(x) => set({ x0: x })} u={sys.ss.B[0].map(() => 0)} horizon={H} showField showFamily={false}
            eig={eigLinesFor(sys)} labels={[sys.stateTex[0], sys.stateTex[1]]} fitKey={fitKey} title={<>{t('ph.origCoords')} <Tex tex="\mathbf{x}" /></>} />
          <PhasePlane A={zsys.A} B={zsys.B} ix={0} iy={1} x0={matvec(Ti, st.x0)} onX0={(zz) => set({ x0: matvec(Tn, zz) })} u={sys.ss.B[0].map(() => 0)} horizon={H} showField showFamily={false}
            labels={['z_1', 'z_2']} fitKey={fitKey + JSON.stringify(Tn)} title={<>{t('co.newCoords')} <Tex tex="\mathbf{z} = \mathbf{T}^{-1}\mathbf{x}" /></>} />
        </div>
      )}
    </div>
  );
}

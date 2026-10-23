import { useApp, UIState } from './state';
import { useT } from './i18n';
import { Box, NumInput, Seg, Slider, Tex, Rich } from './components/basic';
import { CircuitSVG } from './components/Circuit';
import { matrixFromSS, pzFromBuilt, SourceKind, matrixFromPreset, matrixPresets, newRoot, orderOf, pzFromPreset, pzPresets, Realization, Root, MatrixState } from './model';
import { CIRCUITS, circuitSystem, type CircuitId } from './circuits';
import type { ReactNode } from 'react';
import { fmt } from './format';
import { MAX_ORDER } from './components/SPlane';

/** Primera posición real libre (sin polo ni cero) a partir de `start`, hacia la izquierda. */
function freeSpot(rs: Root[], start: number): number {
  for (let k = 0; k < 40; k++) {
    const v = +(start - 0.5 * k).toFixed(2);
    if (!rs.some((r) => r.im === 0 && Math.abs(r.re - v) < 1e-9)) return v;
  }
  return start;
}

export function Sidebar() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const realOpts: { v: Realization; label: string; title: string }[] = [
    ...(st.source !== 'pz' ? [{ v: 'source' as Realization, label: t(st.source === 'circuit' ? 'real.physicalShort' : 'real.entered'), title: '' }] : []),
    { v: 'ccf', label: t('real.ccfShort'), title: t('real.ccf') },
    { v: 'ocf', label: t('real.ocfShort'), title: t('real.ocf') },
    { v: 'modal', label: t('real.modalShort'), title: t('real.modal') },
  ];
  // Al cambiar de forma de definición, el sistema actual se traslada a la nueva forma.
  // El circuito tiene sus propios parámetros: sirve como origen, pero no se ajusta a un sistema arbitrario.
  const pzNext = st.source === 'pz' ? st.pz : pzFromBuilt(sys);
  const changeSource = (v: SourceKind) => {
    if (v === st.source) return;
    const next: Partial<UIState> = { source: v, fitKey: st.fitKey + 1 };
    if (v === 'matrix') { next.matrix = matrixFromSS(sys.ss); next.realization = 'source'; }
    else if (v === 'pz') { if (!pzNext) return; next.pz = pzNext; next.realization = sys.realization === 'source' ? 'ccf' : sys.realization; }
    else next.realization = 'source';
    set(next);
  };
  const modes: { v: SourceKind; label: string; tip: string; icon: ReactNode; disabled?: boolean }[] = [
    { v: 'matrix', label: t('side.srcMatrix'), tip: t('side.srcMatrixTip'), icon: ICONS.matrix },
    { v: 'pz', label: t('side.srcPZ'), tip: !pzNext ? t('side.pzNeedsSiso') : t('side.srcPZTip'), icon: ICONS.pz, disabled: st.source !== 'pz' && !pzNext },
    { v: 'circuit', label: t('side.srcCircuit'), tip: t('side.srcCircuitTip'), icon: ICONS.circuit },
  ];
  return (
    <aside className="lab-sidebar">
      <Box kind="gray" title={t('side.source')}>
        <div className="src-switch" role="tablist" aria-label={t('side.source')}>
          {modes.map((o) => (
            <button key={o.v} role="tab" aria-selected={st.source === o.v} className={st.source === o.v ? 'on' : ''} disabled={o.disabled} title={o.tip} onClick={() => changeSource(o.v)}>
              <span className="src-icon" aria-hidden="true">{o.icon}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
        <p className="hint">{t('side.sync')}</p>
        <div className="src-body">
          {st.source === 'pz' && <PZEditor />}
          {st.source === 'matrix' && <MatrixEditor />}
          {st.source === 'circuit' && <CircuitEditor />}
        </div>
      </Box>
      <Box kind="blue" title={t('side.realization')}>
        <Seg value={sys.realization} onChange={(v) => set({ realization: v })}
          options={realOpts.map((o) => ({ ...o, disabled: !sys.available[o.v] }))} />
        <p className="hint"><Rich text={t(`real.desc.${sys.realization}` as never)} /></p>
        {!sys.available.ccf && st.source !== 'pz' && <p className="hint muted">{t('real.mimoNote')}</p>}
        {!sys.available.modal && <p className="hint warn">{t('real.noModal')}</p>}
      </Box>
    </aside>
  );
}

const ICONS: Record<SourceKind, ReactNode> = {
  matrix: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4H4v16h3M17 4h3v16h-3" />
      <circle cx="9" cy="9" r="0.9" fill="currentColor" /><circle cx="15" cy="9" r="0.9" fill="currentColor" />
      <circle cx="9" cy="15" r="0.9" fill="currentColor" /><circle cx="15" cy="15" r="0.9" fill="currentColor" />
    </svg>
  ),
  pz: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 12h18M12 3v18" opacity="0.35" />
      <path d="M5 5l4 4M9 5l-4 4M5 15l4 4M9 15l-4 4" />
      <circle cx="16.5" cy="12" r="2.6" />
    </svg>
  ),
  circuit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8h3l1.5-3 3 6 3-6 3 6 1.5-3H22" />
      <path d="M12 8v5M8 13h8M8 16h8M12 16v5" />
    </svg>
  ),
};

function RootRow({ r, onChange, onDelete }: { r: Root; onChange: (r: Root) => void; onDelete: () => void }) {
  return (
    <div className="rootrow">
      <NumInput value={r.re} onChange={(v) => onChange({ ...r, re: v })} width={62} />
      <span className="pm">{r.im > 0 ? '±j' : '+j'}</span>
      <NumInput value={r.im} onChange={(v) => onChange({ ...r, im: Math.max(0, v) })} width={52} />
      <button className="icon" onClick={onDelete} title="×">×</button>
    </div>
  );
}

function PZEditor() {
  const { st, set } = useApp();
  const { t } = useT();
  const pz = st.pz;
  const setPZ = (p: typeof pz) => set({ pz: p });
  const np = orderOf(pz.poles), nzr = orderOf(pz.zeros);
  const upd = (key: 'poles' | 'zeros', r: Root) => {
    const list = pz[key].map((q) => (q.id === r.id ? r : q));
    const other = key === 'poles' ? orderOf(pz.zeros) : orderOf(pz.poles);
    const o = orderOf(list);
    if (key === 'poles' && (o > MAX_ORDER || o < other)) return;
    if (key === 'zeros' && o > other) return;
    setPZ({ ...pz, [key]: list });
  };
  const del = (key: 'poles' | 'zeros', id: number) => {
    const list = pz[key].filter((q) => q.id !== id);
    if (key === 'poles' && (orderOf(list) < 1 || orderOf(list) < nzr)) return;
    setPZ({ ...pz, [key]: list });
  };
  return (
    <div className="pzedit">
      <label className="presets">
        <span>{t('side.preset')}</span>
        <select value="" onChange={(e) => { const p = pzPresets[+e.target.value]; if (p) set((s) => ({ pz: pzFromPreset(p), fitKey: s.fitKey + 1 })); }}>
          <option value="">—</option>
          {pzPresets.map((p, i) => <option key={p.key} value={i}>{t(p.key as never)}</option>)}
        </select>
      </label>
      <div className="pz-col">
        <div className="pz-head"><b>{t('side.poles')}</b> <span className="muted">n = {np}</span>
          <button className="small" disabled={np >= MAX_ORDER} onClick={() => setPZ({ ...pz, poles: [...pz.poles, newRoot(freeSpot(pz.poles, -1))] })}>+ {t('side.real')}</button>
          <button className="small" disabled={np + 2 > MAX_ORDER} onClick={() => setPZ({ ...pz, poles: [...pz.poles, newRoot(-1, 1)] })}>+ {t('side.pair')}</button>
        </div>
        {pz.poles.map((r) => <RootRow key={r.id} r={r} onChange={(q) => upd('poles', q)} onDelete={() => del('poles', r.id)} />)}
      </div>
      <div className="pz-col">
        <div className="pz-head"><b>{t('side.zeros')}</b> <span className="muted">m = {nzr}</span>
          <button className="small" disabled={nzr >= np} onClick={() => setPZ({ ...pz, zeros: [...pz.zeros, newRoot(freeSpot([...pz.zeros, ...pz.poles], -0.5))] })}>+ {t('side.real')}</button>
          <button className="small" disabled={nzr + 2 > np} onClick={() => setPZ({ ...pz, zeros: [...pz.zeros, newRoot(-1, 2)] })}>+ {t('side.pair')}</button>
        </div>
        {pz.zeros.map((r) => <RootRow key={r.id} r={r} onChange={(q) => upd('zeros', q)} onDelete={() => del('zeros', r.id)} />)}
        {!pz.zeros.length && <p className="hint muted">{t('side.noZeros')}</p>}
      </div>
      <div className="gainrow"><Tex tex="K" /> <NumInput value={pz.K} onChange={(v) => setPZ({ ...pz, K: v })} width={70} />
        <span className="muted small">{t('side.gainNote')}</span></div>
    </div>
  );
}

function CircuitEditor() {
  const { st, set } = useApp();
  const { t } = useT();
  const c = st.circuit;
  const { def, p, out } = circuitSystem(c);
  const outs = def.outputs(p);
  const id = c.id;
  const updP = (q: Record<string, number>) => set({ circuit: { ...c, p: { ...c.p, [id]: { ...c.p[id], ...q } } } });
  const fmtU = (v: number, u: string) => `${fmt(v, 3)} ${u}`;
  return (
    <div className="circedit">
      <label className="presets">
        <span>{t('side.circuit')}</span>
        <select value={id} onChange={(e) => set((s) => ({ circuit: { ...c, id: e.target.value as CircuitId }, fitKey: s.fitKey + 1 }))}>
          {CIRCUITS.map((k) => <option key={k.id} value={k.id}>{t(`circ.${k.id}` as never)}</option>)}
        </select>
      </label>
      <CircuitSVG id={id} output={out} />
      <div className="circ-eq"><Tex tex={out.eq} /></div>
      <p className="hint"><Rich text={t(`circ.note.${id}` as never)} /></p>
      {def.params.map((q) => (
        <Slider key={q.key} label={<Tex tex={q.tex} />} value={p[q.key]} min={q.min} max={q.max} log={q.log} step={q.log ? undefined : (q.max - q.min) / 300}
          onChange={(v) => updP({ [q.key]: q.log ? v : +v.toFixed(2) })} fmtV={(v) => fmtU(v, q.unit)} />
      ))}
      <div className="row"><span>{t('side.output')}</span>
        <Seg small value={out.key} onChange={(v) => set({ circuit: { ...c, output: { ...c.output, [id]: v } } })} options={outs.map((o) => ({ v: o.key, label: <Tex tex={o.tex} /> }))} />
      </div>
      <div className="row"><span>{t('side.locus')}</span>
        <Seg small value={c.locus[id]} onChange={(v) => set({ circuit: { ...c, locus: { ...c.locus, [id]: v } } })}
          options={[{ v: 'none', label: '—' }, ...def.params.map((q) => ({ v: q.key, label: <Tex tex={q.tex} /> }))]} />
      </div>
      <div className="row btns">
        {(def.cases ?? []).map((k) => <button key={k.key} className="small" onClick={() => updP(k.p)}>{t(k.key as never)}</button>)}
        <button className="small" onClick={() => updP(Object.fromEntries(def.params.map((q) => [q.key, q.def])))}>{t('side.reset')}</button>
      </div>
    </div>
  );
}

function MatGridEditor({ M, onChange, label }: { M: string[][]; onChange: (M: string[][]) => void; label: string }) {
  return (
    <div className="mged">
      <span className="mlabel"><Tex tex={`\\mathbf{${label}}`} /></span>
      <table className="mat edit"><tbody>
        {M.map((r, i) => <tr key={i}>{r.map((v, j) => (
          <td key={j}><input value={v} title={v} onChange={(e) => onChange(M.map((rr, ii) => rr.map((vv, jj) => (ii === i && jj === j ? e.target.value : vv))))}
            className={isFinite(parseFloat(v.replace(',', '.'))) ? '' : 'bad'} /></td>
        ))}</tr>)}
      </tbody></table>
    </div>
  );
}

function resize(M: string[][], r: number, c: number): string[][] {
  return Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => M[i]?.[j] ?? '0'));
}

function MatrixEditor() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const mx = st.matrix;
  const n = mx.A.length, m = mx.B[0].length, p = mx.C.length;
  const dimsSet = (nn: number, mm: number, pp: number) => {
    const next: MatrixState = { A: resize(mx.A, nn, nn), B: resize(mx.B, nn, mm), C: resize(mx.C, pp, nn), D: resize(mx.D, pp, mm) };
    set((s) => ({ matrix: next, fitKey: s.fitKey + 1 }));
  };
  const Step = ({ label, v, min, max, on }: { label: string; v: number; min: number; max: number; on: (k: number) => void }) => (
    <span className="stepper"><Tex tex={label} /><button className="small" disabled={v <= min} onClick={() => on(v - 1)}>−</button><b>{v}</b><button className="small" disabled={v >= max} onClick={() => on(v + 1)}>+</button></span>
  );
  return (
    <div className="mxedit">
      <label className="presets">
        <span>{t('side.preset')}</span>
        <select value="" onChange={(e) => { const pr = matrixPresets[+e.target.value]; if (pr) set((s) => ({ matrix: matrixFromPreset(pr), fitKey: s.fitKey + 1 })); }}>
          <option value="">—</option>
          {matrixPresets.map((pr, i) => <option key={pr.key} value={i}>{t(pr.key as never)}</option>)}
        </select>
      </label>
      <div className="row dims">
        <Step label="n" v={n} min={1} max={8} on={(k) => dimsSet(k, m, p)} />
        <Step label="m" v={m} min={1} max={3} on={(k) => dimsSet(n, k, p)} />
        <Step label="p" v={p} min={1} max={3} on={(k) => dimsSet(n, m, k)} />
      </div>
      <div className="mx-grids">
        <MatGridEditor label="A" M={mx.A} onChange={(A) => set({ matrix: { ...mx, A } })} />
        <MatGridEditor label="B" M={mx.B} onChange={(B) => set({ matrix: { ...mx, B } })} />
        <MatGridEditor label="C" M={mx.C} onChange={(C) => set({ matrix: { ...mx, C } })} />
        <MatGridEditor label="D" M={mx.D} onChange={(D) => set({ matrix: { ...mx, D } })} />
      </div>
      {sys.error && <p className="hint warn">{t('mx.invalid')}</p>}
    </div>
  );
}

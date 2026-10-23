// Modelo de la aplicación: fuentes del sistema, realizaciones y análisis derivado
import { C, cx } from './math/complex';
import { Mat, inv, matmul, eye } from './math/linalg';
import { polyFromRoots, polyScale, polyRoots, cleanRoots, Poly, trimPoly } from './math/poly';
import { SS, TF, ccf, ocf, modal, Modal, transform, tfPair, ctrb, VecNorm, dims } from './math/ss';

export type SourceKind = 'pz' | 'circuit' | 'matrix';
export type Realization = 'source' | 'ccf' | 'ocf' | 'modal';

export interface Root { id: number; re: number; im: number } // im > 0 ⇒ par conjugado
export interface PZState { poles: Root[]; zeros: Root[]; K: number }
export interface CircuitState { R1: number; R2: number; C: number; L: number; output: 'vC' | 'iL' | 'both'; locus: 'none' | 'R1' | 'R2' | 'C' | 'L' }
export interface MatrixState { A: string[][]; B: string[][]; C: string[][]; D: string[][] }

let rootId = 1;
export const newRoot = (re: number, im = 0): Root => ({ id: rootId++, re, im: Math.abs(im) });

export const expandRoots = (rs: Root[]): C[] => rs.flatMap((r) => (r.im > 0 ? [cx(r.re, r.im), cx(r.re, -r.im)] : [cx(r.re)]));
export const orderOf = (rs: Root[]) => rs.reduce((s, r) => s + (r.im > 0 ? 2 : 1), 0);

// ---------- Presets ----------
export interface PZPreset { key: string; poles: [number, number][]; zeros: [number, number][]; K: number }
export const pzPresets: PZPreset[] = [
  { key: 'pz.preset.circuitA', poles: [[-3, 0], [-6, 0]], zeros: [[-8, 0]], K: 1 },
  { key: 'pz.preset.circuitB', poles: [[-2, 3]], zeros: [[-3, 0]], K: 1 },
  { key: 'pz.preset.notes2', poles: [[-1, 0], [-2, 0]], zeros: [], K: 1 },
  { key: 'pz.preset.double', poles: [[-2, 0], [-2, 0]], zeros: [], K: 4 },
  { key: 'pz.preset.center', poles: [[0, 2]], zeros: [], K: 4 },
  { key: 'pz.preset.saddle', poles: [[-1, 0], [2, 0]], zeros: [], K: 1 },
  { key: 'pz.preset.unstableFocus', poles: [[0.3, 2]], zeros: [], K: 1 },
  { key: 'pz.preset.cancel', poles: [[-1, 0], [-3, 0]], zeros: [[-1.6, 0]], K: 1 },
  { key: 'pz.preset.third', poles: [[-0.5, 2], [-4, 0]], zeros: [[-2, 0]], K: 8 },
];

export const pzFromPreset = (p: PZPreset): PZState => ({
  poles: p.poles.map(([re, im]) => newRoot(re, im)),
  zeros: p.zeros.map(([re, im]) => newRoot(re, im)),
  K: p.K,
});

export interface MatrixPreset { key: string; A: number[][]; B: number[][]; C: number[][]; D?: number[][] }
export const matrixPresets: MatrixPreset[] = [
  { key: 'mx.preset.circuit', A: [[-1, -10], [1, -8]], B: [[1], [0]], C: [[1, 0]] },
  { key: 'mx.preset.ctrl', A: [[-1, 1], [0, -2]], B: [[0], [1]], C: [[1, 0]] },
  { key: 'mx.preset.notCtrl', A: [[-1, 0], [0, -2]], B: [[0], [1]], C: [[1, 1]] },
  { key: 'mx.preset.notObs', A: [[-1, 0], [0, -2]], B: [[1], [1]], C: [[1, 0]] },
  { key: 'mx.preset.rcLocal', A: [[-1, 0], [0, -2]], B: [[1], [0]], C: [[1, 1]] },
  { key: 'mx.preset.mimoIn', A: [[-1, 0], [0, -2]], B: [[1, 0], [0, 1]], C: [[1, 1]] },
  { key: 'mx.preset.mimoOut', A: [[-1, 0], [0, -2]], B: [[1], [1]], C: [[1, 0], [0, 1]] },
  { key: 'mx.preset.sameBranch', A: [[-1, 0], [0, -2]], B: [[1, 1], [0, 0]], C: [[1, 0], [2, 0]] },
  { key: 'mx.preset.third', A: [[0, 1, 0], [0, 0, 1], [-6, -11, -6]], B: [[0], [0], [1]], C: [[1, 0, 0]] },
  { key: 'mx.preset.kernel', A: [[0, 0], [0, -1]], B: [[0], [1]], C: [[1, 1]] },
];

const toStr = (M: number[][]) => M.map((r) => r.map((v) => String(v)));
export const matrixFromPreset = (p: MatrixPreset): MatrixState => ({
  A: toStr(p.A), B: toStr(p.B), C: toStr(p.C),
  D: toStr(p.D ?? p.C.map(() => p.B[0].map(() => 0))),
});

export const parseNum = (s: string): number => {
  const v = parseFloat(String(s).replace(',', '.').replace('−', '-'));
  return isFinite(v) ? v : NaN;
};

export const defaultCircuit: CircuitState = { R1: 10, R2: 8, C: 0.1, L: 1, output: 'vC', locus: 'R2' };

// ---------- Construcción del sistema ----------
export interface Built {
  ok: boolean;
  error?: string;
  kind: SourceKind;
  base: SS; // realización de la fuente
  ss: SS; // realización de trabajo
  realization: Realization;
  available: Record<Realization, boolean>;
  n: number; m: number; p: number;
  stateTex: string[]; inputTex: string[]; outputTex: string[];
  poleHint?: C[]; // valores propios conocidos de forma exacta
  tf?: TF; // G(s) de la entrada 1 a la salida 1 (sin simplificar)
  tfZeros: C[];
  md: Modal; // descomposición modal de la realización de trabajo
  mdBase: Modal;
  Tsrc: Mat | null; // x_fuente = Tsrc · x_trabajo
  realizations: Partial<Record<Realization, SS>>;
}

export function circuitSS(c: CircuitState): SS {
  const A = [[-1 / (c.R1 * c.C), -1 / c.C], [1 / c.L, -c.R2 / c.L]];
  const B = [[1 / (c.R1 * c.C)], [0]];
  const Cm = c.output === 'vC' ? [[1, 0]] : c.output === 'iL' ? [[0, 1]] : [[1, 0], [0, 1]];
  return { A, B, C: Cm, D: Cm.map(() => [0]) };
}

export function zerosOf(tf: TF): C[] {
  const num = trimPoly(tf.num, 1e-12);
  if (num.length <= 1) return [];
  return cleanRoots(polyRoots(num), 1e-6, num);
}

function relate(src: SS, tgt: SS): Mat | null {
  // x_src = T x_tgt cuando ambas son controlables:  T = 𝒞_src 𝒞_tgt^{-1} (SISO)
  if (src.B[0].length !== 1 || src.A.length !== tgt.A.length) return null;
  const Ci = inv(ctrb(tgt.A, tgt.B));
  if (!Ci) return null;
  const Cs = ctrb(src.A, src.B);
  const T = matmul(Cs, Ci);
  return inv(T) ? T : null;
}

export function build(kind: SourceKind, pz: PZState, circ: CircuitState, mx: MatrixState, want: Realization, norm: VecNorm): Built {
  let base: SS;
  let poleHint: C[] | undefined;
  let stateTex: string[];
  let inputTex = ['u'];
  let outputTex = ['y'];
  let error: string | undefined;
  let tf: TF | undefined;
  if (kind === 'pz') {
    const P = expandRoots(pz.poles), Z = expandRoots(pz.zeros);
    poleHint = P;
    const den = polyFromRoots(P);
    const num = polyScale(polyFromRoots(Z), pz.K);
    tf = { num, den };
    base = ccf(tf);
    stateTex = P.map((_, i) => `x_{${i + 1}}`);
  } else if (kind === 'circuit') {
    base = circuitSS(circ);
    stateTex = ['v_C', 'i_L'];
    outputTex = circ.output === 'vC' ? ['v_C'] : circ.output === 'iL' ? ['i_L'] : ['y_1', 'y_2'];
  } else {
    const A = mx.A.map((r) => r.map(parseNum)), B = mx.B.map((r) => r.map(parseNum)), Cm = mx.C.map((r) => r.map(parseNum)), D = mx.D.map((r) => r.map(parseNum));
    const bad = [A, B, Cm, D].some((M) => M.some((r) => r.some((v) => !isFinite(v))));
    if (bad) error = 'mx.invalid';
    const fix = (M: number[][]) => M.map((r) => r.map((v) => (isFinite(v) ? v : 0)));
    base = { A: fix(A), B: fix(B), C: fix(Cm), D: fix(D) };
    stateTex = A.map((_, i) => `x_{${i + 1}}`);
    if (B[0].length > 1) inputTex = B[0].map((_, j) => `u_{${j + 1}}`);
    if (Cm.length > 1) outputTex = Cm.map((_, i) => `y_{${i + 1}}`);
  }
  const { n, m, p } = dims(base);
  const siso = m === 1 && p === 1;
  if (!tf && siso) tf = tfPair(base, 0, 0);
  const mdBase = modal(base.A, poleHint, norm);
  const realizations: Partial<Record<Realization, SS>> = { source: base };
  if (tf && siso && tf.den.length - 1 === n) {
    realizations.ccf = kind === 'pz' ? base : ccf(tf);
    realizations.ocf = ocf(tf);
  }
  if (mdBase.ok) {
    const z = transform(base, mdBase.T);
    if (z) realizations.modal = { ...z, A: mdBase.J };
  }
  const available: Record<Realization, boolean> = {
    source: kind !== 'pz',
    ccf: !!realizations.ccf,
    ocf: !!realizations.ocf,
    modal: !!realizations.modal,
  };
  let realization: Realization = want;
  if (!available[realization]) realization = kind === 'pz' ? 'ccf' : 'source';
  const ss = realizations[realization] ?? base;
  const md = realization === 'source' || (realization === 'ccf' && kind === 'pz') ? mdBase : modal(ss.A, poleHint, norm);
  let Tsrc: Mat | null = null;
  if (realization === 'modal') Tsrc = mdBase.T;
  else if (realization === 'source' || (kind === 'pz' && realization === 'ccf')) Tsrc = eye(n);
  else Tsrc = relate(base, ss);
  const st = realization === 'source' || (kind === 'pz' && realization === 'ccf') ? stateTex : realization === 'modal' ? stateTex.map((_, i) => `z_{${i + 1}}`) : stateTex.map((_, i) => `x_{${i + 1}}`);
  const tfZeros = tf ? zerosOf(tf) : [];
  return {
    ok: !error, error, kind, base, ss, realization, available, n, m, p,
    stateTex: st, inputTex, outputTex, poleHint, tf, tfZeros, md, mdBase, Tsrc, realizations,
  };
}

// ---------- Traspaso entre formas de definir el sistema ----------
const numStr = (v: number): string => {
  if (!isFinite(v) || Math.abs(v) < 1e-12) return '0';
  const short = +v.toPrecision(6);
  return Math.abs(short - v) <= 1e-11 * Math.max(1, Math.abs(v)) ? String(short) : String(+v.toPrecision(12));
};

/** Matrices escritas a partir de una realización. */
export const matrixFromSS = (s: SS): MatrixState => ({
  A: s.A.map((r) => r.map(numStr)), B: s.B.map((r) => r.map(numStr)), C: s.C.map((r) => r.map(numStr)), D: s.D.map((r) => r.map(numStr)),
});

const toRoots = (zs: C[]): Root[] => zs.filter((z) => z.im >= 0).map((z) => newRoot(+z.re.toPrecision(10), z.im > 0 ? +z.im.toPrecision(10) : 0));

/** Polos, ceros y ganancia de G(s) (sin simplificar) para sistemas de una entrada y una salida. */
export function pzFromBuilt(b: Built): PZState | null {
  if (!b.tf || b.m !== 1 || b.p !== 1) return null;
  const den = b.tf.den, num = trimPoly(b.tf.num, 1e-12);
  const lead = num[num.length - 1] / den[den.length - 1];
  const K = +(lead || 0).toPrecision(10);
  const zeros = K === 0 ? [] : toRoots(b.tfZeros);
  return { poles: toRoots(b.md.eig), zeros, K };
}

export type { Poly };

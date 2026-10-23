import { useApp } from '../state';
import { useT } from '../i18n';
import { Box, MatrixGrid, Seg, Tex, Rich } from '../components/basic';
import { FlowGraph } from '../components/FlowGraph';
import { Realization } from '../model';
import { texLinComb, texMatrix, tn, round } from '../format';
import { Mat } from '../math/linalg';
import { trimPoly } from '../math/poly';
import { VecNorm, SS } from '../math/ss';

function derivTex(v: string, k: number) {
  if (k === 0) return `${v}`;
  if (k <= 3) return `${'\\'}${['', 'dot', 'ddot', 'dddot'][k]}{${v}}`;
  return `${v}^{(${k})}`;
}

/** Ecuación diferencial de orden n a partir de G(s) = N/D */
function odeTex(num: number[], den: number[]): string {
  const n = den.length - 1;
  const a = den.map((x) => x / den[n]);
  const b = trimPoly(num.map((x) => x / den[n]), 1e-12);
  const lhs: string[] = [];
  for (let k = n; k >= 0; k--) {
    const c = round(a[k]);
    if (c === 0) continue;
    lhs.push(`${c < 0 ? '-' : lhs.length ? '+' : ''}${Math.abs(c) === 1 ? '' : tn(Math.abs(c))}${derivTex('y', k)}`);
  }
  const rhs: string[] = [];
  for (let k = b.length - 1; k >= 0; k--) {
    const c = round(b[k]);
    if (c === 0) continue;
    rhs.push(`${c < 0 ? '-' : rhs.length ? '+' : ''}${Math.abs(c) === 1 ? '' : tn(Math.abs(c))}${derivTex('u', k)}`);
  }
  return `${lhs.join(' ')} = ${rhs.join(' ') || '0'}`;
}

export function stateEqTex(ss: SS, st: string[], ut: string[], yt: string[]): string {
  const lines: string[] = [];
  ss.A.forEach((row, i) => lines.push(`\\dot{${st[i]}} &= ${texLinComb(row, st, { coefs: ss.B[i], vars: ut })}`));
  ss.C.forEach((row, k) => lines.push(`${yt[k]} &= ${texLinComb(row, st, { coefs: ss.D[k] ?? [], vars: ut })}`));
  return `\\begin{aligned}${lines.join('\\\\')}\\end{aligned}`;
}

export function TabRepr() {
  const { st, set, sys } = useApp();
  const { t } = useT();
  const order: Realization[] = ['source', 'ccf', 'ocf', 'modal'];
  const name = (r: Realization) => (r === 'source' ? t(sys.kind === 'circuit' ? 'real.physical' : 'real.entered') : t(`real.${r}` as never));
    const yT = sys.outputTex, uT = sys.inputTex;
  // relación entre la realización de trabajo y la de la fuente
  const rel: Mat | null = sys.Tsrc;
  const showRel = sys.realization !== 'source' && !(sys.kind === 'pz' && sys.realization === 'ccf') && rel;
  return (
    <div className="tab tab-repr">
      <Box kind="idea" title={t('idea')}>{t('repr.idea')}</Box>
      {sys.tf && sys.m === 1 && sys.p === 1 && (
        <div className="chain">
          <div className="chain-box"><div className="cb-t">{t('repr.ode')}</div><Tex display tex={odeTex(sys.tf.num, sys.tf.den)} /></div>
          <div className="chain-arrow">{t('repr.defineXi')} →</div>
          <div className="chain-box green"><div className="cb-t">{t('repr.firstOrder', { n: sys.n })}</div><Tex display tex={stateEqTex(sys.ss, sys.stateTex, uT, yT)} /></div>
          <div className="chain-arrow">{t('repr.group')} →</div>
          <div className="chain-box"><div className="cb-t">{t('repr.vector')}</div><Tex display tex="\begin{aligned}\dot{\mathbf{x}}&=\mathbf{A}\mathbf{x}+\mathbf{B}u\\ y&=\mathbf{C}\mathbf{x}+\mathbf{D}u\end{aligned}" /></div>
        </div>
      )}
      <div className="cards4">
        {order.filter((r) => sys.realizations[r] && !(sys.kind === 'pz' && r === 'source')).map((r) => {
          const ss = sys.realizations[r]!;
          return (
            <div key={r} className={`rcard ${sys.realization === r ? 'on' : ''}`} onClick={() => set({ realization: r })} role="button">
              <div className="rc-title">{name(r)}{sys.realization === r && <span className="badge ok">{t('repr.working')}</span>}</div>
              <div className="mats4 small">
                <MatrixGrid small M={ss.A} label="\mathbf{A}" />
                <MatrixGrid small M={ss.B} label="\mathbf{B}" />
                <MatrixGrid small M={ss.C} label="\mathbf{C}" />
                <MatrixGrid small M={ss.D} label="\mathbf{D}" />
              </div>
              <div className="rc-note">{t(`repr.note.${r}` as never)}</div>
            </div>
          );
        })}
      </div>
      <div className="two">
        <Box kind="gray" title={t('repr.eqs')}>
          <Tex display tex={stateEqTex(sys.ss, sys.stateTex, uT, yT)} />
          {showRel && rel && (
            <div className="rel">
              <p>{t('repr.relation')}</p>
              <Tex display tex={`\\mathbf{x}_{\\text{${t('repr.srcShort')}}} = \\mathbf{T}\\,\\mathbf{x},\\qquad \\mathbf{T} = ${texMatrix(rel)}`} />
              <p className="hint">{sys.realization === 'modal' ? t('repr.relModal') : t('repr.relCtrb')}</p>
            </div>
          )}
          {sys.realization !== 'source' && sys.Tsrc === null && <p className="hint warn">{t('repr.noRel')}</p>}
          {sys.realization === 'modal' && (
            <div className="row">{t('repr.vecNorm')}
              <Seg small value={st.vecNorm} onChange={(v: VecNorm) => set({ vecNorm: v })} options={[{ v: 'last', label: t('repr.normLast') }, { v: 'first', label: t('repr.normFirst') }, { v: 'unit', label: t('repr.normUnit') }]} />
            </div>
          )}
          {sys.realization === 'modal' && sys.md.ok && <ModalBlocksNote />}
        </Box>
        <Box kind="plain" title={t('repr.graph')}>
          <FlowGraph ss={sys.ss} stateTex={sys.stateTex} inputTex={uT} outputTex={yT} />
          <p className="hint">{t('repr.graphHint')}</p>
        </Box>
      </div>
    </div>
  );
}

function ModalBlocksNote() {
  const { sys } = useApp();
  const { t } = useT();
  const md = sys.mdBase;
  if (!md.ok) return null;
  return (
    <div className="hint">
      <Tex display tex={`\\mathbf{V} = ${texMatrix(md.T)},\\quad \\mathbf{V}^{-1}\\mathbf{A}\\mathbf{V} = ${texMatrix(md.J)}`} />
      {md.blocks.some((b) => b.kind === 'complex') && <p><Rich text={t('repr.complexBlock')} /></p>}
      {md.blocks.some((b) => b.kind.startsWith('jordan')) && <p><Rich text={t('repr.jordanBlock')} /></p>}
    </div>
  );
}

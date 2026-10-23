import { useEffect, useState } from 'react';
import type { Root } from '../math/types';
import { tr, type Lang } from '../i18n';

export function NumField(props: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  title?: string;
  width?: number;
}) {
  const [txt, setTxt] = useState(String(+props.value.toPrecision(6)));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setTxt(String(+props.value.toPrecision(6)));
  }, [props.value, focus]);
  const commit = () => {
    const v = parseFloat(txt.replace(',', '.'));
    if (isFinite(v)) {
      let c = v;
      if (props.min !== undefined) c = Math.max(props.min, c);
      if (props.max !== undefined) c = Math.min(props.max, c);
      props.onCommit(c);
    } else setTxt(String(+props.value.toPrecision(6)));
  };
  return (
    <input
      className="num"
      type="text"
      inputMode="decimal"
      value={txt}
      title={props.title}
      style={props.width ? { width: props.width } : undefined}
      onFocus={() => setFocus(true)}
      onBlur={() => {
        setFocus(false);
        commit();
      }}
      onChange={(e) => setTxt(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setTxt(String(+props.value.toPrecision(6)));
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

interface Props {
  roots: Root[];
  onRoots: (r: Root[]) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  lang: Lang;
}

export default function RootTable({ roots, onRoots, selected, onSelect, lang }: Props) {
  const t = tr(lang);
  const update = (id: string, patch: Partial<Root>) =>
    onRoots(roots.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  if (!roots.length) return <p className="muted small">{t('noRoots')}</p>;
  const sorted = [...roots].sort((a, b) =>
    a.kind === b.kind ? Math.hypot(a.re, a.im) - Math.hypot(b.re, b.im) : a.kind === 'pole' ? -1 : 1,
  );
  return (
    <div className="roots-wrap">
    <table className="roots">
      <thead>
        <tr>
          <th></th>
          <th>Re</th>
          <th>Im (±)</th>
          <th title="|s| = ωn">ωn</th>
          <th>ζ</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => {
          const wn = Math.hypot(r.re, r.im);
          const zeta = wn > 0 ? -r.re / wn : NaN;
          const isPair = r.im > 0;
          return (
            <tr key={r.id} className={selected === r.id ? 'sel' : ''} onClick={() => onSelect(r.id)}>
              <td>
                <button
                  className={`kindbtn ${r.kind}`}
                  title={t('togglePZ')}
                  onClick={(e) => {
                    e.stopPropagation();
                    update(r.id, { kind: r.kind === 'pole' ? 'zero' : 'pole' });
                  }}
                >
                  {r.kind === 'pole' ? '×' : '○'}
                </button>
                <span className="kindtxt" title={r.kind === 'pole' ? t('pole') : t('zero')}>
                  <small>{wn === 0 ? t('origin') : isPair ? t('pair') : t('real')}</small>
                </span>
              </td>
              <td>
                <NumField value={r.re} onCommit={(v) => update(r.id, { re: v })} />
              </td>
              <td>
                <NumField value={r.im} min={0} onCommit={(v) => update(r.id, { im: Math.abs(v) })} />
              </td>
              <td>
                <NumField
                  value={wn}
                  min={0}
                  onCommit={(v) => {
                    if (wn === 0) update(r.id, { re: -v, im: 0 });
                    else update(r.id, { re: (r.re / wn) * v, im: (r.im / wn) * v });
                  }}
                />
              </td>
              <td>
                {isPair ? (
                  <NumField
                    value={zeta}
                    min={-0.999}
                    max={0.999}
                    onCommit={(z) => update(r.id, { re: +(-z * wn).toPrecision(6), im: +(wn * Math.sqrt(1 - z * z)).toPrecision(6) })}
                  />
                ) : (
                  <span className="muted">{wn === 0 ? '' : zeta > 0 ? '1' : '−1'}</span>
                )}
              </td>
              <td>
                <button
                  className="iconbtn"
                  aria-label={t('del')}
                  title={t('del')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoots(roots.filter((x) => x.id !== r.id));
                  }}
                >
                  ✕
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

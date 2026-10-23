import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import katex from 'katex';
import { Mat } from '../math/linalg';
import { tn } from '../format';

export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => {
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false }); }
    catch { return tex; }
  }, [tex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Mide el ancho de un contenedor. */
export function useWidth<T extends HTMLElement>(initial = 600): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => { const cw = es[0].contentRect.width; if (cw > 0) setW(Math.floor(cw)); });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Matriz como tabla HTML con corchetes; las celdas que cambian se iluminan. */
export function MatrixGrid({ M, label, small, highlight, rowLabels, colLabels, cellClass }: {
  M: Mat; label?: string; small?: boolean; highlight?: boolean;
  rowLabels?: string[]; colLabels?: string[]; cellClass?: (i: number, j: number) => string | undefined;
}) {
  const prev = useRef<Mat | null>(null);
  const ver = useRef<number[][]>([]);
  M.forEach((r, i) => r.forEach((v, j) => {
    const p = prev.current?.[i]?.[j];
    ver.current[i] = ver.current[i] ?? [];
    if (p === undefined) ver.current[i][j] = 0;
    else if (highlight !== false && Math.abs(p - v) > 1e-9 * (1 + Math.abs(v))) ver.current[i][j] = (ver.current[i][j] ?? 0) + 1;
  }));
  if (prev.current && (prev.current.length !== M.length || prev.current[0]?.length !== M[0]?.length)) ver.current = M.map((r) => r.map(() => 0));
  prev.current = M.map((r) => r.slice());
  const empty = !M.length || !M[0]?.length;
  return (
    <div className={`mgrid ${small ? 'small' : ''}`}>
      {label && <span className="mlabel"><Tex tex={label} />{' = '}</span>}
      {empty ? <Tex tex="[\;]" /> : (
        <table className="mat">
          {colLabels && (
            <thead><tr>{rowLabels && <th />}{colLabels.map((c, j) => <th key={j}><Tex tex={c} /></th>)}</tr></thead>
          )}
          <tbody>
            {M.map((r, i) => (
              <tr key={i}>
                {rowLabels && <th className="rl"><Tex tex={rowLabels[i]} /></th>}
                {r.map((v, j) => (
                  <td key={`${j}-${ver.current[i]?.[j] ?? 0}`} className={`${(ver.current[i]?.[j] ?? 0) > 0 ? 'flash' : ''} ${v === 0 ? 'zero' : ''} ${cellClass?.(i, j) ?? ''}`}>
                    <Tex tex={tn(v)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Box({ kind = 'plain', title, children, className, right }: { kind?: 'idea' | 'gray' | 'blue' | 'green' | 'red' | 'plain'; title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`card box box-${kind} ${className ?? ''}`}>
      {title && <header className="card-head"><h3>{typeof title === 'string' ? <Rich text={title} /> : title}</h3>{right && <div className="card-tools">{right}</div>}</header>}
      <div className="box-body">{typeof children === 'string' ? <Rich text={children} /> : children}</div>
    </section>
  );
}

export function Seg<T extends string>({ value, options, onChange, small }: { value: T; options: { v: T; label: ReactNode; disabled?: boolean; title?: string }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={`seg ${small ? 'small' : ''}`}>
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} disabled={o.disabled} title={o.title} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, fmtV, log }: { label: ReactNode; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmtV?: (v: number) => string; log?: boolean }) {
  const toS = (v: number) => (log ? Math.log10(v) : v);
  const fromS = (s: number) => (log ? Math.pow(10, s) : s);
  return (
    <label className="slider">
      <span className="sl-label">{label}</span>
      <input type="range" min={toS(min)} max={toS(max)} step={log ? 0.01 : step ?? (max - min) / 200} value={toS(value)}
        onChange={(e) => onChange(+fromS(+e.target.value).toPrecision(3))} />
      <span className="sl-val">{fmtV ? fmtV(value) : value}</span>
    </label>
  );
}

export function Check({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`check ${disabled ? 'dis' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function NumInput({ value, onChange, width = 64, step = 0.1 }: { value: number; onChange: (v: number) => void; width?: number; step?: number }) {
  const [s, setS] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setS(String(+value.toPrecision(6))); }, [value]);
  return (
    <input className="num" style={{ width }} value={s} step={step}
      onFocus={() => (focused.current = true)}
      onBlur={() => { focused.current = false; setS(String(+value.toPrecision(6))); }}
      onChange={(e) => { setS(e.target.value); const v = parseFloat(e.target.value.replace(',', '.').replace('−', '-')); if (isFinite(v)) onChange(v); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const v = +(value + (e.key === 'ArrowUp' ? step : -step)).toFixed(6);
          onChange(v); setS(String(v));
        }
      }} />
  );
}

/** Series colours from the shared theme (they follow palette and light/dark). Apply them with `style`, not SVG attributes. */
export const modeColors = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

/** Texto con fórmulas en línea delimitadas por $…$ */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return <>{parts.map((p, i) => (p.length > 2 && p.startsWith('$') && p.endsWith('$') ? <Tex key={i} tex={p.slice(1, -1)} /> : <span key={i}>{p}</span>))}</>;
}

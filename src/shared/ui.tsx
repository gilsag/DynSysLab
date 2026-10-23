import katex from 'katex';
import { ReactNode, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function Tex({ tex, block }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: !!block, throwOnError: false, strict: 'ignore' }),
    [tex, block],
  );
  return <span className={block ? 'tex-block' : 'tex'} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: ReactNode;
}) {
  return (
    <label className="slider">
      <span className="slabel">
        <span>{label}</span>
        <b>{display ?? value}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: [T, ReactNode][];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={'seg' + (disabled ? ' disabled' : '')}>
      {options.map(([v, l]) => (
        <button key={v} type="button" className={v === value ? 'on' : ''} disabled={disabled} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

const TIP_W = 360;

/** Small "i" badge that shows an explanatory popover on hover or keyboard focus. */
export function InfoTip({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const show = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(8, r.left - 12), window.innerWidth - TIP_W - 12);
    const above = r.bottom + 190 > window.innerHeight;
    setPos({ x, y: above ? r.top - 8 : r.bottom + 8, above });
  };
  const hide = () => setPos(null);
  return (
    <span
      ref={ref}
      className="infotip"
      tabIndex={0}
      role="button"
      aria-label={text}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      i
      {pos &&
        createPortal(
          <div className={'tip-pop' + (pos.above ? ' above' : '')} style={{ left: pos.x, top: pos.y, maxWidth: TIP_W }} role="tooltip">
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}

export function Card({
  title,
  info,
  right,
  children,
  className,
}: {
  title?: ReactNode;
  info?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'card ' + (className ?? '')}>
      {(title || right) && (
        <div className="card-head">
          {title && (
            <div className="card-title">
              <h3>{title}</h3>
              {info && <InfoTip text={info} />}
            </div>
          )}
          {right && <div className="card-tools">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Text with inline maths between $…$ (rendered with KaTeX). */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((p, i) => (p.length > 2 && p.startsWith('$') && p.endsWith('$') ? <Tex key={i} tex={p.slice(1, -1)} /> : <span key={i}>{p}</span>))}
    </>
  );
}

/** Number field that accepts decimal comma or point; commits on Enter or when leaving the field. */
export function NumField({
  value,
  onChange,
  width = 76,
  min,
  max,
  title,
}: {
  value: number;
  onChange: (v: number) => void;
  width?: number;
  min?: number;
  max?: number;
  title?: string;
}) {
  const fmt = (v: number) => String(+v.toPrecision(6));
  const [s, setS] = useState(fmt(value));
  const [focus, setFocus] = useState(false);
  const shown = focus ? s : fmt(value);
  const commit = () => {
    const v = parseFloat(s.replace(',', '.').replace('−', '-'));
    if (Number.isFinite(v)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
    setFocus(false);
  };
  return (
    <input
      className="num"
      style={{ width }}
      value={shown}
      title={title}
      inputMode="decimal"
      onFocus={() => {
        setS(fmt(value));
        setFocus(true);
      }}
      onChange={(e) => setS(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

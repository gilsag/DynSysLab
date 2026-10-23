import { useRef } from 'react';
import type { BodeData, Factor, Margins } from '../math/tf';
import { evalAt } from '../math/tf';
import { niceLimits, pathOf, phaseTicks, linTicks, supDigits, useSize } from './plotUtils';
import { fmt, type Lang } from '../i18n';

export const FACTOR_COLORS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];

interface Props {
  data: BodeData;
  overlay: { data: BodeData; label: string } | null;
  factors: Factor[];
  showAsym: boolean;
  showFactors: boolean;
  showMargins: boolean;
  margins: Margins;
  range: [number, number];
  wStar: number | null;
  pinned: boolean;
  onHover: (w: number | null) => void;
  onPin: () => void;
  units: 'rad' | 'hz';
  lang: Lang;
  labels: { mag: string; phase: string; freq: string; pm: string; gm: string };
}

const TWO_PI = 2 * Math.PI;

export function decadeLabel(k: number, lang: Lang) {
  if (k >= -3 && k <= 4) return fmt(Math.pow(10, k), lang);
  return `10${supDigits(k)}`;
}

export default function BodePlot(p: Props) {
  const [wrap, size] = useSize<HTMLDivElement>();
  const W = size.w;
  const H = Math.max(360, Math.round(size.h));
  const L = 56;
  const Rm = 24;
  const T = 10;
  const B = 36;
  const gap = 26;
  const pw = W - L - Rm;
  const ph1 = Math.round((H - T - B - gap) * 0.52);
  const ph2 = H - T - B - gap - ph1;
  const y2top = T + ph1 + gap;
  const [lo, hi] = p.range;

  const X = (w: number) => L + ((Math.log10(w) - lo) / (hi - lo)) * pw;
  const Winv = (x: number) => Math.pow(10, lo + ((x - L) / pw) * (hi - lo));

  // ----- y limits
  const inRange = (arr: number[], w: number[]) => arr.filter((v, i) => isFinite(v) && w[i] >= 10 ** lo && w[i] <= 10 ** hi);
  const magVals = [
    ...inRange(p.data.mag, p.data.w),
    ...(p.overlay ? inRange(p.overlay.data.mag, p.overlay.data.w) : []),
  ].map((v) => Math.max(-400, Math.min(400, v)));
  const phVals = [...inRange(p.data.ph, p.data.w), ...(p.overlay ? inRange(p.overlay.data.ph, p.overlay.data.w) : [])];
  if (p.showAsym) {
    magVals.push(...inRange(p.data.amag, p.data.w));
    phVals.push(...inRange(p.data.aph, p.data.w));
  }
  if (p.showMargins) magVals.push(0);
  const magSpanRaw = magVals.length ? Math.max(...magVals) - Math.min(...magVals) : 40;
  const mstep = magSpanRaw > 160 ? 40 : magSpanRaw > 80 ? 20 : 10;
  const [m0, m1] = niceLimits(Math.min(...magVals, 0) - 3, Math.max(...magVals, 0) + 3, 30, mstep);
  const phMax = Math.max(...phVals);
  // delays make the phase fall without bound: keep at most ~2 turns visible
  const phMin = Math.max(Math.min(...phVals), phMax - 720);
  const [q0, q1] = niceLimits(phMin - 5, phMax + 5, 90, 45);
  const Ym = (v: number) => T + ph1 - ((v - m0) / (m1 - m0)) * ph1;
  const Yp = (v: number) => y2top + ph2 - ((v - q0) / (q1 - q0)) * ph2;

  const xs = p.data.w.map(X);
  const clipM = [T - 40, T + ph1 + 40];
  const clipP = [y2top - 40, y2top + ph2 + 40];

  // ----- frequency ticks (decades of the displayed unit)
  const off = p.units === 'hz' ? Math.log10(TWO_PI) : 0; // log10 ω = log10 f + off
  const kLo = Math.ceil(lo - off - 1e-9);
  const kHi = Math.floor(hi - off + 1e-9);
  const majors: { x: number; k: number }[] = [];
  const minors: number[] = [];
  for (let k = Math.floor(lo - off) - 1; k <= Math.ceil(hi - off) + 1; k++) {
    const xmaj = L + ((k + off - lo) / (hi - lo)) * pw;
    if (k >= kLo && k <= kHi) majors.push({ x: xmaj, k });
    for (let m = 2; m <= 9; m++) {
      const xm = L + ((k + Math.log10(m) + off - lo) / (hi - lo)) * pw;
      if (xm > L && xm < L + pw) minors.push(xm);
    }
  }
  const decadesShown = hi - lo;

  const magTicks = linTicks(m0, m1, Math.max(3, Math.floor(ph1 / 40)));
  const phTicks = phaseTicks(q0, q1).filter((v, _i, arr) => arr.length < 9 || v % 90 === 0);

  const lastPointer = useRef('mouse');
  const onMove = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < L || x > L + pw) return;
    p.onHover(Winv(x));
  };

  const ws = p.wStar;
  const at = ws !== null ? evalAt(p.factors, ws) : null;

  // margins drawing helpers
  const pmLine =
    p.showMargins && p.margins.pmW !== null && p.margins.pm !== null
      ? (() => {
          const w = p.margins.pmW!;
          const phc = evalAt(p.factors, w).ph;
          const ref = phc - p.margins.pm!; // the −180 + 360k reference
          return { x: X(w), y1: Yp(phc), y2: Yp(ref), ref, ok: p.margins.pm! > 0 };
        })()
      : null;
  const gmLine =
    p.showMargins && p.margins.gmW !== null && p.margins.gm !== null
      ? (() => {
          const w = p.margins.gmW!;
          const mc = evalAt(p.factors, w).mag;
          return { x: X(w), y1: Ym(mc), y2: Ym(0), ok: p.margins.gm! > 0, ref: phaseRefAt(p.factors, w) };
        })()
      : null;

  const inX = (x: number) => x >= L - 0.5 && x <= L + pw + 0.5;

  return (
    <div ref={wrap} className="bode-wrap">
      <svg
        width={W}
        height={H}
        className="bode"
        onPointerMove={(e) => e.pointerType === 'mouse' && onMove(e)}
        onPointerDown={(e) => {
          // touch and pen: a tap chooses ω (there is no hover to follow, nor anything to pin)
          lastPointer.current = e.pointerType;
          if (e.pointerType !== 'mouse') onMove(e);
        }}
        onPointerLeave={(e) => e.pointerType === 'mouse' && !p.pinned && p.onHover(null)}
        onClick={() => lastPointer.current === 'mouse' && p.onPin()}
        role="img"
        aria-label="Bode diagram"
      >
        <defs>
          <clipPath id="clipMag">
            <rect x={L} y={T} width={pw} height={ph1} />
          </clipPath>
          <clipPath id="clipPh">
            <rect x={L} y={y2top} width={pw} height={ph2} />
          </clipPath>
        </defs>
        {/* frames */}
        <rect x={L} y={T} width={pw} height={ph1} className="frame" />
        <rect x={L} y={y2top} width={pw} height={ph2} className="frame" />
        {/* x grid */}
        {minors.map((x, i) => (
          <g key={`mn${i}`}>
            <line x1={x} x2={x} y1={T} y2={T + ph1} className="grid minor" />
            <line x1={x} x2={x} y1={y2top} y2={y2top + ph2} className="grid minor" />
          </g>
        ))}
        {majors.map(({ x, k }) => (
          <g key={`mj${k}`}>
            <line x1={x} x2={x} y1={T} y2={T + ph1} className="grid" />
            <line x1={x} x2={x} y1={y2top} y2={y2top + ph2} className="grid" />
            {(decadesShown <= 9 || k % 2 === 0) && (
              <text x={x} y={H - B + 16} className="tick" textAnchor="middle">
                {decadeLabel(k, p.lang)}
              </text>
            )}
          </g>
        ))}
        <text x={L + pw / 2} y={H - 4} className="axlabel" textAnchor="middle">
          {p.labels.freq}
        </text>
        {/* y grids */}
        {magTicks.map((v) => (
          <g key={`mt${v}`}>
            <line x1={L} x2={L + pw} y1={Ym(v)} y2={Ym(v)} className={v === 0 ? 'grid zero' : 'grid'} />
            <text x={L - 6} y={Ym(v) + 4} className="tick" textAnchor="end">
              {fmt(v, p.lang)}
            </text>
          </g>
        ))}
        {phTicks.map((v) => (
          <g key={`pt${v}`}>
            <line x1={L} x2={L + pw} y1={Yp(v)} y2={Yp(v)} className={v % 360 === 180 || v % 360 === -180 ? 'grid zero' : 'grid'} />
            <text x={L - 6} y={Yp(v) + 4} className="tick" textAnchor="end">
              {fmt(v, p.lang)}
            </text>
          </g>
        ))}
        <text transform={`translate(14 ${T + ph1 / 2}) rotate(-90)`} className="axlabel" textAnchor="middle">
          {p.labels.mag}
        </text>
        <text transform={`translate(14 ${y2top + ph2 / 2}) rotate(-90)`} className="axlabel" textAnchor="middle">
          {p.labels.phase}
        </text>

        {/* magnitude curves */}
        <g clipPath="url(#clipMag)">
          {p.showFactors &&
            p.factors.map((f, i) => (
              <path
                key={`fm${f.key}`}
                d={pathOf(xs, p.data.w.map((w) => Ym(f.mag(w))), clipM[0], clipM[1])}
                className={`curve factor ${FACTOR_COLORS[i % FACTOR_COLORS.length]}`}
              />
            ))}
          {p.overlay && (
            <path
              d={pathOf(p.overlay.data.w.map(X), p.overlay.data.mag.map(Ym), clipM[0], clipM[1])}
              className="curve overlay"
            />
          )}
          {p.showAsym && <path d={pathOf(xs, p.data.amag.map(Ym), clipM[0], clipM[1])} className="curve asym" />}
          <path d={pathOf(xs, p.data.mag.map(Ym), clipM[0], clipM[1])} className="curve main" />
          {gmLine && inX(gmLine.x) && (
            <g className={`margin ${gmLine.ok ? 'ok' : 'bad'}`}>
              <line x1={gmLine.x} x2={gmLine.x} y1={gmLine.y1} y2={gmLine.y2} />
              <circle cx={gmLine.x} cy={gmLine.y1} r={3} />
              <text x={gmLine.x + 5} y={(gmLine.y1 + gmLine.y2) / 2}>
                {p.labels.gm}
              </text>
            </g>
          )}
        </g>
        {/* phase curves */}
        <g clipPath="url(#clipPh)">
          {p.showFactors &&
            p.factors.map((f, i) => (
              <path
                key={`fp${f.key}`}
                d={pathOf(xs, p.data.w.map((w) => Yp(f.ph(w))), clipP[0], clipP[1])}
                className={`curve factor ${FACTOR_COLORS[i % FACTOR_COLORS.length]}`}
              />
            ))}
          {p.overlay && (
            <path
              d={pathOf(p.overlay.data.w.map(X), p.overlay.data.ph.map(Yp), clipP[0], clipP[1])}
              className="curve overlay"
            />
          )}
          {p.showAsym && <path d={pathOf(xs, p.data.aph.map(Yp), clipP[0], clipP[1])} className="curve asym" />}
          <path d={pathOf(xs, p.data.ph.map(Yp), clipP[0], clipP[1])} className="curve main" />
          {pmLine && inX(pmLine.x) && (
            <g className={`margin ${pmLine.ok ? 'ok' : 'bad'}`}>
              <line x1={L} x2={L + pw} y1={pmLine.y2} y2={pmLine.y2} className="refline" />
              <line x1={pmLine.x} x2={pmLine.x} y1={pmLine.y1} y2={pmLine.y2} />
              <circle cx={pmLine.x} cy={pmLine.y1} r={3} />
              <text x={pmLine.x + 5} y={(pmLine.y1 + pmLine.y2) / 2}>
                {p.labels.pm}
              </text>
            </g>
          )}
          {!pmLine && gmLine && (
            <line x1={L} x2={L + pw} y1={Yp(gmLine.ref)} y2={Yp(gmLine.ref)} className="margin refline" />
          )}
        </g>

        {/* cursor */}
        {ws !== null && at && inX(X(ws)) && (
          <g className={`cursor ${p.pinned ? 'pinned' : ''}`}>
            <line x1={X(ws)} x2={X(ws)} y1={T} y2={T + ph1} />
            <line x1={X(ws)} x2={X(ws)} y1={y2top} y2={y2top + ph2} />
            {at.mag >= m0 && at.mag <= m1 && <circle cx={X(ws)} cy={Ym(at.mag)} r={4} />}
            {at.ph >= q0 && at.ph <= q1 && <circle cx={X(ws)} cy={Yp(at.ph)} r={4} />}
          </g>
        )}
      </svg>
    </div>
  );
}

function phaseRefAt(factors: Factor[], w: number) {
  const ph = evalAt(factors, w).ph;
  return -180 + 360 * Math.round((ph + 180) / 360);
}

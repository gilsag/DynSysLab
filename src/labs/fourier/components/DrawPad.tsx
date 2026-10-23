import { useCallback, useEffect, useRef } from 'react';
import { useT } from '../i18n';
import { resamplePeriodic } from '../lib/fourier';
import { drawPlot, plotMargins, PlotSpec, useThemeTick, useWidth } from '@shared/Plot';

const RES = 512;
const OUT = 4096;
const YMAX = 1.5;
const H = 230;

interface Props {
  samples: Float64Array | null;
  onChange: (s: Float64Array) => void;
  onFromCurrent: () => void;
}

export function DrawPad({ samples, onChange, onFromCurrent }: Props) {
  const t = useT();
  const [wrapRef, w] = useWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const local = useRef<Float64Array>(new Float64Array(RES));
  const drawing = useRef(false);
  const lastIdx = useRef<number | null>(null);
  const lastVal = useRef(0);
  const pending = useRef(false);
  const theme = useThemeTick();
  const hint = t('drawPeriodHint');

  const specFor = useCallback(
    (): PlotSpec => {
      const y = new Float64Array(RES + 1);
      y.set(local.current);
      y[RES] = local.current[0];
      return {
        series: [{ y, xStart: 0, xStep: 1 / RES, color: '--c-signal', width: 2.2 }],
        xRange: [0, 1],
        yRange: [-YMAX, YMAX],
        xLabel: 't / T  ·  ' + hint,
        hLines: [{ v: 0, color: '--axis' }],
      };
    },
    [hint],
  );

  const redraw = useCallback(() => {
    if (canvasRef.current) drawPlot(canvasRef.current, w, H, specFor());
  }, [w, specFor]);

  useEffect(() => {
    if (!drawing.current && samples) local.current = resamplePeriodic(samples, RES);
    redraw();
  }, [samples, redraw, theme]);

  const commit = () => {
    if (pending.current) return;
    pending.current = true;
    requestAnimationFrame(() => {
      pending.current = false;
      onChange(resamplePeriodic(local.current, OUT));
    });
  };

  const toData = (e: React.PointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    const m = plotMargins({ xLabel: 'x' });
    const u = (e.clientX - r.left - m.l) / (r.width - m.l - m.r);
    const v = YMAX - ((e.clientY - r.top - m.t) / (r.height - m.t - m.b)) * 2 * YMAX;
    return [Math.min(Math.max(u, 0), 0.99999), Math.min(Math.max(v, -YMAX), YMAX)];
  };

  const apply = (u: number, v: number) => {
    const idx = Math.min(RES - 1, Math.max(0, Math.round(u * RES)));
    const arr = local.current;
    if (lastIdx.current === null) arr[idx] = v;
    else {
      const i0 = lastIdx.current;
      const v0 = lastVal.current;
      const steps = Math.abs(idx - i0);
      for (let s = 0; s <= steps; s++) {
        const i = i0 + Math.sign(idx - i0) * s;
        arr[i] = steps ? v0 + ((v - v0) * s) / steps : v;
      }
    }
    lastIdx.current = idx;
    lastVal.current = v;
    redraw();
    commit();
  };

  const smooth = () => {
    const a = local.current;
    const out = new Float64Array(RES);
    for (let i = 0; i < RES; i++) {
      const g = (j: number) => a[(i + j + RES) % RES];
      out[i] = (g(-2) + 4 * g(-1) + 6 * g(0) + 4 * g(1) + g(2)) / 16;
    }
    local.current = out;
    redraw();
    onChange(resamplePeriodic(out, OUT));
  };

  const clear = () => {
    local.current = new Float64Array(RES);
    redraw();
    onChange(new Float64Array(OUT));
  };

  return (
    <div>
      <div className="row wrap">
        <button onClick={onFromCurrent}>{t('drawFromCurrent')}</button>
        <button onClick={smooth}>{t('drawSmooth')}</button>
        <button onClick={clear}>{t('drawClear')}</button>
      </div>
      <div ref={wrapRef} className="plot drawpad">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drawing.current = true;
            lastIdx.current = null;
            apply(...toData(e));
          }}
          onPointerMove={(e) => {
            if (drawing.current) apply(...toData(e));
          }}
          onPointerUp={() => {
            drawing.current = false;
            lastIdx.current = null;
            commit();
          }}
        />
      </div>
    </div>
  );
}

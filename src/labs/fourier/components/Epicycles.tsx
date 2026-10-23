import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import type { Analysis } from '../lib/analysis';
import { M, maxAbs } from '../lib/fourier';
import { cssColor, useWidth } from '@shared/Plot';
import { Slider } from '@shared/ui';

const H = 340;

export function Epicycles({ a }: { a: Analysis }) {
  const t = useT();
  const [wrapRef, w] = useWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [speed, setSpeed] = useState(0.2);
  const [paused, setPaused] = useState(false);
  const live = useRef({ a, speed, paused, w, phase: 0, last: 0, peak: 1 });
  live.current.a = a;
  live.current.speed = speed;
  live.current.paused = paused;
  live.current.w = w;

  useEffect(() => {
    live.current.peak = Math.max(maxAbs(a.approxWave), maxAbs(a.refWave), 1e-9);
  }, [a]);

  useEffect(() => {
    let raf = 0;
    const loop = (ts: number) => {
      const s = live.current;
      const dt = s.last ? Math.min(0.1, (ts - s.last) / 1000) : 0;
      s.last = ts;
      if (!s.paused) s.phase = (s.phase + s.speed * dt) % 1;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const draw = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const { a, w: W, phase, peak } = live.current;
      const dpr = window.devicePixelRatio || 1;
      if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(H * dpr)) {
        cvs.width = Math.round(W * dpr);
        cvs.height = Math.round(H * dpr);
        cvs.style.width = W + 'px';
        cvs.style.height = H + 'px';
      }
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cBg = cssColor('--plot-bg');
      const cGrid = cssColor('--grid');
      const cApprox = cssColor('--c-approx');
      const cSignal = cssColor('--c-signal');
      const cAxis = cssColor('--axis');
      ctx.fillStyle = cBg;
      ctx.fillRect(0, 0, W, H);

      const { ref, weights, approxWave, refWave, K } = a;
      const dc = ref.re[0] * weights[0];
      let amax = 0;
      for (let k = 1; k <= K; k++) if (weights[k]) amax = Math.max(amax, Math.hypot(ref.re[k], ref.im[k]) * weights[k]);
      const cx = Math.max(90, W * 0.22);
      const cy = H / 2;
      const X0 = Math.max(cx + 80, W * 0.46);
      let scale = (H / 2 - 16) / Math.max(1e-9, peak * 1.05, Math.abs(dc) + amax);
      scale = Math.min(scale, (cx - 12) / Math.max(1e-9, amax));

      // axes of the trace
      ctx.strokeStyle = cGrid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X0, cy + 0.5);
      ctx.lineTo(W - 6, cy + 0.5);
      ctx.moveTo(X0 + 0.5, 8);
      ctx.lineTo(X0 + 0.5, H - 8);
      ctx.stroke();

      // chain of phasors
      let x = cx;
      let y = cy - dc * scale;
      if (Math.abs(dc) > 1e-12) {
        ctx.strokeStyle = cAxis;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      for (let k = 1; k <= K; k++) {
        const wk = weights[k];
        if (!wk) continue;
        const A = Math.hypot(ref.re[k], ref.im[k]) * wk;
        const r = A * scale;
        const th = 2 * Math.PI * k * phase + Math.atan2(ref.im[k], ref.re[k]);
        const nx = x + r * Math.sin(th);
        const ny = y - r * Math.cos(th);
        if (r > 1.2) {
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = cAxis;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (r > 0.3) {
          ctx.strokeStyle = cApprox;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        x = nx;
        y = ny;
      }

      // traces: t = phase at X0, older times to the right; two periods visible
      const pxPerCycle = (W - 6 - X0) / 2;
      const trace = (wave: Float64Array, color: string, width: number, alpha: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let px = X0; px <= W - 6; px++) {
          let tt = phase - (px - X0) / pxPerCycle;
          tt -= Math.floor(tt);
          const v = wave[Math.floor(tt * M) % M];
          const py = cy - v * scale;
          if (px === X0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      };
      trace(refWave, cSignal, 1.2, 0.45);
      trace(approxWave, cApprox, 2, 1);

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = cAxis;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(X0, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cApprox;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
      ctx.arc(X0, y, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div>
      <p className="hint">{t('epiHint')}</p>
      <div className="row wrap">
        <button onClick={() => setPaused((p) => !p)}>{paused ? '▶ ' + t('resume') : '❚❚ ' + t('pause')}</button>
        <div className="grow">
          <Slider
            label={t('speed')}
            value={speed}
            min={0.02}
            max={1}
            step={0.01}
            onChange={setSpeed}
            display={speed.toFixed(2) + ' T/s'}
          />
        </div>
      </div>
      <div ref={wrapRef} className="plot">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { audio } from '../lib/audio';
import { detectPitch, extractPeriod, Pitch } from '../lib/pitch';
import { drawPlot, PlotSpec, useWidth } from '@shared/Plot';

interface Props {
  onCapture: (samples: Float64Array, f0: number) => void;
}

const SPEC_FMIN = 40;
const SPEC_FMAX = 8000;

export function MicPanel({ onCapture }: Props) {
  const t = useT();
  const [active, setActive] = useState(false);
  const [err, setErr] = useState(false);
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [wrapRef, w] = useWidth<HTMLDivElement>();
  const waveRef = useRef<HTMLCanvasElement | null>(null);
  const specRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const anRef = useRef<AnalyserNode | null>(null);
  const pitchRef = useRef<Pitch | null>(null);
  const goodRef = useRef<{ buf: Float32Array; f0: number } | null>(null);
  const wRef = useRef(w);
  wRef.current = w;
  const labels = useRef({ wave: '', spec: '' });
  labels.current = { wave: t('micWave'), spec: t('micSpectrum') };

  const stop = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    srcRef.current?.disconnect();
    streamRef.current = null;
    srcRef.current = null;
    anRef.current = null;
    setActive(false);
  };

  const start = async () => {
    setErr(false);
    try {
      const ctx = audio.ensure();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 8192;
      an.smoothingTimeConstant = 0.5;
      src.connect(an);
      streamRef.current = stream;
      srcRef.current = src;
      anRef.current = an;
      setActive(true);
    } catch {
      setErr(true);
    }
  };

  useEffect(() => () => stop(), []);

  useEffect(() => {
    if (!active) return;
    const an = anRef.current;
    if (!an) return;
    const sr = an.context.sampleRate;
    const tbuf = new Float32Array(an.fftSize);
    const fbuf = new Float32Array(an.frequencyBinCount);
    const freqs = new Float64Array(fbuf.length);
    for (let i = 0; i < freqs.length; i++) freqs[i] = (i * sr) / an.fftSize;
    let last = 0;
    let raf = 0;
    const loop = (ts: number) => {
      an.getFloatTimeDomainData(tbuf);
      an.getFloatFrequencyData(fbuf);
      if (ts - last > 100) {
        last = ts;
        const p = detectPitch(tbuf.subarray(tbuf.length - 3072), sr); // same window is used for capture
        pitchRef.current = p;
        // keep a snapshot of the last buffer with a stable pitch so a capture is always consistent
        if (p && p.clarity > 0.8) goodRef.current = { buf: tbuf.slice(tbuf.length - 3072), f0: p.f0 };
        setPitch(p);
      }
      const W = wRef.current;
      const show = 2048;
      const seg = tbuf.subarray(tbuf.length - show);
      let pk = 0.05;
      for (let i = 0; i < seg.length; i++) pk = Math.max(pk, Math.abs(seg[i]));
      const waveSpec: PlotSpec = {
        series: [{ y: seg, xStart: 0, xStep: 1000 / sr, color: '--c-signal', width: 1.5 }],
        xRange: [0, (show * 1000) / sr],
        yRange: [-pk * 1.1, pk * 1.1],
        xLabel: labels.current.wave,
      };
      const p = pitchRef.current;
      const vLines = [];
      if (p) for (let k = 1; k <= 16 && k * p.f0 < SPEC_FMAX; k++) vLines.push({ v: k * p.f0, color: '--c-approx', dash: [3, 4], label: String(k) });
      const specSpec: PlotSpec = {
        series: [{ x: freqs, y: fbuf, color: '--c-signal', width: 1.4 }],
        xRange: [SPEC_FMIN, SPEC_FMAX],
        yRange: [-110, -10],
        xLog: true,
        xLabel: labels.current.spec,
        vLines,
      };
      if (waveRef.current) drawPlot(waveRef.current, W, 150, waveSpec);
      if (specRef.current) drawPlot(specRef.current, W, 210, specSpec);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const capture = () => {
    const g = goodRef.current;
    const an = anRef.current;
    if (!g || !an) return;
    onCapture(extractPeriod(g.buf, an.context.sampleRate, g.f0), g.f0);
  };


  return (
    <div>
      <p className="hint">{t('micExplain')}</p>
      <div className="row wrap">
        {!active ? (
          <button className="primary" onClick={start}>
            🎤 {t('micStart')}
          </button>
        ) : (
          <button onClick={stop}>{t('micStop')}</button>
        )}
        <button className="primary" disabled={!active || (!pitch && !goodRef.current)} onClick={capture}>
          {t('micCapture')}
        </button>
        {active && (
          <span className="readout">
            {pitch ? `${t('micDetected')}: f₀ = ${pitch.f0.toFixed(1)} Hz (T = ${(1000 / pitch.f0).toFixed(2)} ms)` : t('micNoPitch')}
          </span>
        )}
      </div>
      {err && <p className="warn">{t('micError')}</p>}
      <div ref={wrapRef} className="plot">
        {active && (
          <>
            <canvas ref={waveRef} />
            <canvas ref={specRef} />
          </>
        )}
      </div>
    </div>
  );
}

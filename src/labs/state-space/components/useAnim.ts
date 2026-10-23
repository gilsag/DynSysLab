import { useEffect, useRef, useState } from 'react';

/** Reloj de animación: recorre [0, T] en `dur` segundos. */
export function useAnim(T: number, dur = 6) {
  const [t, setT] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const step = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((v) => {
        const nv = (v ?? 0) + (dt * T) / dur;
        if (nv >= T) { setPlaying(false); return T; }
        return nv;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, T, dur]);
  return {
    t, playing,
    play: () => { setT((v) => (v == null || v >= T ? 0 : v)); setPlaying(true); },
    pause: () => setPlaying(false),
    reset: () => { setPlaying(false); setT(null); },
  };
}

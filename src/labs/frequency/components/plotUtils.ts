import { useEffect, useRef, useState } from 'react';

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 300 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(200, r.width), h: Math.max(120, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function niceStep(span: number, target = 6) {
  const raw = span / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const n = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return n * p;
}

export function linTicks(lo: number, hi: number, target = 6) {
  const st = niceStep(hi - lo, target);
  const out: number[] = [];
  for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return out;
}

export function phaseTicks(lo: number, hi: number) {
  const span = hi - lo;
  const st = span <= 120 ? 15 : span <= 270 ? 45 : span <= 720 ? 90 : span <= 1440 ? 180 : 360 * Math.ceil(span / 3600);
  const out: number[] = [];
  for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(v);
  return out;
}

/** Pad a [min,max] interval to tidy limits. */
export function niceLimits(min: number, max: number, minSpan: number, step: number) {
  if (!isFinite(min) || !isFinite(max)) return [-1, 1];
  if (max - min < minSpan) {
    const c = (max + min) / 2;
    min = c - minSpan / 2;
    max = c + minSpan / 2;
  }
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/** Path string from points, breaking on non-finite values and clamping to [ylo, yhi] margin. */
export function pathOf(xs: number[], ys: number[], ylo = -1e6, yhi = 1e6) {
  let d = '';
  let pen = false;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    let y = ys[i];
    if (!isFinite(x) || !isFinite(y) || isNaN(y)) {
      pen = false;
      continue;
    }
    y = Math.min(yhi, Math.max(ylo, y));
    d += `${pen ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    pen = true;
  }
  return d;
}

export const supDigits = (n: number) =>
  String(n)
    .replace('-', '⁻')
    .replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);

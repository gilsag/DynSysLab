// Pitch detection (McLeod normalized square difference function) and single-period extraction.

export interface Pitch {
  f0: number;
  clarity: number;
}

export function detectPitch(buf: ArrayLike<number>, sr: number, fmin = 60, fmax = 1500): Pitch | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return null;

  const maxLag = Math.min(Math.floor(sr / fmin), Math.floor(n / 2));
  const minLag = Math.max(2, Math.floor(sr / fmax));
  const nsdf = new Float64Array(maxLag + 2);
  for (let tau = 0; tau <= maxLag + 1; tau++) {
    let acf = 0;
    let m = 0;
    for (let i = 0; i < n - tau; i++) {
      const a = buf[i];
      const b = buf[i + tau];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }

  const peaks: number[] = [];
  let tau = 1;
  while (tau < maxLag && nsdf[tau] > 0) tau++;
  while (tau < maxLag) {
    while (tau < maxLag && nsdf[tau] <= 0) tau++;
    let best = -1;
    let bestV = -Infinity;
    while (tau < maxLag && nsdf[tau] > 0) {
      if (nsdf[tau] > bestV) {
        bestV = nsdf[tau];
        best = tau;
      }
      tau++;
    }
    if (best > 0) peaks.push(best);
  }
  if (!peaks.length) return null;
  let vmax = 0;
  for (const p of peaks) vmax = Math.max(vmax, nsdf[p]);
  const chosen = peaks.find((p) => p >= minLag && nsdf[p] >= 0.88 * vmax);
  if (chosen === undefined) return null;
  const a = nsdf[chosen - 1];
  const b = nsdf[chosen];
  const c = nsdf[chosen + 1];
  if (b < 0.5) return null;
  const den = a - 2 * b + c;
  const delta = den !== 0 ? (0.5 * (a - c)) / den : 0;
  return { f0: sr / (chosen + delta), clarity: b };
}

function lin(buf: ArrayLike<number>, pos: number): number {
  const i = Math.floor(pos);
  const f = pos - i;
  const i1 = Math.min(i + 1, buf.length - 1);
  return buf[i] * (1 - f) + buf[i1] * f;
}

/**
 * Extracts one period from a recording by averaging several consecutive periods aligned at a
 * rising zero crossing. Returns `out` samples, zero mean and unit peak.
 */
export function extractPeriod(buf: ArrayLike<number>, sr: number, f0: number, out = 4096): Float64Array {
  const n = buf.length;
  const P = sr / f0;
  let mu = 0;
  for (let i = 0; i < n; i++) mu += buf[i];
  mu /= n;
  let start = 0;
  const searchEnd = Math.min(n - 1, Math.ceil(P) + 2);
  for (let i = 1; i < searchEnd; i++) {
    const a = buf[i - 1] - mu;
    const b = buf[i] - mu;
    if (a < 0 && b >= 0) {
      start = i - 1 + -a / (b - a);
      break;
    }
  }
  const count = Math.max(1, Math.min(8, Math.floor((n - 2 - start) / P)));
  const res = new Float64Array(out);
  for (let i = 0; i < out; i++) {
    const u = i / out;
    let s = 0;
    for (let m = 0; m < count; m++) s += lin(buf, start + (m + u) * P);
    res[i] = s / count;
  }
  let m2 = 0;
  for (let i = 0; i < out; i++) m2 += res[i];
  m2 /= out;
  let peak = 0;
  for (let i = 0; i < out; i++) {
    res[i] -= m2;
    peak = Math.max(peak, Math.abs(res[i]));
  }
  if (peak > 0) for (let i = 0; i < out; i++) res[i] /= peak;
  return res;
}

import type { TKey } from '../i18n';

// Symbols and labels that are identical in every language.
export const COMMON = {
  smFejer: 'Fejér',
  smLanczos: 'Lanczos',
  axisK: 'k',
  axisHz: 'Hz',
  scaleDb: 'dB',
  tOverT: 't / T',
  mF0: 'f₀',
  mPeriod: 'T',
  mN: 'N',
  hK: 'k',
  hFreq: 'f [Hz]',
  hAmp: 'A_k',
  hDb: 'dB',
  hPhase: 'φ_k [°]',
  slope1: '∝ 1/k',
  slope2: '∝ 1/k²',
  nLabel: 'N',
  bodeMag: '|H(jω)| [dB]',
  bodePhase: '∠H(jω) [°]',
  ltiRatio: 'f_c / f₀',
} satisfies Partial<Record<TKey, string>>;

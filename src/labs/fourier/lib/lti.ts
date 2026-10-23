// Linear time-invariant systems applied in steady state to a periodic input:
//   y(t) = H(0) a_0 + sum_k |H(j k w0)| A_k cos(k w0 t + phi_k + arg H(j k w0))

export type LtiType = 'none' | 'lp1' | 'hp1' | 'lp2' | 'bp2';

export interface LtiSettings {
  type: LtiType;
  fc: number; // cutoff / natural frequency in Hz
  zeta: number; // damping ratio (2nd order)
}

function cdiv(ar: number, ai: number, br: number, bi: number): [number, number] {
  const d = br * br + bi * bi;
  return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
}

/** Complex frequency response H(j 2 pi f). */
export function ltiResponse(f: number, s: LtiSettings): [number, number] {
  const x = f / s.fc;
  switch (s.type) {
    case 'none':
      return [1, 0];
    case 'lp1':
      return cdiv(1, 0, 1, x);
    case 'hp1':
      return cdiv(0, x, 1, x);
    case 'lp2':
      return cdiv(1, 0, 1 - x * x, 2 * s.zeta * x);
    case 'bp2':
      return cdiv(0, 2 * s.zeta * x, 1 - x * x, 2 * s.zeta * x);
  }
}

/** |H(j inf)|, used to account for the energy of harmonics beyond the computed range. */
export function ltiHighFreqGain(type: LtiType): number {
  return type === 'none' || type === 'hp1' ? 1 : 0;
}

export function isSecondOrder(type: LtiType): boolean {
  return type === 'lp2' || type === 'bp2';
}

export function ltiTex(type: LtiType): string {
  switch (type) {
    case 'none':
      return 'H(s)=1';
    case 'lp1':
      return 'H(s)=\\dfrac{1}{1+s/\\omega_c}';
    case 'hp1':
      return 'H(s)=\\dfrac{s/\\omega_c}{1+s/\\omega_c}';
    case 'lp2':
      return 'H(s)=\\dfrac{\\omega_n^2}{s^2+2\\zeta\\omega_n s+\\omega_n^2}';
    case 'bp2':
      return 'H(s)=\\dfrac{2\\zeta\\omega_n s}{s^2+2\\zeta\\omega_n s+\\omega_n^2}';
  }
}

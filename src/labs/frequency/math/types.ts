export type RootKind = 'pole' | 'zero';

/** A pole or zero. If im > 0 the entry represents a complex-conjugate pair re ± j·im. */
export interface Root {
  id: string;
  kind: RootKind;
  re: number;
  im: number;
}

/**
 * gainMode:
 *  - 'bode': the gain parameter is K_B in  H(s) = K_B · s^(m0-n0) · Π(1 - s/z) / Π(1 - s/p) · e^{-sT}
 *            (low-frequency level stays put when roots move)
 *  - 'lead': the gain parameter is K   in  H(s) = K · Π(s - z) / Π(s - p) · e^{-sT}
 *            (root-locus form)
 */
export type GainMode = 'bode' | 'lead';

export interface SystemDef {
  roots: Root[];
  gainMode: GainMode;
  gainDb: number;
  gainNeg: boolean;
  delay: number;
}

export interface Complex {
  re: number;
  im: number;
}

let idCounter = 0;
export const newId = () => `r${Date.now().toString(36)}${(idCounter++).toString(36)}`;

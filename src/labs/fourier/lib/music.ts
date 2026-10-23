import type { Lang } from '../i18n';

export const NOTE_NAMES: Record<Lang, string[]> = {
  en: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'],
  es: ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'],
  fr: ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'],
  it: ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'],
  pt: ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'],
  // German names: B natural is H, sharps take the suffix -is
  de: ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'Ais', 'H'],
};

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function freqToMidi(f: number, a4 = 440): number {
  return 69 + 12 * Math.log2(f / a4);
}

/** Scientific pitch notation: middle C = C4, A4 = MIDI 69. */
export function noteName(midi: number, lang: Lang): string {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[lang][pc] + oct;
}

export interface NearestNote {
  midi: number;
  name: string;
  cents: number;
}

export function nearestNote(f: number, a4: number, lang: Lang): NearestNote {
  const m = freqToMidi(f, a4);
  const r = Math.round(m);
  return { midi: r, name: noteName(r, lang), cents: 100 * (m - r) };
}

export function fmtCents(c: number): string {
  const r = Math.round(c);
  if (r === 0) return '±0¢';
  return (r > 0 ? '+' : '−') + Math.abs(r) + '¢';
}

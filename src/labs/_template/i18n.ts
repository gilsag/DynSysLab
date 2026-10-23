// All UI text. Every key needs the six languages; TypeScript reports any that are missing.
// Inline maths: write $…$ in a string and render it with <Rich text={…} /> from components/ui.
import { createContext, useCallback, useContext } from 'react';
import type { LabLang } from '@shared/LabChrome';

export type Lang = LabLang;
type S6 = Record<Lang, string>;

const D = {
  // Title pattern of the suite. When the lab is ready, add it to SUITE_LABS in src/shared/suite.ts
  // and its glyph to GLYPHS, and pass lab="…" to LabHeader instead of title.
  title: {
    es: 'Laboratorio virtual de sistemas de primer orden',
    en: 'First-Order Systems Virtual Lab',
    fr: 'Laboratoire virtuel de systèmes du premier ordre',
    de: 'Virtuelles Labor: Systeme erster Ordnung',
    it: 'Laboratorio virtuale di sistemi del primo ordine',
    pt: 'Laboratório virtual de sistemas de primeira ordem',
  },
  subtitle: {
    es: 'Ganancia, constante de tiempo y respuesta temporal',
    en: 'Gain, time constant and time response',
    fr: 'Gain, constante de temps et réponse temporelle',
    de: 'Verstärkung, Zeitkonstante und Zeitantwort',
    it: 'Guadagno, costante di tempo e risposta temporale',
    pt: 'Ganho, constante de tempo e resposta temporal',
  },
  secSystem: { es: 'Sistema', en: 'System', fr: 'Système', de: 'System', it: 'Sistema', pt: 'Sistema' },
  tipSystem: {
    es: 'G(s) = K / (τs + 1). Cambie la ganancia y la constante de tiempo.',
    en: 'G(s) = K / (τs + 1). Change the gain and the time constant.',
    fr: 'G(s) = K / (τs + 1). Modifiez le gain et la constante de temps.',
    de: 'G(s) = K / (τs + 1). Verstärkung und Zeitkonstante ändern.',
    it: 'G(s) = K / (τs + 1). Modificate il guadagno e la costante di tempo.',
    pt: 'G(s) = K / (τs + 1). Altere o ganho e a constante de tempo.',
  },
  gain: { es: 'Ganancia K', en: 'Gain K', fr: 'Gain K', de: 'Verstärkung K', it: 'Guadagno K', pt: 'Ganho K' },
  tau: { es: 'Constante de tiempo τ', en: 'Time constant τ', fr: 'Constante de temps τ', de: 'Zeitkonstante τ', it: 'Costante di tempo τ', pt: 'Constante de tempo τ' },
  input: { es: 'Entrada', en: 'Input', fr: 'Entrée', de: 'Eingang', it: 'Ingresso', pt: 'Entrada' },
  step: { es: 'Escalón', en: 'Step', fr: 'Échelon', de: 'Sprung', it: 'Gradino', pt: 'Degrau' },
  impulse: { es: 'Impulso', en: 'Impulse', fr: 'Impulsion', de: 'Impuls', it: 'Impulso', pt: 'Impulso' },
  idea: {
    es: 'La salida alcanza el 63 % de su valor final en $t = \\tau$ y queda dentro del 2 % en $t \\approx 4\\tau$.',
    en: 'The output reaches 63 % of its final value at $t = \\tau$ and stays within 2 % from $t \\approx 4\\tau$.',
    fr: 'La sortie atteint 63 % de sa valeur finale en $t = \\tau$ et reste à 2 % près dès $t \\approx 4\\tau$.',
    de: 'Der Ausgang erreicht bei $t = \\tau$ 63 % seines Endwerts und bleibt ab $t \\approx 4\\tau$ innerhalb von 2 %.',
    it: 'L’uscita raggiunge il 63 % del valore finale in $t = \\tau$ e resta entro il 2 % da $t \\approx 4\\tau$.',
    pt: 'A saída atinge 63 % do valor final em $t = \\tau$ e fica dentro de 2 % a partir de $t \\approx 4\\tau$.',
  },
  mFinal: { es: 'Valor final', en: 'Final value', fr: 'Valeur finale', de: 'Endwert', it: 'Valore finale', pt: 'Valor final' },
  mSettle: { es: 'Asentamiento (2 %)', en: 'Settling (2 %)', fr: 'Établissement (2 %)', de: 'Einschwingzeit (2 %)', it: 'Assestamento (2 %)', pt: 'Acomodação (2 %)' },
  tipSettle: { es: 'Tiempo hasta quedar dentro del 2 % del valor final: 4τ.', en: 'Time to stay within 2 % of the final value: 4τ.', fr: 'Temps pour rester à 2 % de la valeur finale : 4τ.', de: 'Zeit bis zum Verbleib innerhalb von 2 % des Endwerts: 4τ.', it: 'Tempo per restare entro il 2 % del valore finale: 4τ.', pt: 'Tempo para ficar dentro de 2 % do valor final: 4τ.' },
  plotTime: { es: 'Respuesta temporal', en: 'Time response', fr: 'Réponse temporelle', de: 'Zeitantwort', it: 'Risposta temporale', pt: 'Resposta temporal' },
  tipTime: { es: 'Salida y(t) para la entrada elegida.', en: 'Output y(t) for the selected input.', fr: 'Sortie y(t) pour l’entrée choisie.', de: 'Ausgang y(t) für den gewählten Eingang.', it: 'Uscita y(t) per l’ingresso scelto.', pt: 'Saída y(t) para a entrada escolhida.' },
  output: { es: 'salida y(t)', en: 'output y(t)', fr: 'sortie y(t)', de: 'Ausgang y(t)', it: 'uscita y(t)', pt: 'saída y(t)' },
  time: { es: 'Tiempo [s]', en: 'Time [s]', fr: 'Temps [s]', de: 'Zeit [s]', it: 'Tempo [s]', pt: 'Tempo [s]' },
  tabA: { es: 'Teoría', en: 'Theory', fr: 'Théorie', de: 'Theorie', it: 'Teoria', pt: 'Teoria' },
  tabB: { es: 'Ejercicio', en: 'Exercise', fr: 'Exercice', de: 'Übung', it: 'Esercizio', pt: 'Exercício' },
  exercise: {
    es: '¿Qué valor de τ hace que la salida llegue a 0,9 K en 2 s?',
    en: 'Which τ makes the output reach 0.9 K in 2 s?',
    fr: 'Quelle valeur de τ amène la sortie à 0,9 K en 2 s ?',
    de: 'Welches τ lässt den Ausgang in 2 s 0,9 K erreichen?',
    it: 'Quale τ porta l’uscita a 0,9 K in 2 s?',
    pt: 'Qual τ faz a saída chegar a 0,9 K em 2 s?',
  },
} satisfies Record<string, S6>;

export type TKey = keyof typeof D;

export function translate(lang: Lang, key: TKey): string {
  return D[key][lang];
}

export const LangContext = createContext<Lang>('es');
export function useT() {
  const lang = useContext(LangContext);
  return useCallback((k: TKey) => translate(lang, k), [lang]);
}

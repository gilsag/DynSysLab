/* ==========================================================================
   DynSysLab DIE-USM · suite registry
   The single place that lists the labs. vite.config.ts reads it to build one
   page per lab (<id>.html), the home page lists it, and every lab's About
   dialog links to the others. To add a lab: `npm run new-lab -- <id>`, then
   add an entry here.
   ========================================================================== */

export type LabLang = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt';
export const LAB_LANGS: [LabLang, string][] = [
  ['es', 'Español'],
  ['en', 'English'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['it', 'Italiano'],
  ['pt', 'Português'],
];
type S6 = Record<LabLang, string>;

/** Umbrella name, identical in every language. */
export const SUITE_NAME = 'DynSysLab DIE-USM';

export interface LabInfo {
  /** Title, following the pattern "Laboratorio virtual de …" in each language. */
  title: S6;
  /** One or two sentences for the home page. */
  summary: S6;
}

/** Every published lab, in display order. The key is the folder in src/labs/ and the page name (<key>.html). */
export const SUITE_LABS = {
  taylor: {
    title: {
      es: 'Laboratorio virtual de series de Taylor y linealización',
      en: 'Taylor Series and Linearization Virtual Lab',
      fr: 'Laboratoire virtuel de séries de Taylor et linéarisation',
      de: 'Virtuelles Labor: Taylor-Reihen und Linearisierung',
      it: 'Laboratorio virtuale di serie di Taylor e linearizzazione',
      pt: 'Laboratório virtual de séries de Taylor e linearização',
    },
    summary: {
      es: 'Sumas parciales y radio de convergencia, recta tangente y rango de validez, equilibrios, jacobiano y diagrama de fase de sistemas no lineales.',
      en: 'Partial sums and radius of convergence, tangent line and range of validity, equilibria, Jacobian and phase portrait of nonlinear systems.',
      fr: 'Sommes partielles et rayon de convergence, tangente et domaine de validité, équilibres, jacobienne et portrait de phase de systèmes non linéaires.',
      de: 'Partialsummen und Konvergenzradius, Tangente und Gültigkeitsbereich, Gleichgewichte, Jacobi-Matrix und Phasenporträt nichtlinearer Systeme.',
      it: 'Somme parziali e raggio di convergenza, retta tangente e intervallo di validità, equilibri, jacobiano e ritratto di fase di sistemi non lineari.',
      pt: 'Somas parciais e raio de convergência, reta tangente e faixa de validade, equilíbrios, jacobiano e diagrama de fase de sistemas não lineares.',
    },
  },
  convolution: {
    title: {
      es: 'Laboratorio virtual de convolución',
      en: 'Convolution Virtual Lab',
      fr: 'Laboratoire virtuel de convolution',
      de: 'Virtuelles Labor: Faltung',
      it: 'Laboratorio virtuale di convoluzione',
      pt: 'Laboratório virtual de convolução',
    },
    summary: {
      es: 'La receta gráfica (reflejar, desplazar, integrar), integrales de Duhamel con escalones e impulsos, respuesta de sistemas en cascada y en paralelo.',
      en: 'The graphical recipe (flip, shift, integrate), Duhamel integrals with steps and impulses, response of systems in cascade and in parallel.',
      fr: 'La recette graphique (retourner, décaler, intégrer), intégrales de Duhamel avec échelons et impulsions, systèmes en cascade et en parallèle.',
      de: 'Das grafische Verfahren (spiegeln, verschieben, integrieren), Duhamel-Integrale mit Sprüngen und Impulsen, Reihen- und Parallelschaltung.',
      it: 'La ricetta grafica (ribaltare, traslare, integrare), integrali di Duhamel con gradini e impulsi, sistemi in cascata e in parallelo.',
      pt: 'A receita gráfica (refletir, deslocar, integrar), integrais de Duhamel com degraus e impulsos, sistemas em cascata e em paralelo.',
    },
  },
  approximation: {
    title: {
      es: 'Laboratorio virtual de aproximación de funciones',
      en: 'Function Approximation Virtual Lab',
      fr: 'Laboratoire virtuel d’approximation de fonctions',
      de: 'Virtuelles Labor: Funktionsapproximation',
      it: 'Laboratorio virtuale di approssimazione di funzioni',
      pt: 'Laboratório virtual de aproximação de funções',
    },
    summary: {
      es: 'Señales básicas, error cuadrático, ecuaciones normales y matriz de Gram, ortogonalidad, pulsos, escalones, base trigonométrica y polinomios.',
      en: 'Basic signals, squared error, normal equations and Gram matrix, orthogonality, pulses, steps, trigonometric basis and polynomials.',
      fr: 'Signaux de base, erreur quadratique, équations normales et matrice de Gram, orthogonalité, impulsions, échelons, base trigonométrique et polynômes.',
      de: 'Grundsignale, quadratischer Fehler, Normalgleichungen und Gram-Matrix, Orthogonalität, Pulse, Sprünge, trigonometrische Basis und Polynome.',
      it: 'Segnali di base, errore quadratico, equazioni normali e matrice di Gram, ortogonalità, impulsi, gradini, base trigonometrica e polinomi.',
      pt: 'Sinais básicos, erro quadrático, equações normais e matriz de Gram, ortogonalidade, pulsos, degraus, base trigonométrica e polinômios.',
    },
  },
  'state-space': {
    title: {
      es: 'Laboratorio virtual de variables de estado',
      en: 'State-Space Virtual Lab',
      fr: 'Laboratoire virtuel de représentation d’état',
      de: 'Virtuelles Labor: Zustandsraum',
      it: 'Laboratorio virtuale di variabili di stato',
      pt: 'Laboratório virtual de variáveis de estado',
    },
    summary: {
      es: 'Sistemas definidos desde matrices, polos y ceros o circuitos; realizaciones, modos, diagramas de fase, cambio de coordenadas, respuesta temporal, controlabilidad y observabilidad.',
      en: 'Systems defined from matrices, poles and zeros, or circuits; realizations, modes, phase portraits, change of coordinates, time response, controllability and observability.',
      fr: 'Systèmes définis par des matrices, des pôles et zéros ou des circuits ; réalisations, modes, portraits de phase, changement de coordonnées, réponse temporelle, commandabilité et observabilité.',
      de: 'Systeme aus Matrizen, Polen und Nullstellen oder Schaltungen; Realisierungen, Moden, Phasenporträts, Koordinatenwechsel, Zeitantwort, Steuerbarkeit und Beobachtbarkeit.',
      it: 'Sistemi definiti da matrici, poli e zeri o circuiti; realizzazioni, modi, ritratti di fase, cambio di coordinate, risposta temporale, controllabilità e osservabilità.',
      pt: 'Sistemas definidos por matrizes, polos e zeros ou circuitos; realizações, modos, retratos de fase, mudança de coordenadas, resposta temporal, controlabilidade e observabilidade.',
    },
  },
  fourier: {
    title: {
      es: 'Laboratorio virtual de series de Fourier',
      en: 'Fourier Series Virtual Lab',
      fr: 'Laboratoire virtuel de séries de Fourier',
      de: 'Virtuelles Labor: Fourier-Reihen',
      it: 'Laboratorio virtuale di serie di Fourier',
      pt: 'Laboratório virtual de séries de Fourier',
    },
    summary: {
      es: 'Descomposición armónica de señales periódicas: aproximación con N términos, fenómeno de Gibbs, espectro, fasores, sistemas LTI y sonido.',
      en: 'Harmonic decomposition of periodic signals: N-term approximation, Gibbs phenomenon, spectrum, phasors, LTI systems and sound.',
      fr: 'Décomposition harmonique des signaux périodiques : approximation à N termes, phénomène de Gibbs, spectre, phaseurs, systèmes LTI et son.',
      de: 'Harmonische Zerlegung periodischer Signale: Näherung mit N Gliedern, Gibbs-Phänomen, Spektrum, Zeiger, LTI-Systeme und Klang.',
      it: 'Scomposizione armonica di segnali periodici: approssimazione con N termini, fenomeno di Gibbs, spettro, fasori, sistemi LTI e suono.',
      pt: 'Decomposição harmônica de sinais periódicos: aproximação com N termos, fenômeno de Gibbs, espectro, fasores, sistemas LTI e som.',
    },
  },
  frequency: {
    title: {
      es: 'Laboratorio virtual de respuesta en frecuencia',
      en: 'Frequency Response Virtual Lab',
      fr: 'Laboratoire virtuel de réponse fréquentielle',
      de: 'Virtuelles Labor: Frequenzgang',
      it: 'Laboratorio virtuale di risposta in frequenza',
      pt: 'Laboratório virtual de resposta em frequência',
    },
    summary: {
      es: 'Polos y ceros en el plano s, diagramas de Bode con asíntotas y márgenes, Nyquist, respuesta temporal y desafíos de identificación.',
      en: 'Poles and zeros in the s-plane, Bode plots with asymptotes and margins, Nyquist, time response and identification challenges.',
      fr: 'Pôles et zéros dans le plan s, diagrammes de Bode avec asymptotes et marges, Nyquist, réponse temporelle et défis d’identification.',
      de: 'Pole und Nullstellen in der s-Ebene, Bode-Diagramme mit Asymptoten und Reserven, Nyquist, Zeitantwort und Identifikationsaufgaben.',
      it: 'Poli e zeri nel piano s, diagrammi di Bode con asintoti e margini, Nyquist, risposta temporale e sfide di identificazione.',
      pt: 'Polos e zeros no plano s, diagramas de Bode com assíntotas e margens, Nyquist, resposta temporal e desafios de identificação.',
    },
  },
} satisfies Record<string, LabInfo>;
export type LabId = keyof typeof SUITE_LABS;
export const LAB_IDS = Object.keys(SUITE_LABS) as LabId[];

/** Relative link to a lab page, or to the home page. Works online and in the offline folder alike. */
export const labHref = (id?: LabId) => (id ? `./${id}.html` : './index.html');

/** Author block shown in "About" (same in every language). */
export const AUTHOR = {
  name: 'Esteban Gil',
  year: 2026,
  lines: [
    [{ t: 'Full Professor - ' }, { t: 'Department of Electrical Engineering', href: 'https://eli.usm.cl/' }],
    [{ t: 'Researcher - ' }, { t: 'Advanced Center for Electrical and Electronic Engineering (AC3E)', href: 'http://ac3e.usm.cl/en/' }],
    [{ t: 'Researcher - Innovation Center for Sustainable Energy Transition (SET)' }],
    [{ t: 'Universidad Técnica Federico Santa María, Valparaíso, Chile' }],
    [{ t: 'Website: ' }, { t: 'https://sites.google.com/site/estebangil/', href: 'https://sites.google.com/site/estebangil/' }],
  ] as { t: string; href?: string }[][],
};

export const LICENSE = {
  name: 'CC BY-NC 4.0',
  url: 'https://creativecommons.org/licenses/by-nc/4.0/',
};

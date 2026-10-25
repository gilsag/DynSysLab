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
  properties: {
    title: {
      es: 'Laboratorio virtual de señales y propiedades de sistemas',
      en: 'Signals and System Properties Virtual Lab',
      fr: 'Laboratoire virtuel de signaux et propriétés des systèmes',
      de: 'Virtuelles Labor: Signale und Systemeigenschaften',
      it: 'Laboratorio virtuale di segnali e proprietà dei sistemi',
      pt: 'Laboratório virtual de sinais e propriedades de sistemas',
    },
    summary: {
      es: 'Señales básicas, desplazamiento, escalamiento y reflexión, partes par e impar, muestreo; linealidad, invariancia, causalidad, memoria y estabilidad BIBO mediante experimentos.',
      en: 'Basic signals, shifting, scaling and reversal, even and odd parts, sampling; linearity, time invariance, causality, memory and BIBO stability through experiments.',
      fr: 'Signaux de base, décalage, changement d’échelle et retournement, parties paire et impaire, échantillonnage ; linéarité, invariance, causalité, mémoire et stabilité EBSB par l’expérience.',
      de: 'Grundsignale, Verschiebung, Skalierung und Spiegelung, gerader und ungerader Anteil, Abtastung; Linearität, Zeitinvarianz, Kausalität, Gedächtnis und BIBO-Stabilität im Experiment.',
      it: 'Segnali elementari, traslazione, scalatura e ribaltamento, parti pari e dispari, campionamento; linearità, tempo-invarianza, causalità, memoria e stabilità BIBO tramite esperimenti.',
      pt: 'Sinais básicos, deslocamento, escalonamento e reflexão, partes par e ímpar, amostragem; linearidade, invariância, causalidade, memória e estabilidade BIBO por meio de experimentos.',
    },
  },
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
  representations: {
    title: {
      es: 'Laboratorio virtual de representaciones equivalentes',
      en: 'Equivalent Representations Virtual Lab',
      fr: 'Laboratoire virtuel de représentations équivalentes',
      de: 'Virtuelles Labor: Äquivalente Darstellungen',
      it: 'Laboratorio virtuale di rappresentazioni equivalenti',
      pt: 'Laboratório virtual de representações equivalentes',
    },
    summary: {
      es: 'Un mismo sistema como ecuación diferencial, función de transferencia, variables de estado y diagrama de bloques; formas canónicas, realizaciones no mínimas y respuestas a escalón y a impulso.',
      en: 'One system as a differential equation, transfer function, state space and block diagram; canonical forms, non-minimal realizations, step and impulse responses.',
      fr: 'Un même système comme équation différentielle, fonction de transfert, représentation d’état et schéma-bloc ; formes canoniques, réalisations non minimales, réponses indicielle et impulsionnelle.',
      de: 'Ein System als Differentialgleichung, Übertragungsfunktion, Zustandsraum und Blockschaltbild; Normalformen, nicht minimale Realisierungen, Sprung- und Impulsantwort.',
      it: 'Uno stesso sistema come equazione differenziale, funzione di trasferimento, variabili di stato e schema a blocchi; forme canoniche, realizzazioni non minime, risposta al gradino e all’impulso.',
      pt: 'Um mesmo sistema como equação diferencial, função de transferência, variáveis de estado e diagrama de blocos; formas canônicas, realizações não mínimas e respostas ao degrau e ao impulso.',
    },
  },
  'block-diagrams': {
    title: {
      es: 'Laboratorio virtual de reducción de diagramas de bloques',
      en: 'Block-Diagram Reduction Virtual Lab',
      fr: 'Laboratoire virtuel de réduction de schémas-blocs',
      de: 'Virtuelles Labor: Umformung von Blockschaltbildern',
      it: 'Laboratorio virtuale di riduzione di schemi a blocchi',
      pt: 'Laboratório virtual de redução de diagramas de blocos',
    },
    summary: {
      es: 'Reglas de serie, paralelo y realimentación; mover bifurcaciones y sumadores cuando los lazos se cruzan; resultado con valores numéricos editables, polos y respuesta a escalón.',
      en: 'Series, parallel and feedback rules; moving pickoff points and adders when loops overlap; result with editable numeric values, poles and step response.',
      fr: 'Règles série, parallèle et contre-réaction ; déplacement de points de dérivation et de sommateurs quand les boucles se chevauchent ; résultat avec valeurs numériques modifiables, pôles et réponse indicielle.',
      de: 'Regeln für Reihe, Parallel und Rückführung; Verschieben von Verzweigungen und Summierern bei überlappenden Schleifen; Ergebnis mit änderbaren Zahlenwerten, Polen und Sprungantwort.',
      it: 'Regole di serie, parallelo e retroazione; spostamento di diramazioni e sommatori quando gli anelli si sovrappongono; risultato con valori numerici modificabili, poli e risposta al gradino.',
      pt: 'Regras de série, paralelo e realimentação; mover derivações e somadores quando os laços se cruzam; resultado com valores numéricos editáveis, polos e resposta ao degrau.',
    },
  },
  ode: {
    title: {
      es: 'Laboratorio virtual de ecuaciones diferenciales lineales',
      en: 'Linear Differential Equations Virtual Lab',
      fr: 'Laboratoire virtuel d’équations différentielles linéaires',
      de: 'Virtuelles Labor: Lineare Differentialgleichungen',
      it: 'Laboratorio virtuale di equazioni differenziali lineari',
      pt: 'Laboratório virtual de equações diferenciais lineares',
    },
    summary: {
      es: 'Modos naturales y forzados, ganancia compleja y resonancia, respuesta homogénea y particular, a entrada cero y a estado cero, transitoria y permanente.',
      en: 'Natural and forced modes, complex gain and resonance, homogeneous and particular, zero-input and zero-state, transient and steady-state response.',
      fr: 'Modes propres et forcés, gain complexe et résonance, réponses homogène et particulière, libre et forcée, transitoire et permanente.',
      de: 'Eigen- und erzwungene Bewegungen, komplexe Verstärkung und Resonanz, homogene und partikuläre Lösung, Nulleingangs- und Nullzustandsantwort, Einschwingen und Beharrung.',
      it: 'Modi naturali e forzati, guadagno complesso e risonanza, risposta omogenea e particolare, a ingresso zero e a stato zero, transitoria e permanente.',
      pt: 'Modos naturais e forçados, ganho complexo e ressonância, resposta homogênea e particular, a entrada zero e a estado zero, transitória e permanente.',
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
  laplace: {
    title: {
      es: 'Laboratorio virtual de circuitos en el dominio de Laplace',
      en: 'Circuits in the Laplace Domain Virtual Lab',
      fr: 'Laboratoire virtuel de circuits dans le domaine de Laplace',
      de: 'Virtuelles Labor: Schaltungen im Laplace-Bereich',
      it: 'Laboratorio virtuale di circuiti nel dominio di Laplace',
      pt: 'Laboratório virtual de circuitos no domínio de Laplace',
    },
    summary: {
      es: 'Impedancia generalizada y fuentes de condición inicial, ecuaciones de nodos y mallas en s, fracciones parciales, respuesta a estado cero y a entrada cero, teoremas del valor inicial y final.',
      en: 'Generalized impedance and initial-condition sources, nodal and mesh equations in s, partial fractions, zero-state and zero-input response, initial- and final-value theorems.',
      fr: 'Impédance généralisée et sources de conditions initiales, équations aux nœuds et aux mailles en s, fractions partielles, réponses à état nul et libre, théorèmes des valeurs initiale et finale.',
      de: 'Verallgemeinerte Impedanz und Anfangswertquellen, Knoten- und Maschengleichungen in s, Partialbrüche, Nullzustands- und Nulleingangsantwort, Anfangs- und Endwertsatz.',
      it: 'Impedenza generalizzata e generatori di condizione iniziale, equazioni ai nodi e alle maglie in s, fratti semplici, risposta a stato zero e a ingresso zero, teoremi del valore iniziale e finale.',
      pt: 'Impedância generalizada e fontes de condição inicial, equações de nós e de malhas em s, frações parciais, resposta a estado zero e a entrada zero, teoremas do valor inicial e final.',
    },
  },
  'second-order': {
    title: {
      es: 'Laboratorio virtual del sistema canónico de segundo orden',
      en: 'Canonical Second-Order System Virtual Lab',
      fr: 'Laboratoire virtuel du système canonique du second ordre',
      de: 'Virtuelles Labor: Kanonisches System zweiter Ordnung',
      it: 'Laboratorio virtuale del sistema canonico del secondo ordine',
      pt: 'Laboratório virtual do sistema canônico de segunda ordem',
    },
    summary: {
      es: 'Polos en función de ζ y ωn, respuesta a escalón e impulso, sobrepaso y tiempos de subida, peak y establecimiento, resonancia y ancho de banda, circuito RLC serie.',
      en: 'Poles as functions of ζ and ωn, step and impulse response, overshoot and rise, peak and settling times, resonance and bandwidth, series RLC circuit.',
      fr: 'Pôles en fonction de ζ et ωn, réponses indicielle et impulsionnelle, dépassement et temps de montée, de pic et d’établissement, résonance et bande passante, circuit RLC série.',
      de: 'Pole in Abhängigkeit von ζ und ωn, Sprung- und Impulsantwort, Überschwingen, Anstiegs-, Maximums- und Einschwingzeit, Resonanz und Bandbreite, RLC-Reihenschwingkreis.',
      it: 'Poli in funzione di ζ e ωn, risposta al gradino e all’impulso, sovraelongazione e tempi di salita, picco e assestamento, risonanza e banda passante, circuito RLC serie.',
      pt: 'Polos em função de ζ e ωn, resposta ao degrau e ao impulso, sobressinal e tempos de subida, pico e acomodação, ressonância e largura de banda, circuito RLC série.',
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

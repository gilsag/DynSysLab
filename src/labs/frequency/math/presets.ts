import type { Root, SystemDef } from './types';
import { newId } from './types';
import type { L5 } from '../i18n';

const P = (re: number, im = 0): Root => ({ id: newId(), kind: 'pole', re, im });
const Z = (re: number, im = 0): Root => ({ id: newId(), kind: 'zero', re, im });
/** complex pair from natural frequency and damping */
const pair = (kind: 'pole' | 'zero', wn: number, zeta: number): Root => ({
  id: newId(),
  kind,
  re: +(-zeta * wn).toPrecision(6),
  im: +(wn * Math.sqrt(Math.max(0, 1 - zeta * zeta))).toPrecision(6),
});

export interface Preset {
  key: string;
  name: L5;
  note: L5;
  make: () => SystemDef;
}

const sys = (roots: Root[], gainDb = 0, delay = 0, gainMode: 'bode' | 'lead' = 'bode', gainNeg = false): SystemDef => ({
  roots,
  gainDb,
  gainNeg,
  delay,
  gainMode,
});

export const presets: Preset[] = [
  {
    key: 'first',
    name: { es: 'Primer orden', en: 'First order', pt: 'Primeira ordem', fr: 'Premier ordre', it: 'Primo ordine', de: 'Erste Ordnung' },
    note: {
      es: 'Un polo real en −1: −20 dB/dec después de ω = 1 rad/s, fase de 0° a −90°. A la frecuencia de quiebre, la curva real está 3 dB bajo la asíntota y la fase es −45°.',
      en: 'One real pole at −1: −20 dB/dec beyond ω = 1 rad/s, phase from 0° to −90°. At the corner, the exact curve is 3 dB below the asymptote and the phase is −45°.',
      pt: 'Um polo real em −1: −20 dB/déc após ω = 1 rad/s, fase de 0° a −90°. Na frequência de corte, a curva exata fica 3 dB abaixo da assíntota e a fase é −45°.',
      fr: 'Un pôle réel en −1 : −20 dB/déc au-delà de ω = 1 rad/s, phase de 0° à −90°. À la cassure, la courbe exacte est 3 dB sous l’asymptote et la phase vaut −45°.',
      it: 'Un polo reale in −1: −20 dB/dec dopo ω = 1 rad/s, fase da 0° a −90°. Alla frequenza di rottura la curva reale sta 3 dB sotto l’asintoto e la fase è −45°.',
      de: 'Ein reeller Pol bei −1: −20 dB/Dek oberhalb von ω = 1 rad/s, Phase von 0° bis −90°. An der Knickfrequenz liegt die exakte Kurve 3 dB unter der Asymptote, die Phase beträgt −45°.',
    },
    make: () => sys([P(-1)]),
  },
  {
    key: 'integrator',
    name: { es: 'Integrador', en: 'Integrator', pt: 'Integrador', fr: 'Intégrateur', it: 'Integratore', de: 'Integrator' },
    note: {
      es: 'Polo en el origen: recta de −20 dB/dec en todo el rango y fase constante de −90°. Cruza 0 dB en ω = K.',
      en: 'Pole at the origin: a −20 dB/dec line everywhere and a constant −90° phase. It crosses 0 dB at ω = K.',
      pt: 'Polo na origem: reta de −20 dB/déc em toda a faixa e fase constante de −90°. Cruza 0 dB em ω = K.',
      fr: 'Pôle à l’origine : droite à −20 dB/déc partout et phase constante de −90°. Elle coupe 0 dB en ω = K.',
      it: 'Polo nell’origine: retta a −20 dB/dec su tutto l’intervallo e fase costante di −90°. Attraversa 0 dB in ω = K.',
      de: 'Pol im Ursprung: überall eine Gerade mit −20 dB/Dek und konstante Phase −90°. Sie schneidet 0 dB bei ω = K.',
    },
    make: () => sys([P(0)]),
  },
  {
    key: 'threepoles',
    name: { es: 'Tres polos reales', en: 'Three real poles', pt: 'Três polos reais', fr: 'Trois pôles réels', it: 'Tre poli reali', de: 'Drei reelle Pole' },
    note: {
      es: 'Polos en −1, −10 y −100: la pendiente cae 20 dB/dec en cada quiebre y la fase acumula −90° por polo.',
      en: 'Poles at −1, −10 and −100: the slope drops by 20 dB/dec at each corner and the phase accumulates −90° per pole.',
      pt: 'Polos em −1, −10 e −100: a inclinação cai 20 dB/déc em cada frequência de corte e a fase acumula −90° por polo.',
      fr: 'Pôles en −1, −10 et −100 : la pente diminue de 20 dB/déc à chaque cassure et la phase cumule −90° par pôle.',
      it: 'Poli in −1, −10 e −100: la pendenza scende di 20 dB/dec a ogni rottura e la fase accumula −90° per polo.',
      de: 'Pole bei −1, −10 und −100: Die Steigung fällt an jedem Knick um 20 dB/Dek, die Phase sammelt −90° pro Pol.',
    },
    make: () => sys([P(-1), P(-10), P(-100)]),
  },
  {
    key: 'second',
    name: {
      es: 'Segundo orden (ζ = 0,2)',
      en: 'Second order (ζ = 0.2)',
      pt: 'Segunda ordem (ζ = 0,2)',
      fr: 'Second ordre (ζ = 0,2)',
      it: 'Secondo ordine (ζ = 0,2)',
      de: 'Zweite Ordnung (ζ = 0,2)',
    },
    note: {
      es: 'Par complejo con ωn = 1 y ζ = 0,2: −40 dB/dec y pico de resonancia. Arrastra el par hacia el eje imaginario para ver cómo crece el pico y la fase se vuelve un escalón.',
      en: 'Complex pair with ωn = 1 and ζ = 0.2: −40 dB/dec and a resonant peak. Drag the pair toward the imaginary axis to watch the peak grow and the phase become a step.',
      pt: 'Par complexo com ωn = 1 e ζ = 0,2: −40 dB/déc e pico de ressonância. Arraste o par em direção ao eixo imaginário para ver o pico crescer e a fase virar um degrau.',
      fr: 'Paire complexe avec ωn = 1 et ζ = 0,2 : −40 dB/déc et pic de résonance. Rapprochez la paire de l’axe imaginaire pour voir le pic croître et la phase devenir un échelon.',
      it: 'Coppia complessa con ωn = 1 e ζ = 0,2: −40 dB/dec e picco di risonanza. Trascina la coppia verso l’asse immaginario per vedere il picco crescere e la fase diventare un gradino.',
      de: 'Komplexes Paar mit ωn = 1 und ζ = 0,2: −40 dB/Dek und Resonanzüberhöhung. Ziehen Sie das Paar zur imaginären Achse: Die Überhöhung wächst und die Phase wird zum Sprung.',
    },
    make: () => sys([pair('pole', 1, 0.2)]),
  },
  {
    key: 'lead',
    name: {
      es: 'Compensador de adelanto',
      en: 'Lead compensator',
      pt: 'Compensador de avanço',
      fr: 'Correcteur à avance de phase',
      it: 'Compensatore anticipatore',
      de: 'Lead-Glied (Phasenvorhalt)',
    },
    note: {
      es: 'Cero en −1 y polo en −10: aporta fase positiva entre ambos quiebres, con máximo en la media geométrica √10 ≈ 3,16 rad/s.',
      en: 'Zero at −1 and pole at −10: adds positive phase between the corners, peaking at the geometric mean √10 ≈ 3.16 rad/s.',
      pt: 'Zero em −1 e polo em −10: acrescenta fase positiva entre as duas frequências de corte, com máximo na média geométrica √10 ≈ 3,16 rad/s.',
      fr: 'Zéro en −1 et pôle en −10 : apporte une phase positive entre les deux cassures, maximale à la moyenne géométrique √10 ≈ 3,16 rad/s.',
      it: 'Zero in −1 e polo in −10: fornisce fase positiva tra le due rotture, con massimo nella media geometrica √10 ≈ 3,16 rad/s.',
      de: 'Nullstelle bei −1 und Pol bei −10: positive Phase zwischen den Knickfrequenzen, maximal beim geometrischen Mittel √10 ≈ 3,16 rad/s.',
    },
    make: () => sys([Z(-1), P(-10)]),
  },
  {
    key: 'lag',
    name: {
      es: 'Compensador de atraso',
      en: 'Lag compensator',
      pt: 'Compensador de atraso',
      fr: 'Correcteur à retard de phase',
      it: 'Compensatore ritardatore',
      de: 'Lag-Glied (Phasennacheilung)',
    },
    note: {
      es: 'Polo en −0,1 y cero en −1: atenúa 20 dB en alta frecuencia sin cambiar la ganancia DC.',
      en: 'Pole at −0.1 and zero at −1: attenuates by 20 dB at high frequency while keeping the DC gain.',
      pt: 'Polo em −0,1 e zero em −1: atenua 20 dB em alta frequência sem alterar o ganho DC.',
      fr: 'Pôle en −0,1 et zéro en −1 : atténue de 20 dB en haute fréquence sans changer le gain statique.',
      it: 'Polo in −0,1 e zero in −1: attenua di 20 dB in alta frequenza senza cambiare il guadagno in continua.',
      de: 'Pol bei −0,1 und Nullstelle bei −1: dämpft hohe Frequenzen um 20 dB, die stationäre Verstärkung bleibt.',
    },
    make: () => sys([Z(-1), P(-0.1)]),
  },
  {
    key: 'notch',
    name: { es: 'Filtro muesca', en: 'Notch filter', pt: 'Filtro notch', fr: 'Filtre réjecteur', it: 'Filtro notch', de: 'Kerbfilter' },
    note: {
      es: 'Ceros complejos muy poco amortiguados en ωn = 1 cancelan la respuesta en esa frecuencia; los polos (ζ = 0,7) limitan el ancho de la muesca.',
      en: 'Lightly damped complex zeros at ωn = 1 cancel the response at that frequency; the poles (ζ = 0.7) set the notch width.',
      pt: 'Zeros complexos pouco amortecidos em ωn = 1 anulam a resposta nessa frequência; os polos (ζ = 0,7) definem a largura do notch.',
      fr: 'Des zéros complexes peu amortis en ωn = 1 annulent la réponse à cette fréquence ; les pôles (ζ = 0,7) fixent la largeur de la réjection.',
      it: 'Zeri complessi pochissimo smorzati in ωn = 1 annullano la risposta a quella frequenza; i poli (ζ = 0,7) limitano la larghezza del notch.',
      de: 'Schwach gedämpfte komplexe Nullstellen bei ωn = 1 löschen die Antwort bei dieser Frequenz aus; die Pole (ζ = 0,7) bestimmen die Kerbbreite.',
    },
    make: () => sys([pair('zero', 1, 0.02), pair('pole', 1, 0.7)]),
  },
  {
    key: 'bandpass',
    name: { es: 'Pasa banda', en: 'Band-pass', pt: 'Passa-faixa', fr: 'Passe-bande', it: 'Passa banda', de: 'Bandpass' },
    note: {
      es: 'Cero en el origen y polos en −1 y −100: +20 dB/dec, meseta y luego −20 dB/dec.',
      en: 'Zero at the origin and poles at −1 and −100: +20 dB/dec, a plateau, then −20 dB/dec.',
      pt: 'Zero na origem e polos em −1 e −100: +20 dB/déc, um patamar e depois −20 dB/déc.',
      fr: 'Zéro à l’origine et pôles en −1 et −100 : +20 dB/déc, un plateau, puis −20 dB/déc.',
      it: 'Zero nell’origine e poli in −1 e −100: +20 dB/dec, plateau e poi −20 dB/dec.',
      de: 'Nullstelle im Ursprung und Pole bei −1 und −100: +20 dB/Dek, ein Plateau, dann −20 dB/Dek.',
    },
    make: () => sys([Z(0), P(-1), P(-100)], 0, 0, 'lead'),
  },
  {
    key: 'allpass',
    name: {
      es: 'Pasa todo (fase no mínima)',
      en: 'All-pass (non-minimum phase)',
      pt: 'Passa-tudo (fase não mínima)',
      fr: 'Passe-tout (déphasage non minimal)',
      it: 'Passa tutto (fase non minima)',
      de: 'Allpass (nichtminimalphasig)',
    },
    note: {
      es: 'Cero en +1 y polo en −1: magnitud plana en 0 dB pero la fase cae 180°. Dos sistemas con la misma magnitud pueden tener fases muy distintas.',
      en: 'Zero at +1 and pole at −1: flat 0 dB magnitude but the phase falls by 180°. Two systems with identical magnitude can have very different phase.',
      pt: 'Zero em +1 e polo em −1: magnitude plana em 0 dB, mas a fase cai 180°. Dois sistemas com a mesma magnitude podem ter fases muito diferentes.',
      fr: 'Zéro en +1 et pôle en −1 : module plat à 0 dB mais la phase chute de 180°. Deux systèmes de même module peuvent avoir des phases très différentes.',
      it: 'Zero in +1 e polo in −1: modulo piatto a 0 dB ma la fase scende di 180°. Due sistemi con lo stesso modulo possono avere fasi molto diverse.',
      de: 'Nullstelle bei +1 und Pol bei −1: flacher Betrag bei 0 dB, aber die Phase fällt um 180°. Zwei Systeme mit gleichem Betrag können sehr verschiedene Phasen haben.',
    },
    make: () => sys([Z(1), P(-1)]),
  },
  {
    key: 'nmp',
    name: { es: 'Cero en el SPD', en: 'RHP zero', pt: 'Zero no SPD', fr: 'Zéro dans le DPD', it: 'Zero nel SPD', de: 'Nullstelle rechts' },
    note: {
      es: 'Cero en +2 con polos en −1 y −5. Mira la respuesta al escalón: parte en la dirección contraria (respuesta inversa).',
      en: 'Zero at +2 with poles at −1 and −5. Look at the step response: it starts in the wrong direction (inverse response).',
      pt: 'Zero em +2 com polos em −1 e −5. Observe a resposta ao degrau: ela começa no sentido contrário (resposta inversa).',
      fr: 'Zéro en +2 avec des pôles en −1 et −5. Regardez la réponse indicielle : elle part dans le mauvais sens (réponse inverse).',
      it: 'Zero in +2 con poli in −1 e −5. Osserva la risposta al gradino: parte nella direzione opposta (risposta inversa).',
      de: 'Nullstelle bei +2 mit Polen bei −1 und −5. Sehen Sie sich die Sprungantwort an: Sie startet in die falsche Richtung (Allpassverhalten).',
    },
    make: () => sys([Z(2), P(-1), P(-5)]),
  },
  {
    key: 'pid',
    name: { es: 'PID con filtro', en: 'Filtered PID', pt: 'PID com filtro', fr: 'PID filtré', it: 'PID con filtro', de: 'PID mit Filter' },
    note: {
      es: 'Integrador, dos ceros reales en −0,5 y −5, y un polo de filtro en −50. La fase sube desde −90°, llega a unos +53° cerca de 17 rad/s y vuelve a 0° por el polo del filtro.',
      en: 'Integrator, two real zeros at −0.5 and −5, and a filter pole at −50. The phase rises from −90° to about +53° near 17 rad/s and returns to 0° because of the filter pole.',
      pt: 'Integrador, dois zeros reais em −0,5 e −5 e um polo de filtro em −50. A fase sobe desde −90°, chega a cerca de +53° perto de 17 rad/s e volta a 0° pelo polo do filtro.',
      fr: 'Intégrateur, deux zéros réels en −0,5 et −5, et un pôle de filtrage en −50. La phase monte depuis −90°, atteint environ +53° vers 17 rad/s et revient à 0° à cause du pôle de filtrage.',
      it: 'Integratore, due zeri reali in −0,5 e −5 e un polo di filtro in −50. La fase sale da −90°, arriva a circa +53° vicino a 17 rad/s e torna a 0° per il polo del filtro.',
      de: 'Integrator, zwei reelle Nullstellen bei −0,5 und −5 sowie ein Filterpol bei −50. Die Phase steigt von −90° auf etwa +53° bei rund 17 rad/s und kehrt wegen des Filterpols auf 0° zurück.',
    },
    make: () => sys([P(0), Z(-0.5), Z(-5), P(-50)], 0, 0, 'lead', false),
  },
  {
    key: 'loopdelay',
    name: { es: 'Lazo con retardo', en: 'Loop with delay', pt: 'Malha com atraso', fr: 'Boucle avec retard', it: 'Anello con ritardo', de: 'Kreis mit Totzeit' },
    note: {
      es: 'Integrador, polo en −1 y retardo T = 0,4 s. El retardo no cambia la magnitud, pero resta ωT radianes de fase: observa cómo se reduce el margen de fase al aumentar T.',
      en: 'Integrator, pole at −1 and delay T = 0.4 s. Delay leaves the magnitude untouched but subtracts ωT radians of phase: watch the phase margin shrink as T grows.',
      pt: 'Integrador, polo em −1 e atraso T = 0,4 s. O atraso não altera a magnitude, mas subtrai ωT radianos de fase: observe a margem de fase diminuir quando T aumenta.',
      fr: 'Intégrateur, pôle en −1 et retard T = 0,4 s. Le retard ne change pas le module mais retire ωT radians de phase : observez la marge de phase diminuer quand T augmente.',
      it: 'Integratore, polo in −1 e ritardo T = 0,4 s. Il ritardo non cambia il modulo, ma sottrae ωT radianti di fase: osserva come si riduce il margine di fase all’aumentare di T.',
      de: 'Integrator, Pol bei −1 und Totzeit T = 0,4 s. Die Totzeit lässt den Betrag unverändert, zieht aber ωT Radiant Phase ab: Die Phasenreserve schrumpft, wenn T wächst.',
    },
    make: () => sys([P(0), P(-1)], 0, 0.4, 'bode'),
  },
];

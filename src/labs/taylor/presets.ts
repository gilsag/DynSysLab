import type { LabLang } from '@shared/suite';
type S6 = Record<LabLang, string>;

export interface ScalarPreset {
  id: string;
  /** plain-text name for the selector; 'sen' is shown as 'sin' outside es/pt */
  name: string;
  src: string;
  a: number;
  view: [number, number];
  N?: number;
  /** exact radius of convergence around a */
  radius?: number;
  xEval?: number;
  tol?: { relative: boolean; value: number };
  note?: S6;
}

export const SCALAR: ScalarPreset[] = [
  {
    id: 'sin0', name: 'sen x,  a = 0', src: 'sin(x)', a: 0, view: [-8, 8], N: 7, radius: Infinity,
    tol: { relative: true, value: 0.01 },
    note: {
      es: 'Radio infinito: la serie converge en todo el eje, pero el truncamiento sen x ≈ x es local (1 % de error relativo hasta unos 14°).',
      en: 'Infinite radius: the series converges everywhere, yet the truncation sin x ≈ x is local (1 % relative error up to about 14°).',
      fr: 'Rayon infini : la série converge partout, mais la troncature sin x ≈ x reste locale (1 % d’erreur relative jusqu’à 14° environ).',
      de: 'Unendlicher Radius: Die Reihe konvergiert überall, die Abbruchnäherung sin x ≈ x ist aber lokal (1 % relativer Fehler bis etwa 14°).',
      it: 'Raggio infinito: la serie converge ovunque, ma il troncamento sin x ≈ x è locale (1 % di errore relativo fino a circa 14°).',
      pt: 'Raio infinito: a série converge em todo o eixo, mas o truncamento sen x ≈ x é local (1 % de erro relativo até cerca de 14°).',
    },
  },
  { id: 'cos0', name: 'cos x,  a = 0', src: 'cos(x)', a: 0, view: [-8, 8], N: 6, radius: Infinity },
  { id: 'exp0', name: 'eˣ,  a = 0', src: 'exp(x)', a: 0, view: [-4, 3], N: 4, radius: Infinity },
  {
    id: 'geo', name: '1/(1 − x),  a = 0', src: '1/(1-x)', a: 0, view: [-2, 2], N: 6, radius: 1,
    note: {
      es: 'Fuera de |x| < 1 la serie diverge: agregar términos aleja la suma parcial del valor verdadero.',
      en: 'Outside |x| < 1 the series diverges: adding terms moves the partial sum away from the true value.',
      fr: 'Hors de |x| < 1 la série diverge : ajouter des termes éloigne la somme partielle de la vraie valeur.',
      de: 'Außerhalb von |x| < 1 divergiert die Reihe: Mehr Glieder entfernen die Partialsumme vom wahren Wert.',
      it: 'Fuori da |x| < 1 la serie diverge: aggiungere termini allontana la somma parziale dal valore vero.',
      pt: 'Fora de |x| < 1 a série diverge: acrescentar termos afasta a soma parcial do valor verdadeiro.',
    },
  },
  { id: 'inv1', name: '1/x,  a = 1', src: '1/x', a: 1, view: [0.05, 2.6], N: 5, radius: 1 },
  { id: 'ln1', name: 'ln x,  a = 1', src: 'ln(x)', a: 1, view: [0.05, 3], N: 5, radius: 1 },
  {
    id: 'sqrt4', name: '√x,  a = 4', src: 'sqrt(x)', a: 4, view: [0, 12], N: 1, radius: 4, xEval: 4.001,
    tol: { relative: false, value: 1e-3 },
    note: {
      es: 'Cálculo de √4,001 con la recta tangente: 2,00025, con error 1,56·10⁻⁸ bajo la cota (1/64)·10⁻⁶.',
      en: 'Computing √4.001 with the tangent line: 2.00025, error 1.56·10⁻⁸, below the bound (1/64)·10⁻⁶.',
      fr: 'Calcul de √4,001 par la tangente : 2,00025, erreur 1,56·10⁻⁸, sous la borne (1/64)·10⁻⁶.',
      de: 'Berechnung von √4,001 mit der Tangente: 2,00025, Fehler 1,56·10⁻⁸ unter der Schranke (1/64)·10⁻⁶.',
      it: 'Calcolo di √4,001 con la retta tangente: 2,00025, errore 1,56·10⁻⁸, sotto la stima (1/64)·10⁻⁶.',
      pt: 'Cálculo de √4,001 com a reta tangente: 2,00025, erro 1,56·10⁻⁸, abaixo da cota (1/64)·10⁻⁶.',
    },
  },
  {
    id: 'atan', name: 'arctan x,  a = 0', src: 'atan(x)', a: 0, view: [-3, 3], N: 9, radius: 1,
    note: {
      es: 'La función es suave en todo el eje real y sin embargo el radio es 1: lo fijan singularidades complejas en ±j.',
      en: 'The function is smooth on the whole real axis, yet the radius is 1: complex singularities at ±j set it.',
      fr: 'La fonction est lisse sur tout l’axe réel, et pourtant le rayon vaut 1 : des singularités complexes en ±j le fixent.',
      de: 'Die Funktion ist auf der ganzen reellen Achse glatt, der Radius ist trotzdem 1: Ihn bestimmen komplexe Singularitäten bei ±j.',
      it: 'La funzione è liscia su tutto l’asse reale, eppure il raggio è 1: lo fissano singolarità complesse in ±j.',
      pt: 'A função é suave em todo o eixo real e mesmo assim o raio é 1: singularidades complexas em ±j o fixam.',
    },
  },
  { id: 'runge', name: '1/(1 + x²),  a = 0', src: '1/(1+x^2)', a: 0, view: [-2.5, 2.5], N: 8, radius: 1 },
  {
    id: 'gen', name: 'sen δ,  δ₀ = π/3', src: 'sin(x)', a: Math.PI / 3, view: [-0.5, 3], N: 1, radius: Infinity,
    tol: { relative: true, value: 0.05 },
    note: {
      es: 'Generador con barra infinita operando en δ₀ = π/3: la pendiente es el coeficiente sincronizante K_s = cos δ₀ = 0,5.',
      en: 'Generator on an infinite bus operating at δ₀ = π/3: the slope is the synchronizing coefficient K_s = cos δ₀ = 0.5.',
      fr: 'Générateur sur réseau infini fonctionnant en δ₀ = π/3 : la pente est le coefficient synchronisant K_s = cos δ₀ = 0,5.',
      de: 'Generator am starren Netz im Arbeitspunkt δ₀ = π/3: Die Steigung ist der Synchronisierkoeffizient K_s = cos δ₀ = 0,5.',
      it: 'Generatore su rete infinita in δ₀ = π/3: la pendenza è il coefficiente sincronizzante K_s = cos δ₀ = 0,5.',
      pt: 'Gerador em barra infinita operando em δ₀ = π/3: a inclinação é o coeficiente sincronizante K_s = cos δ₀ = 0,5.',
    },
  },
  {
    id: 'infl', name: 'x·e⁻ˣ,  a = 2', src: 'x*exp(-x)', a: 2, view: [-0.5, 6], N: 1, radius: Infinity,
    tol: { relative: false, value: 0.01 },
    note: {
      es: 'En a = 2 hay un punto de inflexión (f″ = 0): el término cuadrático se anula y la recta tangente vale en un rango sorprendentemente amplio.',
      en: 'a = 2 is an inflection point (f″ = 0): the quadratic term vanishes and the tangent line holds over a surprisingly wide range.',
      fr: 'a = 2 est un point d’inflexion (f″ = 0) : le terme quadratique s’annule et la tangente reste valable sur un domaine étonnamment large.',
      de: 'a = 2 ist ein Wendepunkt (f″ = 0): Der quadratische Term entfällt und die Tangente gilt in einem überraschend großen Bereich.',
      it: 'a = 2 è un punto di flesso (f″ = 0): il termine quadratico si annulla e la tangente vale in un intervallo sorprendentemente ampio.',
      pt: 'a = 2 é um ponto de inflexão (f″ = 0): o termo quadrático se anula e a reta tangente vale numa faixa surpreendentemente ampla.',
    },
  },
];

export interface SystemPreset {
  id: string;
  name: S6;
  f1: string;
  f2: string;
  u: number;
  win: { x1: [number, number]; x2: [number, number] };
  names: [string, string]; // TeX axis names
  x0: [number, number];
  T: number;
  note: S6;
}

export const SYSTEMS: SystemPreset[] = [
  {
    id: 'apB',
    name: { es: 'Nodo y punto de silla, representación B', en: 'Node and saddle, representation B', fr: 'Nœud et col, représentation B', de: 'Knoten und Sattel, Darstellung B', it: 'Nodo e sella, rappresentazione B', pt: 'Nó e ponto de sela, representação B' },
    f1: 'x2', f2: '-(3 + cos(x1))*x2 - 3*sin(x1) + x1^2 + u', u: 0,
    win: { x1: [-1.6, 3.4], x2: [-2.6, 2.6] }, names: ['y', '\\dot y'], x0: [1.5, 0.6], T: 8,
    note: {
      es: 'ÿ + (3 + cos y) ẏ + 3 sen y − y² = u, con z₁ = y, z₂ = ẏ. Nodo estable en el origen y punto de silla en (1,7221; 0); la separatriz estable delimita la región de atracción.',
      en: 'ÿ + (3 + cos y) ẏ + 3 sin y − y² = u, with z₁ = y, z₂ = ẏ. Stable node at the origin and saddle at (1.7221, 0); the stable separatrix bounds the region of attraction.',
      fr: 'ÿ + (3 + cos y) ẏ + 3 sin y − y² = u, avec z₁ = y, z₂ = ẏ. Nœud stable à l’origine et col en (1,7221 ; 0) ; la séparatrice stable borne le bassin d’attraction.',
      de: 'ÿ + (3 + cos y) ẏ + 3 sin y − y² = u mit z₁ = y, z₂ = ẏ. Stabiler Knoten im Ursprung und Sattel bei (1,7221; 0); die stabile Separatrix begrenzt das Einzugsgebiet.',
      it: 'ÿ + (3 + cos y) ẏ + 3 sin y − y² = u, con z₁ = y, z₂ = ẏ. Nodo stabile nell’origine e sella in (1,7221; 0); la separatrice stabile delimita la regione di attrazione.',
      pt: 'ÿ + (3 + cos y) ẏ + 3 sen y − y² = u, com z₁ = y, z₂ = ẏ. Nó estável na origem e ponto de sela em (1,7221; 0); a separatriz estável delimita a região de atração.',
    },
  },
  {
    id: 'apA',
    name: { es: 'Nodo y punto de silla, representación A', en: 'Node and saddle, representation A', fr: 'Nœud et col, représentation A', de: 'Knoten und Sattel, Darstellung A', it: 'Nodo e sella, rappresentazione A', pt: 'Nó e ponto de sela, representação A' },
    f1: '-3*x1 + x2^2 + u', f2: 'x1 - sin(x2)', u: 0,
    win: { x1: [-1, 2.6], x2: [-1.6, 3.2] }, names: ['x_1', 'x_2'], x0: [1.6, 0.4], T: 8,
    note: {
      es: 'El mismo sistema con x₁ = ẏ + sen y, x₂ = y. Los equilibrios son los mismos estados físicos, (0, 0) y (0,98857; 1,72213), y los valores propios coinciden con los de B.',
      en: 'The same system with x₁ = ẏ + sin y, x₂ = y. The equilibria are the same physical states, (0, 0) and (0.98857, 1.72213), and the eigenvalues match those of B.',
      fr: 'Le même système avec x₁ = ẏ + sin y, x₂ = y. Les équilibres sont les mêmes états physiques, (0, 0) et (0,98857 ; 1,72213), et les valeurs propres coïncident avec celles de B.',
      de: 'Dasselbe System mit x₁ = ẏ + sin y, x₂ = y. Die Gleichgewichte sind dieselben physikalischen Zustände, (0, 0) und (0,98857; 1,72213), die Eigenwerte stimmen mit B überein.',
      it: 'Lo stesso sistema con x₁ = ẏ + sin y, x₂ = y. Gli equilibri sono gli stessi stati fisici, (0, 0) e (0,98857; 1,72213), e gli autovalori coincidono con quelli di B.',
      pt: 'O mesmo sistema com x₁ = ẏ + sen y, x₂ = y. Os equilíbrios são os mesmos estados físicos, (0, 0) e (0,98857; 1,72213), e os autovalores coincidem com os de B.',
    },
  },
  {
    id: 'pend',
    name: { es: 'Péndulo amortiguado', en: 'Damped pendulum', fr: 'Pendule amorti', de: 'Gedämpftes Pendel', it: 'Pendolo smorzato', pt: 'Pêndulo amortecido' },
    f1: 'x2', f2: '-9.81*sin(x1) - 0.5*x2 + u', u: 0,
    win: { x1: [-7, 7], x2: [-9, 9] }, names: ['\\theta', '\\dot\\theta'], x0: [2.5, 0], T: 12,
    note: {
      es: 'θ̈ + 0,5 θ̇ + (g/ℓ) sen θ = u con g/ℓ = 9,81 s⁻². Focos estables en θ = 2kπ y sillas en θ = (2k+1)π; sen θ ≈ θ da la oscilación armónica de ωₙ = √(g/ℓ).',
      en: 'θ̈ + 0.5 θ̇ + (g/ℓ) sin θ = u with g/ℓ = 9.81 s⁻². Stable foci at θ = 2kπ and saddles at θ = (2k+1)π; sin θ ≈ θ gives the harmonic oscillation with ωₙ = √(g/ℓ).',
      fr: 'θ̈ + 0,5 θ̇ + (g/ℓ) sin θ = u avec g/ℓ = 9,81 s⁻². Foyers stables en θ = 2kπ et cols en θ = (2k+1)π ; sin θ ≈ θ donne l’oscillation harmonique ωₙ = √(g/ℓ).',
      de: 'θ̈ + 0,5 θ̇ + (g/ℓ) sin θ = u mit g/ℓ = 9,81 s⁻². Stabile Strudel bei θ = 2kπ, Sättel bei θ = (2k+1)π; sin θ ≈ θ liefert die harmonische Schwingung mit ωₙ = √(g/ℓ).',
      it: 'θ̈ + 0,5 θ̇ + (g/ℓ) sin θ = u con g/ℓ = 9,81 s⁻². Fuochi stabili in θ = 2kπ e selle in θ = (2k+1)π; sin θ ≈ θ dà l’oscillazione armonica con ωₙ = √(g/ℓ).',
      pt: 'θ̈ + 0,5 θ̇ + (g/ℓ) sen θ = u com g/ℓ = 9,81 s⁻². Focos estáveis em θ = 2kπ e selas em θ = (2k+1)π; sen θ ≈ θ dá a oscilação harmônica com ωₙ = √(g/ℓ).',
    },
  },
  {
    id: 'gen',
    name: { es: 'Generador sincrónico y barra infinita', en: 'Synchronous generator on an infinite bus', fr: 'Générateur synchrone sur réseau infini', de: 'Synchrongenerator am starren Netz', it: 'Generatore sincrono su rete infinita', pt: 'Gerador síncrono e barra infinita' },
    f1: 'x2', f2: 'u - 1.5*sin(x1) - 0.25*x2', u: 0.8,
    win: { x1: [-1.5, 4], x2: [-3, 3] }, names: ['\\delta', '\\dot\\delta'], x0: [1.6, 1.2], T: 20,
    note: {
      es: 'δ̈ + 0,25 δ̇ + 1,5 sen δ = u, con u = P_mec en unidades escaladas. Operación en δ₀ = arcsen(u/1,5), donde K_s = 1,5 cos δ₀; la silla en π − δ₀ y su separatriz fijan la región de atracción (criterio de igualdad de áreas).',
      en: 'δ̈ + 0.25 δ̇ + 1.5 sin δ = u, with u = P_mech in scaled units. Operation at δ₀ = arcsin(u/1.5), where K_s = 1.5 cos δ₀; the saddle at π − δ₀ and its separatrix set the region of attraction (equal-area criterion).',
      fr: 'δ̈ + 0,25 δ̇ + 1,5 sin δ = u, avec u = P_méc en unités réduites. Fonctionnement en δ₀ = arcsin(u/1,5), où K_s = 1,5 cos δ₀ ; le col en π − δ₀ et sa séparatrice fixent le bassin d’attraction (critère des aires égales).',
      de: 'δ̈ + 0,25 δ̇ + 1,5 sin δ = u mit u = P_mech in skalierten Einheiten. Betrieb bei δ₀ = arcsin(u/1,5) mit K_s = 1,5 cos δ₀; der Sattel bei π − δ₀ und seine Separatrix bestimmen das Einzugsgebiet (Flächenkriterium).',
      it: 'δ̈ + 0,25 δ̇ + 1,5 sin δ = u, con u = P_mecc in unità scalate. Funzionamento in δ₀ = arcsin(u/1,5), dove K_s = 1,5 cos δ₀; la sella in π − δ₀ e la sua separatrice fissano la regione di attrazione (criterio delle aree uguali).',
      pt: 'δ̈ + 0,25 δ̇ + 1,5 sen δ = u, com u = P_mec em unidades escaladas. Operação em δ₀ = arcsen(u/1,5), onde K_s = 1,5 cos δ₀; a sela em π − δ₀ e sua separatriz fixam a região de atração (critério das áreas iguais).',
    },
  },
  {
    id: 'vdp',
    name: { es: 'Oscilador de Van der Pol', en: 'Van der Pol oscillator', fr: 'Oscillateur de Van der Pol', de: 'Van-der-Pol-Oszillator', it: 'Oscillatore di Van der Pol', pt: 'Oscilador de Van der Pol' },
    f1: 'x2', f2: '-x1 + (1 - x1^2)*x2 + u', u: 0,
    win: { x1: [-3.5, 3.5], x2: [-4, 4] }, names: ['x_1', 'x_2'], x0: [0.1, 0], T: 30,
    note: {
      es: 'El origen es un foco inestable y las trayectorias convergen a un ciclo límite. La linealización no puede anticipar el ciclo: es información global.',
      en: 'The origin is an unstable focus and trajectories converge to a limit cycle. The linearization cannot anticipate the cycle: it is global information.',
      fr: 'L’origine est un foyer instable et les trajectoires convergent vers un cycle limite. La linéarisation ne peut pas prévoir ce cycle : c’est une information globale.',
      de: 'Der Ursprung ist ein instabiler Strudel, die Trajektorien laufen in einen Grenzzyklus. Die Linearisierung kann ihn nicht vorhersagen: Er ist eine globale Eigenschaft.',
      it: 'L’origine è un fuoco instabile e le traiettorie convergono a un ciclo limite. La linearizzazione non può anticipare il ciclo: è un’informazione globale.',
      pt: 'A origem é um foco instável e as trajetórias convergem para um ciclo limite. A linearização não antecipa o ciclo: é informação global.',
    },
  },
  {
    id: 'undec',
    name: { es: 'Caso indeciso', en: 'Undecided case', fr: 'Cas indécis', de: 'Unentschiedener Fall', it: 'Caso indeciso', pt: 'Caso indeciso' },
    f1: 'x2', f2: '-x1 - x1^2*x2 + u', u: 0,
    win: { x1: [-2, 2], x2: [-2, 2] }, names: ['x_1', 'x_2'], x0: [1.5, 0], T: 60,
    note: {
      es: 'La linealización da un centro (λ = ±j) y no decide. El término −x₁²x₂, despreciado al truncar, amortigua: el origen es asintóticamente estable, pero muy lentamente.',
      en: 'The linearization gives a centre (λ = ±j) and does not decide. The term −x₁²x₂, dropped by the truncation, damps: the origin is asymptotically stable, but very slowly.',
      fr: 'La linéarisation donne un centre (λ = ±j) et ne tranche pas. Le terme −x₁²x₂, négligé par la troncature, amortit : l’origine est asymptotiquement stable, mais très lentement.',
      de: 'Die Linearisierung ergibt ein Zentrum (λ = ±j) und entscheidet nichts. Der beim Abbruch vernachlässigte Term −x₁²x₂ dämpft: Der Ursprung ist asymptotisch stabil, aber sehr langsam.',
      it: 'La linearizzazione dà un centro (λ = ±j) e non decide. Il termine −x₁²x₂, trascurato nel troncamento, smorza: l’origine è asintoticamente stabile, ma molto lentamente.',
      pt: 'A linearização dá um centro (λ = ±j) e não decide. O termo −x₁²x₂, desprezado no truncamento, amortece: a origem é assintoticamente estável, mas muito lentamente.',
    },
  },
];

// UI text of the block-diagram reduction lab, in six languages.
import type { LabLang } from '@shared/suite';
import type { Example, Rule } from './math/examples';

export type Lang = LabLang;
type S6 = Record<Lang, string>;

export const EXAMPLE_NAMES: Record<Example['id'], S6> = {
  seriesParallel: { es: 'Serie y paralelo', en: 'Series and parallel', fr: 'Série et parallèle', de: 'Reihe und parallel', it: 'Serie e parallelo', pt: 'Série e paralelo' },
  feedback: { es: 'Realimentación negativa', en: 'Negative feedback', fr: 'Contre-réaction', de: 'Gegenkopplung', it: 'Retroazione negativa', pt: 'Realimentação negativa' },
  nested: { es: 'Lazos anidados', en: 'Nested loops', fr: 'Boucles imbriquées', de: 'Verschachtelte Schleifen', it: 'Anelli annidati', pt: 'Laços aninhados' },
  feedforward: { es: 'Prealimentación y realimentación', en: 'Feedforward and feedback', fr: 'Anticipation et contre-réaction', de: 'Vorsteuerung und Rückführung', it: 'Anticipazione e retroazione', pt: 'Alimentação direta e realimentação' },
  moving: { es: 'Lazos superpuestos: mover una bifurcación', en: 'Overlapping loops: moving a pickoff point', fr: 'Boucles enchevêtrées : déplacer un point de dérivation', de: 'Überlappende Schleifen: Verzweigung verschieben', it: 'Anelli sovrapposti: spostare una diramazione', pt: 'Laços sobrepostos: mover uma derivação' },
  movingSum: { es: 'Lazos superpuestos: mover un sumador', en: 'Overlapping loops: moving a summing point', fr: 'Boucles enchevêtrées : déplacer un sommateur', de: 'Überlappende Schleifen: Summierer verschieben', it: 'Anelli sovrapposti: spostare un sommatore', pt: 'Laços sobrepostos: mover um somador' },
};

export const RULES: Record<Rule, S6> = {
  original: { es: 'Diagrama original.', en: 'Original diagram.', fr: 'Schéma d’origine.', de: 'Ursprüngliches Diagramm.', it: 'Schema originale.', pt: 'Diagrama original.' },
  parallel: { es: 'Bloques en paralelo cuyas salidas se suman: se reemplazan por la suma de sus funciones de transferencia.', en: 'Blocks in parallel whose outputs are added: replaced by the sum of their transfer functions.', fr: 'Blocs en parallèle dont les sorties s’additionnent : remplacés par la somme de leurs fonctions de transfert.', de: 'Parallele Blöcke mit addierten Ausgängen: ersetzt durch die Summe ihrer Übertragungsfunktionen.', it: 'Blocchi in parallelo con uscite sommate: si sostituiscono con la somma delle loro funzioni di trasferimento.', pt: 'Blocos em paralelo cujas saídas se somam: substituídos pela soma de suas funções de transferência.' },
  series: { es: 'Bloques en serie: se reemplazan por el producto de sus funciones de transferencia.', en: 'Blocks in series: replaced by the product of their transfer functions.', fr: 'Blocs en série : remplacés par le produit de leurs fonctions de transfert.', de: 'Blöcke in Reihe: ersetzt durch das Produkt ihrer Übertragungsfunktionen.', it: 'Blocchi in serie: si sostituiscono con il prodotto delle loro funzioni di trasferimento.', pt: 'Blocos em série: substituídos pelo produto de suas funções de transferência.' },
  feedback: { es: 'Lazo de realimentación negativa con trayecto directo G y de retorno H: se reemplaza por G/(1 + GH).', en: 'Negative feedback loop with forward path G and return path H: replaced by G/(1 + GH).', fr: 'Boucle de contre-réaction de chaîne directe G et de retour H : remplacée par G/(1 + GH).', de: 'Gegenkopplungsschleife mit Vorwärtszweig G und Rückführung H: ersetzt durch G/(1 + GH).', it: 'Anello di retroazione negativa con ramo diretto G e di ritorno H: si sostituisce con G/(1 + GH).', pt: 'Laço de realimentação negativa com caminho direto G e de retorno H: substituído por G/(1 + GH).' },
  movePick: { es: 'Los lazos se cruzan. Se mueve el punto de bifurcación a la salida de G₃: para que la señal que vuelve no cambie, la rama se divide por G₃. Ahora los lazos están anidados.', en: 'The loops overlap. The pickoff point is moved to the output of G₃: so that the returning signal does not change, the branch is divided by G₃. Now the loops are nested.', fr: 'Les boucles se chevauchent. On déplace le point de dérivation à la sortie de G₃ : pour que le signal de retour ne change pas, la branche est divisée par G₃. Les boucles sont maintenant imbriquées.', de: 'Die Schleifen überlappen. Die Verzweigung wird hinter G₃ verschoben: Damit das zurückgeführte Signal gleich bleibt, wird der Zweig durch G₃ geteilt. Jetzt sind die Schleifen verschachtelt.', it: 'Gli anelli si sovrappongono. Si sposta la diramazione all’uscita di G₃: perché il segnale di ritorno non cambi, il ramo si divide per G₃. Ora gli anelli sono annidati.', pt: 'Os laços se cruzam. Move-se o ponto de derivação para a saída de G₃: para que o sinal que volta não mude, o ramo é dividido por G₃. Agora os laços estão aninhados.' },
  moveSum: { es: 'Los lazos se cruzan. Se mueve el sumador a la entrada de G₁: para que la señal que entra por esa rama no cambie, la rama se divide por G₁. Como los sumadores conmutan, queda delante del otro sumador y los lazos quedan anidados.', en: 'The loops overlap. The summing point is moved to the input of G₁: so that the signal entering through that branch does not change, the branch is divided by G₁. Since adders commute, it can be placed before the other adder, and the loops become nested.', fr: 'Les boucles se chevauchent. On déplace le sommateur à l’entrée de G₁ : pour que le signal qui entre par cette branche ne change pas, la branche est divisée par G₁. Les sommateurs commutant, il se place avant l’autre sommateur et les boucles deviennent imbriquées.', de: 'Die Schleifen überlappen. Der Summierer wird vor G₁ verschoben: Damit das über diesen Zweig eintretende Signal gleich bleibt, wird der Zweig durch G₁ geteilt. Da Summierer vertauschbar sind, kommt er vor den anderen Summierer, und die Schleifen sind verschachtelt.', it: 'Gli anelli si sovrappongono. Si sposta il sommatore all’ingresso di G₁: perché il segnale che entra da quel ramo non cambi, il ramo si divide per G₁. Poiché i sommatori commutano, si mette prima dell’altro sommatore e gli anelli diventano annidati.', pt: 'Os laços se cruzam. Move-se o somador para a entrada de G₁: para que o sinal que entra por esse ramo não mude, o ramo é dividido por G₁. Como os somadores comutam, ele fica antes do outro somador e os laços ficam aninhados.' },
};

const D = {
  subtitle: {
    es: 'Serie, paralelo, realimentación y movimiento de bifurcaciones y sumadores, paso a paso', en: 'Series, parallel, feedback and moving pickoff points and adders, step by step', fr: 'Série, parallèle, contre-réaction et déplacement de points de dérivation et de sommateurs, pas à pas',
    de: 'Reihe, Parallel, Rückführung und Verschieben von Verzweigungen und Summierern, Schritt für Schritt', it: 'Serie, parallelo, retroazione e spostamento di diramazioni e sommatori, passo per passo', pt: 'Série, paralelo, realimentação e movimento de derivações e somadores, passo a passo',
  },
  secValues: { es: 'Valores numéricos de los bloques', en: 'Numeric values of the blocks', fr: 'Valeurs numériques des blocs', de: 'Zahlenwerte der Blöcke', it: 'Valori numerici dei blocchi', pt: 'Valores numéricos dos blocos' },
  tipValues: {
    es: 'Numerador y denominador de cada bloque: coeficientes de la mayor a la menor potencia de s, separados por espacios. Ej.: 1 2 → s + 2.',
    en: 'Numerator and denominator of each block: coefficients from the highest to the lowest power of s, separated by spaces. E.g. 1 2 → s + 2.',
    fr: 'Numérateur et dénominateur de chaque bloc : coefficients de la plus haute à la plus basse puissance de s, séparés par des espaces. Ex. : 1 2 → s + 2.',
    de: 'Zähler und Nenner jedes Blocks: Koeffizienten von der höchsten zur niedrigsten Potenz von s, durch Leerzeichen getrennt. Bsp.: 1 2 → s + 2.',
    it: 'Numeratore e denominatore di ogni blocco: coefficienti dalla potenza più alta alla più bassa di s, separati da spazi. Es.: 1 2 → s + 2.',
    pt: 'Numerador e denominador de cada bloco: coeficientes da maior para a menor potência de s, separados por espaços. Ex.: 1 2 → s + 2.',
  },
  reset: { es: 'Restablecer valores', en: 'Reset values', fr: 'Rétablir les valeurs', de: 'Werte zurücksetzen', it: 'Ripristina i valori', pt: 'Restaurar valores' },
  poles: { es: 'polos', en: 'poles', fr: 'pôles', de: 'Pole', it: 'poli', pt: 'polos' },
  none: { es: 'ninguno', en: 'none', fr: 'aucun', de: 'keine', it: 'nessuno', pt: 'nenhum' },
  stepTitle: { es: 'Respuesta a escalón del sistema reducido', en: 'Step response of the reduced system', fr: 'Réponse indicielle du système réduit', de: 'Sprungantwort des reduzierten Systems', it: 'Risposta al gradino del sistema ridotto', pt: 'Resposta ao degrau do sistema reduzido' },
  unstable: { es: 'Con estos valores el sistema realimentado es inestable: tiene polos con parte real mayor o igual que cero.', en: 'With these values the closed-loop system is unstable: it has poles with nonnegative real part.', fr: 'Avec ces valeurs le système bouclé est instable : il a des pôles de partie réelle positive ou nulle.', de: 'Mit diesen Werten ist der geschlossene Kreis instabil: er hat Pole mit nichtnegativem Realteil.', it: 'Con questi valori il sistema in anello chiuso è instabile: ha poli con parte reale non negativa.', pt: 'Com estes valores o sistema realimentado é instável: tem polos com parte real maior ou igual a zero.' },
  badValue: { es: 'Revise los coeficientes: un denominador no puede ser cero.', en: 'Check the coefficients: a denominator cannot be zero.', fr: 'Vérifiez les coefficients : un dénominateur ne peut pas être nul.', de: 'Prüfen Sie die Koeffizienten: ein Nenner darf nicht null sein.', it: 'Controllate i coefficienti: un denominatore non può essere nullo.', pt: 'Revise os coeficientes: um denominador não pode ser zero.' },
  ideaReduce: {
    es: 'Un diagrama de bloques se simplifica paso a paso con unas pocas reglas: bloques en serie se multiplican, en paralelo se suman y un lazo de realimentación se reemplaza por G/(1 + GH). Cuando los lazos se cruzan, primero se mueve un punto de bifurcación o un sumador, compensando la rama.',
    en: 'A block diagram is simplified step by step with a few rules: blocks in series multiply, in parallel add, and a feedback loop is replaced by G/(1 + GH). When loops overlap, a pickoff point or an adder is moved first, compensating the branch.',
    fr: 'Un schéma-bloc se simplifie pas à pas avec quelques règles : les blocs en série se multiplient, en parallèle s’additionnent, et une boucle de contre-réaction se remplace par G/(1 + GH). Quand les boucles se chevauchent, on déplace d’abord un point de dérivation ou un sommateur en compensant la branche.',
    de: 'Ein Blockschaltbild wird mit wenigen Regeln schrittweise vereinfacht: Blöcke in Reihe multiplizieren sich, parallele addieren sich, eine Rückführschleife wird durch G/(1 + GH) ersetzt. Überlappen Schleifen, verschiebt man zuerst eine Verzweigung oder einen Summierer und gleicht den Zweig aus.',
    it: 'Uno schema a blocchi si semplifica passo per passo con poche regole: blocchi in serie si moltiplicano, in parallelo si sommano e un anello di retroazione si sostituisce con G/(1 + GH). Quando gli anelli si sovrappongono, prima si sposta una diramazione o un sommatore, compensando il ramo.',
    pt: 'Um diagrama de blocos se simplifica passo a passo com poucas regras: blocos em série se multiplicam, em paralelo se somam e um laço de realimentação se substitui por G/(1 + GH). Quando os laços se cruzam, primeiro se move um ponto de derivação ou um somador, compensando o ramo.',
  },
  example: { es: 'Ejemplo', en: 'Example', fr: 'Exemple', de: 'Beispiel', it: 'Esempio', pt: 'Exemplo' },
  stepN: { es: 'Paso', en: 'Step', fr: 'Étape', de: 'Schritt', it: 'Passo', pt: 'Passo' },
  prev: { es: '← Anterior', en: '← Previous', fr: '← Précédent', de: '← Zurück', it: '← Precedente', pt: '← Anterior' },
  next: { es: 'Siguiente →', en: 'Next →', fr: 'Suivant →', de: 'Weiter →', it: 'Successivo →', pt: 'Próximo →' },
  showAll: { es: 'Mostrar todos los pasos', en: 'Show all steps', fr: 'Afficher toutes les étapes', de: 'Alle Schritte zeigen', it: 'Mostra tutti i passi', pt: 'Mostrar todos os passos' },
  result: { es: 'Resultado', en: 'Result', fr: 'Résultat', de: 'Ergebnis', it: 'Risultato', pt: 'Resultado' },
  withValues: { es: 'Con valores numéricos', en: 'With numeric values', fr: 'Avec des valeurs numériques', de: 'Mit Zahlenwerten', it: 'Con valori numerici', pt: 'Com valores numéricos' },
} satisfies Record<string, S6>;

export type TKey = keyof typeof D;
export const translate = (lang: Lang, k: TKey) => D[k][lang];

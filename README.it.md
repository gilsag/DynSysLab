# DynSysLab DIE-USM

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Italiano** · [Português](README.pt.md)

Laboratori virtuali interattivi di sistemi dinamici, sviluppati presso il Dipartimento di Ingegneria Elettrica dell’Universidad Técnica Federico Santa María (Cile).

**Aprire i laboratori:** https://gilsag.github.io/DynSysLab/

| Laboratorio | Pagina | Contenuti |
|---|---|---|
| Segnali e proprietà dei sistemi | `properties.html` | Segnali elementari (comprese rampe per esponenziali e sinusoidi, i modi di radici multiple), traslazione, scalatura e ribaltamento, parti pari e dispari, energia e potenza, campionamento e periodicità discreta; linearità, tempo-invarianza, causalità, memoria e stabilità BIBO verificate con esperimenti su un catalogo di sistemi o una formula propria |
| Serie di Taylor e linearizzazione | `taylor.html` | Somme parziali e raggio di convergenza, retta tangente, maggiorazione del resto e intervallo di validità, equilibri, jacobiano, classificazione e ritratto di fase di sistemi non lineari del secondo ordine |
| Rappresentazioni equivalenti | `representations.html` | Uno stesso sistema come equazione differenziale, funzione di trasferimento, variabili di stato e schema a blocchi; forme canoniche di raggiungibilità e osservabilità, realizzazioni non minime, risposta al gradino e all’impulso |
| Riduzione di schemi a blocchi | `block-diagrams.html` | Regole di serie, parallelo e retroazione, spostamento di diramazioni e sommatori quando gli anelli si sovrappongono, passo per passo su sei esempi; risultato con valori dei blocchi modificabili, poli e risposta al gradino |
| Equazioni differenziali lineari | `ode.html` | Modi naturali e forzati, guadagno complesso e risonanza, risposta omogenea e particolare, a ingresso zero e a stato zero, transitoria e permanente |
| Approssimazione di funzioni | `approximation.html` | Segnali di base, errore quadratico, equazioni normali e matrice di Gram, ortogonalità; impulsi, gradini, base trigonometrica, monomi e polinomi di Legendre |
| Convoluzione | `convolution.html` | Ricetta grafica (ribaltare, traslare, integrare) con cambi di tratto, primo e secondo integrale di Duhamel, collegamenti in cascata e in parallelo |
| Variabili di stato | `state-space.html` | Sistema definito da matrici, poli e zeri o un circuito di esempio; realizzazioni, modi, ritratti di fase, cambio di coordinate, risposta temporale, controllabilità e osservabilità |
| Serie di Fourier | `fourier.html` | Scomposizione armonica, approssimazione con N termini, fenomeno di Gibbs, spettro, fasori, filtraggio LTI, suono |
| Circuiti nel dominio di Laplace | `laplace.html` | Impedenza generalizzata e generatori di condizione iniziale (in serie o in parallelo), equazioni ai nodi e alle maglie in s (simboliche e numeriche), risposta a stato zero e a ingresso zero, fratti semplici con poli multipli, teoremi del valore iniziale e finale |
| Sistema canonico del secondo ordine | `second-order.html` | Poli in funzione di ζ e ωn (trascinabili), risposta al gradino e all’impulso, sovraelongazione e tempi di salita, picco e assestamento misurati e confrontati con le formule, picco di risonanza e banda passante, equivalenza con l’RLC serie |
| Risposta in frequenza | `frequency.html` | Poli e zeri nel piano s, diagrammi di Bode con asintoti e margini, Nyquist, risposta temporale, sfide di identificazione |

Nei laboratori di Taylor, approssimazione e convoluzione gli studenti possono scrivere le proprie funzioni; derivate, coefficienti di Taylor e jacobiani sono calcolati in modo esatto dalla formula. In quello di convoluzione solo l’ingresso u(t) accetta formule libere: le risposte all’impulso sono limitate a quelle di sistemi lineari (primo e secondo ordine, integratore, EDO generale Q(D) y = P(D) u e guadagno con ritardo puro). In quello delle proprietà si possono scrivere un segnale x(t), un ingresso di prova u(t) o un sistema senza memoria y = f(u, t), le cui proprietà vengono decise con prove numeriche.

La pagina iniziale (`index.html`) raccoglie tutti i laboratori. Ognuno funziona nel browser, in spagnolo, inglese, francese, tedesco, italiano e portoghese (per impostazione predefinita la lingua del browser), con tema chiaro e scuro, quattro tavolozze (Blu, USM, Carta, Alto contrasto) e dimensione del testo regolabile per la proiezione. Funzionano anche su tablet e telefoni; su un telefono i controlli si aprono con un pulsante in fondo allo schermo.

## Uso

```bash
npm install
npm run dev            # http://localhost:5173 (pagina iniziale; ogni laboratorio in /<lab>.html)
npm test               # test numerici
npm run build          # sito statico in dist/ (richiede un server web)
npm run build:offline  # un file HTML autonomo per pagina in dist/offline/ (si apre offline con doppio clic)
npm run build:all      # entrambi
```

I file offline sono collegati tra loro: la cartella `dist/offline/` può essere copiata su una chiavetta USB o caricata su una piattaforma di apprendimento.

## Pubblicazione su GitHub Pages

Il workflow `.github/workflows/deploy.yml` esegue i test, compila il sito e i file offline e li pubblica a ogni push su `main`. Configurazione una tantum: nel repository, Settings → Pages → Build and deployment → Source: **GitHub Actions**. Il sito è quindi su `https://<utente>.github.io/<repository>/`, e la pagina iniziale offre il file offline di ogni laboratorio.

## Struttura

```
index.html, <lab>.html   una pagina per laboratorio (build multipagina di Vite); index.html è la pagina iniziale
src/shared/              comune a tutti i laboratori: tema (lab-theme.css), intestazione, Informazioni e menu di
                         visualizzazione (LabChrome.tsx), registro dei laboratori (suite.ts), componenti (ui.tsx),
                         grafico su canvas (Plot.tsx), motore di formule (expr.ts) e relativo campo (ExprInput.tsx),
                         formato dei numeri (format.ts), logo
src/hub/                 pagina iniziale
src/labs/<lab>/          una cartella per laboratorio (App.tsx, main.tsx, i18n.ts, styles.css e i suoi componenti)
src/labs/_template/      punto di partenza per nuovi laboratori (verificato con il resto, non pubblicato)
scripts/                 build offline e aiuto per creare laboratori
DESIGN.md                guida di progettazione seguita da ogni laboratorio
```

Il codice comune si trova in `src/shared/` e si importa come `@shared/…`; una modifica lì raggiunge tutti i laboratori alla build successiva.

## Aggiungere un laboratorio

```bash
npm run new-lab -- root-locus    # crea src/labs/root-locus/ e root-locus.html dal modello
```

Costruite il laboratorio seguendo `DESIGN.md`. Quando è pronto, registratelo in `src/shared/suite.ts` (titolo e riassunto in sei lingue; l’ordine delle voci è quello che vedono gli utenti) e aggiungete il suo glifo a `GLYPHS` in `src/shared/LabChrome.tsx`; comparirà così nella pagina iniziale e nella finestra Informazioni di ogni laboratorio.

## Licenza

Copyright (c) 2026 Esteban Gil. Il codice sorgente, l’interfaccia, la documentazione e le risorse del progetto sono distribuiti con licenza [Creative Commons Attribuzione - Non commerciale 4.0 Internazionale](https://creativecommons.org/licenses/by-nc/4.0/deed.it). Grafici, immagini, risultati e altri prodotti generati con i laboratori sono vostri per qualunque uso. Vedere [LICENSE](LICENSE).

## Autore

Esteban Gil, [Dipartimento di Ingegneria Elettrica](https://eli.usm.cl/), Universidad Técnica Federico Santa María · [sites.google.com/site/estebangil](https://sites.google.com/site/estebangil/)

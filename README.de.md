# DynSysLab DIE-USM

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · **Deutsch** · [Italiano](README.it.md) · [Português](README.pt.md)

Interaktive virtuelle Labore zu dynamischen Systemen, entwickelt am Institut für Elektrotechnik der Universidad Técnica Federico Santa María (Chile).

**Labore öffnen:** https://gilsag.github.io/DynSysLab/

| Labor | Seite | Inhalt |
|---|---|---|
| Signale und Systemeigenschaften | `properties.html` | Grundsignale (auch Rampe mal Exponentialfunktion und Sinus, die Eigenbewegungen mehrfacher Wurzeln), Verschiebung, Skalierung und Spiegelung, gerader und ungerader Anteil, Energie und Leistung, Abtastung und diskrete Periodizität; Linearität, Zeitinvarianz, Kausalität, Gedächtnis und BIBO-Stabilität im Experiment an einem Systemkatalog oder einer eigenen Formel |
| Taylor-Reihen und Linearisierung | `taylor.html` | Partialsummen und Konvergenzradius, Tangente, Restgliedschranke und Gültigkeitsbereich, Gleichgewichte, Jacobi-Matrix, Klassifikation und Phasenporträt nichtlinearer Systeme zweiter Ordnung |
| Äquivalente Darstellungen | `representations.html` | Ein System als Differentialgleichung, Übertragungsfunktion, Zustandsraum und Blockschaltbild; Regelungs- und Beobachtungsnormalform, nicht minimale Realisierungen, Sprung- und Impulsantwort |
| Umformung von Blockschaltbildern | `block-diagrams.html` | Regeln für Reihe, Parallel und Rückführung, Verschieben von Verzweigungen und Summierern bei überlappenden Schleifen, Schritt für Schritt an sechs Beispielen; Ergebnis mit änderbaren Blockwerten, Polen und Sprungantwort |
| Lineare Differentialgleichungen | `ode.html` | Eigen- und erzwungene Bewegungen, komplexe Verstärkung und Resonanz, homogene und partikuläre Lösung, Nulleingangs- und Nullzustandsantwort, Einschwingen und Beharrung |
| Funktionsapproximation | `approximation.html` | Grundsignale, quadratischer Fehler, Normalgleichungen und Gram-Matrix, Orthogonalität; Pulse, Sprünge, trigonometrische Basis, Monome und Legendre-Polynome |
| Faltung | `convolution.html` | Grafisches Verfahren (spiegeln, verschieben, integrieren) mit Abschnittswechseln, erstes und zweites Duhamel-Integral, Reihen- und Parallelschaltung |
| Zustandsraum | `state-space.html` | System aus Matrizen, Polen und Nullstellen oder einer Beispielschaltung; Realisierungen, Moden, Phasenporträts, Koordinatenwechsel, Zeitantwort, Steuerbarkeit und Beobachtbarkeit |
| Fourier-Reihen | `fourier.html` | Harmonische Zerlegung, Näherung mit N Gliedern, Gibbs-Phänomen, Spektrum, Zeiger, LTI-Filterung, Klang |
| Schaltungen im Laplace-Bereich | `laplace.html` | Verallgemeinerte Impedanz und Anfangswertquellen (in Reihe oder parallel), Knoten- und Maschengleichungen in s (symbolisch und numerisch), Nullzustands- und Nulleingangsantwort, Partialbrüche mit mehrfachen Polen, Anfangs- und Endwertsatz |
| Kanonisches System zweiter Ordnung | `second-order.html` | Pole in Abhängigkeit von ζ und ωn (verschiebbar), Sprung- und Impulsantwort, Überschwingen, Anstiegs-, Maximums- und Einschwingzeit gemessen und nach Formel, Resonanzüberhöhung und Bandbreite, Entsprechung zum RLC-Reihenschwingkreis |
| Frequenzgang | `frequency.html` | Pole und Nullstellen in der s-Ebene, Bode-Diagramme mit Asymptoten und Reserven, Nyquist, Zeitantwort, Identifikationsaufgaben |

In den Laboren zu Taylor, Approximation und Faltung können Studierende eigene Funktionen eingeben; Ableitungen, Taylor-Koeffizienten und Jacobi-Matrizen werden exakt aus der Formel berechnet. Im Faltungslabor akzeptiert nur der Eingang u(t) freie Formeln: Impulsantworten sind auf die linearer Systeme beschränkt (erste und zweite Ordnung, Integrator, allgemeine DGL Q(D) y = P(D) u und Verstärkung mit reiner Totzeit). Im Labor zu den Systemeigenschaften lassen sich ein Signal x(t), ein Testeingang u(t) oder ein gedächtnisloses System y = f(u, t) eingeben, dessen Eigenschaften dann mit numerischen Tests entschieden werden.

Die Startseite (`index.html`) listet alle Labore. Jedes läuft im Browser, auf Spanisch, Englisch, Französisch, Deutsch, Italienisch und Portugiesisch (standardmäßig die Browsersprache), mit hellem und dunklem Design, vier Farbpaletten (Blau, USM, Papier, Hoher Kontrast) und einstellbarer Schriftgröße für die Projektion. Sie funktionieren auch auf Tablets und Smartphones; auf dem Smartphone öffnet ein Knopf am unteren Bildschirmrand die Bedienelemente.

## Verwendung

```bash
npm install
npm run dev            # http://localhost:5173 (Startseite; jedes Labor unter /<lab>.html)
npm test               # numerische Tests
npm run build          # statische Website in dist/ (benötigt einen Webserver)
npm run build:offline  # eine eigenständige HTML-Datei pro Seite in dist/offline/ (offline per Doppelklick)
npm run build:all      # beides
```

Die Offline-Dateien sind untereinander verlinkt; der Ordner `dist/offline/` kann auf einen USB-Stick kopiert oder auf eine Lernplattform hochgeladen werden.

## Veröffentlichung auf GitHub Pages

Der Workflow `.github/workflows/deploy.yml` führt die Tests aus, baut die Website und die Offline-Dateien und veröffentlicht sie bei jedem Push auf `main`. Einmalige Einrichtung: im Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. Die Website liegt dann unter `https://<benutzer>.github.io/<repository>/`, und die Startseite bietet die Offline-Datei jedes Labors zum Herunterladen an.

## Struktur

```
index.html, <lab>.html   eine Seite pro Labor (Vite-Mehrseiten-Build); index.html ist die Startseite
src/shared/              für alle Labore gemeinsam: Design (lab-theme.css), Kopfzeile, Info-Dialog und
                         Anzeigemenü (LabChrome.tsx), Laborregister (suite.ts), Komponenten (ui.tsx),
                         Canvas-Diagramm (Plot.tsx), Formel-Engine (expr.ts) und Eingabefeld (ExprInput.tsx),
                         Zahlenformat (format.ts), Logo
src/hub/                 Startseite
src/labs/<lab>/          ein Ordner pro Labor (App.tsx, main.tsx, i18n.ts, styles.css und eigene Komponenten)
src/labs/_template/      Ausgangspunkt für neue Labore (wird mitgeprüft, nicht veröffentlicht)
scripts/                 Offline-Build und Hilfe zum Anlegen von Laboren
DESIGN.md                Gestaltungsrichtlinie, der jedes Labor folgt
```

Gemeinsamer Code liegt in `src/shared/` und wird als `@shared/…` importiert; eine Änderung dort erreicht beim nächsten Build alle Labore.

## Ein Labor hinzufügen

```bash
npm run new-lab -- root-locus    # legt src/labs/root-locus/ und root-locus.html aus der Vorlage an
```

Bauen Sie das Labor nach `DESIGN.md`. Wenn es fertig ist, tragen Sie es in `src/shared/suite.ts` ein (Titel und Zusammenfassung in sechs Sprachen; die Reihenfolge der Einträge ist die, die Nutzer sehen) und fügen Sie sein Symbol zu `GLYPHS` in `src/shared/LabChrome.tsx` hinzu; es erscheint dann auf der Startseite und im Info-Dialog jedes Labors.

## Lizenz

Copyright (c) 2026 Esteban Gil. Quellcode, Oberfläche, Dokumentation und Projektressourcen stehen unter der Lizenz [Creative Commons Namensnennung - Nicht kommerziell 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/deed.de). Diagramme, Bilder, Ergebnisse und andere Ausgaben, die Sie mit den Laboren erzeugen, dürfen Sie für jeden Zweck verwenden. Siehe [LICENSE](LICENSE).

## Autor

Esteban Gil, [Institut für Elektrotechnik](https://eli.usm.cl/), Universidad Técnica Federico Santa María · [sites.google.com/site/estebangil](https://sites.google.com/site/estebangil/)

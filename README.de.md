# DynSysLab DIE-USM

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · **Deutsch** · [Italiano](README.it.md) · [Português](README.pt.md)

Interaktive virtuelle Labore zu dynamischen Systemen, entwickelt am Institut für Elektrotechnik der Universidad Técnica Federico Santa María (Chile).

**Labore öffnen:** https://gilsag.github.io/DynSysLab/

| Labor | Seite | Inhalt |
|---|---|---|
| Taylor-Reihen und Linearisierung | `taylor.html` | Partialsummen und Konvergenzradius, Tangente, Restgliedschranke und Gültigkeitsbereich, Gleichgewichte, Jacobi-Matrix, Klassifikation und Phasenporträt nichtlinearer Systeme zweiter Ordnung |
| Faltung | `convolution.html` | Grafisches Verfahren (spiegeln, verschieben, integrieren) mit Abschnittswechseln, erstes und zweites Duhamel-Integral, Reihen- und Parallelschaltung |
| Funktionsapproximation | `approximation.html` | Grundsignale, quadratischer Fehler, Normalgleichungen und Gram-Matrix, Orthogonalität; Pulse, Sprünge, trigonometrische Basis, Monome und Legendre-Polynome |
| Zustandsraum | `state-space.html` | System aus Matrizen, Polen und Nullstellen oder einer Beispielschaltung; Realisierungen, Moden, Phasenporträts, Koordinatenwechsel, Zeitantwort, Steuerbarkeit und Beobachtbarkeit |
| Fourier-Reihen | `fourier.html` | Harmonische Zerlegung, Näherung mit N Gliedern, Gibbs-Phänomen, Spektrum, Zeiger, LTI-Filterung, Klang |
| Frequenzgang | `frequency.html` | Pole und Nullstellen in der s-Ebene, Bode-Diagramme mit Asymptoten und Reserven, Nyquist, Zeitantwort, Identifikationsaufgaben |

In den Laboren zu Taylor, Approximation und Faltung können Studierende eigene Funktionen eingeben; Ableitungen, Taylor-Koeffizienten und Jacobi-Matrizen werden exakt aus der Formel berechnet. Im Faltungslabor akzeptiert nur der Eingang u(t) freie Formeln: Impulsantworten sind auf die linearer Systeme beschränkt (erste und zweite Ordnung, Integrator, allgemeine DGL Q(D) y = P(D) u und Verstärkung mit reiner Totzeit).

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

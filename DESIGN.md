# Design guide · DynSysLab DIE-USM

DynSysLab DIE-USM is the suite of interactive virtual labs for the Dynamic Systems courses (Departamento de Ingeniería Eléctrica, UTFSM). It currently holds six labs, in this order: series de Taylor y linealización, convolución, aproximación de funciones, variables de estado, series de Fourier and respuesta en frecuencia. This guide applies to all of them and to any new one. The reference app is the Fourier lab.

## 1. Repository, stack and builds

One repository, one `package.json`: Vite + React + TypeScript, no UI framework, no runtime dependencies beyond React and KaTeX. Vite builds every `*.html` at the repository root as a page: `index.html` (home page, `src/hub/`) and one `<lab>.html` per lab, whose code lives in `src/labs/<lab>/`. `base: './'`, so `dist/` can be copied to any static host (GitHub Pages, Moodle, a USB stick).

Two kinds of build are required and both run in CI (`.github/workflows/deploy.yml`). `npm run build` makes `dist/`, which needs a web server. `npm run build:offline` makes `dist/offline/<page>.html`, one self-contained file per page (via `vite-plugin-singlefile`) that students open offline by double-clicking it; the files link to each other with relative paths. `import.meta.env.OFFLINE` is true in those builds. Never load anything from the network at run time (no Google Fonts, no CDNs).

Designed first for desktop and laptop screens and classroom projectors (tested at 1280×800, 1366×768, 1440×900 and 1920×1080), and usable on tablets and phones. No minimum width. Below 1100 px multi-column tabs stack and wide content (formulas, matrices, tables) scrolls inside its card. From 701 to 999 px the sidebar narrows to about a third of the width. At 700 px and below (phones held upright) the header is compact (logo shield only, tools on their own line), tabs scroll sideways on one line, and the sidebar becomes a sheet at the bottom of the screen opened by the floating Controls button (`SidebarToggle` in `LabChrome.tsx`, CSS `.lab-fab` and `.sheet-open`). Short screens (phones sideways) also get one-line tabs. All of this is in `lab-theme.css`, so a new lab gets it by using `.lab-app`, `.lab-layout`, `.lab-sidebar`, `.lab-main` and `.tabs`. Interactive drawings use pointer events with `touch-action: none`; hover-only behaviour needs a tap equivalent (InfoTip toggles on tap; the Bode cursor follows a tap). Check every tab at 390×844 and 844×390 for horizontal overflow.

## 2. Shared code

Everything in `src/shared/` is common to all labs and imported as `@shared/…`; never copy it into a lab.

- `suite.ts`: the lab registry (`SUITE_LABS`: title and home-page summary of each lab in six languages), `SUITE_NAME`, `AUTHOR`, `LICENSE`, `labHref`.
- `LabChrome.tsx`: `LabHeader` (logo, lab glyph, suite name linking to the home page, lab title, subtitle, app tools, About, Display menu, language selector), `GLYPHS`, `initialLang` and `persistLang`, `useThemeVersion`, `textScale` and `cssVar` (for canvas drawing).
- `lab-theme.css`: tokens, palettes, light/dark, layout and shared components.
- `ui.tsx`: `Card`, `Slider`, `Seg`, `Check`, `InfoTip`, `Tex`, `Rich`. `Plot.tsx`: canvas plot (linear/log axes, lines, stems, legend, reference lines) that follows theme, palette, text size and window height.
- `expr.ts`: formula engine for functions typed by students (parser with error codes, compiled evaluation, exact Taylor coefficients by truncated power-series arithmetic, exact gradients by dual numbers). `ExprInput.tsx`: the formula field with translated error messages and syntax help. Never use finite differences when the formula is available.
- `format.ts`: numbers as text (`fmt`) and TeX (`tex`) with decimal comma except in English. `NumField` in `ui.tsx` accepts comma or point.
- `logo-utfsm-die.jpg`.

Lab-specific styling goes in `src/labs/<lab>/styles.css`, imported after the shared CSS; it is loaded only on that lab's page, so labs cannot break each other. A component that a second lab needs moves to `src/shared/`.

## 3. Layout

Header, then two columns: a sticky left sidebar (`aside.lab-sidebar`) and a main column (`main.lab-main`). The page scrolls normally; the sidebar scrolls on its own when it is taller than the window.

The sidebar holds every control that defines the system or the experiment (signal, parameters, poles and zeros, gain, source). The main column holds, from top to bottom: an optional key-idea note (`.callout`), a metrics row (`.metrics` with `.metric` tiles), the main plots in cards, and secondary content in a tabbed card (`.tabs` with pill buttons). If tabs are the main navigation (as in State-Space), they go at the top of the main column and stay visible (sticky).

App-specific tools (units, undo/redo, copy link, system size) go in the header through `LabHeader tools={…}`, to the left of the Display menu and the language selector.

## 4. Components and class names

Use the shared primitives instead of new ones: `.card` with `.card-head`, `.card-title h3`, `.card-tools`; `Card`, `Slider`, `Seg`, `Check`, `InfoTip`, `Tex`, `Rich` from `@shared/ui`; `.callout` for a key idea; `.badge` (`.ok`, `.mid`, `.bad`); `.hint` for help text under a control; `button.primary`, `button.tiny`, `button.sq`, `button.icon`; `.seg` for exclusive choices; `.metrics`/`.metric`/`.mlabel`/`.mval`; `.table-wrap` + `.dtable` for data tables.

Card titles are short nouns in sentence case. Every card, metric and tab that is not self-explanatory has an "i" tooltip (`InfoTip`) saying what it shows and why it matters.

## 5. Colour

Use tokens from `lab-theme.css`, never raw hex in components or CSS. The USM palette uses the university's official digital colours (#004B85 blue, #D60019 red, #008452 green, #F7AE00 yellow, #000000 black) as given in light mode and lighter tints of the same hues in dark mode. The palette (Blue, USM, Paper, High contrast) and the light/dark theme change the tokens, and anything written with tokens follows automatically.

UI tokens: `--bg`, `--panel`, `--panel-2`, `--text`, `--muted`, `--border`, `--border-strong`, `--accent`, `--accent-soft`, `--on-accent`, `--good`, `--warn`, `--bad`, `--hl`, `--flash`.

Plot tokens: `--plot-bg`, `--grid`, `--grid-minor`, `--axis`, `--plot-text`.

Plot semantics, the same in every lab:

| Meaning | Token |
|---|---|
| main signal / main curve | `--c-signal` (the accent) |
| approximation, cursor, frozen or reference curve | `--c-approx`, `--c-overlay` |
| error | `--c-error` |
| input, secondary reference | `--c-input` |
| phase | `--c-phase` |
| poles (×) and zeros (○) | `--c-pole`, `--c-zero` |
| unstable / marginal | `--bad` / `--warn` |
| root locus | `--c-locus` |
| left / right half-plane shading | `--lhp` / `--rhp` |
| several series (modes, states, factors) | `--s1` … `--s8`, in order |

Canvas plots pass token names (`color: '--c-signal'`) and resolve them at draw time with `cssVar`; they redraw when `useThemeVersion()` changes. SVG plots use CSS classes, or `style={{ stroke: 'var(--s2)' }}`; do not put `var()` in SVG presentation attributes (`stroke="var(…)"`), because not every browser supports it.

## 6. Typography

System font stack (`--sans`), `--mono` for numeric read-outs, KaTeX for mathematics (`Tex`, or `$…$` inside translated strings with `Rich`). All font sizes are in `rem` so the text-size setting (A−/A+) scales them; base text is 0.875rem. Canvas text multiplies its pixel size by `textScale()`.

## 7. Languages

Six languages, in this order: Español, English, Français, Deutsch, Italiano, Português. Every UI string of a lab lives in `src/labs/<lab>/i18n.ts` as `{ es, en, fr, de, it, pt }`, checked with `satisfies Record<string, S6>` so TypeScript reports any missing translation. The initial language is the remembered choice (shared by all labs), then the browser language, then Spanish; use `initialLang()` and `persistLang()`. Decimal comma in every language except English when formatting numbers for text.

## 8. Identity

Umbrella name: DynSysLab DIE-USM, identical in every language. Lab titles follow one pattern: es "Laboratorio virtual de …", en "… Virtual Lab", fr "Laboratoire virtuel de …", de "Virtuelles Labor: …", it "Laboratorio virtuale di …", pt "Laboratório virtual de …", in sentence case. Titles live only in `SUITE_LABS` (`src/shared/suite.ts`); a lab passes `lab="<id>"` to `LabHeader`. A lab under construction passes `title` instead and is registered when it is ready, which adds it to the home page and to every lab's About list.

Header: UTFSM DIE logo (cropped to its ink so its height matches the title block, linking to https://eli.usm.cl/), separator, lab glyph (24×24 stroke icon drawn in `currentColor`, shown white on an accent square, registered in `GLYPHS`), suite name as a small line linking to the home page, lab title, subtitle (hidden on laptops). The browser tab reads "lab title · DynSysLab DIE-USM" in the current language; the static `<title>` in `<lab>.html` is the Spanish one. Favicon: the same glyph in white on a rounded square of `#2864d8`.

About: the header's About button opens a dialog with the suite description, links to the other labs, the author block (Esteban Gil: positions, university and website; no phone, fax, e-mail or postal address anywhere in the labs) and the license (CC BY-NC 4.0). Change those texts only in `suite.ts` and `LabChrome.tsx`.

Documentation: `README.md` in English only, with full translations in `README.es.md`, `README.fr.md`, `README.de.md`, `README.it.md` and `README.pt.md` (language links at the top of each); keep the six in sync. Per-lab notes in `src/labs/<lab>/README.md` are in English.

License: `LICENSE` at the repository root (CC BY-NC 4.0; outputs generated by users are free for any use; React and KaTeX keep their MIT licenses; the university logos are not covered).

## 9. Adding a lab

`npm run new-lab -- <id>` copies `src/labs/_template/` to `src/labs/<id>/` and creates `<id>.html`. Build the lab there; when ready, add it to `SUITE_LABS` and `GLYPHS` and switch `LabHeader` to `lab="<id>"`. Keep `_template` compiling: it is type-checked with the rest and shows the conventions in use.

## 10. Checklist for a new lab or a change

1. Numerical results are checked in a `*.test.ts` against reference values (worked examples, closed-form results). The interface never cites course notes, sections or other documents: each lab must make sense on its own. `npm run typecheck`, `npm test`, `npm run build` and `npm run build:offline` pass; the offline page opens by double-click and its links to the other labs work.
2. Every string exists in the six languages.
3. Light and dark, all four palettes, and text size 130 % look right; no raw hex in new code.
4. Layout works at 1280×800 and 1920×1080.
5. Changes in `src/shared/` were checked on every lab page.

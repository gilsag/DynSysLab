# DynSysLab DIE-USM

Interactive virtual labs for linear dynamic systems, developed for the Dynamic Systems courses of the Departamento de Ingeniería Eléctrica, Universidad Técnica Federico Santa María (Chile).

*Laboratorios virtuales interactivos de sistemas dinámicos lineales para los cursos del Departamento de Ingeniería Eléctrica de la Universidad Técnica Federico Santa María.*

| Lab | Page | What it covers |
|---|---|---|
| Laboratorio virtual de variables de estado | `state-space.html` | Realizations, modes, phase portraits, change of coordinates, time response, controllability and observability |
| Laboratorio virtual de series de Taylor y linealización | `taylor.html` | Partial sums and radius of convergence, tangent line, residual bound and range of validity, equilibria, Jacobian, classification and phase portrait of nonlinear second-order systems |
| Laboratorio virtual de aproximación de funciones | `approximation.html` | Basic signals, squared error, normal equations and Gram matrix, orthogonality; pulses, steps, trigonometric basis, monomials and Legendre polynomials |
| Laboratorio virtual de convolución | `convolution.html` | Graphical recipe (flip, shift, integrate) with segment changes, first and second Duhamel integrals, cascade and parallel connections |
| Laboratorio virtual de series de Fourier | `fourier.html` | Harmonic decomposition, N-term approximation, Gibbs phenomenon, spectrum, phasors, LTI filtering, sound |
| Laboratorio virtual de respuesta en frecuencia | `frequency.html` | s-plane poles and zeros, Bode plots with asymptotes and margins, Nyquist, time response, identification challenges |

Students can type their own functions in the Taylor, approximation and convolution labs; derivatives, Taylor coefficients and Jacobians are computed exactly from the formula. In the convolution lab only the input u(t) accepts free formulas: impulse responses are limited to those of linear systems (first and second order, integrator, a general ODE Q(D) y = P(D) u, and gain with pure delay).

The home page (`index.html`) lists all labs. Every lab runs in the browser, in Spanish, English, French, German, Italian and Portuguese (browser language by default), with light and dark themes, four palettes (Blue, USM, Paper, High contrast) and adjustable text size for projection.

## Use

```bash
npm install
npm run dev            # http://localhost:5173 (home page; labs at /fourier.html, /frequency.html, /state-space.html)
npm test               # numerical tests
npm run build          # static site in dist/ (needs a web server)
npm run build:offline  # one self-contained HTML file per page in dist/offline/ (opens offline, double-click)
npm run build:all      # both
```

The offline files link to each other, so `dist/offline/` can be copied as a folder to a USB stick or uploaded to Moodle.

## Publishing on GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests, builds the site and the offline files, and publishes them on every push to `main`. One-time setup: in the repository, Settings → Pages → Build and deployment → Source: **GitHub Actions**. The site is then at `https://<user>.github.io/<repository>/`, and the home page offers each lab's offline file for download.

## Structure

```
index.html, <lab>.html   one page per lab (Vite multi-page build); index.html is the home page
src/shared/              common to every lab: theme (lab-theme.css), header, About and display menu
                         (LabChrome.tsx), lab registry (suite.ts), UI components (ui.tsx), canvas plot
                         (Plot.tsx), formula engine (expr.ts) and field (ExprInput.tsx), number
                         formatting (format.ts), logo
src/hub/                 home page
src/labs/<lab>/          one folder per lab (App.tsx, main.tsx, i18n.ts, styles.css, its own components)
src/labs/_template/      starting point for new labs (type-checked with the rest, not published)
scripts/                 offline build and new-lab helper
DESIGN.md                design guide that every lab follows
```

Shared code lives in `src/shared/` and is imported as `@shared/…`; a change there reaches every lab at the next build.

## Adding a lab

```bash
npm run new-lab -- root-locus    # creates src/labs/root-locus/ and root-locus.html from the template
```

Build the lab following `DESIGN.md`. When it is ready, register it in `src/shared/suite.ts` (title and summary in six languages) and add its glyph to `GLYPHS` in `src/shared/LabChrome.tsx`; it then appears on the home page and in every lab's About dialog.

## License

Copyright (c) 2026 Esteban Gil. Source code, interface, documentation and project assets are licensed under [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/). Plots, images, results and other outputs you generate with the labs are yours to use for any purpose. See [LICENSE](LICENSE).

## Author

Esteban Gil, Department of Electrical Engineering, Universidad Técnica Federico Santa María · [esteban.gil@usm.cl](mailto:esteban.gil@usm.cl) · [sites.google.com/site/estebangil](https://sites.google.com/site/estebangil/)
"# DynSysLab" 

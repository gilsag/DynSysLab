# DynSysLab DIE-USM

**English** · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Português](README.pt.md)

Interactive virtual labs for dynamic systems, developed at the Department of Electrical Engineering of Universidad Técnica Federico Santa María (Chile).

**Open the labs:** https://gilsag.github.io/DynSysLab/

| Lab | Page | What it covers |
|---|---|---|
| Signals and System Properties | `properties.html` | Basic signals (including ramps times exponentials and sinusoids, the modes of repeated roots), shifting, scaling and reversal, even and odd parts, energy and power, sampling and discrete periodicity; linearity, time invariance, causality, memory and BIBO stability tested by experiment on a catalogue of systems or your own formula |
| Taylor Series and Linearization | `taylor.html` | Partial sums and radius of convergence, tangent line, residual bound and range of validity, equilibria, Jacobian, classification and phase portrait of nonlinear second-order systems |
| Equivalent Representations | `representations.html` | One system as a differential equation, transfer function, state space and block diagram; controllable and observable canonical forms, non-minimal realizations, step and impulse responses |
| Block-Diagram Reduction | `block-diagrams.html` | Series, parallel and feedback rules, moving pickoff points and summing points when loops overlap, step by step on six examples; result with editable block values, poles and step response |
| Linear Differential Equations | `ode.html` | Natural and forced modes, complex gain and resonance, homogeneous and particular, zero-input and zero-state, transient and steady-state response |
| Function Approximation | `approximation.html` | Basic signals, squared error, normal equations and Gram matrix, orthogonality; pulses, steps, trigonometric basis, monomials and Legendre polynomials |
| Convolution | `convolution.html` | Graphical recipe (flip, shift, integrate) with segment changes, first and second Duhamel integrals, cascade and parallel connections |
| State Space | `state-space.html` | System defined from matrices, poles and zeros, or an example circuit; realizations, modes, phase portraits, change of coordinates, time response, controllability and observability |
| Fourier Series | `fourier.html` | Harmonic decomposition, N-term approximation, Gibbs phenomenon, spectrum, phasors, LTI filtering, sound |
| Circuits in the Laplace Domain | `laplace.html` | Generalized impedance and initial-condition sources (series or parallel), nodal and mesh equations in s (symbolic and numeric), zero-state and zero-input response, partial fractions with repeated poles, initial- and final-value theorems |
| Canonical Second-Order System | `second-order.html` | Poles as functions of ζ and ωn (draggable), step and impulse response, overshoot, rise, peak and settling times measured against the formulas, resonance peak and bandwidth, series RLC mapping |
| Frequency Response | `frequency.html` | s-plane poles and zeros, Bode plots with asymptotes and margins, Nyquist, time response, identification challenges |

Students can type their own functions in the Taylor, approximation and convolution labs; derivatives, Taylor coefficients and Jacobians are computed exactly from the formula. In the convolution lab only the input u(t) accepts free formulas: impulse responses are limited to those of linear systems (first and second order, integrator, a general ODE Q(D) y = P(D) u, and gain with pure delay). In the properties lab you can also type a signal x(t), a test input u(t) or a memoryless system y = f(u, t), whose properties are then decided by numerical tests.

The home page (`index.html`) lists all labs. Every lab runs in the browser, in Spanish, English, French, German, Italian and Portuguese (browser language by default), with light and dark themes, four palettes (Blue, USM, Paper, High contrast) and adjustable text size for projection. They also work on tablets and phones; on a phone the controls open from a button at the bottom of the screen.

## Use

```bash
npm install
npm run dev            # http://localhost:5173 (home page; each lab at /<lab>.html)
npm test               # numerical tests
npm run build          # static site in dist/ (needs a web server)
npm run build:offline  # one self-contained HTML file per page in dist/offline/ (opens offline, double-click)
npm run build:all      # both
```

The offline files link to each other, so `dist/offline/` can be copied as a folder to a USB stick or uploaded to a learning platform.

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

Build the lab following `DESIGN.md`. When it is ready, register it in `src/shared/suite.ts` (title and summary in six languages; the order of the entries is the order shown to users) and add its glyph to `GLYPHS` in `src/shared/LabChrome.tsx`; it then appears on the home page and in every lab's About dialog.

## License

Copyright (c) 2026 Esteban Gil. Source code, interface, documentation and project assets are licensed under [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/). Plots, images, results and other outputs you generate with the labs are yours to use for any purpose. See [LICENSE](LICENSE).

## Author

Esteban Gil, [Department of Electrical Engineering](https://eli.usm.cl/), Universidad Técnica Federico Santa María · [sites.google.com/site/estebangil](https://sites.google.com/site/estebangil/)

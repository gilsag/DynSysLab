# State-Space Virtual Lab · DynSysLab DIE-USM

Part of DynSysLab DIE-USM. Run, build and offline instructions are in the README at the repository root; this page is served as `state-space.html`.

Interactive web app (Vite + React + TypeScript) for a linear dynamic systems course: state-space representation, poles and zeros, modes, phase portraits, change of coordinates, controllability and observability. Interface in Spanish, English, Portuguese, French, Italian and German. Designed for desktop screens and projectors, and usable on tablets and phones; the Display menu enlarges the text for projection.

## Content

The switch at the top of the sidebar chooses how the system is defined:

- **Matrices**: A, B, C, D typed by hand (up to n = 8, m = 3, p = 3).
- **Poles & zeros** of G(s) (single input, single output, up to order 8).
- **Circuit**: an example electric circuit with its own parameters, whose capacitor voltages and inductor currents are the state variables. Five circuits are available: first-order RC, series RLC, two-mesh RLC, two-stage RC ladder and a third-order LC filter (Butterworth with the default values). Each one offers several outputs (including outputs with D ≠ 0) and the pole locus when one parameter varies.

Matrices and Poles & zeros describe the same system: switching between them carries the current system over. Choosing Circuit replaces the system with the circuit's. The working realization (controllable, observable, modal canonical form, or the source's own) is used in every tab.

| Tab | What it shows |
|---|---|
| Poles and zeros | Editable s-plane (drag, add pairs, delete, snapping), matrices that flash when they change, G(s), table of modes, step response |
| Representation | n-th order ODE → n first-order ODEs → vector form; the available realizations; matrix T between them; signal-flow graph |
| Phase portrait | Vector field, family of trajectories, eigendirections, animation, comparison with modal coordinates, trace-determinant plane, modal decomposition in time |
| Change of coordinates | Draggable basis {t₁, t₂}, A_z = T⁻¹AT, invariants, active transformation vs. change of basis |
| Time response | Free response in closed form (including Jordan blocks), step, impulse, sinusoid, Bode, e^{At} vs. truncated series vs. element-wise exponential |
| Controllability and observability | 𝒞, 𝒪, singular values, PBH test per mode, minimal realization, modal graph, reachable subspace and Gramian ellipse, "same output from different states", sweep of a zero along the real axis |

Controllability and observability ranks are computed with orthogonal transformations (staircase form) on the balanced system, because Kalman matrices become badly conditioned in high-order canonical forms.

## Layout

```
math/        linear algebra, polynomials, realizations, modes, 𝒞/𝒪, Gramian, exact simulation
circuits.ts  catalogue of example circuits (parameters, states, A, B, outputs, drawing)
components/  s-plane, phase plane, graph, plots, circuit drawing, trace-determinant plane
tabs/        one tab per file
i18n.ts      all texts; each key has [es, en, pt, fr, it, de]. $…$ is rendered with KaTeX
tests/       numerical checks (modal bases, real block, 𝒞, 𝒪, cancellations, order 8, circuits)
```

To add a circuit, add an entry to `CIRCUITS` in `circuits.ts` (ladder of series and shunt elements, A and B, outputs) and its name and note in `i18n.ts` (`circ.<id>`, `circ.note.<id>`).

To add a language: add its code to `Lang` (format.ts), to `LANGS` and `L` (i18n.ts) and one more column to every dictionary entry; TypeScript flags the missing ones.

The initial language is the browser's (Spanish if it is not one of the six) and can be changed in the top bar. Preferences (language, system, tab) are stored in the browser.

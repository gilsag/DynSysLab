# Frequency Response Virtual Lab · DynSysLab DIE-USM

Part of DynSysLab DIE-USM. Run and build instructions are in the README at the repository root; this page is served as `frequency.html`.

Interactive pole-zero / Bode laboratory for a dynamic systems course. Multilingual (ES/EN/FR/DE/IT/PT), React + TypeScript + Vite, no runtime dependencies beyond React.

## Features

**s-plane**
- Drag poles (×) and zeros (○); click to add (off the real axis a conjugate pair is added); delete mode.
- A complex pair that touches the real axis splits into two real roots; two nearby real roots pulled off the axis merge into a pair (the system order is preserved, as at the breakaway point of a root locus).
- Vectors from each root to jω (ω chosen on the Bode plot): geometric reading of |H| and ∠H.
- Closed-loop poles (unity negative feedback) and root locus.
- Wheel = zoom, drag the background = pan, grid snapping, automatic framing.

**Bode**
- Exact curves, asymptotes (straight-line Bode, phase transition of pairs with width 10^±ζ), individual contribution of each factor.
- Gain and phase margins marked on the plot.
- "Freeze curve" to compare before and after (also in time response, Nyquist and s-plane).
- Gain in Bode form (fixed K_B: the low-frequency level does not change when roots move) or pole-zero form (fixed K, as in the root locus).
- Pure delay e^(−sT). Units rad/s or Hz. Automatic or manual range.

**Tabs**
- Step and impulse response with overshoot, rise time and settling time (exact discretization by matrix exponential).
- Sinusoidal input: exact simulation of the transient plus steady state, compared with |H(jω)| and ∠H(jω).
- Nyquist with logarithmic compression, ω < 0 branch, encirclement count and Z = N + P.
- Table of the contribution of each factor at ω (dB, degrees, vector lengths and angles).
- Challenge: a hidden system appears as a target curve; students must rebuild it (three levels).

**Other**
- Panel of automatic observations: slopes, corners, resonances, non-minimum phase, pole-zero cancellations, instability, margins.
- Preset examples with explanations (first order, integrator, second order, lead, lag, notch, band-pass, all-pass, right-half-plane zero, PID, loop with delay).
- Undo/redo (Ctrl+Z / Ctrl+Y), shortcuts P/Z/M/D/Del/Esc, shareable link (the system is encoded in the URL), light/dark theme.

## Screen

Designed for a computer or projector, with the common DynSysLab layout: sidebar (s-plane, gain, roots, H(s)) and main column. From 1500 px wide the analysis sits to the right of the Bode plot; on narrower screens, below it.

## Layout

```
math/      tf.ts (factors, Bode, margins, Nyquist), poly.ts (Aberth roots), sim.ts (expm, simulation), presets.ts
components SPlane, BodePlot, LinePlot, Panels (time/sine/Nyquist/contributions), Challenge, RootTable, TFDisplay, Insights
i18n.ts    ES/EN/FR/DE/IT/PT texts (`dict`; to add a language, add its code to `LANGS` and an entry in each text)
```

To add an example, add an entry to `math/presets.ts`.

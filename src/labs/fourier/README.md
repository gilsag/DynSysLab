# Laboratorio virtual de series de Fourier · DynSysLab DIE-USM

Part of DynSysLab DIE-USM. Run, build and offline instructions are in the README at the repository root; this page is served as `fourier.html`.

Interactive Fourier series explorer for a Dynamic Systems course, Departamento de Ingeniería Eléctrica, UTFSM (Vite + React + TypeScript). The header logo is `src/shared/logo-utfsm-die.jpg`. UI in Spanish, English, French, German, Italian and Portuguese (selector in the header; the choice is remembered). Designed for desktop screens and projectors (minimum width 1100 px). Every section, metric and tab has an "i" tooltip explaining its purpose.

The microphone tab needs `localhost` or `https` (browser rule for `getUserMedia`); GitHub Pages is https. Everything else also works from the offline file.

## What it does

Signals: square, trapezoid (rise time t_r: square convolved with a box, coefficients times a sinc), sawtooth, triangle, asymmetric triangle (peak position p, from triangle to sawtooth), periodic parabola, pulse train (duty D), half and full-wave rectified sine, clipped sine (clipping level c, a nonlinearity that creates odd harmonics), periodic exponential (τ), white noise (one period of Gaussian noise repeated every T, selectable realization), constant (mean value only), sine; free drawing of one period; microphone capture of one period of a real sound.

Main view: closed-form series (KaTeX), signal vs N-term approximation (optionally each harmonic), error e_N(t), amplitude and phase spectrum (linear/dB, one/two-sided, k or Hz, 20 kHz audibility line), symmetry badges (even, odd, half-wave), metrics (energy captured by Parseval, relative RMS error, max error, Gibbs overshoot, audible harmonics).

Fundamental frequency: chosen as a musical note (note + octave, scientific notation, editable A4 reference) or freely in Hz; the readout always shows f₀, the nearest note with its deviation in cents, and the period T.

Sound: Web Audio `PeriodicWave` built directly from the coefficients. Play the full signal, the N-term approximation or the error; A/B alternation every second.

Manipulations: time shift (phases change, amplitudes do not), phases set to zero or random (same spectrum magnitude, different waveform, nearly identical sound), Fejér and Lanczos σ smoothing against Gibbs, harmonic mask (odd only, even only, missing fundamental, solo any harmonic).

Tabs: harmonics table (frequency, A_k, dB, phase, a_k, b_k), rotating phasors (epicycles), convergence (RMS error vs N, |C_k| decay with 1/k and 1/k² guides), LTI system in steady state (1st-order low/high-pass, 2nd-order low-pass and band-pass with ζ, Bode plots with harmonics marked, "tune to harmonic k" for resonance demos; the output is what gets plotted, analyzed and played), microphone (live waveform and spectrum, pitch detection, capture one averaged period), theory summary.

## Code map

- `lib/fourier.ts` FFT, synthesis, Parseval helpers. Convention: `x(t) = C0 + Σ Re{C_k e^{jkω0t}}`, `C_k = a_k − j b_k`.
- `lib/signals.ts` signal definitions (analytic coefficients or high-resolution FFT, exact time functions). Add a signal here.
- `lib/analysis.ts` shift, phase, LTI, σ weights, metrics, convergence, symmetry.
- `lib/lti.ts`, `lib/audio.ts`, `lib/pitch.ts`.
- `components/` canvas plotting and panels; `i18n.ts` language machinery; `locales/*.ts` all UI text per language (TypeScript enforces that every language has every key).

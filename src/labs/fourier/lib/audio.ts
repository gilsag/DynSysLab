// Web Audio engine. Periodic signals are played with OscillatorNode + PeriodicWave, which takes
// exactly the Fourier coefficients (real = cosine terms, imag = sine terms) and band-limits them.

function holdAt(p: AudioParam, t: number): void {
  const q = p as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
  if (typeof q.cancelAndHoldAtTime === 'function') q.cancelAndHoldAtTime(t);
  else {
    const v = p.value;
    p.cancelScheduledValues(t);
    p.setValueAtTime(v, t);
  }
}

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

export interface WaveData {
  real: Float32Array;
  imag: Float32Array;
  level: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wave: PeriodicWave | null = null;
  private cont: Voice | null = null;

  ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -6;
      comp.knee.value = 6;
      comp.ratio.value = 12;
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  private makeWave(real: Float32Array, imag: Float32Array): PeriodicWave {
    const ctx = this.ensure();
    return ctx.createPeriodicWave(real, imag, { disableNormalization: true });
  }

  setWave(data: WaveData): void {
    this.wave = this.makeWave(data.real, data.imag);
    if (this.cont) this.cont.osc.setPeriodicWave(this.wave);
  }

  start(f0: number, level: number): void {
    const ctx = this.ensure();
    if (this.cont || !this.wave || !this.master) return;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.wave);
    osc.frequency.value = f0;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(this.master);
    osc.start();
    gain.gain.setTargetAtTime(level, ctx.currentTime, 0.015);
    this.cont = { osc, gain };
  }

  setFreq(f0: number): void {
    if (!this.ctx || !this.cont) return;
    this.cont.osc.frequency.setTargetAtTime(f0, this.ctx.currentTime, 0.004);
  }

  setLevel(level: number): void {
    if (!this.ctx || !this.cont) return;
    this.cont.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.02);
  }

  stop(): void {
    if (!this.ctx || !this.cont) return;
    const { osc, gain } = this.cont;
    const now = this.ctx.currentTime;
    holdAt(gain.gain, now);
    gain.gain.setTargetAtTime(0, now, 0.015);
    osc.stop(now + 0.15);
    this.cont = null;
  }
}

export const audio = new AudioEngine();

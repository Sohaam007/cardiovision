/**
 * Web Audio API Synthesizer for Synchronized Physiological Heart Sounds (S1/S2)
 *
 * S1: "Lub" - Atrioventricular (Mitral/Tricuspid) valve closure
 *     Occurs at onset of systole (~80Hz resonant fundamental with gentle exponential decay)
 *
 * S2: "Dub" - Semilunar (Aortic/Pulmonary) valve closure
 *     Occurs at onset of diastole (~115Hz crisper, shorter acoustic profile)
 */

export class CardiacAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = true;
  private volume: number = 0.85;

  private initAudio(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    } catch {
      // Graceful fallback if audio context blocked
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (!muted) {
      if (!this.ctx) {
        this.initAudio();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // S1: "Lub" - Atrioventricular (Mitral/Tricuspid) valve closure
  // Resonant ~85Hz fundamental layered with 155Hz acoustic stethoscope warmth
  public playS1(): void {
    if (this.isMuted) return;
    if (!this.ctx || !this.masterGain) {
      this.initAudio();
    }
    if (!this.ctx || !this.masterGain) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;

      // 1. Deep fundamental oscillator (85Hz -> 48Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(88, now);
      osc1.frequency.exponentialRampToValueAtTime(46, now + 0.14);
      gain1.gain.setValueAtTime(0.70, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);

      // 2. Audible acoustic stethoscope harmonic (155Hz -> 92Hz) for laptop speakers
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(155, now);
      osc2.frequency.exponentialRampToValueAtTime(85, now + 0.11);
      gain2.gain.setValueAtTime(0.40, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.17);
      osc2.stop(now + 0.14);
    } catch {
      // Audio playback fails gracefully
    }
  }

  // S2: "Dub" - Semilunar (Aortic/Pulmonary) valve closure
  // Crisper ~125Hz fundamental layered with 215Hz snap
  public playS2(): void {
    if (this.isMuted) return;
    if (!this.ctx || !this.masterGain) {
      this.initAudio();
    }
    if (!this.ctx || !this.masterGain) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;

      // 1. Semilunar snap fundamental (125Hz -> 68Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(125, now);
      osc1.frequency.exponentialRampToValueAtTime(65, now + 0.10);
      gain1.gain.setValueAtTime(0.60, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);

      // 2. High-frequency valve click harmonic (215Hz -> 110Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(215, now);
      osc2.frequency.exponentialRampToValueAtTime(110, now + 0.08);
      gain2.gain.setValueAtTime(0.35, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.13);
      osc2.stop(now + 0.10);
    } catch {
      // Audio playback fails gracefully
    }
  }
}

// Global shared audio synthesizer instance
export const cardiacAudio = new CardiacAudioSynthesizer();

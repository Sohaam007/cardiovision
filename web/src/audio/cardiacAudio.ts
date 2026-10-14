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
  private isMuted: boolean = true;

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (!muted && !this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          // Graceful fallback
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // S1: "Lub" - Mitral/Tricuspid valve closure (resonant ~80Hz with gentle decay)
  public playS1(): void {
    if (this.isMuted || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio playback fails gracefully if context locked
    }
  }

  // S2: "Dub" - Aortic/Pulmonary valve closure (~115Hz, shorter, crisper)
  public playS2(): void {
    if (this.isMuted || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.09);

      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio playback fails gracefully
    }
  }
}

// Global shared audio synthesizer instance
export const cardiacAudio = new CardiacAudioSynthesizer();

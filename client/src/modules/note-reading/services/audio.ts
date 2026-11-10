export function frequencyForMidiPitch(midiPitch: number, tuning = 440): number {
  return tuning * 2 ** ((midiPitch - 69) / 12);
}

export type PianoTone = {
  midiPitch: number;
  frequency: number;
};

export function pianoTone(midiPitch: number): PianoTone {
  return { midiPitch, frequency: frequencyForMidiPitch(midiPitch) };
}

export class BrowserAudioEngine {
  private context: AudioContext | null = null;

  async play(midiPitch: number, durationMs = 450): Promise<void> {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
    try {
      this.context ??= new window.AudioContext();
      await this.context.resume();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const start = this.context.currentTime;
      const duration = Math.max(0.08, durationMs / 1000);
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequencyForMidiPitch(midiPitch), start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      // Keep answer validation usable when browser audio is unavailable or blocked.
    }
  }

  async close(): Promise<void> {
    if (this.context && this.context.state !== "closed") await this.context.close();
    this.context = null;
  }
}

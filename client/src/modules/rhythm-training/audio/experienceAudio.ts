import pianoSampleUrl from "../assets/piano-c4.wav?url";
import type { RhythmVoiceSettings } from "./voices";

const decodedByContext = new WeakMap<BaseAudioContext, Promise<AudioBuffer>>();

/**
 * Fetch and decode the bundled recorded FreePats C4 piano sample once per
 * AudioContext. Failed attempts are evicted so callers can retry; no oscillator
 * or synthetic piano fallback is provided.
 */
export function loadPianoBuffer(
  context: BaseAudioContext
): Promise<AudioBuffer> {
  const cached = decodedByContext.get(context);
  if (cached !== undefined) return cached;

  const pending = (async () => {
    try {
      const response = await fetch(pianoSampleUrl);
      if (!response.ok) {
        throw new Error(
          `Unable to load the piano sample (${response.status}).`
        );
      }
      const encoded = await response.arrayBuffer();
      return await context.decodeAudioData(encoded.slice(0));
    } catch (error) {
      decodedByContext.delete(context);
      throw error;
    }
  })();
  decodedByContext.set(context, pending);
  return pending;
}

/**
 * Build opt-in experience voices. The optional metronome output is normally a
 * caller-owned GainNode, allowing metronome volume to be set to zero separately
 * from the pattern lane. Pattern output is omitted unless a caller needs one.
 */
export function experienceVoiceSettings(
  pianoBuffer: AudioBuffer,
  metronomeOutput?: AudioNode
): RhythmVoiceSettings {
  return Object.freeze({
    pattern: Object.freeze({
      // Retained only to satisfy the stable settings contract; sampled playback
      // does not create an oscillator or use this frequency/waveform.
      frequencyHz: 261.63,
      level: 0.22,
      waveform: "sine" as OscillatorType,
      edgeSeconds: 0.008,
      pianoBuffer,
    }),
    metronome: Object.freeze({
      // Resonant knock consumes native inharmonic oscillator modes, not a sine.
      frequencyHz: 2600,
      level: 0.4,
      waveform: "sine" as OscillatorType,
      // The complete ring fits within even the fastest 300 BPM pulse (200ms).
      durationSeconds: 0.18,
      edgeSeconds: 0.0008,
      resonantKnock: true as const,
      ...(metronomeOutput === undefined ? {} : { output: metronomeOutput }),
    }),
  });
}

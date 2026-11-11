import type { RhythmAudioEvent } from "./plan";

/** Synthesis settings are caller inputs, not approved accent/velocity policy. */
export type RhythmVoiceSettings = Readonly<{
  pattern: Readonly<{
    frequencyHz: number;
    level: number;
    waveform: OscillatorType;
    edgeSeconds: number;
  }>;
  metronome: Readonly<{
    frequencyHz: number;
    level: number;
    waveform: OscillatorType;
    durationSeconds: number;
    edgeSeconds: number;
  }>;
}>;

export type RhythmVoiceHandle = Readonly<{
  cancel: () => void;
}>;

export function validateVoiceSettings(settings: RhythmVoiceSettings): void {
  for (const voice of [settings.pattern, settings.metronome]) {
    if (
      !Number.isFinite(voice.frequencyHz) ||
      voice.frequencyHz <= 0 ||
      !Number.isFinite(voice.level) ||
      voice.level <= 0 ||
      voice.level > 1 ||
      !Number.isFinite(voice.edgeSeconds) ||
      voice.edgeSeconds <= 0 ||
      !["sine", "square", "triangle", "sawtooth"].includes(voice.waveform)
    )
      throw new RangeError("Invalid explicit Rhythm voice settings.");
  }
  if (
    !Number.isFinite(settings.metronome.durationSeconds) ||
    settings.metronome.durationSeconds <= 0 ||
    settings.metronome.durationSeconds > 0.25
  )
    throw new RangeError("Metronome voice must be a short, finite tick.");
}

/**
 * A real oscillator gate, not a click stand-in for a written note duration.
 * All automation uses audio-clock seconds. Both envelope edges are inside the
 * canonical span, so a release cannot leak a tone into the following rest.
 * Accent metadata is intentionally NOT mapped into an invented gain ratio.
 */
export function scheduleRhythmVoice(
  context: BaseAudioContext,
  event: RhythmAudioEvent,
  startTime: number,
  endTime: number,
  settings: RhythmVoiceSettings,
  onEnded: () => void = () => undefined
): RhythmVoiceHandle {
  validateVoiceSettings(settings);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    startTime < 0 ||
    endTime <= startTime
  )
    throw new RangeError("A voice requires a finite positive audio gate.");
  const voice = settings[event.lane];
  const gateEnd =
    event.lane === "metronome"
      ? Math.min(endTime, startTime + settings.metronome.durationSeconds)
      : endTime;
  const edge = Math.min(voice.edgeSeconds, (gateEnd - startTime) / 3);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  let disconnected = false;
  const disconnect = () => {
    if (disconnected) return;
    disconnected = true;
    oscillator.onended = null;
    oscillator.disconnect();
    gain.disconnect();
    onEnded();
  };
  try {
    oscillator.type = voice.waveform;
    oscillator.frequency.setValueAtTime(voice.frequencyHz, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(voice.level, startTime + edge);
    gain.gain.setValueAtTime(voice.level, gateEnd - edge);
    gain.gain.linearRampToValueAtTime(0, gateEnd);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = disconnect;
    oscillator.start(startTime);
    oscillator.stop(gateEnd);
  } catch (error) {
    try {
      oscillator.stop();
    } catch {
      /* It may not have started yet. */
    }
    disconnect();
    throw error;
  }
  return Object.freeze({
    cancel: () => {
      if (disconnected) return;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
      try {
        oscillator.stop(context.currentTime);
      } catch {
        /* Already ended. */
      }
      disconnect();
    },
  });
}

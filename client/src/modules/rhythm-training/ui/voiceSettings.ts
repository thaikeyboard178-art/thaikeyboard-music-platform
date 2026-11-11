import type { RhythmVoiceSettings } from "../audio/voices";

/** Explicit, neutral caller defaults; accents never alter gain or level. */
export const TAP_UI_VOICE_SETTINGS: RhythmVoiceSettings = Object.freeze({
  pattern: Object.freeze({
    frequencyHz: 440,
    level: 0.12,
    waveform: "sine",
    edgeSeconds: 0.005,
  }),
  metronome: Object.freeze({
    frequencyHz: 880,
    level: 0.12,
    waveform: "sine",
    durationSeconds: 0.025,
    edgeSeconds: 0.003,
  }),
});

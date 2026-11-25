import type { ChordConfiguration, ChordMethod } from "./types";
export function defaultChordConfiguration(method: ChordMethod): ChordConfiguration {
  return { method, level: 1, questionCount: 10, answerMode: "quality", inversions: false, display: "both", register: 4, playback: { mode: "both", direction: "ascending", spacingMs: 350 }, replayLimit: 3 };
}

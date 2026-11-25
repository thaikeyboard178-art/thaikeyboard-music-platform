export type ChordLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type ChordMethod = "visual" | "ear";
export type QualityId = "major" | "minor" | "diminished" | "augmented" | "sus2" | "sus4" | "dominant7" | "major7" | "minor7" | "halfDiminished7" | "diminished7" | "minorMajor7" | "dominant9" | "major9" | "minor9" | "dominant11" | "major11" | "minor11" | "dominant13" | "major13" | "minor13";
export type SpelledNote = Readonly<{ letter: "C" | "D" | "E" | "F" | "G" | "A" | "B"; accidental: number; name: string; pitchClass: number }>;
export type ChordPitch = SpelledNote & Readonly<{ octave: number; midi: number }>;
export type ChordInterval = Readonly<{ degree: number; semitones: number; label: string }>;
export type ChordQuality = Readonly<{ id: QualityId; name: string; symbol: string; level: ChordLevel; intervals: readonly ChordInterval[] }>;
export type CanonicalChord = Readonly<{
  root: SpelledNote; quality: QualityId; symbol: string; name: string;
  intervals: readonly ChordInterval[]; tones: readonly SpelledNote[];
  pitchClasses: readonly number[]; pitches: readonly ChordPitch[];
  bass: SpelledNote; inversion: number; signature: string;
}>;
export type PlaybackConfiguration = Readonly<{ mode: "melody" | "harmony" | "both"; direction: "ascending" | "descending" | "random"; spacingMs: number }>;
export type ChordConfiguration = Readonly<{
  method: ChordMethod; level: ChordLevel; questionCount: 10 | 20 | 30 | null;
  answerMode: "quality" | "full"; inversions: boolean;
  display: "staff" | "piano" | "both"; register: 3 | 4 | 5;
  playback: PlaybackConfiguration; replayLimit: 1 | 3 | null;
}>;
export type ChordAnswer = Readonly<{ id: string; label: string }>;
export type ChordQuestion = Readonly<{
  id: string; chord: CanonicalChord; method: ChordMethod; level: ChordLevel;
  correctAnswer: ChordAnswer; choices: readonly ChordAnswer[];
  playback: PlaybackConfiguration; signature: string;
}>;
export type PianoVoicing = Readonly<{ left: readonly ChordPitch[]; right: readonly ChordPitch[] }>;
export type ChordQuestionRecord = Readonly<{ question: ChordQuestion; status: "unanswered" | "correct" | "incorrect" | "skipped"; answerId: string | null }>;
export type ChordSession = Readonly<{
  id: string; config: ChordConfiguration; seed: number; questions: readonly ChordQuestion[];
  index: number; records: readonly ChordQuestionRecord[];
  status: "active" | "completed" | "stopped"; startedAt: number; completedAt: number | null;
}>;
export type ChordResult = Readonly<{
  sessionId: string; method: ChordMethod; level: ChordLevel; status: "completed" | "stopped";
  presented: number; answered: number; correct: number; incorrect: number; skipped: number;
  accuracy: number | null; details: readonly ChordQuestionRecord[]; completedAt: number;
}>;

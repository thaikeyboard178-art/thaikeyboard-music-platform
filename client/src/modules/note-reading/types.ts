import type { ExerciseMode } from "@/features/training/types";

export type Clef = "treble" | "bass";
export type ClefSelection = Clef | "mixed";
export type NoteLetter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Accidental = "natural" | "sharp" | "flat";
export type KeySignature = { fifths: number; mode?: "major" | "minor" };
export type NoteRange = "staff" | "one-ledger" | "extended";
export type AnswerMethod = "multiple-choice" | "piano";
export type NoteReadingMode = ExerciseMode;

export type NoteEvent = {
  id: string;
  clef: Clef;
  letter: NoteLetter;
  octave: number;
  diatonicPosition: number;
  pitchValue: number;
  accidental: Accidental;
  keySignature?: KeySignature | null;
};

export type NoteAnswer = {
  letter: NoteLetter;
  octave: number;
  accidental: Accidental;
  pitchValue: number;
};

export type NoteExercise = {
  id: string;
  index: number;
  note: NoteEvent;
};

export type NoteReadingConfiguration = {
  clef: ClefSelection;
  range: NoteRange;
  mode: NoteReadingMode;
  answerMethod: AnswerMethod;
  questionCount: number;
  speedLimitSeconds: number | null;
  challengeDate: string;
};

export type ExerciseGenerationOptions = {
  clef: ClefSelection;
  range: NoteRange;
  exerciseId: string;
  index: number;
  previous?: Pick<NoteEvent, "clef" | "diatonicPosition">;
};

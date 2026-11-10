import { describe, expect, it } from "vitest";
import { noteReadingModule } from "./module";
import type { NoteReadingConfiguration } from "./types";
const base: NoteReadingConfiguration = { clef: "treble", range: "staff", mode: "free", answerMethod: "multiple-choice", questionCount: 10, speedLimitSeconds: null, challengeDate: "2026-11-10" };

describe("public Note Reading module ledger adapter", () => {
  it("forwards independent custom bounds even when the historical range says staff", () => {
    const exercise = noteReadingModule.generateExercise({ ...base, ledgerRange: { above: 4, below: 0 } }, () => 0.999999);
    expect(exercise.note.diatonicPosition).toBe(16);
    expect(exercise.note.letter).toBe("G");
    expect(exercise.note.octave).toBe(6);
    expect(exercise.note.pitchValue).toBe(91);
  });
  it("preserves legacy bounds when no custom ledgerRange is provided", () => {
    expect(noteReadingModule.generateExercise(base, () => 0.999999).note.diatonicPosition).toBe(8);
  });
  it("rejects invalid ledger counts before public generation", () => {
    expect(() => noteReadingModule.generateExercise({ ...base, ledgerRange: { above: 5, below: 1 } })).toThrow(RangeError);
  });
});

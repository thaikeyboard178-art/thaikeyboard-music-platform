import { describe, expect, it } from "vitest";
import { midiPitch, NOTE_LETTERS } from "../notation/musicTheory";
import { createSeededRandom, dailyChallengeSeed, generateDailyExercises, generateExercise, isAllowedGeneratedNote, validateNoteAnswer } from "./exercises";

describe("note-reading exercise service", () => {
  it("generates only positions inside each selected range", () => {
    for (const range of ["staff", "one-ledger", "extended"] as const) {
      const random = createSeededRandom(12345);
      for (let index = 0; index < 500; index += 1) {
        const exercise = generateExercise({ clef: "treble", range, exerciseId: `t-${index}`, index }, random);
        expect(isAllowedGeneratedNote(exercise.note, range)).toBe(true);
      }
    }
  });

  it("maps each answer to the exact structured note and octave", () => {
    const note = generateExercise({ clef: "bass", range: "extended", exerciseId: "fixture", index: 1 }, () => 0.4).note;
    expect(validateNoteAnswer(note, { letter: note.letter, octave: note.octave, accidental: "natural", pitchValue: note.pitchValue })).toBe(true);
    expect(validateNoteAnswer(note, { letter: note.letter, octave: note.octave + 1, accidental: "natural", pitchValue: note.pitchValue + 12 })).toBe(false);
  });

  it("supports mixed clefs and both selected clefs appear under a fixed seed", () => {
    const random = createSeededRandom(42);
    const clefs = new Set(Array.from({ length: 100 }, (_, index) =>
      generateExercise({ clef: "mixed", range: "staff", exerciseId: `mix-${index}`, index }, random).note.clef,
    ));
    expect(clefs).toEqual(new Set(["treble", "bass"]));
  });

  it("produces the same daily sequence for an identical date and configuration", () => {
    const first = generateDailyExercises("2026-11-10", "mixed", "extended", 30);
    const second = generateDailyExercises("2026-11-10", "mixed", "extended", 30);
    expect(first).toEqual(second);
    expect(generateDailyExercises("2026-11-11", "mixed", "extended", 30)).not.toEqual(first);
    expect(dailyChallengeSeed("2026-11-10", "mixed", "extended", 30)).toBe(dailyChallengeSeed("2026-11-10", "mixed", "extended", 30));
  });

  it("uses all seven natural-note names and standard pitch mapping", () => {
    expect(NOTE_LETTERS).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(NOTE_LETTERS.map((letter) => midiPitch(letter, 4))).toEqual([60, 62, 64, 65, 67, 69, 71]);
  });
});

import { describe, expect, it } from "vitest";
import { noteAtDiatonicPosition, vexFlowKey } from "./musicTheory";
import { generateDailyExercises, generateExercise, validateNoteAnswer } from "../services/exercises";

const fixtures = {
  treble: "D3:50 E3:52 F3:53 G3:55 A3:57 B3:59 C4:60 D4:62 E4:64 F4:65 G4:67 A4:69 B4:71 C5:72 D5:74 E5:76 F5:77 G5:79 A5:81 B5:83 C6:84 D6:86 E6:88 F6:89 G6:91",
  bass: "F1:29 G1:31 A1:33 B1:35 C2:36 D2:38 E2:40 F2:41 G2:43 A2:45 B2:47 C3:48 D3:50 E3:52 F3:53 G3:55 A3:57 B3:59 C4:60 D4:62 E4:64 F4:65 G4:67 A4:69 B4:71",
} as const;

describe("independent QA pitch fixtures", () => {
  for (const clef of ["treble", "bass"] as const) {
    fixtures[clef].split(" ").forEach((fixture, index) => {
      it(`${clef} position ${index - 8}: ${fixture}`, () => {
        const [name, pitch] = fixture.split(":");
        const note = noteAtDiatonicPosition(clef, index - 8);
        expect(`${note.letter}${note.octave}`).toBe(name);
        expect(note.pitchValue).toBe(Number(pitch));
        expect(vexFlowKey(note)).toBe(`${name[0].toLowerCase()}/${name[1]}`);
        expect(validateNoteAnswer(note, { letter: note.letter, octave: note.octave, accidental: "natural", pitchValue: Number(pitch) })).toBe(true);
        expect(validateNoteAnswer(note, { letter: note.letter, octave: note.octave + 1, accidental: "natural", pitchValue: Number(pitch) + 12 })).toBe(false);
      });
    });
  }

  it.each(["treble", "bass", "mixed"] as const)("generates only selected positions for %s in every range", (clef) => {
    for (const [range, min, max] of [["staff", 0, 8], ["one-ledger", -2, 10], ["extended", -8, 16]] as const) {
      for (let index = 1; index <= 250; index++) {
        const exercise = generateExercise({ clef, range, exerciseId: `qa-${index}`, index });
        expect(exercise.note.diatonicPosition).toBeGreaterThanOrEqual(min);
        expect(exercise.note.diatonicPosition).toBeLessThanOrEqual(max);
        if (clef !== "mixed") expect(exercise.note.clef).toBe(clef);
      }
      for (const count of [10, 20, 30, 50]) {
        const first = generateDailyExercises("2026-11-10", clef, range, count);
        expect(first).toHaveLength(count);
        expect(generateDailyExercises("2026-11-10", clef, range, count)).toEqual(first);
        expect(generateDailyExercises("2026-11-11", clef, range, count)).not.toEqual(first);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { diatonicPositionOf, getAllowedPositions, midiPitch, noteAtDiatonicPosition, NOTE_RANGES, vexFlowKey } from "./musicTheory";

describe("note-reading music theory", () => {
  it("maps every treble staff line and space from E4 upward", () => {
    const expected = [
      [0, "E", 4], [1, "F", 4], [2, "G", 4], [3, "A", 4], [4, "B", 4],
      [5, "C", 5], [6, "D", 5], [7, "E", 5], [8, "F", 5],
    ] as const;
    for (const [position, letter, octave] of expected) {
      const note = noteAtDiatonicPosition("treble", position);
      expect([note.diatonicPosition, note.letter, note.octave]).toEqual([position, letter, octave]);
    }
  });

  it("maps every bass staff line and space from G2 upward", () => {
    const expected = [
      [0, "G", 2], [1, "A", 2], [2, "B", 2], [3, "C", 3], [4, "D", 3],
      [5, "E", 3], [6, "F", 3], [7, "G", 3], [8, "A", 3],
    ] as const;
    for (const [position, letter, octave] of expected) {
      const note = noteAtDiatonicPosition("bass", position);
      expect([note.diatonicPosition, note.letter, note.octave]).toEqual([position, letter, octave]);
    }
  });

  it.each(["treble", "bass"] as const)("round-trips positions including ledger lines and multiple octaves for %s", (clef) => {
    for (let position = -8; position <= 16; position += 1) {
      const note = noteAtDiatonicPosition(clef, position);
      expect(diatonicPositionOf(clef, note.letter, note.octave)).toBe(position);
      expect(note.pitchValue).toBe(midiPitch(note.letter, note.octave));
      expect(vexFlowKey(note)).toBe(`${note.letter.toLowerCase()}/${note.octave}`);
    }
  });

  it("matches standard MIDI natural-note pitch values and accidentals", () => {
    expect(midiPitch("A", 4)).toBe(69);
    expect(midiPitch("C", 4)).toBe(60);
    expect(midiPitch("C", 4, "sharp")).toBe(61);
    expect(midiPitch("B", 3, "flat")).toBe(58);
  });

  it("defines the complete in-staff, one-ledger, and extended positions", () => {
    expect(getAllowedPositions("staff")).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(getAllowedPositions("one-ledger")).toEqual(Array.from({ length: 13 }, (_, index) => index - 2));
    expect(getAllowedPositions("extended")).toEqual(Array.from({ length: 25 }, (_, index) => index - 8));
    expect(NOTE_RANGES.extended.min).toBe(-8);
    expect(NOTE_RANGES.extended.max).toBe(16);
  });
});

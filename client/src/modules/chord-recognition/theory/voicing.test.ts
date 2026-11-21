import { describe, expect, it } from "vitest";
import { createChord } from "./chords";
import { CHORD_QUALITIES } from "./qualityCatalog";
import { suggestVoicing } from "./voicing";

const names = (pitches: readonly { name: string; octave: number }[]) => pitches.map(({ name, octave }) => `${name}${octave}`);

describe("Suggested Piano Voicing", () => {
  it("matches the C Major golden reference", () => {
    const voicing = suggestVoicing(createChord("C", "major"));
    expect(names(voicing.left)).toEqual(["C2", "C3"]);
    expect(names(voicing.right)).toEqual(["C4", "E4", "G4"]);
  });

  it("matches the Cm9 golden reference", () => {
    const voicing = suggestVoicing(createChord("C", "minor9"));
    expect(names(voicing.left)).toEqual(["C2", "C3"]);
    expect(names(voicing.right)).toEqual(["E♭4", "G4", "B♭4", "D5"]);
  });

  it("matches the Cm9/G slash-bass reference, including root in RH", () => {
    const voicing = suggestVoicing(createChord("C", "minor9", { bass: "G" }));
    expect(names(voicing.left)).toEqual(["G2", "G3"]);
    expect(names(voicing.right)).toEqual(["C4", "E♭4", "B♭4", "D5"]);
  });

  it("compacts a wide extended slash voicing while preserving the root and note spellings", () => {
    const voicing = suggestVoicing(createChord("C", "dominant13", { bass: "F♯" }));
    expect(names(voicing.left)).toEqual(["F♯2", "F♯3"]);
    expect(voicing.right).toHaveLength(4);
    expect(voicing.right.some(({ name }) => name === "C")).toBe(true);
    expect(Math.max(...voicing.right.map(({ midi }) => midi)) - Math.min(...voicing.right.map(({ midi }) => midi))).toBeLessThanOrEqual(19);
  });

  it("keeps suggested notes in a supported keyboard register for all qualities", () => {
    for (const quality of CHORD_QUALITIES) {
      const voicing = suggestVoicing(createChord("F♯", quality.id));
      for (const pitch of [...voicing.left, ...voicing.right]) expect(pitch.midi).toBeGreaterThanOrEqual(24);
    }
  });
});

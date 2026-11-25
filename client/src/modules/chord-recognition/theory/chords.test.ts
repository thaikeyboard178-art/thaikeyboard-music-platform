import { describe, expect, it } from "vitest";
import { CHORD_QUALITIES, getQuality } from "./qualityCatalog";
import { createChord } from "./chords";
import { formatPitch, parseNote, pitchAt, ROOT_NAMES } from "./spelling";

const mod12 = (value: number) => ((value % 12) + 12) % 12;

describe("canonical chord theory", () => {
  it("catalogs all 21 supported qualities and their exact level assignments", () => {
    expect(CHORD_QUALITIES).toHaveLength(21);
    expect(CHORD_QUALITIES.filter((quality) => quality.level === 6)).toHaveLength(9);
    expect(() => getQuality("bad" as never)).toThrow(RangeError);
  });

  it("uses a sensible twelve-root set and keeps enharmonic spelling distinct from pitch class", () => {
    expect(ROOT_NAMES).toHaveLength(12);
    expect(parseNote("B#").pitchClass).toBe(0);
    expect(parseNote("C♭").pitchClass).toBe(11);
    expect(parseNote("B#").name).toBe("B♯");
    expect(parseNote("Cbb").accidental).toBe(-2);
    expect(() => parseNote("H")).toThrow(RangeError);
  });

  it("maps spelled octaves correctly, including B-sharp and C-flat", () => {
    expect(pitchAt("B#", 3).midi).toBe(60);
    expect(formatPitch(pitchAt("B#", 3))).toBe("B♯3");
    expect(pitchAt("Cb", 4).midi).toBe(59);
  });

  it("spells a minor ninth by diatonic degree and preserves its structure under slash bass", () => {
    const chord = createChord("C", "minor9", { bass: "G" });
    expect(chord.tones.map(({ name }) => name)).toEqual(["C", "E♭", "G", "B♭", "D"]);
    expect(chord.intervals.map(({ label }) => label)).toEqual(["1", "♭3", "5", "♭7", "9"]);
    expect(chord.root.name).toBe("C");
    expect(chord.bass.name).toBe("G");
    expect(chord.pitchClasses).toEqual([0, 2, 3, 7, 10]);
    expect(chord.pitches[0].name).toBe("G");
    expect(chord.pitches[0].octave).toBe(2);
    expect(chord.pitches.some(({ name, octave }) => name === "G" && octave === 4)).toBe(true);
    expect(chord.symbol).toBe("Cm9/G");
  });

  it("spells degree alterations including double accidentals without enharmonic substitution", () => {
    const chord = createChord("B#", "major7");
    expect(chord.tones.map(({ name }) => name)).toEqual(["B♯", "D𝄪", "F𝄪", "A𝄪"]);
    expect(chord.pitches.map(({ midi }) => midi)).toEqual([72, 76, 79, 83]);
  });

  it("preserves every catalog interval's pitch-class and diatonic-degree invariant across all roots", () => {
    for (const rootName of ROOT_NAMES) {
      const root = parseNote(rootName);
      for (const quality of CHORD_QUALITIES) {
        const chord = createChord(rootName, quality.id);
        expect(chord.tones.map(({ pitchClass }, index) => pitchClass)).toEqual(
          quality.intervals.map(({ semitones }) => mod12(root.pitchClass + semitones)),
        );
        expect(chord.pitches.map(({ midi }) => midi)).toEqual(
          quality.intervals.map(({ semitones }) => pitchAt(root, 4).midi + semitones),
        );
        expect(chord.tones.map(({ letter }, index) => letter)).toEqual(
          quality.intervals.map(({ degree }) => "CDEFGAB"[("CDEFGAB".indexOf(root.letter) + degree - 1) % 7]),
        );
      }
    }
  });

  it("rotates inversion members into ascending MIDI while keeping the root and formula distinct", () => {
    const root = createChord("C", "major");
    const first = createChord("C", "major", { inversion: 1 });
    const second = createChord("C", "major", { inversion: 2 });
    expect(root.pitches.map(({ name, octave }) => `${name}${octave}`)).toEqual(["C4", "E4", "G4"]);
    expect(first.pitches.map(({ name, octave }) => `${name}${octave}`)).toEqual(["E4", "G4", "C5"]);
    expect(second.pitches.map(({ name, octave }) => `${name}${octave}`)).toEqual(["G4", "C5", "E5"]);
    expect(first.bass.name).toBe("E");
    expect(first.root.name).toBe("C");
    expect(first.tones.map(({ name }) => name)).toEqual(root.tones.map(({ name }) => name));
    expect(first.pitchClasses).toEqual(root.pitchClasses);
  });

  it("supports inversions across all qualities and produces ordered pitches in the tested registers", () => {
    for (const quality of CHORD_QUALITIES) {
      for (const octave of [3, 4, 5]) {
        for (let inversion = 0; inversion < quality.intervals.length; inversion += 1) {
          const chord = createChord("C", quality.id, { octave, inversion });
          const midi = chord.pitches.map(({ midi: value }) => value);
          expect(midi.every((value, index) => index === 0 || midi[index - 1] < value)).toBe(true);
          expect(midi.every((value) => value >= 24 && value <= 108)).toBe(true);
          expect(chord.tones).toHaveLength(quality.intervals.length);
          expect(new Set(chord.pitchClasses)).toEqual(new Set(chord.tones.map((tone) => mod12(tone.pitchClass))));
        }
      }
    }
  });

  it("rejects invalid roots, options, and out-of-range inversions", () => {
    expect(() => createChord("H", "major")).toThrow(RangeError);
    expect(() => createChord("C", "major", { inversion: 3 })).toThrow(RangeError);
    expect(() => createChord("C", "major", { octave: 9 })).toThrow(RangeError);
    expect(() => createChord("C", "major", { bass: "H" })).toThrow(RangeError);
  });
});

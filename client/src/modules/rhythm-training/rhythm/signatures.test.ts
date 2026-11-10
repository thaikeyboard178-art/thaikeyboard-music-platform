import { describe, expect, it } from "vitest";
import { FOUR_FOUR, HALF_TIE, INVALID_FIXTURES, WHOLE_NOTE } from "./fixtures";
import {
  notationSignature,
  onsetSignature,
  soundingSignature,
} from "./signatures";

describe("canonical rhythm signatures", () => {
  it("ignores names and normalized tie IDs", () => {
    const renamed = {
      ...HALF_TIE,
      id: "renamed",
      measures: HALF_TIE.measures.map(measure => ({
        id: "renamed-bar",
        segments: measure.segments.map((segment, index) => ({
          ...segment,
          id: `renamed-${index}`,
          tieGroupId: "OTHER",
        })),
      })),
    };
    expect(notationSignature(renamed)).toBe(notationSignature(HALF_TIE));
    expect(soundingSignature(renamed)).toBe(soundingSignature(HALF_TIE));
  });
  it("distinguishes written whole from tied halves while preserving intended onset/sustain equivalence", () => {
    expect(notationSignature(WHOLE_NOTE)).not.toBe(notationSignature(HALF_TIE));
    expect(onsetSignature(WHOLE_NOTE)).toBe(onsetSignature(HALF_TIE));
    expect(soundingSignature(WHOLE_NOTE)).toBe(soundingSignature(HALF_TIE));
  });
  it("distinguishes sustain from quarter-plus-rest despite matching onset lists", () => {
    const short = {
      ...WHOLE_NOTE,
      measures: [
        {
          id: "short-bar",
          segments: [
            {
              id: "short",
              kind: "note",
              duration: { denominator: 4, dots: 0 },
            },
            { id: "rest", kind: "rest", duration: { denominator: 2, dots: 1 } },
          ],
        },
      ],
    };
    expect(onsetSignature(short)).toBe(onsetSignature(WHOLE_NOTE));
    expect(soundingSignature(short)).not.toBe(soundingSignature(WHOLE_NOTE));
  });
  it("ignores tempo for notation but includes it in intended timing identity", () => {
    const faster = { ...FOUR_FOUR, tempo: { pulseBpm: 120 } };
    expect(notationSignature(faster)).toBe(notationSignature(FOUR_FOUR));
    expect(onsetSignature(faster)).not.toBe(onsetSignature(FOUR_FOUR));
    expect(soundingSignature(faster)).not.toBe(soundingSignature(FOUR_FOUR));
  });
  it("normalizes default accent/articulation and object property order", () => {
    const explicit = {
      measures: FOUR_FOUR.measures.map(measure => ({
        segments: measure.segments.map(segment => ({
          duration: segment.duration,
          id: segment.id,
          kind: segment.kind,
          articulation: "ordinary",
          accent: "normal",
        })),
        id: measure.id,
      })),
      tempo: FOUR_FOUR.tempo,
      meter: FOUR_FOUR.meter,
      id: FOUR_FOUR.id,
    };
    expect(notationSignature(explicit)).toBe(notationSignature(FOUR_FOUR));
    expect(soundingSignature(explicit)).toBe(soundingSignature(FOUR_FOUR));
  });
  it("preserves a real attack accent difference", () => {
    const accented = {
      ...WHOLE_NOTE,
      measures: [
        {
          ...WHOLE_NOTE.measures[0],
          segments: WHOLE_NOTE.measures[0].segments.map(segment => ({
            ...segment,
            accent: "strong",
          })),
        },
      ],
    };
    expect(soundingSignature(accented)).not.toBe(soundingSignature(WHOLE_NOTE));
    expect(onsetSignature(accented)).toBe(onsetSignature(WHOLE_NOTE));
  });
  it.each([notationSignature, onsetSignature, soundingSignature])(
    "rejects malformed canonical material before signing",
    sign => expect(() => sign(INVALID_FIXTURES[0].input)).toThrow()
  );
});

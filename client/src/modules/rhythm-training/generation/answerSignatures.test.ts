import { describe, expect, it } from "vitest";
import { FOUR_FOUR, HALF_TIE, WHOLE_NOTE } from "../rhythm/fixtures";
import type { RhythmPattern } from "../types";
import { answerSignatures, choiceRejectionReason } from "./answerSignatures";

const SHORT_NOTE: RhythmPattern = {
  ...WHOLE_NOTE,
  id: "short",
  measures: [
    {
      id: "bar",
      segments: [
        { id: "n", kind: "note", duration: { denominator: 4, dots: 0 } },
        { id: "r", kind: "rest", duration: { denominator: 2, dots: 1 } },
      ],
    },
  ],
};

describe("choice signature and ambiguity guards", () => {
  it("rejects ID-only notation differences", () => {
    const renamed = {
      ...FOUR_FOUR,
      id: "other",
      measures: FOUR_FOUR.measures.map(bar => ({
        id: "other-bar",
        segments: bar.segments.map((segment, index) => ({
          ...segment,
          id: `other-${index}`,
        })),
      })),
    };
    expect(choiceRejectionReason(FOUR_FOUR, renamed)).toBe(
      "notation-equivalent"
    );
    expect(answerSignatures(FOUR_FOUR)).toEqual(answerSignatures(renamed));
  });
  it("rejects a tied-versus-sustained equivalent even when written notation differs", () => {
    expect(answerSignatures(WHOLE_NOTE).notation).not.toBe(
      answerSignatures(HALF_TIE).notation
    );
    expect(choiceRejectionReason(WHOLE_NOTE, HALF_TIE)).toBe(
      "sounding-equivalent"
    );
  });
  it("rejects accent-only options without relying on future output gain", () => {
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
    expect(answerSignatures(WHOLE_NOTE).visible).not.toBe(
      answerSignatures(accented).visible
    );
    expect(choiceRejectionReason(WHOLE_NOTE, accented)).toBe(
      "sounding-equivalent"
    );
  });
  it("permits duration-distinct spans but rejects them for onset-only discrimination", () => {
    expect(choiceRejectionReason(WHOLE_NOTE, SHORT_NOTE)).toBe(null);
    expect(choiceRejectionReason(WHOLE_NOTE, SHORT_NOTE, "onsets")).toBe(
      "onset-equivalent"
    );
  });
  it("rejects differently written rests with identical silence and sound", () => {
    const split = {
      ...SHORT_NOTE,
      measures: [
        {
          id: "bar",
          segments: [
            SHORT_NOTE.measures[0].segments[0],
            { id: "r1", kind: "rest", duration: { denominator: 2, dots: 0 } },
            { id: "r2", kind: "rest", duration: { denominator: 4, dots: 0 } },
          ],
        },
      ],
    };
    expect(choiceRejectionReason(SHORT_NOTE, split)).toBe(
      "sounding-equivalent"
    );
  });
  it("rejects changing tempo, meter or bar count as distractor clues", () => {
    expect(
      choiceRejectionReason(WHOLE_NOTE, {
        ...WHOLE_NOTE,
        tempo: { pulseBpm: 120 },
      })
    ).toBe("context-mismatch");
    const three = {
      ...WHOLE_NOTE,
      meter: { numerator: 3, denominator: 4 },
      measures: [
        {
          id: "m",
          segments: [
            { id: "n", kind: "note", duration: { denominator: 2, dots: 1 } },
          ],
        },
      ],
    };
    expect(choiceRejectionReason(WHOLE_NOTE, three)).toBe("context-mismatch");
    const two = {
      ...WHOLE_NOTE,
      measures: [
        WHOLE_NOTE.measures[0],
        {
          id: "m2",
          segments: [
            { id: "n2", kind: "note", duration: { denominator: 1, dots: 0 } },
          ],
        },
      ],
    };
    expect(choiceRejectionReason(WHOLE_NOTE, two)).toBe("context-mismatch");
  });
  it("rejects malformed/underfilled data rather than signing it", () => {
    expect(choiceRejectionReason(WHOLE_NOTE, null)).toBe("invalid-pattern");
    expect(
      choiceRejectionReason(WHOLE_NOTE, {
        ...WHOLE_NOTE,
        measures: [{ id: "m", segments: [] }],
      })
    ).toBe("invalid-pattern");
    expect(() => answerSignatures(null)).toThrow();
  });
  it("freezes answer signatures and returns deterministic representations", () => {
    expect(Object.isFrozen(answerSignatures(FOUR_FOUR))).toBe(true);
    expect(answerSignatures(FOUR_FOUR)).toEqual(answerSignatures(FOUR_FOUR));
  });
  it("rejects an unsupported discrimination policy explicitly", () =>
    expect(() =>
      choiceRejectionReason(WHOLE_NOTE, SHORT_NOTE, "unknown" as never)
    ).toThrow(RangeError));
});

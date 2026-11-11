import { describe, expect, it } from "vitest";
import { FOUR_FOUR, HALF_TIE, WHOLE_NOTE } from "../rhythm/fixtures";
import { validateRhythmPattern } from "../rhythm/validate";
import type { RhythmPattern } from "../types";
import { notationSignature } from "../rhythm/signatures";
import { choiceRejectionReason } from "./answerSignatures";
import {
  generateRhythmChoices,
  InsufficientDistinctChoicesError,
  selectRhythmChoices,
} from "./choices";
import { assertLevelConstraints } from "./generator";

const QUARTERS: RhythmPattern = {
  ...WHOLE_NOTE,
  id: "quarters",
  measures: [
    {
      id: "m",
      segments: Array.from({ length: 4 }, (_, index) => ({
        id: `q${index}`,
        kind: "note",
        duration: { denominator: 4, dots: 0 },
      })),
    },
  ],
};
const HALVES: RhythmPattern = {
  ...WHOLE_NOTE,
  id: "halves",
  measures: [
    {
      id: "m",
      segments: Array.from({ length: 2 }, (_, index) => ({
        id: `h${index}`,
        kind: "note",
        duration: { denominator: 2, dots: 0 },
      })),
    },
  ],
};

describe("bounded deterministic choice data", () => {
  it("skips invalid and sounding-equivalent distractors and selects four distinct patterns", () => {
    const result = selectRhythmChoices(
      WHOLE_NOTE,
      [null, HALF_TIE, WHOLE_NOTE, QUARTERS, HALVES, FOUR_FOUR],
      { seed: "selection", count: 4 }
    );
    expect(result.choices).toHaveLength(4);
    expect(result.evidence.rejectedCandidates).toMatchObject({
      "invalid-pattern": 1,
      "sounding-equivalent": 1,
      "notation-equivalent": 1,
    });
    expect(
      result.choices.filter(choice => choice.id === result.correctOptionId)
    ).toHaveLength(1);
    expect(result.correctCanonicalIdentity).toBe(notationSignature(result.target));
    expect(
      result.choices.find(
        choice => choice.canonicalIdentity === result.correctCanonicalIdentity
      )?.pattern
    ).toEqual(result.target);
    expect(
      result.choices.find(choice => choice.id === result.correctOptionId)!
        .pattern
    ).toEqual(result.target);
    for (let a = 0; a < result.choices.length; a++)
      for (let b = a + 1; b < result.choices.length; b++)
        expect(
          choiceRejectionReason(
            result.choices[a].pattern,
            result.choices[b].pattern
          )
        ).toBe(null);
    expect(result).toEqual(
      selectRhythmChoices(
        WHOLE_NOTE,
        [null, HALF_TIE, WHOLE_NOTE, QUARTERS, HALVES, FOUR_FOUR],
        { seed: "selection", count: 4 }
      )
    );
  });
  it("throws a structured finite-pool failure instead of padding duplicate answers", () => {
    expect(() =>
      selectRhythmChoices(WHOLE_NOTE, [WHOLE_NOTE, HALF_TIE], {
        seed: "insufficient",
        count: 4,
      })
    ).toThrow(InsufficientDistinctChoicesError);
    try {
      selectRhythmChoices(WHOLE_NOTE, [WHOLE_NOTE, HALF_TIE], {
        seed: "insufficient",
        count: 4,
      });
    } catch (error) {
      expect(error).toMatchObject({ requested: 4, available: 1, attempts: 2 });
    }
  });
  it("shuffles deterministically without always placing the target first", () => {
    const firstIndices = new Set(
      Array.from({ length: 20 }, (_, index) => {
        const result = selectRhythmChoices(
          WHOLE_NOTE,
          [QUARTERS, HALVES, FOUR_FOUR],
          { seed: `order-${index}` }
        );
        return result.choices.findIndex(
          choice => choice.id === result.correctOptionId
        );
      })
    );
    expect(firstIndices.size).toBeGreaterThan(1);
  });
  it.each([0, 1, 5, Number.NaN])("rejects unsupported choice count%s", count =>
    expect(() =>
      selectRhythmChoices(WHOLE_NOTE, [], {
        seed: "count",
        count: count as never,
      })
    ).toThrow(RangeError)
  );
  it("rejects invalid target and seed before constructing answers", () => {
    expect(() => selectRhythmChoices(null, [], { seed: "invalid" })).toThrow();
    expect(() => selectRhythmChoices(WHOLE_NOTE, [], { seed: "" })).toThrow();
    expect(() => generateRhythmChoices({ level: 1, seed: "" })).toThrow();
  });
  it.each([1, 2, 3, 4, 5, 6, "bonus"] as const)(
    "generates unique valid deterministic choices at track%s",
    level => {
      for (let seed = 0; seed < 10; seed++) {
        const config = { level, seed: `choice-matrix-${level}-${seed}` };
        const result = generateRhythmChoices(config);
        expect(result).toEqual(generateRhythmChoices(config));
        expect(result.choices).toHaveLength(4);
        expect(result.evidence.attemptedCandidates).toBeLessThanOrEqual(256);
        const fixed = {
          ...config,
          meter: result.target.meter,
          pulseBpm: result.target.tempo.pulseBpm,
          bars: result.target.measures.length as 1 | 2,
        };
        for (const choice of result.choices) {
          expect(validateRhythmPattern(choice.pattern).valid).toBe(true);
          expect(() =>
            assertLevelConstraints(choice.pattern, fixed)
          ).not.toThrow();
        }
        for (let a = 0; a < result.choices.length; a++)
          for (let b = a + 1; b < result.choices.length; b++)
            expect(
              choiceRejectionReason(
                result.choices[a].pattern,
                result.choices[b].pattern
              )
            ).toBe(null);
        expect(Object.isFrozen(result.choices)).toBe(true);
        expect(new Set(result.choices.map(choice => choice.id)).size).toBe(4);
        expect(new Set(result.choices.map(choice => choice.canonicalIdentity)).size).toBe(4);
        expect(result.choices.some(choice => choice.canonicalIdentity === result.correctCanonicalIdentity)).toBe(true);
      }
    }
  );
  it("uses the stricter onset policy when requested", () => {
    expect(() =>
      selectRhythmChoices(WHOLE_NOTE, [HALF_TIE], {
        seed: "onsets",
        count: 2,
        discrimination: "onsets",
      })
    ).toThrow(InsufficientDistinctChoicesError);
    const result = selectRhythmChoices(WHOLE_NOTE, [QUARTERS], {
      seed: "onsets",
      count: 2,
      discrimination: "onsets",
    });
    expect(result.choices).toHaveLength(2);
  });
});

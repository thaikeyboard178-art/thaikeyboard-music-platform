import { describe, expect, it } from "vitest";
import { LEVEL_POLICIES } from "./levels";

describe("configured rhythm level policies", () => {
  it("contains exactly eight immutable curriculum policies", () => {
    expect(Object.keys(LEVEL_POLICIES)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(Object.isFrozen(LEVEL_POLICIES)).toBe(true);
    for (const policy of Object.values(LEVEL_POLICIES)) {
      expect(Object.isFrozen(policy)).toBe(true);
      expect(policy.allowedMeters.length).toBeGreaterThan(0);
      expect(policy.durations.length).toBeGreaterThan(0);
      expect(policy.tempo.simple.min).toBeLessThanOrEqual(
        policy.tempo.simple.max
      );
    }
  });

  it("keeps the introductory vocabulary and meter restrictions exact", () => {
    expect(LEVEL_POLICIES[1].allowedMeters).toEqual([
      { numerator: 4, denominator: 4 },
    ]);
    expect(LEVEL_POLICIES[1].durations).toEqual([
      { denominator: 1, dots: 0 },
      { denominator: 2, dots: 0 },
      { denominator: 4, dots: 0 },
    ]);
    expect(LEVEL_POLICIES[1].allowDots).toBe(false);
    expect(LEVEL_POLICIES[1].allowTies).toBe(false);
    expect(LEVEL_POLICIES[2].allowedMeters).toHaveLength(3);
    expect(LEVEL_POLICIES[3].maxRestsPerBar).toBeGreaterThan(
      LEVEL_POLICIES[2].maxRestsPerBar
    );
  });

  it("records the dot/tie, sixteenth, compound, syncopation, and integration gates", () => {
    expect(LEVEL_POLICIES[4].supportedFocus).toEqual([
      "dots",
      "ties",
      "combined",
    ]);
    expect(LEVEL_POLICIES[5].allowSixteenths).toBe(true);
    expect(LEVEL_POLICIES[5].allowCrossBarTies).toBe(false);
    expect(LEVEL_POLICIES[6].allowedMeters).toEqual([
      { numerator: 6, denominator: 8 },
    ]);
    expect(LEVEL_POLICIES[7].maxSyncopatedOnsetsPerBar).toBe(1);
    expect(LEVEL_POLICIES[8].maxDifficultySources).toBe(2);
    expect(LEVEL_POLICIES[6].tempo.simple.pulse).toBe("dotted-quarter");
    expect(LEVEL_POLICIES[8].tempo.compound?.max).toBe(72);
  });
});

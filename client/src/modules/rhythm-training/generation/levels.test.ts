import { describe, expect, it } from "vitest";
import { BONUS_POLICY, LEVEL_POLICIES } from "./levels";

describe("curriculum-aligned immutable rhythm policies", () => {
  it("contains exactly six required level policies and one separate Bonus policy", () => {
    expect(Object.keys(LEVEL_POLICIES)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(Object.isFrozen(LEVEL_POLICIES)).toBe(true);
    expect(Object.isFrozen(BONUS_POLICY)).toBe(true);
    for (const policy of [...Object.values(LEVEL_POLICIES), BONUS_POLICY]) {
      expect(Object.isFrozen(policy)).toBe(true);
      expect(policy.allowedMeters.length).toBeGreaterThan(0);
      expect(policy.durations.length).toBeGreaterThan(0);
      expect(policy.tempo.simple.min).toBeLessThanOrEqual(
        policy.tempo.simple.max
      );
      for (const tempo of Object.values(policy.tempo).filter(Boolean))
        expect(tempo).toMatchObject({ min: 30, max: 300 });
    }
  });

  it("keeps Level 1 scaffolded to 4/4 and quarter-only rests", () => {
    expect(LEVEL_POLICIES[1].allowedMeters).toEqual([
      { numerator: 4, denominator: 4 },
    ]);
    expect(LEVEL_POLICIES[1].durations).toEqual([
      { denominator: 1, dots: 0 },
      { denominator: 2, dots: 0 },
      { denominator: 4, dots: 0 },
    ]);
    expect(LEVEL_POLICIES[1].restDurations).toEqual([
      { denominator: 4, dots: 0 },
    ]);
    expect(LEVEL_POLICIES[1].allowDots).toBe(false);
    expect(LEVEL_POLICIES[1].allowTies).toBe(false);
    expect(LEVEL_POLICIES[2].allowedMeters).toEqual(
      LEVEL_POLICIES[1].allowedMeters
    );
    expect(LEVEL_POLICIES[2].restDurations).toContainEqual({
      denominator: 8,
      dots: 0,
    });
  });

  it("places dots, ties, and their combinations in Level 3 and introduces sixteenths in Level 4", () => {
    expect(LEVEL_POLICIES[3].allowedMeters).toEqual([
      { numerator: 2, denominator: 4 },
      { numerator: 3, denominator: 4 },
      { numerator: 4, denominator: 4 },
    ]);
    expect(LEVEL_POLICIES[3].supportedFocus).toEqual([
      "dots",
      "ties",
      "combined",
    ]);
    expect(LEVEL_POLICIES[3].allowDots).toBe(true);
    expect(LEVEL_POLICIES[3].allowTies).toBe(true);
    expect(LEVEL_POLICIES[3].allowSixteenths).toBe(false);
    expect(LEVEL_POLICIES[3].durations).toContainEqual({
      denominator: 4,
      dots: 1,
    });
    expect(LEVEL_POLICIES[3].maxRestsPerBar).toBeGreaterThan(
      LEVEL_POLICIES[2].maxRestsPerBar
    );
    expect(LEVEL_POLICIES[4].supportedFocus).toEqual([
      "dots",
      "ties",
      "combined",
      "sixteenths",
    ]);
    expect(LEVEL_POLICIES[4].defaultFocus).toBe("sixteenths");
    expect(LEVEL_POLICIES[4].allowSixteenths).toBe(true);
    expect(LEVEL_POLICIES[4].durations).toContainEqual({
      denominator: 16,
      dots: 0,
    });
    expect(LEVEL_POLICIES[4].allowSyncopation).toBe(false);
  });

  it("keeps controlled multi-duration combinations and syncopation in Level 5", () => {
    expect(LEVEL_POLICIES[5].allowSixteenths).toBe(true);
    expect(LEVEL_POLICIES[5].allowSyncopation).toBe(true);
    expect(LEVEL_POLICIES[5].defaultFocus).toBe("integrated");
    expect(LEVEL_POLICIES[5].supportedFocus).toContain("integrated");
    expect(LEVEL_POLICIES[5].durations).toContainEqual({
      denominator: 8,
      dots: 1,
    });
    expect(LEVEL_POLICIES[5].maxSyncopatedOnsetsPerBar).toBe(1);
    expect(LEVEL_POLICIES[5].maxDifficultySources).toBe(2);
    expect(LEVEL_POLICIES[5].allowCrossBarTies).toBe(false);
  });

  it("supports all three Level 6 meters with eighth-note pulses and independent groups", () => {
    expect(LEVEL_POLICIES[6].allowedMeters).toEqual([
      { numerator: 3, denominator: 8 },
      { numerator: 6, denominator: 8 },
      { numerator: 9, denominator: 8 },
    ]);
    expect(LEVEL_POLICIES[6].tempo.eighth?.pulse).toBe("eighth");
    expect(LEVEL_POLICIES[6].tempo.compound?.pulse).toBe("eighth");
    expect(LEVEL_POLICIES[6].allowSixteenths).toBe(false);
  });

  it("keeps Alla Breve as an optional Bonus track, never a seventh Level", () => {
    expect(BONUS_POLICY.level).toBe("bonus");
    expect(BONUS_POLICY.allowedMeters).toEqual([
      { numerator: 2, denominator: 2 },
    ]);
    expect(BONUS_POLICY.tempo.half?.pulse).toBe("half");
  });
});

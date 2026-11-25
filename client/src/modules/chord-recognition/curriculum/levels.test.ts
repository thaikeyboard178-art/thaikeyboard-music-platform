import { describe, expect, it } from "vitest";
import { eligibleQualities, LEVELS, qualitiesAtLevel } from "./levels";

const byLevel: Record<number, string[]> = {
  1: ["major", "minor"],
  2: ["diminished", "augmented"],
  3: ["sus2", "sus4"],
  4: ["dominant7", "major7", "minor7"],
  5: ["halfDiminished7", "diminished7", "minorMajor7"],
  6: ["dominant9", "major9", "minor9", "dominant11", "major11", "minor11", "dominant13", "major13", "minor13"],
};

describe("chord curriculum", () => {
  it("defines all six ordered curriculum levels", () => {
    expect(LEVELS.map(({ level }) => level)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(LEVELS.every(({ label, description }) => label.length > 0 && description.length > 0)).toBe(true);
    expect(LEVELS.every(({ label }) => !/^Level\s+\d/i.test(label))).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6] as const)("includes cumulative and selected-tier content at Level %i", (level) => {
    const eligible = eligibleQualities(level);
    expect(eligible.filter((quality) => quality.level === level).map(({ id }) => id)).toEqual(byLevel[level]);
    expect(eligible.every((quality) => quality.level <= level)).toBe(true);
    expect(qualitiesAtLevel(level).map(({ id }) => id)).toEqual(byLevel[level]);
  });

  it("does not silently use invalid levels", () => {
    expect(() => eligibleQualities(0 as never)).toThrow(RangeError);
  });
});

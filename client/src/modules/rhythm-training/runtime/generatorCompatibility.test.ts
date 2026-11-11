import { describe, expect, it } from "vitest";
import { generateRhythmPattern } from "../generation/generator";
import { validateRhythmPattern } from "../rhythm/validate";
import type { RhythmMeter } from "../types";

describe("Seven-meter exact-union generator compatibility", () => {
  it.each([
    [3, { numerator: 2, denominator: 4 }],
    [3, { numerator: 3, denominator: 4 }],
    [3, { numerator: 4, denominator: 4 }],
    [6, { numerator: 6, denominator: 8 }],
  ] as const)(
    "preserves selected meter at legacy level %s: %j",
    (level, meter) => {
      const before = JSON.stringify(meter);
      const first = generateRhythmPattern({
        level,
        meter: meter as RhythmMeter,
        seed: "exact-meter-copy",
        bars: 2,
      });
      const second = generateRhythmPattern({
        level,
        meter: meter as RhythmMeter,
        seed: "exact-meter-copy",
        bars: 2,
      });
      expect(first.meter).toEqual(meter);
      expect(first.meter).not.toBe(meter);
      expect(Object.isFrozen(first.meter)).toBe(true);
      expect(validateRhythmPattern(first).valid).toBe(true);
      expect(second).toEqual(first);
      expect(JSON.stringify(meter)).toBe(before);
    }
  );
});

import { describe, expect, it } from "vitest";

import { durationToTicks, PPQ } from "./durations";
import type { WrittenDuration } from "../types";

describe("durationToTicks", () => {
  it("exports the approved PPQ", () => {
    expect(PPQ).toBe(480);
  });

  it.each([
    [{ denominator: 1, dots: 0 }, 1920],
    [{ denominator: 2, dots: 0 }, 960],
    [{ denominator: 4, dots: 0 }, 480],
    [{ denominator: 8, dots: 0 }, 240],
    [{ denominator: 16, dots: 0 }, 120],
    [{ denominator: 2, dots: 1 }, 1440],
    [{ denominator: 4, dots: 1 }, 720],
    [{ denominator: 8, dots: 1 }, 360],
  ] as const)(
    "returns exact ticks for note and rest duration %j",
    (duration, expected) => {
      expect(durationToTicks(duration as WrittenDuration)).toBe(expected);
      expect(durationToTicks(duration as WrittenDuration)).toBe(expected);
    }
  );

  it.each([
    { denominator: 1, dots: 1 },
    { denominator: 16, dots: 1 },
    { denominator: 4, dots: 2 },
    { denominator: 0, dots: 0 },
    { denominator: 3, dots: 0 },
    { denominator: -4, dots: 0 },
    { denominator: 4.5, dots: 0 },
    { denominator: "4", dots: 0 },
    { denominator: 4, dots: "0" },
    { denominator: Number.NaN, dots: 0 },
    { denominator: Number.POSITIVE_INFINITY, dots: 0 },
    { denominator: 4, dots: -1 },
  ] as const)("rejects invalid duration %j", duration => {
    expect(() =>
      durationToTicks(duration as unknown as WrittenDuration)
    ).toThrow(RangeError);
  });

  it.each([null, undefined, "4/4", 4, [], { denominator: 4 }, { dots: 0 }])(
    "rejects malformed duration input %j",
    duration => {
      expect(() =>
        durationToTicks(duration as unknown as WrittenDuration)
      ).toThrow(RangeError);
    }
  );
});

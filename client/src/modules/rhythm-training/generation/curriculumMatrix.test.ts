import { describe, expect, it } from "vitest";
import { LEVEL_POLICIES } from "./levels";
import {
  generateRhythmPattern,
  assertLevelConstraints,
  type RhythmGenerationConfig,
} from "./generator";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";

describe("complete Phase2 curriculum configuration matrix", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8] as const)(
    "generates only canonical patterns for every compatible Level%s focus/meter/bar configuration",
    level => {
      const policy = LEVEL_POLICIES[level];
      for (const focus of policy.supportedFocus) {
        for (const meter of policy.allowedMeters) {
          if (focus === "compound" && meter.denominator !== 8) continue;
          if (
            ["syncopation", "dots", "ties", "sixteenths"].includes(focus) &&
            meter.denominator !== 4
          )
            continue;
          for (const bars of [1, 2] as const) {
            for (let index = 0; index < 8; index++) {
              const input: RhythmGenerationConfig = {
                seed: `curriculum/${level}/${focus}/${meter.numerator}-${meter.denominator}/${bars}/${index}`,
                level,
                meter,
                bars,
                ...(focus === "integrated" ? {} : { focus }),
                pulseBpm:
                  meter.denominator === 8
                    ? policy.tempo.compound!.min
                    : policy.tempo.simple.min,
              };
              const pattern = generateRhythmPattern(input);
              expect(() =>
                assertLevelConstraints(pattern, input)
              ).not.toThrow();
              const timeline = deriveRhythmTimeline(pattern);
              expect(timeline.totalTicks).toBe(
                timeline.meter.measureTicks * bars
              );
              expect(timeline.onsets.length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  );
});

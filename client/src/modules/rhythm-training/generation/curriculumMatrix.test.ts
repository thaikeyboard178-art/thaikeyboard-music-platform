import { describe, expect, it } from "vitest";
import { getRhythmCurriculum } from "../curriculum/curriculum";
import { policyForLevel } from "./levels";
import {
  generateRhythmPattern,
  assertLevelConstraints,
  type RhythmGenerationConfig,
} from "./generator";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { getDefaultPulseBpm } from "../rhythm/meters";
import type { RhythmTrack } from "../types";

const tracks: readonly RhythmTrack[] = [1, 2, 3, 4, 5, 6, "bonus"];

describe("complete curriculum generator matrix", () => {
  it("generates only canonical patterns for each supported track/focus/meter/bar configuration", () => {
    expect(getRhythmCurriculum().map(unit => unit.track)).toEqual(tracks);
    for (const track of tracks) {
      const policy = policyForLevel(track);
      for (const focus of policy.supportedFocus) {
        for (const meter of policy.allowedMeters) {
          if (
            focus === "compound" &&
            (meter.numerator === 3 || meter.denominator !== 8)
          )
            continue;
          if (focus === "syncopation" && meter.denominator !== 4) continue;
          if (
            ["dots", "ties", "sixteenths"].includes(focus) &&
            meter.denominator !== (track === 6 ? 8 : 4)
          )
            continue;
          for (const bars of [1, 2] as const) {
            for (let index = 0; index < 5; index += 1) {
              const input: RhythmGenerationConfig = {
                seed: `curriculum/${String(track)}/${focus}/${meter.numerator}-${meter.denominator}/${bars}/${index}`,
                level: track,
                meter,
                bars,
                focus,
                pulseBpm: getDefaultPulseBpm(meter),
              };
              if (
                track === 6 &&
                meter.numerator === 3 &&
                meter.denominator === 8 &&
                (focus === "dots" || focus === "combined")
              ) {
                expect(() => generateRhythmPattern(input)).toThrow(
                  /3\/8.*fills the measure.*required rest/i
                );
                continue;
              }
              if (
                (track === 3 || track === 4) &&
                focus === "combined" &&
                meter.numerator === 2 &&
                bars === 1
              ) {
                expect(() => generateRhythmPattern(input)).toThrow(
                  /single 2\/4 measure.*required rest/i
                );
                if (index === 0) {
                  for (const feasibleFocus of ["dots", "ties"] as const) {
                    const feasibleInput = { ...input, focus: feasibleFocus };
                    const feasiblePattern = generateRhythmPattern(feasibleInput);
                    expect(feasiblePattern.meter).toEqual(meter);
                    expect(() =>
                      assertLevelConstraints(feasiblePattern, feasibleInput)
                    ).not.toThrow();
                  }
                }
                continue;
              }
              if (
                track === 5 &&
                focus === "quarter-triplets" &&
                meter.numerator === 2
              ) {
                expect(() => generateRhythmPattern(input)).toThrow(
                  /fill a 2\/4 measure exactly.*1–2 rests/i
                );
                continue;
              }
              let pattern;
              try {
                pattern = generateRhythmPattern(input);
              } catch (error) {
                throw new Error(
                  `Generation failed for ${JSON.stringify(input)}: ${String(error)}`
                );
              }
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
  });
});

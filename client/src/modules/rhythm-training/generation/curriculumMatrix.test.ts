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
          // A 3/8 bar has only 720 ticks: its dotted-quarter value fills the
          // entire bar, so there is no room for a separate tie plus dot event.
          if (track === 6 && focus === "combined" && meter.numerator === 3)
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

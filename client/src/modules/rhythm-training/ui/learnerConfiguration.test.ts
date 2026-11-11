import { describe, expect, it } from "vitest";
import { getCurriculumUnit } from "../curriculum/curriculum";
import { policyForLevel } from "../generation/levels";
import { generateTapRhythmExercise } from "../exercises/tapRhythm";
import {
  defaultTapMeter,
  getTapFocuses,
  getTapSections,
  getTapTempoBand,
  groupingDescription,
  meterKey,
  pulseDescription,
} from "./learnerConfiguration";

describe("Phase5 learner configuration reads approved runtime gates", () => {
  it("has no Tap in Levels1/2, approved sections in3–6 and Practice-only Bonus", () => {
    expect(getTapSections(1)).toEqual([]);
    expect(getTapSections(2)).toEqual([]);
    for (const track of [3, 4, 5, 6] as const)
      expect(getTapSections(track)).toEqual([
        "lessons",
        "practice",
        "assessment",
      ]);
    expect(getTapSections("bonus")).toEqual(["practice"]);
    expect(getCurriculumUnit(6).assessmentAllocation).toBe(
      "pending-technical-specification"
    );
  });
  it("describes all seven meter pulses accurately without confusing3/8 with compound6/8/9/8", () => {
    expect(pulseDescription({ numerator: 3, denominator: 8 })).toContain(
      "3 phách chính"
    );
    expect(pulseDescription({ numerator: 6, denominator: 8 })).toContain(
      "2 phách phức"
    );
    expect(pulseDescription({ numerator: 9, denominator: 8 })).toContain(
      "3 phách phức"
    );
    expect(pulseDescription({ numerator: 2, denominator: 2 })).toContain(
      "nốt trắng"
    );
    expect(groupingDescription({ numerator: 3, denominator: 8 })).toContain(
      "độc lập"
    );
    expect(groupingDescription({ numerator: 6, denominator: 8 })).toContain(
      "3 + 3"
    );
    expect(groupingDescription({ numerator: 9, denominator: 8 })).toContain(
      "3 + 3 + 3"
    );
    for (const numerator of [2, 3, 4] as const)
      expect(pulseDescription({ numerator, denominator: 4 })).toContain(
        `${numerator} phách chính`
      );
  });
  it("offers only existing tempo-band endpoints and excludes already invalid3/8 compound/combined focus", () => {
    expect(meterKey(defaultTapMeter("bonus"))).toBe("2/2");
    expect(getTapFocuses(6, { numerator: 3, denominator: 8 })).not.toContain(
      "compound"
    );
    expect(getTapFocuses(6, { numerator: 3, denominator: 8 })).not.toContain(
      "combined"
    );
    expect(getTapFocuses(6, { numerator: 6, denominator: 8 })).toContain(
      "combined"
    );
    expect(getTapTempoBand(6, { numerator: 6, denominator: 8 })).toBe(
      policyForLevel(6).tempo.compound
    );
    expect(getTapTempoBand("bonus", { numerator: 2, denominator: 2 })).toBe(
      policyForLevel("bonus").tempo.half
    );
  });
  it("executes the real generator for every exposed track/meter/focus/bar endpoint combination", () => {
    for (const track of [3, 4, 5, 6, "bonus"] as const)
      for (const meter of getCurriculumUnit(track).allowedMeters)
        for (const focus of getTapFocuses(track, meter))
          for (const bars of [1, 2] as const)
            for (const pulseBpm of [
              getTapTempoBand(track, meter).min,
              getTapTempoBand(track, meter).max,
            ]) {
              const exercise = generateTapRhythmExercise({
                track,
                section: "practice",
                seed: `ui-${track}-${meterKey(meter)}-${focus}-${bars}-${pulseBpm}`,
                meter,
                focus,
                bars,
                pulseBpm,
              });
              expect(exercise.track).toBe(track);
              expect(exercise.section).toBe("practice");
              expect(exercise.pattern.meter).toEqual(meter);
              expect(exercise.pattern.measures).toHaveLength(bars);
            }
  });
});

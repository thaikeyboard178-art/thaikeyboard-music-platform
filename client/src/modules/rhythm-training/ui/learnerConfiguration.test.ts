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
  LEARNER_TRACK_NOTES,
  meterKey,
  pulseDescription,
  TRACK_LABELS,
} from "./learnerConfiguration";

describe("Phase5 learner configuration reads approved runtime gates", () => {
  it("offers Tap Practice/Assessment in Levels1/2, approved sections in3–6 and optional Bonus", () => {
    expect(getTapSections(1)).toEqual(["practice", "assessment"]);
    expect(getTapSections(2)).toEqual(["practice", "assessment"]);
    expect(getCurriculumUnit(1).exerciseKinds.lessons).not.toContain(
      "tap-rhythm"
    );
    expect(getCurriculumUnit(2).exerciseKinds.lessons).not.toContain(
      "tap-rhythm"
    );
    for (const track of [3, 4, 5, 6] as const)
      expect(getTapSections(track)).toEqual([
        "lessons",
        "practice",
        "assessment",
      ]);
    expect(getTapSections("bonus")).toEqual(["practice", "assessment"]);
    expect(getCurriculumUnit(6).assessmentAllocation).toBe(
      "pending-technical-specification"
    );
  });
  it("describes all seven meter pulses accurately without confusing3/8 with compound6/8/9/8", () => {
    expect(pulseDescription({ numerator: 3, denominator: 8 })).toContain(
      "3 phách mỗi ô · mỗi phách = nốt móc đơn"
    );
    expect(pulseDescription({ numerator: 6, denominator: 8 })).toContain(
      "6 phách mỗi ô · mỗi phách = nốt móc đơn"
    );
    expect(pulseDescription({ numerator: 9, denominator: 8 })).toContain(
      "9 phách mỗi ô · mỗi phách = nốt móc đơn"
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
        `${numerator} phách mỗi ô`
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
    expect(getTapTempoBand(6, { numerator: 6, denominator: 8 })).toEqual({
      min: 30,
      max: 300,
      pulse: "eighth",
    });
    expect(getTapTempoBand("bonus", { numerator: 2, denominator: 2 })).toEqual({
      min: 30,
      max: 300,
      pulse: "half",
    });
  });
  it("shows the remapped Level 3–5 learner scope and available Tap focuses", () => {
    expect(TRACK_LABELS[3]).toContain("chấm dôi");
    expect(TRACK_LABELS[3]).toContain("nối");
    expect(TRACK_LABELS[4]).toContain("Móc kép");
    expect(TRACK_LABELS[5]).toContain("phức tạp");
    expect(LEARNER_TRACK_NOTES[3]).toContain("2/4, 3/4 và 4/4");
    expect(LEARNER_TRACK_NOTES[4]).toContain("móc kép");
    expect(LEARNER_TRACK_NOTES[5]).toContain("đảo phách");
    expect(getTapFocuses(3, { numerator: 4, denominator: 4 })).toEqual([
      "dots",
      "ties",
      "combined",
    ]);
    expect(getTapFocuses(4, { numerator: 4, denominator: 4 })).toEqual([
      "dots",
      "ties",
      "combined",
      "sixteenths",
      "snap",
      "sandwich",
      "integrated",
    ]);
    expect(getTapFocuses(4, { numerator: 4, denominator: 4 })).not.toContain(
      "syncopation"
    );
  });
  it("offers real triplets only in Level 5 and excludes the impossible quarter-triplet plus rest in 2/4", () => {
    expect(getTapFocuses(4, { numerator: 4, denominator: 4 })).not.toContain(
      "quarter-triplets"
    );
    expect(getTapFocuses(5, { numerator: 4, denominator: 4 })).toContain(
      "quarter-triplets"
    );
    expect(getTapFocuses(5, { numerator: 4, denominator: 4 })).toContain(
      "eighth-triplets"
    );
    expect(getTapFocuses(5, { numerator: 2, denominator: 4 })).not.toContain(
      "quarter-triplets"
    );
    expect(getTapFocuses(5, { numerator: 2, denominator: 4 })).toContain(
      "eighth-triplets"
    );
    expect(LEARNER_TRACK_NOTES[5]).toContain("2/4");
    expect(getTapFocuses(3, { numerator: 2, denominator: 4 })).not.toContain(
      "combined"
    );
    expect(getTapFocuses(3, { numerator: 3, denominator: 4 })).toContain(
      "combined"
    );
    expect(getTapFocuses(4, { numerator: 2, denominator: 4 })).not.toContain(
      "combined"
    );
    expect(LEARNER_TRACK_NOTES[3]).toContain("dấu lặng");
    expect(getTapFocuses(6, { numerator: 3, denominator: 8 })).toEqual([
      "basic",
      "ties",
    ]);
    expect(getTapFocuses(6, { numerator: 6, denominator: 8 })).toContain(
      "dots"
    );
    expect(getTapFocuses(6, { numerator: 9, denominator: 8 })).toContain(
      "combined"
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

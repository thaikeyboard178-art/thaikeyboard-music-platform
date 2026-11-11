import { describe, expect, it } from "vitest";
import {
  getCurriculumUnit,
  getRhythmCurriculum,
  isExerciseKindAllowed,
  requireExerciseKindAllowed,
} from "./curriculum";

describe("Rhythm Training V1 runtime curriculum", () => {
  it("contains exactly Levels 1–6 followed by one optional Bonus track", () => {
    const curriculum = getRhythmCurriculum();
    expect(curriculum.map(unit => unit.track)).toEqual([
      1, 2, 3, 4, 5, 6, "bonus",
    ]);
    expect(curriculum.every(unit => unit.lessons.length > 0)).toBe(true);
    expect(Object.isFrozen(curriculum)).toBe(true);
  });

  it("keeps Levels 1 and 2 on the 4/4 lesson/practice/assessment scaffold", () => {
    for (const track of [1, 2] as const) {
      const unit = getCurriculumUnit(track);
      expect(unit.allowedMeters).toEqual([{ numerator: 4, denominator: 4 }]);
      expect(unit.exerciseKinds.lessons).toEqual([
        "multiple-choice",
        "listen-identify",
      ]);
      expect(unit.exerciseKinds.practice).toEqual(unit.exerciseKinds.lessons);
      expect(unit.exerciseKinds.assessment).toEqual(unit.exerciseKinds.lessons);
      expect(unit.exerciseKinds.practice).not.toContain("tap-rhythm");
      expect(unit.exerciseKinds.practice).not.toContain("count-beat");
    }
    expect(getCurriculumUnit(1).allowedRestDurations).toEqual([
      { denominator: 4, dots: 0 },
    ]);
    expect(getCurriculumUnit(2).allowedRestDurations).toContainEqual({
      denominator: 8,
      dots: 0,
    });
  });

  it("starts Tap Rhythm and Count the Beat placement at Level 3, not earlier", () => {
    for (const kind of ["tap-rhythm", "count-beat"] as const) {
      expect(isExerciseKindAllowed(1, "practice", kind)).toBe(false);
      expect(isExerciseKindAllowed(2, "practice", kind)).toBe(false);
      expect(isExerciseKindAllowed(3, "practice", kind)).toBe(true);
      expect(() => requireExerciseKindAllowed(2, "practice", kind)).toThrow(RangeError);
    }
    expect(isExerciseKindAllowed(3, "assessment", "multiple-choice")).toBe(true);
    expect(isExerciseKindAllowed(3, "assessment", "listen-identify")).toBe(true);
  });

  it("uses the three approved Level 6 meters and all four assessment kinds with quota pending", () => {
    const unit = getCurriculumUnit(6);
    expect(unit.allowedMeters).toEqual([
      { numerator: 3, denominator: 8 },
      { numerator: 6, denominator: 8 },
      { numerator: 9, denominator: 8 },
    ]);
    expect(unit.requiredAssessmentMeters).toEqual(unit.allowedMeters);
    expect(unit.exerciseKinds.assessment).toEqual([
      "multiple-choice",
      "tap-rhythm",
      "listen-identify",
      "count-beat",
    ]);
    expect(unit.requiredAssessmentKinds).toEqual(unit.exerciseKinds.assessment);
    expect(unit.assessmentAllocation).toBe("pending-technical-specification");
  });

  it("keeps 2/2 as optional Bonus and Tap Rhythm optional there", () => {
    const bonus = getCurriculumUnit("bonus");
    expect(bonus.optional).toBe(true);
    expect(bonus.allowedMeters).toEqual([{ numerator: 2, denominator: 2 }]);
    expect(bonus.optionalExerciseKinds).toEqual(["tap-rhythm"]);
    expect(isExerciseKindAllowed("bonus", "practice", "tap-rhythm")).toBe(true);
    expect(isExerciseKindAllowed("bonus", "assessment", "tap-rhythm")).toBe(false);
  });
});

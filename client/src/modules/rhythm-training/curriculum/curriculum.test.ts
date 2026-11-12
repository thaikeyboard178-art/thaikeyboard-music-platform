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
      1,
      2,
      3,
      4,
      5,
      6,
      "bonus",
    ]);
    expect(curriculum.every(unit => unit.lessons.length > 0)).toBe(true);
    expect(Object.isFrozen(curriculum)).toBe(true);
  });

  it("keeps Levels 1 and 2 on the 4/4 scaffold and enables Tap outside legacy lessons", () => {
    for (const track of [1, 2] as const) {
      const unit = getCurriculumUnit(track);
      expect(unit.allowedMeters).toEqual([{ numerator: 4, denominator: 4 }]);
      expect(unit.exerciseKinds.lessons).toEqual([
        "multiple-choice",
        "listen-identify",
      ]);
      expect(unit.exerciseKinds.practice).toEqual([
        ...unit.exerciseKinds.lessons,
        "tap-rhythm",
      ]);
      expect(unit.exerciseKinds.assessment).toEqual(
        unit.exerciseKinds.practice
      );
      expect(unit.exerciseKinds.lessons).not.toContain("tap-rhythm");
      expect(unit.exerciseKinds.practice).not.toContain("count-beat");
      expect(unit.exerciseKinds.assessment).not.toContain("count-beat");
    }
    expect(getCurriculumUnit(1).allowedDurations).toEqual([
      { denominator: 1, dots: 0 },
      { denominator: 2, dots: 0 },
      { denominator: 4, dots: 0 },
    ]);
    expect(getCurriculumUnit(1).allowedRestDurations).toEqual([
      { denominator: 4, dots: 0 },
    ]);
    expect(getCurriculumUnit(2).allowedDurations).toEqual([
      { denominator: 1, dots: 0 },
      { denominator: 2, dots: 0 },
      { denominator: 4, dots: 0 },
      { denominator: 8, dots: 0 },
    ]);
    expect(getCurriculumUnit(2).allowedRestDurations).toContainEqual({
      denominator: 8,
      dots: 0,
    });
  });

  it("allows Tap practice and graded assessment at every level while Count the Beat still starts at Level 3", () => {
    for (const track of [1, 2, 3, 4, 5, 6, "bonus"] as const) {
      expect(isExerciseKindAllowed(track, "practice", "tap-rhythm")).toBe(true);
      expect(isExerciseKindAllowed(track, "assessment", "tap-rhythm")).toBe(
        true
      );
      expect(() =>
        requireExerciseKindAllowed(track, "practice", "tap-rhythm")
      ).not.toThrow();
      expect(() =>
        requireExerciseKindAllowed(track, "assessment", "tap-rhythm")
      ).not.toThrow();
      expect(isExerciseKindAllowed(track, "practice", "multiple-choice")).toBe(
        true
      );
      expect(
        isExerciseKindAllowed(track, "assessment", "multiple-choice")
      ).toBe(true);
      expect(
        getCurriculumUnit(track).multipleChoiceFocuses.length
      ).toBeGreaterThan(0);
    }
    for (const track of [1, 2] as const) {
      expect(isExerciseKindAllowed(track, "practice", "count-beat")).toBe(
        false
      );
      expect(isExerciseKindAllowed(track, "assessment", "count-beat")).toBe(
        false
      );
      expect(() =>
        requireExerciseKindAllowed(track, "practice", "count-beat")
      ).toThrow(RangeError);
    }
    expect(isExerciseKindAllowed(3, "practice", "count-beat")).toBe(true);
    expect(isExerciseKindAllowed(3, "assessment", "count-beat")).toBe(true);
  });

  it("maps Multiple Choice focuses to the remapped level content independently of Tap placement", () => {
    const expectedFocuses = [
      [1, ["pattern", "note-rest", "duration"]],
      [2, ["pattern", "note-rest", "duration"]],
      [
        3,
        ["pattern", "note-rest", "duration", "meter", "grouping", "dot", "tie"],
      ],
      [
        4,
        ["pattern", "note-rest", "duration", "meter", "grouping", "dot", "tie"],
      ],
      [
        5,
        ["pattern", "note-rest", "duration", "meter", "grouping", "dot", "tie"],
      ],
      [
        6,
        ["pattern", "note-rest", "duration", "meter", "grouping", "dot", "tie"],
      ],
      ["bonus", ["pattern", "note-rest", "duration", "meter", "grouping"]],
    ] as const;

    for (const [track, focuses] of expectedFocuses) {
      const unit = getCurriculumUnit(track);
      expect(unit.multipleChoiceFocuses).toEqual(focuses);
      expect(isExerciseKindAllowed(track, "practice", "multiple-choice")).toBe(
        true
      );
      expect(
        isExerciseKindAllowed(track, "assessment", "multiple-choice")
      ).toBe(true);
    }
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

  it("keeps 2/2 Bonus optional and Tap available without making it a required assessment kind", () => {
    const bonus = getCurriculumUnit("bonus");
    expect(bonus.optional).toBe(true);
    expect(bonus.allowedMeters).toEqual([{ numerator: 2, denominator: 2 }]);
    expect(bonus.optionalExerciseKinds).toEqual(["tap-rhythm"]);
    expect(bonus.exerciseKinds.practice).not.toContain("tap-rhythm");
    expect(isExerciseKindAllowed("bonus", "practice", "tap-rhythm")).toBe(true);
    expect(isExerciseKindAllowed("bonus", "assessment", "tap-rhythm")).toBe(
      true
    );
    expect(bonus.requiredAssessmentKinds).not.toContain("tap-rhythm");
    expect(bonus.requiredAssessmentKinds).toEqual([
      "multiple-choice",
      "listen-identify",
      "count-beat",
    ]);
  });
});

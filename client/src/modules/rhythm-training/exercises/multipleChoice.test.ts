import { describe, expect, it } from "vitest";
import {
  evaluateMultipleChoice,
  generateMultipleChoiceExercise,
  type MultipleChoiceExercise,
} from "./multipleChoice";
import { requireValidRhythmPattern } from "../rhythm/validate";

describe("curriculum-aware Multiple Choice exercise runtime", () => {
  it("generates Multiple Choice for each curriculum-placed section", () => {
    const tracks = [1, 2, 3, 4, 5, 6, "bonus"] as const;
    const sections = ["lessons", "practice", "assessment"] as const;
    for (const track of tracks) {
      for (const section of sections) {
        const exercise = generateMultipleChoiceExercise({
          track,
          section,
          seed: `mc-section/${String(track)}/${section}`,
          focus: "duration",
        });
        expect(exercise.section).toBe(section);
        expect(exercise.kind).toBe("multiple-choice");
      }
    }
  });

  it.each([
    [1, "note-rest"],
    [1, "duration"],
    [3, "meter"],
    [3, "grouping"],
    [4, "dot"],
    [4, "tie"],
    [6, "grouping"],
    ["bonus", "duration"],
  ] as const)("generates and grades track%s %s questions", (track, focus) => {
    const exercise = generateMultipleChoiceExercise({
      track,
      seed: `mc/${String(track)}/${focus}`,
      focus,
    });
    expect(exercise.kind).toBe("multiple-choice");
    expect(requireValidRhythmPattern(exercise.target)).toEqual(exercise.target);
    const correct = exercise.options.find(
      option => option.canonicalIdentity === exercise.correctCanonicalIdentity
    );
    expect(correct).toBeDefined();
    expect(evaluateMultipleChoice(exercise, {
      canonicalIdentity: correct!.canonicalIdentity,
    }).correct).toBe(true);
    const wrong = exercise.options.find(
      option => option.canonicalIdentity !== exercise.correctCanonicalIdentity
    );
    if (wrong) {
      expect(evaluateMultipleChoice(exercise, {
        canonicalIdentity: wrong.canonicalIdentity,
      }).correct).toBe(false);
    }
  });

  it("builds pattern options from valid distinct canonical patterns", () => {
    const exercise = generateMultipleChoiceExercise({
      track: 3,
      seed: "mc-pattern-choices",
      focus: "pattern",
      meter: { numerator: 3, denominator: 4 },
    });
    expect(exercise.options).toHaveLength(4);
    expect(new Set(exercise.options.map(option => option.canonicalIdentity)).size).toBe(4);
    for (const option of exercise.options) {
      expect(option.pattern).toBeDefined();
      expect(requireValidRhythmPattern(option.pattern)).toEqual(option.pattern);
    }
  });

  it("grades by canonical target identity, never label text or rendered choice order", () => {
    const exercise = generateMultipleChoiceExercise({
      track: 1,
      seed: "mc-canonical-order",
      focus: "duration",
    });
    const answer = { canonicalIdentity: exercise.correctCanonicalIdentity };
    const relabeled = {
      ...exercise,
      correctCanonicalIdentity: "tampered-display-key",
      options: [...exercise.options]
        .reverse()
        .map(option => ({ ...option, id: "same-id", label: "misleading label" })),
    } as MultipleChoiceExercise;
    expect(evaluateMultipleChoice(relabeled, answer).correct).toBe(true);
    expect(evaluateMultipleChoice(relabeled, { label: "misleading label" }).correct).toBe(false);
  });

  it("rejects question focuses or meter questions that the current track cannot support", () => {
    expect(() =>
      generateMultipleChoiceExercise({
        track: 1,
        seed: "unsupported-meter-focus",
        focus: "meter",
      })
    ).toThrow(RangeError);
    expect(() =>
      generateMultipleChoiceExercise({
        track: 3,
        seed: "unsupported-dot-focus",
        focus: "dot",
      })
    ).toThrow(RangeError);
    expect(() =>
      generateMultipleChoiceExercise({
        track: 1,
        seed: "single-meter-question",
        focus: "duration",
        meter: { numerator: 3, denominator: 4 },
      })
    ).toThrow(/not allowed/);
  });
});

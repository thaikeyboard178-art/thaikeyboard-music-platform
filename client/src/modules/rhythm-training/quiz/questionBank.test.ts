import { describe, expect, it } from "vitest";
import {
  createQuizRun,
  DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT,
  getAvailableQuizQuestionCount,
  QUIZ_QUESTION_BANK,
  RHYTHM_QUIZ_QUESTION_COUNTS,
  type QuizTrack,
} from "./questionBank";
import { requireValidRhythmPattern } from "../rhythm/validate";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";

const tracks: readonly Exclude<QuizTrack, "mixed">[] = [1, 2, 3, 4, 5, 6, "bonus"];
const bankFor = (track: QuizTrack) => QUIZ_QUESTION_BANK[String(track)];

function questionIds(track: QuizTrack, seed: string) {
  const exactCount = Math.min(
    DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT,
    bankFor(track).length
  );
  return createQuizRun(track, seed, exactCount).map(question => question.id);
}

describe("Rhythm Quiz question bank", () => {
  it("has unique question identities and four distinct authored options with stable answer keys", () => {
    const allQuestionIds = tracks.flatMap(track =>
      bankFor(track).map(q => q.id)
    );
    expect(new Set(allQuestionIds).size).toBe(allQuestionIds.length);

    for (const track of tracks) {
      for (const question of bankFor(track)) {
        expect(String(question.track)).toBe(String(track));
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map(option => option.id)).size).toBe(4);
        expect(
          new Set(
            question.options.map(option =>
              option.label.trim().toLocaleLowerCase()
            )
          ).size
        ).toBe(4);
        expect(
          question.options.some(
            option => option.id === question.correctOptionId
          )
        ).toBe(true);
      }
    }
  });

  it("maps the old Level 3 and Level 4 material into new Level 3 without losing the simple-meter questions", () => {
    const level3 = bankFor(3);
    expect(level3).toHaveLength(20);
    expect(new Set(level3.map(question => question.concept))).toEqual(
      new Set([
        "simple-meter-pulses",
        "meter-identification",
        "dot-arithmetic",
        "tie-continuation",
      ])
    );
    expect(level3.some(question => question.id === "l3-2-4-pulse-count")).toBe(
      true
    );
    expect(level3.some(question => question.id === "l4-dotted-quarter")).toBe(
      true
    );
    expect(level3.some(question => question.id === "l4-tie-no-new-onset")).toBe(
      true
    );
  });

  it("keeps Level 4 focused on sixteenth notes and Level 5 on complex combinations without padding short pools", () => {
    const level4 = bankFor(4);
    expect(level4).toHaveLength(10);
    expect(
      level4.every(question =>
        /móc kép|sixteenth/i.test(question.prompt + question.explanation)
      )
    ).toBe(true);
    expect(
      level4.some(
        question =>
          question.concept === "dot-arithmetic" ||
          question.concept === "tie-continuation"
      )
    ).toBe(false);

    const level5 = bankFor(5);
    expect(level5).toHaveLength(4);
    expect(
      level5.every(
        question => question.concept === "complex-rhythm-combinations"
      )
    ).toBe(true);
    expect(createQuizRun(5, "short-bank", level5.length)).toHaveLength(level5.length);
    expect(() => createQuizRun(5, "short-bank", 10)).toThrow(
      /unique questions are available/
    );
    expect(new Set(questionIds(5, "short-bank")).size).toBe(level5.length);
  });

  it("retains the Level 1/2, Level 6 and optional Bonus track boundaries", () => {
    expect(new Set(bankFor(1).map(question => question.concept))).toEqual(
      new Set([
        "4-4-scaffold",
        "quarter-note",
        "half-note",
        "whole-note",
        "quarter-rest",
      ])
    );
    expect(new Set(bankFor(2).map(question => question.concept))).toEqual(
      new Set([
        "quarter-eighth-equivalence",
        "eighth-rest",
        "binary-subdivision",
      ])
    );
    expect(new Set(bankFor(6).map(question => question.concept))).toEqual(
      new Set([
        "eighth-metronome-count",
        "grouping-in-threes",
        "compound-group-accent",
        "meter-identification",
        "incomplete-bar-fill",
      ])
    );
    expect(new Set(bankFor("bonus").map(question => question.concept))).toEqual(
      new Set(["2-2-meter", "half-note-pulse", "meter-identification"])
    );
  });

  it("preserves complete, validator-approved canonical notation stimuli", () => {
    for (const track of tracks) {
      for (const question of bankFor(track)) {
        const notation = question.notation;
        if (notation?.kind !== "canonical") continue;
        expect(() => requireValidRhythmPattern(notation.pattern)).not.toThrow();
      }
    }
  });

  it("uses deterministic seeded sampling, selects a subset when eligible content exceeds the run cap, and preserves answer identity after option shuffles", () => {
    const first = createQuizRun(3, "stable-seed-a", 10);
    const repeat = createQuizRun(3, "stable-seed-a", 10);
    expect(
      first.map(question => [
        question.id,
        question.options.map(option => option.id),
      ])
    ).toEqual(
      repeat.map(question => [
        question.id,
        question.options.map(option => option.id),
      ])
    );
    expect(first).toHaveLength(10);
    expect(new Set(first.map(question => question.id)).size).toBe(10);
    expect(first.some(question => question.track !== 3)).toBe(false);

    const alternate = createQuizRun(3, "stable-seed-b", 10);
    expect(new Set(alternate.map(question => question.id))).not.toEqual(
      new Set(first.map(question => question.id))
    );

    for (const track of tracks) {
      const count = Math.min(10, bankFor(track).length);
      const shuffled = createQuizRun(track, `options-${String(track)}`, count);
      for (const question of shuffled) {
        const canonical = bankFor(track).find(item => item.id === question.id)!;
        expect(question.correctOptionId).toBe(canonical.correctOptionId);
        expect(new Set(question.options.map(option => option.id))).toEqual(
          new Set(canonical.options.map(option => option.id))
        );
        expect(
          question.options.find(
            option => option.id === question.correctOptionId
          )?.label
        ).toBe(
          canonical.options.find(
            option => option.id === canonical.correctOptionId
          )?.label
        );
      }
    }
  });

  it("keeps meter-identification stimuli uniquely inferable without signature data leaking", () => {
    for (const track of tracks) {
      for (const question of bankFor(track)) {
        if (question.concept !== "meter-identification") continue;
        expect(question.notation?.kind).toBe("canonical");
        if (question.notation?.kind !== "canonical") continue;
        expect(question.notation.showTimeSignature).toBe(false);
        expect(question.prompt).not.toMatch(/\b\d+\/\d+\b/);
        expect(question.explanation).not.toMatch(/\b\d+\/\d+\b/);
        expect(question.notation.caption).not.toMatch(/\b\d+\/\d+\b/);
        const optionDurations = question.options.map(candidate => {
          const [numerator, denominator] = candidate.label
            .split("/")
            .map(Number);
          return (numerator * 480 * 4) / denominator;
        });
        const pattern = question.notation.pattern;
        const capacity = deriveRhythmTimeline(pattern, 120).meter.measureTicks;
        const correctIndex = question.options.findIndex(
          candidate => candidate.id === question.correctOptionId
        );
        expect(optionDurations[correctIndex]).toBe(capacity);
        expect(optionDurations.filter(duration => duration === capacity)).toHaveLength(1);
      }
    }
  });

  it("spells the Level 5 beat-2 sustain over beat 3 as a tie without changing attack onsets", () => {
    const question = bankFor(5).find(
      candidate => candidate.id === "l5-combo-sixteenths-dotted-eighth-quarter"
    )!;
    expect(question.notation?.kind).toBe("canonical");
    if (question.notation?.kind !== "canonical") return;
    const timeline = deriveRhythmTimeline(question.notation.pattern, 120);
    expect(timeline.totalTicks).toBe(1920);
    expect(timeline.onsets).toEqual([0, 120, 240, 360, 480, 1200, 1440]);
    expect(
      timeline.segments.find(
        segment => segment.segmentId === "l5-combo-beat-three-tied-eighth"
      )
    ).toMatchObject({ absoluteStartTicks: 960, isOnset: false, tieRole: "end" });
    expect(
      timeline.segments.filter(segment => segment.tieGroupId === "l5-combo-beat-boundary-tie")
    ).toHaveLength(2);
  });

  it("creates exact-count, unique Mixed runs from all seven curriculum groups with reproducible level diversity", () => {
    expect(RHYTHM_QUIZ_QUESTION_COUNTS).toEqual([5, 10, 20, 30]);
    expect(DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT).toBe(10);
    const first = createQuizRun("mixed", "all-levels-stable", 30);
    const repeat = createQuizRun("mixed", "all-levels-stable", 30);
    expect(first.map(question => [question.id, question.options.map(o => o.id)])).toEqual(
      repeat.map(question => [question.id, question.options.map(o => o.id)])
    );
    expect(first).toHaveLength(30);
    expect(new Set(first.map(question => question.id)).size).toBe(30);
    expect(new Set(first.map(question => String(question.track)))).toEqual(
      new Set(tracks.map(String))
    );
    const sourceIds = new Set(tracks.flatMap(track => bankFor(track).map(q => q.id)));
    expect(first.every(question => sourceIds.has(question.id))).toBe(true);
    for (const count of RHYTHM_QUIZ_QUESTION_COUNTS) {
      expect(createQuizRun("mixed", `mixed-${count}`, count)).toHaveLength(count);
    }
    expect(getAvailableQuizQuestionCount("mixed")).toBe(sourceIds.size);
    expect(() => createQuizRun("mixed", "too-many", sourceIds.size + 1)).toThrow(
      /unique questions are available/
    );
  });
});

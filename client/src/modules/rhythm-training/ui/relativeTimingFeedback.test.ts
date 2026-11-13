import { describe, expect, it } from "vitest";
import { sealTapAttempt } from "../exercises/tapCompletion";
import { evaluateTapRhythmAnswer, createTapTargets } from "../exercises/tapRhythm";
import { matchTapRhythm, type TapMatchInput } from "../exercises/tapMatcher";
import { calculateTapTwoRoundScore } from "../exercises/tapRoundScoring";
import type { TapTarget } from "../exercises/tapRhythm";
import { FOUR_FOUR, HALF_TIE, SIX_EIGHT, TWO_FOUR, WHOLE_NOTE, DOTTED_EIGHTH } from "../rhythm/fixtures";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import {
  deriveRelativeTimingFeedback,
  relativeTimingForAttempt,
} from "./relativeTimingFeedback";

function target(id: string, tick: number, offsetMs: number, passMs = 10, associationMs = 100): TapTarget {
  return { id, tick, offsetMs, passMs, associationMs };
}
function tapsAt(targets: readonly TapTarget[], errors: readonly number[]): TapMatchInput[] {
  return errors.map((error, sequence) => ({ sequence, offsetMs: targets[sequence].offsetMs + error }));
}

const realisticPatterns = [
  [FOUR_FOUR, 60], [TWO_FOUR, 100], [HALF_TIE, 80],
  [SIX_EIGHT, 80], [DOTTED_EIGHTH, 100], [WHOLE_NOTE, 60],
] as const;

describe("relative timing feedback", () => {
  it.each(realisticPatterns)("uses real canonical targets and matcher output (%s)", (pattern, bpm) => {
    const canonical = { ...pattern, tempo: { pulseBpm: bpm } };
    const targets = createTapTargets(canonical, 240);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.map(row => row.tick)).toEqual([...targets.map(row => row.tick)].sort((a, b) => a - b));
    const evaluation = matchTapRhythm(targets, targets.map((item, sequence) => ({ sequence, offsetMs: item.offsetMs })));
    const pulse = ticksToSeconds(deriveMeter(canonical.meter).pulseTicks, canonical.meter, bpm) * 1000;
    const feedback = deriveRelativeTimingFeedback(targets, evaluation, pulse);
    expect(feedback.rows.map(row => row.targetTick)).toEqual(targets.map(row => row.tick));
    expect(feedback.matchedCount).toBe(targets.length);
    expect(feedback.accurate).toBe(targets.length);
    expect(feedback.rows.every(row => row.deviationPercent === 0 && row.category === "Accurate")).toBe(true);
  });

  it.each(SEVEN_METER_RUNTIME_FIXTURES)("runs exact and signed feedback in canonical meter $name at a learner tempo", fixture => {
    const pulseBpm = 80;
    const pattern = { ...fixture.pattern, tempo: { pulseBpm } };
    const targets = createTapTargets(pattern, 120);
    const exact = matchTapRhythm(targets, targets.map((item, sequence) => ({ sequence, offsetMs: item.offsetMs })));
    const exactFeedback = deriveRelativeTimingFeedback(
      targets,
      exact,
      ticksToSeconds(deriveMeter(pattern.meter).pulseTicks, pattern.meter, pulseBpm) * 1000
    );
    expect(exactFeedback.matchedCount).toBe(targets.length);
    expect(exactFeedback.rows.every(row => row.deviationPercent === 0 && row.category === "Accurate")).toBe(true);

    const shifted = matchTapRhythm(targets, targets.map((item, sequence) => ({
      sequence,
      offsetMs: item.offsetMs + (sequence % 2 === 0 ? -5 : 5),
    })));
    const shiftedFeedback = deriveRelativeTimingFeedback(
      targets,
      shifted,
      ticksToSeconds(deriveMeter(pattern.meter).pulseTicks, pattern.meter, pulseBpm) * 1000
    );
    expect(shiftedFeedback.matchedCount).toBe(targets.length);
    expect(shiftedFeedback.rows.every(row => row.status === "matched")).toBe(true);
    expect(shiftedFeedback.rows[0].deviationPercent).toBeLessThan(0);
    expect(shiftedFeedback.rows[1].deviationPercent).toBeGreaterThan(0);
    expect(shiftedFeedback.rows.every(row => row.category === "Accurate")).toBe(true);
  });

  it("preserves signed errors for exact, early, and late taps, including officially matched taps", () => {
    const targets = [target("a", 0, 100, 30), target("b", 120, 200, 30), target("c", 240, 300, 30)];
    const evaluation = matchTapRhythm(targets, [{ sequence: 4, offsetMs: 100 }, { sequence: 5, offsetMs: 195 }, { sequence: 6, offsetMs: 305 }]);
    expect(evaluation.targetResults.map(row => row.status)).toEqual(["matched", "matched", "matched"]);
    const feedback = deriveRelativeTimingFeedback(targets, evaluation, 500);
    expect(feedback.rows.map(row => row.errorMs)).toEqual([0, -5, 5]);
    expect(feedback.rows.map(row => row.deviationPercent)).toEqual([0, -10, 10]);
    expect(feedback.averageAbsoluteDeviationPercent).toBeCloseTo(20 / 3);
  });

  it("uses unequal left/right references, mirrors first/last edges, and handles single onsets", () => {
    const targets = [target("a", 0, 0), target("b", 120, 100), target("c", 240, 400)];
    const evaluation = matchTapRhythm(targets, [{ sequence: 0, offsetMs: 1 }, { sequence: 1, offsetMs: 99 }, { sequence: 2, offsetMs: 401 }]);
    const feedback = deriveRelativeTimingFeedback(targets, evaluation, 900);
    expect(feedback.rows.map(row => row.referenceIntervalMs)).toEqual([100, 100, 300]);
    const single = [target("one", 0, 50)];
    for (const pulse of [500, 250, 1000]) {
      const result = deriveRelativeTimingFeedback(single, matchTapRhythm(single, [{ sequence: 0, offsetMs: 55 }]), pulse);
      expect(result.rows[0].referenceIntervalMs).toBe(pulse);
    }
  });

  it.each([-10, 10, -20, 20, -20.01, 20.01])("classifies inclusive relative boundary %d percent", percent => {
    const targets = [target("a", 0, 0, 10, 600), target("b", 120, 1000, 10, 600)];
    const offset = 5 * percent; // 10% of the 500 ms half-interval
    const evaluation = matchTapRhythm(targets, [{ sequence: 0, offsetMs: offset }]);
    const row = deriveRelativeTimingFeedback(targets, evaluation, 1000).rows[0];
    expect(row.deviationPercent).toBeCloseTo(percent);
    expect(row.category).toBe(Math.abs(percent) <= 10 ? "Accurate" : Math.abs(percent) <= 20 ? "Slightly Off" : "Inaccurate");
  });

  it("retains midpoint primary/residual assignment and counts additional taps as extra", () => {
    const targets = [target("left", 0, 100, 5, 60), target("right", 120, 200, 5, 60)];
    const evaluation = matchTapRhythm(targets, [{ sequence: 17, offsetMs: 150 }]);
    expect(evaluation.targetResults.map(row => row.status)).toEqual(["late", "missing"]);
    const feedback = deriveRelativeTimingFeedback(targets, evaluation, 500);
    expect(feedback.rows.map(row => row.tapSequence)).toEqual([17, null]);
    expect(feedback.matchedCount).toBe(1);
    const crowded = matchTapRhythm([targets[0]], [{ sequence: 1, offsetMs: 100 }, { sequence: 2, offsetMs: 101 }, { sequence: 3, offsetMs: 102 }]);
    expect(deriveRelativeTimingFeedback([targets[0]], crowded, 500)).toMatchObject({ matchedCount: 1, extra: 2, missing: 0 });
  });

  it("makes invalid pulse references and unpaired targets unavailable rather than mistakes", () => {
    const targets = [target("one", 0, 100)];
    const evaluation = matchTapRhythm(targets, [{ sequence: 0, offsetMs: 110 }]);
    for (const pulse of [0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, null]) {
      const feedback = deriveRelativeTimingFeedback(targets, evaluation, pulse);
      expect(feedback).toMatchObject({ matchedCount: 1, unavailable: 1, accurate: 0, averageAbsoluteDeviationPercent: null });
      expect(feedback.rows[0]).toMatchObject({ referenceIntervalMs: null, deviationPercent: null, category: null });
    }
    const missing = deriveRelativeTimingFeedback(targets, matchTapRhythm(targets, []), 500);
    expect(missing).toMatchObject({ matchedCount: 0, missing: 1, extra: 0, averageAbsoluteDeviationPercent: null });
    const empty = deriveRelativeTimingFeedback([], matchTapRhythm([], [{ sequence: 1, offsetMs: 5 }]), 500);
    expect(empty).toMatchObject({ rows: [], matchedCount: 0, missing: 0, extra: 1, averageAbsoluteDeviationPercent: null });
  });

  it("counts attack onsets only for sustained ties and rests; exercises subdivisions and sparse syncopation", () => {
    const tieTargets = createTapTargets(HALF_TIE, 240);
    expect(tieTargets).toHaveLength(1);
    const restTargets = createTapTargets({ ...FOUR_FOUR, measures: [{ ...FOUR_FOUR.measures[0], segments: [
      { id: "r", kind: "rest", duration: { denominator: 4, dots: 0 } },
      { id: "n1", kind: "note", duration: { denominator: 8, dots: 0 } },
      { id: "n2", kind: "note", duration: { denominator: 8, dots: 0 } },
      { id: "r2", kind: "rest", duration: { denominator: 4, dots: 0 } },
      { id: "n3", kind: "note", duration: { denominator: 4, dots: 0 } },
    ] }] }, 240);
    expect(restTargets.map(item => item.tick)).toEqual([480, 720, 1440]);
    expect(createTapTargets(DOTTED_EIGHTH, 240).length).toBeGreaterThan(1);
    expect(createTapTargets(SIX_EIGHT, 240).length).toBeGreaterThan(1);
    const sparse = [target("sync", 240, 250), target("later", 720, 760)];
    const sparseFeedback = deriveRelativeTimingFeedback(sparse, matchTapRhythm(sparse, [{ sequence: 0, offsetMs: 250 }, { sequence: 1, offsetMs: 760 }]), 500);
    expect(sparseFeedback.matchedCount).toBe(2);
  });

  it("binds completed attempts to their exact exercise target ticks and leaves official grading untouched", () => {
    const exercise = {
      id: "timing", kind: "tap-rhythm" as const, track: 1 as const, section: "practice" as const,
      pattern: { ...FOUR_FOUR, tempo: { pulseBpm: 80 } }, gridTicks: 240 as const,
      targets: createTapTargets({ ...FOUR_FOUR, tempo: { pulseBpm: 80 } }, 240),
    };
    const firstTaps = exercise.targets.map((item, sequence) => ({ sequence, offsetMs: item.offsetMs }));
    const secondTaps = exercise.targets.map((item, sequence) => ({ sequence: sequence + firstTaps.length, offsetMs: item.offsetMs }));
    const pulseMs = ticksToSeconds(deriveMeter(exercise.pattern.meter).pulseTicks, exercise.pattern.meter, 80) * 1000;
    const score = calculateTapTwoRoundScore(
      exercise.targets,
      [
        { roundNumber: 1, skipped: false, taps: firstTaps },
        { roundNumber: 2, skipped: false, taps: secondTaps },
      ],
      pulseMs
    );
    const evaluation = score.rounds[0].evaluation!;
    const before = JSON.stringify(evaluation);
    const result = sealTapAttempt({ exerciseId: exercise.id, generation: 1, mode: "graded", status: "completed", reason: null,
      targetTicks: exercise.targets.map(item => item.tick), taps: firstTaps, rounds: score.rounds,
      evaluation, accuracyPercent: score.overallAccuracyPercent, scoreOutOfTen: score.scoreOutOfTen, rawCaptures: [] });
    const feedback = relativeTimingForAttempt(exercise, result);
    expect(feedback?.matchedCount).toBe(exercise.targets.length);
    expect(JSON.stringify(evaluation)).toBe(before);
    expect(evaluateTapRhythmAnswer(exercise, result)).toEqual({
      correct: true,
      accuracyPercent: 100,
      scoreOutOfTen: 10,
    });
    expect(relativeTimingForAttempt({ ...exercise, id: "other" }, result)?.unavailable).toBe(exercise.targets.length);
    expect(relativeTimingForAttempt(exercise, sealTapAttempt({ ...result, targetTicks: [999], evaluation }))?.unavailable).toBe(exercise.targets.length);
    expect(relativeTimingForAttempt(exercise, sealTapAttempt({ ...result, status: "technical-abort" })) ).toBeNull();
  });

  it("does not mutate targets or any official evaluation field", () => {
    const targets: TapTarget[] = [target("a", 0, 100), target("b", 120, 300)];
    const evaluation = matchTapRhythm(targets, [{ sequence: 0, offsetMs: 105 }, { sequence: 1, offsetMs: 290 }]);
    const targetSnapshot = JSON.stringify(targets);
    const officialSnapshot = JSON.stringify({ tp: evaluation.tp, n: evaluation.n, k: evaluation.k, accuracyPercent: evaluation.accuracyPercent, targetResults: evaluation.targetResults, tapResults: evaluation.tapResults });
    deriveRelativeTimingFeedback(targets, evaluation, 500);
    expect(JSON.stringify(targets)).toBe(targetSnapshot);
    expect(JSON.stringify({ tp: evaluation.tp, n: evaluation.n, k: evaluation.k, accuracyPercent: evaluation.accuracyPercent, targetResults: evaluation.targetResults, tapResults: evaluation.tapResults })).toBe(officialSnapshot);
  });
});

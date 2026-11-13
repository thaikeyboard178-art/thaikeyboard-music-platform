import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { TapEvaluation, TapTargetResult } from "../exercises/tapMatcher";
import type { TapRhythmExercise, TapTarget } from "../exercises/tapRhythm";
import { calculateTapRelativeDeviation } from "../exercises/tapRoundScoring";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";

export type RelativeTimingCategory = "Accurate" | "Slightly Off" | "Inaccurate";

export type RelativeTimingRow = Readonly<{
  targetIndex: number;
  targetId: string;
  targetTick: number | null;
  onsetMs: number | null;
  tapSequence: number | null;
  status: TapTargetResult["status"];
  errorMs: number | null;
  referenceIntervalMs: number | null;
  deviationPercent: number | null;
  category: RelativeTimingCategory | null;
}>;

export type RelativeTimingFeedback = Readonly<{
  rows: readonly RelativeTimingRow[];
  matchedCount: number;
  accurate: number;
  slightlyOff: number;
  inaccurate: number;
  unavailable: number;
  averageAbsoluteDeviationPercent: number | null;
  extra: number;
  missing: number;
}>;

/** Inclusive percentage boundaries, with only a machine-precision guard. */
function categoryFor(value: number): RelativeTimingCategory {
  const absolute = Math.abs(value);
  const epsilon = 8 * Number.EPSILON * Math.max(1, absolute);
  if (absolute <= 10 + epsilon) return "Accurate";
  if (absolute <= 20 + epsilon) return "Slightly Off";
  return "Inaccurate";
}

/**
 * Display-only post-processing. Assignment, signed error, Missing and Extra
 * remain those emitted by the existing primary/residual matcher. No tap is
 * looked up by proximity and no pass/association window or score is consulted.
 */
export function deriveRelativeTimingFeedback(
  targets: readonly TapTarget[],
  evaluation: TapEvaluation,
  canonicalPulseMs: number | null
): RelativeTimingFeedback {
  const rows = evaluation.targetResults.map(result => {
    const target = targets[result.targetIndex];
    const paired = result.status !== "missing" && result.tapSequence !== null;
    const relative =
      paired &&
      target?.id === result.targetId &&
      Number.isFinite(target.offsetMs) &&
      result.errorMs !== null &&
      Number.isFinite(result.errorMs)
        ? calculateTapRelativeDeviation(
            targets,
            result.targetIndex,
            result.errorMs,
            canonicalPulseMs
          )
        : Object.freeze({
            referenceIntervalMs: null,
            deviationPercent: null,
            direction: null,
          });
    const referenceIntervalMs = relative.referenceIntervalMs;
    const deviationPercent = relative.deviationPercent;
    const category =
      deviationPercent === null ? null : categoryFor(deviationPercent);

    return Object.freeze({
      targetIndex: result.targetIndex,
      targetId: result.targetId,
      targetTick: target?.tick ?? null,
      onsetMs: target && Number.isFinite(target.offsetMs) ? target.offsetMs : null,
      tapSequence: result.tapSequence,
      status: result.status,
      errorMs: result.errorMs,
      referenceIntervalMs,
      deviationPercent,
      category,
    });
  });
  const pairedRows = rows.filter(row => row.status !== "missing" && row.tapSequence !== null);
  const available = pairedRows.filter(row => row.deviationPercent !== null);
  // Incremental mean avoids overflowing a sum of finite percentages.
  const average = available.reduce(
    (mean, row, index) => mean + (Math.abs(row.deviationPercent!) - mean) / (index + 1),
    0
  );
  return Object.freeze({
    rows: Object.freeze(rows),
    matchedCount: pairedRows.length,
    accurate: available.filter(row => row.category === "Accurate").length,
    slightlyOff: available.filter(row => row.category === "Slightly Off").length,
    inaccurate: available.filter(row => row.category === "Inaccurate").length,
    unavailable: pairedRows.length - available.length,
    averageAbsoluteDeviationPercent: available.length > 0 ? average : null,
    extra: evaluation.tapResults.filter(tap => tap.status === "extra").length,
    missing: evaluation.targetResults.filter(target => target.status === "missing").length,
  });
}

/** Bind display context to the immutable receipt; never grade or repair it. */
export function relativeTimingForAttempt(
  exercise: TapRhythmExercise,
  result: TapAttemptResult
): RelativeTimingFeedback | null {
  if (result.status !== "completed" || result.evaluation === null) return null;
  const sameContext = result.exerciseId === exercise.id &&
    result.targetTicks.length === exercise.targets.length &&
    result.targetTicks.every((tick, index) => tick === exercise.targets[index].tick);
  let canonicalPulseMs: number | null = null;
  if (sameContext) {
    try {
      canonicalPulseMs = ticksToSeconds(
        deriveMeter(exercise.pattern.meter).pulseTicks,
        exercise.pattern.meter,
        exercise.pattern.tempo.pulseBpm
      ) * 1000;
    } catch {
      // An invalid pulse reference is unavailable, never a learner mistake.
    }
  }
  return deriveRelativeTimingFeedback(
    sameContext ? exercise.targets : [],
    result.evaluation,
    canonicalPulseMs
  );
}

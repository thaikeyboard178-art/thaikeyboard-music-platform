import {
  matchTapRhythm,
  type TapEvaluation,
  type TapMatchInput,
} from "./tapMatcher";
import type { TapTarget } from "./tapRhythm";

export type TapRoundNumber = 1 | 2;

export type TapRoundInput = Readonly<{
  roundNumber: TapRoundNumber;
  skipped: boolean;
  taps: readonly TapMatchInput[];
  /** The first free-loop Tap; retained so re-grade applies its narrow exception. */
  firstTapSequence?: number;
}>;

export type TapRoundNoteResult = Readonly<{
  targetIndex: number;
  targetId: string;
  targetTick: number;
  matchStatus: "matched" | "early" | "late" | "missing";
  tapSequence: number | null;
  actualOffsetMs: number | null;
  errorMs: number | null;
  referenceIntervalMs: number | null;
  deviationPercent: number | null;
  direction: "early" | "late" | "exact" | null;
  noteAccuracyPercent: number | null;
}>;

export type TapRoundResult = Readonly<{
  roundNumber: TapRoundNumber;
  status: "played" | "skipped";
  taps: readonly TapMatchInput[];
  /** Round-one trigger metadata; null on skipped/non-trigger rounds. */
  firstTapSequence?: number | null;
  evaluation: TapEvaluation | null;
  noteResults: readonly TapRoundNoteResult[];
  accuracyPercent: number | null;
  missedTargetCount: number;
  extraTapCount: number;
}>;

export type TapTwoRoundScore = Readonly<{
  rounds: readonly [TapRoundResult, TapRoundResult];
  overallAccuracyPercent: number | null;
  scoreOutOfTen: number | null;
  roundsPlayed: number;
  roundsSkipped: number;
  missedTargetCount: number;
  extraTapCount: number;
}>;

function fail(message: string): never {
  throw new RangeError(message);
}

export type TapRelativeDeviation = Readonly<{
  referenceIntervalMs: number | null;
  deviationPercent: number | null;
  direction: "early" | "late" | "exact" | null;
}>;

/** Calculate display/accuracy deviation from the matcher-assigned signed error. */
export function calculateTapRelativeDeviation(
  targets: readonly TapTarget[],
  targetIndex: number,
  errorMs: number,
  canonicalPulseMs: number | null
): TapRelativeDeviation {
  const target = targets[targetIndex];
  if (
    !target ||
    !Number.isFinite(target.offsetMs) ||
    !Number.isFinite(errorMs)
  ) {
    return Object.freeze({
      referenceIntervalMs: null,
      deviationPercent: null,
      direction: null,
    });
  }
  const previous = targets[targetIndex - 1];
  const next = targets[targetIndex + 1];
  const left = previous
    ? target.offsetMs - previous.offsetMs
    : next
      ? next.offsetMs - target.offsetMs
      : canonicalPulseMs;
  const right = next
    ? next.offsetMs - target.offsetMs
    : previous
      ? target.offsetMs - previous.offsetMs
      : canonicalPulseMs;
  const isPositiveFinite = (
    value: number | null | undefined
  ): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;
  const chosen =
    errorMs < 0
      ? left
      : errorMs > 0
        ? right
        : isPositiveFinite(left)
          ? left
          : right;
  if (!isPositiveFinite(chosen)) {
    return Object.freeze({
      referenceIntervalMs: null,
      deviationPercent: null,
      direction: null,
    });
  }
  const deviationPercent = errorMs === 0 ? 0 : (100 * errorMs) / (chosen / 2);
  if (!Number.isFinite(deviationPercent)) {
    return Object.freeze({
      referenceIntervalMs: null,
      deviationPercent: null,
      direction: null,
    });
  }
  return Object.freeze({
    referenceIntervalMs: chosen,
    deviationPercent: deviationPercent === 0 ? 0 : deviationPercent,
    direction:
      deviationPercent < 0 ? "early" : deviationPercent > 0 ? "late" : "exact",
  });
}

function targetNotes(
  targets: readonly TapTarget[],
  evaluation: TapEvaluation,
  taps: readonly TapMatchInput[],
  canonicalPulseMs: number | null
): readonly TapRoundNoteResult[] {
  const tapBySequence = new Map(taps.map(tap => [tap.sequence, tap]));
  return Object.freeze(
    evaluation.targetResults.map(result => {
      const target = targets[result.targetIndex];
      if (!target || target.id !== result.targetId) {
        return Object.freeze({
          targetIndex: result.targetIndex,
          targetId: result.targetId,
          targetTick: -1,
          matchStatus: result.status,
          tapSequence: result.tapSequence,
          actualOffsetMs: null,
          errorMs: result.errorMs,
          referenceIntervalMs: null,
          deviationPercent: null,
          direction: null,
          noteAccuracyPercent: null,
        });
      }
      if (result.status === "missing" || result.tapSequence === null) {
        return Object.freeze({
          targetIndex: result.targetIndex,
          targetId: target.id,
          targetTick: target.tick,
          matchStatus: "missing" as const,
          tapSequence: null,
          actualOffsetMs: null,
          errorMs: null,
          referenceIntervalMs: null,
          deviationPercent: null,
          direction: null,
          noteAccuracyPercent: 0,
        });
      }

      const tap = tapBySequence.get(result.tapSequence);
      const errorMs = result.errorMs;
      const relative =
        tap &&
        Number.isFinite(tap.offsetMs) &&
        Number.isFinite(target.offsetMs) &&
        errorMs !== null &&
        Number.isFinite(errorMs)
          ? calculateTapRelativeDeviation(
              targets,
              result.targetIndex,
              errorMs,
              canonicalPulseMs
            )
          : Object.freeze({
              referenceIntervalMs: null,
              deviationPercent: null,
              direction: null,
            });
      const normalizedDeviation = relative.deviationPercent;
      const interval = relative.referenceIntervalMs;
      const direction = relative.direction;
      const noteAccuracyPercent =
        normalizedDeviation === null
          ? null
          : Math.max(0, Math.min(100, 100 - Math.abs(normalizedDeviation)));
      return Object.freeze({
        targetIndex: result.targetIndex,
        targetId: target.id,
        targetTick: target.tick,
        matchStatus: result.status,
        tapSequence: result.tapSequence,
        actualOffsetMs:
          tap && Number.isFinite(tap.offsetMs) ? tap.offsetMs : null,
        errorMs,
        referenceIntervalMs: interval,
        deviationPercent: normalizedDeviation,
        direction,
        noteAccuracyPercent,
      });
    })
  );
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce(
    (average, value, index) => average + (value - average) / (index + 1),
    0
  );
}

/**
 * The first free-loop event is the response to beat one, even when very early.
 * Pin only that early/on-time pair using its original timestamp. Evaluate all
 * remaining events with the unchanged production matcher; late first events
 * also retain the existing full matcher behavior. No window is enlarged.
 */
function matchRound(
  targets: readonly TapTarget[],
  taps: readonly TapMatchInput[],
  firstTapSequence?: number
): TapEvaluation {
  if (firstTapSequence === undefined) return matchTapRhythm(targets, taps);
  const firstTarget = targets[0];
  const firstTap = taps.find(tap => tap.sequence === firstTapSequence);
  if (!firstTarget || !firstTap)
    fail("The first Tap metadata does not identify a round-one capture.");
  // Validate the complete input before partitioning it (including duplicate
  // sequences and chronological ordering). Later first events have no override.
  const ordinary = matchTapRhythm(targets, taps);
  if (firstTap.offsetMs > firstTarget.offsetMs) return ordinary;
  const first = matchTapRhythm([firstTarget], [firstTap]);

  const remainingTargets = targets.slice(1);
  const remainingTaps = taps.filter(tap => tap.sequence !== firstTapSequence);
  const remainder = matchTapRhythm(remainingTargets, remainingTaps);
  const targetResults = Object.freeze([
    first.targetResults[0],
    ...remainder.targetResults.map(result =>
      Object.freeze({ ...result, targetIndex: result.targetIndex + 1 })
    ),
  ]);
  const remainderBySequence = new Map(
    remainder.tapResults.map(result => [
      result.sequence,
      Object.freeze({
        ...result,
        targetIndex:
          result.targetIndex === null ? null : result.targetIndex + 1,
      }),
    ])
  );
  const tapResults = Object.freeze(
    taps.map(tap => {
      if (tap.sequence === firstTapSequence) return first.tapResults[0];
      return (
        remainderBySequence.get(tap.sequence) ??
        Object.freeze({
          sequence: tap.sequence,
          status: "extra" as const,
          targetIndex: null,
          errorMs: null,
        })
      );
    })
  );
  const n = targets.length;
  const k = taps.length;
  const tp = remainder.tp + first.tp;
  const missing = remainder.missing;
  const extra = remainder.extra;
  return Object.freeze({
    correct: n > 0 && tp === n && extra === 0,
    accuracyPercent: n === 0 ? null : (100 * 2 * tp) / (n + k),
    tp,
    n,
    k,
    missing,
    extra,
    nearMiss: remainder.nearMiss + first.nearMiss,
    farAssociation: remainder.farAssociation + first.farAssociation,
    targetResults,
    tapResults,
  });
}

/**
 * Finalizes one round using the same production matcher and note-accuracy rules
 * as the complete two-round score, with the other slot explicitly excluded.
 */
export function calculateTapRoundResult(
  targets: readonly TapTarget[],
  round: TapRoundInput,
  canonicalPulseMs: number | null
): TapRoundResult {
  const otherRound: TapRoundInput = Object.freeze({
    roundNumber: round.roundNumber === 1 ? 2 : 1,
    skipped: true,
    taps: Object.freeze([]),
  });
  const inputs: readonly [TapRoundInput, TapRoundInput] =
    round.roundNumber === 1 ? [round, otherRound] : [otherRound, round];
  return calculateTapTwoRoundScore(targets, inputs, canonicalPulseMs).rounds[
    round.roundNumber - 1
  ];
}

/**
 * Uses the production ordered matcher independently for each real round. It
 * applies only the approved first-Tap pairing exception; note scores consume
 * the sealed target-to-sequence pairing and original signed timing error.
 */
export function calculateTapTwoRoundScore(
  targets: readonly TapTarget[],
  rounds: readonly TapRoundInput[],
  canonicalPulseMs: number | null
): TapTwoRoundScore {
  if (
    rounds.length !== 2 ||
    rounds[0]?.roundNumber !== 1 ||
    rounds[1]?.roundNumber !== 2
  ) {
    fail("A Tap attempt must contain exactly round 1 and round 2.");
  }
  if (
    canonicalPulseMs !== null &&
    (!Number.isFinite(canonicalPulseMs) || canonicalPulseMs <= 0)
  ) {
    canonicalPulseMs = null;
  }

  const scoredRounds = rounds.map(input => {
    if (input.skipped) {
      return Object.freeze({
        roundNumber: input.roundNumber,
        status: "skipped" as const,
        taps: Object.freeze([]) as readonly TapMatchInput[],
        evaluation: null,
        noteResults: Object.freeze([]) as readonly TapRoundNoteResult[],
        accuracyPercent: null,
        missedTargetCount: 0,
        extraTapCount: 0,
      });
    }
    const taps = Object.freeze(
      input.taps.map(tap => Object.freeze({ ...tap }))
    );
    if (input.roundNumber === 2 && input.firstTapSequence !== undefined)
      fail("The first Tap metadata can only belong to round one.");
    const firstTapSequence = input.firstTapSequence;
    const evaluation = matchRound(targets, taps, firstTapSequence);
    const noteResults = targetNotes(
      targets,
      evaluation,
      taps,
      canonicalPulseMs
    );
    const noteAccuracies = noteResults.map(row => row.noteAccuracyPercent);
    const accuracyPercent =
      noteAccuracies.length === 0 ||
      noteAccuracies.some(value => value === null)
        ? null
        : mean(noteAccuracies as number[]);
    return Object.freeze({
      roundNumber: input.roundNumber,
      status: "played" as const,
      taps,
      ...(firstTapSequence === undefined ? {} : { firstTapSequence }),
      evaluation,
      noteResults,
      accuracyPercent,
      missedTargetCount: evaluation.missing,
      extraTapCount: evaluation.extra,
    });
  });

  const tuple = scoredRounds as unknown as readonly [
    TapRoundResult,
    TapRoundResult,
  ];
  const played = tuple.filter(round => round.status === "played");
  const allNoteAccuracies = played.flatMap(round =>
    round.noteResults.map(row => row.noteAccuracyPercent)
  );
  const overallAccuracyPercent =
    played.length === 0 ||
    allNoteAccuracies.length === 0 ||
    allNoteAccuracies.some(value => value === null)
      ? null
      : mean(allNoteAccuracies as number[]);
  const scoreOutOfTen =
    overallAccuracyPercent === null
      ? null
      : Math.max(0, Math.min(10, Math.round(overallAccuracyPercent / 10)));

  return Object.freeze({
    rounds: Object.freeze(tuple) as readonly [TapRoundResult, TapRoundResult],
    overallAccuracyPercent,
    scoreOutOfTen,
    roundsPlayed: played.length,
    roundsSkipped: tuple.length - played.length,
    missedTargetCount: tuple.reduce(
      (total, round) => total + round.missedTargetCount,
      0
    ),
    extraTapCount: tuple.reduce(
      (total, round) => total + round.extraTapCount,
      0
    ),
  });
}

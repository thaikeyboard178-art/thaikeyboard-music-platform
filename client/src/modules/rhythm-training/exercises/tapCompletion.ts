import type { TapEvaluation, TapMatchInput } from "./tapMatcher";
import type { TapRoundResult } from "./tapRoundScoring";

export type TapAttemptResult = Readonly<{
  exerciseId: string;
  generation: number;
  mode: "graded" | "practice";
  status: "completed" | "technical-abort";
  reason: string | null;
  targetTicks: readonly number[];
  /** Legacy first-played-round projection; official Tap accuracy is accuracyPercent. */
  taps: readonly TapMatchInput[];
  /** Legacy first-played-round matcher projection; scoring consumes `rounds`. */
  evaluation: TapEvaluation | null;
  /** Overall target-note mean for two-round attempts; null means no score is available. */
  accuracyPercent: number | null;
  /** Nearest-integer Tap-specific integer award, null when no round is scoreable. */
  scoreOutOfTen?: number | null;
  /** First free-loop tap identity, retained for deterministic re-grading. */
  firstTapSequence?: number;
  /** Exactly two entries for completed runtime attempts; absent on legacy/technical receipts. */
  rounds?: readonly [TapRoundResult, TapRoundResult];
  rawCaptures: readonly Readonly<{
    rawTimestamp: number;
    performanceMs: number;
    arrivalMs: number;
    sequence: number;
    source: "pointer" | "space";
    generation: number;
    sampleContextTime: number;
    samplePerformanceTime: number;
  }>[];
}>;

const completedAttempts = new WeakSet<object>();

/** Module-internal issuance; not exported from the Rhythm public entrypoint. */
export function sealTapAttempt(input: TapAttemptResult): TapAttemptResult {
  const result: TapAttemptResult = Object.freeze({
    ...input,
    targetTicks: Object.freeze([...input.targetTicks]),
    taps: Object.freeze(input.taps.map(tap => Object.freeze({ ...tap }))),
    ...(input.rounds
      ? {
          rounds: Object.freeze(
            input.rounds.map(round =>
              Object.freeze({
                ...round,
                taps: Object.freeze(
                  round.taps.map(tap => Object.freeze({ ...tap }))
                ),
                noteResults: Object.freeze(
                  round.noteResults.map(note => Object.freeze({ ...note }))
                ),
              })
            )
          ) as readonly [TapRoundResult, TapRoundResult],
        }
      : {}),
    rawCaptures: Object.freeze(
      input.rawCaptures.map(capture => Object.freeze({ ...capture }))
    ),
  });
  completedAttempts.add(result);
  return result;
}

export function isRuntimeTapAttempt(value: unknown): value is TapAttemptResult {
  return (
    typeof value === "object" && value !== null && completedAttempts.has(value)
  );
}

import type { TapEvaluation, TapMatchInput } from "./tapMatcher";

export type TapAttemptResult = Readonly<{
  exerciseId: string;
  generation: number;
  mode: "graded" | "practice";
  status: "completed" | "technical-abort";
  reason: string | null;
  targetTicks: readonly number[];
  taps: readonly TapMatchInput[];
  evaluation: TapEvaluation | null;
  accuracyPercent: number | null;
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

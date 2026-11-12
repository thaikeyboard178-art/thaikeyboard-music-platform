import type { TapTarget } from "./tapRhythm";

export type TapMatchInput = Readonly<{
  sequence: number;
  offsetMs: number;
}>;

export type TapTargetResult = Readonly<{
  targetIndex: number;
  targetId: string;
  status: "matched" | "early" | "late" | "missing";
  tapSequence: number | null;
  errorMs: number | null;
}>;

export type TapCaptureResult = Readonly<{
  sequence: number;
  status: "matched" | "early" | "late" | "extra";
  targetIndex: number | null;
  errorMs: number | null;
}>;

export type TapEvaluation = Readonly<{
  correct: boolean;
  accuracyPercent: number | null;
  tp: number;
  n: number;
  k: number;
  missing: number;
  extra: number;
  nearMiss: number;
  farAssociation: number;
  targetResults: readonly TapTargetResult[];
  tapResults: readonly TapCaptureResult[];
}>;

type Pair = Readonly<{
  targetIndex: number;
  tapIndex: number;
  errorMs: number;
  pass: boolean;
}>;

type Solution = Readonly<{
  passPairs: number;
  diagnosticPairs: number;
  totalAbsoluteError: number;
  pairs: readonly Pair[];
}>;

const EMPTY_SOLUTION: Solution = Object.freeze({
  passPairs: 0,
  diagnosticPairs: 0,
  totalAbsoluteError: 0,
  pairs: Object.freeze([]),
});

function fail(message: string): never {
  throw new RangeError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateTargets(targets: readonly TapTarget[]): void {
  if (!Array.isArray(targets)) fail("Tap targets must be an array.");
  let previousTick = -1;
  let previousOffset = Number.NEGATIVE_INFINITY;
  targets.forEach((target, index) => {
    if (
      !isRecord(target) ||
      typeof target.id !== "string" ||
      !Number.isSafeInteger(target.tick) ||
      (target.tick as number) < 0 ||
      typeof target.offsetMs !== "number" ||
      !Number.isFinite(target.offsetMs) ||
      typeof target.passMs !== "number" ||
      !Number.isFinite(target.passMs) ||
      (target.passMs as number) < 0 ||
      typeof target.associationMs !== "number" ||
      !Number.isFinite(target.associationMs) ||
      (target.associationMs as number) < (target.passMs as number)
    ) {
      fail(`Tap target ${index} is invalid.`);
    }
    if ((target.tick as number) <= previousTick) {
      fail("Tap targets must be ordered by strictly increasing tick.");
    }
    if (target.offsetMs < previousOffset) {
      fail("Tap targets must be ordered by nondecreasing time.");
    }
    previousTick = target.tick as number;
    previousOffset = target.offsetMs;
  });
}

function validateTaps(taps: readonly TapMatchInput[]): void {
  if (!Array.isArray(taps)) fail("Tap captures must be an array.");
  const sequences = new Set<number>();
  let previousOffset = Number.NEGATIVE_INFINITY;
  taps.forEach((tap, index) => {
    if (
      !isRecord(tap) ||
      !Number.isSafeInteger(tap.sequence) ||
      (tap.sequence as number) < 0 ||
      typeof tap.offsetMs !== "number" ||
      !Number.isFinite(tap.offsetMs)
    ) {
      fail(`Tap capture ${index} is invalid.`);
    }
    if (sequences.has(tap.sequence as number)) {
      fail("Tap capture sequence values must be distinct.");
    }
    if (tap.offsetMs < previousOffset) {
      fail("Tap captures must be ordered by nondecreasing time.");
    }
    sequences.add(tap.sequence as number);
    previousOffset = tap.offsetMs;
  });
}

/**
 * A machine-precision guard makes mathematically inclusive boundaries stable
 * under the tick-to-millisecond projection. It is not a learner tolerance.
 */
function boundaryEpsilon(
  eventOffsetMs: number,
  targetOffsetMs: number,
  windowMs: number
): number {
  return (
    8 *
    Number.EPSILON *
    Math.max(1, Math.abs(eventOffsetMs), Math.abs(targetOffsetMs), windowMs)
  );
}

function withinWindow(
  errorMs: number,
  windowMs: number,
  eventOffsetMs: number,
  targetOffsetMs: number
): boolean {
  return (
    Math.abs(errorMs) <=
    windowMs + boundaryEpsilon(eventOffsetMs, targetOffsetMs, windowMs)
  );
}

function comparePairLists(
  left: readonly Pair[],
  right: readonly Pair[],
  taps: readonly TapMatchInput[]
): number {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    const targetDifference = left[index].targetIndex - right[index].targetIndex;
    if (targetDifference !== 0) return targetDifference;
    const sequenceDifference =
      taps[left[index].tapIndex].sequence -
      taps[right[index].tapIndex].sequence;
    if (sequenceDifference !== 0) return sequenceDifference;
  }
  return left.length - right.length;
}

function betterSolution(
  candidate: Solution,
  incumbent: Solution | undefined,
  taps: readonly TapMatchInput[]
): boolean {
  if (incumbent === undefined) return true;
  if (candidate.passPairs !== incumbent.passPairs)
    return candidate.passPairs > incumbent.passPairs;
  if (candidate.diagnosticPairs !== incumbent.diagnosticPairs)
    return candidate.diagnosticPairs > incumbent.diagnosticPairs;
  if (candidate.totalAbsoluteError !== incumbent.totalAbsoluteError)
    return candidate.totalAbsoluteError < incumbent.totalAbsoluteError;
  return comparePairLists(candidate.pairs, incumbent.pairs, taps) < 0;
}

function solveOrderedAlignment(
  targets: readonly TapTarget[],
  taps: readonly TapMatchInput[]
): Solution {
  const rows = targets.length + 1;
  const columns = taps.length + 1;
  const table: Array<Array<Solution | undefined>> = Array.from(
    { length: rows },
    () => Array<Solution | undefined>(columns)
  );
  table[targets.length][taps.length] = EMPTY_SOLUTION;

  for (let targetIndex = targets.length; targetIndex >= 0; targetIndex -= 1) {
    for (let tapIndex = taps.length; tapIndex >= 0; tapIndex -= 1) {
      if (targetIndex === targets.length && tapIndex === taps.length) continue;
      let best: Solution | undefined;
      const skipTarget = table[targetIndex + 1]?.[tapIndex];
      if (skipTarget !== undefined) best = skipTarget;
      const skipTap = table[targetIndex]?.[tapIndex + 1];
      if (skipTap !== undefined && betterSolution(skipTap, best, taps)) {
        best = skipTap;
      }
      if (targetIndex < targets.length && tapIndex < taps.length) {
        const target = targets[targetIndex];
        const tap = taps[tapIndex];
        const errorMs = tap.offsetMs - target.offsetMs;
        const pass = withinWindow(
          errorMs,
          target.passMs,
          tap.offsetMs,
          target.offsetMs
        );
        const diagnostic = withinWindow(
          errorMs,
          target.associationMs,
          tap.offsetMs,
          target.offsetMs
        );
        const tail = table[targetIndex + 1][tapIndex + 1];
        if (diagnostic && tail !== undefined) {
          const pair: Pair = Object.freeze({
            targetIndex,
            tapIndex,
            errorMs,
            pass,
          });
          const paired: Solution = Object.freeze({
            passPairs: tail.passPairs + (pass ? 1 : 0),
            diagnosticPairs: tail.diagnosticPairs + 1,
            totalAbsoluteError: tail.totalAbsoluteError + Math.abs(errorMs),
            pairs: Object.freeze([pair, ...tail.pairs]),
          });
          if (betterSolution(paired, best, taps)) best = paired;
        }
      }
      table[targetIndex][tapIndex] = best ?? EMPTY_SOLUTION;
    }
  }
  return table[0][0] ?? EMPTY_SOLUTION;
}

/**
 * Return the target owning a tap's midpoint/Voronoi cell. Equal onset times
 * share a cell owned by the lower target index; midpoint boundaries likewise
 * belong to the earlier target.
 */
function findCellTargetIndex(
  offsetMs: number,
  targets: readonly TapTarget[]
): number | null {
  const cellOwners: number[] = [];
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    if (
      targetIndex === 0 ||
      targets[targetIndex].offsetMs !== targets[targetIndex - 1].offsetMs
    ) {
      cellOwners.push(targetIndex);
    }
  }
  if (cellOwners.length === 0) return null;

  for (let cellIndex = 0; cellIndex < cellOwners.length - 1; cellIndex += 1) {
    const leftTarget = targets[cellOwners[cellIndex]];
    const rightTarget = targets[cellOwners[cellIndex + 1]];
    const midpoint =
      leftTarget.offsetMs + (rightTarget.offsetMs - leftTarget.offsetMs) / 2;
    if (offsetMs <= midpoint) return cellOwners[cellIndex];
  }
  return cellOwners[cellOwners.length - 1];
}

function crossesPrimaryPair(
  targetIndex: number,
  tapIndex: number,
  primaryPairs: readonly Pair[]
): boolean {
  return primaryPairs.some(
    pair =>
      (targetIndex < pair.targetIndex && tapIndex > pair.tapIndex) ||
      (targetIndex > pair.targetIndex && tapIndex < pair.tapIndex)
  );
}

/**
 * Associate leftover taps/targets only after primary DP assignments are fixed.
 * Each residual tap belongs to one onset cell; nearest residual tap wins in
 * that cell, with capture sequence as the deterministic equal-error tie-break.
 * Pairs that cross a primary anchor are intentionally not introduced.
 */
function solveResidualAssociations(
  targets: readonly TapTarget[],
  taps: readonly TapMatchInput[],
  primaryPairs: readonly Pair[]
): readonly Pair[] {
  if (targets.length === 0 || taps.length === 0) return [];

  const primaryTargetIndices = new Set(
    primaryPairs.map(pair => pair.targetIndex)
  );
  const primaryTapIndices = new Set(primaryPairs.map(pair => pair.tapIndex));
  const tapsByCell = new Map<number, number[]>();

  taps.forEach((tap, tapIndex) => {
    if (primaryTapIndices.has(tapIndex)) return;
    const cellTargetIndex = findCellTargetIndex(tap.offsetMs, targets);
    if (cellTargetIndex === null) return;
    const cellTaps = tapsByCell.get(cellTargetIndex) ?? [];
    cellTaps.push(tapIndex);
    tapsByCell.set(cellTargetIndex, cellTaps);
  });

  const residualPairs: Pair[] = [];
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    if (primaryTargetIndices.has(targetIndex)) continue;
    const cellTaps = tapsByCell.get(targetIndex) ?? [];
    let bestTapIndex: number | undefined;
    let bestAbsoluteError = Number.POSITIVE_INFINITY;

    for (const tapIndex of cellTaps) {
      if (crossesPrimaryPair(targetIndex, tapIndex, primaryPairs)) continue;
      const errorMs = taps[tapIndex].offsetMs - targets[targetIndex].offsetMs;
      const absoluteError = Math.abs(errorMs);
      if (
        absoluteError < bestAbsoluteError ||
        (absoluteError === bestAbsoluteError &&
          (bestTapIndex === undefined ||
            taps[tapIndex].sequence < taps[bestTapIndex].sequence))
      ) {
        bestTapIndex = tapIndex;
        bestAbsoluteError = absoluteError;
      }
    }

    if (bestTapIndex !== undefined) {
      residualPairs.push(
        Object.freeze({
          targetIndex,
          tapIndex: bestTapIndex,
          errorMs: taps[bestTapIndex].offsetMs - targets[targetIndex].offsetMs,
          pass: false,
        })
      );
    }
  }
  return Object.freeze(residualPairs);
}

/**
 * Assign ordered taps to ordered onsets, one-to-one, using the approved
 * objective: most pass pairs, then diagnostic pairs, least absolute error,
 * then lexicographic (target index, capture sequence).
 */
export function matchTapRhythm(
  targets: readonly TapTarget[],
  taps: readonly TapMatchInput[]
): TapEvaluation {
  validateTargets(targets);
  validateTaps(taps);
  const solution = solveOrderedAlignment(targets, taps);
  const residualPairs = solveResidualAssociations(
    targets,
    taps,
    solution.pairs
  );
  const allPairs = [...solution.pairs, ...residualPairs];
  const pairByTarget = new Map<number, Pair>();
  const pairByTap = new Map<number, Pair>();
  for (const pair of allPairs) {
    pairByTarget.set(pair.targetIndex, pair);
    pairByTap.set(pair.tapIndex, pair);
  }

  const targetResults: readonly TapTargetResult[] = Object.freeze(
    targets.map((target, targetIndex) => {
      const pair = pairByTarget.get(targetIndex);
      if (pair === undefined) {
        return Object.freeze({
          targetIndex,
          targetId: target.id,
          status: "missing" as const,
          tapSequence: null,
          errorMs: null,
        });
      }
      const tap = taps[pair.tapIndex];
      const status = pair.pass
        ? "matched"
        : pair.errorMs < 0
          ? "early"
          : "late";
      return Object.freeze({
        targetIndex,
        targetId: target.id,
        status,
        tapSequence: tap.sequence,
        errorMs: pair.errorMs,
      });
    })
  );

  const tapResults: readonly TapCaptureResult[] = Object.freeze(
    taps.map((tap, tapIndex) => {
      const pair = pairByTap.get(tapIndex);
      if (pair === undefined) {
        return Object.freeze({
          sequence: tap.sequence,
          status: "extra" as const,
          targetIndex: null,
          errorMs: null,
        });
      }
      return Object.freeze({
        sequence: tap.sequence,
        status: pair.pass
          ? ("matched" as const)
          : pair.errorMs < 0
            ? ("early" as const)
            : ("late" as const),
        targetIndex: pair.targetIndex,
        errorMs: pair.errorMs,
      });
    })
  );

  const n = targets.length;
  const k = taps.length;
  const tp = solution.passPairs;
  const missing = targetResults.filter(
    result => result.status === "missing"
  ).length;
  const extra = tapResults.filter(result => result.status === "extra").length;
  const nearMiss = solution.diagnosticPairs - tp;
  const accuracyPercent = n === 0 ? null : (100 * 2 * tp) / (n + k);

  return Object.freeze({
    correct: n > 0 && tp === n && extra === 0,
    accuracyPercent,
    tp,
    n,
    k,
    missing,
    extra,
    nearMiss,
    farAssociation: residualPairs.length,
    targetResults,
    tapResults,
  });
}

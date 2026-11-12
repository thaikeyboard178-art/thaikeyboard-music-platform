import type { RhythmNotationMeasureGeometry } from "../notation/VexFlowRhythm";
import { deriveMeter } from "../rhythm/meters";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { TapRhythmExercise } from "../exercises/tapRhythm";

export type TapMarkerStatus = "matched" | "early" | "late" | "missing" | "extra";

export type TapMarkerProjection = Readonly<{
  status: TapMarkerStatus;
  tick: number;
  measureIndex: number;
  rowIndex: number;
  x: number;
  y: number;
  sequence: number | null;
  offsetMs: number | null;
  errorMs: number | null;
  targetId: string | null;
}>;

type EngravingAnchor = Readonly<{ tick: number; x: number }>;

function xAtTick(
  geometry: RhythmNotationMeasureGeometry,
  tick: number
): number {
  const points: EngravingAnchor[] = [
    ...geometry.noteAnchors.map(anchor => ({
      tick: anchor.tick,
      x: anchor.x,
    })),
    { tick: geometry.endTicks, x: geometry.xEnd },
  ].sort((left, right) => left.tick - right.tick);

  if (points.length === 0) return geometry.xStart;
  if (points.length === 1) return points[0].x;

  let rightIndex = points.findIndex(point => point.tick >= tick);
  if (rightIndex === -1) rightIndex = points.length - 1;
  else if (rightIndex === 0) rightIndex = 1;
  const left = points[rightIndex - 1];
  const right = points[rightIndex];
  const tickSpan = right.tick - left.tick;
  if (tickSpan === 0) return right.x;
  const ratio = (tick - left.tick) / tickSpan;
  return left.x + ratio * (right.x - left.x);
}

function locationForTick(
  tick: number,
  geometries: readonly RhythmNotationMeasureGeometry[]
): Readonly<{
  geometry: RhythmNotationMeasureGeometry;
  x: number;
}> | null {
  if (geometries.length === 0) return null;
  const first = geometries[0];
  const last = geometries[geometries.length - 1];
  const selected =
    tick < first.startTicks
      ? first
      : tick >= last.endTicks
        ? last
        : (geometries.find(
            geometry => tick >= geometry.startTicks && tick < geometry.endTicks
          ) ?? last);
  return Object.freeze({ geometry: selected, x: xAtTick(selected, tick) });
}

function actualTickForOffset(
  offsetMs: number,
  exercise: TapRhythmExercise,
  pulseTicks: number
): number {
  return (offsetMs * exercise.pattern.tempo.pulseBpm * pulseTicks) / 60_000;
}

/**
 * Projects only the sealed result's classifications and captures. Timing is
 * converted through the exercise's canonical meter/tempo; no matcher or clock
 * mapping is run by this presentation helper.
 */
export function projectTapMarkers(
  exercise: TapRhythmExercise,
  result: TapAttemptResult,
  geometries: readonly RhythmNotationMeasureGeometry[]
): readonly TapMarkerProjection[] {
  const evaluation = result.evaluation;
  if (result.status !== "completed" || evaluation === null || geometries.length === 0) {
    return Object.freeze([]);
  }

  const { pulseTicks, measureTicks } = deriveMeter(exercise.pattern.meter);
  const totalTicks = exercise.pattern.measures.length * measureTicks;
  const targetMarkers: TapMarkerProjection[] = [];

  for (const targetResult of evaluation.targetResults) {
    const target = exercise.targets.find(item => item.id === targetResult.targetId);
    if (!target) continue;

    let tick = target.tick;
    let sequence: number | null = null;
    let offsetMs: number | null = null;
    if (targetResult.status !== "missing") {
      sequence = targetResult.tapSequence;
      if (sequence === null) continue;
      const tap = result.taps.find(item => item.sequence === sequence);
      if (!tap) continue;
      offsetMs = tap.offsetMs;
      tick = actualTickForOffset(tap.offsetMs, exercise, pulseTicks);
    }

    const location = locationForTick(tick, geometries);
    if (!location) continue;
    targetMarkers.push(
      Object.freeze({
        status: targetResult.status,
        tick,
        measureIndex: location.geometry.measureIndex,
        rowIndex: location.geometry.rowIndex,
        x: location.x,
        y: location.geometry.staveBounds.bottom + 22,
        sequence,
        offsetMs,
        errorMs: targetResult.errorMs,
        targetId: target.id,
      })
    );
  }

  const extraMarkers: TapMarkerProjection[] = [];
  for (const tapResult of evaluation.tapResults) {
    if (tapResult.status !== "extra") continue;
    const tap = result.taps.find(item => item.sequence === tapResult.sequence);
    if (!tap) continue;
    const tick = actualTickForOffset(tap.offsetMs, exercise, pulseTicks);
    const location = locationForTick(tick, geometries);
    if (!location) continue;
    extraMarkers.push(
      Object.freeze({
        status: "extra",
        tick,
        measureIndex: location.geometry.measureIndex,
        rowIndex: location.geometry.rowIndex,
        x: location.x,
        y: location.geometry.staveBounds.bottom + 36,
        sequence: tap.sequence,
        offsetMs: tap.offsetMs,
        errorMs: tapResult.errorMs,
        targetId: null,
      })
    );
  }

  return Object.freeze(
    [...targetMarkers, ...extraMarkers].sort(
      (left, right) =>
        left.tick - right.tick ||
        (left.sequence ?? Number.MAX_SAFE_INTEGER) -
          (right.sequence ?? Number.MAX_SAFE_INTEGER)
    )
  );
}

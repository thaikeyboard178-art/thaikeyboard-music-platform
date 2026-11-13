// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { sealTapAttempt } from "../exercises/tapCompletion";
import { matchTapRhythm } from "../exercises/tapMatcher";
import {
  createTapTargets,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
import {
  renderRhythmNotation,
  type RhythmNotationMeasureGeometry,
} from "../notation/VexFlowRhythm";
import { RHYTHM_NOTATION_EXAMPLES } from "../notation/examples";
import { deriveMeter } from "../rhythm/meters";
import { projectTapMarkers } from "./tapMarkerProjection";

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () =>
      ({
        measureText: (text: string) => ({ width: text.length * 7 }),
      }) as unknown as CanvasRenderingContext2D,
  });
});

function fourMeasureExercise(): TapRhythmExercise {
  const source = RHYTHM_NOTATION_EXAMPLES[0].pattern;
  const measures = Object.freeze(
    Array.from({ length: 4 }, (_, measureIndex) => {
      const sourceMeasure =
        source.measures[measureIndex % source.measures.length];
      return Object.freeze({
        id: `result-measure-${measureIndex}`,
        segments: Object.freeze(
          sourceMeasure.segments.map(segment =>
            Object.freeze({
              ...segment,
              id: `result-${measureIndex}-${segment.id}`,
              duration: Object.freeze({ ...segment.duration }),
              ...(segment.tieGroupId === undefined
                ? {}
                : {
                    tieGroupId: `result-block-${Math.floor(measureIndex / 2)}-${segment.tieGroupId}`,
                  }),
            })
          )
        ),
      });
    })
  );
  const pattern = Object.freeze({
    id: "four-measure-tap-marker-test",
    meter: source.meter,
    tempo: source.tempo,
    measures,
  });
  const targets = createTapTargets(pattern, 240);
  return Object.freeze({
    id: "four-measure-tap-marker-test-exercise",
    kind: "tap-rhythm",
    track: 4,
    section: "practice",
    pattern,
    gridTicks: 240,
    targets,
  });
}

function resultWithFiveStatuses(exercise: TapRhythmExercise) {
  const [first, second, third] = exercise.targets;
  if (!first || !second || !third)
    throw new Error("Fixture needs three targets");
  const taps = Object.freeze([
    Object.freeze({
      sequence: 0,
      offsetMs: first.offsetMs - first.passMs - 1,
    }),
    Object.freeze({ sequence: 1, offsetMs: second.offsetMs }),
    Object.freeze({
      sequence: 2,
      offsetMs: third.offsetMs + third.passMs + 1,
    }),
    Object.freeze({
      sequence: 3,
      offsetMs: exercise.targets[exercise.targets.length - 1].offsetMs + 2000,
    }),
    Object.freeze({
      sequence: 4,
      offsetMs: exercise.targets[exercise.targets.length - 1].offsetMs + 2050,
    }),
  ]);
  const evaluation = matchTapRhythm(exercise.targets, taps);
  return sealTapAttempt({
    exerciseId: exercise.id,
    generation: 1,
    mode: "practice",
    status: "completed",
    reason: null,
    targetTicks: Object.freeze(exercise.targets.map(target => target.tick)),
    taps,
    evaluation,
    accuracyPercent: evaluation.accuracyPercent,
    rawCaptures: [],
  });
}

function renderedGeometry(exercise: TapRhythmExercise) {
  const container = document.createElement("div");
  return renderRhythmNotation(container, exercise.pattern, {
    width: 420,
    measuresPerRow: 1,
  }).geometry;
}

describe("projectTapMarkers", () => {
  it("uses immutable production targets and matcher classifications at real rendered time anchors", () => {
    const exercise = fourMeasureExercise();
    const result = resultWithFiveStatuses(exercise);
    const geometry = renderedGeometry(exercise);
    const before = JSON.stringify({ exercise, result });
    const markers = projectTapMarkers(exercise, result, geometry);
    const after = JSON.stringify({ exercise, result });

    expect(new Set(markers.map(marker => marker.status))).toEqual(
      new Set(["matched", "early", "late", "extra"])
    );
    expect(
      result.evaluation?.targetResults.some(row => row.status === "missing")
    ).toBe(true);
    expect(markers.some(marker => marker.status === "missing")).toBe(false);
    expect(after).toBe(before);
    expect(Object.isFrozen(markers)).toBe(true);
    expect(Object.isFrozen(markers[0])).toBe(true);

    const matched = markers.find(marker => marker.status === "matched")!;
    const actualTap = result.taps.find(
      tap => tap.sequence === matched.sequence
    )!;
    const target = exercise.targets.find(item => item.id === matched.targetId)!;
    expect(matched.offsetMs).toBe(actualTap.offsetMs);
    expect(matched.errorMs).toBe(
      result.evaluation?.targetResults.find(item => item.targetId === target.id)
        ?.errorMs
    );
    expect(matched.tick).toBeCloseTo(
      (actualTap.offsetMs *
        exercise.pattern.tempo.pulseBpm *
        deriveMeter(exercise.pattern.meter).pulseTicks) /
        60_000
    );

    const firstMeasure = geometry[0];
    expect(
      firstMeasure.noteAnchors.some(anchor =>
        exercise.pattern.measures[0].segments.some(
          segment => segment.id === anchor.segmentId && segment.kind === "rest"
        )
      )
    ).toBe(true);
    const points = [
      ...firstMeasure.noteAnchors.map(anchor => ({
        tick: anchor.tick,
        x: anchor.x,
      })),
      { tick: firstMeasure.endTicks, x: firstMeasure.xEnd },
    ];
    const firstPoint = points[0];
    const finalPoint = points[points.length - 1];
    expect(
      points.slice(1, -1).some(point => {
        const proportionalX =
          firstPoint.x +
          ((point.tick - firstPoint.tick) /
            (finalPoint.tick - firstPoint.tick)) *
            (finalPoint.x - firstPoint.x);
        return Math.abs(point.x - proportionalX) > 0.5;
      })
    ).toBe(true);

    for (const marker of markers) {
      const measure = geometry[marker.measureIndex];
      const local = pointsForMeasure(measure);
      const expectedX = interpolateEngravedX(local, marker.tick);
      expect(marker.x).toBeCloseTo(expectedX, 6);
    }
  });

  it("keeps early taps before the first note, omits missing targets, and projects a captured barline onset correctly", () => {
    const exercise = fourMeasureExercise();
    const result = resultWithFiveStatuses(exercise);
    const geometry = renderedGeometry(exercise);
    const markers = projectTapMarkers(exercise, result, geometry);
    const firstAnchor = geometry[0].noteAnchors[0];
    const early = markers.find(marker => marker.status === "early")!;
    expect(early.measureIndex).toBe(0);
    expect(early.x).toBeLessThan(firstAnchor.x);

    const measureTicks = deriveMeter(exercise.pattern.meter).measureTicks;
    const barlineTarget = exercise.targets.find(
      target => target.tick === 2 * measureTicks
    );
    expect(barlineTarget).toBeDefined();
    expect(markers.some(marker => marker.targetId === barlineTarget?.id)).toBe(
      false
    );
    const barlineTap = {
      sequence: 41,
      offsetMs: barlineTarget!.offsetMs,
    };
    const barlineEvaluation = matchTapRhythm(exercise.targets, [barlineTap]);
    const barlineResult = sealTapAttempt({
      exerciseId: exercise.id,
      generation: 2,
      mode: "practice",
      status: "completed",
      reason: null,
      targetTicks: exercise.targets.map(target => target.tick),
      taps: [barlineTap],
      evaluation: barlineEvaluation,
      accuracyPercent: barlineEvaluation.accuracyPercent,
      rawCaptures: [],
    });
    const barlineMarker = projectTapMarkers(
      exercise,
      barlineResult,
      geometry
    ).find(marker => marker.targetId === barlineTarget?.id)!;
    expect(barlineMarker.measureIndex).toBe(2);
    expect(barlineMarker.rowIndex).toBe(2);

    const extra = markers.find(marker => marker.status === "extra")!;
    expect(extra.measureIndex).toBe(3);
    expect(extra.rowIndex).toBe(3);
    expect(extra.tick).toBeGreaterThan(4 * measureTicks);
    expect(extra.x).toBeGreaterThan(geometry[3].xEnd);
    expect(extra.y).toBe(geometry[3].staveBounds.bottom + 22);
    const roundOneMarkers = projectTapMarkers(
      exercise,
      result,
      geometry,
      1
    );
    const roundOneExtra = roundOneMarkers.find(
      marker => marker.status === "extra"
    )!;
    expect(roundOneExtra.y).toBe(geometry[3].staveBounds.bottom + 44);
  });
});

function pointsForMeasure(measure: RhythmNotationMeasureGeometry) {
  return [
    ...measure.noteAnchors.map(anchor => ({ tick: anchor.tick, x: anchor.x })),
    { tick: measure.endTicks, x: measure.xEnd },
  ].sort((left, right) => left.tick - right.tick);
}

function interpolateEngravedX(
  points: readonly Readonly<{ tick: number; x: number }>[],
  tick: number
): number {
  let rightIndex = points.findIndex(point => point.tick >= tick);
  if (rightIndex === -1) rightIndex = points.length - 1;
  else if (rightIndex === 0) rightIndex = 1;
  const left = points[rightIndex - 1];
  const right = points[rightIndex];
  return (
    left.x +
    ((tick - left.tick) / (right.tick - left.tick)) * (right.x - left.x)
  );
}

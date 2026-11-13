import { describe, expect, it } from "vitest";
import { createRhythmAudioPlan } from "../audio/plan";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { deriveMeter } from "../rhythm/meters";
import { requireValidRhythmPattern } from "../rhythm/validate";
import {
  assertLevelConstraints,
  generateRhythmPattern,
  patternMetrics,
  type RhythmGenerationConfig,
} from "./generator";
import { policyForLevel } from "./levels";
import { projectRhythmNotation } from "../notation/projection";
import type { RhythmMeter, RhythmPattern, RhythmTrack } from "../types";
import {
  createTapRhythmExercise,
  generateTapRhythmExercise,
} from "../exercises/tapRhythm";
import { matchTapRhythm } from "../exercises/tapMatcher";

const sevenMeters: readonly Readonly<{
  name: string;
  track: RhythmTrack;
  meter: RhythmMeter;
  focus: NonNullable<RhythmGenerationConfig["focus"]>;
  pulseBpm: number;
}>[] = [
  {
    name: "2/4",
    track: 3,
    meter: { numerator: 2, denominator: 4 },
    focus: "dots",
    pulseBpm: 72,
  },
  {
    name: "3/4",
    track: 3,
    meter: { numerator: 3, denominator: 4 },
    focus: "combined",
    pulseBpm: 72,
  },
  {
    name: "4/4",
    track: 4,
    meter: { numerator: 4, denominator: 4 },
    focus: "dots",
    pulseBpm: 72,
  },
  {
    name: "3/8",
    track: 6,
    meter: { numerator: 3, denominator: 8 },
    focus: "basic",
    pulseBpm: 60,
  },
  {
    name: "6/8",
    track: 6,
    meter: { numerator: 6, denominator: 8 },
    focus: "basic",
    pulseBpm: 60,
  },
  {
    name: "9/8",
    track: 6,
    meter: { numerator: 9, denominator: 8 },
    focus: "basic",
    pulseBpm: 60,
  },
  {
    name: "2/2",
    track: "bonus",
    meter: { numerator: 2, denominator: 2 },
    focus: "basic",
    pulseBpm: 60,
  },
];

const supportedBarCounts = [1, 2, 4] as const;

function crossBarTiePairs(pattern: RhythmPattern) {
  return pattern.measures.flatMap((measure, measureIndex) => {
    if (measureIndex === 0) return [];
    const previous = pattern.measures[measureIndex - 1].segments.at(-1);
    const current = measure.segments[0];
    if (
      previous?.tieGroupId === undefined ||
      previous.tieGroupId !== current?.tieGroupId
    ) {
      return [];
    }
    return [
      {
        from: previous.id,
        to: current.id,
        fromMeasure: measureIndex - 1,
        toMeasure: measureIndex,
      },
    ];
  });
}

describe("independent multibar Tap Rhythm production pipeline", () => {
  it("keeps combined 2/4 feasible across multiple bars and rejects only one bar", () => {
    expect(() =>
      generateRhythmPattern({
        seed: "combined-two-four-single",
        level: 3,
        meter: { numerator: 2, denominator: 4 },
        bars: 1,
        focus: "combined",
      })
    ).toThrow(/single 2\/4 measure.*required rest/i);

    for (const bars of [2, 4] as const) {
      const config: RhythmGenerationConfig = {
        seed: `combined-two-four-multibar-${bars}`,
        level: 3,
        meter: { numerator: 2, denominator: 4 },
        bars,
        focus: "combined",
      };
      const pattern = generateRhythmPattern(config);
      expect(pattern.measures).toHaveLength(bars);
      expect(patternMetrics(pattern)).toMatchObject({
        hasDot: true,
        hasTie: true,
        hasFine: false,
      });
      expect(() => assertLevelConstraints(pattern, config)).not.toThrow();
    }
  });

  it("executes generation, canonical validation, timeline, targets, audio and notation for all seven meters at 1/2/4 bars", () => {
    for (const entry of sevenMeters) {
      for (const bars of supportedBarCounts) {
        const seed = `multibar-production-${entry.name}-${bars}`;
        const exercise = generateTapRhythmExercise({
          track: entry.track,
          seed,
          meter: entry.meter,
          bars,
          focus: entry.focus,
          pulseBpm: entry.pulseBpm,
        });
        const pattern = requireValidRhythmPattern(exercise.pattern);
        const config: RhythmGenerationConfig = {
          seed,
          level: entry.track,
          meter: entry.meter,
          bars,
          focus: entry.focus,
          pulseBpm: entry.pulseBpm,
        };
        assertLevelConstraints(pattern, config);

        const timeline = deriveRhythmTimeline(pattern, exercise.gridTicks);
        const audio = createRhythmAudioPlan(pattern, "both");
        const notation = projectRhythmNotation(pattern);
        const metrics = patternMetrics(pattern);
        const measureIds = pattern.measures.map(measure => measure.id);
        const segmentIds = pattern.measures.flatMap(measure =>
          measure.segments.map(segment => segment.id)
        );
        const expectedTargetProjection = timeline.soundingSpans.map(span => ({
          id: `pattern:${span.segmentIds[0]}`,
          tick: span.startTicks,
        }));

        expect(pattern.measures).toHaveLength(bars);
        expect(new Set(measureIds).size).toBe(bars);
        expect(new Set(segmentIds).size).toBe(segmentIds.length);
        expect(timeline.totalTicks).toBe(timeline.meter.measureTicks * bars);
        expect(audio.totalTicks).toBe(timeline.totalTicks);
        expect(notation.timeline.totalTicks).toBe(timeline.totalTicks);
        expect(audio.visualCounting).toHaveLength(
          deriveMeter(entry.meter).pulseCount * bars
        );
        expect(notation.segments).toHaveLength(timeline.segments.length);
        expect(metrics.restsPerBar).toHaveLength(bars);
        expect(
          metrics.restsPerBar.every(
            count => count <= policyForLevel(entry.track).maxRestsPerBar
          )
        ).toBe(true);
        expect(timeline.onsets.length).toBeGreaterThan(0);
        expect(exercise.targets.map(({ id, tick }) => ({ id, tick }))).toEqual(
          expectedTargetProjection
        );
        expect(
          audio.onsetReferences.map(({ id, tick }) => ({ id, tick }))
        ).toEqual(expectedTargetProjection);
        expect(
          notation.segments
            .filter(segment => segment.isOnset)
            .map(segment => segment.startTicks)
        ).toEqual(exercise.targets.map(target => target.tick));
        expect(
          exercise.targets.every(
            target => target.tick >= 0 && target.tick < timeline.totalTicks
          )
        ).toBe(true);

        const exactEvaluation = matchTapRhythm(
          exercise.targets,
          exercise.targets.map((target, sequence) => ({
            sequence,
            offsetMs: target.offsetMs,
          }))
        );
        expect(exactEvaluation).toMatchObject({
          correct: true,
          accuracyPercent: 100,
          tp: exercise.targets.length,
          n: exercise.targets.length,
          k: exercise.targets.length,
          missing: 0,
          extra: 0,
        });
      }
    }
  });

  it("generates eligible four-bar Level 4 and Level 6 cross-bar ties without moving the rest of the exercise", () => {
    const cases = [
      {
        track: 4,
        seed: "mb-4-0",
        meter: { numerator: 4, denominator: 4 },
        focus: "ties",
        pulseBpm: 72,
      },
      {
        track: 6,
        seed: "mb-6-0",
        meter: { numerator: 6, denominator: 8 },
        focus: "ties",
        pulseBpm: 60,
      },
    ] as const;

    for (const entry of cases) {
      const exercise = generateTapRhythmExercise({
        ...entry,
        bars: 4,
      });
      const pairs = crossBarTiePairs(exercise.pattern);
      expect(exercise.pattern.measures).toHaveLength(4);
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toMatchObject({ fromMeasure: 0, toMeasure: 1 });
      expect(exercise.pattern.measures[0].segments.at(-1)?.id).toBe(
        pairs[0].from
      );
      expect(exercise.pattern.measures[1].segments[0].id).toBe(pairs[0].to);
      expect(() =>
        assertLevelConstraints(exercise.pattern, {
          seed: entry.seed,
          level: entry.track,
          meter: entry.meter,
          bars: 4,
          focus: entry.focus,
          pulseBpm: entry.pulseBpm,
        })
      ).not.toThrow();
    }
  });

  it("omits generated rests and the four-bar tie continuation from targets and caps targets at the selected exercise length", () => {
    const exercise = generateTapRhythmExercise({
      track: 4,
      seed: "mb-4-0",
      meter: { numerator: 4, denominator: 4 },
      bars: 4,
      focus: "ties",
      pulseBpm: 72,
    });
    const timeline = deriveRhythmTimeline(exercise.pattern);
    const continuation = timeline.segments.find(
      segment => segment.measureIndex === 1 && segment.tieRole === "end"
    );
    const restIds = timeline.segments
      .filter(segment => segment.kind === "rest")
      .map(segment => `pattern:${segment.segmentId}`);
    const targetIds = exercise.targets.map(target => target.id);

    expect(exercise.pattern.measures).toHaveLength(4);
    expect(continuation).toBeDefined();
    expect(continuation?.isOnset).toBe(false);
    expect(targetIds).not.toContain(`pattern:${continuation?.segmentId}`);
    expect(exercise.targets.map(target => target.tick)).not.toContain(
      continuation?.absoluteStartTicks
    );
    expect(targetIds.some(id => restIds.includes(id))).toBe(false);
    expect(
      exercise.targets.every(target => target.tick < timeline.totalTicks)
    ).toBe(true);
    expect(timeline.totalTicks).toBe(timeline.meter.measureTicks * 4);
  });

  it("keeps four-bar cross-bar tie suppression for Level 5 and Bonus", () => {
    const level5 = generateRhythmPattern({
      level: 5,
      seed: "multibar-level5-no-crossbar",
      meter: { numerator: 4, denominator: 4 },
      bars: 4,
      focus: "ties",
      pulseBpm: 72,
    });
    const bonus = generateRhythmPattern({
      level: "bonus",
      seed: "multibar-bonus-no-crossbar",
      meter: { numerator: 2, denominator: 2 },
      bars: 4,
      focus: "basic",
      pulseBpm: 60,
    });

    expect(level5.measures).toHaveLength(4);
    expect(bonus.measures).toHaveLength(4);
    expect(crossBarTiePairs(level5)).toEqual([]);
    expect(crossBarTiePairs(bonus)).toEqual([]);
    expect(() =>
      assertLevelConstraints(level5, {
        level: 5,
        seed: "multibar-level5-no-crossbar",
        meter: { numerator: 4, denominator: 4 },
        bars: 4,
        focus: "ties",
        pulseBpm: 72,
      })
    ).not.toThrow();
    expect(() =>
      assertLevelConstraints(bonus, {
        level: "bonus",
        seed: "multibar-bonus-no-crossbar",
        meter: { numerator: 2, denominator: 2 },
        bars: 4,
        focus: "basic",
        pulseBpm: 60,
      })
    ).not.toThrow();
  });

  it("computes Formula B over all four measures instead of averaging per-measure results", () => {
    const quarter = { denominator: 4, dots: 0 } as const;
    const pattern: RhythmPattern = {
      id: "aggregate-four-measure-fixture",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "m1s1", kind: "note", duration: quarter },
            { id: "m1s2", kind: "note", duration: quarter },
            { id: "m1s3", kind: "note", duration: quarter },
            { id: "m1s4", kind: "note", duration: quarter },
          ],
        },
        ...[2, 3, 4].map(measureIndex => ({
          id: `m${measureIndex}`,
          segments: [
            {
              id: `m${measureIndex}s1`,
              kind: "note" as const,
              duration: { denominator: 1, dots: 0 } as const,
            },
          ],
        })),
      ],
    };
    const exercise = createTapRhythmExercise({ track: 3, pattern });
    const omittedTick = exercise.targets[1].tick;
    const taps = exercise.targets
      .filter(target => target.tick !== omittedTick)
      .map((target, sequence) => ({ sequence, offsetMs: target.offsetMs }));
    taps.push({
      sequence: taps.length,
      offsetMs: exercise.targets.at(-1)!.offsetMs + 500,
    });
    const evaluation = matchTapRhythm(exercise.targets, taps);

    expect(exercise.pattern.measures).toHaveLength(4);
    expect(evaluation).toMatchObject({
      correct: false,
      tp: 6,
      n: 7,
      k: 7,
      missing: 1,
      extra: 1,
    });
    expect(evaluation.accuracyPercent).toBeCloseTo(85.71428571428571, 10);
    expect(evaluation.accuracyPercent).not.toBeCloseTo(93.75, 8);
  });

  it("rejects unsupported bar counts while accepting only 1, 2, and 4", () => {
    for (const bars of supportedBarCounts) {
      expect(() =>
        generateRhythmPattern({ level: 3, seed: `allowed-bars-${bars}`, bars })
      ).not.toThrow();
    }
    expect(() =>
      generateRhythmPattern({
        level: 3,
        seed: "unsupported-three-bars",
        bars: 3 as never,
      })
    ).toThrow(RangeError);
  });
});

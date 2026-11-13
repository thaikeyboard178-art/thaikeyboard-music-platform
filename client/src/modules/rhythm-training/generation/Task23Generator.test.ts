import { describe, expect, it } from "vitest";
import { createRhythmAudioPlan } from "../audio/plan";
import {
  createTapTargets,
  generateTapRhythmExercise,
} from "../exercises/tapRhythm";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { requireValidRhythmPattern } from "../rhythm/validate";
import type { RhythmMeter, RhythmPattern, RhythmTrack } from "../types";
import {
  assertLevelConstraints,
  generateRhythmPattern,
  patternMetrics,
  type RhythmGenerationConfig,
} from "./generator";

const simpleMeters: readonly RhythmMeter[] = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
];
const barCounts = [1, 2, 4] as const;

function expectPerMeasureRestRules(
  pattern: ReturnType<typeof generateRhythmPattern>
): void {
  for (const measure of pattern.measures) {
    const rests = measure.segments
      .map((segment, index) => ({ segment, index }))
      .filter(item => item.segment.kind === "rest");
    expect(rests).toHaveLength(1);
    expect(
      rests.every(({ index }) => measure.segments[index - 1]?.kind !== "rest")
    ).toBe(true);
  }
}

function expectGenericPerMeasureRestRules(
  pattern: ReturnType<typeof generateRhythmPattern>
): void {
  for (const measure of pattern.measures) {
    const rests = measure.segments
      .map((segment, index) => ({ segment, index }))
      .filter(item => item.segment.kind === "rest");
    expect(rests.length).toBeGreaterThanOrEqual(1);
    expect(rests.length).toBeLessThanOrEqual(2);
    expect(
      rests.every(({ index }) => measure.segments[index - 1]?.kind !== "rest")
    ).toBe(true);
  }
}

function exerciseConfig(
  level: RhythmTrack,
  focus: RhythmGenerationConfig["focus"],
  meter: RhythmMeter,
  bars: 1 | 2 | 4,
  seed: string
): RhythmGenerationConfig {
  return { level, focus, meter, bars, seed };
}

function expectCanonicalAudioAndTapPath(
  config: RhythmGenerationConfig
): ReturnType<typeof generateRhythmPattern> {
  const exercise = generateTapRhythmExercise({
    track: config.level,
    seed: config.seed,
    meter: config.meter,
    bars: config.bars,
    focus: config.focus,
    pulseBpm: config.pulseBpm,
  });
  const pattern = exercise.pattern;
  const canonical = requireValidRhythmPattern(pattern);
  const timeline = deriveRhythmTimeline(canonical);
  const audio = createRhythmAudioPlan(canonical, "both");

  expectPerMeasureRestRules(canonical);
  expect(timeline.totalTicks).toBe(
    timeline.meter.measureTicks * canonical.measures.length
  );
  expect(timeline.onsets.length).toBeGreaterThan(0);
  expect(audio.toneEvents.map(event => event.tick)).toEqual(timeline.onsets);
  expect(audio.durationSeconds).toBeGreaterThan(0);

  expect(exercise.pattern).toEqual(canonical);
  expect(exercise.targets.map(target => target.tick)).toEqual(timeline.onsets);
  return canonical;
}

describe("Task 23 production rhythm generation", () => {
  it.each(
    simpleMeters.flatMap(meter =>
      barCounts.flatMap(bars =>
        (["snap", "sandwich"] as const).map(focus => ({
          meter,
          bars,
          focus,
        }))
      )
    )
  )(
    "generates Level 4 $focus motif in $meter.numerator/4 with $bars bars and exact audio timing",
    ({ meter, bars, focus }) => {
      const pattern = expectCanonicalAudioAndTapPath(
        exerciseConfig(
          4,
          focus,
          meter,
          bars,
          `task23-level4-${focus}-${meter.numerator}-${bars}`
        )
      );
      const metrics = patternMetrics(pattern);
      expect(metrics.hasTuplets).toBe(false);
      expect(focus === "snap" ? metrics.hasSnap : metrics.hasSandwich).toBe(
        true
      );
    }
  );

  it.each(
    ([3, 4] as const).flatMap(numerator =>
      barCounts.map(bars => ({ numerator, bars }))
    )
  )(
    "generates real Level 5 quarter triplets in $numerator/4 with $bars bars",
    ({ numerator, bars }) => {
      const pattern = expectCanonicalAudioAndTapPath({
        level: 5,
        focus: "quarter-triplets",
        meter: { numerator, denominator: 4 },
        bars,
        seed: `task23-quarter-triplet-${numerator}-${bars}`,
      });
      const timeline = deriveRhythmTimeline(pattern);
      const members = timeline.segments.filter(
        segment => segment.tupletGroup !== undefined
      );
      expect(members).toHaveLength(3);
      expect(members.map(segment => segment.durationTicks)).toEqual([
        320, 320, 320,
      ]);
      expect(
        members[1].absoluteStartTicks - members[0].absoluteStartTicks
      ).toBe(320);
      expect(
        members[2].absoluteStartTicks - members[1].absoluteStartTicks
      ).toBe(320);
    }
  );

  it.each(barCounts)(
    "rejects mathematically impossible Level 5 quarter triplets in 2/4 with %s bars instead of omitting rests",
    bars => {
      expect(() =>
        generateRhythmPattern({
          level: 5,
          focus: "quarter-triplets",
          meter: { numerator: 2, denominator: 4 },
          bars,
          seed: `task23-impossible-quarter-2-4-${bars}`,
        })
      ).toThrow(/fill a 2\/4 measure exactly.*1–2 rests/i);
    }
  );

  it.each(
    simpleMeters.flatMap(meter => barCounts.map(bars => ({ meter, bars })))
  )(
    "generates actual 160-tick Level 5 eighth-triplet members in $meter.numerator/4 with $bars bars",
    ({ meter, bars }) => {
      const pattern = expectCanonicalAudioAndTapPath({
        level: 5,
        focus: "eighth-triplets",
        meter,
        bars,
        seed: `task23-eighth-triplet-${meter.numerator}-${bars}`,
      });
      const timeline = deriveRhythmTimeline(pattern);
      const members = timeline.segments.filter(
        segment => segment.tupletGroup !== undefined
      );
      expect(members).toHaveLength(3);
      expect(members.map(segment => segment.durationTicks)).toEqual([
        160, 160, 160,
      ]);
      expect(
        members[1].absoluteStartTicks - members[0].absoluteStartTicks
      ).toBe(160);
      expect(
        members[2].absoluteStartTicks - members[1].absoluteStartTicks
      ).toBe(160);
    }
  );

  it.each(
    simpleMeters.flatMap(meter => barCounts.map(bars => ({ meter, bars })))
  )(
    "combines a Level 5 triplet with learned vocabulary in $meter.numerator/4 with $bars bars without exceeding two sources",
    ({ meter, bars }) => {
      const pattern = expectCanonicalAudioAndTapPath({
        level: 5,
        focus: "triplet-combined",
        meter,
        bars,
        seed: `task23-combined-triplet-${meter.numerator}-${bars}`,
      });
      const metrics = patternMetrics(pattern);
      expect(metrics.hasTuplets).toBe(true);
      expect(metrics.hasTie || metrics.hasFine || metrics.hasDotConcept).toBe(
        true
      );
      expect(metrics.sourceCount).toBeLessThanOrEqual(2);
    }
  );

  it("keeps Level 4 integrated progression inside learned vocabulary and excludes tuplets", () => {
    const observations = new Set<string>();
    for (let index = 0; index < 30; index += 1) {
      const pattern = expectCanonicalAudioAndTapPath({
        level: 4,
        focus: "integrated",
        meter: { numerator: 4, denominator: 4 },
        seed: `task23-level4-integrated-${index}`,
      });
      const metrics = patternMetrics(pattern);
      expect(metrics.hasTuplets).toBe(false);
      expect(metrics.sourceCount).toBeLessThanOrEqual(2);
      if (metrics.hasDotConcept) observations.add("dot");
      if (metrics.hasTie) observations.add("tie");
      if (metrics.hasFine) observations.add("sixteenth");
      if (metrics.hasSyncopation) observations.add("syncopation");
    }
    expect([...observations]).toEqual(
      expect.arrayContaining(["dot", "tie", "sixteenth"])
    );
    const tiesWithSixteenths = expectCanonicalAudioAndTapPath({
      level: 4,
      focus: "ties",
      meter: { numerator: 4, denominator: 4 },
      seed: "task23-level4-retained-dot-tie-tap-roundtrip",
    });
    const tieMetrics = patternMetrics(tiesWithSixteenths);
    expect(tieMetrics.hasTie).toBe(true);
    expect(tieMetrics.hasFine).toBe(true);
    expect(tieMetrics.sourceCount).toBeLessThanOrEqual(2);
  });

  it("never emits a basic-only Level 5 exercise across supported focus and meter combinations", () => {
    const meters = [
      { numerator: 2, denominator: 4 },
      { numerator: 3, denominator: 4 },
      { numerator: 4, denominator: 4 },
    ] as const;
    const focuses = [
      "quarter-triplets",
      "eighth-triplets",
      "triplet-combined",
      "snap",
      "sandwich",
      "integrated",
    ] as const;
    for (const focus of focuses) {
      for (const meter of meters) {
        for (const bars of barCounts) {
          if (focus === "quarter-triplets" && meter.numerator === 2) {
            expect(() =>
              generateRhythmPattern({
                level: 5,
                focus,
                meter,
                bars,
                seed: `l5-gate-impossible-${focus}-${meter.numerator}-${bars}`,
              })
            ).toThrow(/quarter-note triplets fill a 2\/4 measure/i);
            continue;
          }
          const pattern = generateRhythmPattern({
            level: 5,
            focus,
            meter,
            bars,
            seed: `l5-gate-${focus}-${meter.numerator}-${bars}`,
          });
          const metrics = patternMetrics(pattern);
          expect(
            metrics.hasDotConcept ||
              metrics.hasTie ||
              metrics.hasFine ||
              metrics.hasSyncopation
          ).toBe(true);
          expect(metrics.sourceCount).toBeLessThanOrEqual(2);
          expectGenericPerMeasureRestRules(pattern);
          const timeline = deriveRhythmTimeline(pattern);
          expect(
            createTapTargets(pattern, 120).map(target => target.tick)
          ).toEqual(timeline.onsets);
          if (focus.includes("triplet")) expect(metrics.hasTuplets).toBe(true);
          requireValidRhythmPattern(pattern);
        }
      }
    }
  });

  it("rejects an externally supplied Level5 quarter-triplet bar without Level3/4 content", () => {
    const group = {
      groupId: "triplet-1",
      actualNotes: 3 as const,
      normalNotes: 2 as const,
    };
    const basicOnly: RhythmPattern = {
      id: "l5-basic-only-fixture",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            ...Array.from({ length: 3 }, (_, index) => ({
              id: `triplet-${index + 1}`,
              kind: "note" as const,
              duration: { denominator: 4 as const, dots: 0 as const },
              tupletGroup: group,
            })),
            {
              id: "rest-1",
              kind: "rest" as const,
              duration: { denominator: 4 as const, dots: 0 as const },
            },
            {
              id: "basic-note-1",
              kind: "note" as const,
              duration: { denominator: 4 as const, dots: 0 as const },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertLevelConstraints(basicOnly, {
        level: 5,
        focus: "quarter-triplets",
        meter: { numerator: 4, denominator: 4 },
        seed: "l5-basic-only-fixture",
      })
    ).toThrow(/must include Level 3 or Level 4 vocabulary/i);
  });
});

describe("Level 4 graduated motif density", () => {
  it("generates real snap/sandwich cells and denser same-bar combinations within the L4 source budget", () => {
    const observedMotifs = new Set<string>();
    const observedCounts = new Set<number>();
    let integratedSixteenthExamples = 0;

    for (let seed = 0; seed < 64; seed += 1) {
      const pattern = expectCanonicalAudioAndTapPath({
        level: 4,
        focus: "integrated",
        meter: { numerator: 4, denominator: 4 },
        bars: 1,
        seed: `task24-level4-density-${seed}`,
      });
      const metrics = patternMetrics(pattern);
      if (!metrics.hasFine) continue;
      integratedSixteenthExamples += 1;
      const measure = pattern.measures[0];
      let motifCount = 0;
      for (let index = 0; index < measure.segments.length; index += 1) {
        const first = measure.segments[index];
        const second = measure.segments[index + 1];
        const third = measure.segments[index + 2];
        if (
          first.kind === "note" &&
          first.duration.denominator === 8 &&
          first.duration.dots === 1 &&
          second?.kind === "note" &&
          second.duration.denominator === 16 &&
          second.duration.dots === 0
        ) {
          motifCount += 1;
          observedMotifs.add("snap");
        }
        if (
          first.kind === "note" &&
          first.duration.denominator === 16 &&
          first.duration.dots === 0 &&
          second?.kind === "note" &&
          second.duration.denominator === 8 &&
          second.duration.dots === 0 &&
          third?.kind === "note" &&
          third.duration.denominator === 16 &&
          third.duration.dots === 0
        ) {
          motifCount += 1;
          observedMotifs.add("sandwich");
        }
      }

      expect(motifCount).toBeLessThanOrEqual(2);
      if (motifCount > 0) observedCounts.add(motifCount);
      expect(metrics.sourceCount).toBeLessThanOrEqual(2);
      expect(metrics.hasTuplets).toBe(false);
      expectPerMeasureRestRules(pattern);
    }

    expect(integratedSixteenthExamples).toBeGreaterThan(0);
    expect(observedMotifs).toEqual(new Set(["snap", "sandwich"]));
    expect(observedCounts).toContain(2);
  });
});

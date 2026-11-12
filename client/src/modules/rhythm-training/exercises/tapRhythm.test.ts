import { describe, expect, it } from "vitest";
import { createRhythmAudioPlan } from "../audio/plan";
import { generateRhythmPattern } from "../generation/generator";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { ticksToSeconds } from "../rhythm/meters";
import type { RhythmPattern } from "../types";
import {
  SEVEN_METER_RUNTIME_FIXTURES,
  mixedRuntimePattern,
} from "../runtime/fixtures";
import {
  createTapRhythmExercise,
  createTapTargets,
  evaluateTapRhythmAnswer,
  generateTapRhythmExercise,
} from "./tapRhythm";
import { sealTapAttempt } from "./tapCompletion";
import { matchTapRhythm } from "./tapMatcher";

const meterCases = [
  {
    track: 3,
    meter: { numerator: 2, denominator: 4 },
    gridTicks: 240,
    pulseBpm: 72,
  },
  {
    track: 3,
    meter: { numerator: 3, denominator: 4 },
    gridTicks: 240,
    pulseBpm: 72,
  },
  {
    track: 4,
    meter: { numerator: 4, denominator: 4 },
    gridTicks: 240,
    pulseBpm: 72,
  },
  {
    track: 6,
    meter: { numerator: 3, denominator: 8 },
    gridTicks: 240,
    pulseBpm: 60,
  },
  {
    track: 6,
    meter: { numerator: 6, denominator: 8 },
    gridTicks: 240,
    pulseBpm: 60,
  },
  {
    track: 6,
    meter: { numerator: 9, denominator: 8 },
    gridTicks: 240,
    pulseBpm: 60,
  },
  {
    track: "bonus",
    meter: { numerator: 2, denominator: 2 },
    gridTicks: 240,
    pulseBpm: 60,
  },
] as const;

function quarter(denominator: 1 | 2 | 4 | 8 | 16 = 4, dots: 0 | 1 = 0) {
  return { denominator, dots } as const;
}

function attemptFor(
  exercise: ReturnType<typeof generateTapRhythmExercise>,
  overrides: Partial<Parameters<typeof sealTapAttempt>[0]> = {}
) {
  const exactTaps = exercise.targets.map((target, sequence) => ({
    sequence,
    offsetMs: target.offsetMs,
  }));
  return sealTapAttempt({
    exerciseId: exercise.id,
    generation: 1,
    mode: "graded",
    status: "completed",
    reason: null,
    targetTicks: exercise.targets.map(target => target.tick),
    taps: exactTaps,
    evaluation: null,
    accuracyPercent: null,
    rawCaptures: [],
    ...overrides,
  });
}

describe("Tap Rhythm canonical exercise and target projection", () => {
  it.each(meterCases)(
    "projects canonical onset references for $meter.numerator/$meter.denominator",
    entry => {
      const exercise = generateTapRhythmExercise({
        track: entry.track,
        seed: `tap-meter-${entry.meter.numerator}-${entry.meter.denominator}`,
        meter: entry.meter,
        pulseBpm: entry.pulseBpm,
      });
      const timeline = deriveRhythmTimeline(exercise.pattern, entry.gridTicks);
      const audioReferences = createRhythmAudioPlan(
        exercise.pattern,
        "pattern"
      ).onsetReferences;
      const expectedTicks = timeline.soundingSpans.map(span => span.startTicks);

      expect(exercise.gridTicks).toBe(entry.gridTicks);
      expect(exercise.targets.map(target => target.tick)).toEqual(
        expectedTicks
      );
      expect(exercise.targets.map(target => target.id)).toEqual(
        audioReferences.map(reference => reference.id)
      );
      expect(exercise.targets.map(target => target.offsetMs)).toEqual(
        audioReferences.map(reference => reference.offsetSeconds * 1000)
      );
      expect(exercise.targets.length).toBeGreaterThan(0);
      expect(Object.isFrozen(exercise)).toBe(true);
      expect(Object.isFrozen(exercise.targets)).toBe(true);

      const gridMs =
        ticksToSeconds(
          exercise.gridTicks,
          exercise.pattern.meter,
          exercise.pattern.tempo.pulseBpm
        ) * 1000;
      exercise.targets.forEach((target, index) => {
        const adjacentGaps = [
          index > 0
            ? target.offsetMs - exercise.targets[index - 1].offsetMs
            : undefined,
          index + 1 < exercise.targets.length
            ? exercise.targets[index + 1].offsetMs - target.offsetMs
            : undefined,
        ].filter((gap): gap is number => gap !== undefined && gap > 0);
        const localGap =
          adjacentGaps.length === 0
            ? gridMs
            : Math.min(gridMs, ...adjacentGaps);
        expect(target.passMs).toBeCloseTo(Math.min(50, 0.3 * localGap), 10);
        expect(target.associationMs).toBeCloseTo(
          Math.min(80, 0.4 * localGap),
          10
        );
      });
    }
  );

  it("associates an out-of-window midpoint tap diagnostically without turning it into TP", () => {
    const pattern: RhythmPattern = {
      id: "adjacent-sixteenths",
      meter: { numerator: 2, denominator: 4 },
      tempo: { pulseBpm: 60 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "a", kind: "note", duration: quarter(16) },
            { id: "b", kind: "note", duration: quarter(16) },
            { id: "c", kind: "note", duration: quarter(4, 1) },
          ],
        },
      ],
    };
    const targets = createTapTargets(pattern, 120);
    expect(targets.map(target => target.tick)).toEqual([0, 120, 240]);
    const midpoint = (targets[0].offsetMs + targets[1].offsetMs) / 2;
    expect(
      targets.every(
        target =>
          target.associationMs < (targets[1].offsetMs - targets[0].offsetMs) / 2
      )
    ).toBe(true);
    const evaluation = matchTapRhythm(targets, [
      { sequence: 0, offsetMs: midpoint },
    ]);
    expect(evaluation.targetResults.map(result => result.status)).toEqual([
      "late",
      "missing",
      "missing",
    ]);
    expect(evaluation.tapResults[0].status).toBe("late");
    expect(evaluation.tapResults[0].targetIndex).toBe(0);
    expect(evaluation.tp).toBe(0);
    expect(evaluation.n).toBe(3);
    expect(evaluation.k).toBe(1);
    expect(evaluation.nearMiss).toBe(0);
    expect(evaluation.farAssociation).toBe(1);
    expect(evaluation.missing).toBe(2);
    expect(evaluation.extra).toBe(0);
    expect(evaluation.accuracyPercent).toBe(0);
  });

  it("uses actual adjacent attack gaps under approved T2 caps without extending Level 6 vocabulary", () => {
    const pattern = {
      ...mixedRuntimePattern(SEVEN_METER_RUNTIME_FIXTURES[4]),
      tempo: { pulseBpm: 300 },
    };
    const targets = createTapTargets(pattern, 240);
    const fine = targets.find(target => target.id === "pattern:fine")!;
    const gapMs = ticksToSeconds(120, pattern.meter, 300) * 1000;
    expect(fine.passMs).toBeCloseTo(Math.min(50, 0.3 * gapMs));
    expect(fine.associationMs).toBeCloseTo(Math.min(80, 0.4 * gapMs));
    expect(fine.associationMs).toBeLessThan(80);
    expect(() => createTapRhythmExercise({ track: 6, pattern })).toThrow();
  });

  it("omits rests and cross-bar tie continuations while retaining genuine quarter-note attacks", () => {
    const crossBarTie: RhythmPattern = {
      id: "quarter-cross-bar-tie-rests",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "a", kind: "note", duration: quarter() },
            { id: "r1", kind: "rest", duration: quarter() },
            { id: "b", kind: "note", duration: quarter() },
            {
              id: "tie-start",
              kind: "note",
              duration: quarter(),
              tieGroupId: "barline-tie",
            },
          ],
        },
        {
          id: "m2",
          segments: [
            {
              id: "tie-end",
              kind: "note",
              duration: quarter(),
              tieGroupId: "barline-tie",
            },
            { id: "r2", kind: "rest", duration: quarter() },
            { id: "c", kind: "note", duration: quarter() },
            { id: "d", kind: "note", duration: quarter() },
          ],
        },
      ],
    };
    const exercise = createTapRhythmExercise({
      track: 4,
      pattern: crossBarTie,
    });
    expect(exercise.targets.map(target => target.tick)).toEqual([
      0, 960, 1440, 2880, 3360,
    ]);
    expect(exercise.targets.map(target => target.id)).not.toContain(
      "pattern:tie-end"
    );
    expect(exercise.targets.map(target => target.tick)).not.toContain(1920);
  });

  it("projects a Level 4 dotted-quarter/eighth pattern and a separate Level 5 dotted-eighth/sixteenth stress", () => {
    const dottedQuarter: RhythmPattern = {
      id: "dotted-quarter-and-eighth",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "dot", kind: "note", duration: quarter(4, 1) },
            { id: "rest", kind: "rest", duration: quarter() },
            { id: "eighth", kind: "note", duration: quarter(8) },
            { id: "last", kind: "note", duration: quarter() },
          ],
        },
      ],
    };
    const level4 = createTapRhythmExercise({
      track: 4,
      pattern: dottedQuarter,
    });
    expect(level4.targets.map(target => target.tick)).toEqual([0, 1200, 1440]);

    const dottedEighthAndFine: RhythmPattern = {
      id: "dotted-eighth-sixteenth-stress",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 60 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "dot8", kind: "note", duration: quarter(8, 1) },
            { id: "sixteenth", kind: "note", duration: quarter(16) },
            { id: "rest", kind: "rest", duration: quarter() },
            { id: "c", kind: "note", duration: quarter() },
            { id: "d", kind: "note", duration: quarter() },
          ],
        },
      ],
    };
    const level5 = createTapRhythmExercise({
      track: 5,
      pattern: dottedEighthAndFine,
    });
    expect(level5.gridTicks).toBe(120);
    expect(level5.targets.map(target => target.tick)).toEqual([
      0, 360, 960, 1440,
    ]);
    expect(level5.targets.every(target => target.passMs > 0)).toBe(true);
  });

  it("accepts a policy-valid plain Level 4 pattern without forcing a dots/ties generator focus", () => {
    const plainLevel4: RhythmPattern = {
      id: "plain-level4-consolidation",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "a", kind: "note", duration: quarter() },
            { id: "r", kind: "rest", duration: quarter() },
            { id: "b", kind: "note", duration: quarter() },
            { id: "c", kind: "note", duration: quarter() },
          ],
        },
      ],
    };
    const exercise = createTapRhythmExercise({
      track: 4,
      pattern: plainLevel4,
    });
    expect(exercise.targets.map(target => target.tick)).toEqual([0, 960, 1440]);
  });

  it("keeps target projection ungated but enforces approved Level1/2 and Bonus Tap placements", () => {
    const level2Pattern = generateRhythmPattern({
      level: 2,
      seed: "helper-outside-tap",
    });
    expect(createTapTargets(level2Pattern, 240).length).toBeGreaterThan(0);

    for (const track of [1, 2] as const) {
      const pattern = generateRhythmPattern({
        level: track,
        seed: `level-${track}-tap-placement`,
      });
      expect(
        createTapRhythmExercise({ track, pattern }).targets.length
      ).toBeGreaterThan(0);
      expect(
        generateTapRhythmExercise({ track, seed: `level-${track}-tap-run` })
          .track
      ).toBe(track);
      expect(() =>
        createTapRhythmExercise({ track, section: "lessons", pattern })
      ).toThrow(RangeError);
    }
    const bonusPattern = generateRhythmPattern({
      level: "bonus",
      seed: "bonus-assessment-placement",
    });
    expect(
      createTapRhythmExercise({
        track: "bonus",
        section: "practice",
        pattern: bonusPattern,
      }).section
    ).toBe("practice");
    expect(
      createTapRhythmExercise({
        track: "bonus",
        section: "assessment",
        pattern: bonusPattern,
      }).section
    ).toBe("assessment");
    expect(
      generateTapRhythmExercise({
        track: "bonus",
        section: "assessment",
        seed: "bonus-assessment-placement",
      }).section
    ).toBe("assessment");

    const level6Assessment = generateTapRhythmExercise({
      track: 6,
      section: "assessment",
      seed: "tap-level6-individual-item",
      meter: { numerator: 9, denominator: 8 },
      pulseBpm: 60,
    });
    expect(level6Assessment.section).toBe("assessment");
  });

  it("re-grades only sealed completed graded attempts bound to exact canonical targets", () => {
    const exercise = generateTapRhythmExercise({
      track: 3,
      seed: "sealed-completion",
      meter: { numerator: 2, denominator: 4 },
      pulseBpm: 72,
    });
    const untrustedSummary = matchTapRhythm(exercise.targets, []);
    const exactAttempt = attemptFor(exercise, {
      evaluation: untrustedSummary,
      accuracyPercent: 0,
    });
    const evaluated = evaluateTapRhythmAnswer(exercise, exactAttempt);
    expect(evaluated?.correct).toBe(true);
    expect(evaluated?.accuracyPercent).toBe(100);

    const malformedPublicShape = {
      exerciseId: exercise.id,
      generation: 1,
      mode: "graded",
      status: "completed",
      targetTicks: exercise.targets.map(target => target.tick),
      taps: [],
      correct: true,
      accuracyPercent: 100,
    };
    expect(evaluateTapRhythmAnswer(exercise, malformedPublicShape)).toBeNull();

    expect(
      evaluateTapRhythmAnswer(
        exercise,
        attemptFor(exercise, { mode: "practice" })
      )
    ).toBeNull();
    expect(
      evaluateTapRhythmAnswer(
        exercise,
        attemptFor(exercise, { status: "technical-abort" })
      )
    ).toBeNull();
    expect(
      evaluateTapRhythmAnswer(
        exercise,
        attemptFor(exercise, { targetTicks: [999] })
      )
    ).toBeNull();
    expect(
      evaluateTapRhythmAnswer(
        exercise,
        attemptFor(exercise, { exerciseId: "different-exercise" })
      )
    ).toBeNull();
  });
});

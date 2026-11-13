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
import {
  calculateTapTwoRoundScore,
  type TapRoundInput,
  type TapRoundResult,
} from "./tapRoundScoring";
import { deriveMeter } from "../rhythm/meters";

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
  overrides: Partial<Parameters<typeof sealTapAttempt>[0]> = {},
  roundInputs: readonly TapRoundInput[] = [
    {
      roundNumber: 1,
      skipped: false,
      taps: exercise.targets.map((target, sequence) => ({
        sequence,
        offsetMs: target.offsetMs,
      })),
    },
    {
      roundNumber: 2,
      skipped: false,
      taps: exercise.targets.map((target, sequence) => ({
        sequence: exercise.targets.length + sequence,
        offsetMs: target.offsetMs,
      })),
    },
  ]
) {
  const meter = deriveMeter(exercise.pattern.meter);
  const canonicalPulseMs =
    ticksToSeconds(
      meter.pulseTicks,
      exercise.pattern.meter,
      exercise.pattern.tempo.pulseBpm
    ) * 1000;
  const score = calculateTapTwoRoundScore(
    exercise.targets,
    roundInputs,
    canonicalPulseMs
  );
  const firstPlayed = score.rounds.find(round => round.status === "played");
  return sealTapAttempt({
    exerciseId: exercise.id,
    generation: 1,
    mode: "graded",
    status: "completed",
    reason: null,
    targetTicks: exercise.targets.map(target => target.tick),
    taps: firstPlayed?.taps ?? [],
    evaluation: firstPlayed?.evaluation ?? null,
    accuracyPercent: score.overallAccuracyPercent,
    scoreOutOfTen: score.scoreOutOfTen,
    rounds: score.rounds,
    rawCaptures: [],
    ...overrides,
  });
}

function patternSegments(pattern: RhythmPattern) {
  return pattern.measures.flatMap(measure => measure.segments);
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
      const timeline = deriveRhythmTimeline(exercise.pattern);
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

  it("projects inherited Level 3 dotted values and Level 4/5 sixteenth-family material", () => {
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
    const level3 = createTapRhythmExercise({
      track: 3,
      pattern: dottedQuarter,
    });
    expect(level3.targets.map(target => target.tick)).toEqual([0, 1200, 1440]);

    const sixteenthPattern: RhythmPattern = {
      id: "level4-sixteenths-and-quarter-notes",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "s1", kind: "note", duration: quarter(16) },
            { id: "s2", kind: "note", duration: quarter(16) },
            { id: "eighth", kind: "note", duration: quarter(8) },
            { id: "q1", kind: "note", duration: quarter() },
            { id: "q2", kind: "note", duration: quarter() },
            { id: "q3", kind: "note", duration: quarter() },
          ],
        },
      ],
    };
    const level4 = createTapRhythmExercise({
      track: 4,
      pattern: sixteenthPattern,
    });
    expect(level4.gridTicks).toBe(240);
    expect(level4.targets.map(target => target.tick)).toEqual([
      0, 120, 240, 480, 960, 1440,
    ]);
    const fasterLevel4 = createTapRhythmExercise({
      track: 4,
      pattern: { ...sixteenthPattern, tempo: { pulseBpm: 120 } },
    });
    expect(fasterLevel4.targets[0].passMs).toBe(37.5);
    expect(fasterLevel4.targets.at(-1)!.passMs).toBe(50);
    expect(fasterLevel4.targets.at(-1)!.associationMs).toBe(80);

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

  it("round-trips generated Level 3 dots, ties, and combined patterns through the Tap factory", () => {
    const cases = [
      { focus: "dots", hasDots: true, hasTies: false },
      { focus: "ties", hasDots: false, hasTies: true },
      { focus: "combined", hasDots: true, hasTies: true },
    ] as const;

    for (const entry of cases) {
      const generated = generateTapRhythmExercise({
        track: 3,
        seed: `tap-level3-${entry.focus}-factory`,
        meter: { numerator: 4, denominator: 4 },
        focus: entry.focus,
      });
      const recreated = createTapRhythmExercise({
        track: 3,
        pattern: generated.pattern,
      });
      const segments = patternSegments(recreated.pattern);

      expect(recreated.track).toBe(3);
      expect(segments.some(segment => segment.duration.dots === 1)).toBe(
        entry.hasDots
      );
      expect(segments.some(segment => segment.tieGroupId !== undefined)).toBe(
        entry.hasTies
      );
    }

    const defaultExercise = generateTapRhythmExercise({
      track: 3,
      seed: "tap-level3-default-combined-factory",
      meter: { numerator: 4, denominator: 4 },
    });
    expect(
      patternSegments(defaultExercise.pattern).some(
        segment => segment.duration.dots === 1
      )
    ).toBe(true);
    expect(
      patternSegments(defaultExercise.pattern).some(
        segment => segment.tieGroupId !== undefined
      )
    ).toBe(true);
    expect(
      createTapRhythmExercise({ track: 3, pattern: defaultExercise.pattern })
        .targets.length
    ).toBeGreaterThan(0);
  });

  it("round-trips Level 4 sixteenths while retaining its taught dots/ties/combined focuses", () => {
    const defaultSixteenths = generateTapRhythmExercise({
      track: 4,
      seed: "tap-level4-default-sixteenths-factory",
      meter: { numerator: 4, denominator: 4 },
    });
    expect(
      patternSegments(defaultSixteenths.pattern).some(
        segment => segment.duration.denominator === 16
      )
    ).toBe(true);
    expect(
      createTapRhythmExercise({
        track: 4,
        pattern: defaultSixteenths.pattern,
      }).targets.length
    ).toBeGreaterThan(0);

    for (const focus of ["dots", "ties", "combined"] as const) {
      const generated = generateTapRhythmExercise({
        track: 4,
        seed: `tap-level4-retained-${focus}-factory`,
        meter: { numerator: 4, denominator: 4 },
        focus,
      });
      const recreated = createTapRhythmExercise({
        track: 4,
        pattern: generated.pattern,
      });
      const segments = patternSegments(recreated.pattern);

      expect(recreated.track).toBe(4);
      if (focus !== "ties") {
        expect(segments.some(segment => segment.duration.dots === 1)).toBe(
          true
        );
      }
      if (focus !== "dots") {
        expect(segments.some(segment => segment.tieGroupId !== undefined)).toBe(
          true
        );
      }
      expect(
        segments.some(segment => segment.duration.denominator === 16)
      ).toBe(false);
    }
  });

  it("accepts a policy-valid neutral Level 4 import using inherited durations", () => {
    const neutralLevel4: RhythmPattern = {
      id: "neutral-level4-import",
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
      pattern: neutralLevel4,
    });
    expect(exercise.targets.map(target => target.tick)).toEqual([0, 960, 1440]);
  });

  it("accepts valid inherited Level 2 material at Level 3 but rejects Level 4 sixteenths there", () => {
    const level2Pattern = generateRhythmPattern({
      level: 2,
      seed: "tap-level3-inherit-level2-basic",
    });
    const inherited = createTapRhythmExercise({
      track: 3,
      pattern: level2Pattern,
    });
    expect(inherited.pattern).toEqual(level2Pattern);
    expect(inherited.targets.length).toBeGreaterThan(0);

    const level4Sixteenths = generateRhythmPattern({
      level: 4,
      seed: "tap-level3-reject-level4-sixteenths",
      focus: "sixteenths",
    });
    expect(() =>
      createTapRhythmExercise({ track: 3, pattern: level4Sixteenths })
    ).toThrow(RangeError);
  });

  it("does not bypass Level 3 rest-vocabulary or rest-budget audits for neutral imports", () => {
    const untaughtHalfRest: RhythmPattern = {
      id: "neutral-level3-untaught-half-rest",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "a", kind: "note", duration: quarter() },
            { id: "r", kind: "rest", duration: quarter(2) },
            { id: "b", kind: "note", duration: quarter() },
          ],
        },
      ],
    };
    expect(() =>
      createTapRhythmExercise({ track: 3, pattern: untaughtHalfRest })
    ).toThrow(
      "Pattern contains a rest value not taught in this curriculum track."
    );

    const overRestBudget: RhythmPattern = {
      id: "neutral-level3-over-rest-budget",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "a", kind: "note", duration: quarter(8) },
            { id: "r1", kind: "rest", duration: quarter(8) },
            { id: "b", kind: "note", duration: quarter(8) },
            { id: "r2", kind: "rest", duration: quarter(8) },
            { id: "c", kind: "note", duration: quarter(8) },
            { id: "r3", kind: "rest", duration: quarter(8) },
            { id: "d", kind: "note", duration: quarter(8) },
            { id: "r4", kind: "rest", duration: quarter(8) },
          ],
        },
      ],
    };
    expect(() =>
      createTapRhythmExercise({ track: 3, pattern: overRestBudget })
    ).toThrow("Pattern exceeds the level rest budget.");
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
      for (const section of ["practice", "assessment"] as const) {
        expect(
          createTapRhythmExercise({ track, section, pattern }).section
        ).toBe(section);
        expect(
          generateTapRhythmExercise({
            track,
            section,
            seed: `level-${track}-tap-${section}`,
          }).section
        ).toBe(section);
      }
      expect(() =>
        createTapRhythmExercise({ track, section: "lessons", pattern })
      ).toThrow(RangeError);
      expect(() =>
        generateTapRhythmExercise({
          track,
          section: "lessons",
          seed: `level-${track}-tap-lessons`,
        })
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
      accuracyPercent: 100,
      scoreOutOfTen: 10,
    });
    const evaluated = evaluateTapRhythmAnswer(exercise, exactAttempt);
    expect(evaluated?.correct).toBe(true);
    expect(evaluated?.accuracyPercent).toBe(100);
    expect(evaluated?.scoreOutOfTen).toBe(10);

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
    expect(
      evaluateTapRhythmAnswer(
        exercise,
        attemptFor(exercise, { accuracyPercent: 99 })
      )
    ).toBeNull();
    expect(
      evaluateTapRhythmAnswer(
        exercise,
        attemptFor(exercise, { scoreOutOfTen: 9 })
      )
    ).toBeNull();

    const malformedRounds = attemptFor(exercise, {
      rounds: [exactAttempt.rounds![0]] as unknown as readonly [
        TapRoundResult,
        TapRoundResult,
      ],
    });
    expect(evaluateTapRhythmAnswer(exercise, malformedRounds)).toBeNull();

    const bothSkipped = attemptFor(exercise, {}, [
      { roundNumber: 1, skipped: true, taps: [] },
      { roundNumber: 2, skipped: true, taps: [] },
    ]);
    expect(bothSkipped.accuracyPercent).toBeNull();
    expect(bothSkipped.scoreOutOfTen).toBeNull();
    expect(evaluateTapRhythmAnswer(exercise, bothSkipped)).toBeNull();
  });
});

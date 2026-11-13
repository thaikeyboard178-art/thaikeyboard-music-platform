import { describe, expect, it } from "vitest";
import { matchTapRhythm, type TapMatchInput } from "./tapMatcher";
import {
  calculateTapTwoRoundScore,
  type TapRoundInput,
} from "./tapRoundScoring";
import { createTapTargets, type TapTarget } from "./tapRhythm";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import type { RhythmPattern } from "../types";

function twoRounds(
  first: readonly TapMatchInput[],
  second: readonly TapMatchInput[] = first
): readonly TapRoundInput[] {
  return [
    { roundNumber: 1, skipped: false, taps: first },
    { roundNumber: 2, skipped: false, taps: second },
  ];
}

function singleTarget(): readonly TapTarget[] {
  return [
    { id: "single", tick: 0, offsetMs: 0, passMs: 1_000, associationMs: 2_000 },
  ];
}

function oneTargetScore(accuracy: number) {
  const errorMs = ((100 - accuracy) / 100) * 1_000;
  return calculateTapTwoRoundScore(
    singleTarget(),
    twoRounds([{ sequence: 1, offsetMs: errorMs }]),
    2_000
  );
}

describe("percentage scoring from the existing Tap matcher assignment", () => {
  it.each(SEVEN_METER_RUNTIME_FIXTURES.map(fixture => ({ fixture }))) (
    "grades two exact representative-tempo rounds for $fixture.name",
    ({ fixture }) => {
      const bpm = fixture.pattern.meter.denominator === 8 ? 80 : 90;
      const pattern: RhythmPattern = {
        ...fixture.pattern,
        tempo: { pulseBpm: bpm },
      };
      const targets = createTapTargets(pattern, 240);
      const makeTaps = (round: number): TapMatchInput[] =>
        targets.map((target, index) => ({
          sequence: round * 100 + index,
          offsetMs: target.offsetMs,
        }));
      const pulseMs =
        ticksToSeconds(
          deriveMeter(pattern.meter).pulseTicks,
          pattern.meter,
          bpm
        ) * 1000;
      const score = calculateTapTwoRoundScore(
        targets,
        twoRounds(makeTaps(1), makeTaps(2)),
        pulseMs
      );

      expect(score.rounds.map(round => round.status)).toEqual([
        "played",
        "played",
      ]);
      expect(score.rounds.map(round => round.accuracyPercent)).toEqual([
        100,
        100,
      ]);
      expect(score.overallAccuracyPercent).toBe(100);
      expect(score.scoreOutOfTen).toBe(10);
      expect(score.missedTargetCount).toBe(0);
      expect(score.extraTapCount).toBe(0);
    }
  );

  it("uses the ordinary matcher assignment for first-onset captures", () => {
    const targets: readonly TapTarget[] = [
      { id: "beat-one", tick: 0, offsetMs: 0, passMs: 50, associationMs: 80 },
      { id: "beat-two", tick: 240, offsetMs: 500, passMs: 50, associationMs: 80 },
    ];
    const roundOneTaps = [
      { sequence: 0, offsetMs: -65 },
      { sequence: 1, offsetMs: 500 },
    ];
    const score = calculateTapTwoRoundScore(
      targets,
      [
        { roundNumber: 1, skipped: false, taps: roundOneTaps },
        { roundNumber: 2, skipped: false, taps: roundOneTaps },
      ],
      500
    );
    expect(score.rounds[0].evaluation).toEqual(
      matchTapRhythm(targets, roundOneTaps)
    );
    expect(score.rounds[1].evaluation).toEqual(
      matchTapRhythm(targets, roundOneTaps)
    );
  });

  it("uses the matcher's signed error and unequal left/right intervals", () => {
    const targets: readonly TapTarget[] = [
      { id: "a", tick: 0, offsetMs: 0, passMs: 1_000, associationMs: 1_000 },
      { id: "b", tick: 120, offsetMs: 1_000, passMs: 1_000, associationMs: 1_000 },
      { id: "c", tick: 300, offsetMs: 2_500, passMs: 1_000, associationMs: 1_000 },
    ];
    const early: TapMatchInput[] = [
      { sequence: 1, offsetMs: 0 },
      { sequence: 2, offsetMs: 950 },
      { sequence: 3, offsetMs: 2_500 },
    ];
    const matcher = matchTapRhythm(targets, early);
    const earlyScore = calculateTapTwoRoundScore(targets, twoRounds(early), 500);
    expect(matcher.targetResults[1].tapSequence).toBe(2);
    expect(earlyScore.rounds[0].noteResults[1]).toMatchObject({
      errorMs: -50,
      referenceIntervalMs: 1_000,
      deviationPercent: -10,
      direction: "early",
      noteAccuracyPercent: 90,
    });

    const late: TapMatchInput[] = [
      { sequence: 1, offsetMs: 0 },
      { sequence: 2, offsetMs: 1_075 },
      { sequence: 3, offsetMs: 2_500 },
    ];
    const lateScore = calculateTapTwoRoundScore(targets, twoRounds(late), 500);
    expect(lateScore.rounds[0].noteResults[1]).toMatchObject({
      errorMs: 75,
      referenceIntervalMs: 1_500,
      deviationPercent: 10,
      direction: "late",
      noteAccuracyPercent: 90,
    });
  });

  it("mirrors first/last intervals and uses one canonical pulse for a singleton", () => {
    const targets: readonly TapTarget[] = [
      { id: "a", tick: 0, offsetMs: 0, passMs: 100, associationMs: 500 },
      { id: "b", tick: 120, offsetMs: 1_000, passMs: 100, associationMs: 500 },
    ];
    const firstEarly = calculateTapTwoRoundScore(
      targets,
      twoRounds([{ sequence: 1, offsetMs: -50 }]),
      500
    );
    expect(firstEarly.rounds[0].noteResults[0]).toMatchObject({
      referenceIntervalMs: 1_000,
      deviationPercent: -10,
      noteAccuracyPercent: 90,
    });
    const lastLate = calculateTapTwoRoundScore(
      targets,
      twoRounds([{ sequence: 1, offsetMs: 1_050 }]),
      500
    );
    expect(lastLate.rounds[0].noteResults[1]).toMatchObject({
      referenceIntervalMs: 1_000,
      deviationPercent: 10,
      noteAccuracyPercent: 90,
    });

    const singleton = calculateTapTwoRoundScore(
      singleTarget(),
      twoRounds([{ sequence: 1, offsetMs: 100 }]),
      2_000
    );
    expect(singleton.rounds[0].noteResults[0]).toMatchObject({
      referenceIntervalMs: 2_000,
      deviationPercent: 10,
      noteAccuracyPercent: 90,
    });
    const unavailable = calculateTapTwoRoundScore(
      singleTarget(),
      twoRounds([{ sequence: 1, offsetMs: 100 }]),
      null
    );
    expect(unavailable.rounds[0].noteResults[0].noteAccuracyPercent).toBeNull();
    expect(unavailable.overallAccuracyPercent).toBeNull();
    expect(unavailable.scoreOutOfTen).toBeNull();
  });

  it("rounds only for score conversion at the requested boundaries", () => {
    expect(oneTargetScore(100).scoreOutOfTen).toBe(10);
    expect(oneTargetScore(95).scoreOutOfTen).toBe(10);
    expect(oneTargetScore(94).scoreOutOfTen).toBe(9);
    expect(oneTargetScore(85).scoreOutOfTen).toBe(9);
    expect(oneTargetScore(50).scoreOutOfTen).toBe(5);
    expect(oneTargetScore(0).scoreOutOfTen).toBe(0);
  });

  it("counts missed notes as zero but excludes extras from the accuracy mean", () => {
    const score = calculateTapTwoRoundScore(
      singleTarget(),
      [
        { roundNumber: 1, skipped: false, taps: [] },
        {
          roundNumber: 2,
          skipped: false,
          taps: [
            { sequence: 2, offsetMs: 0 },
            { sequence: 3, offsetMs: 2_500 },
          ],
        },
      ],
      2_000
    );
    expect(score.rounds[0].noteResults[0]).toMatchObject({
      matchStatus: "missing",
      noteAccuracyPercent: 0,
    });
    expect(score.rounds[1].accuracyPercent).toBe(100);
    expect(score.overallAccuracyPercent).toBe(50);
    expect(score.scoreOutOfTen).toBe(5);
    expect(score.missedTargetCount).toBe(1);
    expect(score.extraTapCount).toBe(1);
  });

  it("excludes explicitly skipped rounds but treats silence as a played round", () => {
    const skippedFirst = calculateTapTwoRoundScore(
      singleTarget(),
      [
        { roundNumber: 1, skipped: true, taps: [{ sequence: 1, offsetMs: 0 }] },
        { roundNumber: 2, skipped: false, taps: [{ sequence: 2, offsetMs: 0 }] },
      ],
      2_000
    );
    expect(skippedFirst.rounds.map(round => round.status)).toEqual([
      "skipped",
      "played",
    ]);
    expect(skippedFirst.rounds[0].evaluation).toBeNull();
    expect(skippedFirst.rounds[0].taps).toEqual([]);
    expect(skippedFirst.overallAccuracyPercent).toBe(100);
    expect(skippedFirst.scoreOutOfTen).toBe(10);
    expect(skippedFirst.roundsPlayed).toBe(1);
    expect(skippedFirst.roundsSkipped).toBe(1);

    const bothSkipped = calculateTapTwoRoundScore(
      singleTarget(),
      [
        { roundNumber: 1, skipped: true, taps: [] },
        { roundNumber: 2, skipped: true, taps: [] },
      ],
      2_000
    );
    expect(bothSkipped.overallAccuracyPercent).toBeNull();
    expect(bothSkipped.scoreOutOfTen).toBeNull();
    expect(bothSkipped.roundsPlayed).toBe(0);
    expect(bothSkipped.roundsSkipped).toBe(2);
    expect(bothSkipped.missedTargetCount).toBe(0);
  });
});

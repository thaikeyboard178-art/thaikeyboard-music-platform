import { describe, expect, it } from "vitest";
import { calculateTapTwoRoundScore } from "./tapRoundScoring";
import { matchTapRhythm } from "./tapMatcher";
import type { TapTarget } from "./tapRhythm";

const targets: readonly TapTarget[] = [
  { id: "one", tick: 0, offsetMs: 0, passMs: 50, associationMs: 80 },
  { id: "two", tick: 480, offsetMs: 500, passMs: 50, associationMs: 80 },
  { id: "three", tick: 960, offsetMs: 1000, passMs: 50, associationMs: 80 },
];

describe("Owner first-Tap-only early pairing", () => {
  it.each([
    ["exact downbeat", 0, "matched"],
    ["inside Wpass", -20, "matched"],
    ["inclusive Wpass", -50, "matched"],
    ["outside pass inside association", -65, "early"],
    ["inclusive Wassoc", -80, "early"],
    ["before Wassoc", -120, "early"],
    ["previous metronome beat four", -500, "early"],
    ["very early", -9000, "early"],
    ["late inside pass", 20, "matched"],
    ["late inside association", 65, "late"],
    ["late far association", 120, "late"],
  ] as const)(
    "grades %s without dropping its raw event",
    (_, offsetMs, status) => {
      const taps = [
        { sequence: 41, offsetMs },
        { sequence: 42, offsetMs: 610 }, // Ordinary second Tap retains far-Late.
        { sequence: 43, offsetMs: 1000 },
      ];
      const inputs = [
        { roundNumber: 1 as const, skipped: false, taps, firstTapSequence: 41 },
        {
          roundNumber: 2 as const,
          skipped: false,
          taps: targets.map((t, i) => ({
            sequence: 50 + i,
            offsetMs: t.offsetMs,
          })),
        },
      ];
      const score = calculateTapTwoRoundScore(targets, inputs, 500);
      const round = score.rounds[0];
      expect(round.firstTapSequence).toBe(41);
      expect(round.taps[0].offsetMs).toBe(offsetMs);
      expect(round.evaluation?.targetResults[0]).toMatchObject({
        status,
        tapSequence: 41,
        errorMs: offsetMs,
      });
      expect(round.evaluation).toMatchObject({ missing: 0, extra: 0 });
      expect(round.evaluation?.tapResults[0]).toMatchObject({
        targetIndex: 0,
        status,
        errorMs: offsetMs,
      });
      const ordinaryRemainder = matchTapRhythm(targets.slice(1), taps.slice(1));
      expect(round.evaluation?.targetResults[1]).toMatchObject({
        ...ordinaryRemainder.targetResults[0],
        targetIndex: 1,
      });
      const evaluation = round.evaluation!;
      expect(evaluation.accuracyPercent).toBe(
        (100 * 2 * evaluation.tp) / (evaluation.n + evaluation.k)
      );
      expect(calculateTapTwoRoundScore(targets, inputs, 500)).toEqual(score);
      expect(score.rounds[1].evaluation?.correct).toBe(true);
    }
  );

  it("does not require a second answer for beat one or let it replace the first event", () => {
    const taps = [
      { sequence: 0, offsetMs: -500 },
      { sequence: 1, offsetMs: 0 },
      { sequence: 2, offsetMs: 500 },
      { sequence: 3, offsetMs: 1000 },
    ];
    const score = calculateTapTwoRoundScore(
      targets,
      [
        { roundNumber: 1, skipped: false, taps, firstTapSequence: 0 },
        { roundNumber: 2, skipped: true, taps: [] },
      ],
      500
    );
    expect(score.rounds[0].evaluation?.targetResults[0]).toMatchObject({
      status: "early",
      tapSequence: 0,
      errorMs: -500,
    });
    expect(
      score.rounds[0].evaluation?.tapResults.find(tap => tap.sequence === 1)
        ?.status
    ).toBe("extra");
    expect(score.rounds[0].evaluation?.missing).toBe(0);
  });

  it("does not apply the exception without first-Tap metadata", () => {
    const taps = [
      { sequence: 0, offsetMs: -500 },
      { sequence: 1, offsetMs: 500 },
    ];
    const ordinary = matchTapRhythm(targets, taps);
    const score = calculateTapTwoRoundScore(
      targets,
      [
        { roundNumber: 1, skipped: false, taps },
        { roundNumber: 2, skipped: true, taps: [] },
      ],
      500
    );
    expect(score.rounds[0].evaluation).toEqual(ordinary);
  });
});

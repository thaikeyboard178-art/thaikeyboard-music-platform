import { describe, expect, it } from "vitest";
import { calculateTapTwoRoundScore } from "./tapRoundScoring";
import { matchTapRhythm, type TapMatchInput } from "./tapMatcher";
import type { TapTarget } from "./tapRhythm";

const targets: readonly TapTarget[] = [
  { id: "one", tick: 0, offsetMs: 0, passMs: 50, associationMs: 80 },
  { id: "two", tick: 480, offsetMs: 500, passMs: 50, associationMs: 80 },
  { id: "three", tick: 960, offsetMs: 1000, passMs: 50, associationMs: 80 },
];

function scoreFirstRound(taps: readonly TapMatchInput[]) {
  return calculateTapTwoRoundScore(
    targets,
    [
      { roundNumber: 1, skipped: false, taps },
      { roundNumber: 2, skipped: true, taps: [] },
    ],
    500
  ).rounds[0];
}

describe("ordinary matcher parity for the first onset", () => {
  it.each([
    ["exact downbeat", 0, "matched", 0, 0],
    ["early within Wpass", -20, "matched", 0, 0],
    ["late within Wpass", 20, "matched", 0, 0],
    ["early within Wassoc", -65, "early", 1, 0],
    ["late within Wassoc", 65, "late", 1, 0],
    ["inclusive early Wassoc", -80, "early", 1, 0],
    ["inclusive late Wassoc", 80, "late", 1, 0],
    ["far early", -120, "early", 0, 1],
    ["far late", 120, "late", 0, 1],
  ] as const)(
    "uses ordinary ordered matching for %s",
    (_, offsetMs, status, nearMiss, farAssociation) => {
      const taps = [
        { sequence: 41, offsetMs },
        { sequence: 42, offsetMs: 500 },
        { sequence: 43, offsetMs: 1000 },
      ];
      const ordinary = matchTapRhythm(targets, taps);
      const round = scoreFirstRound(taps);

      expect(round.taps).toEqual(taps);
      expect(round.evaluation).toEqual(ordinary);
      expect(round.evaluation?.targetResults[0]).toMatchObject({
        status,
        tapSequence: 41,
        errorMs: offsetMs,
      });
      expect(round.evaluation).toMatchObject({ nearMiss, farAssociation });
    }
  );

  it("lets ordered DP pair beat one to the accurate later tap", () => {
    const taps = [
      { sequence: 40, offsetMs: -500 },
      { sequence: 41, offsetMs: 0 },
      { sequence: 42, offsetMs: 500 },
      { sequence: 43, offsetMs: 1000 },
    ];
    const ordinary = matchTapRhythm(targets, taps);
    const round = scoreFirstRound(taps);

    expect(round.evaluation).toEqual(ordinary);
    expect(round.evaluation?.targetResults[0]).toMatchObject({
      status: "matched",
      tapSequence: 41,
      errorMs: 0,
    });
    expect(round.evaluation?.tapResults[0]).toMatchObject({
      sequence: 40,
      status: "extra",
      targetIndex: null,
    });
  });
});

import { describe, expect, it } from "vitest";
import { matchTapRhythm, type TapMatchInput } from "./tapMatcher";
import type { TapTarget } from "./tapRhythm";

function target(
  id: string,
  tick: number,
  offsetMs: number,
  passMs = 10,
  associationMs = 40
): TapTarget {
  return { id, tick, offsetMs, passMs, associationMs };
}

function tap(sequence: number, offsetMs: number): TapMatchInput {
  return { sequence, offsetMs };
}

describe("Tap Rhythm ordered matcher", () => {
  it("classifies exact, early, late, far associations, missing, and extra events and computes Formula B", () => {
    const targets = [
      target("t0", 0, 100, 10, 30),
      target("t1", 120, 200, 10, 30),
      target("t2", 240, 300, 10, 30),
      target("t3", 360, 400, 10, 30),
      target("t4", 480, 500, 10, 30),
    ];
    const result = matchTapRhythm(targets, [
      tap(0, 80),
      tap(1, 200),
      tap(2, 320),
      tap(3, 400),
      tap(4, 700),
    ]);

    expect(result.targetResults.map(item => item.status)).toEqual([
      "early",
      "matched",
      "late",
      "matched",
      "late",
    ]);
    expect(result.tapResults.map(item => item.status)).toEqual([
      "early",
      "matched",
      "late",
      "matched",
      "late",
    ]);
    expect(result).toMatchObject({
      correct: false,
      accuracyPercent: 40,
      tp: 2,
      n: 5,
      k: 5,
      missing: 0,
      extra: 0,
      nearMiss: 2,
      farAssociation: 1,
    });
  });

  it("returns not-applicable accuracy at N=0 and zero accuracy for expected events without taps", () => {
    const empty = matchTapRhythm([], [tap(4, 20)]);
    expect(empty).toMatchObject({
      correct: false,
      accuracyPercent: null,
      tp: 0,
      n: 0,
      k: 1,
      missing: 0,
      extra: 1,
    });

    const noCaptures = matchTapRhythm([target("only", 0, 100)], []);
    expect(noCaptures).toMatchObject({
      correct: false,
      accuracyPercent: 0,
      tp: 0,
      n: 1,
      k: 0,
      missing: 1,
      extra: 0,
    });
  });

  it("uses inclusive pass and association boundaries on both sides", () => {
    const expected = target("edge", 0, 100, 20, 40);
    expect(
      matchTapRhythm([expected], [tap(0, 80)]).targetResults[0].status
    ).toBe("matched");
    expect(
      matchTapRhythm([expected], [tap(0, 120)]).targetResults[0].status
    ).toBe("matched");
    expect(
      matchTapRhythm([expected], [tap(0, 60)]).targetResults[0].status
    ).toBe("early");
    expect(
      matchTapRhythm([expected], [tap(0, 140)]).targetResults[0].status
    ).toBe("late");
    const farOnly = matchTapRhythm([expected], [tap(0, 59.99)]);
    expect(farOnly).toMatchObject({
      correct: false,
      accuracyPercent: 0,
      tp: 0,
      n: 1,
      k: 1,
      missing: 0,
      extra: 0,
      nearMiss: 0,
      farAssociation: 1,
    });
    expect(farOnly.targetResults[0]).toMatchObject({
      status: "early",
      tapSequence: 0,
      errorMs: -40.01,
    });
    expect(farOnly.tapResults[0]).toMatchObject({
      status: "early",
      targetIndex: 0,
    });
  });

  it("keeps equal-time physical double taps while rejecting duplicate identity and backwards time", () => {
    const result = matchTapRhythm(
      [target("one", 0, 100)],
      [tap(7, 100), tap(8, 100)]
    );
    expect(result.correct).toBe(false);
    expect(result.tp).toBe(1);
    expect(result.k).toBe(2);
    expect(result.extra).toBe(1);
    expect(result.targetResults[0].tapSequence).toBe(7);

    expect(() =>
      matchTapRhythm([target("one", 0, 100)], [tap(1, 100), tap(1, 101)])
    ).toThrow(RangeError);
    expect(() =>
      matchTapRhythm([target("one", 0, 100)], [tap(1, 101), tap(2, 100)])
    ).toThrow(RangeError);
  });

  it("assigns an exact adjacent-target midpoint to the lexicographically first primary target", () => {
    const result = matchTapRhythm(
      [target("left", 0, 100, 5, 60), target("right", 120, 200, 5, 60)],
      [tap(17, 150)]
    );
    expect(result.targetResults).toMatchObject([
      { targetIndex: 0, status: "late", tapSequence: 17, errorMs: 50 },
      { targetIndex: 1, status: "missing", tapSequence: null },
    ]);
    expect(result.tapResults[0]).toMatchObject({
      sequence: 17,
      status: "late",
      targetIndex: 0,
    });
    expect(result).toMatchObject({ nearMiss: 1, farAssociation: 0 });
  });

  it("assigns a residual at the exact adjacent-target midpoint to the lower-index cell", () => {
    const result = matchTapRhythm(
      [target("left", 0, 100, 5, 20), target("right", 120, 200, 5, 20)],
      [tap(17, 150)]
    );
    expect(result.targetResults).toMatchObject([
      { targetIndex: 0, status: "late", tapSequence: 17, errorMs: 50 },
      { targetIndex: 1, status: "missing", tapSequence: null },
    ]);
    expect(result.tapResults[0]).toMatchObject({
      sequence: 17,
      status: "late",
      targetIndex: 0,
    });
    expect(result).toMatchObject({ nearMiss: 0, farAssociation: 1 });
  });

  it("associates residual taps in one- and two-target cells, with true missing and extra counts", () => {
    const oneTarget = matchTapRhythm(
      [target("only", 0, 100, 5, 10)],
      [tap(0, 59.99)]
    );
    expect(oneTarget.targetResults.map(item => item.status)).toEqual(["early"]);
    expect(oneTarget).toMatchObject({
      missing: 0,
      extra: 0,
      farAssociation: 1,
    });

    const twoTargetsOneTap = matchTapRhythm(
      [target("left", 0, 100, 5, 10), target("right", 120, 200, 5, 10)],
      [tap(1, 30)]
    );
    expect(twoTargetsOneTap.targetResults.map(item => item.status)).toEqual([
      "early",
      "missing",
    ]);
    expect(twoTargetsOneTap).toMatchObject({
      tp: 0,
      missing: 1,
      extra: 0,
      farAssociation: 1,
    });

    const twoTargetsTwoTaps = matchTapRhythm(
      [target("left", 0, 100, 5, 10), target("right", 120, 200, 5, 10)],
      [tap(1, 30), tap(2, 260)]
    );
    expect(twoTargetsTwoTaps.targetResults.map(item => item.status)).toEqual([
      "early",
      "late",
    ]);
    expect(twoTargetsTwoTaps).toMatchObject({
      tp: 0,
      missing: 0,
      extra: 0,
      farAssociation: 2,
    });

    const twoTargetsThreeTaps = matchTapRhythm(
      [target("left", 0, 100, 5, 10), target("right", 120, 200, 5, 10)],
      [tap(0, 30), tap(1, 40), tap(2, 260)]
    );
    expect(twoTargetsThreeTaps.targetResults.map(item => item.status)).toEqual([
      "early",
      "late",
    ]);
    expect(
      twoTargetsThreeTaps.targetResults.map(item => item.tapSequence)
    ).toEqual([1, 2]);
    expect(twoTargetsThreeTaps).toMatchObject({
      tp: 0,
      n: 2,
      k: 3,
      missing: 0,
      extra: 1,
      farAssociation: 2,
      accuracyPercent: 0,
      correct: false,
    });
    expect(twoTargetsThreeTaps.tapResults.map(item => item.status)).toEqual([
      "extra",
      "early",
      "late",
    ]);
  });

  it("matches at most one residual tap per target and breaks equal-error ties by capture sequence", () => {
    const result = matchTapRhythm(
      [target("only", 0, 100, 1, 10)],
      [tap(9, 70), tap(2, 130)]
    );
    expect(result.targetResults[0]).toMatchObject({
      status: "late",
      tapSequence: 2,
      errorMs: 30,
    });
    expect(result.tapResults.map(item => item.status)).toEqual([
      "extra",
      "late",
    ]);
    expect(result).toMatchObject({ missing: 0, extra: 1, farAssociation: 1 });
  });

  it("keeps primary assignments fixed and does not create a crossing residual pair", () => {
    const result = matchTapRhythm(
      [target("first", 0, 100, 0, 100), target("second", 120, 200, 0, 0)],
      [tap(9, 180), tap(1, 180)]
    );
    // Equal-time primary tie-break selects capture sequence 1 (the second
    // array entry); the remaining sequence-9 tap cannot cross that anchor to
    // associate with target 1, even though it belongs to target 1's cell.
    expect(result.targetResults[0]).toMatchObject({
      status: "late",
      tapSequence: 1,
    });
    expect(result.targetResults[1]).toMatchObject({ status: "missing" });
    expect(result.tapResults.map(item => item.status)).toEqual([
      "extra",
      "late",
    ]);
    expect(result).toMatchObject({ nearMiss: 1, farAssociation: 0 });
  });

  it("prioritizes pass pairs over a larger number of diagnostic pairs", () => {
    const result = matchTapRhythm(
      [target("left", 0, 0, 5, 100), target("right", 120, 100, 35, 100)],
      [tap(0, 70), tap(1, 150)]
    );
    // The two aligned diagnostic pairs would yield no pass. The selected
    // right-target/first-tap pair has one pass and therefore wins first.
    expect(result.tp).toBe(1);
    expect(result.targetResults).toMatchObject([
      { status: "missing" },
      { status: "matched", tapSequence: 0, errorMs: -30 },
    ]);
    expect(result.tapResults.map(item => item.status)).toEqual([
      "matched",
      "extra",
    ]);
  });

  it("maximizes diagnostic associations before minimizing error", () => {
    const result = matchTapRhythm(
      [target("left", 0, 0, 1, 100), target("right", 120, 100, 1, 100)],
      [tap(0, 40), tap(1, 60)]
    );
    expect(result.tp).toBe(0);
    expect(result.nearMiss).toBe(2);
    expect(result.targetResults.map(item => item.status)).toEqual([
      "late",
      "early",
    ]);
  });

  it("minimizes total absolute error after pass and diagnostic counts tie", () => {
    const result = matchTapRhythm(
      [target("only", 0, 100, 5, 100)],
      [tap(1, 90), tap(2, 160)]
    );
    expect(result.targetResults[0]).toMatchObject({
      status: "early",
      tapSequence: 1,
      errorMs: -10,
    });
    expect(result.tapResults.map(item => item.status)).toEqual([
      "early",
      "extra",
    ]);
  });

  it("breaks exact error ties lexicographically by target then capture sequence", () => {
    const result = matchTapRhythm(
      [target("only", 0, 100, 0, 20)],
      [tap(8, 80), tap(3, 120)]
    );
    expect(result.targetResults[0]).toMatchObject({
      status: "late",
      tapSequence: 3,
      errorMs: 20,
    });
    expect(result.tapResults.map(item => item.status)).toEqual([
      "extra",
      "late",
    ]);
  });
});

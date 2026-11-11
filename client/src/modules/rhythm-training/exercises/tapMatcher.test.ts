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
  it("classifies exact, early, late, missing, and extra events and computes Formula B", () => {
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
      "missing",
    ]);
    expect(result.tapResults.map(item => item.status)).toEqual([
      "early",
      "matched",
      "late",
      "matched",
      "extra",
    ]);
    expect(result).toMatchObject({
      correct: false,
      accuracyPercent: 40,
      tp: 2,
      n: 5,
      k: 5,
      missing: 1,
      extra: 1,
      nearMiss: 2,
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
    expect(
      matchTapRhythm([expected], [tap(0, 59.99)]).targetResults[0].status
    ).toBe("missing");
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

  it("assigns an exact adjacent-target midpoint to the lexicographically first target", () => {
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

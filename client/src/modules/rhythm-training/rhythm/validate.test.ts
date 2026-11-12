import { describe, expect, it } from "vitest";
import type { RhythmPattern } from "../types";
import {
  CROSS_BAR_TIE,
  FOUR_FOUR,
  HALF_TIE,
  INVALID_FIXTURES,
  VALID_FIXTURES,
} from "./fixtures";
import {
  requireValidRhythmPattern,
  RhythmValidationError,
  validateRhythmPattern,
} from "./validate";

function patchFirst(pattern: RhythmPattern, patch: Record<string, unknown>) {
  return {
    ...pattern,
    measures: pattern.measures.map((measure, index) =>
      index === 0
        ? {
            ...measure,
            segments: measure.segments.map((segment, segmentIndex) =>
              segmentIndex === 0 ? { ...segment, ...patch } : segment
            ),
          }
        : measure
    ),
  };
}
function expectIssue(input: unknown, code: string) {
  const result = validateRhythmPattern(input);
  expect(result.valid).toBe(false);
  if (!result.valid)
    expect(result.issues.some(issue => issue.code === code)).toBe(true);
}

describe("complete canonical rhythm validation", () => {
  it.each(VALID_FIXTURES.map(fixture => [fixture.id, fixture] as const))(
    "accepts full fixture %s",
    (_, fixture) => {
      const result = validateRhythmPattern(fixture);
      expect(result.valid).toBe(true);
      if (result.valid)
        expect(Number.isSafeInteger(result.totalTicks)).toBe(true);
    }
  );
  it.each(INVALID_FIXTURES)(
    "rejects $name with a musical reason",
    ({ input, expectedCode }) => expectIssue(input, expectedCode)
  );
  it("reports exact under/over capacity instead of rounding", () => {
    const under = validateRhythmPattern(INVALID_FIXTURES[0].input);
    const over = validateRhythmPattern(INVALID_FIXTURES[4].input);
    if (under.valid || over.valid)
      throw new Error("Invalid bars unexpectedly passed");
    expect(under.issues[0]).toMatchObject({
      expectedTicks: 1920,
      actualTicks: 1440,
    });
    expect(over.issues[0]).toMatchObject({
      expectedTicks: 1440,
      actualTicks: 1920,
    });
  });
  it.each([null, undefined, [], "4/4", 42, {}])(
    "rejects malformed root %s",
    input => expectIssue(input, "SCHEMA_INVALID")
  );
  it.each([0, -1, 29, 301, Number.NaN, Number.POSITIVE_INFINITY, "60"])(
    "rejects tempo %s",
    pulseBpm =>
      expectIssue({ ...FOUR_FOUR, tempo: { pulseBpm } }, "SCHEMA_INVALID")
  );
  it.each([30, 300])("accepts the inclusive %d BPM endpoint", pulseBpm => {
    expect(
      validateRhythmPattern({ ...FOUR_FOUR, tempo: { pulseBpm } }).valid
    ).toBe(true);
  });
  it("rejects a finite tempo below the supported range", () =>
    expectIssue(
      { ...FOUR_FOUR, tempo: { pulseBpm: Number.MIN_VALUE } },
      "SCHEMA_INVALID"
    ));
  it.each([
    { numerator: 6, denominator: 4 },
    { numerator: 5, denominator: 8 },
    { numerator: 5, denominator: 4 },
  ])("rejects unsupported meter %j", meter =>
    expectIssue({ ...FOUR_FOUR, meter }, "SCHEMA_INVALID")
  );
  it.each([
    { denominator: 3, dots: 0 },
    { denominator: 4, dots: 2 },
    { denominator: 4, dots: -1 },
    { denominator: 4.5, dots: 0 },
    { denominator: "4", dots: 0 },
  ])("rejects malformed duration %j", duration =>
    expectIssue(patchFirst(FOUR_FOUR, { duration }), "SCHEMA_INVALID")
  );
  it.each([1, 16])("rejects unsupported dotted denominator%s", denominator =>
    expectIssue(
      patchFirst(FOUR_FOUR, { duration: { denominator, dots: 1 } }),
      "DURATION_UNSUPPORTED"
    )
  );
  it("rejects duplicate segment IDs across bars", () =>
    expectIssue(
      {
        ...CROSS_BAR_TIE,
        measures: CROSS_BAR_TIE.measures.map(measure => ({
          ...measure,
          segments: measure.segments.map(segment => ({
            ...segment,
            id: "duplicate",
          })),
        })),
      },
      "DUPLICATE_SEGMENT_ID"
    ));
  it("rejects duplicate measure IDs", () =>
    expectIssue(
      {
        ...CROSS_BAR_TIE,
        measures: CROSS_BAR_TIE.measures.map(measure => ({
          ...measure,
          id: "duplicate",
        })),
      },
      "DUPLICATE_MEASURE_ID"
    ));
  it.each(["", " bad", "bad id"])("rejects malformed identifier %s", id =>
    expectIssue({ ...FOUR_FOUR, id }, "SCHEMA_INVALID")
  );
  it.each(["staccato", "tenuto"])(
    "rejects unimplemented articulation%s",
    articulation =>
      expectIssue(
        patchFirst(FOUR_FOUR, { articulation }),
        "UNSUPPORTED_ARTICULATION"
      )
  );
  it("rejects a strong rest accent", () =>
    expectIssue(
      patchFirst(FOUR_FOUR, { kind: "rest", accent: "strong" }),
      "REST_ACCENT"
    ));
  it("rejects independently authored position or tuplet fields", () => {
    expectIssue(
      patchFirst(FOUR_FOUR, { absoluteStartTicks: 480 }),
      "SCHEMA_INVALID"
    );
    expectIssue(patchFirst(FOUR_FOUR, { tuplet: [3, 2] }), "SCHEMA_INVALID");
    expectIssue({ ...FOUR_FOUR, swing: true }, "SCHEMA_INVALID");
  });
  it("accepts consistent caches, strips them and freezes a new canonical snapshot", () => {
    const input = patchFirst(FOUR_FOUR, { ticks: 480, onset: true });
    const before = JSON.stringify(input);
    const output = requireValidRhythmPattern(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(output).not.toBe(input);
    expect(output.measures[0].segments[0]).not.toHaveProperty("ticks");
    expect(output.measures[0].segments[0]).not.toHaveProperty("onset");
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.measures)).toBe(true);
    expect(Object.isFrozen(output.measures[0].segments[0].duration)).toBe(true);
  });
  it("rejects mismatched cached ticks and onset", () => {
    expectIssue(patchFirst(FOUR_FOUR, { ticks: 240 }), "CACHED_TICKS_MISMATCH");
    expectIssue(
      patchFirst(FOUR_FOUR, { onset: false }),
      "CACHED_ONSET_MISMATCH"
    );
    expectIssue(
      patchFirst(FOUR_FOUR, { kind: "rest", onset: true }),
      "CACHED_ONSET_MISMATCH"
    );
  });
  it("rejects a cached continuation reattack", () => {
    const input = {
      ...HALF_TIE,
      measures: [
        {
          ...HALF_TIE.measures[0],
          segments: HALF_TIE.measures[0].segments.map(segment => ({
            ...segment,
            onset: true,
          })),
        },
      ],
    };
    expectIssue(input, "CACHED_ONSET_MISMATCH");
  });
  it("rejects accent-driven continuation reattack", () => {
    const input = {
      ...HALF_TIE,
      measures: [
        {
          ...HALF_TIE.measures[0],
          segments: HALF_TIE.measures[0].segments.map((segment, index) =>
            index === 1 ? { ...segment, accent: "strong" } : segment
          ),
        },
      ],
    };
    expectIssue(input, "TIE_CONTINUATION_ACCENT");
  });
  it("throws structured errors rather than deriving invalid material", () => {
    expect(() => requireValidRhythmPattern(INVALID_FIXTURES[0].input)).toThrow(
      RhythmValidationError
    );
  });
  it("keeps every canonical layer frozen and independent of later source mutation", () => {
    const duration = { denominator: 4, dots: 0 };
    const output = requireValidRhythmPattern(
      patchFirst(FOUR_FOUR, { duration })
    );
    duration.denominator = 8;
    expect(output.measures[0].segments[0].duration.denominator).toBe(4);
    for (const object of [
      output,
      output.meter,
      output.tempo,
      output.measures,
      output.measures[0],
      output.measures[0].segments,
      output.measures[0].segments[0],
      output.measures[0].segments[0].duration,
    ]) {
      expect(Object.isFrozen(object)).toBe(true);
    }
    expect(Reflect.set(output.tempo, "pulseBpm", 120)).toBe(false);
    expect(Reflect.set(output.meter, "numerator", 3)).toBe(false);
    expect(
      Reflect.set(output.measures[0].segments[0].duration, "denominator", 8)
    ).toBe(false);
  });
});

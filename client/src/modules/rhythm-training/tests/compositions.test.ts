import { describe, expect, it } from "vitest";
import { validateRhythmPattern } from "../rhythm/validate";

// Test-fixture enumeration only, not a production exercise generator.
// Expected ticks and counts are independent of the production duration helper.
const vocabulary = [
  { ticks: 240, duration: { denominator: 8, dots: 0 } },
  { ticks: 480, duration: { denominator: 4, dots: 0 } },
  { ticks: 720, duration: { denominator: 4, dots: 1 } },
  { ticks: 960, duration: { denominator: 2, dots: 0 } },
  { ticks: 1440, duration: { denominator: 2, dots: 1 } },
  { ticks: 1920, duration: { denominator: 1, dots: 0 } },
] as const;
type Entry = (typeof vocabulary)[number];
function compositions(ticks: number): Entry[][] {
  const result: Entry[][] = [];
  function walk(remaining: number, prefix: Entry[]) {
    if (remaining === 0) {
      result.push(prefix);
      return;
    }
    for (const entry of vocabulary)
      if (entry.ticks <= remaining)
        walk(remaining - entry.ticks, [...prefix, entry]);
  }
  walk(ticks, []);
  return result;
}
const cases = [
  { meter: { numerator: 2, denominator: 4 }, capacity: 960, count: 8 },
  { meter: { numerator: 3, denominator: 4 }, capacity: 1440, count: 30 },
  { meter: { numerator: 4, denominator: 4 }, capacity: 1920, count: 114 },
  { meter: { numerator: 6, denominator: 8 }, capacity: 1440, count: 30 },
] as const;

describe("exhaustive eighth-grid bar arithmetic", () => {
  it.each(cases)(
    "validates every ordered $capacity-tick composition and rejects truncation/overflow",
    ({ meter, capacity, count }) => {
      const rows = compositions(capacity);
      expect(rows).toHaveLength(count);
      for (const [fixtureIndex, row] of rows.entries()) {
        for (const variant of [0, 1]) {
          const pattern = {
            id: `composition-${fixtureIndex}-${variant}`,
            meter,
            tempo: { pulseBpm: 60 },
            measures: [
              {
                id: "m1",
                segments: row.map((entry, index) => ({
                  id: `s${index}`,
                  kind: (index + variant) % 2 === 0 ? "note" : "rest",
                  duration: entry.duration,
                })),
              },
            ],
          };
          const validation = validateRhythmPattern(pattern);
          expect(validation.valid).toBe(true);
          if (validation.valid) expect(validation.totalTicks).toBe(capacity);
          const bar = pattern.measures[0];
          expect(
            validateRhythmPattern({
              ...pattern,
              measures: [{ ...bar, segments: bar.segments.slice(0, -1) }],
            }).valid
          ).toBe(false);
          expect(
            validateRhythmPattern({
              ...pattern,
              measures: [
                {
                  ...bar,
                  segments: [
                    ...bar.segments,
                    {
                      id: "extra",
                      kind: "note",
                      duration: { denominator: 8, dots: 0 },
                    },
                  ],
                },
              ],
            }).valid
          ).toBe(false);
        }
      }
    }
  );
});

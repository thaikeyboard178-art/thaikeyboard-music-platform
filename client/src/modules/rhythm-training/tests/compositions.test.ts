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
  {
    meter: { numerator: 2, denominator: 4 },
    capacity: 960,
    count: 8,
    groupValidCount: 8,
    groupInvalidCount: 0,
  },
  {
    meter: { numerator: 3, denominator: 4 },
    capacity: 1440,
    count: 30,
    groupValidCount: 30,
    groupInvalidCount: 0,
  },
  {
    meter: { numerator: 4, denominator: 4 },
    capacity: 1920,
    count: 114,
    groupValidCount: 114,
    groupInvalidCount: 0,
  },
  {
    meter: { numerator: 6, denominator: 8 },
    capacity: 1440,
    count: 30,
    groupValidCount: 16,
    groupInvalidCount: 14,
  },
  {
    meter: { numerator: 9, denominator: 8 },
    capacity: 2160,
    count: 222,
    groupValidCount: 64,
    groupInvalidCount: 158,
  },
] as const;

function independentlyFitsCompoundGroups(row: readonly Entry[]): boolean {
  let cursor = 0;
  const groupCount = row.reduce((sum, entry) => sum + entry.ticks, 0) / 720;
  const groupTotals = Array.from({ length: groupCount }, () => 0);
  for (const entry of row) {
    const groupIndex = Math.floor(cursor / 720);
    const groupEnd = (groupIndex + 1) * 720;
    if (cursor + entry.ticks > groupEnd) return false;
    groupTotals[groupIndex] = (groupTotals[groupIndex] ?? 0) + entry.ticks;
    cursor += entry.ticks;
  }
  return groupTotals.every(total => total === 720);
}

describe("exhaustive eighth-grid bar arithmetic", () => {
  it.each(cases)(
    "checks all ordered $capacity-tick compositions against 720-tick group boundaries and rejects truncation/overflow",
    ({ meter, capacity, count, groupValidCount, groupInvalidCount }) => {
      const rows = compositions(capacity);
      expect(rows).toHaveLength(count);
      let validRows = 0;
      let invalidRows = 0;
      for (const [fixtureIndex, row] of rows.entries()) {
        expect(row.reduce((sum, entry) => sum + entry.ticks, 0)).toBe(capacity);
        const isCompoundGroupedMeter =
          meter.numerator === 6 || meter.numerator === 9;
        const expectedValid =
          !isCompoundGroupedMeter || independentlyFitsCompoundGroups(row);
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
          expect(validation.valid).toBe(expectedValid);
          if (variant === 0) {
            if (validation.valid) validRows += 1;
            else invalidRows += 1;
          }
          if (validation.valid) expect(validation.totalTicks).toBe(capacity);
          else if (isCompoundGroupedMeter) {
            expect(
              validation.issues.some(
                issue => issue.code === "GROUP_SEGMENT_CROSSES_BOUNDARY"
              )
            ).toBe(true);
          }
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
      expect(validRows).toBe(groupValidCount);
      expect(invalidRows).toBe(groupInvalidCount);
    }
  );
});

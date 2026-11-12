import { describe, expect, it } from "vitest";
import type { RhythmMeter, RhythmPattern, RhythmSegment } from "../types";
import { deriveRhythmTimeline } from "./deriveTimeline";
import { durationToTicks } from "./durations";
import { deriveMeter } from "./meters";
import { validateRhythmPattern } from "./validate";

const compoundMeters = [
  { numerator: 6, denominator: 8 },
  { numerator: 9, denominator: 8 },
] as const satisfies readonly RhythmMeter[];

function segment(
  id: string,
  kind: RhythmSegment["kind"],
  denominator: RhythmSegment["duration"]["denominator"],
  dots: RhythmSegment["duration"]["dots"] = 0,
  tieGroupId?: string
): RhythmSegment {
  return {
    id,
    kind,
    duration: { denominator, dots },
    ...(tieGroupId === undefined ? {} : { tieGroupId }),
  };
}

function pattern(
  meter: RhythmMeter,
  segments: readonly RhythmSegment[],
  id: string
): RhythmPattern {
  return {
    id,
    meter,
    tempo: { pulseBpm: 60 },
    measures: [{ id: "bar-1", segments }],
  };
}

function tiedGroupsPattern(meter: RhythmMeter): RhythmPattern {
  const groupCount = meter.numerator / 3;
  return pattern(
    meter,
    Array.from({ length: groupCount }, (_, index) =>
      segment(`g${index + 1}`, "note", 4, 1, "held-across-groups")
    ),
    `legal-tied-groups-${meter.numerator}-8`
  );
}

const invalidGroupPatterns: readonly {
  name: string;
  input: RhythmPattern;
  barTicks: number;
  crossingSegmentIndex: number;
  availableTicksAtStart: number;
  segmentTicks: number;
}[] = [
  {
    name: "6/8 note crossing 720-tick boundary",
    input: pattern(
      { numerator: 6, denominator: 8 },
      [
        segment("a", "note", 8),
        segment("b", "note", 8),
        segment("crossing-quarter", "note", 4),
        segment("d", "note", 4),
      ],
      "invalid-6-8-note-crossing"
    ),
    barTicks: 1440,
    crossingSegmentIndex: 2,
    availableTicksAtStart: 240,
    segmentTicks: 480,
  },
  {
    name: "6/8 rest crossing 720-tick boundary",
    input: pattern(
      { numerator: 6, denominator: 8 },
      [
        segment("a", "note", 8),
        segment("b", "note", 8),
        segment("crossing-rest", "rest", 4, 1),
        segment("d", "note", 8),
      ],
      "invalid-6-8-rest-crossing"
    ),
    barTicks: 1440,
    crossingSegmentIndex: 2,
    availableTicksAtStart: 240,
    segmentTicks: 720,
  },
  {
    name: "9/8 note crossing the first 720-tick boundary",
    input: pattern(
      { numerator: 9, denominator: 8 },
      [
        segment("a", "note", 8),
        segment("b", "note", 8),
        segment("crossing-quarter", "note", 4),
        ...Array.from({ length: 5 }, (_, index) =>
          segment(`e${index}`, "note", 8)
        ),
      ],
      "invalid-9-8-note-crossing"
    ),
    barTicks: 2160,
    crossingSegmentIndex: 2,
    availableTicksAtStart: 240,
    segmentTicks: 480,
  },
  {
    name: "9/8 dotted-half rest spanning two group boundaries",
    input: pattern(
      { numerator: 9, denominator: 8 },
      [
        segment("crossing-long-rest", "rest", 2, 1),
        segment("last-group-note", "note", 4, 1),
      ],
      "invalid-9-8-long-rest"
    ),
    barTicks: 2160,
    crossingSegmentIndex: 0,
    availableTicksAtStart: 720,
    segmentTicks: 1440,
  },
];

describe("canonical 6/8 and 9/8 structural group validation", () => {
  it.each(compoundMeters)(
    "requires every $numerator/8 group to total 720 ticks",
    meter => {
      const candidate = tiedGroupsPattern(meter);
      const info = deriveMeter(meter);
      const result = validateRhythmPattern(candidate);
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error(JSON.stringify(result.issues));

      const timeline = deriveRhythmTimeline(result.pattern);
      const measurePositions = timeline.segments.filter(
        position => position.measureIndex === 0
      );
      const groupTotals = info.groupStarts.map((start, index) => {
        const end = info.groupStarts[index + 1] ?? info.measureTicks;
        return measurePositions
          .filter(
            position =>
              position.measureOffsetTicks >= start &&
              position.measureOffsetTicks < end
          )
          .reduce((sum, position) => sum + position.durationTicks, 0);
      });
      expect(groupTotals).toEqual(
        Array.from({ length: meter.numerator / 3 }, () => 720)
      );
      expect(
        measurePositions.every(position => {
          const groupIndex = info.groupStarts.findIndex(
            (start, index) =>
              position.measureOffsetTicks >= start &&
              position.measureOffsetTicks + position.durationTicks <=
                (info.groupStarts[index + 1] ?? info.measureTicks)
          );
          return groupIndex >= 0 && position.durationTicks <= 720;
        })
      ).toBe(true);
      expect(timeline.onsets).toEqual([0]);
      expect(timeline.soundingSpans).toMatchObject([
        {
          startTicks: 0,
          endTicks: info.measureTicks,
          segmentIds: candidate.measures[0].segments.map(item => item.id),
        },
      ]);
    }
  );

  it.each(invalidGroupPatterns)(
    "rejects $name despite a correct total measure duration",
    ({
      input,
      barTicks,
      crossingSegmentIndex,
      availableTicksAtStart,
      segmentTicks,
    }) => {
      const total = input.measures[0].segments.reduce(
        (sum, item) => sum + durationToTicks(item.duration),
        0
      );
      expect(total).toBe(barTicks);

      const result = validateRhythmPattern(input);
      expect(result.valid).toBe(false);
      if (result.valid)
        throw new Error("Group-invalid canonical bar was accepted");
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "GROUP_SEGMENT_CROSSES_BOUNDARY",
          path: `measures.0.segments.${crossingSegmentIndex}.duration`,
          expectedTicks: availableTicksAtStart,
          actualTicks: segmentTicks,
        })
      );
      expect(
        result.issues.some(
          issue =>
            issue.code === "MEASURE_UNDERFILLED" ||
            issue.code === "MEASURE_OVERFILLED"
        )
      ).toBe(false);
    }
  );

  it("does not apply the new compound-group component rule to 3/8", () => {
    const threeEight = pattern(
      { numerator: 3, denominator: 8 },
      [segment("dotted-quarter", "note", 4, 1)],
      "unchanged-3-8"
    );
    expect(validateRhythmPattern(threeEight).valid).toBe(true);
  });
});

import type { RhythmMeter, RhythmPattern, RhythmSegment } from "../types";

export type SevenMeterRuntimeFixture = Readonly<{
  name: string;
  pattern: RhythmPattern;
  capacity: number;
  pulseTicks: number;
  pulseStarts: readonly number[];
  eighthStarts: readonly number[];
  pulseIndices: readonly number[];
  subdivisionIndices: readonly number[];
  accents: readonly ("strong" | "medium" | "weak")[];
  beams: readonly (readonly string[])[];
}>;

function eighthPattern(
  name: string,
  meter: RhythmMeter,
  count: number
): RhythmPattern {
  return Object.freeze({
    id: `seven-meter-${name.replace("/", "-")}`,
    meter: Object.freeze({ ...meter }),
    tempo: Object.freeze({ pulseBpm: 60 }),
    measures: Object.freeze([
      Object.freeze({
        id: "bar-1",
        segments: Object.freeze(
          Array.from({ length: count }, (_, index) =>
            Object.freeze({
              id: `n${index}`,
              kind: "note" as const,
              duration: Object.freeze({
                denominator: 8 as const,
                dots: 0 as const,
              }),
            })
          )
        ),
      }),
    ]),
  });
}

// Expected coordinates are independently authored examples, not derived by the
// production meter/timeline/projection functions that the execution tests call.
export const SEVEN_METER_RUNTIME_FIXTURES: readonly SevenMeterRuntimeFixture[] =
  Object.freeze([
    {
      name: "2/4",
      pattern: eighthPattern("2/4", { numerator: 2, denominator: 4 }, 4),
      capacity: 960,
      pulseTicks: 480,
      pulseStarts: [0, 480],
      eighthStarts: [0, 240, 480, 720],
      pulseIndices: [0, 0, 1, 1],
      subdivisionIndices: [0, 1, 0, 1],
      accents: ["strong", "weak", "weak", "weak"],
      beams: [
        ["n0", "n1"],
        ["n2", "n3"],
      ],
    },
    {
      name: "3/4",
      pattern: eighthPattern("3/4", { numerator: 3, denominator: 4 }, 6),
      capacity: 1440,
      pulseTicks: 480,
      pulseStarts: [0, 480, 960],
      eighthStarts: [0, 240, 480, 720, 960, 1200],
      pulseIndices: [0, 0, 1, 1, 2, 2],
      subdivisionIndices: [0, 1, 0, 1, 0, 1],
      accents: ["strong", "weak", "weak", "weak", "weak", "weak"],
      beams: [
        ["n0", "n1"],
        ["n2", "n3"],
        ["n4", "n5"],
      ],
    },
    {
      name: "4/4",
      pattern: eighthPattern("4/4", { numerator: 4, denominator: 4 }, 8),
      capacity: 1920,
      pulseTicks: 480,
      pulseStarts: [0, 480, 960, 1440],
      eighthStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680],
      pulseIndices: [0, 0, 1, 1, 2, 2, 3, 3],
      subdivisionIndices: [0, 1, 0, 1, 0, 1, 0, 1],
      accents: [
        "strong",
        "weak",
        "weak",
        "weak",
        "medium",
        "weak",
        "weak",
        "weak",
      ],
      beams: [
        ["n0", "n1"],
        ["n2", "n3"],
        ["n4", "n5"],
        ["n6", "n7"],
      ],
    },
    {
      name: "3/8",
      pattern: eighthPattern("3/8", { numerator: 3, denominator: 8 }, 3),
      capacity: 720,
      pulseTicks: 240,
      pulseStarts: [0, 240, 480],
      eighthStarts: [0, 240, 480],
      pulseIndices: [0, 1, 2],
      subdivisionIndices: [0, 0, 0],
      accents: ["strong", "weak", "weak"],
      beams: [],
    },
    {
      name: "6/8",
      pattern: eighthPattern("6/8", { numerator: 6, denominator: 8 }, 6),
      capacity: 1440,
      pulseTicks: 240,
      pulseStarts: [0, 240, 480, 720, 960, 1200],
      eighthStarts: [0, 240, 480, 720, 960, 1200],
      pulseIndices: [0, 1, 2, 3, 4, 5],
      subdivisionIndices: [0, 0, 0, 0, 0, 0],
      accents: ["strong", "weak", "weak", "medium", "weak", "weak"],
      beams: [
        ["n0", "n1", "n2"],
        ["n3", "n4", "n5"],
      ],
    },
    {
      name: "9/8",
      pattern: eighthPattern("9/8", { numerator: 9, denominator: 8 }, 9),
      capacity: 2160,
      pulseTicks: 240,
      pulseStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
      eighthStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
      pulseIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      subdivisionIndices: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      accents: [
        "strong",
        "weak",
        "weak",
        "medium",
        "weak",
        "weak",
        "medium",
        "weak",
        "weak",
      ],
      beams: [
        ["n0", "n1", "n2"],
        ["n3", "n4", "n5"],
        ["n6", "n7", "n8"],
      ],
    },
    {
      name: "2/2",
      pattern: eighthPattern("2/2", { numerator: 2, denominator: 2 }, 8),
      capacity: 1920,
      pulseTicks: 960,
      pulseStarts: [0, 960],
      eighthStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680],
      pulseIndices: [0, 0, 0, 0, 1, 1, 1, 1],
      subdivisionIndices: [0, 1, 2, 3, 0, 1, 2, 3],
      accents: [
        "strong",
        "weak",
        "weak",
        "weak",
        "weak",
        "weak",
        "weak",
        "weak",
      ],
      beams: [
        ["n0", "n1", "n2", "n3"],
        ["n4", "n5", "n6", "n7"],
      ],
    },
  ]);

export function mixedRuntimePattern(
  fixture: SevenMeterRuntimeFixture
): RhythmPattern {
  const base = fixture.pattern.measures[0].segments;
  const first: RhythmSegment[] = [
    { id: "dot", kind: "note", duration: { denominator: 8, dots: 1 } },
    { id: "fine", kind: "note", duration: { denominator: 16, dots: 0 } },
    ...base.slice(2).map((segment, index) => ({ ...segment, id: `a${index}` })),
  ];
  first[first.length - 1] = { ...first[first.length - 1], tieGroupId: "cross" };
  const second: RhythmSegment[] = base.map((segment, index) => ({
    ...segment,
    id: `b${index}`,
    ...(index === 0 ? { tieGroupId: "cross" } : {}),
    ...(index === 1 ? { kind: "rest" as const } : {}),
  }));
  return {
    ...fixture.pattern,
    id: `${fixture.pattern.id}-mixed`,
    measures: [
      { id: "mixed-1", segments: first },
      { id: "mixed-2", segments: second },
    ],
  };
}

/**
 * Mixed 6/8 or 9/8 production-pipeline fixture. Each dotted-quarter tie
 * component is exactly one structural group; the second bar combines a dotted
 * rest, sixteenth subdivision, eighths, quarter notes and rests without a
 * component crossing a group line.
 */
export function groupedMixedCompoundPattern(meter: RhythmMeter): RhythmPattern {
  if (
    meter.denominator !== 8 ||
    (meter.numerator !== 6 && meter.numerator !== 9)
  ) {
    throw new RangeError("Grouped mixed fixture requires 6/8 or 9/8.");
  }
  const groupCount = meter.numerator / 3;
  const tieGroupId = "group-sustain";
  const tiedGroups: RhythmSegment[] = Array.from(
    { length: groupCount },
    (_, index) => ({
      id: `tie-group-${index + 1}`,
      kind: "note",
      duration: { denominator: 4, dots: 1 },
      tieGroupId,
    })
  );
  const mixedSegments: RhythmSegment[] = [
    {
      id: "dotted-rest",
      kind: "rest",
      duration: { denominator: 8, dots: 1 },
    },
    {
      id: "subdivision-rest",
      kind: "rest",
      duration: { denominator: 16, dots: 0 },
    },
    {
      id: "group-one-eighth",
      kind: "note",
      duration: { denominator: 8, dots: 0 },
    },
    {
      id: "group-two-quarter",
      kind: "note",
      duration: { denominator: 4, dots: 0 },
    },
    {
      id: "group-two-rest",
      kind: "rest",
      duration: { denominator: 8, dots: 0 },
    },
  ];
  if (groupCount === 3) {
    mixedSegments.push(
      {
        id: "group-three-eighth",
        kind: "note",
        duration: { denominator: 8, dots: 0 },
      },
      {
        id: "group-three-rest",
        kind: "rest",
        duration: { denominator: 4, dots: 0 },
      }
    );
  }
  return {
    id: `grouped-mixed-${meter.numerator}-8`,
    meter: Object.freeze({ ...meter }),
    tempo: { pulseBpm: 60 },
    measures: [
      { id: "grouped-ties", segments: tiedGroups },
      { id: "grouped-mixed-values", segments: mixedSegments },
    ],
  };
}

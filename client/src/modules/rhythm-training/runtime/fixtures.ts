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
      pulseTicks: 720,
      pulseStarts: [0, 720],
      eighthStarts: [0, 240, 480, 720, 960, 1200],
      pulseIndices: [0, 0, 0, 1, 1, 1],
      subdivisionIndices: [0, 1, 2, 0, 1, 2],
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
      pulseTicks: 720,
      pulseStarts: [0, 720, 1440],
      eighthStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
      pulseIndices: [0, 0, 0, 1, 1, 1, 2, 2, 2],
      subdivisionIndices: [0, 1, 2, 0, 1, 2, 0, 1, 2],
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

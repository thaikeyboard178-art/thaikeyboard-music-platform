import type {
  RhythmMeter,
  RhythmPattern,
  RhythmSegment,
  WrittenDuration,
} from "../types";

function segment(
  id: string,
  denominator: WrittenDuration["denominator"],
  options: { rest?: boolean; dots?: 0 | 1; tie?: string } = {}
): RhythmSegment {
  return {
    id,
    kind: options.rest ? "rest" : "note",
    duration: { denominator, dots: options.dots ?? 0 },
    ...(options.tie ? { tieGroupId: options.tie } : {}),
  };
}
function pattern(
  id: string,
  meter: RhythmMeter,
  bars: readonly (readonly RhythmSegment[])[]
): RhythmPattern {
  return {
    id,
    meter,
    tempo: { pulseBpm: 60 },
    measures: bars.map((segments, index) => ({
      id: `${id}-bar-${index + 1}`,
      segments,
    })),
  };
}

export const FOUR_FOUR = pattern(
  "four-four",
  { numerator: 4, denominator: 4 },
  [
    [
      segment("a", 4),
      segment("b", 8),
      segment("c", 8),
      segment("r", 4, { rest: true }),
      segment("d", 4),
    ],
  ]
);
export const THREE_FOUR = pattern(
  "three-four",
  { numerator: 3, denominator: 4 },
  [
    [
      segment("a", 4, { dots: 1 }),
      segment("b", 8),
      segment("r", 4, { rest: true }),
    ],
  ]
);
export const TWO_FOUR = pattern("two-four", { numerator: 2, denominator: 4 }, [
  [segment("a", 2)],
]);
export const SIX_EIGHT = pattern(
  "six-eight",
  { numerator: 6, denominator: 8 },
  [
    [
      segment("a", 4, { dots: 1 }),
      segment("b", 8),
      segment("c", 8),
      segment("r", 8, { rest: true }),
    ],
  ]
);
export const SIX_EIGHT_REST = pattern(
  "six-eight-rest",
  { numerator: 6, denominator: 8 },
  // Migration: replace the legacy dotted-half rest (1440 ticks) with two
  // adjacent dotted-quarter rests, one per 720-tick group; silence is unchanged.
  [
    [
      segment("r-first-group", 4, { dots: 1, rest: true }),
      segment("r-second-group", 4, { dots: 1, rest: true }),
    ],
  ]
);
export const WHOLE_NOTE = pattern(
  "whole-note",
  { numerator: 4, denominator: 4 },
  [[segment("a", 1)]]
);
export const HALF_TIE = pattern("half-tie", { numerator: 4, denominator: 4 }, [
  [segment("a", 2, { tie: "T1" }), segment("b", 2, { tie: "T1" })],
]);
export const THREE_SEGMENT_TIE = pattern(
  "three-segment-tie",
  { numerator: 4, denominator: 4 },
  [
    [
      segment("a", 4, { tie: "T1" }),
      segment("b", 4, { tie: "T1" }),
      segment("c", 4, { tie: "T1" }),
      segment("r", 4, { rest: true }),
    ],
  ]
);
export const CROSS_BAR_TIE = pattern(
  "cross-bar",
  { numerator: 4, denominator: 4 },
  [
    [
      segment("a", 4),
      segment("b", 4),
      segment("c", 4),
      segment("t-start", 4, { tie: "T1" }),
    ],
    [
      segment("t-end", 4, { tie: "T1" }),
      segment("d", 4),
      segment("r", 4, { rest: true }),
      segment("e", 4),
    ],
  ]
);
export const SIX_EIGHT_CROSS_TIE = pattern(
  "six-eight-cross",
  { numerator: 6, denominator: 8 },
  [
    [
      segment("a", 4, { dots: 1 }),
      segment("b", 8),
      segment("c", 8),
      segment("t-start", 8, { tie: "T1" }),
    ],
    [
      segment("t-end", 8, { tie: "T1" }),
      segment("d", 8),
      segment("e", 8),
      segment("f", 4, { dots: 1 }),
    ],
  ]
);
export const DOTTED_EIGHTH = pattern(
  "dotted-eighth",
  { numerator: 4, denominator: 4 },
  [
    [
      segment("a", 8, { dots: 1 }),
      segment("b", 16),
      segment("r", 2, { rest: true }),
      segment("c", 4),
    ],
  ]
);

export const VALID_FIXTURES = [
  FOUR_FOUR,
  THREE_FOUR,
  TWO_FOUR,
  SIX_EIGHT,
  SIX_EIGHT_REST,
  WHOLE_NOTE,
  HALF_TIE,
  THREE_SEGMENT_TIE,
  CROSS_BAR_TIE,
  SIX_EIGHT_CROSS_TIE,
  DOTTED_EIGHTH,
] as const;

function replaceFirstBar(
  base: RhythmPattern,
  segments: readonly RhythmSegment[]
) {
  return {
    ...base,
    measures: [{ ...base.measures[0], segments }, ...base.measures.slice(1)],
  };
}
export const INVALID_FIXTURES: readonly {
  name: string;
  input: unknown;
  expectedCode: string;
}[] = [
  {
    name: "underfilled4/4",
    input: replaceFirstBar(
      FOUR_FOUR,
      FOUR_FOUR.measures[0].segments.slice(0, -1)
    ),
    expectedCode: "MEASURE_UNDERFILLED",
  },
  {
    name: "overfilled4/4",
    input: replaceFirstBar(FOUR_FOUR, [
      ...FOUR_FOUR.measures[0].segments,
      segment("extra", 4),
    ]),
    expectedCode: "MEASURE_OVERFILLED",
  },
  {
    name: "underfilled3/4",
    input: replaceFirstBar(
      THREE_FOUR,
      THREE_FOUR.measures[0].segments.slice(0, -1)
    ),
    expectedCode: "MEASURE_UNDERFILLED",
  },
  {
    name: "whole note in3/4",
    input: replaceFirstBar(THREE_FOUR, [segment("wrong", 1)]),
    expectedCode: "MEASURE_OVERFILLED",
  },
  {
    name: "whole note in6/8",
    input: replaceFirstBar(SIX_EIGHT, [segment("wrong", 1)]),
    expectedCode: "MEASURE_OVERFILLED",
  },
  {
    name: "six quarter beats in6/8",
    input: replaceFirstBar(
      SIX_EIGHT,
      Array.from({ length: 6 }, (_, index) => segment(`wrong-${index}`, 4))
    ),
    expectedCode: "MEASURE_OVERFILLED",
  },
  {
    name: "noncontiguous tie",
    input: replaceFirstBar(WHOLE_NOTE, [
      segment("a", 4, { tie: "T1" }),
      segment("b", 4),
      segment("c", 4, { tie: "T1" }),
      segment("r", 4, { rest: true }),
    ]),
    expectedCode: "TIE_NONCONTIGUOUS",
  },
  {
    name: "rest tie",
    input: replaceFirstBar(WHOLE_NOTE, [
      segment("r", 2, { rest: true, tie: "T1" }),
      segment("a", 2, { tie: "T1" }),
    ]),
    expectedCode: "REST_TIE",
  },
  {
    name: "singleton tie",
    input: replaceFirstBar(WHOLE_NOTE, [segment("a", 1, { tie: "T1" })]),
    expectedCode: "TIE_TOO_SHORT",
  },
  {
    name: "underfilled cross-bar tie",
    input: replaceFirstBar(
      CROSS_BAR_TIE,
      CROSS_BAR_TIE.measures[0].segments.slice(1)
    ),
    expectedCode: "MEASURE_UNDERFILLED",
  },
];

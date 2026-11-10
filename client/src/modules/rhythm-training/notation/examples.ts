import type { RhythmPattern, RhythmSegment, WrittenDuration } from "../types";

function segment(
  id: string,
  denominator: WrittenDuration["denominator"],
  options: Readonly<{
    rest?: boolean;
    dots?: 0 | 1;
    tieGroupId?: string;
    accent?: "normal" | "strong";
  }> = {}
): RhythmSegment {
  return {
    id,
    kind: options.rest ? "rest" : "note",
    duration: { denominator, dots: options.dots ?? 0 },
    ...(options.tieGroupId !== undefined
      ? { tieGroupId: options.tieGroupId }
      : {}),
    ...(options.accent !== undefined ? { accent: options.accent } : {}),
  };
}

function pattern(
  id: string,
  numerator: 3 | 4 | 6,
  denominator: 4 | 8,
  bars: readonly (readonly RhythmSegment[])[]
): RhythmPattern {
  return {
    id,
    meter: { numerator, denominator } as RhythmPattern["meter"],
    tempo: { pulseBpm: denominator === 8 ? 60 : 80 },
    measures: bars.map((segments, index) => ({
      id: `${id}-bar-${index + 1}`,
      segments,
    })),
  };
}

const FOUR_FOUR_NOTATION = pattern("four-four-notation", 4, 4, [
  [
    segment("four-dot-eighth", 8, { dots: 1, accent: "strong" }),
    segment("four-sixteenth", 16),
    segment("four-beam-a", 8),
    segment("four-beam-b", 8),
    segment("four-rest", 4, { rest: true }),
    segment("four-tie-start", 4, { tieGroupId: "four-tie" }),
  ],
  [
    segment("four-tie-end", 4, { tieGroupId: "four-tie" }),
    segment("four-note-after-tie", 4),
    segment("four-beam-c", 8),
    segment("four-beam-d", 8),
    segment("four-final-rest", 4, { rest: true }),
  ],
]);

const THREE_FOUR_NOTATION = pattern("three-four-notation", 3, 4, [
  [
    segment("three-dotted-rest", 4, { rest: true, dots: 1 }),
    segment("three-eighth-a", 8, { accent: "strong" }),
    segment("three-eighth-b", 8),
    segment("three-final-eighth-rest", 8, { rest: true }),
  ],
  [
    segment("three-quarter", 4, { accent: "strong" }),
    segment("three-beam-a", 8),
    segment("three-beam-b", 8),
    segment("three-quarter-rest", 4, { rest: true }),
  ],
]);

const SIX_EIGHT_NOTATION = pattern("six-eight-notation", 6, 8, [
  [
    segment("six-first-a", 8, { accent: "strong" }),
    segment("six-first-b", 8),
    segment("six-first-c", 8),
    segment("six-dotted-quarter-rest", 4, { rest: true, dots: 1 }),
  ],
  [
    segment("six-second-a", 8, { accent: "strong" }),
    segment("six-second-b", 8),
    segment("six-second-c", 8),
    segment("six-second-d", 8),
    segment("six-second-e", 8),
    segment("six-tie-start", 8, { tieGroupId: "six-tie" }),
  ],
  [
    segment("six-tie-end", 8, { tieGroupId: "six-tie" }),
    segment("six-third-b", 8),
    segment("six-third-c", 8),
    segment("six-third-d", 8),
    segment("six-third-e", 8),
    segment("six-third-f", 8),
  ],
]);

const CROSS_BAR_NOTATION = pattern("cross-bar-notation", 4, 4, [
  [
    segment("cross-a", 4),
    segment("cross-b", 4),
    segment("cross-rest", 4, { rest: true }),
    segment("cross-tie-start", 4, { tieGroupId: "cross-tie" }),
  ],
  [
    segment("cross-tie-end", 4, { tieGroupId: "cross-tie" }),
    segment("cross-c", 4),
    segment("cross-d", 4),
    segment("cross-rest-end", 4, { rest: true }),
  ],
]);

export const RHYTHM_NOTATION_EXAMPLES = Object.freeze([
  {
    id: "four-four",
    title: "4/4 dots, beams, rests, and tie",
    pattern: FOUR_FOUR_NOTATION,
  },
  {
    id: "three-four",
    title: "3/4 dotted rest and eighth pair",
    pattern: THREE_FOUR_NOTATION,
  },
  {
    id: "six-eight",
    title: "6/8 compound 3+3 beams and tie",
    pattern: SIX_EIGHT_NOTATION,
  },
  {
    id: "cross-bar",
    title: "Cross-bar tie with rests",
    pattern: CROSS_BAR_NOTATION,
  },
] as const);

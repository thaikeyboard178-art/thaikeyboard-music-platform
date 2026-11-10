import type { RhythmMeter, WrittenDuration } from "../types";

export type RhythmLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type RhythmFocus =
  | "basic"
  | "dots"
  | "ties"
  | "combined"
  | "sixteenths"
  | "compound"
  | "syncopation"
  | "integrated";

export type TempoBand = Readonly<{
  min: number;
  max: number;
  pulse: "quarter" | "dotted-quarter";
}>;

export type LevelPolicy = Readonly<{
  level: RhythmLevel;
  allowedMeters: readonly RhythmMeter[];
  durations: readonly WrittenDuration[];
  supportedFocus: readonly RhythmFocus[];
  defaultFocus: RhythmFocus;
  maxRestsPerBar: number;
  maxSyncopatedOnsetsPerBar: number;
  maxDifficultySources: number;
  allowDots: boolean;
  allowTies: boolean;
  allowCrossBarTies: boolean;
  allowSixteenths: boolean;
  allowSyncopation: boolean;
  tempo: Readonly<{
    simple: TempoBand;
    compound?: TempoBand;
  }>;
}>;

const simpleMeters = Object.freeze([
  Object.freeze({ numerator: 2, denominator: 4 }),
  Object.freeze({ numerator: 3, denominator: 4 }),
  Object.freeze({ numerator: 4, denominator: 4 }),
] as const);
const fourFour = Object.freeze([
  Object.freeze({ numerator: 4, denominator: 4 }),
] as const);
const compoundMeter = Object.freeze([
  Object.freeze({ numerator: 6, denominator: 8 }),
] as const);

const whole: WrittenDuration = Object.freeze({ denominator: 1, dots: 0 });
const half: WrittenDuration = Object.freeze({ denominator: 2, dots: 0 });
const quarter: WrittenDuration = Object.freeze({ denominator: 4, dots: 0 });
const eighth: WrittenDuration = Object.freeze({ denominator: 8, dots: 0 });
const sixteenth: WrittenDuration = Object.freeze({ denominator: 16, dots: 0 });
const dottedHalf: WrittenDuration = Object.freeze({ denominator: 2, dots: 1 });
const dottedQuarter: WrittenDuration = Object.freeze({
  denominator: 4,
  dots: 1,
});
const dottedEighth: WrittenDuration = Object.freeze({
  denominator: 8,
  dots: 1,
});

const simpleTempo = (
  min: number,
  max: number
): Readonly<{ simple: TempoBand }> =>
  Object.freeze({
    simple: Object.freeze({ min, max, pulse: "quarter" }),
  });

/**
 * The policy table is deliberately data-only. It is not scoring or access
 * policy; it describes what the canonical generator may put in a pattern.
 */
export const LEVEL_POLICIES: Readonly<Record<RhythmLevel, LevelPolicy>> =
  Object.freeze({
    1: Object.freeze({
      level: 1,
      allowedMeters: fourFour,
      durations: Object.freeze([whole, half, quarter]),
      supportedFocus: Object.freeze(["basic"] as readonly RhythmFocus[]),
      defaultFocus: "basic",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 0,
      allowDots: false,
      allowTies: false,
      allowCrossBarTies: false,
      allowSixteenths: false,
      allowSyncopation: false,
      tempo: simpleTempo(60, 84),
    }),
    2: Object.freeze({
      level: 2,
      allowedMeters: simpleMeters,
      durations: Object.freeze([whole, half, quarter, eighth]),
      supportedFocus: Object.freeze(["basic"] as readonly RhythmFocus[]),
      defaultFocus: "basic",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 0,
      allowDots: false,
      allowTies: false,
      allowCrossBarTies: false,
      allowSixteenths: false,
      allowSyncopation: false,
      tempo: simpleTempo(60, 96),
    }),
    3: Object.freeze({
      level: 3,
      allowedMeters: simpleMeters,
      durations: Object.freeze([whole, half, quarter, eighth]),
      supportedFocus: Object.freeze(["basic"] as readonly RhythmFocus[]),
      defaultFocus: "basic",
      maxRestsPerBar: 3,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 0,
      allowDots: false,
      allowTies: false,
      allowCrossBarTies: false,
      allowSixteenths: false,
      allowSyncopation: false,
      tempo: simpleTempo(60, 108),
    }),
    4: Object.freeze({
      level: 4,
      allowedMeters: simpleMeters,
      durations: Object.freeze([
        whole,
        half,
        quarter,
        eighth,
        dottedHalf,
        dottedQuarter,
      ]),
      supportedFocus: Object.freeze([
        "dots",
        "ties",
        "combined",
      ] as readonly RhythmFocus[]),
      defaultFocus: "dots",
      maxRestsPerBar: 3,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 2,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: true,
      allowSixteenths: false,
      allowSyncopation: false,
      tempo: simpleTempo(60, 96),
    }),
    5: Object.freeze({
      level: 5,
      allowedMeters: simpleMeters,
      durations: Object.freeze([
        whole,
        half,
        quarter,
        eighth,
        sixteenth,
        dottedHalf,
        dottedQuarter,
        dottedEighth,
      ]),
      supportedFocus: Object.freeze([
        "sixteenths",
        "dots",
        "ties",
        "combined",
      ] as readonly RhythmFocus[]),
      defaultFocus: "sixteenths",
      maxRestsPerBar: 3,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 3,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: false,
      allowSixteenths: true,
      allowSyncopation: false,
      tempo: simpleTempo(50, 108),
    }),
    6: Object.freeze({
      level: 6,
      allowedMeters: compoundMeter,
      durations: Object.freeze([
        half,
        quarter,
        eighth,
        dottedQuarter,
        dottedHalf,
      ]),
      supportedFocus: Object.freeze([
        "basic",
        "compound",
      ] as readonly RhythmFocus[]),
      defaultFocus: "compound",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 0,
      allowDots: true,
      allowTies: false,
      allowCrossBarTies: false,
      allowSixteenths: false,
      allowSyncopation: false,
      tempo: Object.freeze({
        simple: Object.freeze({ min: 40, max: 72, pulse: "dotted-quarter" }),
        compound: Object.freeze({ min: 40, max: 72, pulse: "dotted-quarter" }),
      }),
    }),
    7: Object.freeze({
      level: 7,
      allowedMeters: simpleMeters,
      durations: Object.freeze([
        whole,
        half,
        quarter,
        eighth,
        sixteenth,
        dottedQuarter,
        dottedEighth,
      ]),
      supportedFocus: Object.freeze(["syncopation"] as readonly RhythmFocus[]),
      defaultFocus: "syncopation",
      maxRestsPerBar: 3,
      maxSyncopatedOnsetsPerBar: 1,
      maxDifficultySources: 1,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: false,
      allowSixteenths: true,
      allowSyncopation: true,
      tempo: simpleTempo(50, 84),
    }),
    8: Object.freeze({
      level: 8,
      allowedMeters: Object.freeze([...simpleMeters, ...compoundMeter]),
      durations: Object.freeze([
        whole,
        half,
        quarter,
        eighth,
        sixteenth,
        dottedHalf,
        dottedQuarter,
        dottedEighth,
      ]),
      supportedFocus: Object.freeze([
        "basic",
        "dots",
        "ties",
        "combined",
        "sixteenths",
        "compound",
        "syncopation",
        "integrated",
      ] as readonly RhythmFocus[]),
      defaultFocus: "integrated",
      maxRestsPerBar: 4,
      maxSyncopatedOnsetsPerBar: 2,
      maxDifficultySources: 2,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: true,
      allowSixteenths: true,
      allowSyncopation: true,
      tempo: Object.freeze({
        simple: Object.freeze({ min: 50, max: 108, pulse: "quarter" }),
        compound: Object.freeze({ min: 40, max: 72, pulse: "dotted-quarter" }),
      }),
    }),
  });

export function policyForLevel(level: RhythmLevel): LevelPolicy {
  return LEVEL_POLICIES[level];
}

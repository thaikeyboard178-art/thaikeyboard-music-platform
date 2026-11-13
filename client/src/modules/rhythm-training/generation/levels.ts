import type {
  RhythmLevel,
  RhythmMeter,
  RhythmTrack,
  WrittenDuration,
} from "../types";
import { MAX_PULSE_BPM, MIN_PULSE_BPM } from "../rhythm/meters";

export type { RhythmLevel, RhythmTrack } from "../types";
export type RhythmFocus =
  | "basic"
  | "dots"
  | "ties"
  | "combined"
  | "sixteenths"
  | "compound"
  | "syncopation"
  | "integrated"
  | "snap"
  | "sandwich"
  | "quarter-triplets"
  | "eighth-triplets"
  | "triplet-combined";

export type TempoBand = Readonly<{
  min: number;
  max: number;
  pulse: "quarter" | "eighth" | "dotted-quarter" | "half";
}>;

export type LevelPolicy = Readonly<{
  level: RhythmTrack;
  allowedMeters: readonly RhythmMeter[];
  durations: readonly WrittenDuration[];
  restDurations: readonly WrittenDuration[];
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
  allowTuplets: boolean;
  /** Maximum quarter pulses containing sixteenth-family notation per bar. */
  maxFinePulsesPerBar: number;
  tempo: Readonly<{
    simple: TempoBand;
    eighth?: TempoBand;
    compound?: TempoBand;
    half?: TempoBand;
  }>;
}>;

const freezeMeters = (meters: readonly RhythmMeter[]) =>
  Object.freeze(meters.map(meter => Object.freeze({ ...meter })));
const simpleMeters = freezeMeters([
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
]);
const fourFour = freezeMeters([{ numerator: 4, denominator: 4 }]);
const groupingMeters = freezeMeters([
  { numerator: 3, denominator: 8 },
  { numerator: 6, denominator: 8 },
  { numerator: 9, denominator: 8 },
]);
const allaBreve = freezeMeters([{ numerator: 2, denominator: 2 }]);

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

const durationList = (...durations: WrittenDuration[]) =>
  Object.freeze(durations);
const focusList = (...focus: RhythmFocus[]) => Object.freeze(focus);
const band = (
  _min: number,
  _max: number,
  pulse: TempoBand["pulse"]
): TempoBand =>
  Object.freeze({ min: MIN_PULSE_BPM, max: MAX_PULSE_BPM, pulse });
const levelPolicy = (policy: LevelPolicy): LevelPolicy =>
  Object.freeze({
    ...policy,
    allowedMeters: Object.freeze([...policy.allowedMeters]),
    durations: Object.freeze([...policy.durations]),
    restDurations: Object.freeze([...policy.restDurations]),
    supportedFocus: Object.freeze([...policy.supportedFocus]),
    tempo: Object.freeze({ ...policy.tempo }),
  });

/**
 * Curriculum runtime generation gates. The only numbered tracks are Levels
 * 1–6; the optional 2/2 progression is represented separately as Bonus.
 */
export const LEVEL_POLICIES: Readonly<Record<RhythmLevel, LevelPolicy>> =
  Object.freeze({
    1: levelPolicy({
      level: 1,
      allowedMeters: fourFour,
      durations: durationList(whole, half, quarter),
      restDurations: durationList(quarter),
      supportedFocus: focusList("basic"),
      defaultFocus: "basic",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 0,
      allowDots: false,
      allowTies: false,
      allowCrossBarTies: false,
      allowSixteenths: false,
      allowSyncopation: false,
      allowTuplets: false,
      maxFinePulsesPerBar: 0,
      tempo: { simple: band(60, 84, "quarter") },
    }),
    2: levelPolicy({
      level: 2,
      allowedMeters: fourFour,
      durations: durationList(whole, half, quarter, eighth),
      restDurations: durationList(quarter, eighth),
      supportedFocus: focusList("basic"),
      defaultFocus: "basic",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 0,
      allowDots: false,
      allowTies: false,
      allowCrossBarTies: false,
      allowSixteenths: false,
      allowSyncopation: false,
      allowTuplets: false,
      maxFinePulsesPerBar: 0,
      tempo: { simple: band(60, 96, "quarter") },
    }),
    3: levelPolicy({
      level: 3,
      allowedMeters: simpleMeters,
      durations: durationList(
        whole,
        half,
        quarter,
        eighth,
        dottedHalf,
        dottedQuarter
      ),
      restDurations: durationList(quarter, eighth, dottedHalf, dottedQuarter),
      supportedFocus: focusList("dots", "ties", "combined"),
      defaultFocus: "combined",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 2,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: true,
      allowSixteenths: false,
      allowSyncopation: false,
      allowTuplets: false,
      maxFinePulsesPerBar: 0,
      tempo: { simple: band(60, 108, "quarter") },
    }),
    4: levelPolicy({
      level: 4,
      allowedMeters: simpleMeters,
      durations: durationList(
        whole,
        half,
        quarter,
        eighth,
        sixteenth,
        dottedHalf,
        dottedQuarter,
        dottedEighth
      ),
      restDurations: durationList(
        quarter,
        eighth,
        sixteenth,
        dottedHalf,
        dottedQuarter
      ),
      supportedFocus: focusList(
        "dots",
        "ties",
        "combined",
        "sixteenths",
        "snap",
        "sandwich",
        "integrated"
      ),
      defaultFocus: "sixteenths",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 1,
      maxDifficultySources: 2,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: true,
      allowSixteenths: true,
      allowSyncopation: true,
      allowTuplets: false,
      maxFinePulsesPerBar: 2,
      tempo: { simple: band(60, 96, "quarter") },
    }),
    5: levelPolicy({
      level: 5,
      allowedMeters: simpleMeters,
      durations: durationList(
        whole,
        half,
        quarter,
        eighth,
        sixteenth,
        dottedHalf,
        dottedQuarter,
        dottedEighth
      ),
      restDurations: durationList(
        quarter,
        eighth,
        sixteenth,
        dottedHalf,
        dottedQuarter,
        dottedEighth
      ),
      supportedFocus: focusList(
        "dots",
        "ties",
        "combined",
        "sixteenths",
        "syncopation",
        "integrated",
        "quarter-triplets",
        "eighth-triplets",
        "triplet-combined"
      ),
      defaultFocus: "integrated",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 1,
      maxDifficultySources: 2,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: false,
      allowSixteenths: true,
      allowSyncopation: true,
      allowTuplets: true,
      maxFinePulsesPerBar: 1,
      tempo: { simple: band(50, 108, "quarter") },
    }),
    6: levelPolicy({
      level: 6,
      allowedMeters: groupingMeters,
      durations: durationList(half, quarter, eighth, dottedQuarter, dottedHalf),
      restDurations: durationList(quarter, eighth, dottedQuarter, dottedHalf),
      supportedFocus: focusList(
        "basic",
        "compound",
        "dots",
        "ties",
        "combined"
      ),
      defaultFocus: "basic",
      maxRestsPerBar: 2,
      maxSyncopatedOnsetsPerBar: 0,
      maxDifficultySources: 2,
      allowDots: true,
      allowTies: true,
      allowCrossBarTies: true,
      allowSixteenths: false,
      allowSyncopation: false,
      allowTuplets: false,
      maxFinePulsesPerBar: 0,
      tempo: {
        simple: band(30, 300, "eighth"),
        eighth: band(30, 300, "eighth"),
        compound: band(30, 300, "eighth"),
      },
    }),
  });

/** Optional V1-supported Alla Breve progression; it is not a seventh Level. */
export const BONUS_POLICY: LevelPolicy = levelPolicy({
  level: "bonus",
  allowedMeters: allaBreve,
  durations: durationList(whole, half, quarter, eighth),
  restDurations: durationList(quarter, eighth),
  supportedFocus: focusList("basic"),
  defaultFocus: "basic",
  maxRestsPerBar: 2,
  maxSyncopatedOnsetsPerBar: 0,
  maxDifficultySources: 0,
  allowDots: false,
  allowTies: false,
  allowCrossBarTies: false,
  allowSixteenths: false,
  allowSyncopation: false,
  allowTuplets: false,
  maxFinePulsesPerBar: 0,
  tempo: { simple: band(40, 72, "half"), half: band(40, 72, "half") },
});

export function policyForLevel(level: RhythmTrack): LevelPolicy {
  return level === "bonus" ? BONUS_POLICY : LEVEL_POLICIES[level];
}

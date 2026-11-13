import type {
  RhythmMeter,
  RhythmPattern,
  RhythmSegment,
  RhythmTrack,
  RhythmTupletGroup,
  WrittenDuration,
} from "../types";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { durationToTicks } from "../rhythm/durations";
import { compoundGroupAt } from "../rhythm/grouping";
import {
  deriveMeter,
  getDefaultPulseBpm,
  MAX_PULSE_BPM,
  MIN_PULSE_BPM,
} from "../rhythm/meters";
import { requireValidRhythmPattern } from "../rhythm/validate";
import { policyForLevel, type LevelPolicy, type RhythmFocus } from "./levels";
import { createSeededRandom, seededShuffle } from "./random";

export type RhythmGenerationConfig = Readonly<{
  readonly seed: string;
  readonly level: RhythmTrack;
  readonly meter?: RhythmMeter;
  readonly bars?: 1 | 2 | 4;
  readonly pulseBpm?: number;
  readonly focus?:
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
}>;

type ConfigFocus = NonNullable<RhythmGenerationConfig["focus"]>;
type TupletKind = "quarter" | "eighth";
type Features = Readonly<{
  dots: boolean;
  ties: boolean;
  sixteenths: boolean;
  syncopation: boolean;
  tuplets: TupletKind | null;
}>;
type RawSegment = {
  kind: "note" | "rest";
  duration: WrittenDuration;
  tieGroupId?: string;
  tupletGroup?: RhythmTupletGroup;
};
type ResolvedConfig = Readonly<{
  policy: LevelPolicy;
  meter: RhythmMeter;
  bars: 1 | 2 | 4;
  pulseBpm: number;
  focus: RhythmFocus;
  features: Features;
}>;

const CONFIG_FOCI: readonly ConfigFocus[] = Object.freeze([
  "basic",
  "dots",
  "ties",
  "combined",
  "sixteenths",
  "compound",
  "syncopation",
  "integrated",
  "snap",
  "sandwich",
  "quarter-triplets",
  "eighth-triplets",
  "triplet-combined",
]);
const MAX_GENERATION_ATTEMPTS = 256;
const MAX_COMPOSITION_NODES = 24_000;
const MAX_SEGMENTS_PER_BAR = 32;

function fail(message: string): never {
  throw new RangeError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function meterKey(meter: RhythmMeter): string {
  return `${meter.numerator}/${meter.denominator}`;
}

function sameMeter(left: RhythmMeter, right: RhythmMeter): boolean {
  return (
    left.numerator === right.numerator && left.denominator === right.denominator
  );
}

function durationKey(duration: WrittenDuration): string {
  return `${duration.denominator}/${duration.dots}`;
}

function isDotted(duration: WrittenDuration): boolean {
  return duration.dots === 1;
}

function isSixteenthFamily(duration: WrittenDuration): boolean {
  return (
    duration.denominator === 16 ||
    (duration.denominator === 8 && duration.dots === 1)
  );
}

function isCompoundPulseDot(
  duration: WrittenDuration,
  meter: RhythmMeter
): boolean {
  return (
    (meter.numerator === 6 || meter.numerator === 9) &&
    meter.denominator === 8 &&
    duration.dots === 1 &&
    duration.denominator === 4
  );
}

function hasFocus(value: unknown): value is ConfigFocus {
  return (
    typeof value === "string" && CONFIG_FOCI.includes(value as ConfigFocus)
  );
}

function meterIsAllowed(policy: LevelPolicy, meter: RhythmMeter): boolean {
  return policy.allowedMeters.some(candidate => sameMeter(candidate, meter));
}

function isSimpleMeterPolicy(policy: LevelPolicy): boolean {
  return policy.allowedMeters.every(meter => meter.denominator === 4);
}

function isDotsAndTiesIntroduction(policy: LevelPolicy): boolean {
  return (
    isSimpleMeterPolicy(policy) &&
    policy.allowDots &&
    policy.allowTies &&
    !policy.allowSixteenths &&
    !policy.allowSyncopation
  );
}

function isSixteenthIntroduction(policy: LevelPolicy): boolean {
  return (
    isSimpleMeterPolicy(policy) &&
    policy.allowSixteenths &&
    !policy.allowSyncopation
  );
}

function isControlledComplexPolicy(policy: LevelPolicy): boolean {
  return (
    policy.allowSixteenths &&
    policy.allowSyncopation &&
    policy.maxFinePulsesPerBar === 1
  );
}

function combinedRequiresDotAndTie(policy: LevelPolicy): boolean {
  return (
    policy.allowDots &&
    policy.allowTies &&
    !isControlledComplexPolicy(policy)
  );
}

function enforcesPreIntroductionPulseSustain(policy: LevelPolicy): boolean {
  return (
    policy.level !== "bonus" &&
    !policy.allowDots &&
    !policy.allowTies &&
    !policy.allowSixteenths
  );
}

function validateBasicConfig(input: RhythmGenerationConfig): void {
  if (!isRecord(input)) fail("Generation config must be an object.");
  if (
    typeof input.seed !== "string" ||
    input.seed.length === 0 ||
    input.seed.trim().length === 0
  ) {
    fail("Generation config requires a nonempty seed.");
  }
  if (
    input.level !== "bonus" &&
    (typeof input.level !== "number" ||
      !Number.isInteger(input.level) ||
      input.level < 1 ||
      input.level > 6)
  ) {
    fail("Generation config level must be 1 through 6 or the Bonus track.");
  }
  if (
    input.bars !== undefined &&
    input.bars !== 1 &&
    input.bars !== 2 &&
    input.bars !== 4
  ) {
    fail("Generation config bars must be 1, 2, or 4.");
  }
  if (input.focus !== undefined && !hasFocus(input.focus)) {
    fail("Generation config focus is unsupported.");
  }
  if (
    input.pulseBpm !== undefined &&
    (typeof input.pulseBpm !== "number" ||
      !Number.isFinite(input.pulseBpm) ||
      input.pulseBpm < MIN_PULSE_BPM ||
      input.pulseBpm > MAX_PULSE_BPM)
  ) {
    fail(
      `Generation config pulseBpm must be between ${MIN_PULSE_BPM} and ${MAX_PULSE_BPM}.`
    );
  }
}

function featureSet(
  policy: LevelPolicy,
  focus: RhythmFocus,
  meter: RhythmMeter,
  random: () => number,
  bars: 1 | 2 | 4
): Features {
  if (focus === "dots")
    return {
      dots: policy.allowDots,
      ties: false,
      sixteenths: false,
      syncopation: false,
      tuplets: null,
    };
  if (focus === "ties")
    return {
      dots: false,
      ties: policy.allowTies,
      sixteenths: false,
      syncopation: false,
      tuplets: null,
    };
  if (focus === "snap")
    return {
      dots: true,
      ties: false,
      sixteenths: true,
      syncopation: false,
      tuplets: null,
    };
  if (focus === "sandwich")
    return {
      dots: false,
      ties: false,
      sixteenths: true,
      syncopation: false,
      tuplets: null,
    };
  if (focus === "quarter-triplets")
    return {
      dots: false,
      ties: false,
      sixteenths: false,
      syncopation: false,
      tuplets: "quarter",
    };
  if (focus === "eighth-triplets")
    return {
      dots: false,
      ties: false,
      sixteenths: false,
      syncopation: false,
      tuplets: "eighth",
    };
  if (focus === "triplet-combined") {
    const tupletKind: TupletKind =
      meter.numerator === 2 && meter.denominator === 4
        ? "eighth"
        : random() < 0.5
          ? "quarter"
          : "eighth";
    const sources: Array<"dots" | "ties" | "sixteenths"> = [];
    if (
      policy.allowDots &&
      !(meter.numerator === 2 && meter.denominator === 4) &&
      !(tupletKind === "quarter" && meter.numerator === 3)
    )
      sources.push("dots");
    if (policy.allowTies) sources.push("ties");
    if (policy.allowSixteenths) sources.push("sixteenths");
    const onlySixteenthsFitWithARequiredRest =
      (tupletKind === "quarter" && meter.numerator === 3) ||
      (tupletKind === "eighth" && meter.numerator === 2);
    if (onlySixteenthsFitWithARequiredRest) {
      sources.splice(0, sources.length, "sixteenths");
    }
    const source = sources[Math.floor(random() * sources.length)];
    return {
      dots: source === "dots",
      ties: source === "ties",
      sixteenths: source === "sixteenths",
      syncopation: false,
      tuplets: tupletKind,
    };
  }
  if (focus === "combined") {
    if (isDotsAndTiesIntroduction(policy)) {
      return {
        dots: true,
        ties: true,
        sixteenths: false,
        syncopation: false,
        tuplets: null,
      };
    }
    if (isControlledComplexPolicy(policy)) {
      return {
        dots: false,
        ties: policy.allowTies,
        sixteenths: policy.allowSixteenths,
        syncopation: false,
        tuplets: null,
      };
    }
    return {
      dots: policy.allowDots,
      ties: policy.allowTies,
      sixteenths: false,
      syncopation: false,
      tuplets: null,
    };
  }
  if (focus === "sixteenths")
    return {
      dots: false,
      ties: false,
      sixteenths: policy.allowSixteenths,
      syncopation: false,
      tuplets: null,
    };
  if (focus === "syncopation")
    return {
      dots: false,
      ties: policy.allowTies,
      sixteenths: false,
      syncopation: policy.allowSyncopation,
      tuplets: null,
    };
  if (focus === "compound")
    return {
      dots: false,
      ties: false,
      sixteenths: false,
      syncopation: false,
      tuplets: null,
    };
  if (focus === "basic")
    return {
      dots: false,
      ties: false,
      sixteenths: false,
      syncopation: false,
      tuplets: null,
    };

  // Integrated tracks choose one or two genuine sources; Level-5 triplets
  // count as one source. Compound meter's pulse-defining dots are excluded.
  const sources: Array<"dots" | "ties" | "sixteenths" | "syncopation" | "tuplets"> = [];
  if (policy.allowDots && (meter.numerator !== 6 || random() > 0.35))
    sources.push("dots");
  if (policy.allowTies) sources.push("ties");
  if (policy.allowSixteenths) sources.push("sixteenths");
  if (policy.allowSyncopation && meter.denominator === 4)
    sources.push("syncopation");
  if (policy.allowTuplets) sources.push("tuplets");
  const shuffled = seededShuffle(sources, random);
  const count =
    shuffled.length === 0
      ? 0
      : 1 + Math.floor(random() * Math.min(2, shuffled.length));
  const selected = new Set(shuffled.slice(0, count));
  if (
    selected.has("tuplets") &&
    bars === 1 &&
    meter.numerator === 2 &&
    meter.denominator === 4 &&
    (selected.has("dots") || selected.has("ties"))
  ) {
    // In 2/4 the required rest plus an eighth-triplet leaves no room for an
    // independent dot or tie. Sixteenths can genuinely coexist in the other
    // pulse, so retain the two-source budget with that feasible pairing.
    selected.delete("dots");
    selected.delete("ties");
    if (policy.allowSixteenths) selected.add("sixteenths");
  }
  const tupletKind: TupletKind | null = selected.has("tuplets")
    ? meter.numerator === 2 && meter.denominator === 4
      ? "eighth"
      : bars === 1 &&
          meter.numerator === 3 &&
          (selected.has("dots") || selected.has("ties"))
        ? "eighth"
      : random() < 0.5
        ? "quarter"
        : "eighth"
    : null;
  return {
    dots: selected.has("dots"),
    ties: selected.has("ties"),
    sixteenths: selected.has("sixteenths"),
    syncopation: selected.has("syncopation"),
    tuplets: tupletKind,
  };
}

function chooseMeter(
  policy: LevelPolicy,
  requested: RhythmMeter | undefined,
  focus: RhythmFocus,
  bars: 1 | 2 | 4,
  random: () => number
): RhythmMeter {
  if (requested !== undefined) {
    try {
      deriveMeter(requested);
    } catch {
      fail("Generation config meter is unsupported.");
    }
    if (!meterIsAllowed(policy, requested))
      fail("Generation config meter is not allowed at this level.");
  }

  let choices = policy.allowedMeters;
  if (
    policy.level === 6 &&
    (focus === "dots" || focus === "combined")
  ) {
    if (
      requested?.numerator === 3 &&
      requested.denominator === 8
    ) {
      fail(
        focus === "dots"
          ? "Level 6 dots focus is infeasible in 3/8: the taught dotted-quarter value fills the measure, leaving no room for the required rest; choose basic or ties focus, or use 6/8 or 9/8."
          : "Level 6 combined focus is infeasible in 3/8: the taught dotted-quarter value fills the measure, leaving no room for the required rest; choose basic or ties focus, or use 6/8 or 9/8."
      );
    }
    if (requested === undefined)
      choices = choices.filter(
        meter => !(meter.numerator === 3 && meter.denominator === 8)
      );
  }
  if (focus === "combined" && combinedRequiresDotAndTie(policy)) {
    if (
      requested?.numerator === 2 &&
      requested.denominator === 4 &&
      bars === 1
    ) {
      fail(
        `Level ${policy.level} combined dot-and-tie focus is infeasible in a single 2/4 measure with the required rest; choose dots or ties focus, use multiple 2/4 bars, or use 3/4 or 4/4.`
      );
    }
    if (requested === undefined)
      choices = choices.filter(meter => meter.numerator !== 2);
  }
  if (focus === "compound")
    choices = choices.filter(
      meter => meter.denominator === 8 && meter.numerator !== 3
    );
  const requiresSimpleMeter =
    (focus === "sixteenths" &&
      (isSixteenthIntroduction(policy) || isControlledComplexPolicy(policy))) ||
    (focus === "syncopation" && isControlledComplexPolicy(policy));
  if (requiresSimpleMeter && !isSimpleMeterPolicy(policy)) {
    choices = choices.filter(meter => meter.denominator === 4);
  }
  if (choices.length === 0)
    fail("No meter is compatible with the selected focus.");
  if (
    requested !== undefined &&
    !choices.some(meter => sameMeter(meter, requested))
  ) {
    fail("Generation config meter conflicts with the selected focus.");
  }
  const chosen = requested ?? choices[Math.floor(random() * choices.length)];
  if (chosen.numerator === 6 && chosen.denominator === 8) {
    return Object.freeze({ numerator: 6, denominator: 8 });
  }
  return Object.freeze({ ...chosen });
}

function resolveConfig(
  config: RhythmGenerationConfig,
  random: () => number
): ResolvedConfig {
  validateBasicConfig(config);
  const policy = policyForLevel(config.level);
  const omittedFocusUsesDotsInTwoFour =
    config.focus === undefined &&
    policy.level === 3 &&
    config.meter?.numerator === 2 &&
    config.meter.denominator === 4;
  const focus = (
    omittedFocusUsesDotsInTwoFour ? "dots" : (config.focus ?? policy.defaultFocus)
  ) as RhythmFocus;
  if (!policy.supportedFocus.includes(focus))
    fail("Focus is not configured for this level.");
  const bars = config.bars ?? 1;
  const meter = chooseMeter(policy, config.meter, focus, bars, random);
  // Keep the former single tempo draw consumed so seeded note/rest choices
  // remain stable, while the BPM itself is now canonical and deterministic.
  if (config.pulseBpm === undefined) random();
  const pulseBpm = config.pulseBpm ?? getDefaultPulseBpm(meter);
  const features = featureSet(policy, focus, meter, random, bars);
  return Object.freeze({ policy, meter, bars, pulseBpm, focus, features });
}

function allowedDurations(
  resolved: ResolvedConfig
): readonly WrittenDuration[] {
  const { policy, meter, features } = resolved;
  return Object.freeze(
    policy.durations.filter(duration => {
      if (
        isDotted(duration) &&
        !features.dots &&
        !isCompoundPulseDot(duration, meter)
      )
        return false;
      if (isSixteenthFamily(duration) && !features.sixteenths) return false;
      // Compound pulse dots are vocabulary for the meter itself, not a new dot lesson.
      if (
        meter.numerator === 6 &&
        meter.denominator === 8 &&
        duration.denominator === 1
      )
        return false;
      return true;
    })
  );
}

function buildBar(
  resolved: ResolvedConfig,
  random: () => number,
  durations: readonly WrittenDuration[],
  initialSegments: readonly RawSegment[] = []
): RawSegment[] | null {
  const meter = deriveMeter(resolved.meter);
  const durationRows = durations.map(duration => ({
    duration,
    ticks: durationToTicks(duration),
  }));
  const memo = new Set<string>();
  let nodes = 0;
  const pulseTicks = meter.pulseTicks;
  const fineFeature = resolved.features.sixteenths;
  const preservePulseBoundaries = !resolved.features.syncopation;
  const permittedRestDurations = new Set(
    resolved.policy.restDurations.map(durationKey)
  );
  const maxRestsPerBar = Math.min(resolved.policy.maxRestsPerBar, 2);
  const preferFine =
    resolved.features.syncopation || resolved.features.sixteenths;

  function walk(
    remaining: number,
    offset: number,
    segments: RawSegment[],
    restCount: number,
    finePulses: readonly number[],
    previousWasRest: boolean
  ): RawSegment[] | null {
    nodes += 1;
    if (nodes > MAX_COMPOSITION_NODES) return null;
    if (remaining === 0) {
      return segments.some(segment => segment.kind === "note") &&
        restCount >= 1 &&
        restCount <= 2
        ? segments
        : null;
    }
    if (segments.length >= MAX_SEGMENTS_PER_BAR) return null;
    const key = `${remaining}:${restCount}:${previousWasRest}:${finePulses.join(",")}:${segments.length}`;
    if (memo.has(key)) return null;
    const eligible = durationRows
      .filter(row => row.ticks <= remaining)
      .filter(row => {
        const group = compoundGroupAt(resolved.meter, offset);
        if (group && offset + row.ticks > group.endTicks) return false;
        const offPulse = offset % pulseTicks !== 0;
        if (
          preservePulseBoundaries &&
          offPulse &&
          row.ticks > pulseTicks - (offset % pulseTicks)
        )
          return false;
        if (fineFeature && isSixteenthFamily(row.duration)) {
          if ((offset % pulseTicks) + row.ticks > pulseTicks) return false;
          const pulse = Math.floor(offset / pulseTicks);
          if (
            resolved.policy.maxFinePulsesPerBar > 0 &&
            !finePulses.includes(pulse) &&
            finePulses.length >= resolved.policy.maxFinePulsesPerBar
          )
            return false;
        }
        return true;
      });
    const orderedRows = seededShuffle(eligible, random).sort((left, right) => {
      const leftFine = isSixteenthFamily(left.duration) ? 0 : 1;
      const rightFine = isSixteenthFamily(right.duration) ? 0 : 1;
      return preferFine ? leftFine - rightFine : 0;
    });
    for (const row of orderedRows) {
      const kinds: Array<"note" | "rest"> = ["note", "rest"];
      if (random() < (isDotsAndTiesIntroduction(resolved.policy) ? 0.55 : 0.28))
        kinds.reverse();
      for (const kind of kinds) {
        if (kind === "rest" && previousWasRest) continue;
        if (
          kind === "rest" &&
          !permittedRestDurations.has(durationKey(row.duration))
        )
          continue;
        if (kind === "rest" && restCount >= maxRestsPerBar)
          continue;
        const pulse = Math.floor(offset / pulseTicks);
        const nextFinePulses =
          isSixteenthFamily(row.duration) && !finePulses.includes(pulse)
            ? [...finePulses, pulse]
            : finePulses;
        const answer = walk(
          remaining - row.ticks,
          offset + row.ticks,
          [...segments, { kind, duration: row.duration }],
          restCount + (kind === "rest" ? 1 : 0),
          nextFinePulses,
          kind === "rest"
        );
        if (answer !== null) return answer;
      }
    }
    memo.add(key);
    return null;
  }

  let initialOffset = 0;
  const initialFinePulses: number[] = [];
  for (const segment of initialSegments) {
    if (
      isSixteenthFamily(segment.duration) &&
      !initialFinePulses.includes(Math.floor(initialOffset / pulseTicks))
    ) {
      initialFinePulses.push(Math.floor(initialOffset / pulseTicks));
    }
    initialOffset += durationToTicks(segment.duration);
  }
  if (initialOffset > meter.measureTicks) return null;
  return walk(
    meter.measureTicks - initialOffset,
    initialOffset,
    [...initialSegments],
    initialSegments.filter(segment => segment.kind === "rest").length,
    initialFinePulses,
    initialSegments.at(-1)?.kind === "rest"
  );
}

function splitOptions(
  duration: WrittenDuration,
  durations: readonly WrittenDuration[]
): readonly [WrittenDuration, WrittenDuration][] {
  const total = durationToTicks(duration);
  const rows: Array<[WrittenDuration, WrittenDuration]> = [];
  for (const first of durations) {
    const firstTicks = durationToTicks(first);
    for (const second of durations) {
      if (firstTicks + durationToTicks(second) === total)
        rows.push([first, second]);
    }
  }
  return rows;
}

function applyIntraBarTie(
  bars: RawSegment[][],
  resolved: ResolvedConfig,
  random: () => number,
  durations: readonly WrittenDuration[]
): boolean {
  const candidates: Array<{
    bar: number;
    index: number;
    options: readonly [WrittenDuration, WrittenDuration][];
  }> = [];
  bars.forEach((bar, barIndex) => {
    bar.forEach((segment, index) => {
      if (segment.kind !== "note" || segment.tupletGroup !== undefined) return;
      const options = splitOptions(segment.duration, durations).filter(
        ([left, right]) => {
          if (resolved.features.sixteenths) return true;
          return !isSixteenthFamily(left) && !isSixteenthFamily(right);
        }
      );
      if (options.length > 0)
        candidates.push({ bar: barIndex, index, options });
    });
  });
  if (resolved.features.sixteenths) {
    const finePairCandidates = candidates.flatMap(candidate => {
      const options = candidate.options.filter(
        ([left, right]) => isSixteenthFamily(left) && isSixteenthFamily(right)
      );
      return options.length > 0 ? [{ ...candidate, options }] : [];
    });
    if (finePairCandidates.length > 0) {
      const chosen =
        finePairCandidates[Math.floor(random() * finePairCandidates.length)];
      const pair = chosen.options[Math.floor(random() * chosen.options.length)];
      bars[chosen.bar].splice(
        chosen.index,
        1,
        { kind: "note", duration: pair[0], tieGroupId: "tie-1" },
        { kind: "note", duration: pair[1], tieGroupId: "tie-1" }
      );
      return true;
    }

    const pulseTicks = deriveMeter(resolved.meter).pulseTicks;
    const adjacentFine: Array<{ bar: number; index: number }> = [];
    bars.forEach((bar, barIndex) => {
      let offset = 0;
      bar.forEach((segment, index) => {
        const next = bar[index + 1];
        const end =
          offset +
          durationToTicks(segment.duration) +
          (next ? durationToTicks(next.duration) : 0);
        const pulseEnd = (Math.floor(offset / pulseTicks) + 1) * pulseTicks;
        if (
          next &&
          segment.kind === "note" &&
          next.kind === "note" &&
          segment.tupletGroup === undefined &&
          next.tupletGroup === undefined &&
          isSixteenthFamily(segment.duration) &&
          isSixteenthFamily(next.duration) &&
          (resolved.features.syncopation ||
            offset % pulseTicks === 0 ||
            end <= pulseEnd)
        ) {
          adjacentFine.push({ bar: barIndex, index });
        }
        offset += durationToTicks(segment.duration);
      });
    });
    if (adjacentFine.length > 0) {
      const chosen = adjacentFine[Math.floor(random() * adjacentFine.length)];
      bars[chosen.bar][chosen.index].tieGroupId = "tie-1";
      bars[chosen.bar][chosen.index + 1].tieGroupId = "tie-1";
      return true;
    }
  }
  if (candidates.length === 0) {
    // Two adjacent fine-grid notes can be tied even when neither note can be
    // split further. Requiring a splittable segment made fine+tie generation
    // impossible when the exact-fill search selected only sixteenths.
    const adjacent: Array<{ bar: number; index: number }> = [];
    const pulseTicks = deriveMeter(resolved.meter).pulseTicks;
    bars.forEach((bar, barIndex) => {
      let offset = 0;
      bar.forEach((segment, index) => {
        const next = bar[index + 1];
        const ticks = durationToTicks(segment.duration);
        if (
          next &&
          segment.kind === "note" &&
          next.kind === "note" &&
          segment.tupletGroup === undefined &&
          next.tupletGroup === undefined
        ) {
          const end = offset + ticks + durationToTicks(next.duration);
          const pulseEnd = (Math.floor(offset / pulseTicks) + 1) * pulseTicks;
          if (
            resolved.features.syncopation ||
            offset % pulseTicks === 0 ||
            end <= pulseEnd
          ) {
            adjacent.push({ bar: barIndex, index });
          }
        }
        offset += ticks;
      });
    });
    if (adjacent.length === 0) return false;
    const chosen = adjacent[Math.floor(random() * adjacent.length)];
    bars[chosen.bar][chosen.index].tieGroupId = "tie-1";
    bars[chosen.bar][chosen.index + 1].tieGroupId = "tie-1";
    return true;
  }
  const chosen = candidates[Math.floor(random() * candidates.length)];
  const pair = chosen.options[Math.floor(random() * chosen.options.length)];
  const source = bars[chosen.bar][chosen.index];
  bars[chosen.bar].splice(
    chosen.index,
    1,
    { kind: "note", duration: pair[0], tieGroupId: "tie-1" },
    { kind: "note", duration: pair[1], tieGroupId: "tie-1" }
  );
  return source.kind === "note";
}

function applyCrossBarTie(bars: RawSegment[][]): boolean {
  if (
    (bars.length !== 2 && bars.length !== 4) ||
    bars[0].length === 0 ||
    bars[1].length === 0
  )
    return false;
  const left = bars[0][bars[0].length - 1];
  const right = bars[1][0];
  if (left.tupletGroup !== undefined || right.tupletGroup !== undefined)
    return false;
  if (left.kind !== "note") left.kind = "note";
  if (right.kind !== "note") right.kind = "note";
  left.tieGroupId = "tie-1";
  right.tieGroupId = "tie-1";
  return true;
}

function applyTupletGroup(
  bars: RawSegment[][],
  kind: TupletKind,
  meter: RhythmMeter,
  random: () => number
): boolean {
  if (meter.denominator !== 4) return false;
  const duration: WrittenDuration =
    kind === "quarter"
      ? { denominator: 4, dots: 0 }
      : { denominator: 8, dots: 0 };
  const pulseTicks = deriveMeter(meter).pulseTicks;
  const spanTicks = kind === "quarter" ? pulseTicks * 2 : pulseTicks;
  const startAlignment = spanTicks;
  const candidates: Array<{ bar: number; index: number; count: number }> = [];

  bars.forEach((bar, barIndex) => {
    let offset = 0;
    bar.forEach((segment, index) => {
      const eligible =
        segment.kind === "note" &&
        segment.tieGroupId === undefined &&
        segment.tupletGroup === undefined &&
        segment.duration.dots === 0;
      if (eligible && offset % startAlignment === 0) {
        if (
          kind === "quarter" &&
          segment.duration.denominator === 2 &&
          durationToTicks(segment.duration) === spanTicks
        ) {
          candidates.push({ bar: barIndex, index, count: 1 });
        } else if (
          kind === "eighth" &&
          segment.duration.denominator === 4 &&
          durationToTicks(segment.duration) === spanTicks
        ) {
          candidates.push({ bar: barIndex, index, count: 1 });
        } else if (kind === "quarter") {
          const next = bar[index + 1];
          if (
            segment.duration.denominator === 4 &&
            next?.kind === "note" &&
            next.tieGroupId === undefined &&
            next.tupletGroup === undefined &&
            next.duration.denominator === 4 &&
            next.duration.dots === 0 &&
            durationToTicks(segment.duration) +
              durationToTicks(next.duration) ===
              spanTicks
          ) {
            candidates.push({ bar: barIndex, index, count: 2 });
          }
        }
      }
      offset += durationToTicks(segment.duration);
    });
  });
  if (candidates.length === 0) return false;
  const chosen = candidates[Math.floor(random() * candidates.length)];
  const group: RhythmTupletGroup = Object.freeze({
    groupId: "triplet-1",
    actualNotes: 3,
    normalNotes: 2,
  });
  bars[chosen.bar].splice(
    chosen.index,
    chosen.count,
    ...Array.from({ length: 3 }, () => ({
      kind: "note" as const,
      duration,
      tupletGroup: group,
    }))
  );
  return true;
}

function requiredBarPrefix(resolved: ResolvedConfig): readonly RawSegment[] {
  if (resolved.focus === "snap") {
    return [
      { kind: "note", duration: { denominator: 8, dots: 1 } },
      { kind: "note", duration: { denominator: 16, dots: 0 } },
    ];
  }
  if (resolved.focus === "sandwich") {
    return [
      { kind: "note", duration: { denominator: 16, dots: 0 } },
      { kind: "note", duration: { denominator: 8, dots: 0 } },
      { kind: "note", duration: { denominator: 16, dots: 0 } },
    ];
  }
  if (resolved.features.tuplets === "quarter") {
    return [{ kind: "note", duration: { denominator: 2, dots: 0 } }];
  }
  if (resolved.features.tuplets === "eighth") {
    return [{ kind: "note", duration: { denominator: 4, dots: 0 } }];
  }
  return [];
}

function rawPattern(
  resolved: ResolvedConfig,
  rawBars: readonly RawSegment[][],
  seed: string
): RhythmPattern {
  const hash = seed
    .split("")
    .reduce(
      (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
      7
    )
    .toString(36);
  const id = `rhythm-l${resolved.policy.level}-${hash}-${meterKey(resolved.meter)}-${resolved.bars}-${resolved.focus}`;
  return {
    id,
    meter: resolved.meter,
    tempo: { pulseBpm: resolved.pulseBpm },
    measures: rawBars.map((bar, barIndex) => ({
      id: `m${barIndex + 1}`,
      segments: bar.map((segment, segmentIndex) => ({
        id: `m${barIndex + 1}s${segmentIndex + 1}`,
        kind: segment.kind,
        duration: segment.duration,
        ...(segment.tieGroupId === undefined
          ? {}
          : { tieGroupId: segment.tieGroupId }),
        ...(segment.tupletGroup === undefined
          ? {}
          : { tupletGroup: segment.tupletGroup }),
      })),
    })),
  };
}

function patternFlags(pattern: RhythmPattern) {
  const timeline = deriveRhythmTimeline(pattern, 120);
  const meter = deriveMeter(pattern.meter);
  const restsPerBar = pattern.measures.map(
    measure =>
      measure.segments.filter(segment => segment.kind === "rest").length
  );
  // A normal paired eighth/sixteenth subdivision is not a new syncopation
  // source. Count only an off-pulse attack sustained across the next pulse,
  // including a tied sustain; canonical spans already coalesce ties.
  const offbeatOnsetsPerBar = pattern.measures.map(
    (_, measureIndex) =>
      timeline.segments.filter(
        position =>
          position.measureIndex === measureIndex &&
          position.isOnset &&
          position.tupletGroup === undefined &&
          position.measureOffsetTicks % meter.pulseTicks !== 0 &&
          timeline.soundingSpans.some(
            span =>
              span.startTicks === position.absoluteStartTicks &&
              span.endTicks >
                measureIndex * meter.measureTicks +
                  (Math.floor(position.measureOffsetTicks / meter.pulseTicks) +
                    1) *
                    meter.pulseTicks
          )
      ).length
  );
  const finePulsesPerBar = pattern.measures.map(
    (_, measureIndex) =>
      new Set(
        timeline.segments
          .filter(
            position =>
              position.measureIndex === measureIndex &&
              isSixteenthFamily(
                pattern.measures[measureIndex].segments[position.segmentIndex]
                  .duration
              )
          )
          .map(position =>
            Math.floor(position.measureOffsetTicks / meter.pulseTicks)
          )
      ).size
  );
  const hasDot = pattern.measures.some(measure =>
    measure.segments.some(segment => isDotted(segment.duration))
  );
  const hasDotConcept = pattern.measures.some(measure =>
    measure.segments.some(
      segment =>
        isDotted(segment.duration) &&
        !isCompoundPulseDot(segment.duration, pattern.meter)
    )
  );
  const hasFine = pattern.measures.some(measure =>
    measure.segments.some(segment => isSixteenthFamily(segment.duration))
  );
  const hasTie = pattern.measures.some(measure =>
    measure.segments.some(segment => segment.tieGroupId !== undefined)
  );
  const tupletSegments = pattern.measures.flatMap(measure =>
    measure.segments.filter(segment => segment.tupletGroup !== undefined)
  );
  const hasTuplets = tupletSegments.length > 0;
  const hasQuarterTriplets = tupletSegments.some(
    segment => segment.duration.denominator === 4
  );
  const hasEighthTriplets = tupletSegments.some(
    segment => segment.duration.denominator === 8
  );
  const hasMotif = (focus: "snap" | "sandwich") =>
    pattern.measures.some((measure, measureIndex) => {
      const positions = timeline.segments.filter(
        position => position.measureIndex === measureIndex
      );
      return measure.segments.some((segment, index) => {
        const next = measure.segments[index + 1];
        const third = measure.segments[index + 2];
        const start = positions[index]?.measureOffsetTicks;
        if (start === undefined || start % meter.pulseTicks !== 0) return false;
        if (focus === "snap")
          return (
            segment.kind === "note" &&
            segment.duration.denominator === 8 &&
            segment.duration.dots === 1 &&
            next?.kind === "note" &&
            next.duration.denominator === 16 &&
            next.duration.dots === 0
          );
        return (
          segment.kind === "note" &&
          segment.duration.denominator === 16 &&
          segment.duration.dots === 0 &&
          next?.kind === "note" &&
          next.duration.denominator === 8 &&
          next.duration.dots === 0 &&
          third?.kind === "note" &&
          third.duration.denominator === 16 &&
          third.duration.dots === 0
        );
      });
    });
  const hasSnap = hasMotif("snap");
  const hasSandwich = hasMotif("sandwich");
  const hasSyncopation = offbeatOnsetsPerBar.some(count => count > 0);
  const sourceCount = [
    hasDotConcept,
    hasTie,
    hasFine,
    hasSyncopation,
    hasTuplets,
  ].filter(Boolean).length;
  return {
    timeline,
    meter,
    restsPerBar,
    offbeatOnsetsPerBar,
    finePulsesPerBar,
    hasDot,
    hasDotConcept,
    hasFine,
    hasTie,
    hasTuplets,
    hasQuarterTriplets,
    hasEighthTriplets,
    hasSnap,
    hasSandwich,
    hasSyncopation,
    sourceCount,
  };
}

function assertFeatures(
  flags: ReturnType<typeof patternFlags>,
  resolved: ResolvedConfig
): void {
  const { policy, focus, features, meter } = resolved;
  const strictFocus = focus !== "integrated";
  const hasDisallowedDot =
    strictFocus &&
    flags.timeline.segments.some(position => {
      const duration = resolvedPatternDuration(
        flags.timeline.pattern,
        position.measureIndex,
        position.segmentIndex
      );
      return (
        isDotted(duration) &&
        !isCompoundPulseDot(duration, meter) &&
        !features.dots
      );
    });
  if (hasDisallowedDot)
    fail("Pattern contains a dot outside the selected difficulty focus.");
  if (strictFocus && flags.hasFine && !features.sixteenths)
    fail("Pattern contains sixteenths outside the selected difficulty focus.");
  if (strictFocus && flags.hasTie && !features.ties)
    fail("Pattern contains ties outside the selected difficulty focus.");
  if (strictFocus && flags.hasTuplets && features.tuplets === null)
    fail("Pattern contains tuplets outside the selected difficulty focus.");
  if (focus !== "integrated" && features.tuplets !== null && !flags.hasTuplets)
    fail("The selected focus requires a complete triplet group.");
  if (
    flags.hasSyncopation &&
    strictFocus &&
    !features.syncopation &&
    !features.dots &&
    !features.ties
  ) {
    fail("Pattern contains syncopation outside the selected difficulty focus.");
  }

  if (focus === "dots" && (!flags.hasDot || flags.hasTie || flags.hasFine)) {
    fail("Dots focus requires dots only.");
  }
  if (
    focus === "ties" &&
    (!flags.hasTie || flags.hasDotConcept || flags.hasFine)
  ) {
    fail("Ties focus requires ties only.");
  }
  if (
    focus === "sixteenths" &&
    (!flags.hasFine || flags.hasDot || flags.hasTie)
  ) {
    fail("Sixteenths focus requires sixteenths only.");
  }
  if (
    focus === "combined" &&
    (isControlledComplexPolicy(policy)
      ? !flags.hasTie || !flags.hasFine || flags.hasDot
      : !flags.hasDot || !flags.hasTie || flags.hasFine)
  ) {
    fail("Combined focus requires the configured combined sources.");
  }
  if (focus === "snap" && (!flags.hasSnap || flags.hasSandwich || flags.hasTie))
    fail("Snap focus requires a dotted-eighth–sixteenth snap cell.");
  if (
    focus === "sandwich" &&
    (!flags.hasSandwich || flags.hasSnap || flags.hasTie || flags.hasDot)
  )
    fail("Sandwich focus requires a sixteenth–eighth–sixteenth cell.");
  if (
    focus === "quarter-triplets" &&
    (!flags.hasQuarterTriplets || flags.hasEighthTriplets || flags.hasTie)
  )
    fail("Quarter-triplets focus requires a quarter-note triplet group.");
  if (
    focus === "eighth-triplets" &&
    (!flags.hasEighthTriplets || flags.hasQuarterTriplets || flags.hasTie)
  )
    fail("Eighth-triplets focus requires an eighth-note triplet group.");
  if (focus === "triplet-combined") {
    const selectedLearnedSource =
      (features.dots && flags.hasDotConcept) ||
      (features.ties && flags.hasTie) ||
      (features.sixteenths && flags.hasFine);
    if (!flags.hasTuplets || !selectedLearnedSource)
      fail("Triplet-combined focus requires a triplet and learned vocabulary.");
  }
  if (focus === "syncopation" && !flags.hasSyncopation)
    fail("Syncopation focus requires an offbeat onset.");
  if (
    focus === "compound" &&
    !(
      meter.denominator === 8 &&
      (meter.numerator === 6 || meter.numerator === 9)
    )
  ) {
    fail("Compound focus requires 6/8 or 9/8.");
  }
  const configuredSourceCount = [
    flags.hasDotConcept && (focus === "integrated" || features.dots),
    flags.hasTie && (focus === "integrated" || features.ties),
    flags.hasFine && (focus === "integrated" || features.sixteenths),
    flags.hasSyncopation &&
      (focus === "integrated" ||
        features.syncopation ||
        focus === "triplet-combined"),
    flags.hasTuplets && (focus === "integrated" || features.tuplets !== null),
  ].filter(Boolean).length;
  if (configuredSourceCount > policy.maxDifficultySources) {
    fail(
      `This curriculum track allows at most ${policy.maxDifficultySources} interacting difficulty sources.`
    );
  }
}

function resolvedPatternDuration(
  pattern: RhythmPattern,
  measureIndex: number,
  segmentIndex: number
): WrittenDuration {
  return pattern.measures[measureIndex].segments[segmentIndex].duration;
}

function auditVocabulary(
  pattern: RhythmPattern,
  resolved: ResolvedConfig
): void {
  // Integrated auditing must describe the level, not reselect a random subset
  // from the candidate's seed. Generation still uses its bounded selected
  // sources; an external audit accepts only the actual <=2-source result.
  const vocabulary =
    resolved.focus === "integrated"
      ? resolved.policy.durations
      : allowedDurations(resolved);
  const permitted = new Set(vocabulary.map(durationKey));
  const permittedRests = new Set(
    resolved.policy.restDurations.map(durationKey)
  );
  for (const measure of pattern.measures) {
    for (const segment of measure.segments) {
      if (!permitted.has(durationKey(segment.duration))) {
        fail(
          "Pattern contains a duration outside the configured level vocabulary."
        );
      }
      if (segment.tupletGroup !== undefined && !resolved.policy.allowTuplets) {
        fail("Tuplets are only available in Level 5.");
      }
      if (segment.kind === "rest" && segment.accent === "strong") {
        fail("A rest cannot carry a strong accent.");
      }
      if (
        segment.kind === "rest" &&
        !permittedRests.has(durationKey(segment.duration))
      ) {
        fail(
          "Pattern contains a rest value not taught in this curriculum track."
        );
      }
    }
  }
}

/** Public evidence helper for parent-owned choices and tests. */
export function patternMetrics(pattern: RhythmPattern) {
  const flags = patternFlags(requireValidRhythmPattern(pattern));
  return Object.freeze({
    hasDot: flags.hasDot,
    hasDotConcept: flags.hasDotConcept,
    hasFine: flags.hasFine,
    hasTie: flags.hasTie,
    hasTuplets: flags.hasTuplets,
    hasQuarterTriplets: flags.hasQuarterTriplets,
    hasEighthTriplets: flags.hasEighthTriplets,
    hasSnap: flags.hasSnap,
    hasSandwich: flags.hasSandwich,
    hasSyncopation: flags.hasSyncopation,
    sourceCount: flags.sourceCount,
    restsPerBar: Object.freeze([...flags.restsPerBar]),
    offbeatOnsetsPerBar: Object.freeze([...flags.offbeatOnsetsPerBar]),
    finePulsesPerBar: Object.freeze([...flags.finePulsesPerBar]),
    onsets: Object.freeze([...flags.timeline.onsets]),
  });
}

/**
 * Audit an externally supplied canonical pattern against the selected level.
 * All failures intentionally surface as RangeError so callers have one
 * controlled boundary for malformed config, pattern, or curriculum data.
 */
export function assertLevelConstraints(
  pattern: RhythmPattern,
  config: RhythmGenerationConfig
): void {
  const random = createSeededRandom(
    typeof config?.seed === "string" ? config.seed : "audit"
  );
  const resolved = resolveConfig(config, random);
  let canonical: RhythmPattern;
  try {
    canonical = requireValidRhythmPattern(pattern);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Pattern is not canonical.");
  }
  if (!sameMeter(canonical.meter, resolved.meter))
    fail("Pattern meter does not match generation config.");
  if (
    config.pulseBpm !== undefined &&
    canonical.tempo.pulseBpm !== config.pulseBpm
  ) {
    fail("Pattern tempo does not match generation config.");
  }
  if (
    canonical.tempo.pulseBpm < MIN_PULSE_BPM ||
    canonical.tempo.pulseBpm > MAX_PULSE_BPM
  ) {
    fail("Pattern tempo is outside the supported 30–300 BPM range.");
  }
  if (canonical.measures.length !== resolved.bars)
    fail("Pattern bar count does not match generation config.");
  auditVocabulary(canonical, resolved);
  const flags = patternFlags(canonical);
  if (flags.timeline.onsets.length === 0)
    fail("All-rest patterns are not generated in V1.");
  if (flags.restsPerBar.some(count => count > resolved.policy.maxRestsPerBar)) {
    fail("Pattern exceeds the level rest budget.");
  }
  if (flags.restsPerBar.some(count => count > 2)) {
    fail("Pattern exceeds the level rest budget.");
  }
  if (flags.hasTuplets && !resolved.policy.allowTuplets) {
    fail("Tuplets are only available in Level 5.");
  }
  if (
    enforcesPreIntroductionPulseSustain(resolved.policy) &&
    flags.timeline.segments.some(position => {
      const offPulse =
        position.measureOffsetTicks % flags.meter.pulseTicks !== 0;
      return (
        offPulse &&
        position.absoluteEndTicks -
          position.measureIndex * flags.meter.measureTicks >
          (Math.floor(position.measureOffsetTicks / flags.meter.pulseTicks) +
            1) *
            flags.meter.pulseTicks
      );
    })
  ) {
    fail(
      "An off-pulse sustain crosses a pulse boundary before that concept is introduced."
    );
  }
  if (
    flags.finePulsesPerBar.some(
      count => count > resolved.policy.maxFinePulsesPerBar
    )
  ) {
    fail(
      resolved.policy.level === 5
        ? "Level 5 permits sixteenth-family notation in only one pulse per bar."
        : "Pattern exceeds the sixteenth-family density for this level."
    );
  }
  if (
    flags.offbeatOnsetsPerBar.some(
      count => count > resolved.policy.maxSyncopatedOnsetsPerBar
    )
  ) {
    fail(
      "Pattern exceeds the syncopated-onset budget for this curriculum track."
    );
  }
  if (resolved.policy.level === 6 && canonical.meter.denominator !== 8) {
    fail("Level 6 supports only its approved 3/8, 6/8 and 9/8 meters.");
  }
  const flat = canonical.measures.flatMap(measure => measure.segments);
  for (let index = 0; index < flat.length - 1; index += 1) {
    if (
      flat[index].tieGroupId !== undefined &&
      flat[index].tieGroupId === flat[index + 1].tieGroupId
    ) {
      const firstMeasure = canonical.measures.findIndex(measure =>
        measure.segments.includes(flat[index])
      );
      const secondMeasure = canonical.measures.findIndex(measure =>
        measure.segments.includes(flat[index + 1])
      );
      if (
        firstMeasure !== secondMeasure &&
        !resolved.policy.allowCrossBarTies
      ) {
        fail("Cross-bar ties are not enabled for this level.");
      }
      if (
        firstMeasure !== secondMeasure &&
        canonical.measures.length !== 2 &&
        canonical.measures.length !== 4
      ) {
        fail("Cross-bar ties require two or four bars.");
      }
    }
  }
  assertFeatures(flags, resolved);
}

export function generateRhythmPattern(
  config: RhythmGenerationConfig
): RhythmPattern {
  validateBasicConfig(config);
  const random = createSeededRandom(config.seed);
  const resolved = resolveConfig(config, random);
  if (
    resolved.features.tuplets === "quarter" &&
    resolved.meter.numerator === 2 &&
    resolved.meter.denominator === 4
  ) {
    fail(
      "Quarter-note triplets fill a 2/4 measure exactly, so they cannot coexist with the required 1–2 rests in that measure."
    );
  }
  const durations = allowedDurations(resolved);
  if (durations.length === 0)
    fail("No durations are available for this level and focus.");

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const bars: RawSegment[][] = [];
    let complete = true;
    const prefix = requiredBarPrefix(resolved);
    for (let bar = 0; bar < resolved.bars; bar += 1) {
      const result = buildBar(
        resolved,
        random,
        durations,
        bar === 0 ? prefix : undefined
      );
      if (result === null) {
        complete = false;
        break;
      }
      bars.push(result);
    }
    if (!complete) continue;

    if (
      resolved.features.tuplets !== null &&
      !applyTupletGroup(bars, resolved.features.tuplets, resolved.meter, random)
    ) {
      continue;
    }

    // The syncopation lesson may reuse known ties without making every item
    // a tie question; dedicated ties/combined focus still always includes one.
    if (
      resolved.features.ties &&
      (resolved.focus !== "syncopation" || random() < 0.5)
    ) {
      const tied =
        (resolved.bars === 2 || resolved.bars === 4) &&
        resolved.policy.allowCrossBarTies &&
        !resolved.features.sixteenths
          ? applyCrossBarTie(bars)
          : applyIntraBarTie(bars, resolved, random, durations);
      if (!tied) continue;
    }
    if (
      !bars.every(bar => {
        const rests = bar.map(segment => segment.kind === "rest");
        const count = rests.filter(Boolean).length;
        return (
          count >= 1 &&
          count <= 2 &&
          !rests.some((isRest, index) => isRest && rests[index - 1])
        );
      })
    ) {
      continue;
    }
    const candidate = requireValidRhythmPattern(
      rawPattern(resolved, bars, config.seed)
    );
    try {
      assertLevelConstraints(candidate, config);
      return candidate;
    } catch {
      // A bounded retry is preferable to trimming or coercing an exact bar.
    }
  }
  fail(
    "Unable to generate a pattern within the bounded curriculum search budget."
  );
}

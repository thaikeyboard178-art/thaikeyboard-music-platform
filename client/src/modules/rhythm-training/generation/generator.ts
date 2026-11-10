import type {
  RhythmMeter,
  RhythmPattern,
  RhythmSegment,
  WrittenDuration,
} from "../types";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { durationToTicks } from "../rhythm/durations";
import { deriveMeter } from "../rhythm/meters";
import { requireValidRhythmPattern } from "../rhythm/validate";
import {
  LEVEL_POLICIES,
  type LevelPolicy,
  type RhythmFocus,
  type RhythmLevel,
} from "./levels";
import { createSeededRandom, seededShuffle } from "./random";

export type RhythmGenerationConfig = Readonly<{
  readonly seed: string;
  readonly level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly meter?: RhythmMeter;
  readonly bars?: 1 | 2;
  readonly pulseBpm?: number;
  readonly focus?:
    | "basic"
    | "dots"
    | "ties"
    | "combined"
    | "sixteenths"
    | "compound"
    | "syncopation";
}>;

type ConfigFocus = NonNullable<RhythmGenerationConfig["focus"]>;
type Features = Readonly<{
  dots: boolean;
  ties: boolean;
  sixteenths: boolean;
  syncopation: boolean;
}>;
type RawSegment = {
  kind: "note" | "rest";
  duration: WrittenDuration;
  tieGroupId?: string;
};
type ResolvedConfig = Readonly<{
  policy: LevelPolicy;
  meter: RhythmMeter;
  bars: 1 | 2;
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
    meter.numerator === 6 &&
    meter.denominator === 8 &&
    duration.dots === 1 &&
    (duration.denominator === 2 || duration.denominator === 4)
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
    typeof input.level !== "number" ||
    !Number.isInteger(input.level) ||
    input.level < 1 ||
    input.level > 8
  ) {
    fail("Generation config level must be an integer from 1 through 8.");
  }
  if (input.bars !== undefined && input.bars !== 1 && input.bars !== 2) {
    fail("Generation config bars must be 1 or 2.");
  }
  if (input.focus !== undefined && !hasFocus(input.focus)) {
    fail("Generation config focus is unsupported.");
  }
  if (
    input.pulseBpm !== undefined &&
    (typeof input.pulseBpm !== "number" || !Number.isFinite(input.pulseBpm))
  ) {
    fail("Generation config pulseBpm must be finite.");
  }
}

function featureSet(
  policy: LevelPolicy,
  focus: RhythmFocus,
  meter: RhythmMeter,
  random: () => number
): Features {
  if (focus === "dots")
    return { dots: true, ties: false, sixteenths: false, syncopation: false };
  if (focus === "ties")
    return { dots: false, ties: true, sixteenths: false, syncopation: false };
  if (focus === "combined") {
    return {
      dots: policy.allowDots,
      ties: policy.allowTies,
      sixteenths: policy.level === 5,
      syncopation: false,
    };
  }
  if (focus === "sixteenths")
    return { dots: false, ties: false, sixteenths: true, syncopation: false };
  if (focus === "syncopation")
    return {
      dots: false,
      ties: policy.allowTies,
      sixteenths: false,
      syncopation: true,
    };
  if (focus === "compound")
    return { dots: false, ties: false, sixteenths: false, syncopation: false };
  if (focus === "basic")
    return { dots: false, ties: false, sixteenths: false, syncopation: false };

  // The internal Level 8 default is integrated. Choose one or two genuine
  // sources; compound meter's pulse-defining dots are not one of them.
  const sources: Array<keyof Features> = [];
  if (policy.allowDots && (meter.numerator !== 6 || random() > 0.35))
    sources.push("dots");
  if (policy.allowTies) sources.push("ties");
  if (policy.allowSixteenths) sources.push("sixteenths");
  if (policy.allowSyncopation && meter.denominator === 4)
    sources.push("syncopation");
  const shuffled = seededShuffle(sources, random);
  const count =
    shuffled.length === 0
      ? 0
      : 1 + Math.floor(random() * Math.min(2, shuffled.length));
  const selected = new Set(shuffled.slice(0, count));
  return {
    dots: selected.has("dots"),
    ties: selected.has("ties"),
    sixteenths: selected.has("sixteenths"),
    syncopation: selected.has("syncopation"),
  };
}

function chooseMeter(
  policy: LevelPolicy,
  requested: RhythmMeter | undefined,
  focus: RhythmFocus,
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
  if (focus === "compound")
    choices = choices.filter(meter => meter.numerator === 6);
  if (
    focus === "syncopation" ||
    focus === "dots" ||
    focus === "ties" ||
    focus === "sixteenths"
  ) {
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
  return Object.freeze({ numerator: chosen.numerator, denominator: 4 });
}

function tempoBand(policy: LevelPolicy, meter: RhythmMeter) {
  return meter.numerator === 6 && meter.denominator === 8
    ? (policy.tempo.compound ?? policy.tempo.simple)
    : policy.tempo.simple;
}

function resolveConfig(
  config: RhythmGenerationConfig,
  random: () => number
): ResolvedConfig {
  validateBasicConfig(config);
  const policy = LEVEL_POLICIES[config.level as RhythmLevel];
  const focus = (config.focus ?? policy.defaultFocus) as RhythmFocus;
  if (!policy.supportedFocus.includes(focus))
    fail("Focus is not configured for this level.");
  const meter = chooseMeter(policy, config.meter, focus, random);
  const band = tempoBand(policy, meter);
  if (
    config.pulseBpm !== undefined &&
    (config.pulseBpm < band.min || config.pulseBpm > band.max)
  ) {
    fail(
      `pulseBpm must be between ${band.min} and ${band.max} for this level and meter.`
    );
  }
  const pulseBpm =
    config.pulseBpm ??
    band.min + Math.floor(random() * (band.max - band.min + 1));
  const bars = config.bars ?? 1;
  const features = featureSet(policy, focus, meter, random);
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
  durations: readonly WrittenDuration[]
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
  const preferFine =
    resolved.features.syncopation || resolved.features.sixteenths;

  function walk(
    remaining: number,
    offset: number,
    segments: RawSegment[],
    restCount: number,
    finePulses: readonly number[]
  ): RawSegment[] | null {
    nodes += 1;
    if (nodes > MAX_COMPOSITION_NODES) return null;
    if (remaining === 0) {
      return segments.some(segment => segment.kind === "note")
        ? segments
        : null;
    }
    if (segments.length >= MAX_SEGMENTS_PER_BAR) return null;
    const key = `${remaining}:${restCount}:${finePulses.join(",")}:${segments.length}`;
    if (memo.has(key)) return null;
    const eligible = durationRows
      .filter(row => row.ticks <= remaining)
      .filter(row => {
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
            resolved.policy.level === 5 &&
            !finePulses.includes(pulse) &&
            finePulses.length >= 1
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
      if (random() < (resolved.policy.level === 3 ? 0.55 : 0.28))
        kinds.reverse();
      for (const kind of kinds) {
        if (kind === "rest" && restCount >= resolved.policy.maxRestsPerBar)
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
          nextFinePulses
        );
        if (answer !== null) return answer;
      }
    }
    memo.add(key);
    return null;
  }

  return walk(meter.measureTicks, 0, [], 0, []);
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
      if (segment.kind !== "note") return;
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
        if (next && segment.kind === "note" && next.kind === "note") {
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
  if (bars.length !== 2 || bars[0].length === 0 || bars[1].length === 0)
    return false;
  const left = bars[0][bars[0].length - 1];
  const right = bars[1][0];
  if (left.kind !== "note") left.kind = "note";
  if (right.kind !== "note") right.kind = "note";
  left.tieGroupId = "tie-1";
  right.tieGroupId = "tie-1";
  return true;
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
  const hasSyncopation = offbeatOnsetsPerBar.some(count => count > 0);
  const sourceCount = [hasDotConcept, hasTie, hasFine, hasSyncopation].filter(
    Boolean
  ).length;
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
  if (focus === "ties" && (!flags.hasTie || flags.hasDot || flags.hasFine)) {
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
    (!flags.hasDot || !flags.hasTie || (policy.level === 5 && !flags.hasFine))
  ) {
    fail("Combined focus requires the configured combined sources.");
  }
  if (focus === "syncopation" && !flags.hasSyncopation)
    fail("Syncopation focus requires an offbeat onset.");
  if (
    focus === "compound" &&
    !(meter.numerator === 6 && meter.denominator === 8)
  ) {
    fail("Compound focus requires 6/8.");
  }
  const configuredSourceCount = [
    flags.hasDotConcept && (focus === "integrated" || features.dots),
    flags.hasTie && (focus === "integrated" || features.ties),
    flags.hasFine && (focus === "integrated" || features.sixteenths),
    flags.hasSyncopation && (focus === "integrated" || features.syncopation),
  ].filter(Boolean).length;
  if (
    policy.level === 8 &&
    configuredSourceCount > policy.maxDifficultySources
  ) {
    fail("Level 8 difficulty budget allows at most two interacting sources.");
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
  for (const measure of pattern.measures) {
    for (const segment of measure.segments) {
      if (!permitted.has(durationKey(segment.duration))) {
        fail(
          "Pattern contains a duration outside the configured level vocabulary."
        );
      }
      if (segment.kind === "rest" && segment.accent === "strong") {
        fail("A rest cannot carry a strong accent.");
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
  const band = tempoBand(resolved.policy, canonical.meter);
  if (
    canonical.tempo.pulseBpm < band.min ||
    canonical.tempo.pulseBpm > band.max
  ) {
    fail("Pattern tempo is outside the configured level band.");
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
  if (
    resolved.policy.level <= 3 &&
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
    resolved.policy.level === 5 &&
    flags.finePulsesPerBar.some(count => count > 1)
  ) {
    fail(
      "Level 5 permits sixteenth-family notation in only one pulse per bar."
    );
  }
  if (
    resolved.policy.level === 7 &&
    flags.offbeatOnsetsPerBar.some(count => count > 1)
  ) {
    fail("Level 7 permits at most one syncopated onset per bar.");
  }
  if (
    resolved.policy.level === 8 &&
    flags.offbeatOnsetsPerBar.some(count => count > 2)
  ) {
    fail("Level 8 permits at most two syncopated onsets per bar.");
  }
  if (
    resolved.policy.level === 6 &&
    (canonical.meter.numerator !== 6 || canonical.meter.denominator !== 8)
  ) {
    fail("Level 6 is exclusively compound-duple 6/8.");
  }
  if (
    resolved.policy.level === 6 &&
    canonical.measures.some(measure =>
      measure.segments.some(segment => segment.duration.denominator === 1)
    )
  ) {
    fail("A whole note cannot fill or appear in a Level 6 6/8 bar.");
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
      if (firstMeasure !== secondMeasure && canonical.measures.length !== 2) {
        fail("Cross-bar ties require exactly two bars.");
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
  const durations = allowedDurations(resolved);
  if (durations.length === 0)
    fail("No durations are available for this level and focus.");

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const bars: RawSegment[][] = [];
    let complete = true;
    for (let bar = 0; bar < resolved.bars; bar += 1) {
      const result = buildBar(resolved, random, durations);
      if (result === null) {
        complete = false;
        break;
      }
      bars.push(result);
    }
    if (!complete) continue;

    // The syncopation lesson may reuse known ties without making every item
    // a tie question; dedicated ties/combined focus still always includes one.
    if (
      resolved.features.ties &&
      (resolved.focus !== "syncopation" || random() < 0.5)
    ) {
      const tied =
        resolved.bars === 2 &&
        resolved.policy.allowCrossBarTies &&
        !resolved.features.sixteenths
          ? applyCrossBarTie(bars)
          : applyIntraBarTie(bars, resolved, random, durations);
      if (!tied) continue;
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

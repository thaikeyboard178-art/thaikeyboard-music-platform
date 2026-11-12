import {
  requireExerciseKindAllowed,
  type CurriculumSection,
} from "../curriculum/curriculum";
import {
  assertLevelConstraints,
  generateRhythmPattern,
} from "../generation/generator";
import { policyForLevel, type RhythmFocus } from "../generation/levels";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { ticksToSeconds } from "../rhythm/meters";
import { requireValidRhythmPattern } from "../rhythm/validate";
import type { RhythmMeter, RhythmPattern, RhythmTrack } from "../types";
import { isRuntimeTapAttempt } from "./tapCompletion";
import {
  matchTapRhythm,
  type TapEvaluation,
  type TapMatchInput,
} from "./tapMatcher";

export type TapTarget = Readonly<{
  id: string;
  tick: number;
  offsetMs: number;
  passMs: number;
  associationMs: number;
}>;

export type TapRhythmExercise = Readonly<{
  id: string;
  kind: "tap-rhythm";
  track: RhythmTrack;
  section: CurriculumSection;
  pattern: RhythmPattern;
  gridTicks: 120 | 240;
  targets: readonly TapTarget[];
}>;

export type CreateTapRhythmExerciseInput = Readonly<{
  track: RhythmTrack;
  section?: CurriculumSection;
  pattern: unknown;
  id?: string;
}>;

export type GenerateTapRhythmExerciseInput = Readonly<{
  track: RhythmTrack;
  section?: CurriculumSection;
  seed: string | number;
  meter?: RhythmMeter;
  bars?: 1 | 2 | 4;
  focus?: RhythmFocus;
  pulseBpm?: number;
}>;

const PASS_ALPHA = 0.3;
const ASSOCIATION_BETA = 0.4;
const PASS_CAP_MS = 50;
const ASSOCIATION_CAP_MS = 80;

function fail(message: string): never {
  throw new RangeError(message);
}

function isCompoundPulseDot(
  pattern: RhythmPattern,
  denominator: number
): boolean {
  return (
    (pattern.meter.numerator === 6 || pattern.meter.numerator === 9) &&
    pattern.meter.denominator === 8 &&
    denominator === 4
  );
}

function patternFeatures(pattern: RhythmPattern): Readonly<{
  hasDotConcept: boolean;
  hasTie: boolean;
  hasFine: boolean;
}> {
  const segments = pattern.measures.flatMap(measure => measure.segments);
  return Object.freeze({
    hasDotConcept: segments.some(
      segment =>
        segment.duration.dots === 1 &&
        !isCompoundPulseDot(pattern, segment.duration.denominator)
    ),
    hasTie: segments.some(segment => segment.tieGroupId !== undefined),
    hasFine: segments.some(
      segment =>
        segment.duration.denominator === 16 ||
        (segment.duration.denominator === 8 && segment.duration.dots === 1)
    ),
  });
}

function focusForPattern(
  pattern: RhythmPattern,
  track: RhythmTrack
): RhythmFocus {
  const features = patternFeatures(pattern);
  if (track === 4) {
    if (features.hasDotConcept && features.hasTie) return "combined";
    if (features.hasDotConcept) return "dots";
    if (features.hasTie) return "ties";
    // Level 4 has no basic focus. The audit below accepts only this focus's
    // missing-dot-specific error after its broader policy checks all pass.
    return "dots";
  }
  if (track === 5) return "integrated";
  if (track === 6) {
    if (features.hasDotConcept && features.hasTie) return "combined";
    if (features.hasDotConcept) return "dots";
    if (features.hasTie) return "ties";
    return "basic";
  }
  return "basic";
}

function auditPatternForTrack(
  pattern: RhythmPattern,
  track: RhythmTrack,
  focus: RhythmFocus
): void {
  if (
    pattern.measures.length !== 1 &&
    pattern.measures.length !== 2 &&
    pattern.measures.length !== 4
  ) {
    fail("Tap Rhythm exercises must contain one, two, or four bars.");
  }
  const config = {
    seed: "tap-level-audit",
    level: track,
    meter: pattern.meter,
    bars: pattern.measures.length as 1 | 2 | 4,
    pulseBpm: pattern.tempo.pulseBpm,
    focus,
  } as const;
  try {
    assertLevelConstraints(pattern, config);
  } catch (error) {
    const features = patternFeatures(pattern);
    if (
      track === 4 &&
      !features.hasDotConcept &&
      !features.hasTie &&
      error instanceof RangeError &&
      error.message === "Dots focus requires dots only."
    ) {
      // A plain Level 4 pattern is inside its allowed duration/meter policy,
      // but the generation audit has no neutral focus. The exact error above
      // occurs only after its canonical, vocabulary, tempo, rest, tie, and
      // difficulty-budget checks have succeeded.
      return;
    }
    throw error;
  }
}

function gridForTrack(track: RhythmTrack): 120 | 240 {
  return track === 5 ? 120 : 240;
}

/**
 * Build expected attack events from the canonical sounding spans. This helper
 * deliberately has no curriculum gate so canonical stress fixtures can use it.
 */
export function createTapTargets(
  pattern: unknown,
  gridTicks: 120 | 240
): readonly TapTarget[] {
  if (gridTicks !== 120 && gridTicks !== 240) {
    fail("Tap target grid must be 120 or 240 ticks.");
  }
  const canonical = requireValidRhythmPattern(pattern);
  // Canonical resolution is independent of the legal tolerance grid: actual
  // adjacent attack gaps may be finer in a canonical stress fixture. The
  // exercise factory still enforces every track's unchanged vocabulary gate.
  const timeline = deriveRhythmTimeline(canonical);
  const spans = timeline.soundingSpans;
  const offsetMs = spans.map(
    span =>
      ticksToSeconds(
        span.startTicks,
        timeline.pattern.meter,
        timeline.pattern.tempo.pulseBpm
      ) * 1000
  );
  const gridIntervalMs =
    ticksToSeconds(
      gridTicks,
      timeline.pattern.meter,
      timeline.pattern.tempo.pulseBpm
    ) * 1000;

  return Object.freeze(
    spans.map((span, index) => {
      const gaps: number[] = [];
      if (index > 0) {
        const previousGap = offsetMs[index] - offsetMs[index - 1];
        if (previousGap > 0) gaps.push(previousGap);
      }
      if (index + 1 < spans.length) {
        const nextGap = offsetMs[index + 1] - offsetMs[index];
        if (nextGap > 0) gaps.push(nextGap);
      }
      const localGapMs =
        gaps.length === 0 ? gridIntervalMs : Math.min(gridIntervalMs, ...gaps);
      const firstSegmentId = span.segmentIds[0];
      if (firstSegmentId === undefined) {
        fail("A canonical sounding span is missing its onset segment.");
      }
      return Object.freeze({
        id: `pattern:${firstSegmentId}`,
        tick: span.startTicks,
        offsetMs: offsetMs[index],
        passMs: Math.min(PASS_CAP_MS, PASS_ALPHA * localGapMs),
        associationMs: Math.min(
          ASSOCIATION_CAP_MS,
          ASSOCIATION_BETA * localGapMs
        ),
      });
    })
  );
}

export function createTapRhythmExercise(
  input: CreateTapRhythmExerciseInput
): TapRhythmExercise {
  const section = input.section ?? "practice";
  requireExerciseKindAllowed(input.track, section, "tap-rhythm");
  if (
    input.id !== undefined &&
    (typeof input.id !== "string" ||
      input.id.length === 0 ||
      input.id.trim() !== input.id ||
      /\s/.test(input.id))
  ) {
    fail("Tap Rhythm exercise IDs must be nonempty and contain no whitespace.");
  }

  const pattern = requireValidRhythmPattern(input.pattern);
  auditPatternForTrack(
    pattern,
    input.track,
    focusForPattern(pattern, input.track)
  );
  const gridTicks = gridForTrack(input.track);
  const targets = createTapTargets(pattern, gridTicks);
  return Object.freeze({
    id: input.id ?? `tap-${String(input.track)}-${pattern.id}`,
    kind: "tap-rhythm" as const,
    track: input.track,
    section,
    pattern,
    gridTicks,
    targets,
  });
}

function normalizedSeed(seed: string | number): string {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed))
      fail("Tap Rhythm requires a finite numeric seed.");
    return String(seed);
  }
  if (typeof seed !== "string" || seed.trim().length === 0) {
    fail("Tap Rhythm requires a nonempty seed.");
  }
  return seed;
}

export function generateTapRhythmExercise(
  input: GenerateTapRhythmExerciseInput
): TapRhythmExercise {
  const section = input.section ?? "practice";
  requireExerciseKindAllowed(input.track, section, "tap-rhythm");
  const seed = normalizedSeed(input.seed);
  const focus = input.focus ?? policyForLevel(input.track).defaultFocus;
  const config = {
    level: input.track,
    seed,
    ...(input.meter === undefined ? {} : { meter: input.meter }),
    ...(input.bars === undefined ? {} : { bars: input.bars }),
    ...(input.pulseBpm === undefined ? {} : { pulseBpm: input.pulseBpm }),
    focus,
  } as const;
  const pattern = generateRhythmPattern(config);
  // The generator applies this audit internally as well; repeat it at this
  // exercise boundary using the exact chosen generation configuration.
  assertLevelConstraints(pattern, config);
  return createTapRhythmExercise({
    track: input.track,
    section,
    pattern,
  });
}

function sameTicks(left: readonly number[], right: readonly number[]): boolean {
  return (
    left.length === right.length &&
    left.every((tick, index) => tick === right[index])
  );
}

function matchesExerciseTargets(
  exercise: TapRhythmExercise,
  canonicalTargets: readonly TapTarget[]
): boolean {
  return (
    Array.isArray(exercise.targets) &&
    exercise.targets.length === canonicalTargets.length &&
    exercise.targets.every((target, index) => {
      const expected = canonicalTargets[index];
      return (
        target.id === expected.id &&
        target.tick === expected.tick &&
        target.offsetMs === expected.offsetMs &&
        target.passMs === expected.passMs &&
        target.associationMs === expected.associationMs
      );
    })
  );
}

/** Re-grade only a sealed, completed graded attempt bound to this exercise. */
export function evaluateTapRhythmAnswer(
  exercise: TapRhythmExercise,
  answer: unknown
): TapEvaluation | null {
  if (!isRuntimeTapAttempt(answer)) return null;
  if (
    answer.mode !== "graded" ||
    answer.status !== "completed" ||
    answer.exerciseId !== exercise.id
  ) {
    return null;
  }
  try {
    const canonicalTargets = createTapTargets(
      exercise.pattern,
      exercise.gridTicks
    );
    const expectedTicks = canonicalTargets.map(target => target.tick);
    if (
      !matchesExerciseTargets(exercise, canonicalTargets) ||
      !Array.isArray(answer.targetTicks) ||
      !sameTicks(answer.targetTicks, expectedTicks)
    ) {
      return null;
    }
    return matchTapRhythm(
      canonicalTargets,
      answer.taps as readonly TapMatchInput[]
    );
  } catch {
    return null;
  }
}

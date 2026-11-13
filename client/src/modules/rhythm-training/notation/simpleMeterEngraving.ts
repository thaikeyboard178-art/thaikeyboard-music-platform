import type {
  RhythmMeter,
  RhythmPattern,
  RhythmSegment,
  WrittenDuration,
} from "../types";
import { durationToTicks, segmentDurationToTicks } from "../rhythm/durations";
import { requireValidRhythmPattern } from "../rhythm/validate";

/** Tap-only engraving policy. x/8 has no branch here and keeps its adapter. */
export function simpleNotationGroupStarts(
  meter: RhythmMeter
): readonly number[] | undefined {
  if (meter.denominator === 4) {
    if (meter.numerator === 2) return [0, 480];
    if (meter.numerator === 3) return [0, 480, 960];
    if (meter.numerator === 4) return [0, 960];
  }
  if (meter.numerator === 2 && meter.denominator === 2) return [0, 960];
  return undefined;
}

const WRITTEN_VALUES: readonly WrittenDuration[] = [
  { denominator: 1, dots: 0 },
  { denominator: 2, dots: 1 },
  { denominator: 2, dots: 0 },
  { denominator: 4, dots: 1 },
  { denominator: 4, dots: 0 },
  { denominator: 8, dots: 1 },
  { denominator: 8, dots: 0 },
  { denominator: 16, dots: 0 },
];

function components(ticks: number): WrittenDuration[] {
  const result: WrittenDuration[] = [];
  let remaining = ticks;
  for (const duration of WRITTEN_VALUES) {
    const value = durationToTicks(duration);
    while (remaining >= value) {
      result.push(duration);
      remaining -= value;
    }
  }
  if (remaining !== 0)
    throw new RangeError("A group split has no exact written duration.");
  return result;
}

/**
 * Normalize only written Tap components, never the source pattern or audio.
 * Onset components keep their source IDs so Reference/learner markers still
 * share the exact canonical onset anchor. Tuplets retain their complete 3:2
 * notation: their explicit ratio, rather than a normal duration, spans pulses.
 */
export function engraveSimpleTapPattern(pattern: RhythmPattern): RhythmPattern {
  const starts = simpleNotationGroupStarts(pattern.meter);
  if (!starts) return pattern;
  const ids = new Set(
    pattern.measures.flatMap(measure =>
      measure.segments.map(segment => segment.id)
    )
  );
  const ties = new Set(
    pattern.measures.flatMap(measure =>
      measure.segments.flatMap(segment =>
        segment.tieGroupId ? [segment.tieGroupId] : []
      )
    )
  );
  const unique = (base: string, used: Set<string>): string => {
    let id = base;
    while (used.has(id)) id += "-part";
    used.add(id);
    return id;
  };
  let changed = false;
  const measures = pattern.measures.map(measure => {
    let offset = 0;
    const segments: RhythmSegment[] = [];
    for (const segment of measure.segments) {
      const ticks = segmentDurationToTicks(segment);
      const end = offset + ticks;
      const boundaries = starts.filter(start => start > offset && start < end);
      if (boundaries.length === 0 || segment.tupletGroup !== undefined) {
        segments.push(segment);
      } else {
        if (segment.kind === "rest") {
          // Splitting a rest would violate the Owner's exactly-one-symbol quota.
          throw new RangeError(
            "A Tap rest must fit within its simple-meter notation group."
          );
        }
        changed = true;
        const tieGroupId =
          segment.tieGroupId ?? unique(`engraving-${segment.id}`, ties);
        const edges = [offset, ...boundaries, end];
        const values = edges
          .slice(1)
          .flatMap((edge, index) => components(edge - edges[index]));
        values.forEach((duration, index) => {
          segments.push({
            id:
              index === 0
                ? segment.id
                : unique(`${segment.id}-engraved-${index}`, ids),
            kind: "note",
            duration,
            tieGroupId,
            // Explicit articulation belongs to the original attack only.
            ...(index === 0 && segment.accent !== undefined
              ? { accent: segment.accent }
              : {}),
            ...(segment.articulation !== undefined
              ? { articulation: segment.articulation }
              : {}),
          });
        });
      }
      offset = end;
    }
    return { id: measure.id, segments };
  });
  return changed
    ? requireValidRhythmPattern({ ...pattern, measures })
    : pattern;
}

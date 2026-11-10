import type { RhythmPattern, SegmentPosition, SoundingSpan } from "../types";
import { durationToTicks } from "./durations";
import { deriveMeter, type MeterInfo } from "./meters";
import { deriveTieRoles } from "./ties";
import { requireValidRhythmPattern } from "./validate";

export type RhythmTimeline = Readonly<{
  pattern: RhythmPattern;
  meter: MeterInfo;
  totalTicks: number;
  segments: readonly SegmentPosition[];
  onsets: readonly number[];
  soundingSpans: readonly SoundingSpan[];
}>;

export function deriveRhythmTimeline(
  input: unknown,
  subdivisionTicks = 120
): RhythmTimeline {
  const pattern = requireValidRhythmPattern(input);
  const meter = deriveMeter(pattern.meter);
  if (
    ![120, 240, 480].includes(subdivisionTicks) ||
    meter.pulseTicks % subdivisionTicks !== 0
  ) {
    throw new RangeError(
      "The subdivision grid must divide the meter pulse and use supported V1 ticks"
    );
  }
  const flatSegments = pattern.measures.flatMap(measure => measure.segments);
  const roles = deriveTieRoles(flatSegments);
  const positions: SegmentPosition[] = [];
  pattern.measures.forEach((measure, measureIndex) => {
    let offset = 0;
    measure.segments.forEach((segment, segmentIndex) => {
      const durationTicks = durationToTicks(segment.duration);
      if (
        offset % subdivisionTicks !== 0 ||
        durationTicks % subdivisionTicks !== 0
      ) {
        throw new RangeError(
          "Selected teaching grid cannot represent this pattern's boundaries exactly"
        );
      }
      const start = measureIndex * meter.measureTicks + offset;
      const role = roles.get(segment.id) ?? "none";
      const pulseOffsetTicks = offset % meter.pulseTicks;
      positions.push(
        Object.freeze({
          segmentId: segment.id,
          measureId: measure.id,
          measureIndex,
          segmentIndex,
          kind: segment.kind,
          durationTicks,
          absoluteStartTicks: start,
          absoluteEndTicks: start + durationTicks,
          measureOffsetTicks: offset,
          pulseIndex: Math.floor(offset / meter.pulseTicks),
          pulseOffsetTicks,
          subdivisionIndex: pulseOffsetTicks / subdivisionTicks,
          subdivisionTicks,
          isOnset:
            segment.kind === "note" && (role === "none" || role === "start"),
          tieRole: role,
          ...(segment.tieGroupId !== undefined
            ? { tieGroupId: segment.tieGroupId }
            : {}),
          accent: segment.accent ?? "normal",
        })
      );
      offset += durationTicks;
    });
  });

  const spans: SoundingSpan[] = [];
  for (const position of positions) {
    if (!position.isOnset) continue;
    const members =
      position.tieGroupId === undefined
        ? [position]
        : positions.filter(member => member.tieGroupId === position.tieGroupId);
    spans.push(
      Object.freeze({
        startTicks: position.absoluteStartTicks,
        endTicks: members[members.length - 1].absoluteEndTicks,
        segmentIds: Object.freeze(members.map(member => member.segmentId)),
        ...(position.tieGroupId !== undefined
          ? { tieGroupId: position.tieGroupId }
          : {}),
        accent: position.accent,
      })
    );
  }
  return Object.freeze({
    pattern,
    meter,
    totalTicks: meter.measureTicks * pattern.measures.length,
    segments: Object.freeze(positions),
    onsets: Object.freeze(
      positions
        .filter(segment => segment.isOnset)
        .map(segment => segment.absoluteStartTicks)
    ),
    soundingSpans: Object.freeze(spans),
  });
}

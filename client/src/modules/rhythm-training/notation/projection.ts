import type {
  RhythmPattern,
  SegmentPosition,
  TieRole,
  WrittenDuration,
} from "../types";
import {
  deriveRhythmTimeline,
  type RhythmTimeline,
} from "../rhythm/deriveTimeline";
import { requireValidRhythmPattern } from "../rhythm/validate";

export type ProjectedNotationDuration = `${number}` | `${number}r`;

export type NotationSegmentProjection = Readonly<{
  segmentId: string;
  /** Upper-case alias retained for SVG/evidence consumers that call this a segment ID. */
  segmentID: string;
  measureId: string;
  measureIndex: number;
  segmentIndex: number;
  kind: "note" | "rest";
  duration: ProjectedNotationDuration;
  durationString: ProjectedNotationDuration;
  dotCount: number;
  canonicalDurationTicks: number;
  startTicks: number;
  endTicks: number;
  absoluteStartTicks: number;
  absoluteEndTicks: number;
  onset: boolean;
  isOnset: boolean;
  tieRole: TieRole;
  tieGroupId?: string;
  accent: "normal" | "strong";
}>;

export type NotationBeamGroup = Readonly<{
  id: string;
  segmentIds: readonly string[];
  segmentIDs: readonly string[];
  measureId: string;
  measureIndex: number;
  pulseIndex: number;
  startTicks: number;
  endTicks: number;
}>;

export type NotationTieEdge = Readonly<{
  id: string;
  fromSegmentId: string;
  toSegmentId: string;
  fromSegmentID: string;
  toSegmentID: string;
  tieGroupId: string;
  crossesBarline: boolean;
}>;

export type ImmutableRhythmNotationProjection = Readonly<{
  canonicalPattern: RhythmPattern;
  pattern: RhythmPattern;
  timeline: RhythmTimeline;
  segments: readonly NotationSegmentProjection[];
  beamGroups: readonly NotationBeamGroup[];
  tieEdges: readonly NotationTieEdge[];
}>;

function durationString(
  duration: WrittenDuration,
  kind: "note" | "rest"
): ProjectedNotationDuration {
  return `${duration.denominator}${kind === "rest" ? "r" : ""}` as ProjectedNotationDuration;
}

function freezeProjectionSegment(
  position: SegmentPosition,
  duration: WrittenDuration
): NotationSegmentProjection {
  const projectedDuration = durationString(duration, position.kind);
  return Object.freeze({
    segmentId: position.segmentId,
    segmentID: position.segmentId,
    measureId: position.measureId,
    measureIndex: position.measureIndex,
    segmentIndex: position.segmentIndex,
    kind: position.kind,
    duration: projectedDuration,
    durationString: projectedDuration,
    dotCount: duration.dots,
    canonicalDurationTicks: position.durationTicks,
    startTicks: position.absoluteStartTicks,
    endTicks: position.absoluteEndTicks,
    absoluteStartTicks: position.absoluteStartTicks,
    absoluteEndTicks: position.absoluteEndTicks,
    onset: position.isOnset,
    isOnset: position.isOnset,
    tieRole: position.tieRole,
    ...(position.tieGroupId !== undefined
      ? { tieGroupId: position.tieGroupId }
      : {}),
    accent: position.accent,
  });
}

function deriveBeamGroups(
  timeline: RhythmTimeline,
  segments: readonly NotationSegmentProjection[]
): readonly NotationBeamGroup[] {
  const groups: NotationBeamGroup[] = [];
  let pending: NotationSegmentProjection[] = [];

  const flush = () => {
    if (pending.length >= 2) {
      const first = pending[0];
      const last = pending[pending.length - 1];
      groups.push(
        Object.freeze({
          id: `beam-${groups.length + 1}`,
          segmentIds: Object.freeze(pending.map(segment => segment.segmentId)),
          segmentIDs: Object.freeze(pending.map(segment => segment.segmentId)),
          measureId: first.measureId,
          measureIndex: first.measureIndex,
          pulseIndex: Math.floor(
            (first.startTicks -
              first.measureIndex * timeline.meter.measureTicks) /
              timeline.meter.pulseTicks
          ),
          startTicks: first.startTicks,
          endTicks: last.endTicks,
        })
      );
    }
    pending = [];
  };

  for (const segment of segments) {
    const measureStart = segment.measureIndex * timeline.meter.measureTicks;
    const measureOffset = segment.startTicks - measureStart;
    const pulseStart =
      measureStart +
      Math.floor(measureOffset / timeline.meter.pulseTicks) *
        timeline.meter.pulseTicks;
    const pulseEnd = pulseStart + timeline.meter.pulseTicks;
    const isBeamable =
      segment.kind === "note" &&
      (segment.duration === "8" || segment.duration === "16") &&
      segment.startTicks >= pulseStart &&
      segment.endTicks <= pulseEnd;
    const previous = pending[pending.length - 1];
    const previousMeasureStart =
      previous === undefined
        ? 0
        : previous.measureIndex * timeline.meter.measureTicks;
    const previousPulseStart =
      previous === undefined
        ? 0
        : previousMeasureStart +
          Math.floor(
            (previous.startTicks - previousMeasureStart) /
              timeline.meter.pulseTicks
          ) *
            timeline.meter.pulseTicks;
    const contiguous =
      previous !== undefined &&
      previous.endTicks === segment.startTicks &&
      previous.measureIndex === segment.measureIndex &&
      previous.measureId === segment.measureId &&
      previousPulseStart === pulseStart;

    if (!isBeamable || (pending.length > 0 && !contiguous)) flush();
    if (isBeamable) pending.push(segment);
  }
  flush();
  return Object.freeze(groups);
}

function deriveTieEdges(
  timeline: RhythmTimeline,
  segments: readonly NotationSegmentProjection[]
): readonly NotationTieEdge[] {
  const edges: NotationTieEdge[] = [];
  for (let index = 0; index + 1 < segments.length; index += 1) {
    const from = segments[index];
    const to = segments[index + 1];
    if (
      from.tieGroupId === undefined ||
      from.tieGroupId !== to.tieGroupId ||
      from.kind !== "note" ||
      to.kind !== "note" ||
      from.endTicks !== to.startTicks
    ) {
      continue;
    }
    edges.push(
      Object.freeze({
        id: `tie-${edges.length + 1}`,
        fromSegmentId: from.segmentId,
        toSegmentId: to.segmentId,
        fromSegmentID: from.segmentId,
        toSegmentID: to.segmentId,
        tieGroupId: from.tieGroupId,
        crossesBarline: from.measureIndex !== to.measureIndex,
      })
    );
  }
  return Object.freeze(edges);
}

export function projectRhythmNotation(
  input: unknown
): ImmutableRhythmNotationProjection {
  const pattern = requireValidRhythmPattern(input);
  const timeline = deriveRhythmTimeline(pattern, 120);
  const segments = Object.freeze(
    timeline.segments.map(position =>
      freezeProjectionSegment(
        position,
        pattern.measures[position.measureIndex].segments[position.segmentIndex]
          .duration
      )
    )
  );
  const projection: ImmutableRhythmNotationProjection = {
    canonicalPattern: pattern,
    pattern,
    timeline,
    segments,
    beamGroups: deriveBeamGroups(timeline, segments),
    tieEdges: deriveTieEdges(timeline, segments),
  };
  return Object.freeze(projection);
}

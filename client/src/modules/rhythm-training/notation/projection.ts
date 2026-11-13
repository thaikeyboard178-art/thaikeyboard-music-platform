import type {
  RhythmPattern,
  SegmentPosition,
  TieRole,
  WrittenDuration,
  RhythmTupletGroup,
} from "../types";
import {
  deriveRhythmTimeline,
  type RhythmTimeline,
} from "../rhythm/deriveTimeline";
import type { StructuralAccent } from "../rhythm/meters";
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
  tupletGroup?: RhythmTupletGroup;
  accent: "normal" | "strong";
  structuralAccent: StructuralAccent;
  pulseIndex: number;
  pulseOffsetTicks: number;
  subdivisionIndex: number;
  subdivisionTicks: number;
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

export type NotationTupletGroup = Readonly<{
  groupId: string;
  segmentIds: readonly string[];
  actualNotes: 3;
  normalNotes: 2;
  measureIndex: number;
  startTicks: number;
  endTicks: number;
}>;

export type ImmutableRhythmNotationProjection = Readonly<{
  canonicalPattern: RhythmPattern;
  pattern: RhythmPattern;
  timeline: RhythmTimeline;
  segments: readonly NotationSegmentProjection[];
  beamGroups: readonly NotationBeamGroup[];
  tieEdges: readonly NotationTieEdge[];
  tupletGroups: readonly NotationTupletGroup[];
}>;

function durationString(
  duration: WrittenDuration,
  kind: "note" | "rest"
): ProjectedNotationDuration {
  return `${duration.denominator}${kind === "rest" ? "r" : ""}` as ProjectedNotationDuration;
}

function freezeProjectionSegment(
  position: SegmentPosition,
  duration: WrittenDuration,
  structuralAccent: StructuralAccent
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
    ...(position.tupletGroup !== undefined
      ? { tupletGroup: position.tupletGroup }
      : {}),
    accent: position.accent,
    structuralAccent,
    pulseIndex: position.pulseIndex,
    pulseOffsetTicks: position.pulseOffsetTicks,
    subdivisionIndex: position.subdivisionIndex,
    subdivisionTicks: position.subdivisionTicks,
  });
}

function deriveBeamGroups(
  timeline: RhythmTimeline,
  segments: readonly NotationSegmentProjection[]
): readonly NotationBeamGroup[] {
  const groups: NotationBeamGroup[] = [];
  let pending: NotationSegmentProjection[] = [];

  const groupBounds = (measureIndex: number, measureOffset: number) => {
    const groupIndex = timeline.meter.groupStarts.findIndex(
      (start, index) =>
        start <= measureOffset &&
        (timeline.meter.groupStarts[index + 1] ?? timeline.meter.measureTicks) >
          measureOffset
    );
    if (groupIndex < 0) throw new RangeError("Missing canonical meter group.");
    const measureStart = measureIndex * timeline.meter.measureTicks;
    return {
      groupIndex,
      start: measureStart + timeline.meter.groupStarts[groupIndex],
      end:
        measureStart +
        (timeline.meter.groupStarts[groupIndex + 1] ??
          timeline.meter.measureTicks),
    };
  };

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
    const group = groupBounds(segment.measureIndex, measureOffset);
    const isBeamable =
      segment.kind === "note" &&
      (segment.duration === "8" || segment.duration === "16") &&
      segment.startTicks >= group.start &&
      segment.endTicks <= group.end;
    const previous = pending[pending.length - 1];
    const previousMeasureStart =
      previous === undefined
        ? 0
        : previous.measureIndex * timeline.meter.measureTicks;
    const previousGroupStart =
      previous === undefined
        ? 0
        : groupBounds(
            previous.measureIndex,
            previous.startTicks - previousMeasureStart
          ).start;
    const contiguous =
      previous !== undefined &&
      previous.endTicks === segment.startTicks &&
      previous.measureIndex === segment.measureIndex &&
      previous.measureId === segment.measureId &&
      previousGroupStart === group.start;

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

function deriveTupletGroups(
  segments: readonly NotationSegmentProjection[]
): readonly NotationTupletGroup[] {
  const membersById = new Map<string, NotationSegmentProjection[]>();
  for (const segment of segments) {
    const group = segment.tupletGroup;
    if (group === undefined) continue;
    const members = membersById.get(group.groupId) ?? [];
    members.push(segment);
    membersById.set(group.groupId, members);
  }
  return Object.freeze(
    [...membersById.entries()].map(([groupId, members]) => {
      const first = members[0];
      const last = members[members.length - 1];
      return Object.freeze({
        groupId,
        segmentIds: Object.freeze(members.map(member => member.segmentId)),
        actualNotes: first.tupletGroup!.actualNotes,
        normalNotes: first.tupletGroup!.normalNotes,
        measureIndex: first.measureIndex,
        startTicks: first.startTicks,
        endTicks: last.endTicks,
      });
    })
  );
}

export function projectRhythmNotation(
  input: unknown
): ImmutableRhythmNotationProjection {
  const pattern = requireValidRhythmPattern(input);
  const timeline = deriveRhythmTimeline(pattern, 120);
  const structuralAccents = new Map(
    timeline.structure.accentPositions.map(point => [point.tick, point.level])
  );
  const segments = Object.freeze(
    timeline.segments.map(position => {
      const structuralAccent = structuralAccents.get(
        position.measureOffsetTicks
      );
      if (structuralAccent === undefined) {
        throw new RangeError("Missing canonical structural accent position");
      }
      return freezeProjectionSegment(
        position,
        pattern.measures[position.measureIndex].segments[position.segmentIndex]
          .duration,
        structuralAccent
      );
    })
  );
  const projection: ImmutableRhythmNotationProjection = {
    canonicalPattern: pattern,
    pattern,
    timeline,
    segments,
    beamGroups: deriveBeamGroups(timeline, segments),
    tieEdges: deriveTieEdges(timeline, segments),
    tupletGroups: deriveTupletGroups(segments),
  };
  return Object.freeze(projection);
}

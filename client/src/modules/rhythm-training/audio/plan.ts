import type { RhythmPattern } from "../types";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { ticksToSeconds, type StructuralAccent } from "../rhythm/meters";

export type AudioLane = "pattern" | "metronome";

export type RhythmAudioEvent = Readonly<{
  id: string;
  lane: AudioLane;
  tick: number;
  endTick: number;
  offsetSeconds: number;
  endOffsetSeconds: number;
  structuralAccent: StructuralAccent;
  segmentAccent: "normal" | "strong";
  segmentIds: readonly string[];
  measureIndex: number;
  pulseIndex: number;
  count: number;
}>;

export type RhythmVisualCount = Readonly<{
  tick: number;
  offsetSeconds: number;
  measureIndex: number;
  pulseIndex: number;
  count: number;
  structuralAccent: StructuralAccent;
}>;

export type RhythmAudioPlan = Readonly<{
  pattern: RhythmPattern;
  durationSeconds: number;
  totalTicks: number;
  pulseTicks: number;
  pulseCount: number;
  events: readonly RhythmAudioEvent[];
  toneEvents: readonly RhythmAudioEvent[];
  pulseEvents: readonly RhythmAudioEvent[];
  onsetReferences: readonly Readonly<{
    id: string;
    tick: number;
    offsetSeconds: number;
  }>[];
  visualCounting: readonly RhythmVisualCount[];
  voiceCounting: Readonly<{
    available: false;
    language: "en";
    reason: string;
  }>;
}>;

const VOICE_UNAVAILABLE_REASON =
  "App voice counting is unavailable: no approved voice implementation or assets are present.";

function isAudioLane(value: unknown): value is AudioLane {
  return value === "pattern" || value === "metronome";
}

function getStructuralAccent(
  accentByMeasureTick: ReadonlyMap<number, StructuralAccent>,
  measureOffsetTicks: number
): StructuralAccent {
  const accent = accentByMeasureTick.get(measureOffsetTicks);
  if (accent === undefined) {
    throw new RangeError(
      "Canonical event boundary is missing from the meter accent grid."
    );
  }
  return accent;
}

/**
 * Builds a frozen, canonical event snapshot. All timing is projected from
 * absolute canonical ticks, so long patterns do not accumulate scheduler drift.
 */
export function createRhythmAudioPlan(
  input: unknown,
  lanes: "pattern" | "metronome" | "both"
): RhythmAudioPlan {
  if (lanes !== "pattern" && lanes !== "metronome" && lanes !== "both") {
    throw new RangeError("Audio lanes must be pattern, metronome, or both.");
  }

  const timeline = deriveRhythmTimeline(input);
  const { pattern, meter, structure, totalTicks } = timeline;
  const tempo = pattern.tempo.pulseBpm;
  const accentByMeasureTick = new Map(
    structure.accentPositions.map(position => [position.tick, position.level])
  );
  const positionsBySegmentId = new Map(
    timeline.segments.map(position => [position.segmentId, position])
  );

  const allToneEvents: readonly RhythmAudioEvent[] = Object.freeze(
    timeline.soundingSpans.map(span => {
      const onsetPosition = positionsBySegmentId.get(span.segmentIds[0]);
      if (onsetPosition === undefined) {
        throw new RangeError("Canonical sounding span has no onset segment.");
      }
      return Object.freeze({
        id: `pattern:${span.segmentIds[0]}`,
        lane: "pattern" as const,
        tick: span.startTicks,
        endTick: span.endTicks,
        offsetSeconds: ticksToSeconds(span.startTicks, pattern.meter, tempo),
        endOffsetSeconds: ticksToSeconds(span.endTicks, pattern.meter, tempo),
        structuralAccent: getStructuralAccent(
          accentByMeasureTick,
          onsetPosition.measureOffsetTicks
        ),
        segmentAccent: span.accent,
        segmentIds: Object.freeze([...span.segmentIds]),
        measureIndex: onsetPosition.measureIndex,
        pulseIndex: onsetPosition.pulseIndex,
        count: onsetPosition.pulseIndex + 1,
      });
    })
  );

  const allPulseEvents: readonly RhythmAudioEvent[] = Object.freeze(
    pattern.measures.flatMap((_, measureIndex) =>
      meter.pulseStarts.map((pulseStartTicks, pulseIndex) => {
        const tick = measureIndex * meter.measureTicks + pulseStartTicks;
        return Object.freeze({
          id: `metronome:m${measureIndex + 1}:p${pulseIndex + 1}`,
          lane: "metronome" as const,
          tick,
          endTick: tick,
          offsetSeconds: ticksToSeconds(tick, pattern.meter, tempo),
          endOffsetSeconds: ticksToSeconds(tick, pattern.meter, tempo),
          structuralAccent: getStructuralAccent(
            accentByMeasureTick,
            pulseStartTicks
          ),
          segmentAccent: "normal" as const,
          segmentIds: Object.freeze([] as string[]),
          measureIndex,
          pulseIndex,
          count: pulseIndex + 1,
        });
      })
    )
  );

  const toneEvents: readonly RhythmAudioEvent[] =
    lanes === "metronome" ? Object.freeze([]) : allToneEvents;
  const pulseEvents: readonly RhythmAudioEvent[] =
    lanes === "pattern" ? Object.freeze([]) : allPulseEvents;

  const events: readonly RhythmAudioEvent[] = Object.freeze(
    (lanes === "pattern"
      ? [...toneEvents]
      : lanes === "metronome"
        ? [...pulseEvents]
        : [...toneEvents, ...pulseEvents]
    ).sort((left, right) => {
      if (left.tick !== right.tick) return left.tick - right.tick;
      if (left.lane === right.lane) return 0;
      return left.lane === "pattern" ? -1 : 1;
    })
  );

  const visualCounting: readonly RhythmVisualCount[] = Object.freeze(
    pattern.measures.flatMap((_, measureIndex) =>
      meter.pulseStarts.map((pulseStartTicks, pulseIndex) => {
        const tick = measureIndex * meter.measureTicks + pulseStartTicks;
        return Object.freeze({
          tick,
          offsetSeconds: ticksToSeconds(tick, pattern.meter, tempo),
          measureIndex,
          pulseIndex,
          count: pulseIndex + 1,
          structuralAccent: getStructuralAccent(
            accentByMeasureTick,
            pulseStartTicks
          ),
        });
      })
    )
  );

  return Object.freeze({
    pattern,
    durationSeconds: ticksToSeconds(totalTicks, pattern.meter, tempo),
    totalTicks,
    pulseTicks: meter.pulseTicks,
    pulseCount: meter.pulseCount,
    events,
    toneEvents,
    pulseEvents,
    onsetReferences: Object.freeze(
      allToneEvents.map(event =>
        Object.freeze({
          id: event.id,
          tick: event.tick,
          offsetSeconds: event.offsetSeconds,
        })
      )
    ),
    visualCounting,
    voiceCounting: Object.freeze({
      available: false as const,
      language: "en" as const,
      reason: VOICE_UNAVAILABLE_REASON,
    }),
  });
}

/** Builds the pattern-only playback snapshot used by Listen & Identify. */
export function createListenPlaybackPlan(input: unknown): RhythmAudioPlan {
  return createRhythmAudioPlan(input, "pattern");
}

import {
  createRhythmAudioPlan,
  type RhythmAudioEvent,
  type RhythmAudioPlan,
} from "./plan";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import type { TapRhythmExercise } from "../exercises/tapRhythm";

/** A single canonical measure of technical-pulse metronome for free listening. */
export function createTapMetronomeLoopPlan(
  exercise: TapRhythmExercise
): RhythmAudioPlan {
  const firstMeasure = exercise.pattern.measures[0];
  if (!firstMeasure) throw new RangeError("Tap exercises must contain a measure.");
  return createRhythmAudioPlan(
    Object.freeze({
      ...exercise.pattern,
      id: `${exercise.pattern.id}-free-metronome`,
      measures: Object.freeze([firstMeasure]),
    }),
    "metronome"
  );
}

/** Two canonical exercise rounds, starting on the supplied downbeat. */
export function createTapAttemptPlan(
  exercise: TapRhythmExercise
): RhythmAudioPlan {
  const base = createRhythmAudioPlan(exercise.pattern, "metronome");
  const patternBars = exercise.pattern.measures.length;
  const shiftPulse = (
    event: RhythmAudioEvent,
    roundNumber: 1 | 2
  ): RhythmAudioEvent => {
    const tickShift = (roundNumber - 1) * base.totalTicks;
    const timeShift = (roundNumber - 1) * base.durationSeconds;
    const measureShift = (roundNumber - 1) * patternBars;
    return Object.freeze({
      ...event,
      id: `round-${roundNumber}:${event.id}`,
      tick: event.tick + tickShift,
      endTick: event.endTick + tickShift,
      offsetSeconds: event.offsetSeconds + timeShift,
      endOffsetSeconds: event.endOffsetSeconds + timeShift,
      measureIndex: event.measureIndex + measureShift,
    });
  };
  const shiftOnset = (
    onset: RhythmAudioPlan["onsetReferences"][number],
    roundNumber: 1 | 2
  ): RhythmAudioPlan["onsetReferences"][number] => {
    const tickShift = (roundNumber - 1) * base.totalTicks;
    const timeShift = (roundNumber - 1) * base.durationSeconds;
    return Object.freeze({
      ...onset,
      id: `round-${roundNumber}:${onset.id}`,
      tick: onset.tick + tickShift,
      offsetSeconds: onset.offsetSeconds + timeShift,
    });
  };
  const shiftCount = (
    position: RhythmAudioPlan["visualCounting"][number],
    roundNumber: 1 | 2
  ): RhythmAudioPlan["visualCounting"][number] => {
    const tickShift = (roundNumber - 1) * base.totalTicks;
    const timeShift = (roundNumber - 1) * base.durationSeconds;
    const measureShift = (roundNumber - 1) * patternBars;
    return Object.freeze({
      ...position,
      tick: position.tick + tickShift,
      offsetSeconds: position.offsetSeconds + timeShift,
      measureIndex: position.measureIndex + measureShift,
    });
  };
  const pulseEvents = Object.freeze(
    ([1, 2] as const).flatMap(roundNumber =>
      base.pulseEvents.map(event => shiftPulse(event, roundNumber))
    )
  );
  return Object.freeze({
    ...base,
    durationSeconds: 2 * base.durationSeconds,
    totalTicks: 2 * base.totalTicks,
    events: pulseEvents,
    pulseEvents,
    toneEvents: Object.freeze([]),
    onsetReferences: Object.freeze(
      ([1, 2] as const).flatMap(roundNumber =>
        base.onsetReferences.map(onset => shiftOnset(onset, roundNumber))
      )
    ),
    visualCounting: Object.freeze(
      ([1, 2] as const).flatMap(roundNumber =>
        base.visualCounting.map(position => shiftCount(position, roundNumber))
      )
    ),
  });
}

/**
 * Reference playback begins with one bar of metronome-only count-in, followed
 * by both canonical pattern and metronome lanes on a single shifted timeline.
 * The supplied exercise and all of its tap targets remain unchanged.
 */
export function createTapReferencePlan(
  exercise: TapRhythmExercise
): RhythmAudioPlan {
  const base = createRhythmAudioPlan(exercise.pattern, "both");
  const meter = deriveMeter(exercise.pattern.meter);
  const barTicks = meter.measureTicks;
  const barSeconds = ticksToSeconds(
    barTicks,
    exercise.pattern.meter,
    exercise.pattern.tempo.pulseBpm
  );
  const shift = (event: RhythmAudioEvent): RhythmAudioEvent =>
    Object.freeze({
      ...event,
      tick: event.tick + barTicks,
      endTick: event.endTick + barTicks,
      offsetSeconds: event.offsetSeconds + barSeconds,
      endOffsetSeconds: event.endOffsetSeconds + barSeconds,
      measureIndex: event.measureIndex + 1,
    });
  const countIn = base.pulseEvents.slice(0, meter.pulseCount).map(event =>
    Object.freeze({
      ...event,
      id: `count-in:${event.id}`,
    })
  );
  const toneEvents = Object.freeze(base.toneEvents.map(shift));
  const pulseEvents = Object.freeze([
    ...countIn,
    ...base.pulseEvents.map(shift),
  ]);
  const events = Object.freeze(
    [...toneEvents, ...pulseEvents].sort((left, right) => {
      if (left.tick !== right.tick) return left.tick - right.tick;
      if (left.lane === right.lane) return 0;
      return left.lane === "pattern" ? -1 : 1;
    })
  );

  return Object.freeze({
    ...base,
    durationSeconds: base.durationSeconds + barSeconds,
    totalTicks: base.totalTicks + barTicks,
    events,
    toneEvents,
    pulseEvents,
    onsetReferences: Object.freeze(
      base.onsetReferences.map(onset =>
        Object.freeze({
          ...onset,
          tick: onset.tick + barTicks,
          offsetSeconds: onset.offsetSeconds + barSeconds,
        })
      )
    ),
    visualCounting: Object.freeze([
      ...base.visualCounting.slice(0, meter.pulseCount),
      ...base.visualCounting.map(position =>
        Object.freeze({
          ...position,
          tick: position.tick + barTicks,
          offsetSeconds: position.offsetSeconds + barSeconds,
          measureIndex: position.measureIndex + 1,
        })
      ),
    ]),
  });
}

import {
  createRhythmAudioPlan,
  type RhythmAudioEvent,
  type RhythmAudioPlan,
} from "./plan";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import type { TapRhythmExercise } from "../exercises/tapRhythm";

export const TAP_COUNT_IN_BARS = [1, 2, 4, 6, 8] as const;
export type TapCountInBars = (typeof TAP_COUNT_IN_BARS)[number];
export const DEFAULT_TAP_COUNT_IN_BARS: TapCountInBars = 2;

export function requireTapCountInBars(value: unknown): TapCountInBars {
  if (
    typeof value === "number" &&
    TAP_COUNT_IN_BARS.some(candidate => candidate === value)
  )
    return value as TapCountInBars;
  throw new RangeError("Tap count-in bars must be 1, 2, 4, 6, or 8.");
}

/** A finite technical-pulse count-in followed by two canonical exercise rounds. */
export function createTapAttemptPlan(
  exercise: TapRhythmExercise,
  countInBars: TapCountInBars = DEFAULT_TAP_COUNT_IN_BARS
): RhythmAudioPlan {
  const bars = requireTapCountInBars(countInBars);
  const base = createRhythmAudioPlan(exercise.pattern, "metronome");
  const meter = deriveMeter(exercise.pattern.meter);
  const patternBars = exercise.pattern.measures.length;
  const countInTicks = bars * meter.measureTicks;
  const countInSeconds = ticksToSeconds(
    countInTicks,
    exercise.pattern.meter,
    exercise.pattern.tempo.pulseBpm
  );
  const firstBarPulses = base.pulseEvents.filter(
    event => event.measureIndex === 0
  );
  const firstBarCounts = base.visualCounting.filter(
    position => position.measureIndex === 0
  );
  const countInPulses = Object.freeze(
    Array.from({ length: bars }, (_, barIndex) =>
      firstBarPulses.map(event =>
        Object.freeze({
          ...event,
          id: `count-in:${barIndex + 1}:${event.id}`,
          tick: event.tick + barIndex * meter.measureTicks,
          endTick: event.endTick + barIndex * meter.measureTicks,
          offsetSeconds:
            event.offsetSeconds +
            ticksToSeconds(
              barIndex * meter.measureTicks,
              exercise.pattern.meter,
              exercise.pattern.tempo.pulseBpm
            ),
          endOffsetSeconds:
            event.endOffsetSeconds +
            ticksToSeconds(
              barIndex * meter.measureTicks,
              exercise.pattern.meter,
              exercise.pattern.tempo.pulseBpm
            ),
          measureIndex: barIndex,
        })
      )
    ).flat()
  );
  const shiftPulse = (
    event: RhythmAudioEvent,
    roundNumber: 1 | 2
  ): RhythmAudioEvent => {
    const roundTickShift = (roundNumber - 1) * base.totalTicks;
    const roundTimeShift = (roundNumber - 1) * base.durationSeconds;
    const tickShift = countInTicks + roundTickShift;
    const timeShift = countInSeconds + roundTimeShift;
    return Object.freeze({
      ...event,
      id: `round-${roundNumber}:${event.id}`,
      tick: event.tick + tickShift,
      endTick: event.endTick + tickShift,
      offsetSeconds: event.offsetSeconds + timeShift,
      endOffsetSeconds: event.endOffsetSeconds + timeShift,
      measureIndex: event.measureIndex + bars + (roundNumber - 1) * patternBars,
    });
  };
  const shiftOnset = (
    onset: RhythmAudioPlan["onsetReferences"][number],
    roundNumber: 1 | 2
  ): RhythmAudioPlan["onsetReferences"][number] => {
    const tickShift = countInTicks + (roundNumber - 1) * base.totalTicks;
    const timeShift = countInSeconds + (roundNumber - 1) * base.durationSeconds;
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
    const tickShift = countInTicks + (roundNumber - 1) * base.totalTicks;
    const timeShift = countInSeconds + (roundNumber - 1) * base.durationSeconds;
    return Object.freeze({
      ...position,
      tick: position.tick + tickShift,
      offsetSeconds: position.offsetSeconds + timeShift,
      measureIndex:
        position.measureIndex + bars + (roundNumber - 1) * patternBars,
    });
  };
  const countInVisualCounting = Object.freeze(
    Array.from({ length: bars }, (_, barIndex) =>
      firstBarCounts.map(position => {
        const tickShift = barIndex * meter.measureTicks;
        return Object.freeze({
          ...position,
          tick: position.tick + tickShift,
          offsetSeconds:
            position.offsetSeconds +
            ticksToSeconds(
              tickShift,
              exercise.pattern.meter,
              exercise.pattern.tempo.pulseBpm
            ),
          measureIndex: barIndex,
        });
      })
    ).flat()
  );
  const exercisePulses = ([1, 2] as const).flatMap(roundNumber =>
    base.pulseEvents.map(event => shiftPulse(event, roundNumber))
  );
  const pulseEvents = Object.freeze([...countInPulses, ...exercisePulses]);
  return Object.freeze({
    ...base,
    durationSeconds: countInSeconds + 2 * base.durationSeconds,
    totalTicks: countInTicks + 2 * base.totalTicks,
    events: pulseEvents,
    pulseEvents,
    toneEvents: Object.freeze([]),
    onsetReferences: Object.freeze(
      ([1, 2] as const).flatMap(roundNumber =>
        base.onsetReferences.map(onset => shiftOnset(onset, roundNumber))
      )
    ),
    visualCounting: Object.freeze([
      ...countInVisualCounting,
      ...([1, 2] as const).flatMap(roundNumber =>
        base.visualCounting.map(position => shiftCount(position, roundNumber))
      ),
    ]),
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

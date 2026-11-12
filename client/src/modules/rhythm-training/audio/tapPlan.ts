import {
  createRhythmAudioPlan,
  type RhythmAudioEvent,
  type RhythmAudioPlan,
} from "./plan";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import type { TapRhythmExercise } from "../exercises/tapRhythm";

/** A Tap-owned composition over the existing Phase 3 audio plan. */
export function createTapAttemptPlan(
  exercise: TapRhythmExercise
): RhythmAudioPlan {
  const base = createRhythmAudioPlan(exercise.pattern, "metronome");
  const meter = deriveMeter(exercise.pattern.meter);
  const barTicks = meter.measureTicks;
  const barSeconds = ticksToSeconds(
    barTicks,
    exercise.pattern.meter,
    exercise.pattern.tempo.pulseBpm
  );
  const shiftPulse = (event: RhythmAudioEvent): RhythmAudioEvent =>
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
  const pulseEvents = Object.freeze([
    ...countIn,
    ...base.pulseEvents.map(shiftPulse),
  ]);
  return Object.freeze({
    ...base,
    durationSeconds: base.durationSeconds + barSeconds,
    totalTicks: base.totalTicks + barTicks,
    events: pulseEvents,
    pulseEvents,
    toneEvents: Object.freeze([]),
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

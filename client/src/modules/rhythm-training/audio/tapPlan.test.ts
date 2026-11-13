import { describe, expect, it } from "vitest";
import { createRhythmAudioPlan } from "./plan";
import {
  createTapAttemptPlan,
  DEFAULT_TAP_COUNT_IN_BARS,
  requireTapCountInBars,
  TAP_COUNT_IN_BARS,
} from "./tapPlan";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import { createCanonicalTapStressExercise } from "./tapTestHelpers";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import type { RhythmTrack } from "../types";

describe("Tap plan composition", () => {
  it("validates the count-in choices and defaults to two bars", () => {
    expect(TAP_COUNT_IN_BARS).toEqual([1, 2, 4, 6, 8]);
    expect(DEFAULT_TAP_COUNT_IN_BARS).toBe(2);
    for (const value of TAP_COUNT_IN_BARS)
      expect(requireTapCountInBars(value)).toBe(value);
    for (const value of [0, 3, 5, 7, 9, "2", null, undefined, NaN])
      expect(() => requireTapCountInBars(value)).toThrow(RangeError);
  });

  it.each(
    SEVEN_METER_RUNTIME_FIXTURES.map((fixture, index) => ({ fixture, index }))
  )(
    "uses exact count-in and two continuous rounds for $fixture.name",
    ({ fixture, index }) => {
      const track: RhythmTrack = index < 3 ? 3 : index === 6 ? "bonus" : 6;
      const exercise = createCanonicalTapStressExercise({
        track,
        pattern: fixture.pattern,
      });
      const base = createRhythmAudioPlan(exercise.pattern, "metronome");
      const meter = deriveMeter(exercise.pattern.meter);
      for (const countInBars of TAP_COUNT_IN_BARS) {
        const countInTicks = countInBars * meter.measureTicks;
        const countInSeconds = ticksToSeconds(
          countInTicks,
          exercise.pattern.meter,
          exercise.pattern.tempo.pulseBpm
        );
        const attempt = createTapAttemptPlan(exercise, countInBars);
        const expectedCountInTicks = Array.from(
          { length: countInBars },
          (_, bar) =>
            meter.pulseStarts.map(tick => bar * meter.measureTicks + tick)
        ).flat();
        expect(attempt.durationSeconds).toBeCloseTo(
          countInSeconds + 2 * base.durationSeconds,
          12
        );
        expect(attempt.totalTicks).toBe(countInTicks + 2 * base.totalTicks);
        expect(
          attempt.pulseEvents
            .slice(0, expectedCountInTicks.length)
            .map(event => event.tick)
        ).toEqual(expectedCountInTicks);
        expect(
          attempt.pulseEvents
            .slice(0, expectedCountInTicks.length)
            .every(event => event.id.startsWith("count-in:"))
        ).toBe(true);
        expect(attempt.pulseEvents.map(event => event.tick)).toEqual([
          ...expectedCountInTicks,
          ...base.pulseEvents.map(event => event.tick + countInTicks),
          ...base.pulseEvents.map(
            event => event.tick + countInTicks + base.totalTicks
          ),
        ]);
        expect(attempt.pulseEvents).toHaveLength(
          countInBars * meter.pulseCount + 2 * base.pulseEvents.length
        );
        expect(attempt.onsetReferences).toHaveLength(
          2 * exercise.targets.length
        );
        expect(attempt.onsetReferences[0].offsetSeconds).toBeCloseTo(
          countInSeconds + base.onsetReferences[0].offsetSeconds,
          12
        );
        expect(
          attempt.onsetReferences[exercise.targets.length].offsetSeconds
        ).toBeCloseTo(
          countInSeconds +
            base.durationSeconds +
            base.onsetReferences[0].offsetSeconds,
          12
        );
        expect(attempt.events.every(event => event.lane === "metronome")).toBe(true);
        for (let bar = 0; bar < countInBars; bar++) {
          const countInPulses = attempt.pulseEvents.slice(
            bar * meter.pulseCount,
            (bar + 1) * meter.pulseCount
          );
          expect(countInPulses.every(event => event.measureIndex === bar)).toBe(true);
          expect(countInPulses.map(event => event.structuralAccent)).toEqual(
            base.pulseEvents.slice(0, meter.pulseCount).map(event => event.structuralAccent)
          );
        }
        expect(attempt.toneEvents).toHaveLength(0);
        expect(attempt.events).toEqual(attempt.pulseEvents);
        expect(
          attempt.visualCounting
            .slice(0, expectedCountInTicks.length)
            .map(x => x.tick)
        ).toEqual(expectedCountInTicks);
      }
      expect(createTapAttemptPlan(exercise).durationSeconds).toBeCloseTo(
        createTapAttemptPlan(exercise, DEFAULT_TAP_COUNT_IN_BARS)
          .durationSeconds,
        12
      );
    }
  );
});

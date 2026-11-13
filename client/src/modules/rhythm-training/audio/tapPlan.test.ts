import { describe, expect, it } from "vitest";
import { createRhythmAudioPlan } from "./plan";
import {
  createTapAttemptPlan,
  createTapMetronomeLoopPlan,
} from "./tapPlan";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import { createCanonicalTapStressExercise } from "./tapTestHelpers";
import type { RhythmTrack } from "../types";

describe("Tap plan composition", () => {
  it.each(SEVEN_METER_RUNTIME_FIXTURES.map((fixture, index) => ({ fixture, index })))(
    "uses a complete technical-pulse loop and two seamless rounds for $fixture.name",
    ({ fixture, index }) => {
      const track: RhythmTrack = index < 3 ? 3 : index === 6 ? "bonus" : 6;
      const exercise = createCanonicalTapStressExercise({
        track,
        pattern: fixture.pattern,
      });
      const firstMeasure = Object.freeze({
        ...exercise.pattern,
        measures: Object.freeze([exercise.pattern.measures[0]]),
      });
      const expectedLoop = createRhythmAudioPlan(firstMeasure, "metronome");
      const loop = createTapMetronomeLoopPlan(exercise);
      expect(loop.durationSeconds).toBe(expectedLoop.durationSeconds);
      expect(loop.totalTicks).toBe(expectedLoop.totalTicks);
      expect(loop.events.every(event => event.lane === "metronome")).toBe(true);
      expect(loop.pulseEvents).toHaveLength(expectedLoop.pulseEvents.length);

      const base = createRhythmAudioPlan(exercise.pattern, "metronome");
      const attempt = createTapAttemptPlan(exercise);
      expect(attempt.durationSeconds).toBe(2 * base.durationSeconds);
      expect(attempt.totalTicks).toBe(2 * base.totalTicks);
      expect(attempt.pulseEvents).toHaveLength(2 * base.pulseEvents.length);
      expect(attempt.pulseEvents[0].offsetSeconds).toBe(0);
      expect(attempt.pulseEvents.map(event => event.tick)).toEqual([
        ...base.pulseEvents.map(event => event.tick),
        ...base.pulseEvents.map(event => event.tick + base.totalTicks),
      ]);
      expect(attempt.onsetReferences).toHaveLength(2 * exercise.targets.length);
      expect(attempt.toneEvents).toHaveLength(0);
    }
  );
});

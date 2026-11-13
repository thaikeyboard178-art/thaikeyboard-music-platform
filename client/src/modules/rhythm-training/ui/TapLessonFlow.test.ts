import { describe, expect, it } from "vitest";
import { TapTrainingController } from "./TapTrainingController";
import { TapRhythmEngine } from "../audio/tapEngine";
import { dispatchFirstTapAtNextDownbeat, TapFakeClock } from "../audio/tapTestHelpers";
import type { RhythmScheduledEvent } from "../audio/transport";

describe("Phase5 approved Lessons are ungraded worked examples", () => {
  it.each([3, 4, 5, 6] as const)(
    "Level%s uses real generation/engine practice and never submits a shared answer",
    async track => {
      const clock = new TapFakeClock();
      const input = new EventTarget();
      const scheduledEvents: RhythmScheduledEvent[] = [];
      let engine: TapRhythmEngine;
      const controller = new TapTrainingController({
        seedPrefix: `lesson-${track}`,
        getInputTarget: () => input,
        transport: {
          contextFactory: () => clock.context as unknown as AudioContext,
          timers: clock.timers,
          visibilitySource: null,
          onScheduled: event => scheduledEvents.push(event),
        },
        engineFactory: options => {
          engine = new TapRhythmEngine({
            ...options,
            now: clock.now,
            timeOrigin: () => 1700000000000,
            blurSource: null,
          });
          return engine;
        },
      });
      await controller.prepare({
        track,
        section: "lessons",
        meter:
          track === 6
            ? { numerator: 6, denominator: 8 }
            : { numerator: 4, denominator: 4 },
        bars: 1,
      });
      expect(controller.getSnapshot().exercise?.section).toBe("lessons");
      await controller.start();
      dispatchFirstTapAtNextDownbeat(clock, input, controller.getSnapshot().exercise!, scheduledEvents);
      const snapshot = engine!.snapshot!;
      for (const onset of snapshot.expectedOnsets) {
        if (onset.roundNumber === 1 && onset.targetIndex === 0) continue;
        clock.at(onset.audioTime);
        engine!.handleEvent(clock.nativeTap(onset.audioTime));
      }
      clock.at(Math.max(snapshot.drainEndAudioTime, snapshot.planEndAudioTime) + 0.1);
      const state = controller.getSnapshot();
      expect(state.result?.status).toBe("completed");
      expect(state.result?.mode).toBe("practice");
      expect(state.result?.accuracyPercent).toBeCloseTo(100, 10);
      expect(state.session?.questionsAnswered).toBe(0);
      expect(state.session?.correctAnswers).toBe(0);
      expect(state.session?.incorrectAnswers).toBe(0);
      expect(state.session?.hasAnsweredCurrent).toBe(false);
      expect(state.session?.totalScore).toBe(0);
      expect(state.points).toBeNull();
      expect(state.originalPoints).toBeNull();
      expect(state.gradedResult).toBeNull();
      await controller.dispose();
    }
  );
});

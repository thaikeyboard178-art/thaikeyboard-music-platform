import { afterEach, describe, expect, it, vi } from "vitest";
import { TapTrainingController } from "./TapTrainingController";
import { TapRhythmEngine } from "../audio/tapEngine";
import { TapFakeClock } from "../audio/tapTestHelpers";
import { createTapRhythmExercise } from "../exercises/tapRhythm";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";

const configuration = { track: 3, section: "practice" } as const;
function fixture() {
  const clock = new TapFakeClock();
  let engine: TapRhythmEngine;
  const controller = new TapTrainingController({
    getInputTarget: () => new EventTarget(),
    createExercise: (_config, seed) =>
      createTapRhythmExercise({
        track: 3,
        pattern: { ...SEVEN_METER_RUNTIME_FIXTURES[0].pattern, id: seed },
        id: `exercise-${seed}`,
      }),
    transport: {
      contextFactory: () => clock.context as unknown as AudioContext,
      timers: clock.timers,
      visibilitySource: null,
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
  return { clock, controller, getEngine: () => engine };
}
function exactAndFinish(clock: TapFakeClock, engine: TapRhythmEngine) {
  const snapshot = engine.snapshot!;
  for (const onset of snapshot.expectedOnsets) {
    const round = snapshot.rounds[onset.roundNumber - 1];
    const time = round.anchorAudioTime + (onset.audioTime - round.anchorAudioTime);
    clock.at(time);
    engine.handleEvent(clock.nativeTap(time));
  }
  clock.at(Math.max(snapshot.drainEndAudioTime, snapshot.planEndAudioTime) + 0.1);
  expect(engine.state, engine.result?.reason ?? "no result").toBe("completed");
}

afterEach(() => vi.useRealTimers());
describe("Phase5 reused-engine UI observation regression", () => {
  it("observes collecting after Reference then Start, and again after a completed Retry", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { clock, controller, getEngine } = fixture();
    await controller.prepare(configuration);
    const reference = controller.reference();
    await Promise.resolve();
    await Promise.resolve();
    clock.advance(8);
    await reference;
    expect(controller.getSnapshot().phase).toBe("ready");
    expect(controller.canStart).toBe(true);
    await controller.start();
    const engine = getEngine();
    expect(controller.getSnapshot().phase).toBe("count-in");
    clock.at(engine.snapshot!.collectionStartAudioTime + 0.04);
    vi.advanceTimersByTime(50);
    expect(controller.getSnapshot().phase).toBe("collecting");
    exactAndFinish(clock, engine);
    expect(controller.getSnapshot().phase).toBe("completed");
    expect(controller.getSnapshot().originalPoints).toBe(10);
    await controller.retry();
    const retryEngine = getEngine();
    expect(retryEngine).not.toBe(engine);
    expect(retryEngine.state).toBe("idle");
    expect(controller.getSnapshot().phase).toBe("ready");
    expect(controller.getSnapshot().result).toBeNull();
    await controller.start();
    expect(retryEngine.state).toMatch(/^(count-in|collecting)$/);
    clock.at(retryEngine.snapshot!.collectionStartAudioTime + 0.04);
    vi.advanceTimersByTime(50);
    expect(controller.getSnapshot().phase).toBe("collecting");
    exactAndFinish(clock, retryEngine);
    expect(controller.getSnapshot().result?.mode).toBe("practice");
    expect(controller.getSnapshot().originalPoints).toBe(10);
    expect(controller.getSnapshot().session?.questionsAnswered).toBe(1);
    await controller.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("recovers an aborted reference through a distinct Continue without creating an answer", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { clock, controller, getEngine } = fixture();
    await controller.prepare(configuration);
    const reference = controller.reference();
    await Promise.resolve();
    await Promise.resolve();
    controller.stop();
    await reference;
    expect(controller.getSnapshot().phase).toBe("aborted");
    expect(controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(controller.canStart).toBe(true);
    const abortedExerciseId = controller.getSnapshot().exercise!.id;
    await controller.continue();
    expect(controller.getSnapshot().phase).toBe("ready");
    expect(controller.getSnapshot().exercise!.id).not.toBe(abortedExerciseId);
    expect(getEngine().state).toBe("disposed");
    expect(controller.getSnapshot().result).toBeNull();
    expect(controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(controller.getSnapshot().originalPoints).toBeNull();
    expect(controller.canStart).toBe(true);
    await controller.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

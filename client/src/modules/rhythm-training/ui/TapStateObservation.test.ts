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
    clock.at(onset.audioTime);
    engine.handleEvent(clock.nativeTap(onset.audioTime));
  }
  clock.at(snapshot.drainEndAudioTime + 0.05);
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
    clock.at(engine.snapshot!.collectionStartAudioTime + 0.04);
    vi.advanceTimersByTime(50);
    expect(controller.getSnapshot().phase).toBe("collecting");
    exactAndFinish(clock, engine);
    expect(controller.getSnapshot().result?.mode).toBe("practice");
    expect(controller.getSnapshot().originalPoints).toBe(10);
    expect(controller.getSnapshot().session?.questionsAnswered).toBe(1);
    await controller.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("recovers an aborted reference through a real practice Retry or a distinct Continue without creating an answer", async () => {
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
    await controller.retry();
    exactAndFinish(clock, getEngine());
    expect(controller.getSnapshot().result?.mode).toBe("practice");
    expect(controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(controller.getSnapshot().originalPoints).toBeNull();
    const previousId = controller.getSnapshot().exercise!.id;
    await controller.continue();
    expect(controller.getSnapshot().phase).toBe("ready");
    expect(controller.getSnapshot().exercise!.id).not.toBe(previousId);
    expect(controller.canStart).toBe(true);
    await controller.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

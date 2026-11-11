import { afterEach, describe, expect, it } from "vitest";
import { TapRhythmEngine } from "../audio/tapEngine";
import { TapFakeClock, TEST_TAP_VOICES } from "../audio/tapTestHelpers";
import { createTapRhythmExercise } from "../exercises/tapRhythm";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import type { TapEngineOptions } from "../audio/tapEngine";
import type { RhythmTrack } from "../types";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import {
  TapTrainingController,
  type TapUiConfiguration,
} from "./TapTrainingController";

const CONFIG: TapUiConfiguration = {
  track: 3,
  section: "practice",
  meter: { numerator: 4, denominator: 4 },
  bars: 1,
  pulseBpm: 100,
};
const controllers = new Set<TapTrainingController>();

afterEach(async () => {
  await Promise.all([...controllers].map(controller => controller.dispose()));
  controllers.clear();
});

type Harness = {
  controller: TapTrainingController;
  clock: TapFakeClock;
  input: EventTarget;
  engines: TapRhythmEngine[];
  engineOptions: TapEngineOptions[];
  contextFactoryCalls: () => number;
  inputTargetCalls: () => number;
};

function harness(
  overrides: {
    createExercise?: ConstructorParameters<
      typeof TapTrainingController
    >[0]["createExercise"];
    seedPrefix?: string;
    noInput?: boolean;
    failAudio?: boolean;
  } = {}
): Harness {
  const clock = new TapFakeClock();
  const input = new EventTarget();
  const engines: TapRhythmEngine[] = [];
  const engineOptions: TapEngineOptions[] = [];
  let contextFactories = 0;
  let inputTargetLookups = 0;
  const controller = new TapTrainingController({
    getInputTarget: () => {
      inputTargetLookups++;
      return overrides.noInput ? null : input;
    },
    transport: {
      voices: TEST_TAP_VOICES,
      timers: clock.timers,
      contextFactory: () => {
        contextFactories++;
        if (overrides.failAudio) throw new Error("audio unavailable in test");
        return clock.context as unknown as AudioContext;
      },
      visibilitySource: null,
    },
    seedPrefix: overrides.seedPrefix ?? "controller-test",
    ...(overrides.createExercise === undefined
      ? {}
      : { createExercise: overrides.createExercise }),
    engineFactory: options => {
      engineOptions.push(options);
      const engine = new TapRhythmEngine({
        ...options,
        now: clock.now,
        timeOrigin: () => 1700000000000,
        blurSource: null,
      });
      engines.push(engine);
      return engine;
    },
  });
  controllers.add(controller);
  return {
    controller,
    clock,
    input,
    engines,
    engineOptions,
    contextFactoryCalls: () => contextFactories,
    inputTargetCalls: () => inputTargetLookups,
  };
}

async function prepared(h: Harness): Promise<TapRhythmExercise> {
  await h.controller.prepare(CONFIG);
  expect(h.controller.getSnapshot().phase).toBe("ready");
  return h.controller.getSnapshot().exercise!;
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 10; index++) await Promise.resolve();
}

async function finishAttempt(
  h: Harness,
  firstTapOffsetMs = 0,
  startAtIndex = 0
): Promise<void> {
  const engine = h.engines.at(-1)!;
  const snapshot = engine.snapshot!;
  for (
    let index = startAtIndex;
    index < snapshot.expectedOnsets.length;
    index++
  ) {
    const onset = snapshot.expectedOnsets[index];
    const at = onset.audioTime + (index === 0 ? firstTapOffsetMs : 0) / 1000;
    h.clock.at(at);
    h.input.dispatchEvent(h.clock.nativeTap(at));
    h.controller.acknowledgeTap();
  }
  h.clock.at(snapshot.drainEndAudioTime + 0.03);
  await flushMicrotasks();
}

async function finishReference(h: Harness): Promise<void> {
  await flushMicrotasks();
  h.clock.advance(30);
  await flushMicrotasks();
}

describe("TapTrainingController with the production Phase 4B engine", () => {
  it("prepares a canonical exercise and one FREE question without creating an engine early", async () => {
    const h = harness();
    const before = h.controller.getSnapshot();
    expect(h.controller.getSnapshot()).toBe(before);
    await prepared(h);

    const state = h.controller.getSnapshot();
    expect(state.exercise?.kind).toBe("tap-rhythm");
    expect(state.session?.mode).toBe("free");
    expect(state.session?.plannedQuestions).toBe(1);
    expect(state.session?.questionsAnswered).toBe(0);
    expect(h.inputTargetCalls()).toBe(0);
    expect(h.engines).toHaveLength(0);
    expect(Object.isFrozen(state)).toBe(true);
  });

  it("forwards optional focus and creates the engine synchronously on Start's user gesture", async () => {
    const capturedConfigurations: TapUiConfiguration[] = [];
    const capturedSeeds: string[] = [];
    const generated = createTapRhythmExercise({
      track: 3,
      pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
    });
    const h = harness({
      createExercise: (configuration, seed) => {
        capturedConfigurations.push(configuration);
        capturedSeeds.push(seed);
        return generated;
      },
    });
    await h.controller.prepare({ ...CONFIG, focus: "dots" });
    expect(capturedConfigurations[0]?.focus).toBe("dots");
    expect(capturedSeeds[0]).toContain("controller-test-");

    const firstStart = h.controller.start();
    expect(h.inputTargetCalls()).toBe(1);
    expect(h.engines).toHaveLength(1);
    expect(h.contextFactoryCalls()).toBe(1);
    expect(h.controller.getSnapshot().trialNumber).toBe(1);
    const duplicateStart = h.controller.start();
    await Promise.all([firstStart, duplicateStart]);
    expect(h.engines).toHaveLength(1);
    expect(h.controller.getSnapshot().phase).toMatch(/^(count-in|collecting)$/);
  });

  it("allows one reference before Start, consumes the reference slot, and blocks overlapping controls", async () => {
    const h = harness();
    await prepared(h);
    const reference = h.controller.reference();
    expect(h.controller.getSnapshot().referenceUsed).toBe(true);
    expect(h.controller.getSnapshot().phase).toBe("reference");
    expect(h.controller.getSnapshot().busy).toBe(true);

    await h.controller.start();
    await h.controller.continue();
    expect(h.controller.getSnapshot().trialNumber).toBe(1);
    expect(h.controller.getSnapshot().exercise).not.toBeNull();
    await finishReference(h);
    await reference;
    expect(h.controller.getSnapshot().phase).toBe("ready");
    expect(h.controller.getSnapshot().busy).toBe(false);

    await h.controller.reference();
    expect(h.controller.getSnapshot().referenceUsed).toBe(true);
    expect(h.controller.getSnapshot().trialNumber).toBe(1);
    expect(h.engines).toHaveLength(1);
  });

  it("consumes the one-reference allowance even if audio startup fails", async () => {
    const h = harness({ failAudio: true });
    await prepared(h);
    await h.controller.reference();
    const state = h.controller.getSnapshot();
    expect(state.referenceUsed).toBe(true);
    expect(state.phase).toBe("aborted");
    expect(state.busy).toBe(false);
    expect(state.session?.questionsAnswered).toBe(0);
    await h.controller.reference();
    expect(h.controller.getSnapshot().referenceUsed).toBe(true);
    expect(h.engines).toHaveLength(1);
    expect(h.contextFactoryCalls()).toBe(1);
  });

  it("does not score any tap; the actual engine receipt alone enters strict shared grading", async () => {
    const h = harness();
    const exercise = await prepared(h);
    const start = h.controller.start();
    await start;
    const engine = h.engines[0];
    expect(engine.state).toBe("count-in");
    expect(engine.snapshot?.expectedOnsets).toHaveLength(
      exercise.targets.length
    );

    const first = engine.snapshot!.expectedOnsets[0];
    h.clock.at(first.audioTime);
    h.input.dispatchEvent(h.clock.nativeTap(first.audioTime));
    h.controller.acknowledgeTap();
    expect(h.controller.getSnapshot().tapVisualSequence).toBe(1);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(h.controller.getSnapshot().points).toBeNull();

    await finishAttempt(h, 0, 1);
    const state = h.controller.getSnapshot();
    expect(state.result?.status).toBe("completed");
    expect(state.result?.mode).toBe("graded");
    expect(state.result?.accuracyPercent).toBe(100);
    expect(state.gradedResult).toBe(state.result);
    expect(state.points).toBe(10);
    expect(state.originalPoints).toBe(10);
    expect(state.session?.questionsAnswered).toBe(1);
    expect(state.session?.correctAnswers).toBe(1);
    expect(state.phase).toBe("completed");
  });

  it("keeps the strict +0 gate for a near miss and does not fabricate a percentage", async () => {
    const h = harness();
    await prepared(h);
    await h.controller.start();
    await finishAttempt(h, 65);
    const state = h.controller.getSnapshot();
    expect(state.result?.status).toBe("completed");
    expect(state.result?.accuracyPercent).toBeLessThan(100);
    expect(state.points).toBe(0);
    expect(state.originalPoints).toBe(0);
    expect(state.session?.questionsAnswered).toBe(1);
    expect(state.session?.correctAnswers).toBe(0);
    expect(state.session?.incorrectAnswers).toBe(1);
  });

  it("retries the same engine in practice and preserves the original graded result and points", async () => {
    const h = harness();
    const exercise = await prepared(h);
    await h.controller.start();
    await finishAttempt(h);
    const original = h.controller.getSnapshot().gradedResult;
    expect(original?.status).toBe("completed");
    const originalSession = h.controller.getSnapshot().session;

    const retry = h.controller.retry();
    expect(h.controller.getSnapshot().trialNumber).toBe(2);
    expect(h.controller.getSnapshot().practice).toBe(true);
    expect(h.controller.getSnapshot().result).toBeNull();
    expect(h.controller.getSnapshot().gradedResult).toBe(original);
    expect(h.controller.getSnapshot().originalPoints).toBe(10);
    await retry;
    expect(h.engines).toHaveLength(1);
    expect(h.controller.getSnapshot().exercise).toBe(exercise);
    await finishAttempt(h);

    const finalState = h.controller.getSnapshot();
    expect(finalState.result?.mode).toBe("practice");
    expect(finalState.result?.status).toBe("completed");
    expect(finalState.points).toBe(0);
    expect(finalState.originalPoints).toBe(10);
    expect(finalState.gradedResult).toBe(original);
    expect(finalState.session).toBe(originalSession);
    expect(finalState.session?.questionsAnswered).toBe(1);
  });

  it("Continue disposes the prior engine and creates a different exercise with a fresh shared session", async () => {
    let count = 0;
    const h = harness({
      createExercise: (configuration, seed) => {
        count++;
        const base = createTapRhythmExercise({
          track: configuration.track as RhythmTrack,
          section: configuration.section,
          pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
          id: `${seed}-${count}`,
        });
        return base;
      },
    });
    await prepared(h);
    await h.controller.start();
    await h.controller.continue();
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(h.controller.getSnapshot().phase).toBe("count-in");
    expect(count).toBe(1);

    // An active attempt cannot be skipped. Complete the real engine first.
    await finishAttempt(h);
    const oldExerciseId = h.controller.getSnapshot().exercise?.id;
    const oldSessionId = h.controller.getSnapshot().session?.sessionId;
    await h.controller.continue();
    const state = h.controller.getSnapshot();
    expect(state.phase).toBe("ready");
    expect(state.exercise?.id).not.toBe(oldExerciseId);
    expect(state.session?.sessionId).not.toBe(oldSessionId);
    expect(state.session?.plannedQuestions).toBe(1);
    expect(state.session?.questionsAnswered).toBe(0);
    expect(state.gradedResult).toBeNull();
    expect(state.originalPoints).toBeNull();
    expect(h.engines[0].state).toBe("disposed");
    expect(h.engines).toHaveLength(1);
    expect(count).toBe(2);
  });

  it("rejects a defensive empty result without constructing audio or submitting an answer", async () => {
    const h = harness({
      createExercise: configuration => {
        const canonical = createTapRhythmExercise({
          track: configuration.track,
          section: configuration.section,
          pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
        });
        return Object.freeze({ ...canonical, targets: Object.freeze([]) });
      },
    });
    await h.controller.prepare(CONFIG);
    expect(h.controller.getSnapshot().phase).toBe("empty");
    expect(h.controller.getSnapshot().exercise?.targets).toHaveLength(0);
    await h.controller.start();
    await h.controller.reference();
    expect(h.engines).toHaveLength(0);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(h.controller.getSnapshot().result).toBeNull();
    expect(h.controller.getSnapshot().points).toBeNull();
  });

  it("Continue from a defensive empty result creates a fresh playable exercise and session", async () => {
    let count = 0;
    const canonical = createTapRhythmExercise({
      track: 3,
      pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
    });
    const h = harness({
      createExercise: () => {
        count++;
        return count === 1
          ? Object.freeze({ ...canonical, targets: Object.freeze([]) })
          : Object.freeze({
              ...canonical,
              id: "controller-playable-after-empty",
            });
      },
    });
    await h.controller.prepare(CONFIG);
    const emptySessionId = h.controller.getSnapshot().session?.sessionId;
    expect(h.controller.getSnapshot().phase).toBe("empty");
    await h.controller.continue();

    const state = h.controller.getSnapshot();
    expect(state.phase).toBe("ready");
    expect(state.exercise?.targets.length).toBeGreaterThan(0);
    expect(state.exercise?.id).toBe("controller-playable-after-empty");
    expect(state.session?.sessionId).not.toBe(emptySessionId);
    expect(state.session?.questionsAnswered).toBe(0);
    expect(state.trialNumber).toBe(1);
    expect(h.engines).toHaveLength(0);
  });

  it("checks the lazy tap target and leaves Start available if the surface is not mounted yet", async () => {
    const h = harness({ noInput: true });
    await prepared(h);
    await h.controller.start();
    const state = h.controller.getSnapshot();
    expect(state.phase).toBe("error");
    expect(state.error).toContain("vùng chạm");
    expect(state.trialNumber).toBe(1);
    expect(state.session?.questionsAnswered).toBe(0);
    expect(h.engines).toHaveLength(0);
    expect(h.contextFactoryCalls()).toBe(0);
  });

  it("technical abort remains ungraded and disposal invalidates late abort receipts", async () => {
    const h = harness();
    await prepared(h);
    await h.controller.start();
    h.controller.stop();
    let state = h.controller.getSnapshot();
    expect(state.phase).toBe("aborted");
    expect(state.result?.status).toBe("technical-abort");
    expect(state.result?.accuracyPercent).toBeNull();
    expect(state.points).toBeNull();
    expect(state.session?.questionsAnswered).toBe(0);
    expect(state.session?.incorrectAnswers).toBe(0);
    const unansweredSessionId = state.session?.sessionId;
    await h.controller.continue();
    state = h.controller.getSnapshot();
    expect(state.phase).toBe("ready");
    expect(state.session?.sessionId).not.toBe(unansweredSessionId);
    expect(state.session?.questionsAnswered).toBe(0);

    const another = harness();
    await prepared(another);
    await another.controller.start();
    await another.controller.dispose();
    state = another.controller.getSnapshot();
    expect(state.phase).toBe("disposed");
    expect(state.result).toBeNull();
    expect(state.gradedResult).toBeNull();
    expect(state.session?.questionsAnswered).toBe(0);
  });

  it("ignores duplicate and premature actions while preparing or an attempt is active", async () => {
    const generated = createTapRhythmExercise({
      track: 3,
      pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
    });
    let releasePreparation: ((exercise: TapRhythmExercise) => void) | undefined;
    const h = harness({
      createExercise: () =>
        new Promise(resolve => {
          releasePreparation = resolve;
        }),
    });
    const preparing = h.controller.prepare(CONFIG);
    expect(h.controller.getSnapshot().phase).toBe("preparing");
    await h.controller.prepare(CONFIG);
    expect(h.controller.getSnapshot().phase).toBe("preparing");
    releasePreparation!(generated);
    await preparing;
    expect(h.controller.getSnapshot().phase).toBe("ready");

    const firstStart = h.controller.start();
    const secondStart = h.controller.start();
    await Promise.all([firstStart, secondStart]);
    await h.controller.continue();
    expect(h.engines).toHaveLength(1);
    expect(h.controller.getSnapshot().trialNumber).toBe(1);
    expect(h.controller.getSnapshot().phase).toMatch(/^(count-in|collecting)$/);
  });
});

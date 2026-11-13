import { afterEach, describe, expect, it } from "vitest";
import { TapRhythmEngine } from "../audio/tapEngine";
import { createTapAttemptPlan } from "../audio/tapPlan";
import {
  dispatchFirstTapAtNextDownbeat,
  TapFakeClock,
  TEST_TAP_VOICES,
} from "../audio/tapTestHelpers";
import { createTapRhythmExercise } from "../exercises/tapRhythm";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import type { TapEngineOptions } from "../audio/tapEngine";
import type { RhythmScheduledEvent } from "../audio/transport";
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
  scheduledEvents: RhythmScheduledEvent[];
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
  const scheduledEvents: RhythmScheduledEvent[] = [];
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
      onScheduled: event => scheduledEvents.push(event),
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
    scheduledEvents,
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

function ensureFirstTap(h: Harness, offsetMs = 0): void {
  const engine = h.engines.at(-1)!;
  if (engine.snapshot) return;
  dispatchFirstTapAtNextDownbeat(
    h.clock,
    h.input,
    h.controller.getSnapshot().exercise!,
    h.scheduledEvents,
    offsetMs
  );
  h.controller.acknowledgeTap();
}

async function finishAttempt(
  h: Harness,
  firstTapOffsetMs = 0,
  startAtIndex = 0,
  skippedRounds: readonly (1 | 2)[] = []
): Promise<void> {
  const engine = h.engines.at(-1)!;
  ensureFirstTap(h, firstTapOffsetMs);
  const snapshot = engine.snapshot!;
  for (
    let index = startAtIndex;
    index < snapshot.expectedOnsets.length;
    index++
  ) {
    const onset = snapshot.expectedOnsets[index];
    if (onset.roundNumber === 1 && onset.targetIndex === 0) continue;
    if (skippedRounds.includes(onset.roundNumber)) continue;
    const at = onset.audioTime;
    h.clock.at(at);
    h.input.dispatchEvent(h.clock.nativeTap(at));
    h.controller.acknowledgeTap();
  }
  h.clock.at(
    Math.max(snapshot.drainEndAudioTime, snapshot.planEndAudioTime) + 0.06
  );
  await flushMicrotasks();
}

async function tapRound(h: Harness, roundNumber: 1 | 2): Promise<void> {
  ensureFirstTap(h);
  const engine = h.engines.at(-1)!;
  const round = engine.snapshot!.rounds[roundNumber - 1];
  for (const onset of round.expectedOnsets) {
    if (roundNumber === 1 && onset.targetIndex === 0) continue;
    h.clock.at(onset.audioTime);
    h.input.dispatchEvent(h.clock.nativeTap(onset.audioTime));
  }
}

async function enterRound(h: Harness, roundNumber: 1 | 2): Promise<void> {
  ensureFirstTap(h);
  const round = h.engines.at(-1)!.snapshot!.rounds[roundNumber - 1];
  h.clock.at(round.startAudioTime + 0.01);
  await flushMicrotasks();
  expect(h.engines.at(-1)!.currentRound).toBe(roundNumber);
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
    expect(state.session?.plannedQuestions).toBeNull();
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
    expect(h.controller.getSnapshot().phase).toMatch(/^(listening|aligning|collecting)$/);
  });

  it("allows one reference before Start, consumes the reference slot, and blocks overlapping controls", async () => {
    const h = harness();
    await prepared(h);
    const reference = h.controller.reference();
    expect(h.controller.getSnapshot().referenceUsed).toBe(true);
    expect(h.controller.getSnapshot().phase).toBe("reference");
    expect(h.controller.getSnapshot().busy).toBe(true);
    expect(h.controller.canSkipCurrentExercise).toBe(false);

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
    expect(engine.state).toBe("listening");
    expect(engine.snapshot).toBeNull();
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);

    dispatchFirstTapAtNextDownbeat(
      h.clock,
      h.input,
      exercise,
      h.scheduledEvents
    );
    h.controller.acknowledgeTap();
    expect(engine.snapshot?.expectedOnsets).toHaveLength(
      exercise.targets.length * 2
    );
    expect(h.controller.getSnapshot().tapVisualSequence).toBe(1);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(h.controller.getSnapshot().points).toBeNull();

    await finishAttempt(h, 0, 1);
    const state = h.controller.getSnapshot();
    expect(state.result?.status).toBe("completed");
    expect(state.result?.mode).toBe("graded");
    expect(state.result?.accuracyPercent).toBeCloseTo(100, 10);
    expect(state.gradedResult).toBe(state.result);
    expect(state.points).toBe(10);
    expect(state.originalPoints).toBe(10);
    expect(state.session?.questionsAnswered).toBe(1);
    expect(state.session?.correctAnswers).toBe(
      state.result?.accuracyPercent === 100 ? 1 : 0
    );
    expect(state.session?.incorrectAnswers).toBe(
      state.result?.accuracyPercent === 100 ? 0 : 1
    );
    expect(state.phase).toBe("completed");
  });

  it("keeps strict correctness for a near miss while awarding weighted timing points", async () => {
    const h = harness();
    await prepared(h);
    await h.controller.start();
    await finishAttempt(h, 65);
    const state = h.controller.getSnapshot();
    expect(state.result?.status).toBe("completed");
    expect(state.result?.accuracyPercent).toBeLessThan(100);
    expect(state.result?.scoreOutOfTen).toBeGreaterThanOrEqual(0);
    expect(state.result?.scoreOutOfTen).toBeLessThanOrEqual(10);
    expect(state.points).toBe(state.result?.scoreOutOfTen);
    expect(state.originalPoints).toBe(state.result?.scoreOutOfTen);
    expect(state.session?.questionsAnswered).toBe(1);
    expect(state.session?.correctAnswers).toBe(0);
    expect(state.session?.incorrectAnswers).toBe(1);
    expect(state.session?.totalScore).toBe(state.result?.scoreOutOfTen);
  });

  it("retries with a new idle engine in practice and preserves the original graded result and points", async () => {
    const h = harness();
    const exercise = await prepared(h);
    await h.controller.start();
    await finishAttempt(h);
    const original = h.controller.getSnapshot().gradedResult;
    expect(original?.status).toBe("completed");
    const originalSession = h.controller.getSnapshot().session;

    const originalEngine = h.engines[0];
    await h.controller.retry();
    const retryEngine = h.engines.at(-1)!;
    expect(retryEngine).not.toBe(originalEngine);
    expect(originalEngine.state).toBe("disposed");
    expect(retryEngine.state).toBe("idle");
    expect(retryEngine.hasPendingWakeup).toBe(false);
    expect(h.controller.getSnapshot().phase).toBe("ready");
    expect(h.controller.getSnapshot().trialNumber).toBe(1);
    expect(h.controller.getSnapshot().practice).toBe(false);
    expect(h.controller.getSnapshot().result).toBeNull();
    expect(h.controller.getSnapshot().gradedResult).toBe(original);
    expect(h.controller.getSnapshot().originalPoints).toBe(10);
    expect(h.engines).toHaveLength(2);
    await h.controller.start();
    expect(retryEngine.state).toMatch(/^(listening|aligning|collecting)$/);
    expect(h.controller.getSnapshot().trialNumber).toBe(2);
    expect(h.controller.getSnapshot().exercise).toBe(exercise);
    await finishAttempt(h);

    const finalState = h.controller.getSnapshot();
    expect(finalState.result?.mode).toBe("practice");
    expect(finalState.result?.status).toBe("completed");
    expect(finalState.points).toBeNull();
    expect(finalState.originalPoints).toBe(10);
    expect(finalState.gradedResult).toBe(original);
    expect(finalState.session).toBe(originalSession);
    expect(finalState.session?.questionsAnswered).toBe(1);
    expect(finalState.session?.totalScore).toBe(10);
  });

  it("Continue disposes the prior engine and advances within the same shared session", async () => {
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
    expect(h.controller.getSnapshot().phase).toBe("listening");
    expect(count).toBe(1);

    // An active attempt cannot be skipped. Complete the real engine first.
    await finishAttempt(h);
    const oldExerciseId = h.controller.getSnapshot().exercise?.id;
    const oldSessionId = h.controller.getSnapshot().session?.sessionId;
    await h.controller.continue();
    const state = h.controller.getSnapshot();
    expect(state.phase).toBe("ready");
    expect(state.exercise?.id).not.toBe(oldExerciseId);
    expect(state.session?.sessionId).toBe(oldSessionId);
    expect(state.session?.plannedQuestions).toBeNull();
    expect(state.session?.questionsAnswered).toBe(1);
    expect(state.session?.correctAnswers).toBe(1);
    expect(state.session?.totalScore).toBe(10);
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
    expect(h.controller.canSkipCurrentExercise).toBe(false);
    await h.controller.start();
    await h.controller.reference();
    expect(h.engines).toHaveLength(0);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(h.controller.getSnapshot().result).toBeNull();
    expect(h.controller.getSnapshot().points).toBeNull();
  });

  it("Continue from a defensive empty result creates a playable exercise in the same session", async () => {
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
    expect(state.session?.sessionId).toBe(emptySessionId);
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
    expect(state.session?.sessionId).toBe(unansweredSessionId);
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
    expect(h.controller.canSkipCurrentExercise).toBe(false);
    await h.controller.prepare(CONFIG);
    expect(h.controller.getSnapshot().phase).toBe("preparing");
    expect(h.controller.canSkipCurrentExercise).toBe(false);
    releasePreparation!(generated);
    await preparing;
    expect(h.controller.getSnapshot().phase).toBe("ready");

    const firstStart = h.controller.start();
    const secondStart = h.controller.start();
    await Promise.all([firstStart, secondStart]);
    await h.controller.continue();
    expect(h.engines).toHaveLength(1);
    expect(h.controller.getSnapshot().trialNumber).toBe(1);
    expect(h.controller.getSnapshot().phase).toMatch(/^(listening|aligning|collecting)$/);
  });
});

describe("approved Tap controller session lifecycle", () => {
  it("accumulates two graded answers in one run, ignores stale receipts, and resets only on fresh prepare", async () => {
    let generated = 0;
    const h = harness({
      createExercise: (configuration, seed) =>
        createTapRhythmExercise({
          track: configuration.track as RhythmTrack,
          section: configuration.section,
          pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
          id: `${seed}-question-${++generated}`,
        }),
    });
    await prepared(h);
    const sessionId = h.controller.getSnapshot().session?.sessionId;

    await h.controller.start();
    await finishAttempt(h);
    const firstState = h.controller.getSnapshot();
    expect(firstState.session?.sessionId).toBe(sessionId);
    expect(firstState.session?.questionsAnswered).toBe(1);
    expect(firstState.session?.correctAnswers).toBe(1);
    expect(firstState.session?.totalScore).toBe(10);
    const oldReceipt = firstState.result!;
    const oldCallback = h.engineOptions[0].onResult!;

    await h.controller.continue();
    const secondExerciseId = h.controller.getSnapshot().exercise?.id;
    expect(secondExerciseId).not.toBe(oldReceipt.exerciseId);
    expect(h.controller.getSnapshot().session?.sessionId).toBe(sessionId);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(1);
    expect(h.controller.getSnapshot().session?.totalScore).toBe(10);

    oldCallback(oldReceipt);
    expect(h.controller.getSnapshot().result).toBeNull();
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(1);
    expect(h.controller.getSnapshot().session?.totalScore).toBe(10);

    await h.controller.start();
    await finishAttempt(h);
    const secondState = h.controller.getSnapshot();
    expect(secondState.session?.sessionId).toBe(sessionId);
    expect(secondState.session?.questionsAnswered).toBe(2);
    expect(secondState.session?.correctAnswers).toBe(2);
    expect(secondState.session?.incorrectAnswers).toBe(0);
    expect(secondState.session?.totalScore).toBe(20);
    expect(secondState.points).toBe(10);

    await h.controller.prepare(CONFIG);
    const freshState = h.controller.getSnapshot();
    expect(freshState.session?.sessionId).not.toBe(sessionId);
    expect(freshState.session?.mode).toBe("free");
    expect(freshState.session?.plannedQuestions).toBeNull();
    expect(freshState.session?.questionsAnswered).toBe(0);
    expect(freshState.session?.totalScore).toBe(0);
    expect(freshState.selectedMode).toBe("graded");
    expect(freshState.lastSkipPenalty).toBeNull();
  });

  it("retimes the same immutable written pattern at inclusive 30/300 BPM and rejects invalid values", async () => {
    const captured: TapUiConfiguration[] = [];
    const h = harness({
      createExercise: (configuration, seed) => {
        captured.push(configuration);
        return createTapRhythmExercise({
          track: configuration.track as RhythmTrack,
          section: configuration.section,
          pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
          id: seed,
        });
      },
    });
    const original = await prepared(h);
    const originalSessionId = h.controller.getSnapshot().session?.sessionId;
    expect(h.controller.canAdjustPracticeBpm).toBe(true);

    expect(await h.controller.setPracticeBpm(30)).toBe(true);
    const atThirty = h.controller.getSnapshot();
    expect(atThirty.exercise?.pattern.tempo.pulseBpm).toBe(30);
    expect(atThirty.configuration?.pulseBpm).toBe(30);
    expect(atThirty.exercise?.pattern.measures).toEqual(
      original.pattern.measures
    );
    expect(atThirty.exercise?.targets.map(target => target.tick)).toEqual(
      original.targets.map(target => target.tick)
    );
    expect(atThirty.exercise?.targets.at(-1)?.offsetMs).not.toBe(
      original.targets.at(-1)?.offsetMs
    );
    expect(Object.isFrozen(atThirty.exercise?.pattern)).toBe(true);
    expect(Object.isFrozen(atThirty.exercise?.pattern.measures[0])).toBe(true);
    expect(h.controller.getSnapshot().session?.sessionId).toBe(
      originalSessionId
    );
    expect(h.controller.getSnapshot().session?.totalScore).toBe(0);

    expect(await h.controller.setPracticeBpm(300)).toBe(true);
    const atThreeHundred = h.controller.getSnapshot();
    expect(atThreeHundred.exercise?.pattern.tempo.pulseBpm).toBe(300);
    expect(atThreeHundred.configuration?.pulseBpm).toBe(300);
    expect(atThreeHundred.exercise?.pattern.measures).toEqual(
      original.pattern.measures
    );
    expect(atThreeHundred.exercise?.targets.at(-1)?.offsetMs).not.toBe(
      atThirty.exercise?.targets.at(-1)?.offsetMs
    );
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);

    const unchangedExercise = h.controller.getSnapshot().exercise;
    for (const invalid of [29, 301, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(await h.controller.setPracticeBpm(invalid)).toBe(false);
      expect(h.controller.getSnapshot().exercise).toBe(unchangedExercise);
    }

    const previewPromise = h.controller.previewMetronome(CONFIG);
    await flushMicrotasks();
    expect(captured.at(-1)?.pulseBpm).toBe(300);
    h.controller.stopPreview();
    await previewPromise;
  });

  it("preserves a consumed graded reference allowance when idle BPM retimes the same written exercise", async () => {
    const h = harness();
    const original = await prepared(h);
    expect(h.controller.chooseMode("graded")).toBe(true);
    const reference = h.controller.reference();
    await finishReference(h);
    await reference;
    expect(h.controller.getSnapshot().phase).toBe("ready");
    expect(h.controller.getSnapshot().referenceUsed).toBe(true);
    expect(await h.controller.setPracticeBpm(120)).toBe(true);
    expect(h.controller.getSnapshot().exercise?.pattern.measures).toEqual(
      original.pattern.measures
    );
    expect(h.controller.getSnapshot().referenceUsed).toBe(true);
    expect(h.controller.canReference).toBe(false);
    const engines = h.engines.length;
    await h.controller.reference();
    expect(h.engines).toHaveLength(engines);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(0);
    expect(h.controller.getSnapshot().session?.totalScore).toBe(0);
  });

  it("locks tempo after Play but permits idle practice-only replay BPM edits without autoplay or another award", async () => {
    const h = harness();
    await prepared(h);
    expect(h.controller.canAdjustPracticeBpm).toBe(true);
    await h.controller.start();
    expect(h.controller.canAdjustPracticeBpm).toBe(false);
    expect(h.controller.chooseMode("practice")).toBe(false);
    expect(await h.controller.setPracticeBpm(120)).toBe(false);

    ensureFirstTap(h);
    const engine = h.engines.at(-1)!;
    const timing = engine.snapshot!;
    h.clock.at(timing.collectionStartAudioTime + 0.01);
    expect(engine.state).toBe("collecting");
    expect(h.controller.canAdjustPracticeBpm).toBe(false);
    h.clock.at(timing.collectionEndAudioTime + 0.01);
    h.clock.advance(0.05);
    expect(engine.state).toBe("draining");
    expect(h.controller.canAdjustPracticeBpm).toBe(false);
    h.clock.at(
      Math.max(timing.drainEndAudioTime, timing.planEndAudioTime) + 0.03
    );
    h.clock.advance(0.05);
    await flushMicrotasks();
    expect(h.controller.getSnapshot().result?.status).toBe("completed");

    await h.controller.retry();
    const replayEngine = h.engines.at(-1)!;
    const replayState = h.controller.getSnapshot();
    expect(replayState.phase).toBe("ready");
    expect(replayState.selectedMode).toBe("graded");
    expect(replayState.replayOnly).toBe(true);
    expect(replayState.practice).toBe(false);
    expect(replayState.gradedResult?.status).toBe("completed");
    expect(replayEngine.state).toBe("idle");
    expect(replayEngine.snapshot).toBeNull();
    expect(replayEngine.hasPendingWakeup).toBe(false);
    expect(h.controller.canAdjustPracticeBpm).toBe(true);
    expect(h.controller.chooseMode("practice")).toBe(false);
    expect(h.controller.canSkipCurrentExercise).toBe(false);

    const replaySession = replayState.session;
    const priorReplayScore = replayState.session?.totalScore;
    const replayExercise = replayState.exercise!;
    expect(await h.controller.setPracticeBpm(120)).toBe(true);
    const retimedReplay = h.controller.getSnapshot();
    expect(retimedReplay.exercise?.id).toBe(replayExercise.id);
    expect(retimedReplay.exercise?.pattern.tempo.pulseBpm).toBe(120);
    expect(retimedReplay.exercise?.pattern.measures).toEqual(
      replayExercise.pattern.measures
    );
    expect(retimedReplay.exercise?.targets.map(target => target.tick)).toEqual(
      replayExercise.targets.map(target => target.tick)
    );
    expect(createTapAttemptPlan(retimedReplay.exercise!).durationSeconds).not.toBe(
      createTapAttemptPlan(replayExercise).durationSeconds
    );
    expect(retimedReplay.session).toBe(replaySession);
    expect(retimedReplay.session?.questionsAnswered).toBe(1);
    expect(retimedReplay.session?.totalScore).toBe(priorReplayScore);
    expect(retimedReplay.gradedResult?.status).toBe("completed");
    expect(retimedReplay.replayOnly).toBe(true);
    expect(retimedReplay.phase).toBe("ready");
    expect(retimedReplay.points).toBeNull();
    expect(h.controller.canAdjustPracticeBpm).toBe(true);

    await h.controller.start();
    const replayPlaying = h.controller.getSnapshot();
    expect(replayPlaying.practice).toBe(true);
    expect(replayPlaying.selectedMode).toBe("graded");
    expect(replayPlaying.session).toBe(replaySession);
    expect(replayPlaying.session?.questionsAnswered).toBe(1);
    expect(replayPlaying.session?.totalScore).toBe(priorReplayScore);
    expect(h.controller.canAdjustPracticeBpm).toBe(false);
  });

  it.each([1, 2] as const)(
    "skipping round %i excludes only that round, without penalty or exercise transition",
    async skippedRound => {
      const h = harness();
      await prepared(h);
      const exercise = h.controller.getSnapshot().exercise;
      const sessionId = h.controller.getSnapshot().session?.sessionId;
      await h.controller.start();
      ensureFirstTap(h);
      const snapshot = h.engines.at(-1)!.snapshot!;
      const firstGridCount = snapshot.rounds[0].expectedOnsets.length;

      if (skippedRound === 2) await tapRound(h, 1);
      await enterRound(h, skippedRound);
      expect(h.controller.canSkipCurrentRound).toBe(true);
      expect(h.controller.skipCurrentRound()).toBe(true);
      expect(h.controller.skipCurrentRound()).toBe(false);

      const afterSkip = h.controller.getSnapshot();
      expect(afterSkip.currentRound).toBe(skippedRound);
      expect(afterSkip.skippedRounds).toEqual([skippedRound]);
      expect(afterSkip.exercise).toBe(exercise);
      expect(afterSkip.session?.sessionId).toBe(sessionId);
      expect(afterSkip.session?.questionsAnswered).toBe(0);
      expect(afterSkip.session?.totalScore).toBe(0);
      expect(afterSkip.lastSkipPenalty).toBeNull();
      expect(afterSkip.result).toBeNull();
      expect(afterSkip.points).toBeNull();

      await finishAttempt(
        h,
        0,
        skippedRound === 2 ? firstGridCount : 0,
        [skippedRound]
      );
      const completed = h.controller.getSnapshot();
      expect(completed.exercise).toBe(exercise);
      expect(completed.result?.rounds?.map(round => round.status)).toEqual(
        skippedRound === 1 ? ["skipped", "played"] : ["played", "skipped"]
      );
      expect(completed.skippedRounds).toEqual([skippedRound]);
      expect(completed.result?.accuracyPercent).toBeCloseTo(100, 10);
      expect(completed.points).toBe(10);
      expect(completed.session?.sessionId).toBe(sessionId);
      expect(completed.session?.questionsAnswered).toBe(1);
      expect(completed.session?.correctAnswers).toBe(
        completed.result?.accuracyPercent === 100 ? 1 : 0
      );
      expect(completed.session?.incorrectAnswers).toBe(
        completed.result?.accuracyPercent === 100 ? 0 : 1
      );
      expect(completed.session?.totalScore).toBe(10);
      expect(completed.lastSkipPenalty).toBeNull();
    }
  );

  it("skipping both Tap rounds completes without a score, answer, penalty, or exercise transition", async () => {
    const h = harness();
    await prepared(h);
    const exercise = h.controller.getSnapshot().exercise;
    const session = h.controller.getSnapshot().session;
    await h.controller.start();

    await enterRound(h, 1);
    expect(h.controller.skipCurrentRound()).toBe(true);
    await enterRound(h, 2);
    expect(h.controller.skipCurrentRound()).toBe(true);
    await finishAttempt(h, 0, 0, [1, 2]);

    const state = h.controller.getSnapshot();
    expect(state.exercise).toBe(exercise);
    expect(state.result?.status).toBe("completed");
    expect(state.result?.accuracyPercent).toBeNull();
    expect(state.result?.scoreOutOfTen).toBeNull();
    expect(state.result?.rounds?.map(round => round.status)).toEqual([
      "skipped",
      "skipped",
    ]);
    expect(state.skippedRounds).toEqual([1, 2]);
    expect(state.points).toBeNull();
    expect(state.gradedResult).toBeNull();
    expect(state.originalPoints).toBeNull();
    expect(state.session).toBe(session);
    expect(state.session?.questionsAnswered).toBe(0);
    expect(state.session?.correctAnswers).toBe(0);
    expect(state.session?.incorrectAnswers).toBe(0);
    expect(state.session?.totalScore).toBe(0);
    expect(state.lastSkipPenalty).toBeNull();
  });

  it("applies a graded skip once during collection after caller confirmation and never fakes an answer", async () => {
    let generated = 0;
    let disposedBeforeSkipGeneration = false;
    let h!: Harness;
    h = harness({
      createExercise: (configuration, seed) => {
        generated++;
        if (generated === 3)
          disposedBeforeSkipGeneration = h.engines.at(-1)?.state === "disposed";
        return createTapRhythmExercise({
          track: configuration.track as RhythmTrack,
          section: configuration.section,
          pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
          id: `${seed}-skip-${generated}`,
        });
      },
    });
    await prepared(h);
    await h.controller.start();
    await finishAttempt(h);
    expect(h.controller.getSnapshot().session?.totalScore).toBe(10);
    const previousReceipt = h.controller.getSnapshot().result!;
    await h.controller.continue();
    const beforeSkip = h.controller.getSnapshot();
    const beforeQuestions = beforeSkip.session?.questionsAnswered;

    await h.controller.start();
    ensureFirstTap(h);
    const engine = h.engines.at(-1)!;
    const staleCallback = h.engineOptions.at(-1)!.onResult!;
    h.clock.at(engine.snapshot!.collectionStartAudioTime + 0.01);
    expect(engine.state).toBe("collecting");
    expect(h.controller.canSkipCurrentExercise).toBe(true);

    const firstSkip = h.controller.skipCurrentExercise();
    const duplicateSkip = h.controller.skipCurrentExercise();
    expect(await duplicateSkip).toBe(false);
    expect(await firstSkip).toBe(true);
    const skipped = h.controller.getSnapshot();
    expect(disposedBeforeSkipGeneration).toBe(true);
    expect(engine.state).toBe("disposed");
    expect(skipped.exercise?.id).not.toBe(beforeSkip.exercise?.id);
    expect(skipped.session?.sessionId).toBe(beforeSkip.session?.sessionId);
    expect(skipped.session?.questionsAnswered).toBe(beforeQuestions);
    expect(skipped.session?.correctAnswers).toBe(1);
    expect(skipped.session?.incorrectAnswers).toBe(0);
    expect(skipped.session?.totalScore).toBe(5);
    expect(skipped.lastSkipPenalty).toBe(-5);
    expect(skipped.points).toBeNull();
    expect(skipped.result).toBeNull();
    expect(skipped.session?.hasAnsweredCurrent).toBe(false);
    expect(skipped.gradedResult).toBeNull();
    staleCallback(previousReceipt);
    expect(h.controller.getSnapshot().result).toBeNull();
    expect(h.controller.getSnapshot().session?.totalScore).toBe(5);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(1);
  });

  it("applies a cumulative graded Skip penalty from 20 to 15 without adding an answer", async () => {
    let generated = 0;
    const h = harness({
      createExercise: (configuration, seed) =>
        createTapRhythmExercise({
          track: configuration.track as RhythmTrack,
          section: configuration.section,
          pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
          id: `${seed}-cumulative-${++generated}`,
        }),
    });
    await prepared(h);

    await h.controller.start();
    await finishAttempt(h);
    await h.controller.continue();
    await h.controller.start();
    await finishAttempt(h);
    expect(h.controller.getSnapshot().session?.totalScore).toBe(20);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(2);
    await h.controller.continue();

    expect(await h.controller.skipCurrentExercise()).toBe(true);
    const state = h.controller.getSnapshot();
    expect(state.session?.totalScore).toBe(15);
    expect(state.lastSkipPenalty).toBe(-5);
    expect(state.session?.questionsAnswered).toBe(2);
    expect(state.session?.correctAnswers).toBe(2);
    expect(state.session?.incorrectAnswers).toBe(0);
    expect(state.session?.hasAnsweredCurrent).toBe(false);
    expect(state.result).toBeNull();
    expect(state.points).toBeNull();
  });

  it("floors a graded Skip at zero without recording an answer", async () => {
    const h = harness();
    await prepared(h);
    expect(h.controller.getSnapshot().session?.totalScore).toBe(0);
    expect(await h.controller.skipCurrentExercise()).toBe(true);
    const state = h.controller.getSnapshot();
    expect(state.session?.totalScore).toBe(0);
    expect(state.lastSkipPenalty).toBe(0);
    expect(state.session?.questionsAnswered).toBe(0);
    expect(state.session?.correctAnswers).toBe(0);
    expect(state.session?.incorrectAnswers).toBe(0);
    expect(state.session?.hasAnsweredCurrent).toBe(false);
    expect(state.result).toBeNull();
    expect(state.points).toBeNull();
  });

  it("allows a Practice skip with no answer, no penalty, and no duplicate advance", async () => {
    const h = harness();
    await prepared(h);
    expect(h.controller.chooseMode("practice")).toBe(true);
    const originalId = h.controller.getSnapshot().exercise?.id;
    expect(h.controller.canSkipCurrentExercise).toBe(true);

    const first = h.controller.skipCurrentExercise();
    const duplicate = h.controller.skipCurrentExercise();
    expect(await duplicate).toBe(false);
    expect(await first).toBe(true);
    const state = h.controller.getSnapshot();
    expect(state.exercise?.id).not.toBe(originalId);
    expect(state.session?.questionsAnswered).toBe(0);
    expect(state.session?.correctAnswers).toBe(0);
    expect(state.session?.incorrectAnswers).toBe(0);
    expect(state.session?.totalScore).toBe(0);
    expect(state.lastSkipPenalty).toBe(0);
    expect(state.result).toBeNull();
    expect(state.points).toBeNull();
    expect(state.session?.hasAnsweredCurrent).toBe(false);
    expect(h.engines).toHaveLength(0);
  });

  it("keeps metronome volume isolated from the canonical exercise and tap reference", async () => {
    const h = harness();
    const exercise = await prepared(h);
    const targets = exercise.targets;
    h.controller.setMetronomeVolume(0.27);
    expect(h.controller.getMetronomeVolume()).toBe(0.27);
    expect(h.controller.getSnapshot().exercise).toBe(exercise);
    expect(h.controller.getSnapshot().exercise?.targets).toBe(targets);
    expect(h.engines).toHaveLength(0);
  });
});

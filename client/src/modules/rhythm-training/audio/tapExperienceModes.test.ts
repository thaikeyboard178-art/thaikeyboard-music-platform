import { describe, expect, it } from "vitest";
import { TapRhythmEngine } from "./tapEngine";
import { createTapReferencePlan } from "./tapPlan";
import { TapFakeClock, TEST_TAP_VOICES } from "./tapTestHelpers";
import {
  createTapRhythmExercise,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
import { isRuntimeTapAttempt } from "../exercises/tapCompletion";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";

function setup() {
  const exercise = createTapRhythmExercise({
    track: 3,
    pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
  });
  const clock = new TapFakeClock();
  const input = new EventTarget();
  const results: NonNullable<
    ConstructorParameters<typeof TapRhythmEngine>[0]["onResult"]
  > extends (result: infer T) => void
    ? T[]
    : never = [];
  const engine = new TapRhythmEngine({
    exercise,
    inputTarget: input,
    blurSource: null,
    now: clock.now,
    timeOrigin: () => 1700000000000,
    onResult: result => results.push(result),
    transport: {
      voices: TEST_TAP_VOICES,
      timers: clock.timers,
      contextFactory: () => clock.context as unknown as AudioContext,
      visibilitySource: null,
    },
  });
  return { exercise, clock, input, engine, results };
}

function tapAll(
  exercise: TapRhythmExercise,
  clock: TapFakeClock,
  input: EventTarget,
  engine: TapRhythmEngine,
  firstOffsetMs = 0
) {
  const snapshot = engine.snapshot!;
  for (const [index, target] of snapshot.expectedOnsets.entries()) {
    const round = snapshot.rounds[target.roundNumber - 1];
    const localOffset = target.audioTime - round.anchorAudioTime;
    const time =
      round.anchorAudioTime +
      localOffset +
      (index === 0 ? firstOffsetMs : 0) / 1000;
    clock.at(time);
    input.dispatchEvent(clock.nativeTap(time));
  }
  clock.at(Math.max(snapshot.drainEndAudioTime, snapshot.planEndAudioTime) + 0.1);
}

async function flushMicrotasks() {
  for (let index = 0; index < 10; index++) await Promise.resolve();
}

async function finishReference(
  exercise: TapRhythmExercise,
  clock: TapFakeClock,
  engine: TapRhythmEngine,
  mode: "practice" | "graded"
) {
  const duration = createTapReferencePlan(exercise).durationSeconds;
  const pending = engine.playReference(mode);
  await flushMicrotasks();
  expect(engine.state).toBe("reference");
  // Advance over the actual plan duration: one complete count-in bar plus reference.
  clock.advance(duration + 0.5);
  await pending;
  expect(engine.state).toBe("idle");
}

describe("explicit Tap experience modes", () => {
  it("seals practice first without consuming the graded slot, then grades the same exercise once", async () => {
    const h = setup();
    expect(h.engine.canStartGraded).toBe(true);

    await h.engine.start("practice");
    tapAll(h.exercise, h.clock, h.input, h.engine);
    const practiceReceipt = h.engine.result!;
    expect(practiceReceipt.mode).toBe("practice");
    expect(practiceReceipt.status).toBe("completed");
    expect(practiceReceipt.evaluation?.correct).toBe(true);
    expect(practiceReceipt.accuracyPercent).toBe(100);
    expect(isRuntimeTapAttempt(practiceReceipt)).toBe(true);
    expect(Object.isFrozen(practiceReceipt)).toBe(true);
    expect(h.engine.canStartGraded).toBe(true);

    await h.engine.start("graded");
    tapAll(h.exercise, h.clock, h.input, h.engine);
    expect(h.engine.result?.mode).toBe("graded");
    expect(h.engine.result?.status).toBe("completed");
    expect(h.engine.result?.evaluation?.correct).toBe(true);
    expect(h.engine.canStartGraded).toBe(false);
    await expect(h.engine.start("graded")).rejects.toThrow(/already been used/);

    // The first sealed receipt stays immutable and exact after the later graded run.
    expect(h.results[0]).toBe(practiceReceipt);
    expect(practiceReceipt.mode).toBe("practice");
    expect(practiceReceipt.accuracyPercent).toBe(100);
    await h.engine.dispose();
  });

  it("allows repeat practice references, rejects overlap, and permits only one graded reference", async () => {
    const h = setup();
    const firstPractice = h.engine.playReference("practice");
    await flushMicrotasks();
    expect(h.engine.state).toBe("reference");
    await expect(h.engine.playReference("practice")).rejects.toThrow(
      /unavailable/
    );
    const duration = createTapReferencePlan(h.exercise).durationSeconds;
    h.clock.advance(duration + 0.5);
    await firstPractice;
    expect(h.engine.state).toBe("idle");

    await finishReference(h.exercise, h.clock, h.engine, "practice");
    await finishReference(h.exercise, h.clock, h.engine, "graded");
    await expect(h.engine.playReference("graded")).rejects.toThrow(
      /unavailable/
    );
    expect(h.engine.canStartGraded).toBe(true);
    await h.engine.start("graded");
    expect(h.engine.state).toBe("count-in");
    h.engine.stop();
    expect(h.engine.result?.status).toBe("technical-abort");
    expect(h.engine.result?.accuracyPercent).toBeNull();
    await h.engine.dispose();
  });

  it("keeps Formula B diagnostic accuracy identical across modes for the same captured timing", async () => {
    const practice = setup();
    await practice.engine.start("practice");
    tapAll(
      practice.exercise,
      practice.clock,
      practice.input,
      practice.engine,
      65
    );
    const practiceEvaluation = practice.engine.result!.evaluation;
    const practiceAccuracy = practice.engine.result!.accuracyPercent;

    const graded = setup();
    await graded.engine.start("graded");
    tapAll(graded.exercise, graded.clock, graded.input, graded.engine, 65);
    expect(graded.engine.result!.evaluation).toEqual(practiceEvaluation);
    expect(graded.engine.result!.accuracyPercent).toBe(practiceAccuracy);
    expect(graded.engine.result!.mode).toBe("graded");
    expect(practice.engine.result!.mode).toBe("practice");
    await practice.engine.dispose();
    await graded.engine.dispose();
  });
});

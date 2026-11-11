import { describe, expect, it } from "vitest";
import { TapRhythmEngine } from "./tapEngine";
import { createTapAttemptPlan } from "./tapPlan";
import { TapFakeClock, TEST_TAP_VOICES } from "./tapTestHelpers";
import {
  createTapRhythmExercise,
  createTapTargets,
} from "../exercises/tapRhythm";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import type { RhythmTrack } from "../types";

function setup(index = 0) {
  const fixture = SEVEN_METER_RUNTIME_FIXTURES[index];
  const track: RhythmTrack = index < 3 ? 3 : index === 6 ? "bonus" : 6;
  const exercise = createTapRhythmExercise({ track, pattern: fixture.pattern });
  const clock = new TapFakeClock();
  const input = new EventTarget();
  const blur = new EventTarget();
  const visibility = Object.assign(new EventTarget(), { hidden: false });
  let factories = 0;
  const engine = new TapRhythmEngine({
    exercise,
    inputTarget: input,
    blurSource: blur,
    now: clock.now,
    timeOrigin: () => 1700000000000,
    transport: {
      voices: TEST_TAP_VOICES,
      timers: clock.timers,
      contextFactory: () => {
        factories++;
        return clock.context as unknown as AudioContext;
      },
      visibilitySource: visibility as unknown as Document,
    },
  });
  return {
    fixture,
    exercise,
    clock,
    input,
    blur,
    visibility,
    engine,
    factoryCount: () => factories,
  };
}
function tapAll(h: ReturnType<typeof setup>, delta = 0) {
  for (const target of h.engine.snapshot!.expectedOnsets) {
    h.clock.at(target.audioTime + Math.max(delta, 0));
    h.input.dispatchEvent(h.clock.nativeTap(target.audioTime + delta));
  }
}
function finish(h: ReturnType<typeof setup>) {
  h.clock.at(h.engine.snapshot!.drainEndAudioTime + 0.03);
}

describe("production Tap Engine with real canonical scheduler and deterministic clock", () => {
  it.each(
    SEVEN_METER_RUNTIME_FIXTURES.map((fixture, index) => ({ fixture, index }))
  )(
    "executes count-in, pulse, capture, DP and Formula B for $fixture.name",
    async ({ index }) => {
      const h = setup(index);
      const plan = createTapAttemptPlan(h.exercise);
      expect(plan.toneEvents).toHaveLength(0);
      expect(plan.pulseEvents).toHaveLength(
        (h.exercise.pattern.measures.length + 1) * plan.pulseCount
      );
      await h.engine.start();
      expect(h.engine.state).toBe("count-in");
      expect(h.engine.snapshot!.expectedOnsets.map(x => x.tick)).toEqual(
        h.fixture.eighthStarts
      );
      tapAll(h);
      finish(h);
      expect(h.engine.state).toBe("completed");
      expect(h.engine.result!.evaluation!.correct).toBe(true);
      expect(h.engine.result!.accuracyPercent).toBe(100);
      expect(h.engine.result!.rawCaptures).toHaveLength(
        h.exercise.targets.length
      );
      expect(
        h.engine.result!.rawCaptures.every(x => x.arrivalMs >= x.performanceMs)
      ).toBe(true);
      expect(h.factoryCount()).toBe(1);
      expect(h.engine.hasPendingWakeup).toBe(false);
      expect(h.engine.transport.activeVoiceCount).toBe(0);
      await h.engine.dispose();
      expect(h.clock.tasks.size).toBe(0);
    }
  );
  it("accepts early/late within pass and diagnoses near-miss without changing timing policy", async () => {
    const h = setup();
    await h.engine.start();
    const targets = h.engine.snapshot!.expectedOnsets;
    const shifts = [-20, 20, -65, 65];
    for (let i = 0; i < targets.length; i++) {
      const at = targets[i].audioTime + shifts[i] / 1000;
      h.clock.at(at);
      h.input.dispatchEvent(h.clock.nativeTap(at));
    }
    finish(h);
    expect(h.engine.result!.evaluation!.tp).toBe(2);
    expect(h.engine.result!.evaluation!.nearMiss).toBe(2);
    expect(h.engine.result!.accuracyPercent).toBe(50);
    expect(h.engine.result!.evaluation!.correct).toBe(false);
    await h.engine.dispose();
  });
  it("deduplicates native event identity but preserves two equal-time physical taps and ignores Space repeat/secondary pointers", async () => {
    const h = setup();
    await h.engine.start();
    const first = h.engine.snapshot!.expectedOnsets[0].audioTime;
    h.clock.at(first);
    const e = h.clock.nativeTap(first);
    h.input.dispatchEvent(e);
    h.input.dispatchEvent(e);
    h.input.dispatchEvent(h.clock.nativeTap(first));
    h.input.dispatchEvent(
      h.clock.nativeTap(first, "keydown", { repeat: true })
    );
    h.input.dispatchEvent(
      h.clock.nativeTap(first, "pointerdown", {
        isPrimary: false,
        pointerId: 2,
      })
    );
    for (const target of h.engine.snapshot!.expectedOnsets.slice(1)) {
      h.clock.at(target.audioTime);
      h.input.dispatchEvent(h.clock.nativeTap(target.audioTime, "keydown"));
    }
    finish(h);
    expect(h.engine.result!.evaluation!.k).toBe(h.exercise.targets.length + 1);
    expect(h.engine.result!.evaluation!.extra).toBe(1);
    expect(h.engine.result!.evaluation!.correct).toBe(false);
    await h.engine.dispose();
  });
  it("drains a delayed original event inside the interval, excludes outside events, and never extends musical cutoff", async () => {
    const h = setup();
    await h.engine.start();
    const snapshot = h.engine.snapshot!;
    h.clock.at(snapshot.expectedOnsets[0].audioTime - 0.09);
    h.input.dispatchEvent(h.clock.nativeTap(h.clock.context.currentTime));
    for (const target of snapshot.expectedOnsets.slice(0, -1)) {
      h.clock.at(target.audioTime);
      h.input.dispatchEvent(h.clock.nativeTap(target.audioTime));
    }
    const last = snapshot.expectedOnsets.at(-1)!.audioTime;
    h.clock.at(last + 0.12);
    expect(h.engine.state).toBe("draining");
    h.input.dispatchEvent(h.clock.nativeTap(last + 0.05));
    h.input.dispatchEvent(h.clock.nativeTap(last + 0.1));
    finish(h);
    expect(h.engine.snapshot).toBe(snapshot);
    expect(h.engine.result!.evaluation!.k).toBe(h.exercise.targets.length);
    expect(h.engine.result!.evaluation!.correct).toBe(true);
    await h.engine.dispose();
  });
  it("rejects delayed deliveries after drain without adding physical taps", async () => {
    const h = setup();
    await h.engine.start();
    const snapshot = h.engine.snapshot!;
    tapAll(h);
    finish(h);
    const result = h.engine.result;
    h.input.dispatchEvent(
      h.clock.nativeTap(snapshot.expectedOnsets[0].audioTime)
    );
    expect(h.engine.result).toBe(result);
    expect(result!.evaluation!.k).toBe(h.exercise.targets.length);
    await h.engine.dispose();
  });
  it.each([
    "pointercancel",
    "blur",
    "hidden",
    "context",
    "stop",
    "pause",
    "starved",
    "generation",
  ])("technical %s never becomes incorrect and cleans up", async kind => {
    const h = setup();
    await h.engine.start();
    h.clock.at(h.engine.snapshot!.expectedOnsets[0].audioTime);
    if (kind === "pointercancel")
      h.input.dispatchEvent(
        h.clock.nativeTap(h.clock.context.currentTime, "pointercancel")
      );
    if (kind === "blur") h.blur.dispatchEvent(new Event("blur"));
    if (kind === "hidden") {
      h.visibility.hidden = true;
      h.visibility.dispatchEvent(new Event("visibilitychange"));
    }
    if (kind === "context") {
      h.clock.context.state = "suspended";
      h.clock.context.dispatchEvent(new Event("statechange"));
      h.clock.advance(0.03);
    }
    if (kind === "stop") h.engine.stop();
    if (kind === "pause") h.engine.pause();
    if (kind === "starved") {
      h.clock.context.currentTime += 1;
      const callbacks = [...h.clock.tasks.values()].map(t => t.callback);
      h.clock.tasks.clear();
      callbacks.forEach(fn => fn());
    }
    if (kind === "generation") {
      await h.engine.transport.replay();
      h.clock.advance(0.03);
    }
    expect(h.engine.state).toBe("aborted");
    expect(h.engine.result!.status).toBe("technical-abort");
    expect(h.engine.result!.accuracyPercent).toBeNull();
    expect(h.engine.result!.evaluation).toBeNull();
    expect(h.clock.tasks.size).toBe(0);
    await h.engine.dispose();
  });
  it.each(["missing", "nan", "negative", "backwards", "stale"])(
    "invalid %s output mapping aborts the active attempt",
    async kind => {
      const h = setup();
      await h.engine.start();
      h.clock.at(h.engine.snapshot!.expectedOnsets[0].audioTime);
      const old = h.clock.context.getOutputTimestamp();
      if (kind === "missing")
        Object.defineProperty(h.clock.context, "getOutputTimestamp", {
          value: undefined,
        });
      else
        h.clock.context.sampleOverride = () =>
          kind === "nan"
            ? { contextTime: NaN, performanceTime: old.performanceTime }
            : kind === "negative"
              ? { contextTime: -1, performanceTime: -1 }
              : kind === "backwards"
                ? {
                    contextTime: old.contextTime - 1,
                    performanceTime: old.performanceTime - 1000,
                  }
                : old;
      h.clock.advance(kind === "stale" ? 0.15 : 0.03);
      expect(h.engine.state).toBe("aborted");
      expect(h.engine.result!.accuracyPercent).toBeNull();
      await h.engine.dispose();
    }
  );
  it("rejects stale generation capture while a retry runs practice-only", async () => {
    const h = setup();
    await h.engine.start();
    const generation = h.engine.generation;
    tapAll(h);
    finish(h);
    expect(h.engine.result!.mode).toBe("graded");
    await h.engine.retry();
    const first = h.engine.snapshot!.expectedOnsets[0].audioTime;
    h.clock.at(first);
    h.engine.handleEvent(h.clock.nativeTap(first), generation);
    tapAll(h);
    finish(h);
    expect(h.engine.result!.mode).toBe("practice");
    expect(h.engine.result!.evaluation!.k).toBe(h.exercise.targets.length);
    expect(h.factoryCount()).toBe(1);
    await h.engine.dispose();
  });
  it("one reference before attempt, one bar count-in, no in-attempt reference replay", async () => {
    const h = setup();
    const pending = h.engine.playReference();
    await Promise.resolve();
    await Promise.resolve();
    h.clock.advance(3);
    await pending;
    expect(h.engine.state).toBe("idle");
    await expect(h.engine.playReference()).rejects.toThrow();
    await h.engine.start();
    await expect(h.engine.playReference()).rejects.toThrow();
    await expect(h.engine.replay()).rejects.toThrow();
    tapAll(h);
    finish(h);
    expect(h.factoryCount()).toBe(1);
    await h.engine.dispose();
  });
  it("keeps snapshot on natural transport completion and finalizes bounded drain", async () => {
    const clock = new TapFakeClock();
    const base = createTapRhythmExercise({
      track: 3,
      pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
    });
    // Canonical stress test only, not a permitted learner tempo or curriculum change.
    const pattern = { ...base.pattern, tempo: { pulseBpm: 1200 } };
    const exercise = {
      ...base,
      pattern,
      targets: createTapTargets(pattern, 240),
    };
    const input = new EventTarget();
    const engine = new TapRhythmEngine({
      exercise,
      inputTarget: input,
      blurSource: null,
      now: clock.now,
      timeOrigin: () => 1700000000000,
      transport: {
        voices: TEST_TAP_VOICES,
        timers: clock.timers,
        contextFactory: () => clock.context as unknown as AudioContext,
        visibilitySource: null,
      },
    });
    await engine.start();
    const snapshot = engine.snapshot!;
    for (const target of snapshot.expectedOnsets) {
      clock.at(target.audioTime);
      input.dispatchEvent(clock.nativeTap(target.audioTime));
    }
    clock.at(snapshot.expectedOnsets.at(-1)!.audioTime + 0.05);
    expect(engine.transport.state).toBe("completed");
    expect(engine.state).toBe("draining");
    expect(engine.snapshot).toBe(snapshot);
    clock.at(snapshot.drainEndAudioTime + 0.03);
    expect(engine.result!.status).toBe("completed");
    expect(engine.result!.evaluation!.correct).toBe(true);
    await engine.dispose();
    expect(clock.tasks.size).toBe(0);
  });
});

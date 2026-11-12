import { afterEach, describe, expect, it, vi } from "vitest";
import { TapRhythmEngine, type TapEngineOptions } from "../audio/tapEngine";
import { TapFakeClock, TEST_TAP_VOICES } from "../audio/tapTestHelpers";
import { createTapReferencePlan } from "../audio/tapPlan";
import {
  createTapRhythmExercise,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
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
const exercise = createTapRhythmExercise({
  track: 3,
  pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
});

afterEach(async () => {
  await Promise.all([...controllers].map(controller => controller.dispose()));
  controllers.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Harness = {
  controller: TapTrainingController;
  clock: TapFakeClock;
  input: EventTarget;
  engines: TapRhythmEngine[];
  options: TapEngineOptions[];
  engineFactories: number;
};

function injectedHarness(): Harness {
  const clock = new TapFakeClock();
  const input = new EventTarget();
  const engines: TapRhythmEngine[] = [];
  const options: TapEngineOptions[] = [];
  const controller = new TapTrainingController({
    getInputTarget: () => input,
    transport: {
      voices: TEST_TAP_VOICES,
      timers: clock.timers,
      contextFactory: () => clock.context as unknown as AudioContext,
      visibilitySource: null,
    },
    createExercise: () => exercise,
    engineFactory: engineOptions => {
      options.push(engineOptions);
      const engine = new TapRhythmEngine({
        ...engineOptions,
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
    options,
    get engineFactories() {
      return engines.length;
    },
  };
}

async function prepared(controller: TapTrainingController) {
  await controller.prepare(CONFIG);
  expect(controller.getSnapshot().phase).toBe("ready");
  return controller.getSnapshot().exercise!;
}

async function flushMicrotasks() {
  for (let index = 0; index < 10; index++) await Promise.resolve();
}

async function finishAttempt(h: Harness) {
  const engine = h.engines.at(-1)!;
  const snapshot = engine.snapshot!;
  for (const target of snapshot.expectedOnsets) {
    h.clock.at(target.audioTime);
    h.input.dispatchEvent(h.clock.nativeTap(target.audioTime));
  }
  h.clock.at(snapshot.drainEndAudioTime + 0.03);
  await flushMicrotasks();
}

async function finishReference(h: Harness) {
  const pending = h.controller.reference();
  await flushMicrotasks();
  expect(h.controller.getSnapshot().phase).toBe("reference");
  h.clock.advance(createTapReferencePlan(exercise).durationSeconds + 0.5);
  await pending;
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function fakeAudioBuffer() {
  return {
    duration: 8,
    numberOfChannels: 1,
    getChannelData: () => new Float32Array([0.2]),
  } as unknown as AudioBuffer;
}

class FakeGainNode {
  readonly context: FakeAudioContext;
  readonly values: number[] = [];
  readonly connections: unknown[] = [];
  disconnected = false;
  readonly gain = {
    setValueAtTime: (value: number) => this.values.push(value),
    linearRampToValueAtTime: (value: number) => this.values.push(value),
    exponentialRampToValueAtTime: (value: number) => this.values.push(value),
    cancelScheduledValues: () => undefined,
  };
  constructor(context: FakeAudioContext) {
    this.context = context;
  }
  connect(destination: unknown) {
    this.connections.push(destination);
  }
  disconnect() {
    this.disconnected = true;
  }
}

class FakeBufferSource {
  buffer: AudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: number[] = [];
  disconnected = false;
  connect() {}
  start(time: number) {
    this.starts.push(time);
  }
  stop(time = 0) {
    this.stops.push(time);
  }
  disconnect() {
    this.disconnected = true;
  }
}

class FakeOscillator {
  type: OscillatorType = "sine";
  readonly frequency = {
    value: 440,
    setValueAtTime: (value: number) => {
      this.frequency.value = value;
    },
  };
  onended: (() => void) | null = null;
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private ended = false;

  constructor(private readonly context: FakeAudioContext) {}

  connect() {}
  start(time: number) {
    this.starts.push(time);
  }
  stop(time = this.context.currentTime) {
    this.stops.push(time);
    if (this.endTimer !== null) clearTimeout(this.endTimer);
    const delay = Math.max(0, (time - this.context.currentTime) * 1000);
    this.endTimer = globalThis.setTimeout(() => {
      this.endTimer = null;
      if (this.ended) return;
      this.ended = true;
      this.onended?.();
    }, delay);
  }
  disconnect() {}
}

class FakeAudioContext extends EventTarget {
  state = "running";
  readonly destination = {};
  readonly sampleRate = 44100;
  readonly origin = performance.now();
  readonly gains: FakeGainNode[] = [];
  readonly sources: FakeBufferSource[] = [];
  readonly oscillators: FakeOscillator[] = [];
  closeCount = 0;
  decodeAudioData: (encoded: ArrayBuffer) => Promise<AudioBuffer> = async () =>
    fakeAudioBuffer();

  get currentTime() {
    return 10 + (performance.now() - this.origin) / 1000;
  }
  getOutputTimestamp() {
    return {
      contextTime: this.currentTime - 0.02,
      performanceTime: performance.now() - 20,
    };
  }
  createGain() {
    const gain = new FakeGainNode(this);
    this.gains.push(gain);
    return gain;
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    const pcm = new Float32Array(length);
    return {
      duration: length / sampleRate,
      numberOfChannels: 1,
      getChannelData: () => pcm,
    } as unknown as AudioBuffer;
  }
  createBufferSource() {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }
  createOscillator() {
    const oscillator = new FakeOscillator(this);
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  }
  async resume() {
    this.state = "running";
  }
  async close() {
    this.closeCount++;
    this.state = "closed";
  }
}

type PendingContext = FakeAudioContext & {
  decodeDeferred: Deferred<AudioBuffer>;
  decodeCalls: number;
};
function installPendingAudio() {
  const contexts: PendingContext[] = [];
  class PendingAudioContext extends FakeAudioContext {
    readonly decodeDeferred = deferred<AudioBuffer>();
    decodeCalls = 0;
    override decodeAudioData = async () => {
      this.decodeCalls++;
      return this.decodeDeferred.promise;
    };
    constructor() {
      super();
      contexts.push(this as PendingContext);
    }
  }
  vi.stubGlobal("AudioContext", PendingAudioContext);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(8),
    }))
  );
  return contexts;
}

function pendingAudioController(
  factory: (options: TapEngineOptions) => TapRhythmEngine
) {
  const input = new EventTarget();
  const controller = new TapTrainingController({
    getInputTarget: () => input,
    createExercise: () => exercise,
    engineFactory: factory,
  });
  controllers.add(controller);
  return controller;
}

describe("Tap practice and graded controller experience", () => {
  it("keeps practice unscored and mode-locked until fresh Setup, then preserves one graded receipt through retry", async () => {
    const h = injectedHarness();
    const preparedExercise = await prepared(h.controller);
    expect(h.controller.chooseMode("practice")).toBe(true);
    await h.controller.start();
    await finishAttempt(h);

    const practiceState = h.controller.getSnapshot();
    const practiceReceipt = practiceState.result;
    expect(practiceReceipt?.mode).toBe("practice");
    expect(practiceReceipt?.status).toBe("completed");
    expect(practiceReceipt?.evaluation?.correct).toBe(true);
    expect(practiceReceipt?.accuracyPercent).toBe(100);
    expect(Object.isFrozen(practiceReceipt)).toBe(true);
    expect(practiceState.points).toBeNull();
    expect(practiceState.originalPoints).toBeNull();
    expect(practiceState.gradedResult).toBeNull();
    expect(practiceState.session?.questionsAnswered).toBe(0);
    expect(practiceState.session?.correctAnswers).toBe(0);

    expect(h.controller.chooseMode("graded")).toBe(false);
    expect(h.controller.getSnapshot().selectedMode).toBe("practice");
    expect(await prepared(h.controller)).toBe(preparedExercise);
    expect(h.controller.chooseMode("graded")).toBe(true);
    await h.controller.start();
    await finishAttempt(h);
    const gradedState = h.controller.getSnapshot();
    const gradedReceipt = gradedState.gradedResult;
    expect(gradedState.exercise).toBe(preparedExercise);
    expect(gradedReceipt?.mode).toBe("graded");
    expect(gradedReceipt?.status).toBe("completed");
    expect(gradedState.points).toBe(10);
    expect(gradedState.originalPoints).toBe(10);
    expect(gradedState.session?.questionsAnswered).toBe(1);
    expect(gradedState.session?.correctAnswers).toBe(1);
    expect(h.controller.canStart).toBe(false);

    await h.controller.start("graded");
    expect(h.controller.getSnapshot().gradedResult).toBe(gradedReceipt);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(1);
    const gradedEngine = h.engines.at(-1)!;
    await h.controller.retry();
    const retryEngine = h.engines.at(-1)!;
    expect(retryEngine).not.toBe(gradedEngine);
    expect(gradedEngine.state).toBe("disposed");
    expect(retryEngine.state).toBe("idle");
    expect(h.controller.getSnapshot().phase).toBe("ready");
    expect(h.controller.getSnapshot().result).toBeNull();
    expect(h.controller.getSnapshot().originalPoints).toBe(10);
    expect(h.controller.getSnapshot().session?.questionsAnswered).toBe(1);
    await h.controller.start();
    expect(retryEngine.state).toMatch(/^(count-in|collecting)$/);
    await finishAttempt(h);
    const retryState = h.controller.getSnapshot();
    expect(retryState.result?.mode).toBe("practice");
    expect(retryState.points).toBeNull();
    expect(retryState.originalPoints).toBe(10);
    expect(retryState.gradedResult).toBe(gradedReceipt);
    expect(retryState.session).toBe(gradedState.session);
    expect(retryState.session?.questionsAnswered).toBe(1);
    expect(practiceReceipt?.mode).toBe("practice");
    expect(practiceReceipt?.accuracyPercent).toBe(100);
  });

  it("guards reference double-clicks, permits repeat practice references, and allows only one graded reference", async () => {
    const h = injectedHarness();
    await prepared(h.controller);
    expect(h.controller.chooseMode("practice")).toBe(true);

    const first = h.controller.reference();
    await flushMicrotasks();
    expect(h.controller.getSnapshot().phase).toBe("reference");
    expect(h.controller.canReference).toBe(false);
    await h.controller.reference();
    expect(h.engines).toHaveLength(1);
    h.clock.advance(createTapReferencePlan(exercise).durationSeconds + 0.5);
    await first;
    expect(h.controller.getSnapshot().phase).toBe("ready");

    await finishReference(h);
    expect(h.engines).toHaveLength(1);
    expect(h.controller.chooseMode("graded")).toBe(true);
    await finishReference(h);
    expect(h.controller.getSnapshot().referenceUsed).toBe(true);
    expect(h.controller.canReference).toBe(false);
    await h.controller.reference();
    expect(h.engines).toHaveLength(1);
  });

  it.each(["stop", "back", "dispose"] as const)(
    "%s during async piano decode cannot resurrect a canceled attempt",
    async action => {
      const contexts = installPendingAudio();
      let engineCount = 0;
      const controller = pendingAudioController(options => {
        engineCount++;
        return new TapRhythmEngine(options);
      });
      await prepared(controller);
      const start = controller.start("practice");
      await flushMicrotasks();
      expect(contexts).toHaveLength(1);
      expect(contexts[0].decodeCalls).toBe(1);
      if (action === "stop") controller.stop();
      else if (action === "back") controller.back();
      else await controller.dispose();

      contexts[0].decodeDeferred.resolve(fakeAudioBuffer());
      await start;
      expect(engineCount).toBe(0);
      expect(controller.getSnapshot().result).toBeNull();
      expect(controller.getSnapshot().session?.questionsAnswered).toBe(0);
      expect(controller.getSnapshot().phase).toBe(
        action === "dispose" ? "disposed" : "ready"
      );
      expect(contexts[0].closeCount).toBe(action === "dispose" ? 1 : 0);
    }
  );

  it("disposing one pending decode closes only its own context and neither pending start can resurrect", async () => {
    const contexts = installPendingAudio();
    let engineCount = 0;
    const first = pendingAudioController(options => {
      engineCount++;
      return new TapRhythmEngine(options);
    });
    const second = pendingAudioController(options => {
      engineCount++;
      return new TapRhythmEngine(options);
    });
    await Promise.all([prepared(first), prepared(second)]);
    const firstStart = first.start("practice");
    const secondStart = second.start("practice");
    await flushMicrotasks();
    expect(contexts).toHaveLength(2);

    await first.dispose();
    expect(contexts[0].closeCount).toBe(1);
    expect(contexts[1].closeCount).toBe(0);
    second.stop();
    contexts.forEach(context =>
      context.decodeDeferred.resolve(fakeAudioBuffer())
    );
    await Promise.all([firstStart, secondStart]);
    expect(engineCount).toBe(0);
    expect(first.getSnapshot().phase).toBe("disposed");
    expect(second.getSnapshot().phase).toBe("ready");
    expect(contexts[1].closeCount).toBe(0);
  });

  it("uses one audio context for preview and attempt, applies independent volume, and stops preview before attempt audio", async () => {
    const contexts: FakeAudioContext[] = [];
    class ExperienceAudioContext extends FakeAudioContext {
      constructor() {
        super();
        contexts.push(this);
      }
    }
    vi.stubGlobal("AudioContext", ExperienceAudioContext);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8),
      }))
    );

    const input = new EventTarget();
    let controller!: TapTrainingController;
    let stateAtEngineCreation: string | undefined;
    const options: TapEngineOptions[] = [];
    controller = new TapTrainingController({
      getInputTarget: () => input,
      createExercise: () => exercise,
      engineFactory: engineOptions => {
        stateAtEngineCreation = controller.getAudioPlayback()?.state;
        options.push(engineOptions);
        return new TapRhythmEngine(engineOptions);
      },
    });
    controllers.add(controller);
    await prepared(controller);
    expect(controller.chooseMode("practice")).toBe(true);

    const preview = controller.previewMetronome(CONFIG);
    for (let tries = 0; tries < 40; tries++) {
      if (controller.getAudioPlayback()?.state === "playing") break;
      await new Promise(resolve => globalThis.setTimeout(resolve, 10));
    }
    expect(controller.getAudioPlayback()?.state).toBe("playing");
    expect(contexts).toHaveLength(1);
    controller.setMetronomeVolume(0.42);
    const outputBus = contexts[0].gains[0];
    expect(outputBus.values.at(-1)).toBe(0.42);

    await controller.start();
    await preview;
    expect(stateAtEngineCreation).toBe("stopped");
    expect(contexts).toHaveLength(1);
    expect(options).toHaveLength(1);
    expect(options[0].transport.voices.metronome.output).toBe(outputBus);
    expect(
      (options[0].transport.voices.metronome.output as unknown as FakeGainNode)
        .context
    ).toBe(contexts[0]);
    expect(controller.getAudioPlayback()?.state).toBe("playing");
  });
});

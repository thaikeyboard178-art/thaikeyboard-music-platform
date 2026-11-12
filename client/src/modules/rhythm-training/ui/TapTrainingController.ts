import {
  createRhythmTrainingSession,
  submitRhythmExerciseAnswer,
  type RhythmTrainingSession,
} from "../exercises/scoring";
import {
  generateTapRhythmExercise,
  type GenerateTapRhythmExerciseInput,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import {
  RhythmAudioTransport,
  type RhythmScheduledEvent,
} from "../audio/transport";
import { createRhythmAudioPlan } from "../audio/plan";
import {
  TapRhythmEngine,
  type TapEngineOptions,
  type TapEngineState,
} from "../audio/tapEngine";
import type { RhythmTransportOptions } from "../audio/transport";
import type { CurriculumSection } from "../curriculum/curriculum";
import type { RhythmFocus } from "../generation/levels";
import type { RhythmMeter, RhythmPattern, RhythmTrack } from "../types";
import type { RhythmVoiceSettings } from "../audio/voices";
import { TAP_UI_VOICE_SETTINGS } from "./voiceSettings";
import {
  experienceVoiceSettings,
  loadPianoBuffer,
} from "../audio/experienceAudio";

export type TapMode = "practice" | "graded";

export type TapUiConfiguration = Readonly<{
  track: RhythmTrack;
  section: CurriculumSection;
  meter?: RhythmMeter;
  bars?: 1 | 2 | 4;
  pulseBpm?: number;
  focus?: RhythmFocus;
}>;

export type TapUiPhase =
  | "setup"
  | "preparing"
  | "ready"
  | "empty"
  | "error"
  | TapEngineState;

export type TapUiState = Readonly<{
  phase: TapUiPhase;
  exercise: TapRhythmExercise | null;
  result: TapAttemptResult | null;
  gradedResult: TapAttemptResult | null;
  /** Official points for the latest attempt; practice attempts have no score. */
  points: number | null;
  /** Points from the first graded result; retries never change this value. */
  originalPoints: number | null;
  referenceUsed: boolean;
  busy: boolean;
  error: string | null;
  /** Number of starts including practice retries; the first graded attempt is 1. */
  trialNumber: number;
  practice: boolean;
  /** UI-only acknowledgement sequence; never passed to the engine/scorer. */
  tapVisualSequence: number;
  session: RhythmTrainingSession | null;
  selectedMode: TapMode;
}>;

export type TapExerciseFactory = (
  configuration: TapUiConfiguration,
  seed: string
) => TapRhythmExercise | Promise<TapRhythmExercise>;
export type TapEngineFactory = (options: TapEngineOptions) => TapRhythmEngine;
export type TapTrainingControllerOptions = Readonly<{
  getInputTarget: () => EventTarget | null;
  transport?: Partial<RhythmTransportOptions>;
  createExercise?: TapExerciseFactory;
  engineFactory?: TapEngineFactory;
  seedPrefix?: string;
}>;

const ACTIVE_ENGINE_STATES: readonly TapEngineState[] = [
  "starting",
  "reference",
  "count-in",
  "collecting",
  "draining",
];
const TERMINAL_ATTEMPT_STATES: readonly TapEngineState[] = [
  "completed",
  "aborted",
];

function initialState(): TapUiState {
  return Object.freeze({
    phase: "setup",
    exercise: null,
    result: null,
    gradedResult: null,
    points: null,
    originalPoints: null,
    referenceUsed: false,
    busy: false,
    error: null,
    trialNumber: 0,
    practice: false,
    tapVisualSequence: 0,
    session: null,
    selectedMode: "graded",
  });
}

function freezeSession(session: RhythmTrainingSession): RhythmTrainingSession {
  return Object.freeze(session);
}

function phaseForEngine(state: TapEngineState): TapUiPhase {
  return state === "idle" ? "ready" : state;
}

function technicalMessage(reason: string | null): string {
  switch (reason) {
    case "visibility-hidden":
      return "Bài chưa được chấm vì trang bị ẩn trong lúc phát. Hãy mở trang và thử lại.";
    case "audio-unavailable":
    case "audio-blocked":
    case "context-interrupted":
    case "clock-invalid":
    case "clock-missing":
    case "invalid-output-timestamp":
      return "Bài chưa được chấm do thiết bị âm thanh hoặc đồng hồ âm thanh không ổn định. Đây không phải lỗi của bạn; hãy thử lại.";
    case "input-blur":
      return "Bài chưa được chấm vì vùng chạm mất tiêu điểm. Hãy thử lại và giữ trang hoạt động.";
    case "pointer-cancelled":
    case "pointercancel":
      return "Bài chưa được chấm vì thao tác chạm bị gián đoạn. Hãy thử lại.";
    case "stopped":
    case "paused":
      return "Bài đã dừng và chưa được chấm. Bạn có thể luyện lại.";
    default:
      return "Bài chưa được chấm do có gián đoạn kỹ thuật. Đây không phải lỗi của bạn; hãy thử lại.";
  }
}

function preparationErrorMessage(): string {
  return "Không thể chuẩn bị bài tập này. Hãy kiểm tra cấp độ, phần học, nhịp, số ô nhịp hoặc tốc độ rồi thử lại.";
}

function audioStartErrorMessage(): string {
  return "Không thể khởi động âm thanh. Bài chưa được chấm; hãy kiểm tra âm thanh của thiết bị và thử lại.";
}

function targetErrorMessage(): string {
  return "Chưa tìm thấy vùng chạm của bài tập. Hãy đợi bài hiển thị đầy đủ rồi thử lại.";
}

function engineStartErrorMessage(error: unknown): string {
  return error instanceof Error &&
    error.message === "Tap input target is unavailable."
    ? targetErrorMessage()
    : audioStartErrorMessage();
}

function copyConfiguration(
  configuration: TapUiConfiguration
): TapUiConfiguration {
  return Object.freeze({
    ...configuration,
    ...(configuration.meter
      ? { meter: Object.freeze({ ...configuration.meter }) }
      : {}),
  });
}

function toGenerateInput(
  configuration: TapUiConfiguration,
  seed: string
): GenerateTapRhythmExerciseInput {
  return {
    track: configuration.track,
    section: configuration.section,
    seed,
    ...(configuration.meter === undefined
      ? {}
      : { meter: configuration.meter }),
    ...(configuration.bars === undefined ? {} : { bars: configuration.bars }),
    ...(configuration.pulseBpm === undefined
      ? {}
      : { pulseBpm: configuration.pulseBpm }),
    ...(configuration.focus === undefined
      ? {}
      : { focus: configuration.focus }),
  };
}

/**
 * Thin bridge from learner controls to the canonical exercise, audio engine,
 * and existing shared session scorer. It does not capture or time individual
 * taps and never contains a matcher or Formula B implementation.
 */
export class TapTrainingController {
  private readonly getInputTarget: () => EventTarget | null;
  private readonly transportOverrides: Partial<RhythmTransportOptions>;
  private readonly createExercise: TapExerciseFactory;
  private readonly engineFactory: TapEngineFactory;
  private readonly seedPrefix: string;
  private readonly usesInjectedAudio: boolean;
  private readonly listeners = new Set<() => void>();
  private snapshot: TapUiState = initialState();
  private configuration: TapUiConfiguration | null = null;
  private engine: TapRhythmEngine | null = null;
  private observationTimer: ReturnType<typeof setInterval> | null = null;
  private operationToken = 0;
  private previewToken = 0;
  private engineEpoch = 0;
  private exerciseSequence = 0;
  private previewSequence = 0;
  private attemptStartedAt = 0;
  private hasStartedAttempt = false;
  private gradedAttemptUsed = false;
  private practiceAttemptStarted = false;
  private gradedReferenceUsed = false;
  private modeExplicitlySelected = false;
  private audioContext: AudioContext | null = null;
  private pianoBuffer: AudioBuffer | null = null;
  private pianoBufferPromise: Promise<AudioBuffer> | null = null;
  private metronomeOutput: GainNode | null = null;
  private metronomeVolume = 0.8;
  private previewTransport: RhythmAudioTransport | null = null;
  private previewContext: BaseAudioContext | null = null;
  private previewEvents: RhythmScheduledEvent[] = [];
  private previewGeneration: number | null = null;
  private previewBusy = false;
  private disposed = false;

  constructor(options: TapTrainingControllerOptions) {
    this.getInputTarget = options.getInputTarget;
    this.transportOverrides = options.transport ?? {};
    this.usesInjectedAudio = options.transport !== undefined;
    this.createExercise =
      options.createExercise ??
      ((configuration, seed) =>
        generateTapRhythmExercise(toGenerateInput(configuration, seed)));
    this.engineFactory =
      options.engineFactory ??
      (engineOptions => new TapRhythmEngine(engineOptions));
    this.seedPrefix = options.seedPrefix ?? `tap-ui-${Date.now()}`;
  }

  /** Stable arrow methods are directly compatible with useSyncExternalStore. */
  readonly getSnapshot = (): TapUiState => this.snapshot;

  /** Start permits one graded attempt after any number of practice attempts. */
  get canStart(): boolean {
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.previewBusy ||
      this.snapshot.exercise === null ||
      this.snapshot.exercise.targets.length === 0 ||
      this.snapshot.session === null ||
      (this.engine !== null &&
        !["idle", ...TERMINAL_ATTEMPT_STATES].includes(this.engine.state))
    )
      return false;
    if (this.snapshot.exercise.section === "lessons")
      return !this.practiceAttemptStarted;
    return this.snapshot.selectedMode === "graded"
      ? !this.gradedAttemptUsed
      : !this.practiceAttemptStarted;
  }

  /** References repeat in practice mode; the graded-mode slot is limited to one. */
  get canReference(): boolean {
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.previewBusy ||
      !this.snapshot.exercise ||
      this.snapshot.exercise.targets.length === 0 ||
      this.snapshot.session === null ||
      (this.engine !== null &&
        !["idle", ...TERMINAL_ATTEMPT_STATES].includes(this.engine.state))
    )
      return false;
    if (
      this.snapshot.exercise.section === "lessons" ||
      this.snapshot.selectedMode === "practice"
    )
      return true;
    return !this.gradedReferenceUsed && !this.gradedAttemptUsed;
  }

  /** Select the mode for Start; selection is locked during playback/finalization. */
  chooseMode(mode: TapMode): boolean {
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.previewBusy ||
      this.isEngineActive()
    )
      return false;
    const selectedMode: TapMode =
      this.snapshot.exercise?.section === "lessons" ? "practice" : mode;
    if (selectedMode === "graded" && this.gradedAttemptUsed) {
      this.modeExplicitlySelected = true;
      this.publish({ selectedMode: "practice" });
      return false;
    }
    this.modeExplicitlySelected = true;
    this.publish({ selectedMode });
    return true;
  }

  /** Alias for consumers that model mode controls as setters. */
  setMode(mode: TapMode): boolean {
    return this.chooseMode(mode);
  }

  /** Exact audio-clock time plus scheduler intent; never advances a musical clock. */
  getAudioPlayback(): Readonly<{
    audioTime: number;
    scheduledEvents: readonly RhythmScheduledEvent[];
    state: string;
  }> | null {
    const enginePlayback = this.engine?.getAudioPlayback();
    if (enginePlayback) return enginePlayback;
    if (!this.previewContext || !this.previewTransport) return null;
    return Object.freeze({
      audioTime: this.previewContext.currentTime,
      scheduledEvents: Object.freeze([...this.previewEvents]),
      state: this.previewTransport.state,
    });
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(patch: Partial<TapUiState>): void {
    if (this.disposed && patch.phase !== "disposed") return;
    this.snapshot = Object.freeze({ ...this.snapshot, ...patch });
    for (const listener of [...this.listeners]) listener();
  }

  private setBusy(busy: boolean): void {
    if (this.snapshot.busy !== busy) this.publish({ busy });
  }

  /** Stop preview playback without disposing or closing the shared context. */
  stopPreview(): void {
    ++this.previewToken;
    const wasBusy = this.previewBusy;
    this.previewBusy = false;
    if (
      this.previewTransport &&
      ["starting", "playing", "paused"].includes(this.previewTransport.state)
    ) {
      try {
        this.previewTransport.stop();
      } catch {
        // Preview cancellation is best-effort; the scheduler generation is invalidated.
      }
    }
    this.previewEvents = [];
    this.previewGeneration = null;
    if (wasBusy) this.setBusy(false);
  }

  /** Play exactly one canonical measure of metronome-only preview. */
  async previewMetronome(configuration: TapUiConfiguration): Promise<void> {
    this.stopPreview();
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.isEngineActive() ||
      !configuration
    )
      return;
    const token = ++this.previewToken;
    this.previewBusy = true;
    this.publish({ busy: true, error: null });
    const audioReady = this.beginAudioGesture();
    let transport: RhythmAudioTransport | null = null;
    try {
      const exercise = await this.createExercise(
        copyConfiguration(configuration),
        `${this.seedPrefix}-metronome-preview-${++this.previewSequence}`
      );
      if (this.disposed || token !== this.previewToken) return;
      if (audioReady !== null) await audioReady;
      if (this.disposed || token !== this.previewToken) return;
      const firstMeasure = exercise.pattern.measures[0];
      if (!firstMeasure) throw new Error("Preview pattern has no measure.");
      const oneBarPattern: RhythmPattern = Object.freeze({
        ...exercise.pattern,
        measures: Object.freeze([firstMeasure]),
      });

      if (!this.previewTransport) {
        const baseOptions = this.engineTransport();
        const baseFactory =
          baseOptions.contextFactory ??
          (() => {
            const host = globalThis as typeof globalThis & {
              webkitAudioContext?: typeof AudioContext;
            };
            const Constructor = host.AudioContext ?? host.webkitAudioContext;
            if (!Constructor) throw new Error("Web Audio is unavailable.");
            return new Constructor({ latencyHint: "interactive" });
          });
        this.previewTransport = new RhythmAudioTransport({
          ...baseOptions,
          contextFactory: () => {
            const context = baseFactory();
            this.previewContext = context;
            return context;
          },
          onScheduled: event => {
            if (this.previewGeneration === null)
              this.previewGeneration = event.generation;
            if (event.generation !== this.previewGeneration) return;
            this.previewEvents.push(event);
            baseOptions.onScheduled?.(event);
          },
        });
      }
      transport = this.previewTransport;
      this.previewEvents = [];
      this.previewGeneration = null;
      await transport.start(createRhythmAudioPlan(oneBarPattern, "metronome"));
      if (this.disposed || token !== this.previewToken) return;
      // This timer only observes the scheduler's state; all musical timing stays
      // on the AudioContext and RhythmAudioTransport timeline.
      await new Promise<void>(resolve => {
        const inspect = () => {
          if (
            this.disposed ||
            token !== this.previewToken ||
            !["starting", "playing"].includes(transport!.state)
          ) {
            resolve();
            return;
          }
          globalThis.setTimeout(inspect, 25);
        };
        inspect();
      });
    } catch {
      if (!this.disposed && token === this.previewToken) {
        this.publish({ error: audioStartErrorMessage() });
      }
    } finally {
      if (!this.disposed && token === this.previewToken) {
        this.previewBusy = false;
        this.setBusy(false);
      }
    }
  }

  private stopObservation(): void {
    if (this.observationTimer === null) return;
    globalThis.clearInterval(this.observationTimer);
    this.observationTimer = null;
  }

  private observeEngine(engine: TapRhythmEngine): void {
    this.stopObservation();
    this.observationTimer = globalThis.setInterval(() => {
      if (this.disposed || this.engine !== engine) return;
      this.syncEngineState(engine);
    }, 50);
  }

  private syncEngineState(engine: TapRhythmEngine): void {
    if (this.disposed || this.engine !== engine) return;
    const phase = phaseForEngine(engine.state);
    if (!ACTIVE_ENGINE_STATES.includes(engine.state)) this.stopObservation();
    if (phase !== this.snapshot.phase) this.publish({ phase });
  }

  private isEngineActive(): boolean {
    return (
      this.engine !== null && ACTIVE_ENGINE_STATES.includes(this.engine.state)
    );
  }

  private isFinalizedAttempt(): boolean {
    return (
      this.hasStartedAttempt &&
      this.engine !== null &&
      TERMINAL_ATTEMPT_STATES.includes(this.engine.state)
    );
  }

  private engineTransport(): RhythmTransportOptions {
    const visibilitySource =
      this.transportOverrides.visibilitySource === undefined
        ? typeof document === "undefined"
          ? null
          : document
        : this.transportOverrides.visibilitySource;
    const contextFactory =
      this.transportOverrides.contextFactory ??
      (this.usesInjectedAudio ? undefined : () => this.requireAudioContext());
    return {
      ...this.transportOverrides,
      ...(contextFactory === undefined ? {} : { contextFactory }),
      voices: this.transportOverrides.voices ?? this.experienceVoices(),
      visibilitySource,
    };
  }

  private requireAudioContext(): AudioContext {
    if (this.audioContext?.state === "closed") {
      this.audioContext = null;
      this.metronomeOutput = null;
    }
    if (this.audioContext) return this.audioContext;
    const host = globalThis as typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
    const Constructor = host.AudioContext ?? host.webkitAudioContext;
    if (!Constructor) throw new Error("Web Audio is unavailable.");
    this.audioContext = new Constructor({ latencyHint: "interactive" });
    return this.audioContext;
  }

  private getMetronomeOutput(context: AudioContext): GainNode {
    if (!this.metronomeOutput || this.metronomeOutput.context !== context) {
      this.metronomeOutput = context.createGain();
      this.metronomeOutput.gain.setValueAtTime(
        this.metronomeVolume,
        context.currentTime
      );
      this.metronomeOutput.connect(context.destination);
    }
    return this.metronomeOutput;
  }

  private experienceVoices(): RhythmVoiceSettings {
    if (this.pianoBuffer && !this.usesInjectedAudio) {
      return experienceVoiceSettings(
        this.pianoBuffer,
        this.audioContext
          ? this.getMetronomeOutput(this.audioContext)
          : undefined
      );
    }
    return TAP_UI_VOICE_SETTINGS;
  }

  /** Starts resume synchronously from the caller's gesture, then lazily decodes. */
  private beginAudioGesture(): Promise<AudioBuffer> | null {
    if (this.usesInjectedAudio) return null;
    let context: AudioContext;
    try {
      context = this.requireAudioContext();
      this.getMetronomeOutput(context);
    } catch {
      // Let the engine's actual start path seal audio-unavailable consistently.
      return null;
    }
    if (context.state !== "running") {
      try {
        void context.resume().catch(() => undefined);
      } catch {
        // The engine will retry/resolution-fail through its technical receipt.
      }
    }
    if (this.pianoBuffer) return Promise.resolve(this.pianoBuffer);
    if (!this.pianoBufferPromise) {
      this.pianoBufferPromise = loadPianoBuffer(context)
        .then(buffer => {
          this.pianoBuffer = buffer;
          return buffer;
        })
        .catch(error => {
          this.pianoBufferPromise = null;
          throw error;
        });
    }
    return this.pianoBufferPromise;
  }

  setMetronomeVolume(volume: number): void {
    if (!Number.isFinite(volume))
      throw new RangeError("Volume must be finite.");
    this.metronomeVolume = Math.max(0, Math.min(1, volume));
    if (this.metronomeOutput && this.audioContext) {
      this.metronomeOutput.gain.setValueAtTime(
        this.metronomeVolume,
        this.audioContext.currentTime
      );
    }
  }

  getMetronomeVolume(): number {
    return this.metronomeVolume;
  }

  /** Engine and its native input listener are created only after the tap DOM exists. */
  private ensureEngine(
    inputTargetOverride?: EventTarget | null
  ): TapRhythmEngine {
    if (this.engine) return this.engine;
    const exercise = this.snapshot.exercise;
    if (!exercise || exercise.targets.length === 0)
      throw new Error("There is no playable Tap Rhythm exercise.");
    const inputTarget =
      inputTargetOverride === undefined
        ? this.getInputTarget()
        : inputTargetOverride;
    if (!inputTarget) throw new Error("Tap input target is unavailable.");

    const epoch = ++this.engineEpoch;
    let engine: TapRhythmEngine;
    engine = this.engineFactory({
      exercise,
      inputTarget,
      transport: this.engineTransport(),
      disposeAudioContext: false,
      onResult: result => this.acceptEngineResult(epoch, result),
    });
    this.engine = engine;
    this.observeEngine(engine);
    return engine;
  }

  private acceptEngineResult(epoch: number, result: TapAttemptResult): void {
    if (this.disposed || epoch !== this.engineEpoch || !this.engine) return;
    this.stopObservation();

    let session = this.snapshot.session;
    let latestPoints: number | null = null;
    let originalPoints = this.snapshot.originalPoints;
    let gradedResult = this.snapshot.gradedResult;
    let error: string | null = null;

    if (result.status === "technical-abort") {
      error = technicalMessage(result.reason);
    } else if (
      result.mode === "practice" ||
      this.snapshot.exercise?.section === "lessons"
    ) {
      // Practice and lesson worked examples never invoke the shared scorer.
      latestPoints = null;
    } else if (
      gradedResult === null &&
      session !== null &&
      !session.hasAnsweredCurrent
    ) {
      const submission = submitRhythmExerciseAnswer(
        session,
        this.snapshot.exercise!,
        {
          type: "answer",
          answer: result,
          responseTimeMs: Math.max(0, Date.now() - this.attemptStartedAt),
        }
      );
      session = freezeSession(submission.session);
      if (submission.status === "graded") {
        latestPoints = submission.scoreDelta;
        originalPoints = submission.scoreDelta;
        gradedResult = result;
      }
    }

    this.publish({
      phase: phaseForEngine(this.engine.state),
      result,
      gradedResult,
      points: latestPoints,
      originalPoints,
      practice:
        result.mode === "practice" ||
        this.snapshot.exercise?.section === "lessons",
      session,
      error,
    });
  }

  /** Prepare exactly one canonical exercise and one FREE shared question. */
  async prepare(configuration: TapUiConfiguration): Promise<void> {
    this.stopPreview();
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.isEngineActive() ||
      !configuration
    )
      return;
    const token = ++this.operationToken;
    await this.loadExercise(copyConfiguration(configuration), token);
  }

  private async loadExercise(
    configuration: TapUiConfiguration,
    token: number
  ): Promise<void> {
    this.configuration = configuration;
    const oldEngine = this.engine;
    this.engineEpoch += 1;
    this.engine = null;
    this.stopObservation();
    this.hasStartedAttempt = false;
    this.gradedAttemptUsed = false;
    this.practiceAttemptStarted = false;
    this.gradedReferenceUsed = false;
    this.modeExplicitlySelected = false;
    this.attemptStartedAt = 0;
    this.publish({
      phase: "preparing",
      exercise: null,
      result: null,
      gradedResult: null,
      points: null,
      originalPoints: null,
      referenceUsed: false,
      busy: true,
      error: null,
      trialNumber: 1,
      practice: false,
      tapVisualSequence: 0,
      session: null,
      selectedMode: configuration.section === "lessons" ? "practice" : "graded",
    });

    try {
      if (oldEngine) await oldEngine.dispose();
      if (this.disposed || token !== this.operationToken) return;
      const seed = `${this.seedPrefix}-${++this.exerciseSequence}`;
      const exercise = await this.createExercise(configuration, seed);
      if (this.disposed || token !== this.operationToken) return;
      const session = freezeSession(
        createRhythmTrainingSession(
          { mode: "free", plannedQuestions: 1 },
          exercise
        )
      );
      this.publish({
        phase: exercise.targets.length === 0 ? "empty" : "ready",
        exercise,
        session,
        busy: false,
        error: null,
      });
    } catch {
      if (this.disposed || token !== this.operationToken) return;
      this.publish({
        phase: "error",
        busy: false,
        error: preparationErrorMessage(),
      });
    }
  }

  /** Must be invoked directly from the learner's Start gesture. */
  async start(mode?: TapMode): Promise<void> {
    if (mode !== undefined && !this.chooseMode(mode)) return;
    this.stopPreview();
    if (!this.canStart) return;

    const token = ++this.operationToken;
    const lesson = this.snapshot.exercise?.section === "lessons";
    const explicit = this.modeExplicitlySelected;
    const selectedMode: TapMode | undefined = lesson
      ? "practice"
      : explicit
        ? this.snapshot.selectedMode
        : undefined;
    const effectiveMode =
      selectedMode ?? (this.hasStartedAttempt ? "practice" : "graded");
    const trialNumber = this.hasStartedAttempt
      ? this.snapshot.trialNumber + 1
      : 1;

    let inputTarget: EventTarget | null | undefined;
    if (!this.usesInjectedAudio) {
      inputTarget = this.getInputTarget();
      if (!inputTarget) {
        this.publish({
          phase: "error",
          busy: false,
          error: targetErrorMessage(),
        });
        return;
      }
    }

    // Resume is invoked synchronously while the caller still has user activation.
    const audioReady = this.beginAudioGesture();
    this.attemptStartedAt = Date.now();
    this.hasStartedAttempt = true;
    if (effectiveMode === "graded") this.gradedAttemptUsed = true;
    else this.practiceAttemptStarted = true;
    this.publish({
      busy: true,
      result: null,
      points: null,
      practice: effectiveMode === "practice",
      trialNumber,
      error: null,
    });

    let engine: TapRhythmEngine;
    if (audioReady !== null) {
      try {
        await audioReady;
      } catch {
        if (this.disposed || token !== this.operationToken) return;
        try {
          engine = this.ensureEngine(inputTarget);
          engine.failBeforeStart(effectiveMode, "audio-unavailable");
          this.observeEngine(engine);
          this.syncEngineState(engine);
        } catch {
          this.publish({
            phase: "error",
            busy: false,
            error: audioStartErrorMessage(),
          });
        } finally {
          if (!this.disposed && token === this.operationToken)
            this.setBusy(false);
        }
        return;
      }
      if (this.disposed || token !== this.operationToken) return;
    }

    let startup: Promise<void>;
    try {
      engine = this.ensureEngine(inputTarget);
      // Preserve legacy inference for old callers; explicit modes are passed through.
      startup =
        selectedMode === undefined
          ? engine.start()
          : engine.start(selectedMode);
      this.observeEngine(engine);
      this.syncEngineState(engine);
    } catch (error) {
      this.publish({
        phase: "error",
        busy: false,
        error: engineStartErrorMessage(error),
      });
      return;
    }
    try {
      await startup;
    } catch {
      if (!this.disposed && token === this.operationToken)
        this.publish({ error: audioStartErrorMessage() });
    } finally {
      if (!this.disposed && token === this.operationToken) {
        this.syncEngineState(engine);
        this.setBusy(false);
      }
    }
  }

  /** Graded reference consumes one slot; practice references are repeatable. */
  async reference(): Promise<void> {
    this.stopPreview();
    if (!this.canReference) return;
    const lesson = this.snapshot.exercise?.section === "lessons";
    const mode: TapMode = lesson
      ? "practice"
      : this.modeExplicitlySelected
        ? this.snapshot.selectedMode
        : this.hasStartedAttempt
          ? "practice"
          : "graded";
    const token = ++this.operationToken;
    if (mode === "graded") this.gradedReferenceUsed = true;
    this.publish({
      ...(mode === "graded" ? { referenceUsed: true } : {}),
      busy: true,
      phase: "reference",
      error: null,
    });

    const audioReady = this.beginAudioGesture();
    let engine: TapRhythmEngine;
    try {
      if (audioReady !== null) {
        await audioReady;
        if (this.disposed || token !== this.operationToken) return;
      }
      engine = this.ensureEngine();
    } catch {
      if (!this.disposed && token === this.operationToken) {
        this.publish({
          phase: "error",
          busy: false,
          error:
            "Không thể phát mẫu âm thanh. Lượt tham khảo đã được dùng; bạn vẫn có thể bắt đầu bài tập.",
        });
      }
      return;
    }

    let playback: Promise<void>;
    try {
      // Call the scheduler directly in the gesture handler when using test/legacy audio.
      playback = engine.playReference(mode);
      this.observeEngine(engine);
      this.syncEngineState(engine);
    } catch {
      this.publish({
        phase: "error",
        busy: false,
        error: audioStartErrorMessage(),
      });
      return;
    }
    try {
      await playback;
    } catch {
      if (!this.disposed && token === this.operationToken) {
        this.publish({
          phase: phaseForEngine(engine.state),
          error:
            "Không thể phát mẫu âm thanh. Lượt tham khảo đã được dùng; bạn vẫn có thể bắt đầu bài tập.",
        });
      }
    } finally {
      if (!this.disposed && token === this.operationToken) {
        this.syncEngineState(engine);
        this.setBusy(false);
      }
    }
  }

  /** Reuse the same engine/exercise; the engine itself enforces practice mode. */
  async retry(): Promise<void> {
    this.stopPreview();
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.engine === null ||
      !TERMINAL_ATTEMPT_STATES.includes(this.engine.state)
    )
      return;

    const token = ++this.operationToken;
    const engine = this.engine;
    this.hasStartedAttempt = true;
    this.practiceAttemptStarted = true;
    this.modeExplicitlySelected = true;
    this.attemptStartedAt = Date.now();
    this.publish({
      busy: true,
      error: null,
      result: null,
      points: null,
      practice: true,
      selectedMode: "practice",
      trialNumber: this.snapshot.trialNumber + 1,
    });

    let retrying: Promise<void>;
    try {
      // Engine.retry() synchronously delegates to its practice-only start path.
      retrying = engine.retry();
      this.observeEngine(engine);
      this.syncEngineState(engine);
    } catch {
      this.publish({
        busy: false,
        phase: phaseForEngine(engine.state),
        error: audioStartErrorMessage(),
      });
      return;
    }
    try {
      await retrying;
    } catch {
      if (!this.disposed && token === this.operationToken)
        this.publish({ error: audioStartErrorMessage() });
    } finally {
      if (!this.disposed && token === this.operationToken) {
        this.syncEngineState(engine);
        this.setBusy(false);
      }
    }
  }

  /** A new exercise always receives a new, one-question shared FREE session. */
  async continue(): Promise<void> {
    this.stopPreview();
    const emptyExerciseReady =
      this.snapshot.phase === "empty" &&
      this.engine === null &&
      this.snapshot.exercise?.targets.length === 0;
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.isEngineActive() ||
      (!emptyExerciseReady &&
        (this.engine === null ||
          !TERMINAL_ATTEMPT_STATES.includes(this.engine.state))) ||
      this.configuration === null
    )
      return;
    const token = ++this.operationToken;
    await this.loadExercise(this.configuration, token);
  }

  /** Stop an active action; its engine receipt is technical/ungraded. */
  stop(): void {
    if (this.disposed) return;
    this.stopPreview();
    ++this.operationToken;
    this.setBusy(false);
    const engine = this.engine;
    if (!engine) return;
    if (ACTIVE_ENGINE_STATES.includes(engine.state)) engine.stop();
    this.syncEngineState(engine);
  }

  /** Return/back invalidates pending setup without erasing a sealed result. */
  back(): void {
    this.stop();
  }

  /** UI flash only. No event, timestamp, count, or scoring data is accepted. */
  acknowledgeTap(): void {
    if (
      this.disposed ||
      !["count-in", "collecting", "draining"].includes(this.snapshot.phase)
    )
      return;
    this.publish({ tapVisualSequence: this.snapshot.tapVisualSequence + 1 });
  }

  /** Invalidate result callbacks before abort/disposal can emit a technical receipt. */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.stopPreview();
    this.disposed = true;
    ++this.operationToken;
    ++this.engineEpoch;
    this.stopObservation();
    const oldEngine = this.engine;
    this.engine = null;
    this.publish({ phase: "disposed", busy: false });
    if (oldEngine) {
      try {
        await oldEngine.dispose();
      } catch {
        // Disposal is best-effort cleanup; no result is allowed to escape it.
      }
    }
    if (!this.usesInjectedAudio && this.audioContext) {
      const context = this.audioContext;
      this.audioContext = null;
      this.metronomeOutput?.disconnect();
      this.metronomeOutput = null;
      if (context.state !== "closed") {
        try {
          await context.close();
        } catch {
          // Controller teardown is best-effort and must remain idempotent.
        }
      }
    }
    this.listeners.clear();
  }
}

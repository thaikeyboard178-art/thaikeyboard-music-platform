import {
  advanceRhythmSession,
  createRhythmTrainingSession,
  skipRhythmExercise,
  submitRhythmExerciseAnswer,
  type RhythmTrainingSession,
} from "../exercises/scoring";
import {
  createTapRhythmExercise,
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
import type {
  TapRoundNumber,
  TapRoundResult,
} from "../exercises/tapRoundScoring";
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
  currentRound: TapRoundNumber | null;
  skippedRounds: readonly TapRoundNumber[];
  roundResults: readonly [TapRoundResult | null, TapRoundResult | null];
  session: RhythmTrainingSession | null;
  selectedMode: TapMode;
  /** Replay attempts are rehearsals while preserving the visible mode choice. */
  replayOnly: boolean;
  /** Actual scorer delta from the most recent skip (negative for a penalty). */
  lastSkipPenalty: number | null;
  /** Current controller-owned configuration, including a Practice tempo edit. */
  configuration: TapUiConfiguration | null;
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
  "listening",
  "aligning",
  "collecting",
  "draining",
];
const TERMINAL_ATTEMPT_STATES: readonly TapEngineState[] = [
  "completed",
  "aborted",
];
const EMPTY_ROUND_RESULTS = Object.freeze([null, null]) as readonly [
  TapRoundResult | null,
  TapRoundResult | null,
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
    currentRound: null,
    skippedRounds: Object.freeze([]),
    roundResults: EMPTY_ROUND_RESULTS,
    session: null,
    selectedMode: "graded",
    replayOnly: false,
    lastSkipPenalty: null,
    configuration: null,
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

function retimedPattern(
  exercise: TapRhythmExercise,
  pulseBpm: number,
  sequence: number
): RhythmPattern {
  const pattern = exercise.pattern;
  return Object.freeze({
    ...pattern,
    id: `${pattern.id}-bpm-${pulseBpm}-${sequence}`,
    meter: Object.freeze({ ...pattern.meter }),
    tempo: Object.freeze({ ...pattern.tempo, pulseBpm }),
    measures: Object.freeze(
      pattern.measures.map(measure =>
        Object.freeze({
          ...measure,
          segments: Object.freeze(
            measure.segments.map(segment =>
              Object.freeze({
                ...segment,
                duration: Object.freeze({ ...segment.duration }),
              })
            )
          ),
        })
      )
    ),
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
  private modeLocked = false;
  private skipInFlight = false;
  private retimeSequence = 0;

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
    if (this.snapshot.replayOnly) return !this.practiceAttemptStarted;
    if (this.snapshot.exercise.section === "lessons")
      return !this.practiceAttemptStarted;
    return this.snapshot.selectedMode === "graded"
      ? !this.gradedAttemptUsed
      : !this.practiceAttemptStarted;
  }

  /** Tempo edits are allowed before Play, including an idle practice-only replay. */
  get canAdjustPracticeBpm(): boolean {
    const { exercise, session, phase } = this.snapshot;
    const idleReplay = this.snapshot.replayOnly && !this.practiceAttemptStarted;
    return (
      !this.disposed &&
      !this.snapshot.busy &&
      !this.previewBusy &&
      (!this.hasStartedAttempt || idleReplay) &&
      (phase === "ready" || phase === "idle") &&
      exercise !== null &&
      session !== null &&
      (!session.hasAnsweredCurrent || idleReplay) &&
      session.currentExercise.id === exercise.id &&
      (this.engine === null || this.engine.state === "idle")
    );
  }

  /** Skip is an explicit unanswered-item transition, including active collection. */
  get canSkipCurrentExercise(): boolean {
    const { exercise, session, phase } = this.snapshot;
    const activeAttemptState =
      this.engine !== null &&
      ["listening", "aligning", "collecting", "draining"].includes(this.engine.state) &&
      ["listening", "aligning", "collecting", "draining"].includes(phase);
    const stablePhase = ["ready", "idle", "aborted", "completed"].includes(
      phase
    );
    return (
      !this.disposed &&
      (!this.snapshot.busy || activeAttemptState) &&
      !this.previewBusy &&
      !this.skipInFlight &&
      (stablePhase || activeAttemptState) &&
      exercise !== null &&
      session !== null &&
      !session.hasAnsweredCurrent &&
      session.completedAt === null &&
      session.currentExercise.id === exercise.id
    );
  }

  /** Round skip excludes only the active round and never applies an exercise penalty. */
  get canSkipCurrentRound(): boolean {
    return (
      !this.disposed &&
      !this.snapshot.busy &&
      !this.previewBusy &&
      this.engine?.canSkipCurrentRound === true
    );
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
      this.snapshot.selectedMode === "practice" ||
      this.snapshot.replayOnly
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
      this.isEngineActive() ||
      this.modeLocked
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
    const previewConfiguration =
      this.snapshot.exercise !== null && this.configuration !== null
        ? this.configuration
        : copyConfiguration(configuration);
    const token = ++this.previewToken;
    this.previewBusy = true;
    this.publish({ busy: true, error: null });
    const audioReady = this.beginAudioGesture();
    let transport: RhythmAudioTransport | null = null;
    try {
      const exercise = await this.createExercise(
        previewConfiguration,
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
    const currentRound = engine.currentRound;
    const skippedRounds = engine.skippedRounds;
    const roundResults = engine.roundResults;
    const sameSkippedRounds =
      skippedRounds.length === this.snapshot.skippedRounds.length &&
      skippedRounds.every(
        (round, index) => round === this.snapshot.skippedRounds[index]
      );
    const sameRoundResults = roundResults.every(
      (round, index) => round === this.snapshot.roundResults[index]
    );
    if (
      phase !== this.snapshot.phase ||
      currentRound !== this.snapshot.currentRound ||
      !sameSkippedRounds ||
      !sameRoundResults
    ) {
      this.publish({ phase, currentRound, skippedRounds, roundResults });
    }
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

  /**
   * Retimes the same written exercise before Play. The production constructor
   * rebuilds all target windows from its immutable canonical pattern.
   */
  async setPracticeBpm(pulseBpm: number): Promise<boolean> {
    if (
      !Number.isFinite(pulseBpm) ||
      pulseBpm < 30 ||
      pulseBpm > 300 ||
      !this.canAdjustPracticeBpm
    )
      return false;

    const exercise = this.snapshot.exercise;
    const session = this.snapshot.session;
    const currentConfiguration = this.configuration;
    if (!exercise || !session || !currentConfiguration) return false;
    if (exercise.pattern.tempo.pulseBpm === pulseBpm) return true;
    const idleReplay = this.snapshot.replayOnly && !this.practiceAttemptStarted;
    const referenceUsed = this.snapshot.referenceUsed;

    const sequence = ++this.retimeSequence;
    const configuration = copyConfiguration({
      ...currentConfiguration,
      pulseBpm,
    });
    let nextExercise: TapRhythmExercise;
    try {
      nextExercise = createTapRhythmExercise({
        track: exercise.track,
        section: exercise.section,
        id: idleReplay ? exercise.id : `${exercise.id}-bpm-${pulseBpm}-${sequence}`,
        pattern: retimedPattern(exercise, pulseBpm, sequence),
      });
    } catch {
      return false;
    }

    this.stopPreview();
    const token = ++this.operationToken;
    this.engineEpoch += 1;
    const oldEngine = this.engine;
    this.engine = null;
    this.stopObservation();
    this.setBusy(true);
    if (oldEngine) {
      try {
        await oldEngine.dispose();
      } catch {
        // A stale idle/reference engine has already been epoch-invalidated.
      }
    }
    if (this.disposed || token !== this.operationToken) return false;

    const nextSession = idleReplay
      ? session
      : freezeSession(advanceRhythmSession(session, nextExercise));
    this.configuration = configuration;
    // Retiming is not a fresh written exercise or a new reference allowance.
    this.publish({
      phase: "ready",
      exercise: nextExercise,
      session: nextSession,
      configuration,
      result: null,
      currentRound: null,
      skippedRounds: Object.freeze([]),
      roundResults: EMPTY_ROUND_RESULTS,
      points: null,
      referenceUsed,
      busy: false,
      error: null,
    });
    return true;
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
      result.status === "completed" &&
      result.mode === "graded" &&
      result.accuracyPercent !== null &&
      result.scoreOutOfTen !== null &&
      result.scoreOutOfTen !== undefined &&
      this.snapshot.exercise?.section !== "lessons" &&
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
    } else {
      // Practice/replay, technical abort, and accuracy-less receipts are not answers.
      latestPoints = null;
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
      currentRound: null,
      skippedRounds: Object.freeze(
        (result.rounds ?? [])
          .filter(round => round.status === "skipped")
          .map(round => round.roundNumber)
      ),
      roundResults:
        result.status === "completed"
          ? (result.rounds ?? this.engine.roundResults)
          : EMPTY_ROUND_RESULTS,
      session,
      error,
    });
  }

  /** Start a fresh run with one canonical exercise and one unlimited FREE session. */
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
    this.modeLocked = false;
    this.skipInFlight = false;
    this.attemptStartedAt = 0;
    this.publish({
      phase: "preparing",
      exercise: null,
      result: null,
      currentRound: null,
      skippedRounds: Object.freeze([]),
      roundResults: EMPTY_ROUND_RESULTS,
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
      configuration,
      selectedMode: configuration.section === "lessons" ? "practice" : "graded",
      replayOnly: false,
      lastSkipPenalty: null,
    });

    try {
      if (oldEngine) await oldEngine.dispose();
      if (this.disposed || token !== this.operationToken) return;
      const seed = `${this.seedPrefix}-${++this.exerciseSequence}`;
      const exercise = await this.createExercise(configuration, seed);
      if (this.disposed || token !== this.operationToken) return;
      const session = freezeSession(
        createRhythmTrainingSession(
          { mode: "free", plannedQuestions: null },
          exercise
        )
      );
      this.publish({
        phase: exercise.targets.length === 0 ? "empty" : "ready",
        exercise,
        session,
        configuration,
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
    const effectiveMode = this.snapshot.replayOnly
      ? "practice"
      : (selectedMode ?? (this.hasStartedAttempt ? "practice" : "graded"));
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
    this.modeLocked = true;
    if (effectiveMode === "graded") this.gradedAttemptUsed = true;
    else this.practiceAttemptStarted = true;
    this.publish({
      busy: true,
      result: null,
      currentRound: null,
      skippedRounds: Object.freeze([]),
      roundResults: EMPTY_ROUND_RESULTS,
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
      startup = engine.start(
        this.snapshot.replayOnly ? "practice" : selectedMode
      );
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
    const mode: TapMode =
      this.snapshot.replayOnly || lesson
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

  /** Replace a terminal attempt with an idle engine; Play remains learner-owned. */
  async retry(): Promise<void> {
    this.stopPreview();
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.engine === null ||
      !this.isFinalizedAttempt() ||
      this.snapshot.exercise === null
    )
      return;

    const oldEngine = this.engine;
    const inputTarget = this.getInputTarget();
    if (!inputTarget) {
      this.publish({ error: targetErrorMessage() });
      return;
    }
    const token = ++this.operationToken;
    this.engineEpoch += 1;
    this.engine = null;
    this.stopObservation();
    this.practiceAttemptStarted = false;
    this.modeExplicitlySelected = true;
    this.attemptStartedAt = 0;
    this.publish({
      phase: "preparing",
      busy: true,
      error: null,
      result: null,
      currentRound: null,
      skippedRounds: Object.freeze([]),
      roundResults: EMPTY_ROUND_RESULTS,
      points: null,
      practice: false,
      replayOnly: true,
      tapVisualSequence: 0,
    });

    try {
      await oldEngine.dispose();
      if (this.disposed || token !== this.operationToken) return;
      const idleEngine = this.ensureEngine(inputTarget);
      if (idleEngine.state !== "idle")
        throw new Error("Replay engine was not created idle.");
      this.publish({
        phase: "ready",
        busy: false,
        error: null,
        result: null,
        currentRound: null,
        skippedRounds: Object.freeze([]),
        roundResults: EMPTY_ROUND_RESULTS,
        points: null,
        practice: false,
        replayOnly: true,
        tapVisualSequence: 0,
      });
    } catch {
      if (!this.disposed && token === this.operationToken) {
        this.engine = null;
        this.publish({
          phase: "error",
          busy: false,
          error: "Không thể đặt lại engine cho lượt luyện lại. Hãy mở lại bài.",
        });
      }
    }
  }

  /** Advance to a real next exercise while preserving this run's shared session. */
  async continue(): Promise<void> {
    this.stopPreview();
    const exercise = this.snapshot.exercise;
    const session = this.snapshot.session;
    const configuration = this.configuration;
    const emptyExerciseReady =
      this.snapshot.phase === "empty" &&
      this.engine === null &&
      exercise?.targets.length === 0;
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.isEngineActive() ||
      (!emptyExerciseReady &&
        (this.engine === null ||
          !TERMINAL_ATTEMPT_STATES.includes(this.engine.state))) ||
      !exercise ||
      !session ||
      !configuration ||
      session.currentExercise.id !== exercise.id
    )
      return;
    const token = ++this.operationToken;
    const oldEngine = this.engine;
    this.engineEpoch += 1;
    this.engine = null;
    this.stopObservation();
    this.publish({ phase: "preparing", busy: true, error: null, currentRound: null, skippedRounds: Object.freeze([]), roundResults: EMPTY_ROUND_RESULTS });

    try {
      if (oldEngine) await oldEngine.dispose();
      if (this.disposed || token !== this.operationToken) return;
      const seed = `${this.seedPrefix}-${++this.exerciseSequence}`;
      const nextExercise = await this.createExercise(
        copyConfiguration(configuration),
        seed
      );
      if (this.disposed || token !== this.operationToken) return;
      const nextSession = freezeSession(
        advanceRhythmSession(session, nextExercise)
      );

      this.hasStartedAttempt = false;
      this.gradedAttemptUsed = false;
      this.practiceAttemptStarted = false;
      this.gradedReferenceUsed = false;
      this.attemptStartedAt = 0;
      this.publish({
        phase: nextExercise.targets.length === 0 ? "empty" : "ready",
        exercise: nextExercise,
        session: nextSession,
        result: null,
        currentRound: null,
        skippedRounds: Object.freeze([]),
        roundResults: EMPTY_ROUND_RESULTS,
        gradedResult: null,
        points: null,
        originalPoints: null,
        referenceUsed: false,
        busy: false,
        error: null,
        trialNumber: 1,
        practice: false,
        tapVisualSequence: 0,
        replayOnly: false,
        lastSkipPenalty: null,
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

  /**
   * Skip one unanswered exercise. The UI owns any confirmation; this method
   * invalidates/aborts the current engine before generating and scoring next.
   * `lastSkipPenalty` is the signed shared-score delta (−5 for a paid skip, 0
   * for Practice), never the points awarded for an answer.
   */
  async skipCurrentExercise(): Promise<boolean> {
    this.stopPreview();
    if (!this.canSkipCurrentExercise) return false;

    const exercise = this.snapshot.exercise!;
    const session = this.snapshot.session!;
    const configuration = this.configuration;
    if (!configuration) return false;
    const kind: "graded" | "practice" =
      this.snapshot.replayOnly ||
      this.snapshot.selectedMode === "practice" ||
      this.snapshot.practice ||
      exercise.section === "lessons"
        ? "practice"
        : "graded";
    const token = ++this.operationToken;
    this.skipInFlight = true;
    this.engineEpoch += 1;
    const oldEngine = this.engine;
    this.engine = null;
    this.stopObservation();
    this.publish({ phase: "preparing", busy: true, error: null, currentRound: null, skippedRounds: Object.freeze([]), roundResults: EMPTY_ROUND_RESULTS });

    try {
      if (oldEngine) await oldEngine.dispose();
      if (this.disposed || token !== this.operationToken) return false;

      const seed = `${this.seedPrefix}-${++this.exerciseSequence}`;
      const nextExercise = await this.createExercise(
        copyConfiguration(configuration),
        seed
      );
      if (this.disposed || token !== this.operationToken) return false;

      const skipped = skipRhythmExercise(session, exercise, nextExercise, kind);
      if (skipped.status !== "skipped") {
        this.publish({
          phase: "error",
          busy: false,
          error: "Không thể bỏ qua bài tập này. Hãy thử lại hoặc mở bài mới.",
        });
        return false;
      }

      this.hasStartedAttempt = false;
      this.gradedAttemptUsed = false;
      this.practiceAttemptStarted = false;
      this.gradedReferenceUsed = false;
      this.attemptStartedAt = 0;
      this.publish({
        phase: nextExercise.targets.length === 0 ? "empty" : "ready",
        exercise: nextExercise,
        session: freezeSession(skipped.session),
        result: null,
        currentRound: null,
        skippedRounds: Object.freeze([]),
        roundResults: EMPTY_ROUND_RESULTS,
        gradedResult: null,
        points: null,
        originalPoints: null,
        referenceUsed: false,
        busy: false,
        error: null,
        trialNumber: 1,
        practice: false,
        tapVisualSequence: 0,
        replayOnly: false,
        lastSkipPenalty: skipped.scoreDelta,
      });
      return true;
    } catch {
      if (!this.disposed && token === this.operationToken) {
        this.publish({
          phase: "error",
          busy: false,
          error: preparationErrorMessage(),
        });
      }
      return false;
    } finally {
      this.skipInFlight = false;
    }
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
      !["listening", "aligning", "collecting", "draining"].includes(this.snapshot.phase)
    )
      return;
    this.publish({ tapVisualSequence: this.snapshot.tapVisualSequence + 1 });
  }

  /** Explicitly skips only the current round; no shared answer or score is created. */
  skipCurrentRound(): boolean {
    if (!this.canSkipCurrentRound || !this.engine) return false;
    if (!this.engine.skipCurrentRound()) return false;
    this.publish({
      currentRound: this.engine.currentRound,
      skippedRounds: this.engine.skippedRounds,
      roundResults: this.engine.roundResults,
    });
    return true;
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

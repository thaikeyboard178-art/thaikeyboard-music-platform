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
  TapRhythmEngine,
  type TapEngineOptions,
  type TapEngineState,
} from "../audio/tapEngine";
import type { RhythmTransportOptions } from "../audio/transport";
import type { CurriculumSection } from "../curriculum/curriculum";
import type { RhythmFocus } from "../generation/levels";
import type { RhythmMeter, RhythmTrack } from "../types";
import { TAP_UI_VOICE_SETTINGS } from "./voiceSettings";

export type TapUiConfiguration = Readonly<{
  track: RhythmTrack;
  section: CurriculumSection;
  meter?: RhythmMeter;
  bars?: 1 | 2;
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
  /** Points for the latest completed attempt (practice is always 0). */
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
  private readonly listeners = new Set<() => void>();
  private snapshot: TapUiState = initialState();
  private configuration: TapUiConfiguration | null = null;
  private engine: TapRhythmEngine | null = null;
  private observationTimer: ReturnType<typeof setInterval> | null = null;
  private operationToken = 0;
  private engineEpoch = 0;
  private exerciseSequence = 0;
  private attemptStartedAt = 0;
  private hasStartedAttempt = false;
  private disposed = false;

  constructor(options: TapTrainingControllerOptions) {
    this.getInputTarget = options.getInputTarget;
    this.transportOverrides = options.transport ?? {};
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

  /** Start remains available after an unused failed reference, never after an attempt. */
  get canStart(): boolean {
    return (
      !this.disposed &&
      !this.snapshot.busy &&
      !this.hasStartedAttempt &&
      this.snapshot.exercise !== null &&
      this.snapshot.exercise.targets.length > 0 &&
      this.snapshot.session !== null &&
      (this.engine === null || ["idle", "aborted"].includes(this.engine.state))
    );
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
    return {
      ...this.transportOverrides,
      voices: this.transportOverrides.voices ?? TAP_UI_VOICE_SETTINGS,
      visibilitySource,
    };
  }

  /** Engine and its native input listener are created only after the tap DOM exists. */
  private ensureEngine(): TapRhythmEngine {
    if (this.engine) return this.engine;
    const exercise = this.snapshot.exercise;
    if (!exercise || exercise.targets.length === 0)
      throw new Error("There is no playable Tap Rhythm exercise.");
    const inputTarget = this.getInputTarget();
    if (!inputTarget) throw new Error("Tap input target is unavailable.");

    const epoch = ++this.engineEpoch;
    let engine: TapRhythmEngine;
    engine = this.engineFactory({
      exercise,
      inputTarget,
      transport: this.engineTransport(),
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
      latestPoints = 0;
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
  async start(): Promise<void> {
    if (!this.canStart) return;

    const token = ++this.operationToken;
    this.publish({ busy: true, error: null });

    let engine: TapRhythmEngine;
    let startup: Promise<void>;
    try {
      engine = this.ensureEngine();
    } catch (error) {
      this.publish({
        phase: "error",
        busy: false,
        error:
          error instanceof Error &&
          error.message === "Tap input target is unavailable."
            ? targetErrorMessage()
            : audioStartErrorMessage(),
      });
      return;
    }
    this.attemptStartedAt = Date.now();
    this.hasStartedAttempt = true;
    this.publish({
      result: null,
      points: null,
      practice: this.snapshot.exercise?.section === "lessons",
      trialNumber: 1,
    });
    try {
      // Lessons use the existing practice-only path, not a new grading mechanism.
      // Invocation still occurs synchronously within the learner's user gesture.
      startup =
        this.snapshot.exercise?.section === "lessons"
          ? engine.retry()
          : engine.start();
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

  /** Play the single pre-attempt reference; a failure still consumes its slot. */
  async reference(): Promise<void> {
    if (
      this.disposed ||
      this.snapshot.busy ||
      this.snapshot.referenceUsed ||
      this.hasStartedAttempt ||
      !this.snapshot.exercise ||
      this.snapshot.exercise.targets.length === 0 ||
      this.snapshot.session === null ||
      (this.engine !== null && !["idle", "aborted"].includes(this.engine.state))
    )
      return;

    const token = ++this.operationToken;
    this.publish({
      referenceUsed: true,
      busy: true,
      phase: "reference",
      error: null,
    });

    let engine: TapRhythmEngine;
    let playback: Promise<void>;
    try {
      engine = this.ensureEngine();
      // Invocation itself is synchronous, before awaiting any parent/controller work.
      playback = engine.playReference();
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
    this.attemptStartedAt = Date.now();
    this.publish({
      busy: true,
      error: null,
      result: null,
      points: null,
      practice: true,
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
    if (this.disposed || !this.engine) return;
    const engine = this.engine;
    ++this.operationToken;
    this.setBusy(false);
    if (ACTIVE_ENGINE_STATES.includes(engine.state)) engine.stop();
    this.syncEngineState(engine);
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
    this.listeners.clear();
  }
}

import {
  RhythmAudioTransport,
  type RhythmTransportOptions,
  type RhythmReferenceTiming,
  type RhythmScheduledEvent,
} from "./transport";
import { createListenPlaybackPlan } from "./plan";
import { createTapReferencePlan, createTapAttemptPlan } from "./tapPlan";
import { OutputClockBridge } from "./tapClock";
import { NativeTapCapture, type CapturedTap } from "./tapInput";
import { matchTapRhythm, type TapMatchInput } from "../exercises/tapMatcher";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import {
  sealTapAttempt,
  type TapAttemptResult,
} from "../exercises/tapCompletion";

export type TapEngineState =
  | "idle"
  | "reference"
  | "starting"
  | "count-in"
  | "collecting"
  | "draining"
  | "completed"
  | "aborted"
  | "disposed";
export type TapEngineOptions = Readonly<{
  exercise: TapRhythmExercise;
  transport: RhythmTransportOptions;
  now?: () => number;
  timeOrigin?: () => number;
  inputTarget?: EventTarget;
  blurSource?: EventTarget | null;
  onResult?: (result: TapAttemptResult) => void;
  /** Set false only when an owning controller will close its shared context. */
  disposeAudioContext?: boolean;
}>;
export type TapCollectionSnapshot = Readonly<{
  generation: number;
  transportGeneration: number;
  anchorAudioTime: number;
  collectionStartAudioTime: number;
  collectionEndAudioTime: number;
  drainEndAudioTime: number;
  expectedOnsets: readonly Readonly<{
    id: string;
    tick: number;
    audioTime: number;
  }>[];
}>;

/** Headless runtime library only: no UI, routes, score mutation or extra context. */
export class TapRhythmEngine {
  readonly transport: RhythmAudioTransport;
  private readonly bridge = new OutputClockBridge();
  private readonly capture: NativeTapCapture;
  private readonly options: TapEngineOptions;
  private readonly now: () => number;
  private context: AudioContext | null = null;
  private timer: unknown = null;
  private token = 0;
  private startedOnce = false;
  private gradedAttemptStarted = false;
  private gradedReferenceUsed = false;
  private mode: "graded" | "practice" = "graded";
  private playbackEvents: RhythmScheduledEvent[] = [];
  private playbackGeneration: number | null = null;
  private stateValue: TapEngineState = "idle";
  private resultValue: TapAttemptResult | null = null;
  private snapshotValue: TapCollectionSnapshot | null = null;
  private taps: TapMatchInput[] = [];
  private raw: TapAttemptResult["rawCaptures"][number][] = [];
  private detachInput: (() => void) | null = null;
  private referenceResolve: (() => void) | null = null;
  private referenceReject: ((error: Error) => void) | null = null;
  private readonly blurred = () => this.abort("input-blur");
  private readonly hidden = () => {
    if (this.options.transport.visibilitySource?.hidden)
      this.abort("visibility-hidden");
  };

  constructor(options: TapEngineOptions) {
    this.options = options;
    this.now = options.now ?? (() => performance.now());
    const factory =
      options.transport.contextFactory ??
      (() => new AudioContext({ latencyHint: "interactive" }));
    this.transport = new RhythmAudioTransport({
      ...options.transport,
      contextFactory: () => {
        if (this.context?.state === "closed")
          throw new Error("Tap AudioContext is closed.");
        if (!this.context) this.context = factory();
        return this.context;
      },
      onScheduled: event => {
        if (this.playbackGeneration === null)
          this.playbackGeneration = event.generation;
        if (event.generation !== this.playbackGeneration) return;
        this.playbackEvents.push(event);
        options.transport.onScheduled?.(event);
      },
    });
    this.capture = new NativeTapCapture({
      now: this.now,
      timeOrigin: options.timeOrigin ?? (() => performance.timeOrigin),
      getGeneration: () => this.token,
      onTap: tap => this.accept(tap),
      onAbort: reason => this.abort(reason),
    });
    if (options.inputTarget)
      this.detachInput = this.capture.bind(options.inputTarget);
    const blurSource =
      options.blurSource === undefined
        ? typeof window === "undefined"
          ? null
          : window
        : options.blurSource;
    blurSource?.addEventListener("blur", this.blurred);
    this.options.transport.visibilitySource?.addEventListener(
      "visibilitychange",
      this.hidden
    );
  }

  get state(): TapEngineState {
    return this.stateValue;
  }
  get generation(): number {
    return this.token;
  }
  get result(): TapAttemptResult | null {
    return this.resultValue;
  }
  get snapshot(): TapCollectionSnapshot | null {
    return this.snapshotValue;
  }
  get hasPendingWakeup(): boolean {
    return this.timer !== null;
  }
  get canStartGraded(): boolean {
    return !this.gradedAttemptStarted;
  }

  /** A frozen scheduler snapshot for rendering; it is not a second clock. */
  getAudioPlayback(): Readonly<{
    audioTime: number;
    scheduledEvents: readonly RhythmScheduledEvent[];
    state: string;
  }> | null {
    if (!this.context) return null;
    return Object.freeze({
      audioTime: this.context.currentTime,
      scheduledEvents: Object.freeze([...this.playbackEvents]),
      state: this.transport.state,
    });
  }

  private clearPlaybackEvents(): void {
    this.playbackEvents = [];
    this.playbackGeneration = null;
  }

  /** Native handlers call this method; captured timestamps, not handler time, grade. */
  handleEvent(event: Event, generation = this.token): void {
    if (["count-in", "collecting", "draining"].includes(this.stateValue))
      this.capture.handle(event, generation);
  }

  private clearWake(): void {
    if (this.timer === null) return;
    if (this.options.transport.timers)
      this.options.transport.timers.clear(this.timer);
    else globalThis.clearTimeout(this.timer as ReturnType<typeof setTimeout>);
    this.timer = null;
  }
  private scheduleWake(token: number): void {
    const callback = () => this.wake(token);
    this.timer = this.options.transport.timers
      ? this.options.transport.timers.set(callback, 25)
      : globalThis.setTimeout(callback, 25);
  }
  private active(): boolean {
    return ["starting", "count-in", "collecting", "draining"].includes(
      this.stateValue
    );
  }
  private errorReason(error: unknown): string {
    return typeof error === "object" && error !== null && "reason" in error
      ? String(error.reason)
      : error instanceof Error
        ? error.message
        : "clock-invalid";
  }

  /** Graded reference is limited to one; practice references may be repeated. */
  async playReference(mode?: "practice" | "graded"): Promise<void> {
    const legacyReference = mode === undefined;
    const selectedMode = mode ?? "graded";
    if (
      !["idle", "completed", "aborted"].includes(this.stateValue) ||
      (selectedMode === "graded" &&
        (this.gradedAttemptStarted || this.gradedReferenceUsed))
    )
      throw new Error("Reference is unavailable during this engine state.");
    if (selectedMode === "graded") this.gradedReferenceUsed = true;
    this.clearPlaybackEvents();
    this.stateValue = "reference";
    const token = ++this.token;
    try {
      await this.transport.start(
        legacyReference
          ? createListenPlaybackPlan(this.options.exercise.pattern)
          : createTapReferencePlan(this.options.exercise)
      );
    } catch (error) {
      this.stateValue = "aborted";
      throw error;
    }
    if (token !== this.token || this.stateValue !== "reference") return;
    return new Promise<void>((resolve, reject) => {
      this.referenceResolve = resolve;
      this.referenceReject = reject;
      this.scheduleWake(token);
    });
  }

  async start(mode?: "practice" | "graded"): Promise<void> {
    if (this.stateValue === "disposed")
      throw new Error("Tap engine is disposed.");
    if (this.active() || this.stateValue === "reference")
      throw new Error("Cannot start or replay inside an active attempt.");
    const selectedMode = mode ?? (this.startedOnce ? "practice" : "graded");
    if (selectedMode === "graded" && this.gradedAttemptStarted)
      throw new Error("The graded attempt has already been used.");
    this.mode = selectedMode;
    if (selectedMode === "graded") this.gradedAttemptStarted = true;
    this.startedOnce = true;
    this.clearPlaybackEvents();
    this.stateValue = "starting";
    this.resultValue = null;
    this.snapshotValue = null;
    this.taps = [];
    this.raw = [];
    this.bridge.reset();
    this.clearWake();
    const token = ++this.token;
    this.capture.reset(token);
    try {
      await this.transport.start(createTapAttemptPlan(this.options.exercise));
    } catch (error) {
      if (token === this.token)
        this.abort(this.transport.abortReason ?? "audio-unavailable");
      return;
    }
    if (token !== this.token || this.stateValue !== "starting") return;
    const reference = this.transport.getReferenceTiming();
    if (!reference || !this.context) {
      this.abort(this.transport.abortReason ?? "audio-unavailable");
      return;
    }
    if (
      reference.expectedOnsets.length !== this.options.exercise.targets.length
    ) {
      this.abort("target-snapshot-mismatch");
      return;
    }
    this.snapshotValue = this.createSnapshot(reference, token);
    if (!this.snapshotValue.expectedOnsets.length) {
      this.finish();
      return;
    }
    this.stateValue = "count-in";
    this.wake(token);
  }

  /** Seal a genuine ungraded technical receipt if audio preparation fails first. */
  failBeforeStart(
    mode: "practice" | "graded",
    reason = "audio-unavailable"
  ): void {
    if (
      this.stateValue === "disposed" ||
      this.active() ||
      this.stateValue === "reference"
    )
      throw new Error("Cannot fail an active or disposed Tap engine.");
    if (mode === "graded" && this.gradedAttemptStarted)
      throw new Error("The graded attempt has already been used.");
    this.mode = mode;
    if (mode === "graded") this.gradedAttemptStarted = true;
    this.startedOnce = true;
    this.clearPlaybackEvents();
    this.resultValue = null;
    this.snapshotValue = null;
    this.taps = [];
    this.raw = [];
    this.stateValue = "starting";
    this.abort(reason);
  }

  /** Explicit retry is always practice, including after a technical abort. */
  async retry(): Promise<void> {
    if (this.active()) this.stop();
    await this.start("practice");
  }
  async replay(): Promise<void> {
    if (this.active() || this.stateValue === "reference")
      throw new Error("No reference replay during an attempt.");
    await this.retry();
  }

  private createSnapshot(
    reference: RhythmReferenceTiming,
    token: number
  ): TapCollectionSnapshot {
    const targets = this.options.exercise.targets;
    const onsets = reference.expectedOnsets;
    const first = onsets[0]?.audioTime ?? reference.anchorTime;
    const last = onsets[onsets.length - 1]?.audioTime ?? reference.anchorTime;
    const open = first - (targets[0]?.associationMs ?? 0) / 1000;
    const close =
      last + (targets[targets.length - 1]?.associationMs ?? 0) / 1000;
    return Object.freeze({
      generation: token,
      transportGeneration: reference.generation,
      anchorAudioTime: first - (targets[0]?.offsetMs ?? 0) / 1000,
      collectionStartAudioTime: open,
      collectionEndAudioTime: close,
      drainEndAudioTime: close + 0.1,
      expectedOnsets: Object.freeze(
        onsets.map((onset, index) =>
          Object.freeze({ ...onset, tick: targets[index].tick })
        )
      ),
    });
  }

  private sampleClock(): void {
    if (!this.context || this.context.state !== "running")
      throw new Error("context-interrupted");
    if (typeof this.context.getOutputTimestamp !== "function")
      throw new Error("clock-missing");
    const sample = this.context.getOutputTimestamp();
    if (
      typeof sample.contextTime !== "number" ||
      typeof sample.performanceTime !== "number"
    ) {
      throw new Error("invalid-output-timestamp");
    }
    this.bridge.record({
      contextTime: sample.contextTime,
      performanceTime: sample.performanceTime,
    });
  }

  private wake(token: number): void {
    if (token !== this.token) return;
    this.timer = null;
    if (this.stateValue === "reference") {
      if (
        this.transport.state === "aborted" ||
        this.transport.state === "stopped"
      ) {
        const reject = this.referenceReject;
        this.referenceResolve = null;
        this.referenceReject = null;
        this.stateValue = "aborted";
        reject?.(new Error(this.transport.abortReason ?? "reference-stopped"));
        return;
      }
      if (this.transport.state === "completed") {
        const resolve = this.referenceResolve;
        this.referenceResolve = null;
        this.referenceReject = null;
        this.stateValue = "idle";
        resolve?.();
        return;
      }
      this.scheduleWake(token);
      return;
    }
    if (!this.active() || !this.snapshotValue || !this.context) return;
    const snapshot = this.snapshotValue;
    if (this.transport.state === "aborted") {
      this.abort(this.transport.abortReason ?? "audio-aborted");
      return;
    }
    if (["stopped", "paused", "disposed"].includes(this.transport.state)) {
      this.abort("transport-cancelled");
      return;
    }
    const live = this.transport.getReferenceTiming();
    if (live && live.generation !== snapshot.transportGeneration) {
      this.abort("generation-mismatch");
      return;
    }
    const nowAudio = this.context.currentTime;
    try {
      this.sampleClock();
    } catch (error) {
      // A newly resumed graph can emit zero pairs before its first output frame.
      // This warm-up never admits taps; by collection opening it must be usable.
      if (nowAudio >= snapshot.collectionStartAudioTime || this.bridge.latest) {
        this.abort(this.errorReason(error));
        return;
      }
      this.bridge.reset();
    }
    if (nowAudio >= snapshot.collectionStartAudioTime) {
      try {
        this.bridge.sampleForEvent(this.now());
      } catch (error) {
        this.abort(this.errorReason(error));
        return;
      }
      this.stateValue =
        nowAudio > snapshot.collectionEndAudioTime ? "draining" : "collecting";
    }
    if (nowAudio >= snapshot.drainEndAudioTime) {
      this.finish();
      return;
    }
    this.scheduleWake(token);
  }

  private accept(tap: CapturedTap): void {
    if (
      !this.active() ||
      tap.generation !== this.token ||
      !this.snapshotValue ||
      !this.context
    )
      return;
    const snapshot = this.snapshotValue;
    if (this.context.currentTime > snapshot.drainEndAudioTime) return;
    try {
      this.sampleClock();
      const sample = this.bridge.sampleForEvent(tap.performanceMs);
      const tapAudio = this.bridge.performanceToAudioSeconds(
        tap.performanceMs,
        sample
      );
      if (
        tapAudio < snapshot.collectionStartAudioTime ||
        tapAudio > snapshot.collectionEndAudioTime
      )
        return;
      const live = this.transport.getReferenceTiming();
      if (
        this.transport.state === "aborted" ||
        (live && live.generation !== snapshot.transportGeneration)
      ) {
        this.abort(this.transport.abortReason ?? "generation-mismatch");
        return;
      }
      this.taps.push(
        Object.freeze({
          sequence: tap.sequence,
          offsetMs: (tapAudio - snapshot.anchorAudioTime) * 1000,
        })
      );
      this.raw.push(
        Object.freeze({
          ...tap,
          sampleContextTime: sample.contextTime,
          samplePerformanceTime: sample.performanceTime,
        })
      );
    } catch (error) {
      if (this.context.currentTime >= snapshot.collectionStartAudioTime)
        this.abort(this.errorReason(error));
    }
  }

  private emit(result: TapAttemptResult): void {
    this.resultValue = result;
    this.options.onResult?.(result);
  }
  private finish(): void {
    if (!this.snapshotValue || !this.active()) return;
    this.clearWake();
    let evaluation;
    try {
      evaluation = matchTapRhythm(this.options.exercise.targets, this.taps);
    } catch (error) {
      this.abort(this.errorReason(error));
      return;
    }
    const result = sealTapAttempt({
      exerciseId: this.options.exercise.id,
      generation: this.token,
      mode: this.mode,
      status: "completed",
      reason: null,
      targetTicks: this.options.exercise.targets.map(target => target.tick),
      taps: this.taps,
      evaluation,
      accuracyPercent: evaluation.accuracyPercent,
      rawCaptures: this.raw,
    });
    this.stateValue = "completed";
    this.transport.stop();
    this.emit(result);
  }
  private abort(reason: string): void {
    if (!this.active() && this.stateValue !== "reference") return;
    this.clearWake();
    const generation = this.token++;
    this.capture.reset(this.token);
    this.stateValue = "aborted";
    if (this.transport.state !== "disposed") this.transport.stop();
    const reject = this.referenceReject;
    this.referenceResolve = null;
    this.referenceReject = null;
    reject?.(new Error(reason));
    this.emit(
      sealTapAttempt({
        exerciseId: this.options.exercise.id,
        generation,
        mode: this.mode,
        status: "technical-abort",
        reason,
        targetTicks: this.options.exercise.targets.map(target => target.tick),
        taps: this.taps,
        evaluation: null,
        accuracyPercent: null,
        rawCaptures: this.raw,
      })
    );
  }
  stop(): void {
    this.clearPlaybackEvents();
    this.abort("stopped");
  }
  pause(): void {
    this.abort("paused");
  }
  async dispose(): Promise<void> {
    if (this.stateValue === "disposed") return;
    this.clearPlaybackEvents();
    this.abort("disposed");
    this.clearWake();
    this.token++;
    this.detachInput?.();
    this.detachInput = null;
    const blurSource =
      this.options.blurSource === undefined
        ? typeof window === "undefined"
          ? null
          : window
        : this.options.blurSource;
    blurSource?.removeEventListener("blur", this.blurred);
    this.options.transport.visibilitySource?.removeEventListener(
      "visibilitychange",
      this.hidden
    );
    if (this.options.disposeAudioContext === false) this.transport.stop();
    else await this.transport.dispose();
    this.stateValue = "disposed";
  }
}

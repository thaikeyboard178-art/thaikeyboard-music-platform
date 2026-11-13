import {
  RhythmAudioTransport,
  type RhythmTransportOptions,
  type RhythmReferenceTiming,
  type RhythmScheduledEvent,
} from "./transport";
import { createListenPlaybackPlan } from "./plan";
import {
  createTapReferencePlan,
  createTapAttemptPlan,
  DEFAULT_TAP_COUNT_IN_BARS,
  requireTapCountInBars,
  type TapCountInBars,
} from "./tapPlan";
import { OutputClockBridge } from "./tapClock";
import { NativeTapCapture, type CapturedTap } from "./tapInput";
import type { TapMatchInput } from "../exercises/tapMatcher";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import {
  calculateTapRoundResult,
  calculateTapTwoRoundScore,
  type TapRoundInput,
  type TapRoundNumber,
  type TapRoundResult,
} from "../exercises/tapRoundScoring";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
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
export type TapRoundSnapshot = Readonly<{
  roundNumber: TapRoundNumber;
  startAudioTime: number;
  endAudioTime: number;
  anchorAudioTime: number;
  collectionStartAudioTime: number;
  collectionEndAudioTime: number;
  drainEndAudioTime: number;
  expectedOnsets: readonly Readonly<{
    id: string;
    tick: number;
    audioTime: number;
    targetIndex: number;
  }>[];
}>;
export type TapCollectionSnapshot = Readonly<{
  generation: number;
  transportGeneration: number;
  countInBars: TapCountInBars;
  countInStartAudioTime: number;
  exerciseStartAudioTime: number;
  anchorAudioTime: number;
  collectionStartAudioTime: number;
  collectionEndAudioTime: number;
  drainEndAudioTime: number;
  planEndAudioTime: number;
  rounds: readonly [TapRoundSnapshot, TapRoundSnapshot];
  expectedOnsets: readonly Readonly<{
    id: string;
    tick: number;
    audioTime: number;
    roundNumber: TapRoundNumber;
    targetIndex: number;
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
  private countInBars: TapCountInBars = DEFAULT_TAP_COUNT_IN_BARS;
  private playbackEvents: RhythmScheduledEvent[] = [];
  private playbackGeneration: number | null = null;
  private stateValue: TapEngineState = "idle";
  private resultValue: TapAttemptResult | null = null;
  private snapshotValue: TapCollectionSnapshot | null = null;
  private roundTaps: [TapMatchInput[], TapMatchInput[]] = [[], []];
  private roundRaw: [
    TapAttemptResult["rawCaptures"][number][],
    TapAttemptResult["rawCaptures"][number][],
  ] = [[], []];
  private roundResultsValue = Object.freeze([null, null]) as readonly [
    TapRoundResult | null,
    TapRoundResult | null,
  ];
  private readonly skippedRoundNumbers = new Set<TapRoundNumber>();
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
        const currentAudioTime = this.context?.currentTime ?? event.startTime;
        this.playbackEvents = this.playbackEvents.filter(
          scheduled => scheduled.endTime >= currentAudioTime - 0.5
        );
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
  get currentRound(): TapRoundNumber | null {
    const snapshot = this.snapshotValue;
    const context = this.context;
    if (!snapshot || !context || !this.active()) return null;
    const nowAudio = context.currentTime;
    if (
      nowAudio >= snapshot.rounds[0].startAudioTime &&
      nowAudio < snapshot.rounds[0].endAudioTime
    ) {
      return 1;
    }
    if (
      nowAudio >= snapshot.rounds[1].startAudioTime &&
      nowAudio < snapshot.rounds[1].endAudioTime
    ) {
      return 2;
    }
    return null;
  }
  get skippedRounds(): readonly TapRoundNumber[] {
    return Object.freeze([...this.skippedRoundNumbers].sort());
  }
  get roundResults(): readonly [TapRoundResult | null, TapRoundResult | null] {
    return this.roundResultsValue;
  }
  get canSkipCurrentRound(): boolean {
    const roundNumber = this.currentRound;
    return (
      roundNumber !== null &&
      !this.skippedRoundNumbers.has(roundNumber) &&
      this.roundResultsValue[roundNumber - 1] === null
    );
  }
  /** Marks only the musically current round; transport and clock keep running. */
  skipCurrentRound(): boolean {
    if (!this.canSkipCurrentRound) return false;
    const roundNumber = this.currentRound;
    if (roundNumber === null) return false;
    this.skippedRoundNumbers.add(roundNumber);
    const index = roundNumber - 1;
    this.roundTaps[index] = [];
    this.roundRaw[index] = [];
    this.setRoundResult(
      roundNumber,
      calculateTapRoundResult(
        this.options.exercise.targets,
        { roundNumber, skipped: true, taps: [] },
        this.canonicalPulseDurationMs()
      )
    );
    return true;
  }

  private setRoundResult(
    roundNumber: TapRoundNumber,
    result: TapRoundResult
  ): void {
    const next: [TapRoundResult | null, TapRoundResult | null] = [
      ...this.roundResultsValue,
    ];
    next[roundNumber - 1] = result;
    this.roundResultsValue = Object.freeze(next);
  }

  private canonicalPulseDurationMs(): number | null {
    const meter = deriveMeter(this.options.exercise.pattern.meter);
    const pulseMs =
      ticksToSeconds(
        meter.pulseTicks,
        this.options.exercise.pattern.meter,
        this.options.exercise.pattern.tempo.pulseBpm
      ) * 1000;
    return Number.isFinite(pulseMs) && pulseMs > 0 ? pulseMs : null;
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

  async start(
    mode?: "practice" | "graded",
    countInBars: TapCountInBars = DEFAULT_TAP_COUNT_IN_BARS
  ): Promise<void> {
    if (this.stateValue === "disposed")
      throw new Error("Tap engine is disposed.");
    if (this.active() || this.stateValue === "reference")
      throw new Error("Cannot start or replay inside an active attempt.");
    const selectedMode = mode ?? (this.startedOnce ? "practice" : "graded");
    if (selectedMode === "graded" && this.gradedAttemptStarted)
      throw new Error("The graded attempt has already been used.");
    this.countInBars = requireTapCountInBars(countInBars);
    this.mode = selectedMode;
    if (selectedMode === "graded") this.gradedAttemptStarted = true;
    this.startedOnce = true;
    this.clearPlaybackEvents();
    this.stateValue = "starting";
    this.resultValue = null;
    this.snapshotValue = null;
    this.roundTaps = [[], []];
    this.roundRaw = [[], []];
    this.roundResultsValue = Object.freeze([null, null]);
    this.skippedRoundNumbers.clear();
    this.bridge.reset();
    this.clearWake();
    const token = ++this.token;
    this.capture.reset(token);
    try {
      await this.transport.start(
        createTapAttemptPlan(this.options.exercise, this.countInBars)
      );
      if (token !== this.token || this.stateValue !== "starting") return;
      if (!this.context) {
        this.abort("generation-mismatch");
        return;
      }
      const reference = this.transport.getReferenceTiming();
      if (!reference) {
        this.abort("reference-timing-unavailable");
        return;
      }
      this.snapshotValue = this.createSnapshot(reference, token);
      this.stateValue = "count-in";
      this.wake(token);
    } catch (error) {
      if (token === this.token)
        this.abort(this.transport.abortReason ?? this.errorReason(error));
    }
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
    this.roundTaps = [[], []];
    this.roundRaw = [[], []];
    this.roundResultsValue = Object.freeze([null, null]);
    this.skippedRoundNumbers.clear();
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
    const targetCount = targets.length;
    const meter = deriveMeter(this.options.exercise.pattern.meter);
    const countInStartAudioTime = reference.anchorTime;
    const exerciseStartAudioTime =
      reference.anchorTime +
      ticksToSeconds(
        this.countInBars * meter.measureTicks,
        this.options.exercise.pattern.meter,
        this.options.exercise.pattern.tempo.pulseBpm
      );
    if (targetCount === 0) {
      const makeEmptyRound = (roundNumber: TapRoundNumber): TapRoundSnapshot =>
        Object.freeze({
          roundNumber,
          startAudioTime: reference.anchorTime,
          endAudioTime: reference.anchorTime,
          anchorAudioTime: reference.anchorTime,
          collectionStartAudioTime: reference.anchorTime,
          collectionEndAudioTime: reference.anchorTime,
          drainEndAudioTime: reference.anchorTime + 0.1,
          expectedOnsets: Object.freeze([]),
        });
      const rounds = Object.freeze([
        makeEmptyRound(1),
        makeEmptyRound(2),
      ]) as readonly [TapRoundSnapshot, TapRoundSnapshot];
      return Object.freeze({
        generation: token,
        transportGeneration: reference.generation,
        countInBars: this.countInBars,
        countInStartAudioTime,
        exerciseStartAudioTime,
        anchorAudioTime: reference.anchorTime,
        collectionStartAudioTime: reference.anchorTime,
        collectionEndAudioTime: reference.anchorTime,
        drainEndAudioTime: reference.anchorTime + 0.1,
        planEndAudioTime: reference.anchorTime,
        rounds,
        expectedOnsets: Object.freeze([]),
      });
    }
    if (onsets.length !== targetCount * 2) {
      throw new RangeError("A Tap attempt needs two complete onset grids.");
    }
    const rawRounds = [onsets.slice(0, targetCount), onsets.slice(targetCount)];
    const roundAnchors = rawRounds.map((round, roundIndex) => {
      const firstTarget = targets[0];
      const firstOnset = round[0];
      if (!firstTarget || !firstOnset)
        throw new RangeError("A Tap round has no first target onset.");
      const anchor = firstOnset.audioTime - firstTarget.offsetMs / 1000;
      if (!Number.isFinite(anchor))
        throw new RangeError(
          `Tap round ${roundIndex + 1} has an invalid anchor.`
        );
      return anchor;
    });
    const roundDuration = roundAnchors[1] - roundAnchors[0];
    if (!(Number.isFinite(roundDuration) && roundDuration > 0)) {
      throw new RangeError("Tap round anchors are not increasing.");
    }
    const lastTarget = targets[targetCount - 1];
    const firstRoundLastOnset = rawRounds[0][targetCount - 1];
    const secondRoundFirstOnset = rawRounds[1][0];
    if (!lastTarget || !firstRoundLastOnset || !secondRoundFirstOnset) {
      throw new RangeError("A Tap round has an incomplete onset grid.");
    }
    const midpoint =
      (firstRoundLastOnset.audioTime + secondRoundFirstOnset.audioTime) / 2;
    const mappedOnsets = onsets.map((onset, index) => {
      const roundNumber: TapRoundNumber = index < targetCount ? 1 : 2;
      const targetIndex = index % targetCount;
      return Object.freeze({
        ...onset,
        tick: targets[targetIndex].tick,
        roundNumber,
        targetIndex,
      });
    });
    const roundSnapshots = rawRounds.map((rawOnsets, roundIndex) => {
      const roundNumber = (roundIndex + 1) as TapRoundNumber;
      const roundOnsets = mappedOnsets.slice(
        roundIndex * targetCount,
        (roundIndex + 1) * targetCount
      );
      const firstOnset = rawOnsets[0];
      const lastOnset = rawOnsets[targetCount - 1];
      if (!firstOnset || !lastOnset)
        throw new RangeError("A Tap round has an incomplete onset grid.");
      const collectionStart =
        firstOnset.audioTime - targets[0].associationMs / 1000;
      const naturalCollectionEnd =
        lastOnset.audioTime + lastTarget.associationMs / 1000;
      const collectionEnd =
        roundIndex === 0
          ? Math.min(naturalCollectionEnd, midpoint)
          : naturalCollectionEnd;
      const roundStart = roundAnchors[roundIndex];
      return Object.freeze({
        roundNumber,
        startAudioTime: roundStart,
        endAudioTime: roundStart + roundDuration,
        anchorAudioTime: roundStart,
        collectionStartAudioTime:
          roundIndex === 1
            ? Math.max(collectionStart, midpoint)
            : collectionStart,
        collectionEndAudioTime: collectionEnd,
        drainEndAudioTime: collectionEnd + 0.1,
        expectedOnsets: Object.freeze(
          roundOnsets.map(onset =>
            Object.freeze({
              id: onset.id,
              tick: onset.tick,
              audioTime: onset.audioTime,
              targetIndex: onset.targetIndex,
            })
          )
        ),
      });
    }) as [TapRoundSnapshot, TapRoundSnapshot];
    const rounds = Object.freeze(roundSnapshots) as readonly [
      TapRoundSnapshot,
      TapRoundSnapshot,
    ];
    const open = rounds[0].collectionStartAudioTime;
    const close = rounds[1].collectionEndAudioTime;
    return Object.freeze({
      generation: token,
      transportGeneration: reference.generation,
      countInBars: this.countInBars,
      countInStartAudioTime,
      exerciseStartAudioTime,
      anchorAudioTime: rounds[0].anchorAudioTime,
      collectionStartAudioTime: open,
      collectionEndAudioTime: close,
      drainEndAudioTime: close + 0.1,
      planEndAudioTime: rounds[1].endAudioTime,
      rounds,
      expectedOnsets: Object.freeze(mappedOnsets),
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
    if (!this.active() || !this.context) return;
    if (this.transport.state === "aborted") {
      this.abort(this.transport.abortReason ?? "audio-aborted");
      return;
    }
    if (["stopped", "paused", "disposed"].includes(this.transport.state)) {
      this.abort("transport-cancelled");
      return;
    }
    const live = this.transport.getReferenceTiming();
    if (
      this.snapshotValue &&
      live &&
      live.generation !== this.snapshotValue.transportGeneration
    ) {
      this.abort("generation-mismatch");
      return;
    }
    const nowAudio = this.context.currentTime;
    const snapshot = this.snapshotValue;
    if (!snapshot) return;
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
    }
    if (nowAudio >= snapshot.exerciseStartAudioTime) {
      this.stateValue =
        nowAudio > snapshot.collectionEndAudioTime ? "draining" : "collecting";
    }
    this.finalizeClosedRounds(nowAudio);
    if (nowAudio >= snapshot.drainEndAudioTime) {
      if (this.transport.state === "completed") this.finish();
      else this.scheduleWake(token);
      return;
    }
    this.scheduleWake(token);
  }

  private finalizeClosedRounds(nowAudio: number): void {
    const snapshot = this.snapshotValue;
    if (!snapshot) return;
    for (const round of snapshot.rounds) {
      const index = round.roundNumber - 1;
      if (
        this.roundResultsValue[index] !== null ||
        nowAudio < Math.max(round.endAudioTime, round.drainEndAudioTime)
      )
        continue;
      this.setRoundResult(
        round.roundNumber,
        calculateTapRoundResult(
          this.options.exercise.targets,
          {
            roundNumber: round.roundNumber,
            skipped: this.skippedRoundNumbers.has(round.roundNumber),
            taps: this.roundTaps[index],
          },
          this.canonicalPulseDurationMs()
        )
      );
    }
  }

  private accept(tap: CapturedTap): void {
    if (!this.active() || tap.generation !== this.token || !this.context)
      return;
    const snapshot = this.snapshotValue;
    if (!snapshot) return;
    if (this.context.currentTime > snapshot.drainEndAudioTime) return;
    try {
      this.sampleClock();
      const sample = this.bridge.sampleForEvent(tap.performanceMs);
      const tapAudio = this.bridge.performanceToAudioSeconds(
        tap.performanceMs,
        sample
      );
      const round = snapshot.rounds.find((candidate, index) => {
        const afterStart = tapAudio >= candidate.collectionStartAudioTime;
        const next = snapshot.rounds[index + 1];
        const boundaryTie =
          index === 0 &&
          next !== undefined &&
          candidate.collectionEndAudioTime === next.collectionStartAudioTime;
        const beforeEnd = boundaryTie
          ? tapAudio < candidate.collectionEndAudioTime
          : tapAudio <= candidate.collectionEndAudioTime;
        return (
          afterStart &&
          beforeEnd &&
          this.context!.currentTime < candidate.drainEndAudioTime
        );
      });
      if (
        !round ||
        this.skippedRoundNumbers.has(round.roundNumber) ||
        this.roundResultsValue[round.roundNumber - 1] !== null
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
      const roundIndex = round.roundNumber - 1;
      this.roundTaps[roundIndex].push(
        Object.freeze({
          sequence: tap.sequence,
          offsetMs: (tapAudio - round.anchorAudioTime) * 1000,
        })
      );
      this.roundRaw[roundIndex].push(
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
    if (this.transport.state !== "completed") return;
    this.clearWake();
    let score;
    try {
      const canonicalPulseMs = this.canonicalPulseDurationMs();
      const rounds: readonly TapRoundInput[] = this.snapshotValue.rounds.map(
        (round, index) => ({
          roundNumber: round.roundNumber,
          skipped: this.skippedRoundNumbers.has(round.roundNumber),
          taps: this.roundTaps[index],
        })
      );
      score = calculateTapTwoRoundScore(
        this.options.exercise.targets,
        rounds,
        canonicalPulseMs
      );
    } catch (error) {
      this.abort(this.errorReason(error));
      return;
    }
    this.roundResultsValue = score.rounds;
    const firstPlayed = score.rounds.find(round => round.status === "played");
    const result = sealTapAttempt({
      exerciseId: this.options.exercise.id,
      generation: this.token,
      mode: this.mode,
      status: "completed",
      reason: null,
      targetTicks: this.options.exercise.targets.map(target => target.tick),
      taps: firstPlayed?.taps ?? [],
      evaluation: firstPlayed?.evaluation ?? null,
      accuracyPercent: score.overallAccuracyPercent,
      scoreOutOfTen: score.scoreOutOfTen,
      rounds: score.rounds,
      rawCaptures: this.roundRaw.flat(),
    });
    this.stateValue = "completed";
    // Results are sealed only after both the final collection drain and the
    // complete finite metronome plan; explicit abort still stops immediately.
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
        taps: this.roundTaps.flat(),
        evaluation: null,
        accuracyPercent: null,
        scoreOutOfTen: null,
        rawCaptures: this.roundRaw.flat(),
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

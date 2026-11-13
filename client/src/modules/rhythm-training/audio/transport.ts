import type { RhythmAudioEvent, RhythmAudioPlan } from "./plan";
import {
  scheduleRhythmVoice,
  validateVoiceSettings,
  type RhythmVoiceHandle,
  type RhythmVoiceSettings,
} from "./voices";

export type RhythmPlaybackState =
  | "idle"
  | "starting"
  | "playing"
  | "paused"
  | "stopped"
  | "completed"
  | "aborted"
  | "disposed";
export type RhythmAudioAbortReason =
  | "audio-unavailable"
  | "audio-blocked"
  | "context-interrupted"
  | "visibility-hidden"
  | "output-route-change"
  | "scheduler-starved"
  | "scheduling-error";
export type RhythmScheduledEvent = Readonly<{
  generation: number;
  event: RhythmAudioEvent;
  startTime: number;
  endTime: number;
  resumedSustain: boolean;
}>;
export type RhythmReferenceTiming = Readonly<{
  generation: number;
  clock: "audio-context-seconds";
  anchorTime: number;
  expectedOnsets: readonly Readonly<{
    id: string;
    tick: number;
    audioTime: number;
  }>[];
}>;
export type RhythmLoopTiming = Readonly<{
  generation: number;
  clock: "audio-context-seconds";
  anchorTime: number;
  cycleSeconds: number;
  cycleTicks: number;
}>;
export type RhythmTransportOptions = Readonly<{
  voices: RhythmVoiceSettings;
  /** Engineering configuration, not Tap tolerance or a product timing grade. */
  lookAheadSeconds?: number;
  wakeIntervalMs?: number;
  startLeadSeconds?: number;
  contextFactory?: () => AudioContext;
  timers?: Readonly<{
    set: (callback: () => void, delayMs: number) => unknown;
    clear: (handle: unknown) => void;
  }>;
  visibilitySource?: Pick<
    Document,
    "hidden" | "addEventListener" | "removeEventListener"
  > | null;
  onScheduled?: (event: RhythmScheduledEvent) => void;
}>;

/** One reusable context per transport; no frontend/catalog or scoring binding. */
export class RhythmAudioTransport {
  private readonly options: RhythmTransportOptions;
  private readonly horizon: number;
  private readonly interval: number;
  private readonly lead: number;
  private context: AudioContext | null = null;
  private plan: RhythmAudioPlan | null = null;
  private loopPlan: RhythmAudioPlan | null = null;
  private loopAnchor = 0;
  private loopCycle = 0;
  private loopCursor = 0;
  private loopStopAt: number | null = null;
  private continuationPlan: RhythmAudioPlan | null = null;
  private continuationAnchor: number | null = null;
  private continuationEvents: readonly RhythmAudioEvent[] = Object.freeze([]);
  private continuationCursor = 0;
  private loopVoices = new Map<
    RhythmVoiceHandle,
    Readonly<{ startTime: number; boundaryPulse: boolean }>
  >();
  private voices = new Set<RhythmVoiceHandle>();
  private timer: unknown = null;
  private generation = 0;
  private cursor = 0;
  private anchor = 0;
  private position = 0;
  private lastWake = 0;
  private stateValue: RhythmPlaybackState = "idle";
  private reasonValue: RhythmAudioAbortReason | null = null;
  private readonly visibility: RhythmTransportOptions["visibilitySource"];
  private readonly contextChanged = () => {
    if (this.stateValue === "playing" && this.context?.state !== "running")
      this.abort("context-interrupted");
  };
  private readonly routeChanged = () => {
    if (this.stateValue === "playing") this.abort("output-route-change");
  };
  private readonly visibilityChanged = () => {
    if (
      this.visibility?.hidden &&
      ["starting", "playing", "paused"].includes(this.stateValue)
    )
      this.abort("visibility-hidden");
  };

  constructor(options: RhythmTransportOptions) {
    validateVoiceSettings(options.voices);
    this.options = Object.freeze({
      ...options,
      voices: Object.freeze({
        pattern: Object.freeze({ ...options.voices.pattern }),
        metronome: Object.freeze({ ...options.voices.metronome }),
      }),
    });
    this.horizon = options.lookAheadSeconds ?? 0.2;
    this.interval = options.wakeIntervalMs ?? 25;
    this.lead = options.startLeadSeconds ?? 0.05;
    if (
      !Number.isFinite(this.horizon) ||
      this.horizon <= 0 ||
      this.horizon > 1 ||
      !Number.isFinite(this.interval) ||
      this.interval <= 0 ||
      this.interval / 1000 >= this.horizon ||
      !Number.isFinite(this.lead) ||
      this.lead <= 0 ||
      this.lead >= this.horizon
    )
      throw new RangeError(
        "Invalid bounded scheduler engineering configuration."
      );
    this.visibility =
      options.visibilitySource === undefined
        ? typeof document === "undefined"
          ? null
          : document
        : options.visibilitySource;
    this.visibility?.addEventListener(
      "visibilitychange",
      this.visibilityChanged
    );
  }

  get state(): RhythmPlaybackState {
    return this.stateValue;
  }
  get abortReason(): RhythmAudioAbortReason | null {
    return this.reasonValue;
  }
  get activeVoiceCount(): number {
    return this.voices.size;
  }
  get hasPendingWakeup(): boolean {
    return this.timer !== null;
  }
  private isPlaying(): boolean {
    return this.stateValue === "playing";
  }

  private assertUsable(): void {
    if (this.stateValue === "disposed")
      throw new Error("Rhythm audio transport is disposed.");
  }

  private cancelGeneration(): void {
    this.generation += 1;
    if (this.timer !== null) {
      if (this.options.timers) this.options.timers.clear(this.timer);
      else globalThis.clearTimeout(this.timer as ReturnType<typeof setTimeout>);
      this.timer = null;
    }
    for (const voice of [...this.voices]) voice.cancel();
    this.voices.clear();
    this.loopVoices.clear();
  }

  private resetLoopState(): void {
    this.loopPlan = null;
    this.loopAnchor = 0;
    this.loopCycle = 0;
    this.loopCursor = 0;
    this.loopStopAt = null;
    this.continuationPlan = null;
    this.continuationAnchor = null;
    this.continuationEvents = Object.freeze([]);
    this.continuationCursor = 0;
    this.loopVoices.clear();
  }

  private abort(reason: RhythmAudioAbortReason): void {
    this.cancelGeneration();
    this.reasonValue = reason;
    this.stateValue = "aborted";
  }

  /** Explicit technical invalidation is never a learner answer or shared score. */
  invalidate(reason: RhythmAudioAbortReason): void {
    this.assertUsable();
    this.abort(reason);
  }

  private getContext(): AudioContext {
    if (this.context?.state === "closed") {
      this.detachContext();
      this.context = null;
    }
    if (!this.context) {
      const factory =
        this.options.contextFactory ??
        (() => {
          const host = globalThis as typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          };
          const Constructor = host.AudioContext ?? host.webkitAudioContext;
          if (!Constructor) throw new Error("Web Audio is unavailable.");
          return new Constructor({ latencyHint: "interactive" });
        });
      this.context = factory();
      this.context.addEventListener("statechange", this.contextChanged);
      this.context.addEventListener("sinkchange", this.routeChanged);
    }
    return this.context;
  }

  private detachContext(): void {
    this.context?.removeEventListener("statechange", this.contextChanged);
    this.context?.removeEventListener("sinkchange", this.routeChanged);
  }

  /** Call from a user gesture; autoplay errors are observable, never swallowed. */
  async start(plan: RhythmAudioPlan): Promise<void> {
    this.assertUsable();
    this.cancelGeneration();
    this.resetLoopState();
    this.plan = plan;
    this.position = 0;
    this.reasonValue = null;
    this.stateValue = "starting";
    await this.begin();
  }

  /** Starts an indefinitely repeating, one-measure metronome on one generation. */
  async startLoop(plan: RhythmAudioPlan): Promise<RhythmLoopTiming> {
    this.assertUsable();
    if (
      plan.pattern.measures.length !== 1 ||
      plan.durationSeconds <= 0 ||
      !Number.isFinite(plan.durationSeconds) ||
      plan.totalTicks <= 0 ||
      plan.events.length === 0 ||
      plan.events.some(event => event.lane !== "metronome")
    )
      throw new RangeError("A metronome loop must be one complete metronome-only measure.");
    this.cancelGeneration();
    this.resetLoopState();
    this.plan = plan;
    this.loopPlan = plan;
    this.position = 0;
    this.reasonValue = null;
    this.stateValue = "starting";
    const token = this.generation;
    await this.begin();
    if (token !== this.generation || !this.isPlaying())
      throw new Error(this.reasonValue ?? "metronome-loop-start-failed");
    return Object.freeze({
      generation: token,
      clock: "audio-context-seconds",
      anchorTime: this.loopAnchor,
      cycleSeconds: plan.durationSeconds,
      cycleTicks: plan.totalTicks,
    });
  }

  appendPlanAtLoopBoundary(
    plan: RhythmAudioPlan,
    startAudioTime: number
  ): RhythmReferenceTiming {
    this.assertUsable();
    const loop = this.loopPlan;
    const context = this.context;
    if (
      !loop ||
      !context ||
      this.stateValue !== "playing" ||
      this.loopStopAt !== null ||
      this.continuationPlan !== null
    )
      throw new Error("There is no active metronome loop to continue.");
    if (
      !Number.isFinite(startAudioTime) ||
      !Number.isFinite(plan.durationSeconds) ||
      plan.durationSeconds <= 0 ||
      plan.events.length === 0
    )
      throw new RangeError("The continuation plan or barline is invalid.");
    const cyclePosition = (startAudioTime - this.loopAnchor) / loop.durationSeconds;
    const nearestCycle = Math.round(cyclePosition);
    const epsilon = 1e-7;
    if (
      nearestCycle < 0 ||
      Math.abs(cyclePosition - nearestCycle) * loop.durationSeconds > epsilon
    )
      throw new RangeError("The continuation must start on a loop barline.");
    const boundaryWasScheduled = [...this.loopVoices.values()].some(
      voice =>
        voice.boundaryPulse &&
        Math.abs(voice.startTime - startAudioTime) <= epsilon
    );
    if (
      startAudioTime < context.currentTime - epsilon &&
      !boundaryWasScheduled
    )
      throw new Error("The requested metronome downbeat is no longer schedulable.");
    this.loopStopAt = startAudioTime;
    for (const [voice, scheduled] of this.loopVoices) {
      if (
        scheduled.startTime >= startAudioTime - epsilon &&
        !(scheduled.boundaryPulse &&
          Math.abs(scheduled.startTime - startAudioTime) <= epsilon)
      ) {
        voice.cancel();
        this.voices.delete(voice);
        this.loopVoices.delete(voice);
      }
    }
    this.continuationPlan = plan;
    this.continuationAnchor = startAudioTime;
    this.continuationEvents = Object.freeze(
      boundaryWasScheduled
        ? plan.events.filter(
            event =>
              !(
                event.lane === "metronome" &&
                Math.abs(event.offsetSeconds) <= epsilon
              )
          )
        : [...plan.events]
    );
    this.continuationCursor = 0;
    this.plan = plan;
    return Object.freeze({
      generation: this.generation,
      clock: "audio-context-seconds",
      anchorTime: startAudioTime,
      expectedOnsets: Object.freeze(
        plan.onsetReferences.map(event =>
          Object.freeze({
            id: event.id,
            tick: event.tick,
            audioTime: startAudioTime + event.offsetSeconds,
          })
        )
      ),
    });
  }


  private async begin(): Promise<void> {
    const token = this.generation;
    if (this.visibility?.hidden) {
      this.abort("visibility-hidden");
      throw new Error("Cannot begin reliable playback in a hidden document.");
    }
    let context: AudioContext;
    try {
      context = this.getContext();
    } catch (error) {
      if (token === this.generation) this.abort("audio-unavailable");
      throw error;
    }
    try {
      if (context.state !== "running") await context.resume();
    } catch (error) {
      if (token === this.generation) this.abort("audio-blocked");
      throw error;
    }
    // A stop/replay/dispose while resume was pending must not resurrect sound.
    if (token !== this.generation) return;
    if (context.state !== "running") {
      this.abort("audio-blocked");
      throw new Error("AudioContext did not enter the running state.");
    }
    if (this.visibility?.hidden) {
      this.abort("visibility-hidden");
      throw new Error("Document became hidden while enabling audio.");
    }
    const plan = this.plan!;
    this.anchor = context.currentTime + this.lead - this.position;
    if (this.loopPlan) {
      this.loopAnchor = this.anchor;
      this.loopCycle = 0;
      this.loopCursor = 0;
    }
    this.lastWake = context.currentTime;
    this.cursor = plan.events.findIndex(
      event => event.offsetSeconds >= this.position
    );
    if (this.cursor < 0) this.cursor = plan.events.length;
    this.stateValue = "playing";
    // Restore only an already-active duration gate; this is not a new target onset.
    try {
      for (const event of plan.toneEvents) {
        if (
          event.offsetSeconds < this.position &&
          event.endOffsetSeconds > this.position
        )
          this.schedule(
            event,
            this.anchor + this.position,
            this.anchor + event.endOffsetSeconds,
            true
          );
        if (token !== this.generation) return;
      }
    } catch (error) {
      if (token === this.generation) this.abort("scheduling-error");
      throw error;
    }
    this.wake(token);
  }

  private schedule(
    event: RhythmAudioEvent,
    start: number,
    end: number,
    resumed: boolean,
    loopBoundary: boolean | null = null
  ): void {
    let handle: RhythmVoiceHandle | undefined;
    handle = scheduleRhythmVoice(
      this.context!,
      event,
      start,
      end,
      this.options.voices,
      () => {
        if (handle) {
          this.voices.delete(handle);
          this.loopVoices.delete(handle);
        }
      }
    );
    this.voices.add(handle);
    if (loopBoundary !== null)
      this.loopVoices.set(
        handle,
        Object.freeze({ startTime: start, boundaryPulse: loopBoundary })
      );
    // This is scheduled intent, not a DOM-time/audible-time measurement.
    this.options.onScheduled?.(
      Object.freeze({
        generation: this.generation,
        event,
        startTime: start,
        endTime: end,
        resumedSustain: resumed,
      })
    );
  }

  private wake(token: number): void {
    if (token !== this.generation || this.stateValue !== "playing") return;
    this.timer = null;
    const context = this.context!;
    const plan = this.plan!;
    const now = context.currentTime;
    if (context.state !== "running") {
      this.abort("context-interrupted");
      return;
    }
    if (this.visibility?.hidden) {
      this.abort("visibility-hidden");
      return;
    }
    const loopEnd =
      this.continuationPlan && this.continuationAnchor !== null
        ? this.continuationAnchor + this.continuationPlan.durationSeconds
        : null;
    const hasWork = this.loopPlan
      ? loopEnd === null || now < loopEnd
      : now < this.anchor + plan.durationSeconds ||
        this.cursor < plan.events.length;
    // Fail closed instead of bunching missed attacks at 'now'.
    if (now - this.lastWake > this.horizon && hasWork) {
      this.abort("scheduler-starved");
      return;
    }
    this.lastWake = now;

    if (this.loopPlan) {
      if (loopEnd !== null && now >= loopEnd) {
        const finalPlan = this.continuationPlan!;
        this.cancelGeneration();
        this.plan = finalPlan;
        this.position = finalPlan.durationSeconds;
        this.resetLoopState();
        this.stateValue = "completed";
        return;
      }
      try {
        while (true) {
          const loopNext = this.peekLoopEvent();
          const continuationNext = this.peekContinuationEvent();
          const next =
            loopNext === null
              ? continuationNext
              : continuationNext === null || loopNext.start <= continuationNext.start
                ? loopNext
                : continuationNext;
          if (!next || next.start > now + this.horizon) break;
          if (next.start < now) {
            this.abort("scheduler-starved");
            return;
          }
          this.schedule(
            next.event,
            next.start,
            next.end,
            false,
            next.source === "loop" ? next.boundaryPulse : null
          );
          if (token !== this.generation || this.stateValue !== "playing") return;
          if (next.source === "loop") this.loopCursor += 1;
          else this.continuationCursor += 1;
        }
      } catch {
        if (token === this.generation) this.abort("scheduling-error");
        return;
      }
      const callback = () => this.wake(token);
      this.timer = this.options.timers
        ? this.options.timers.set(callback, this.interval)
        : globalThis.setTimeout(callback, this.interval);
      return;
    }

    if (now >= this.anchor + plan.durationSeconds) {
      this.cancelGeneration();
      this.position = plan.durationSeconds;
      this.stateValue = "completed";
      return;
    }
    try {
      while (this.cursor < plan.events.length) {
        const event = plan.events[this.cursor];
        const start = this.anchor + event.offsetSeconds;
        if (start > now + this.horizon) break;
        if (start < now) {
          this.abort("scheduler-starved");
          return;
        }
        const end =
          event.lane === "pattern"
            ? this.anchor + event.endOffsetSeconds
            : Math.min(
                start + this.options.voices.metronome.durationSeconds,
                this.anchor + plan.durationSeconds
              );
        this.schedule(event, start, end, false);
        if (token !== this.generation || this.stateValue !== "playing") return;
        this.cursor += 1;
      }
    } catch {
      if (token === this.generation) this.abort("scheduling-error");
      return;
    }
    const callback = () => this.wake(token);
    this.timer = this.options.timers
      ? this.options.timers.set(callback, this.interval)
      : globalThis.setTimeout(callback, this.interval);
  }

  private peekLoopEvent(): Readonly<{
    source: "loop";
    event: RhythmAudioEvent;
    start: number;
    end: number;
    boundaryPulse: boolean;
  }> | null {
    const plan = this.loopPlan;
    if (!plan) return null;
    while (this.loopCursor >= plan.events.length) {
      this.loopCycle += 1;
      this.loopCursor = 0;
    }
    const base = plan.events[this.loopCursor];
    if (!base) return null;
    const secondsShift = this.loopCycle * plan.durationSeconds;
    const ticksShift = this.loopCycle * plan.totalTicks;
    const measureShift = this.loopCycle * plan.pattern.measures.length;
    const start = this.loopAnchor + secondsShift + base.offsetSeconds;
    const epsilon = 1e-7;
    if (this.loopStopAt !== null && start >= this.loopStopAt - epsilon)
      return null;
    const event = Object.freeze({
      ...base,
      id: `loop-${this.loopCycle}:${base.id}`,
      tick: base.tick + ticksShift,
      endTick: base.endTick + ticksShift,
      offsetSeconds: base.offsetSeconds + secondsShift,
      endOffsetSeconds: base.endOffsetSeconds + secondsShift,
      measureIndex: base.measureIndex + measureShift,
    });
    return Object.freeze({
      source: "loop" as const,
      event,
      start,
      end: start + this.options.voices.metronome.durationSeconds,
      boundaryPulse:
        base.lane === "metronome" && Math.abs(base.offsetSeconds) <= epsilon,
    });
  }

  private peekContinuationEvent(): Readonly<{
    source: "continuation";
    event: RhythmAudioEvent;
    start: number;
    end: number;
  }> | null {
    const plan = this.continuationPlan;
    const anchor = this.continuationAnchor;
    if (!plan || anchor === null) return null;
    const event = this.continuationEvents[this.continuationCursor];
    if (!event) return null;
    const start = anchor + event.offsetSeconds;
    const end =
      event.lane === "pattern"
        ? anchor + event.endOffsetSeconds
        : Math.min(
            start + this.options.voices.metronome.durationSeconds,
            anchor + plan.durationSeconds
          );
    return Object.freeze({ source: "continuation" as const, event, start, end });
  }

  stop(): void {
    this.assertUsable();
    this.cancelGeneration();
    this.position = 0;
    this.reasonValue = null;
    this.stateValue = "stopped";
  }

  pause(): void {
    this.assertUsable();
    if (this.stateValue !== "playing") return;
    this.position = Math.max(
      0,
      Math.min(
        this.plan!.durationSeconds,
        this.context!.currentTime - this.anchor
      )
    );
    this.cancelGeneration();
    this.stateValue = "paused";
  }

  async resume(): Promise<void> {
    this.assertUsable();
    if (this.stateValue !== "paused") return;
    if (this.position >= this.plan!.durationSeconds) {
      this.stateValue = "completed";
      return;
    }
    this.stateValue = "starting";
    await this.begin();
  }

  async replay(): Promise<void> {
    this.assertUsable();
    if (!this.plan) throw new Error("There is no pattern to replay.");
    await this.start(this.plan);
  }

  getReferenceTiming(): RhythmReferenceTiming | null {
    if (!this.plan || this.stateValue !== "playing") return null;
    if (this.loopPlan && !this.continuationPlan) return null;
    const plan = this.continuationPlan ?? this.plan;
    const anchor = this.continuationAnchor ?? this.anchor;
    return Object.freeze({
      generation: this.generation,
      clock: "audio-context-seconds",
      anchorTime: anchor,
      expectedOnsets: Object.freeze(
        plan.onsetReferences
          .filter(event => event.offsetSeconds >= this.position)
          .map(event =>
            Object.freeze({
              id: event.id,
              tick: event.tick,
              audioTime: anchor + event.offsetSeconds,
            })
          )
      ),
    });
  }

  async dispose(): Promise<void> {
    if (this.stateValue === "disposed") return;
    this.cancelGeneration();
    this.stateValue = "disposed";
    this.visibility?.removeEventListener(
      "visibilitychange",
      this.visibilityChanged
    );
    this.detachContext();
    const context = this.context;
    this.context = null;
    this.plan = null;
    this.resetLoopState();
    if (context && context.state !== "closed") await context.close();
  }
}
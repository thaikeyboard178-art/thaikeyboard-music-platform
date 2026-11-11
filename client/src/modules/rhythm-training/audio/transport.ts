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
    this.plan = plan;
    this.position = 0;
    this.reasonValue = null;
    this.stateValue = "starting";
    await this.begin();
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
    resumed: boolean
  ): void {
    let handle: RhythmVoiceHandle | undefined;
    handle = scheduleRhythmVoice(
      this.context!,
      event,
      start,
      end,
      this.options.voices,
      () => {
        if (handle) this.voices.delete(handle);
      }
    );
    this.voices.add(handle);
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
    // Fail closed instead of bunching missed attacks at 'now'. Timers only wake
    // the queue; every event remains anchored to the same audio clock origin.
    if (
      now - this.lastWake > this.horizon &&
      (now < this.anchor + plan.durationSeconds ||
        this.cursor < plan.events.length)
    ) {
      this.abort("scheduler-starved");
      return;
    }
    this.lastWake = now;
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
    return Object.freeze({
      generation: this.generation,
      clock: "audio-context-seconds",
      anchorTime: this.anchor,
      expectedOnsets: Object.freeze(
        this.plan.onsetReferences
          .filter(event => event.offsetSeconds >= this.position)
          .map(event =>
            Object.freeze({
              id: event.id,
              tick: event.tick,
              audioTime: this.anchor + event.offsetSeconds,
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
    if (context && context.state !== "closed") await context.close();
  }
}

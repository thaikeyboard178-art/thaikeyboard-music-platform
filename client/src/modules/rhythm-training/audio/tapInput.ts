import { normalizeEventTimestamp, TapClockError } from "./tapClock";

export type TapInputSource = "pointer" | "space";
export type CapturedTap = Readonly<{
  rawTimestamp: number;
  performanceMs: number;
  arrivalMs: number;
  sequence: number;
  source: TapInputSource;
  generation: number;
}>;

export type NativeTapCaptureOptions = Readonly<{
  now?: () => number;
  timeOrigin?: () => number;
  onTap: (tap: CapturedTap) => void;
  onAbort: (reason: string) => void;
  getGeneration: () => number;
}>;

/** Native-only tap capture; no synthetic compatibility click or audio context is used. */
export class NativeTapCapture {
  private readonly now: () => number;
  private readonly timeOrigin: () => number;
  private readonly onTap: (tap: CapturedTap) => void;
  private readonly onAbort: (reason: string) => void;
  private readonly getGeneration: () => number;
  private generation: number;
  private seenEvents = new WeakSet<object>();
  private lastPerformanceMs: number | null = null;
  private nextSequence = 0;
  private aborted = false;

  constructor(options: NativeTapCaptureOptions) {
    this.now = options.now ?? (() => performance.now());
    this.timeOrigin = options.timeOrigin ?? (() => performance.timeOrigin);
    this.onTap = options.onTap;
    this.onAbort = options.onAbort;
    this.getGeneration = options.getGeneration;
    this.generation = options.getGeneration();
  }

  /** Handle an event directly; useful for deterministic event-pipeline tests. */
  handle(event: Event, generation = this.getGeneration()): void {
    const rawTimestamp = event.timeStamp;
    const arrivalMs = this.now();
    if (
      generation !== this.generation ||
      generation !== this.getGeneration() ||
      this.aborted
    )
      return;

    const type = event.type;
    const native = event as Event & {
      code?: string;
      key?: string;
      repeat?: boolean;
      isPrimary?: boolean;
    };
    let source: TapInputSource | null = null;

    if (type === "pointerdown") {
      if (native.isPrimary !== true) return;
      source = "pointer";
    } else if (type === "keydown") {
      if (native.repeat === true) return;
      if (native.code !== "Space" && native.key !== " ") return;
      source = "space";
    } else if (type === "pointercancel") {
      if (native.isPrimary !== true || this.seenEvents.has(event)) return;
      this.seenEvents.add(event);
      this.abort("pointer-cancel");
      return;
    } else {
      return;
    }

    if (this.seenEvents.has(event)) return;
    this.seenEvents.add(event);

    // Use the two handler-entry reads, never a later event-processing timestamp.
    let performanceMs: number;
    try {
      performanceMs = normalizeEventTimestamp(
        rawTimestamp,
        arrivalMs,
        this.timeOrigin()
      );
    } catch (error) {
      this.abort(
        error instanceof TapClockError
          ? error.reason
          : "invalid-event-timestamp"
      );
      return;
    }

    // The generation may change during injected clock reads; stale work must not revive it.
    if (
      generation !== this.generation ||
      generation !== this.getGeneration() ||
      this.aborted
    )
      return;

    if (
      this.lastPerformanceMs !== null &&
      performanceMs < this.lastPerformanceMs
    ) {
      this.abort("non-monotonic-event-time");
      return;
    }

    const tap: CapturedTap = Object.freeze({
      rawTimestamp,
      performanceMs,
      arrivalMs,
      sequence: this.nextSequence++,
      source,
      generation,
    });
    this.lastPerformanceMs = performanceMs;
    this.onTap(tap);
  }

  /** Alias emphasizing event capture at a native handler boundary. */
  capture(event: Event, generation = this.getGeneration()): void {
    this.handle(event, generation);
  }

  /** Attach only pointerdown, Space keydown, and primary pointercancel listeners. */
  bind(target: EventTarget): () => void {
    const listener: EventListener = event => this.handle(event);
    target.addEventListener("pointerdown", listener);
    target.addEventListener("keydown", listener);
    target.addEventListener("pointercancel", listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      target.removeEventListener("pointerdown", listener);
      target.removeEventListener("keydown", listener);
      target.removeEventListener("pointercancel", listener);
    };
  }

  /** Start a distinct attempt generation and discard old identity/order state. */
  reset(generation: number): void {
    this.generation = generation;
    this.seenEvents = new WeakSet<object>();
    this.lastPerformanceMs = null;
    this.nextSequence = 0;
    this.aborted = false;
  }

  private abort(reason: string): void {
    if (this.aborted) return;
    this.aborted = true;
    this.onAbort(reason);
  }
}

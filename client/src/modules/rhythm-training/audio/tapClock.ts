export type OutputClockSample = Readonly<{
  contextTime: number;
  performanceTime: number;
}>;

const MAX_HISTORY = 512;
const MAX_SAMPLE_AGE_MS = 100;
const EPOCH_MILLISECONDS_THRESHOLD = 100_000_000_000;

/** Fail-closed clock or timestamp error. The reason is suitable for technical-abort diagnostics. */
export class TapClockError extends Error {
  readonly reason: string;

  constructor(reason: string, message = reason) {
    super(message);
    this.name = "TapClockError";
    this.reason = reason;
  }
}

function immutableSample(sample: OutputClockSample): OutputClockSample {
  return Object.freeze({
    contextTime: sample.contextTime,
    performanceTime: sample.performanceTime,
  });
}

function validateSample(sample: OutputClockSample): void {
  if (
    !sample ||
    !Number.isFinite(sample.contextTime) ||
    !Number.isFinite(sample.performanceTime) ||
    sample.contextTime <= 0 ||
    sample.performanceTime <= 0
  )
    throw new TapClockError("invalid-output-timestamp");
}

/**
 * A bounded, generation-scoped bridge for samples taken from the same
 * Rhythm AudioContext via getOutputTimestamp(). This class creates no context.
 */
export class OutputClockBridge {
  private history: OutputClockSample[] = [];
  private invalidReason: string | null = null;

  /** Most recently accepted sample, exposed as an immutable copy. */
  get latest(): OutputClockSample | null {
    const sample = this.history.at(-1);
    return sample ? immutableSample(sample) : null;
  }

  /** Record one AudioContext.getOutputTimestamp() pair. */
  record(sample: OutputClockSample): void {
    if (this.invalidReason) throw new TapClockError(this.invalidReason);
    try {
      validateSample(sample);
    } catch (error) {
      this.invalidate(
        error instanceof TapClockError
          ? error.reason
          : "invalid-output-timestamp"
      );
      throw new TapClockError(this.invalidReason!);
    }

    const latest = this.history.at(-1);
    if (latest) {
      if (
        sample.contextTime < latest.contextTime ||
        sample.performanceTime < latest.performanceTime
      ) {
        const reason = "non-monotonic-output-timestamp";
        this.invalidate(reason);
        throw new TapClockError(this.invalidReason ?? reason);
      }
      // A repeated pair is not a newer observation and must not refresh age.
      if (
        sample.contextTime === latest.contextTime &&
        sample.performanceTime === latest.performanceTime
      )
        return;
    }

    this.history.push(immutableSample(sample));
    if (this.history.length > MAX_HISTORY) this.history.shift();
  }

  /** Pick the newest observation available at the original event time. */
  sampleForEvent(eventPerformanceMs: number): OutputClockSample {
    this.assertUsable();
    if (!Number.isFinite(eventPerformanceMs) || eventPerformanceMs < 0)
      throw new TapClockError("invalid-event-time");

    for (let index = this.history.length - 1; index >= 0; index -= 1) {
      const sample = this.history[index];
      if (sample.performanceTime <= eventPerformanceMs) {
        if (eventPerformanceMs - sample.performanceTime > MAX_SAMPLE_AGE_MS)
          throw new TapClockError("stale-output-timestamp");
        return immutableSample(sample);
      }
    }
    throw new TapClockError("missing-output-timestamp");
  }

  /** Convert an AudioContext time to the performance time base using one sample. */
  audioToPerformanceMs(
    audioSeconds: number,
    sample?: OutputClockSample
  ): number {
    this.assertUsable();
    if (!Number.isFinite(audioSeconds) || audioSeconds < 0)
      throw new TapClockError("invalid-audio-time");
    const chosen = this.chooseSample(sample);
    return chosen.performanceTime + 1000 * (audioSeconds - chosen.contextTime);
  }

  /** Convert a performance timestamp to AudioContext seconds using one sample. */
  performanceToAudioSeconds(
    performanceMs: number,
    sample?: OutputClockSample
  ): number {
    this.assertUsable();
    if (!Number.isFinite(performanceMs) || performanceMs < 0)
      throw new TapClockError("invalid-performance-time");
    const chosen = this.chooseSample(sample);
    return chosen.contextTime + (performanceMs - chosen.performanceTime) / 1000;
  }

  /** Clear observations and the invalidation latch at an explicit generation reset. */
  reset(): void {
    this.history = [];
    this.invalidReason = null;
  }

  private chooseSample(sample?: OutputClockSample): OutputClockSample {
    const chosen = sample ?? this.history.at(-1);
    if (!chosen) throw new TapClockError("missing-output-timestamp");
    try {
      validateSample(chosen);
    } catch {
      throw new TapClockError("invalid-output-timestamp");
    }
    return chosen;
  }

  private assertUsable(): void {
    if (this.invalidReason) throw new TapClockError(this.invalidReason);
  }

  private invalidate(reason: string): void {
    this.invalidReason ??= reason;
  }
}

/**
 * Normalize Event.timeStamp to this document's performance time origin.
 * Modern relative timestamps are kept unchanged; legacy epoch timestamps are
 * translated only by subtracting the supplied performance.timeOrigin.
 */
export function normalizeEventTimestamp(
  raw: number,
  arrivalMs: number,
  timeOrigin: number
): number {
  if (
    !Number.isFinite(raw) ||
    !Number.isFinite(arrivalMs) ||
    !Number.isFinite(timeOrigin) ||
    raw < 0 ||
    arrivalMs < 0 ||
    timeOrigin <= 0
  )
    throw new TapClockError("invalid-event-timestamp");

  let normalized = raw;
  if (raw >= EPOCH_MILLISECONDS_THRESHOLD) {
    if (timeOrigin < EPOCH_MILLISECONDS_THRESHOLD)
      throw new TapClockError("timestamp-origin-mismatch");
    normalized = raw - timeOrigin;
  }

  if (!Number.isFinite(normalized) || normalized < 0)
    throw new TapClockError("invalid-event-timestamp");
  if (normalized > arrivalMs) throw new TapClockError("future-event-timestamp");
  return normalized;
}

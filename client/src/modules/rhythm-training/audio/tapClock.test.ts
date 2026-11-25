import { describe, expect, it } from "vitest";
import {
  normalizeEventTimestamp,
  OutputClockBridge,
  TapClockError,
} from "./tapClock";

function errorReason(action: () => unknown): string | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof TapClockError ? error.reason : undefined;
  }
}

describe("tap output clock bridge", () => {
  it("normalizes modern relative and legacy epoch event timestamps without shifting", () => {
    expect(normalizeEventTimestamp(125.5, 130, 1_700_000_000_000)).toBe(125.5);
    expect(
      normalizeEventTimestamp(1_700_000_000_125.5, 130, 1_700_000_000_000)
    ).toBe(125.5);
    expect(normalizeEventTimestamp(125, 125, 1_700_000_000_000)).toBe(125);
  });

  it.each([
    [-1, 10, 1_700_000_000_000, "invalid-event-timestamp"],
    [Number.NaN, 10, 1_700_000_000_000, "invalid-event-timestamp"],
    [11, 10, 1_700_000_000_000, "future-event-timestamp"],
    [1_700_000_000_010, 10, 1_000, "timestamp-origin-mismatch"],
    [1_699_999_999_999, 10, 1_700_000_000_000, "invalid-event-timestamp"],
  ])("rejects invalid timestamp input %s", (raw, arrival, origin, reason) => {
    expect(() => normalizeEventTimestamp(raw, arrival, origin)).toThrow(
      expect.objectContaining({ reason })
    );
  });

  it("maps both directions using a caller-selected output sample", () => {
    const bridge = new OutputClockBridge();
    const first = { contextTime: 2, performanceTime: 1_000 };
    bridge.record(first);
    expect(bridge.audioToPerformanceMs(2.025, first)).toBe(1_025);
    expect(bridge.performanceToAudioSeconds(1_025, first)).toBe(2.025);
    expect(bridge.latest).toEqual(first);
    expect(Object.isFrozen(bridge.latest)).toBe(true);
  });

  it("uses the newest historical sample at event time, including delayed delivery", () => {
    const bridge = new OutputClockBridge();
    bridge.record({ contextTime: 2, performanceTime: 1_000 });
    bridge.record({ contextTime: 2.05, performanceTime: 1_050 });
    bridge.record({ contextTime: 2.1, performanceTime: 1_100 });

    const selected = bridge.sampleForEvent(1_040);
    expect(selected).toEqual({ contextTime: 2, performanceTime: 1_000 });
    expect(bridge.performanceToAudioSeconds(1_040, selected)).toBeCloseTo(2.04);
  });

  it("accepts exactly 300 ms freshness and rejects older or future-only samples", () => {
    const bridge = new OutputClockBridge();
    bridge.record({ contextTime: 1, performanceTime: 100 });
    expect(bridge.sampleForEvent(400).performanceTime).toBe(100);
    expect(errorReason(() => bridge.sampleForEvent(400.001))).toBe(
      "stale-output-timestamp"
    );
    expect(errorReason(() => bridge.sampleForEvent(99))).toBe(
      "missing-output-timestamp"
    );
  });

  it("does not let a repeated equal pair refresh age", () => {
    const bridge = new OutputClockBridge();
    bridge.record({ contextTime: 1, performanceTime: 100 });
    bridge.record({ contextTime: 1, performanceTime: 100 });
    expect(bridge.latest?.performanceTime).toBe(100);
    expect(errorReason(() => bridge.sampleForEvent(400.001))).toBe(
      "stale-output-timestamp"
    );
  });

  it("accepts a sample that is 250 ms old at event time", () => {
    const bridge = new OutputClockBridge();
    const sample = { contextTime: 1, performanceTime: 1_000 };
    bridge.record(sample);

    expect(bridge.sampleForEvent(1_250)).toEqual(sample);
  });

  it("rejects a sample that is 350 ms old at event time", () => {
    const bridge = new OutputClockBridge();
    bridge.record({ contextTime: 1, performanceTime: 1_000 });

    expect(errorReason(() => bridge.sampleForEvent(1_350))).toBe(
      "stale-output-timestamp"
    );
  });

  it("selects the newest historical sample not later than event time", () => {
    const bridge = new OutputClockBridge();
    bridge.record({ contextTime: 1, performanceTime: 1_000 });
    bridge.record({ contextTime: 1.1, performanceTime: 1_100 });
    bridge.record({ contextTime: 1.2, performanceTime: 1_200 });

    expect(bridge.sampleForEvent(1_150)).toEqual({
      contextTime: 1.1,
      performanceTime: 1_100,
    });
  });

  it("rejects invalid, nonmonotonic, missing and latched mappings until reset", () => {
    expect(errorReason(() => new OutputClockBridge().sampleForEvent(1))).toBe(
      "missing-output-timestamp"
    );

    for (const bad of [
      { contextTime: 0, performanceTime: 10 },
      { contextTime: Number.NaN, performanceTime: 10 },
      { contextTime: 2, performanceTime: -1 },
    ]) {
      const bridge = new OutputClockBridge();
      bridge.record({ contextTime: 1, performanceTime: 10 });
      expect(errorReason(() => bridge.record(bad))).toBe(
        "invalid-output-timestamp"
      );
      expect(
        errorReason(() =>
          bridge.record({ contextTime: 2, performanceTime: 20 })
        )
      ).toBe("invalid-output-timestamp");
      bridge.reset();
      bridge.record({ contextTime: 2, performanceTime: 20 });
      expect(bridge.latest?.performanceTime).toBe(20);
    }

    const backwardContext = new OutputClockBridge();
    backwardContext.record({ contextTime: 2, performanceTime: 20 });
    expect(
      errorReason(() =>
        backwardContext.record({ contextTime: 1.9, performanceTime: 21 })
      )
    ).toBe("non-monotonic-output-timestamp");

    const backwardPerformance = new OutputClockBridge();
    backwardPerformance.record({ contextTime: 2, performanceTime: 20 });
    expect(
      errorReason(() =>
        backwardPerformance.record({ contextTime: 2.1, performanceTime: 19 })
      )
    ).toBe("non-monotonic-output-timestamp");
  });

  it("allows equal event timestamps and equal clock observations without reordering", () => {
    const bridge = new OutputClockBridge();
    bridge.record({ contextTime: 1, performanceTime: 10 });
    bridge.record({ contextTime: 1, performanceTime: 10 });
    expect(bridge.sampleForEvent(10)).toEqual({
      contextTime: 1,
      performanceTime: 10,
    });
    expect(normalizeEventTimestamp(10, 10, 1_700_000_000_000)).toBe(10);
  });
});

import { describe, expect, it } from "vitest";
import { NativeTapCapture, type CapturedTap } from "./tapInput";

function nativeEvent(
  type: string,
  timestamp: number,
  details: Record<string, unknown> = {}
): Event {
  const event = new Event(type);
  Object.defineProperty(event, "timeStamp", {
    configurable: true,
    value: timestamp,
  });
  for (const [key, value] of Object.entries(details))
    Object.defineProperty(event, key, { configurable: true, value });
  return event;
}

function setup() {
  const taps: CapturedTap[] = [];
  const aborts: string[] = [];
  let generation = 1;
  let arrival = 100;
  const capture = new NativeTapCapture({
    now: () => arrival,
    timeOrigin: () => 1_700_000_000_000,
    getGeneration: () => generation,
    onTap: tap => taps.push(tap),
    onAbort: reason => aborts.push(reason),
  });
  return {
    capture,
    taps,
    aborts,
    setGeneration: (value: number) => (generation = value),
    setArrival: (value: number) => (arrival = value),
  };
}

describe("native tap capture", () => {
  it("deduplicates the same native event object but retains distinct equal-time taps", () => {
    const { capture, taps } = setup();
    const first = nativeEvent("pointerdown", 90, { isPrimary: true });
    capture.handle(first);
    capture.handle(first);
    capture.handle(nativeEvent("pointerdown", 90, { isPrimary: true }));

    expect(taps.map(tap => tap.performanceMs)).toEqual([90, 90]);
    expect(taps.map(tap => tap.sequence)).toEqual([0, 1]);
    expect(taps.every(tap => tap.source === "pointer")).toBe(true);
  });

  it("accepts Space without repeat, including the legacy key fallback", () => {
    const { capture, taps } = setup();
    capture.handle(nativeEvent("keydown", 90, { code: "Space", repeat: true }));
    capture.handle(
      nativeEvent("keydown", 90, { code: "Space", repeat: false })
    );
    capture.handle(nativeEvent("keydown", 90, { key: " ", repeat: false }));
    capture.handle(nativeEvent("keydown", 90, { code: "Enter", key: "Enter" }));

    expect(taps.map(tap => tap.source)).toEqual(["space", "space"]);
    expect(taps.map(tap => tap.sequence)).toEqual([0, 1]);
  });

  it("accepts one primary pointer and ignores nonprimary pointers", () => {
    const { capture, taps } = setup();
    capture.handle(nativeEvent("pointerdown", 90, { isPrimary: false }));
    capture.handle(nativeEvent("pointerdown", 90, { isPrimary: true }));
    capture.handle(nativeEvent("pointerdown", 90));
    expect(taps).toHaveLength(1);
    expect(taps[0].source).toBe("pointer");
  });

  it("aborts on primary pointercancel but ignores nonprimary cancellation", () => {
    const { capture, taps, aborts } = setup();
    capture.handle(nativeEvent("pointercancel", 90, { isPrimary: false }));
    expect(aborts).toEqual([]);
    capture.handle(nativeEvent("pointercancel", 90, { isPrimary: true }));
    capture.handle(nativeEvent("pointerdown", 91, { isPrimary: true }));
    expect(aborts).toEqual(["pointer-cancel"]);
    expect(taps).toEqual([]);
  });

  it("accepts legacy epoch timestamps, captures arrival immediately, and rejects future or invalid input technically", () => {
    const { capture, taps, aborts, setArrival } = setup();
    const event = nativeEvent("pointerdown", 1_700_000_000_090, {
      isPrimary: true,
    });
    capture.handle(event);
    expect(taps[0]).toMatchObject({
      rawTimestamp: 1_700_000_000_090,
      performanceMs: 90,
      arrivalMs: 100,
      sequence: 0,
      generation: 1,
    });

    const next = setup();
    next.capture.handle(nativeEvent("keydown", 101, { code: "Space" }));
    expect(next.aborts).toEqual(["future-event-timestamp"]);
    expect(next.taps).toEqual([]);

    setArrival(Number.NaN);
    capture.reset(1);
    capture.handle(nativeEvent("pointerdown", 92, { isPrimary: true }));
    expect(aborts).toEqual(["invalid-event-timestamp"]);
  });

  it("treats equal times as ordered and a backward timestamp as a technical abort", () => {
    const { capture, taps, aborts } = setup();
    capture.handle(nativeEvent("keydown", 90, { code: "Space" }));
    capture.handle(nativeEvent("keydown", 90, { code: "Space" }));
    capture.handle(nativeEvent("keydown", 89, { code: "Space" }));
    capture.handle(nativeEvent("keydown", 91, { code: "Space" }));
    expect(taps.map(tap => tap.sequence)).toEqual([0, 1]);
    expect(aborts).toEqual(["non-monotonic-event-time"]);
  });

  it("ignores stale generations and resets identity, ordering, sequence, and abort state", () => {
    const { capture, taps, aborts, setGeneration } = setup();
    const reused = nativeEvent("pointerdown", 90, { isPrimary: true });
    capture.handle(reused, 1);
    setGeneration(2);
    capture.handle(nativeEvent("pointerdown", 91, { isPrimary: true }), 1);
    expect(taps).toHaveLength(1);
    expect(aborts).toEqual([]);

    capture.reset(2);
    capture.handle(reused, 2);
    expect(taps).toHaveLength(2);
    expect(taps[1]).toMatchObject({ sequence: 0, generation: 2 });

    capture.handle(nativeEvent("pointercancel", 92, { isPrimary: true }), 2);
    capture.reset(3);
    setGeneration(3);
    capture.handle(nativeEvent("keydown", 93, { code: "Space" }), 3);
    expect(taps[2]).toMatchObject({ sequence: 0, generation: 3 });
    expect(aborts).toEqual(["pointer-cancel"]);
  });

  it("binds and cleans up its three native listeners", () => {
    const { capture, taps } = setup();
    const target = new EventTarget();
    const cleanup = capture.bind(target);
    const pointer = nativeEvent("pointerdown", 90, { isPrimary: true });
    target.dispatchEvent(pointer);
    cleanup();
    target.dispatchEvent(nativeEvent("pointerdown", 91, { isPrimary: true }));
    expect(taps).toHaveLength(1);
  });
});

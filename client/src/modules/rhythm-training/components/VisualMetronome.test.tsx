// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RhythmScheduledEvent } from "../audio/transport";
import type { RhythmMeter } from "../types";
import { VisualMetronome, type RhythmAudioPlayback } from "./VisualMetronome";

const meters: readonly RhythmMeter[] = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
  { numerator: 3, denominator: 8 },
  { numerator: 6, denominator: 8 },
  { numerator: 9, denominator: 8 },
  { numerator: 2, denominator: 2 },
];

let frames: Array<(time: number) => void> = [];
let nextFrameId = 1;

function pulseEvent(
  startTime: number,
  measureIndex: number,
  pulseIndex: number,
  count: number,
  tick: number,
  structuralAccent: "strong" | "medium" | "weak",
  generation = 1
): RhythmScheduledEvent {
  return {
    generation,
    event: {
      id: `pulse-${measureIndex}-${pulseIndex}`,
      lane: "metronome",
      tick,
      endTick: tick,
      offsetSeconds: startTime,
      endOffsetSeconds: startTime,
      structuralAccent,
      segmentAccent: "normal",
      segmentIds: [],
      measureIndex,
      pulseIndex,
      count,
    },
    startTime,
    endTime: startTime + 0.05,
    resumedSustain: false,
  };
}

function paintFrame(time = 16) {
  const callback = frames.shift();
  if (!callback) throw new Error("No animation frame was queued.");
  act(() => callback(time));
}

beforeEach(() => {
  frames = [];
  nextFrameId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
    frames.push(callback);
    return nextFrameId++;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("VisualMetronome", () => {
  it("keeps the canonical pulse lit after its short click ends without waiting for the next look-ahead event", () => {
    let playback: RhythmAudioPlayback = {
      audioTime: 4.3,
      scheduledEvents: [pulseEvent(4, 0, 0, 1, 0, "strong")],
      state: "playing",
    };
    render(
      <VisualMetronome
        meter={meters[2]}
        pulseBpm={60}
        readPlayback={() => playback}
      />
    );
    paintFrame();
    expect(
      screen.getAllByTestId("metronome-beat")[0].getAttribute("data-active")
    ).toBe("true");
    playback = { ...playback, audioTime: 4.8 };
    paintFrame();
    expect(
      screen.getAllByTestId("metronome-beat")[0].getAttribute("data-active")
    ).toBe("true");
    playback = { ...playback, audioTime: 5 };
    paintFrame();
    expect(
      screen
        .getAllByTestId("metronome-beat")
        .every(beat => beat.getAttribute("data-active") === "false")
    ).toBe(true);
  });

  it("labels the one-bar count-in separately from the first canonical exercise measure", () => {
    const countIn = pulseEvent(1, 0, 0, 1, 0, "strong");
    const countInEvent = {
      ...countIn,
      event: { ...countIn.event, id: "count-in:metronome:m1:p1" },
    };
    let playback: RhythmAudioPlayback = {
      audioTime: 1.1,
      scheduledEvents: [countInEvent, pulseEvent(5, 1, 0, 1, 1920, "strong")],
      state: "playing",
    };
    render(
      <VisualMetronome
        meter={meters[2]}
        pulseBpm={60}
        readPlayback={() => playback}
      />
    );
    paintFrame();
    expect(screen.getByRole("status").textContent).toBe("Đếm vào, phách 1");
    playback = { ...playback, audioTime: 5.1 };
    paintFrame();
    expect(screen.getByRole("status").textContent).toBe("Ô nhịp 1, phách 1");
  });

  it.each([
    ["2/4", meters[0], ["strong", "weak"]],
    ["3/4", meters[1], ["strong", "weak", "weak"]],
    ["4/4", meters[2], ["strong", "weak", "medium", "weak"]],
    ["3/8", meters[3], ["strong", "weak", "weak"]],
    ["6/8", meters[4], ["strong", "medium"]],
    ["9/8", meters[5], ["strong", "medium", "medium"]],
    ["2/2", meters[6], ["strong", "weak"]],
  ] as const)(
    "uses canonical structural accents for %s",
    (_label, meter, accents) => {
      const playback: RhythmAudioPlayback = {
        audioTime: 0,
        scheduledEvents: [],
        state: "idle",
      };
      render(<VisualMetronome meter={meter} readPlayback={() => playback} />);
      expect(
        screen
          .getAllByTestId("metronome-beat")
          .map(beat => beat.getAttribute("data-accent"))
      ).toEqual(accents);
    }
  );

  it("does not light a scheduled future beat and lights it only when audioTime reaches its start", () => {
    let playback: RhythmAudioPlayback = {
      audioTime: 3.99,
      scheduledEvents: [
        pulseEvent(4, 0, 0, 1, 0, "strong"),
        pulseEvent(4.5, 0, 1, 2, 480, "weak"),
      ],
      state: "playing",
    };
    render(<VisualMetronome meter={meters[1]} readPlayback={() => playback} />);

    paintFrame();
    expect(
      screen
        .getAllByTestId("metronome-beat")
        .every(beat => beat.getAttribute("data-active") === "false")
    ).toBe(true);

    playback = { ...playback, audioTime: 4 };
    paintFrame();
    expect(
      screen.getAllByTestId("metronome-beat")[0].getAttribute("data-active")
    ).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Ô nhịp 1, phách 1");

    playback = { ...playback, audioTime: 4.5 };
    paintFrame();
    expect(
      screen.getAllByTestId("metronome-beat")[0].getAttribute("data-active")
    ).toBe("false");
    expect(
      screen.getAllByTestId("metronome-beat")[1].getAttribute("data-active")
    ).toBe("true");
  });

  it("clears a beat after audio stops and samples only animation frames, never interval timers", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    let playback: RhythmAudioPlayback = {
      audioTime: 1,
      scheduledEvents: [
        pulseEvent(0.9, 0, 0, 1, 0, "strong"),
        pulseEvent(1.4, 0, 1, 2, 480, "weak"),
      ],
      state: "playing",
    };
    render(<VisualMetronome meter={meters[1]} readPlayback={() => playback} />);
    paintFrame();
    expect(
      screen.getAllByTestId("metronome-beat")[0].getAttribute("data-active")
    ).toBe("true");

    playback = { ...playback, state: "stopped" };
    paintFrame();
    expect(
      screen
        .getAllByTestId("metronome-beat")
        .every(beat => beat.getAttribute("data-active") === "false")
    ).toBe(true);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(frames.length).toBeGreaterThan(0);
  });

  it("binds beat emphasis to scheduled generation and the scheduled measure index", () => {
    const playback: RhythmAudioPlayback = {
      audioTime: 8,
      scheduledEvents: [
        pulseEvent(7.9, 0, 0, 1, 0, "strong", 1),
        pulseEvent(8, 1, 2, 3, 1920, "weak", 2),
        pulseEvent(8.5, 1, 3, 4, 2400, "weak", 2),
      ],
      state: "playing",
    };
    render(<VisualMetronome meter={meters[2]} readPlayback={() => playback} />);
    paintFrame();
    expect(screen.getByRole("status").textContent).toBe("Ô nhịp 2, phách 3");
    expect(
      screen.getAllByTestId("metronome-beat")[2].getAttribute("data-active")
    ).toBe("true");
  });
});

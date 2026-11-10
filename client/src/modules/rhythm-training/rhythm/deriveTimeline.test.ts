import { describe, expect, it } from "vitest";
import { deriveRhythmTimeline } from "./deriveTimeline";
import {
  CROSS_BAR_TIE,
  DOTTED_EIGHTH,
  FOUR_FOUR,
  HALF_TIE,
  INVALID_FIXTURES,
  SIX_EIGHT,
  SIX_EIGHT_CROSS_TIE,
  SIX_EIGHT_REST,
  THREE_FOUR,
  THREE_SEGMENT_TIE,
} from "./fixtures";

describe("one authoritative rhythm timeline", () => {
  it("derives the exact4/4 note/rest positions", () => {
    const timeline = deriveRhythmTimeline(FOUR_FOUR, 240);
    expect(timeline.totalTicks).toBe(1920);
    expect(
      timeline.segments.map(segment => segment.absoluteStartTicks)
    ).toEqual([0, 480, 720, 960, 1440]);
    expect(timeline.segments.map(segment => segment.durationTicks)).toEqual([
      480, 240, 240, 480, 480,
    ]);
    expect(timeline.onsets).toEqual([0, 480, 720, 1440]);
    expect(
      timeline.soundingSpans.map(span => [span.startTicks, span.endTicks])
    ).toEqual([
      [0, 480],
      [480, 720],
      [720, 960],
      [1440, 1920],
    ]);
    expect(timeline.segments[2]).toMatchObject({
      measureOffsetTicks: 720,
      pulseIndex: 1,
      pulseOffsetTicks: 240,
      subdivisionIndex: 1,
    });
    expect(timeline.segments[3].isOnset).toBe(false);
  });
  it("derives dotted3/4 without rounding", () => {
    const timeline = deriveRhythmTimeline(THREE_FOUR);
    expect(timeline.totalTicks).toBe(1440);
    expect(timeline.onsets).toEqual([0, 720]);
    expect(timeline.segments.map(segment => segment.absoluteEndTicks)).toEqual([
      720, 960, 1440,
    ]);
  });
  it("keeps6/8 two pulses rather than six quarter beats", () => {
    const timeline = deriveRhythmTimeline(SIX_EIGHT, 240);
    expect(timeline.meter.pulseCount).toBe(2);
    expect(timeline.meter.pulseTicks).toBe(720);
    expect(timeline.onsets).toEqual([0, 720, 960]);
    expect(
      timeline.segments.map(segment => [
        segment.pulseIndex,
        segment.subdivisionIndex,
      ])
    ).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ]);
    expect(timeline.segments[3].isOnset).toBe(false);
  });
  it("reserves all-rest duration with zero onsets and spans", () => {
    const timeline = deriveRhythmTimeline(SIX_EIGHT_REST);
    expect(timeline.totalTicks).toBe(1440);
    expect(timeline.onsets).toEqual([]);
    expect(timeline.soundingSpans).toEqual([]);
  });
  it("merges an intra-bar half tie into one whole-length span", () => {
    const timeline = deriveRhythmTimeline(HALF_TIE);
    expect(timeline.onsets).toEqual([0]);
    expect(timeline.segments.map(segment => segment.tieRole)).toEqual([
      "start",
      "end",
    ]);
    expect(timeline.soundingSpans[0]).toMatchObject({
      startTicks: 0,
      endTicks: 1920,
      segmentIds: ["a", "b"],
    });
  });
  it("keeps middle tie continuations silent", () => {
    const timeline = deriveRhythmTimeline(THREE_SEGMENT_TIE);
    expect(timeline.segments.map(segment => segment.tieRole)).toEqual([
      "start",
      "continue",
      "end",
      "none",
    ]);
    expect(timeline.onsets).toEqual([0]);
    expect(timeline.soundingSpans[0].endTicks).toBe(1440);
  });
  it("derives full4/4 cross-bar ties without a barline reattack", () => {
    const timeline = deriveRhythmTimeline(CROSS_BAR_TIE);
    expect(timeline.totalTicks).toBe(3840);
    expect(timeline.onsets).toEqual([0, 480, 960, 1440, 2400, 3360]);
    expect(timeline.segments[4]).toMatchObject({
      measureIndex: 1,
      measureOffsetTicks: 0,
      absoluteStartTicks: 1920,
      isOnset: false,
      tieRole: "end",
    });
    expect(
      timeline.soundingSpans.find(span => span.tieGroupId === "T1")
    ).toMatchObject({ startTicks: 1440, endTicks: 2400 });
  });
  it("derives compound cross-bar tie and pulse-relative coordinates", () => {
    const timeline = deriveRhythmTimeline(SIX_EIGHT_CROSS_TIE, 240);
    expect(timeline.totalTicks).toBe(2880);
    expect(
      timeline.soundingSpans.find(span => span.tieGroupId === "T1")
    ).toMatchObject({ startTicks: 1200, endTicks: 1680 });
    expect(timeline.onsets).not.toContain(1440);
    expect(timeline.segments[4]).toMatchObject({
      pulseIndex: 0,
      subdivisionIndex: 0,
      measureIndex: 1,
    });
  });
  it("represents dotted eighth + sixteenth on exact120-tick subdivisions", () => {
    const timeline = deriveRhythmTimeline(DOTTED_EIGHTH);
    expect(timeline.onsets).toEqual([0, 360, 1440]);
    expect(timeline.segments[1].subdivisionIndex).toBe(3);
  });
  it("uses six cells per compound pulse on a sixteenth grid", () => {
    const timeline = deriveRhythmTimeline(SIX_EIGHT, 120);
    expect(timeline.segments.map(segment => segment.subdivisionIndex)).toEqual([
      0, 0, 2, 4,
    ]);
  });
  it.each([0, 60, 180, 300, Number.NaN])(
    "rejects unsupported teaching grid%s",
    grid =>
      expect(() => deriveRhythmTimeline(FOUR_FOUR, grid)).toThrow(RangeError)
  );
  it("rejects a non-dividing compound grid and coarse fractional cells", () => {
    expect(() => deriveRhythmTimeline(SIX_EIGHT, 480)).toThrow(RangeError);
    expect(() => deriveRhythmTimeline(FOUR_FOUR, 480)).toThrow(RangeError);
  });
  it("does not derive invalid measures", () =>
    expect(() => deriveRhythmTimeline(INVALID_FIXTURES[0].input)).toThrow());
  it("freezes derived positions and spans", () => {
    const timeline = deriveRhythmTimeline(CROSS_BAR_TIE);
    expect(Object.isFrozen(timeline)).toBe(true);
    expect(Object.isFrozen(timeline.segments)).toBe(true);
    expect(Object.isFrozen(timeline.segments[0])).toBe(true);
    expect(Object.isFrozen(timeline.soundingSpans[0].segmentIds)).toBe(true);
  });
});

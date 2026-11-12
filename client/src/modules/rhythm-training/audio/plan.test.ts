import { describe, expect, it } from "vitest";
import type {
  RhythmMeter,
  RhythmPattern,
  RhythmSegment,
  WrittenDuration,
} from "../types";
import { DOTTED_EIGHTH, FOUR_FOUR, CROSS_BAR_TIE } from "../rhythm/fixtures";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import { createListenPlaybackPlan, createRhythmAudioPlan } from "./plan";

function note(
  id: string,
  denominator: WrittenDuration["denominator"],
  dots: 0 | 1 = 0,
  accent?: "normal" | "strong"
): RhythmSegment {
  return {
    id,
    kind: "note",
    duration: { denominator, dots },
    ...(accent === undefined ? {} : { accent }),
  };
}

function rest(
  id: string,
  denominator: WrittenDuration["denominator"],
  dots: 0 | 1 = 0
): RhythmSegment {
  return { id, kind: "rest", duration: { denominator, dots } };
}

function makePattern(
  id: string,
  meter: RhythmMeter,
  measures: readonly (readonly RhythmSegment[])[],
  pulseBpm = 60
): RhythmPattern {
  return {
    id,
    meter,
    tempo: { pulseBpm },
    measures: measures.map((segments, index) => ({
      id: `${id}-measure-${index + 1}`,
      segments,
    })),
  };
}

describe("canonical rhythm audio plan", () => {
  it("projects technical pulse units, starts, and counts for all seven meters", () => {
    const cases: readonly {
      meter: RhythmMeter;
      segments: readonly RhythmSegment[];
      pulseTicks: number;
      pulseCount: number;
      pulseStarts: readonly number[];
      pulseUnit: { denominator: 2 | 4 | 8; dots: 0 | 1 };
    }[] = [
      {
        meter: { numerator: 2, denominator: 4 },
        segments: [note("two-four", 2)],
        pulseTicks: 480,
        pulseCount: 2,
        pulseStarts: [0, 480],
        pulseUnit: { denominator: 4, dots: 0 },
      },
      {
        meter: { numerator: 3, denominator: 4 },
        segments: [note("three-four", 2, 1)],
        pulseTicks: 480,
        pulseCount: 3,
        pulseStarts: [0, 480, 960],
        pulseUnit: { denominator: 4, dots: 0 },
      },
      {
        meter: { numerator: 4, denominator: 4 },
        segments: [note("four-four", 1)],
        pulseTicks: 480,
        pulseCount: 4,
        pulseStarts: [0, 480, 960, 1440],
        pulseUnit: { denominator: 4, dots: 0 },
      },
      {
        meter: { numerator: 3, denominator: 8 },
        segments: [note("three-eight", 4, 1)],
        pulseTicks: 240,
        pulseCount: 3,
        pulseStarts: [0, 240, 480],
        pulseUnit: { denominator: 8, dots: 0 },
      },
      {
        meter: { numerator: 6, denominator: 8 },
        segments: [note("six-eight", 2, 1)],
        pulseTicks: 240,
        pulseCount: 6,
        pulseStarts: [0, 240, 480, 720, 960, 1200],
        pulseUnit: { denominator: 8, dots: 0 },
      },
      {
        meter: { numerator: 9, denominator: 8 },
        segments: [
          note("nine-eight-1", 4, 1),
          note("nine-eight-2", 4, 1),
          note("nine-eight-3", 4, 1),
        ],
        pulseTicks: 240,
        pulseCount: 9,
        pulseStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
        pulseUnit: { denominator: 8, dots: 0 },
      },
      {
        meter: { numerator: 2, denominator: 2 },
        segments: [note("two-two", 1)],
        pulseTicks: 960,
        pulseCount: 2,
        pulseStarts: [0, 960],
        pulseUnit: { denominator: 2, dots: 0 },
      },
    ];

    for (const [index, entry] of cases.entries()) {
      const meter = deriveMeter(entry.meter);
      expect(meter.pulseTicks).toBe(entry.pulseTicks);
      expect(meter.pulseCount).toBe(entry.pulseCount);
      expect(meter.pulseStarts).toEqual(entry.pulseStarts);
      expect(meter.pulseUnit).toEqual(entry.pulseUnit);

      const pattern = makePattern(
        `meter-${index}`,
        entry.meter,
        [entry.segments],
        120
      );
      const plan = createRhythmAudioPlan(pattern, "metronome");
      expect(plan.pulseTicks).toBe(entry.pulseTicks);
      expect(plan.pulseCount).toBe(entry.pulseCount);
      expect(plan.pulseEvents.map(event => event.tick)).toEqual(
        entry.pulseStarts
      );
      expect(plan.pulseEvents.map(event => event.count)).toEqual(
        entry.pulseStarts.map((_, pulseIndex) => pulseIndex + 1)
      );
      expect(plan.pulseEvents.map(event => event.offsetSeconds)).toEqual(
        entry.pulseStarts.map(tick => ticksToSeconds(tick, entry.meter, 120))
      );
      expect(plan.durationSeconds).toBe(
        ticksToSeconds(deriveMeter(entry.meter).measureTicks, entry.meter, 120)
      );
    }
  });

  it("preserves dotted-note duration and omits attacks for rests", () => {
    const plan = createRhythmAudioPlan(DOTTED_EIGHTH, "pattern");
    const dotted = plan.toneEvents.find(event => event.id === "pattern:a");
    expect(dotted).toMatchObject({ tick: 0, endTick: 360 });
    expect(dotted?.offsetSeconds).toBe(0);
    expect(dotted?.endOffsetSeconds).toBe(
      ticksToSeconds(360, DOTTED_EIGHTH.meter, 60)
    );
    expect(plan.toneEvents.map(event => event.segmentIds)).not.toContainEqual([
      "r",
    ]);
    expect(plan.toneEvents.map(event => event.id)).toEqual([
      "pattern:a",
      "pattern:b",
      "pattern:c",
    ]);
  });

  it("sustains a cross-bar tie as one span without a continuation attack", () => {
    const plan = createRhythmAudioPlan(CROSS_BAR_TIE, "pattern");
    const tiedEvent = plan.toneEvents.find(
      event => event.id === "pattern:t-start"
    );
    expect(tiedEvent).toMatchObject({
      tick: 1440,
      endTick: 2400,
      segmentIds: ["t-start", "t-end"],
      measureIndex: 0,
    });
    expect(tiedEvent?.offsetSeconds).toBe(
      ticksToSeconds(1440, CROSS_BAR_TIE.meter, 60)
    );
    expect(tiedEvent?.endOffsetSeconds).toBe(
      ticksToSeconds(2400, CROSS_BAR_TIE.meter, 60)
    );
    expect(plan.toneEvents.some(event => event.id === "pattern:t-end")).toBe(
      false
    );
  });

  it("keeps segment accent separate from the meter's structural accent", () => {
    const input = makePattern(
      "accent-separation",
      { numerator: 4, denominator: 4 },
      [[note("downbeat", 4), note("marked", 4, 0, "strong"), rest("tail", 2)]]
    );
    const plan = createRhythmAudioPlan(input, "pattern");
    expect(plan.toneEvents[0]).toMatchObject({
      structuralAccent: "strong",
      segmentAccent: "normal",
    });
    expect(plan.toneEvents[1]).toMatchObject({
      structuralAccent: "weak",
      segmentAccent: "strong",
    });
  });

  it("distinguishes patterns with identical onsets but different note durations", () => {
    const meter = { numerator: 4, denominator: 4 } as const;
    const quarterThenHalfRest = makePattern("quarter-first", meter, [
      [note("first", 4), rest("gap", 2), note("last", 4)],
    ]);
    const halfThenQuarterRest = makePattern("half-first", meter, [
      [note("first", 2), rest("gap", 4), note("last", 4)],
    ]);
    const first = createListenPlaybackPlan(quarterThenHalfRest);
    const second = createListenPlaybackPlan(halfThenQuarterRest);

    expect(first.toneEvents.map(event => event.tick)).toEqual(
      second.toneEvents.map(event => event.tick)
    );
    expect(first.toneEvents[0].endTick).not.toBe(second.toneEvents[0].endTick);
    expect(first.toneEvents[0].endOffsetSeconds).not.toBe(
      second.toneEvents[0].endOffsetSeconds
    );
  });

  it("distinguishes patterns with different note onsets", () => {
    const meter = { numerator: 4, denominator: 4 } as const;
    const quarterThenRest = makePattern("one-onset", meter, [
      [note("first", 4), rest("tail", 2, 1)],
    ]);
    const twoEighthsThenRest = makePattern("two-onsets", meter, [
      [note("first", 8), note("second", 8), rest("tail", 2, 1)],
    ]);
    const one = createListenPlaybackPlan(quarterThenRest);
    const two = createListenPlaybackPlan(twoEighthsThenRest);

    expect(one.toneEvents.map(event => event.tick)).toEqual([0]);
    expect(two.toneEvents.map(event => event.tick)).toEqual([0, 240]);
    expect(one.toneEvents.map(event => event.offsetSeconds)).not.toEqual(
      two.toneEvents.map(event => event.offsetSeconds)
    );
  });

  it("projects repeated bars from absolute ticks without cumulative drift", () => {
    const meter = { numerator: 4, denominator: 4 } as const;
    const pattern = makePattern(
      "repeated-bars",
      meter,
      Array.from({ length: 16 }, (_, index) => [note(`bar-${index}`, 1)]),
      137
    );
    const plan = createRhythmAudioPlan(pattern, "pattern");
    const measureTicks = deriveMeter(meter).measureTicks;

    expect(plan.toneEvents.map(event => event.offsetSeconds)).toEqual(
      Array.from({ length: 16 }, (_, index) =>
        ticksToSeconds(index * measureTicks, meter, 137)
      )
    );
    expect(plan.durationSeconds).toBe(
      ticksToSeconds(16 * measureTicks, meter, 137)
    );
    expect(new Set(plan.toneEvents.map(event => event.id)).size).toBe(16);
  });

  it("keeps Listen playback pattern-only while exposing main-pulse visual counts", () => {
    const plan = createListenPlaybackPlan(FOUR_FOUR);
    expect(plan.events).toEqual(plan.toneEvents);
    expect(plan.pulseEvents).toEqual([]);
    expect(plan.toneEvents.every(event => event.lane === "pattern")).toBe(true);
    expect(plan.visualCounting.map(count => count.count)).toEqual([1, 2, 3, 4]);
    expect(plan.visualCounting.map(count => count.tick)).toEqual([
      0, 480, 960, 1440,
    ]);
    expect(plan.voiceCounting).toMatchObject({
      available: false,
      language: "en",
    });
    expect(plan.voiceCounting.reason).toMatch(/unavailable/i);
  });

  it("returns deterministic, deeply frozen snapshots without mutating input", () => {
    const input = {
      id: "snapshot",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 97 },
      measures: [
        {
          id: "snapshot-measure",
          segments: [
            {
              id: "snapshot-note",
              kind: "note",
              duration: { denominator: 4, dots: 0 },
            },
            {
              id: "snapshot-rest",
              kind: "rest",
              duration: { denominator: 2, dots: 0 },
            },
            {
              id: "snapshot-tail",
              kind: "rest",
              duration: { denominator: 4, dots: 0 },
            },
          ],
        },
      ],
    };
    const original = JSON.stringify(input);
    const first = createRhythmAudioPlan(input, "both");
    const replay = createRhythmAudioPlan(input, "both");

    expect(first).toEqual(replay);
    expect(JSON.stringify(input)).toBe(original);
    expect(first.pattern).not.toBe(input);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.pattern)).toBe(true);
    expect(Object.isFrozen(first.pattern.measures)).toBe(true);
    expect(
      Object.isFrozen(first.pattern.measures[0].segments[0].duration)
    ).toBe(true);
    expect(Object.isFrozen(first.events)).toBe(true);
    expect(Object.isFrozen(first.toneEvents[0])).toBe(true);
    expect(Object.isFrozen(first.toneEvents[0].segmentIds)).toBe(true);
    expect(Object.isFrozen(first.pulseEvents[0].segmentIds)).toBe(true);
    expect(Object.isFrozen(first.visualCounting[0])).toBe(true);
    expect(Object.isFrozen(first.voiceCounting)).toBe(true);
  });

  it("rejects malformed patterns and invalid lane selections", () => {
    expect(() => createRhythmAudioPlan(null, "both")).toThrow();
    expect(() =>
      createRhythmAudioPlan(
        {
          ...FOUR_FOUR,
          meter: { numerator: 5, denominator: 4 },
        },
        "both"
      )
    ).toThrow();
    expect(() => createRhythmAudioPlan(FOUR_FOUR, "invalid" as never)).toThrow(
      /lanes/i
    );
  });
});

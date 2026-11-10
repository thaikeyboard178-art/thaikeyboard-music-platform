import { describe, expect, it } from "vitest";

import { deriveMeter, ticksToSeconds } from "./meters";
import type { RhythmMeter } from "../types";

describe("deriveMeter", () => {
  it.each([
    [
      { numerator: 2, denominator: 4 },
      960,
      480,
      2,
      [0, 480],
      [1, 1],
      { denominator: 4, dots: 0 },
    ],
    [
      { numerator: 3, denominator: 4 },
      1440,
      480,
      3,
      [0, 480, 960],
      [1, 1, 1],
      { denominator: 4, dots: 0 },
    ],
    [
      { numerator: 4, denominator: 4 },
      1920,
      480,
      4,
      [0, 480, 960, 1440],
      [1, 1, 1, 1],
      { denominator: 4, dots: 0 },
    ],
    [
      { numerator: 6, denominator: 8 },
      1440,
      720,
      2,
      [0, 720],
      [3, 3],
      { denominator: 4, dots: 1 },
    ],
  ] as const)(
    "derives exact metadata for %j",
    (
      meter,
      measureTicks,
      pulseTicks,
      pulseCount,
      pulseStarts,
      groups,
      pulseUnit
    ) => {
      const info = deriveMeter(meter as RhythmMeter);
      expect(info.measureTicks).toBe(measureTicks);
      expect(info.pulseTicks).toBe(pulseTicks);
      expect(info.pulseCount).toBe(pulseCount);
      expect(info.pulseStarts).toEqual(pulseStarts);
      expect(info.groups).toEqual(groups);
      expect(info.pulseUnit).toEqual(pulseUnit);
      expect(info.meter).toEqual(meter);
    }
  );

  it("derives each 3/4 and 6/8 pulse position from its own capacity and pulse size", () => {
    const simple = deriveMeter({ numerator: 3, denominator: 4 });
    const compound = deriveMeter({ numerator: 6, denominator: 8 });

    expect(simple.measureTicks).toBe(3 * simple.pulseTicks);
    expect(compound.measureTicks).toBe(2 * compound.pulseTicks);
    expect(simple.pulseStarts.map(start => start + simple.pulseTicks)).toEqual([
      480, 960, 1440,
    ]);
    expect(
      compound.pulseStarts.map(start => start + compound.pulseTicks)
    ).toEqual([720, 1440]);
    expect(simple.pulseCount).toBe(simple.groups.length);
    expect(compound.pulseCount).toBe(compound.groups.length);
  });

  it("returns deeply frozen copies and does not mutate the caller meter", () => {
    const input = { numerator: 4, denominator: 4 } as const;
    const info = deriveMeter(input);

    expect(info).not.toBe(input);
    expect(info.meter).not.toBe(input);
    expect(Object.isFrozen(info)).toBe(true);
    expect(Object.isFrozen(info.meter)).toBe(true);
    expect(Object.isFrozen(info.pulseStarts)).toBe(true);
    expect(Object.isFrozen(info.groups)).toBe(true);
    expect(Object.isFrozen(info.pulseUnit)).toBe(true);
    expect(input).toEqual({ numerator: 4, denominator: 4 });

    expect(() => {
      (info.pulseStarts as number[])[0] = 99;
    }).toThrow(TypeError);
    expect(() => {
      (info.groups as number[]).push(99);
    }).toThrow(TypeError);
    expect(() => {
      (info.pulseUnit as { denominator: 4; dots: 0 | 1 }).dots = 1;
    }).toThrow(TypeError);
  });

  it.each([
    { numerator: 3, denominator: 8 },
    { numerator: 6, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: "4", denominator: 4 },
    { numerator: 4, denominator: "4" },
    { numerator: Number.NaN, denominator: 4 },
    { numerator: 4, denominator: Number.POSITIVE_INFINITY },
  ] as const)("rejects invalid meter %j", meter => {
    expect(() => deriveMeter(meter as unknown as RhythmMeter)).toThrow(
      RangeError
    );
  });

  it.each([
    null,
    undefined,
    "4/4",
    4,
    [],
    { numerator: 4 },
    { denominator: 4 },
  ])("rejects malformed meter input %j", meter => {
    expect(() => deriveMeter(meter as unknown as RhythmMeter)).toThrow(
      RangeError
    );
  });
});

describe("ticksToSeconds", () => {
  it.each([
    [0, { numerator: 4, denominator: 4 }, 60, 0],
    [1920, { numerator: 4, denominator: 4 }, 60, 4],
    [1440, { numerator: 6, denominator: 8 }, 60, 2],
    [480, { numerator: 4, denominator: 4 }, 72, 5 / 6],
    [720, { numerator: 6, denominator: 8 }, 72, 5 / 6],
    [960, { numerator: 3, denominator: 4 }, 90, 4 / 3],
  ] as const)(
    "converts %d ticks in %j at %d BPM",
    (ticks, meter, bpm, expected) => {
      expect(ticksToSeconds(ticks, meter, bpm)).toBeCloseTo(expected, 12);
    }
  );

  it.each([
    [-1, { numerator: 4, denominator: 4 }, 60],
    [0.5, { numerator: 4, denominator: 4 }, 60],
    [Number.NaN, { numerator: 4, denominator: 4 }, 60],
    [Number.POSITIVE_INFINITY, { numerator: 4, denominator: 4 }, 60],
    [0, { numerator: 4, denominator: 4 }, 0],
    [0, { numerator: 4, denominator: 4 }, -60],
    [0, { numerator: 4, denominator: 4 }, Number.NaN],
    [0, { numerator: 4, denominator: 4 }, Number.POSITIVE_INFINITY],
    [0, { numerator: 5, denominator: 4 }, 60],
  ] as const)("rejects invalid conversion %j", (ticks, meter, bpm) => {
    expect(() => ticksToSeconds(ticks, meter as RhythmMeter, bpm)).toThrow(
      RangeError
    );
  });
});

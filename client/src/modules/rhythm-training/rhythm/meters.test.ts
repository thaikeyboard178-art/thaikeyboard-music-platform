import { describe, expect, it } from "vitest";

import {
  deriveMeter,
  deriveMeterStructure,
  getDefaultPulseBpm,
  MAX_PULSE_BPM,
  MIN_PULSE_BPM,
  ticksToSeconds,
} from "./meters";
import type { RhythmMeter } from "../types";

describe("deriveMeter", () => {
  it.each([
    [
      { numerator: 2, denominator: 4 },
      960,
      480,
      2,
      [0, 480],
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
      [0, 480, 960, 1440],
      [1, 1, 1, 1],
      { denominator: 4, dots: 0 },
    ],
    [
      { numerator: 3, denominator: 8 },
      720,
      240,
      3,
      [0, 240, 480],
      [0, 240, 480],
      [1, 1, 1],
      { denominator: 8, dots: 0 },
    ],
    [
      { numerator: 6, denominator: 8 },
      1440,
      240,
      6,
      [0, 240, 480, 720, 960, 1200],
      [0, 720],
      [3, 3],
      { denominator: 8, dots: 0 },
    ],
    [
      { numerator: 9, denominator: 8 },
      2160,
      240,
      9,
      [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
      [0, 720, 1440],
      [3, 3, 3],
      { denominator: 8, dots: 0 },
    ],
    [
      { numerator: 2, denominator: 2 },
      1920,
      960,
      2,
      [0, 960],
      [0, 960],
      [1, 1],
      { denominator: 2, dots: 0 },
    ],
  ] as const)(
    "derives exact metadata for %j",
    (
      meter,
      measureTicks,
      pulseTicks,
      pulseCount,
      pulseStarts,
      groupStarts,
      groups,
      pulseUnit
    ) => {
      const info = deriveMeter(meter as RhythmMeter);
      expect(info.measureTicks).toBe(measureTicks);
      expect(info.pulseTicks).toBe(pulseTicks);
      expect(info.pulseCount).toBe(pulseCount);
      expect(info.pulseStarts).toEqual(pulseStarts);
      expect(info.groupStarts).toEqual(groupStarts);
      expect(info.groups).toEqual(groups);
      expect(info.pulseUnit).toEqual(pulseUnit);
      expect(info.meter).toEqual(meter);
    }
  );

  it("derives each 3/4 and 6/8 pulse position from its own capacity and pulse size", () => {
    const simple = deriveMeter({ numerator: 3, denominator: 4 });
    const compound = deriveMeter({ numerator: 6, denominator: 8 });

    expect(simple.measureTicks).toBe(3 * simple.pulseTicks);
    expect(compound.measureTicks).toBe(6 * compound.pulseTicks);
    expect(simple.pulseStarts.map(start => start + simple.pulseTicks)).toEqual([
      480, 960, 1440,
    ]);
    expect(
      compound.pulseStarts.map(start => start + compound.pulseTicks)
    ).toEqual([240, 480, 720, 960, 1200, 1440]);
    expect(compound.pulseCount).toBe(6);
    expect(compound.groups).toEqual([3, 3]);
    expect(compound.groupStarts).toEqual([0, 720]);
    expect(compound.pulseCount).not.toBe(compound.groups.length);
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
    expect(Object.isFrozen(info.groupStarts)).toBe(true);
    expect(Object.isFrozen(info.pulseUnit)).toBe(true);
    expect(input).toEqual({ numerator: 4, denominator: 4 });

    expect(() => {
      (info.pulseStarts as number[])[0] = 99;
    }).toThrow(TypeError);
    expect(() => {
      (info.groups as number[]).push(99);
    }).toThrow(TypeError);
    expect(() => {
      (info.groupStarts as number[]).push(99);
    }).toThrow(TypeError);
    expect(() => {
      (info.pulseUnit as { denominator: 2 | 4 | 8; dots: 0 | 1 }).dots = 1;
    }).toThrow(TypeError);
  });

  it.each([
    { numerator: 5, denominator: 8 },
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
    [1440, { numerator: 6, denominator: 8 }, 60, 6],
    [1440, { numerator: 6, denominator: 8 }, 180, 2],
    [2160, { numerator: 9, denominator: 8 }, 180, 3],
    [1920, { numerator: 2, denominator: 2 }, 100, 1.2],
    [1920, { numerator: 4, denominator: 4 }, 30, 8],
    [1920, { numerator: 4, denominator: 4 }, 300, 0.8],
    [480, { numerator: 4, denominator: 4 }, 72, 5 / 6],
    [720, { numerator: 6, denominator: 8 }, 72, 2.5],
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
    [0, { numerator: 4, denominator: 4 }, 29],
    [0, { numerator: 4, denominator: 4 }, 301],
    [0, { numerator: 4, denominator: 4 }, Number.NaN],
    [0, { numerator: 4, denominator: 4 }, Number.POSITIVE_INFINITY],
    [0, { numerator: 5, denominator: 4 }, 60],
  ] as const)("rejects invalid conversion %j", (ticks, meter, bpm) => {
    expect(() => ticksToSeconds(ticks, meter as RhythmMeter, bpm)).toThrow(
      RangeError
    );
  });
});

describe("canonical defaults and independent group metadata", () => {
  it.each([
    [{ numerator: 2, denominator: 4 }, 100, 480, [0, 480], [0, 480]],
    [{ numerator: 3, denominator: 4 }, 100, 480, [0, 480, 960], [0, 480, 960]],
    [
      { numerator: 4, denominator: 4 },
      100,
      480,
      [0, 480, 960, 1440],
      [0, 480, 960, 1440],
    ],
    [{ numerator: 3, denominator: 8 }, 180, 240, [0, 240, 480], [0, 240, 480]],
    [
      { numerator: 6, denominator: 8 },
      180,
      240,
      [0, 240, 480, 720, 960, 1200],
      [0, 720],
    ],
    [
      { numerator: 9, denominator: 8 },
      180,
      240,
      [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
      [0, 720, 1440],
    ],
    [{ numerator: 2, denominator: 2 }, 100, 960, [0, 960], [0, 960]],
  ] as const)(
    "keeps pulse and grouping independent for %j",
    (meter, defaultBpm, pulseTicks, pulseStarts, groupStarts) => {
      const info = deriveMeter(meter as RhythmMeter);
      expect(info.pulseTicks).toBe(pulseTicks);
      expect(info.pulseStarts).toEqual(pulseStarts);
      expect(info.groupStarts).toEqual(groupStarts);
      expect(getDefaultPulseBpm(meter as RhythmMeter)).toBe(defaultBpm);
    }
  );

  it("preserves approved compound accents on their existing eighth ticks", () => {
    expect(
      deriveMeterStructure(
        { numerator: 6, denominator: 8 },
        240
      ).accentPositions.map(x => [x.tick, x.level])
    ).toEqual([
      [0, "strong"],
      [240, "weak"],
      [480, "weak"],
      [720, "medium"],
      [960, "weak"],
      [1200, "weak"],
    ]);
    expect(
      deriveMeterStructure({ numerator: 9, denominator: 8 }, 240)
        .accentPositions.filter(x => x.level !== "weak")
        .map(x => [x.tick, x.level])
    ).toEqual([
      [0, "strong"],
      [720, "medium"],
      [1440, "medium"],
    ]);
    expect([MIN_PULSE_BPM, MAX_PULSE_BPM]).toEqual([30, 300]);
  });
});

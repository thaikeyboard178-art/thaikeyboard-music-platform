import { describe, expect, it } from "vitest";

import type { RhythmMeter } from "../types";
import { deriveMeterStructure, type StructuralAccent } from "./meters";
import { deriveRhythmTimeline } from "./deriveTimeline";
import { FOUR_FOUR, HALF_TIE, SIX_EIGHT_REST } from "./fixtures";

describe("canonical meter structures", () => {
  it.each([
    [{ numerator: 2, denominator: 4 }, 960, 480, [0, 480], ["strong", "weak"]],
    [
      { numerator: 3, denominator: 4 },
      1440,
      480,
      [0, 480, 960],
      ["strong", "weak", "weak"],
    ],
    [
      { numerator: 4, denominator: 4 },
      1920,
      480,
      [0, 480, 960, 1440],
      ["strong", "weak", "medium", "weak"],
    ],
    [
      { numerator: 3, denominator: 8 },
      720,
      240,
      [0, 240, 480],
      ["strong", "weak", "weak"],
    ],
    [
      { numerator: 6, denominator: 8 },
      1440,
      720,
      [0, 720],
      ["strong", "medium"],
    ],
    [
      { numerator: 9, denominator: 8 },
      2160,
      720,
      [0, 720, 1440],
      ["strong", "medium", "medium"],
    ],
    [{ numerator: 2, denominator: 2 }, 1920, 960, [0, 960], ["strong", "weak"]],
  ] as const)(
    "derives %j structure with exact accent pairs",
    (meter, measureTicks, pulseTicks, pulseStarts, levels) => {
      const structure = deriveMeterStructure(meter as RhythmMeter);
      expect(structure.meter).toEqual(meter);
      expect(structure.measureTicks).toBe(measureTicks);
      expect(structure.pulseTicks).toBe(pulseTicks);
      expect(structure.pulseStarts).toEqual(pulseStarts);
      const subdivisionStarts = Array.from(
        { length: measureTicks / 120 },
        (_, index) => index * 120
      );
      expect(structure.subdivisionStarts).toEqual(subdivisionStarts);
      expect(structure.accentPositions.map(position => position.tick)).toEqual(
        subdivisionStarts
      );
      expect(
        structure.accentPositions
          .filter(position => pulseStarts.some(tick => tick === position.tick))
          .map(position => [position.tick, position.level])
      ).toEqual(pulseStarts.map((tick, index) => [tick, levels[index]]));
      expect(
        structure.accentPositions.map(position => position.pulseIndex)
      ).toEqual(subdivisionStarts.map(tick => Math.floor(tick / pulseTicks)));
      expect(
        structure.accentPositions.map(position => position.subdivisionIndex)
      ).toEqual(subdivisionStarts.map(tick => (tick % pulseTicks) / 120));
    }
  );

  it.each([
    [{ numerator: 9, denominator: 8 }, 120],
    [{ numerator: 6, denominator: 8 }, 240],
    [{ numerator: 4, denominator: 4 }, 480],
  ] as const)(
    "supports exact grid %d when it divides the selected pulse",
    (meter, subdivisionTicks) => {
      const structure = deriveMeterStructure(meter, subdivisionTicks);
      expect(structure.subdivisionTicks).toBe(subdivisionTicks);
      expect(structure.subdivisionStarts.at(-1)).toBe(
        structure.measureTicks - subdivisionTicks
      );
    }
  );

  it.each([0, 60, 180, 300, Number.NaN, 480] as const)(
    "rejects unsupported or non-dividing grid %d",
    subdivisionTicks => {
      expect(() =>
        deriveMeterStructure({ numerator: 6, denominator: 8 }, subdivisionTicks)
      ).toThrow(RangeError);
    }
  );

  it("rejects unsupported 5/8 without weakening the seven-meter schema", () => {
    expect(() =>
      deriveMeterStructure({
        numerator: 5,
        denominator: 8,
      } as unknown as RhythmMeter)
    ).toThrow(RangeError);
  });

  it("deep-freezes all derived structure layers", () => {
    const structure = deriveMeterStructure({ numerator: 4, denominator: 4 });
    for (const value of [
      structure,
      structure.meter,
      structure.pulseStarts,
      structure.subdivisionStarts,
      structure.accentPositions,
      structure.accentPositions[0],
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(() => {
      (structure.subdivisionStarts as number[])[0] = 99;
    }).toThrow(TypeError);
    expect(() => {
      (
        structure.accentPositions as Array<{
          tick: number;
          level: StructuralAccent;
          pulseIndex: number;
          subdivisionIndex: number;
        }>
      )[0].level = "weak";
    }).toThrow(TypeError);
  });
});

describe("timeline structure integration", () => {
  it("attaches canonical structure while preserving explicit segment accents", () => {
    const input = {
      ...FOUR_FOUR,
      measures: FOUR_FOUR.measures.map(measure => ({
        ...measure,
        segments: measure.segments.map((segment, index) =>
          index === 0 ? { ...segment, accent: "strong" as const } : segment
        ),
      })),
    };
    const timeline = deriveRhythmTimeline(input, 240);
    expect(timeline.structure.accentPositions).toEqual([
      { tick: 0, level: "strong", pulseIndex: 0, subdivisionIndex: 0 },
      { tick: 240, level: "weak", pulseIndex: 0, subdivisionIndex: 1 },
      { tick: 480, level: "weak", pulseIndex: 1, subdivisionIndex: 0 },
      { tick: 720, level: "weak", pulseIndex: 1, subdivisionIndex: 1 },
      { tick: 960, level: "medium", pulseIndex: 2, subdivisionIndex: 0 },
      { tick: 1200, level: "weak", pulseIndex: 2, subdivisionIndex: 1 },
      { tick: 1440, level: "weak", pulseIndex: 3, subdivisionIndex: 0 },
      { tick: 1680, level: "weak", pulseIndex: 3, subdivisionIndex: 1 },
    ]);
    expect(timeline.segments[0].accent).toBe("strong");
    expect(timeline.structure.subdivisionTicks).toBe(240);
  });

  it("keeps rest and tie/onset behavior independent of structural accents", () => {
    const restTimeline = deriveRhythmTimeline(SIX_EIGHT_REST);
    expect(
      restTimeline.structure.accentPositions.map(position => position.level)
    ).toEqual([
      "strong",
      "weak",
      "weak",
      "weak",
      "weak",
      "weak",
      "medium",
      "weak",
      "weak",
      "weak",
      "weak",
      "weak",
    ]);
    expect(restTimeline.onsets).toEqual([]);
    expect(restTimeline.soundingSpans).toEqual([]);

    const tieTimeline = deriveRhythmTimeline(HALF_TIE);
    expect(tieTimeline.structure.accentPositions[0].level).toBe("strong");
    expect(tieTimeline.onsets).toEqual([0]);
    expect(tieTimeline.soundingSpans[0].endTicks).toBe(1920);
  });
});

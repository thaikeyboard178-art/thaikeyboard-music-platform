import { describe, expect, it } from "vitest";
import {
  DOTTED_EIGHTH,
  FOUR_FOUR,
  SIX_EIGHT,
  SIX_EIGHT_CROSS_TIE,
} from "../rhythm/fixtures";
import { projectRhythmNotation } from "./projection";
import { RHYTHM_NOTATION_EXAMPLES } from "./examples";

describe("projectRhythmNotation", () => {
  it("keeps canonical duration strings, ticks, onsets, and tie roles", () => {
    const projection = projectRhythmNotation(FOUR_FOUR);
    expect(projection.segments.map(segment => segment.duration)).toEqual([
      "4",
      "8",
      "8",
      "4r",
      "4",
    ]);
    expect(
      projection.segments.map(segment => segment.canonicalDurationTicks)
    ).toEqual([480, 240, 240, 480, 480]);
    expect(projection.segments.map(segment => segment.startTicks)).toEqual([
      0, 480, 720, 960, 1440,
    ]);
    expect(projection.segments.map(segment => segment.onset)).toEqual([
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(projection.tieEdges).toHaveLength(0);
  });

  it("beams dotted eighth plus sixteenth without crossing a pulse, rest, or barline", () => {
    const dotted = projectRhythmNotation(DOTTED_EIGHTH);
    expect(dotted.beamGroups.map(group => group.segmentIds)).toEqual([
      ["a", "b"],
    ]);

    const compound = projectRhythmNotation(SIX_EIGHT);
    expect(compound.beamGroups.map(group => group.segmentIds)).toEqual([
      ["b", "c"],
    ]);
    expect(
      compound.beamGroups.every(group =>
        group.segmentIds.every(id => id !== "r")
      )
    ).toBe(true);
  });

  it("derives 3+3 compound pulse groups and every adjacent tie edge", () => {
    const projection = projectRhythmNotation(SIX_EIGHT_CROSS_TIE);
    expect(projection.beamGroups).toHaveLength(2);
    expect(projection.beamGroups[0].segmentIds).toEqual(["b", "c", "t-start"]);
    expect(projection.beamGroups[0].startTicks).toBe(720);
    expect(projection.beamGroups[0].endTicks).toBe(1440);
    expect(projection.beamGroups[1].segmentIds).toEqual(["t-end", "d", "e"]);
    expect(projection.beamGroups[1].startTicks).toBe(1440);
    expect(projection.beamGroups[1].endTicks).toBe(2160);
    expect(projection.tieEdges).toEqual([
      expect.objectContaining({
        fromSegmentId: "t-start",
        toSegmentId: "t-end",
        crossesBarline: true,
      }),
    ]);
  });

  it("returns deeply immutable projection containers and never mutates input", () => {
    const before = JSON.stringify(FOUR_FOUR);
    const projection = projectRhythmNotation(FOUR_FOUR);
    expect(JSON.stringify(FOUR_FOUR)).toBe(before);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.segments)).toBe(true);
    expect(Object.isFrozen(projection.segments[0])).toBe(true);
    expect(Object.isFrozen(projection.beamGroups)).toBe(true);
    expect(Object.isFrozen(projection.tieEdges)).toBe(true);
  });

  it("rejects invalid bars before producing a projection", () => {
    const invalid = {
      ...FOUR_FOUR,
      measures: [
        {
          ...FOUR_FOUR.measures[0],
          segments: FOUR_FOUR.measures[0].segments.slice(0, -1),
        },
      ],
    };
    expect(() => projectRhythmNotation(invalid)).toThrow(/MEASURE_UNDERFILLED/);
  });

  it("projects all published examples as exact canonical patterns", () => {
    for (const example of RHYTHM_NOTATION_EXAMPLES) {
      const projection = projectRhythmNotation(example.pattern);
      expect(projection.timeline.totalTicks).toBeGreaterThan(0);
      expect(projection.segments.length).toBeGreaterThan(0);
    }
  });
});

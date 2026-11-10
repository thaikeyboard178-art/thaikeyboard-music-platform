import { describe, expect, it } from "vitest";
import type { RhythmPattern } from "../types";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { requireValidRhythmPattern } from "../rhythm/validate";
import {
  assertLevelConstraints,
  generateRhythmPattern,
  patternMetrics,
  type RhythmGenerationConfig,
} from "./generator";

const levels = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function config(
  level: RhythmGenerationConfig["level"],
  seed: string
): RhythmGenerationConfig {
  return { level, seed, bars: 1 };
}

describe("seeded level-constrained rhythm generation", () => {
  it("generates exact, canonical, nonempty bars across a broad seed matrix", () => {
    for (const level of levels) {
      for (let index = 0; index < 50; index += 1) {
        const input = config(level, `matrix-${level}-${index}`);
        const pattern = generateRhythmPattern(input);
        const canonical = requireValidRhythmPattern(pattern);
        const timeline = deriveRhythmTimeline(canonical, 120);
        expect(canonical.measures).toHaveLength(1);
        expect(timeline.onsets.length).toBeGreaterThan(0);
        expect(
          timeline.segments.every(
            segment => segment.absoluteEndTicks > segment.absoluteStartTicks
          )
        ).toBe(true);
        expect(() => assertLevelConstraints(canonical, input)).not.toThrow();
      }
    }
  });

  it("is stable for repeated deep-equal configs and changes the stream with a seed", () => {
    const input = {
      seed: "repeatable",
      level: 8,
      meter: { numerator: 4, denominator: 4 },
      bars: 2,
    } as const;
    const first = generateRhythmPattern(input);
    const second = generateRhythmPattern({ ...input });
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    const changed = generateRhythmPattern({ ...input, seed: "different" });
    expect(JSON.stringify(changed)).not.toBe(JSON.stringify(first));
  });

  it("keeps default outputs varied enough for choice generation", () => {
    for (const level of levels) {
      const identities = new Set<string>();
      for (let index = 0; index < 20; index += 1) {
        const pattern = generateRhythmPattern(
          config(level, `varied-${level}-${index}`)
        );
        const metrics = patternMetrics(pattern);
        identities.add(
          JSON.stringify([
            metrics.onsets,
            metrics.restsPerBar,
            metrics.hasDot,
            metrics.hasFine,
            metrics.hasTie,
          ])
        );
      }
      expect(identities.size).toBeGreaterThanOrEqual(4);
    }
  });

  it("uses real dots-only, ties-only, and combined provenance at Level 4", () => {
    const dots = generateRhythmPattern({
      seed: "dots",
      level: 4,
      focus: "dots",
    });
    const ties = generateRhythmPattern({
      seed: "ties",
      level: 4,
      focus: "ties",
    });
    const combined = generateRhythmPattern({
      seed: "combined",
      level: 4,
      focus: "combined",
    });
    expect(patternMetrics(dots)).toMatchObject({ hasDot: true, hasTie: false });
    expect(patternMetrics(ties)).toMatchObject({ hasDot: false, hasTie: true });
    expect(patternMetrics(combined)).toMatchObject({
      hasDot: true,
      hasTie: true,
    });
  });

  it("keeps Level 5 sixteenth-family notation inside one pulse per bar", () => {
    for (let index = 0; index < 30; index += 1) {
      const pattern = generateRhythmPattern({
        seed: `fine-${index}`,
        level: 5,
        focus: "sixteenths",
      });
      const metrics = patternMetrics(pattern);
      expect(metrics.hasFine).toBe(true);
      expect(metrics.hasDot).toBe(false);
      expect(metrics.hasTie).toBe(false);
      expect(metrics.finePulsesPerBar.every(count => count <= 1)).toBe(true);
    }
  });

  it("models Level 6 as 6/8 with two 720-tick pulse groups", () => {
    for (let index = 0; index < 25; index += 1) {
      const pattern = generateRhythmPattern({
        seed: `compound-${index}`,
        level: 6,
      });
      const timeline = deriveRhythmTimeline(pattern, 240);
      expect(pattern.meter).toEqual({ numerator: 6, denominator: 8 });
      expect(timeline.meter.pulseTicks).toBe(720);
      expect(timeline.meter.groups).toEqual([3, 3]);
      expect(timeline.totalTicks).toBe(pattern.measures.length * 1440);
      expect(
        pattern.measures
          .flatMap(measure => measure.segments)
          .some(segment => segment.duration.denominator === 1)
      ).toBe(false);
    }
  });

  it("creates complete two-bar cross-bar ties only when requested", () => {
    const pattern = generateRhythmPattern({
      seed: "cross-bar",
      level: 4,
      bars: 2,
      meter: { numerator: 4, denominator: 4 },
      focus: "ties",
    });
    const tied = pattern.measures
      .flatMap(measure => measure.segments)
      .filter(segment => segment.tieGroupId === "tie-1");
    expect(pattern.measures).toHaveLength(2);
    expect(tied).toHaveLength(2);
    expect(pattern.measures[0].segments.at(-1)?.tieGroupId).toBe("tie-1");
    expect(pattern.measures[1].segments[0].tieGroupId).toBe("tie-1");
    expect(deriveRhythmTimeline(pattern).onsets).not.toContain(1920);
  });

  it("rejects invalid level, meter, seed, bar, focus, and tempo configurations", () => {
    const bad = [
      { seed: "x", level: 0 as never },
      { seed: "x", level: 1 as const, meter: { numerator: 3, denominator: 4 } },
      { seed: "x", level: 6 as const, meter: { numerator: 4, denominator: 4 } },
      { seed: "x", level: 1 as const, bars: 3 as never },
      { seed: "x", level: 1 as const, focus: "dots" as never },
      { seed: "x", level: 1 as const, pulseBpm: 200 },
      { seed: "", level: 1 as const },
    ];
    for (const item of bad) {
      expect(() =>
        generateRhythmPattern(item as RhythmGenerationConfig)
      ).toThrow(RangeError);
    }
  });

  it("rejects valid-duration but level-invalid external bars and all-rest ambiguity", () => {
    const dottedLevel3: RhythmPattern = {
      id: "tampered-dot",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "a", kind: "note", duration: { denominator: 4, dots: 1 } },
            { id: "b", kind: "note", duration: { denominator: 4, dots: 0 } },
            { id: "c", kind: "note", duration: { denominator: 8, dots: 0 } },
            { id: "d", kind: "note", duration: { denominator: 4, dots: 0 } },
          ],
        },
      ],
    };
    expect(() =>
      assertLevelConstraints(dottedLevel3, {
        seed: "audit",
        level: 3,
        meter: { numerator: 4, denominator: 4 },
        pulseBpm: 72,
      })
    ).toThrow(RangeError);

    const allRest: RhythmPattern = {
      id: "all-rest",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 72 },
      measures: [
        {
          id: "m1",
          segments: [
            { id: "r", kind: "rest", duration: { denominator: 1, dots: 0 } },
          ],
        },
      ],
    };
    expect(() =>
      assertLevelConstraints(allRest, {
        seed: "audit",
        level: 1,
        meter: { numerator: 4, denominator: 4 },
        pulseBpm: 72,
      })
    ).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";
import type { RhythmPattern } from "../types";
import {
  generateRhythmPattern,
  assertLevelConstraints,
  patternMetrics,
} from "./generator";
import {
  generateRhythmChoices,
  InsufficientDistinctChoicesError,
} from "./choices";

const paired: RhythmPattern = {
  id: "paired-eighths",
  meter: { numerator: 4, denominator: 4 },
  tempo: { pulseBpm: 72 },
  measures: [
    {
      id: "m1",
      segments: Array.from({ length: 8 }, (_, index) => ({
        id: `s${index}`,
        kind: "note",
        duration: { denominator: 8, dots: 0 },
      })),
    },
  ],
};

describe("Phase2 generator integration regressions", () => {
  it("does not count ordinary paired eighths as new syncopation", () => {
    expect(patternMetrics(paired).hasSyncopation).toBe(false);
    expect(patternMetrics(paired).sourceCount).toBe(0);
    expect(() =>
      assertLevelConstraints(paired, {
        seed: "audit",
        level: 2,
        meter: paired.meter,
        pulseBpm: 72,
      })
    ).not.toThrow();
  });
  it("audits the second complete bar in measure-relative rather than absolute ticks", () => {
    const input = {
      ...paired,
      measures: [
        paired.measures[0],
        {
          id: "m2",
          segments: paired.measures[0].segments.map(segment => ({
            ...segment,
            id: `${segment.id}-second`,
          })),
        },
      ],
    };
    expect(() =>
      assertLevelConstraints(input, {
        seed: "audit",
        level: 2,
        meter: paired.meter,
        bars: 2,
        pulseBpm: 72,
      })
    ).not.toThrow();
  });
  it("keeps integrated vocabulary auditing independent of candidate-stream seeds", () => {
    for (let index = 0; index < 40; index++) {
      const input = {
        seed: `integrated-${index}`,
        level: 5 as const,
        meter: { numerator: 4 as const, denominator: 4 as const },
        bars: 2 as const,
        pulseBpm: 72,
      };
      const pattern = generateRhythmPattern(input);
      expect(patternMetrics(pattern).sourceCount).toBeLessThanOrEqual(2);
      expect(() =>
        assertLevelConstraints(pattern, {
          ...input,
          seed: `different-audit-${index}`,
        })
      ).not.toThrow();
    }
  });
  it("combines adjacent sixteenth notes with ties in the Level 5 advanced vocabulary", () => {
    let pattern: RhythmPattern | undefined;
    for (let seed = 0; seed < 100 && !pattern; seed += 1) {
      const candidate = generateRhythmPattern({
        seed: `level5-integrated-tie-${seed}`,
        level: 5,
        meter: { numerator: 4, denominator: 4 },
      });
      const metrics = patternMetrics(candidate);
      const tied = candidate.measures
        .flatMap(measure => measure.segments)
        .filter(segment => segment.tieGroupId !== undefined);
      if (
        metrics.hasFine &&
        metrics.hasTie &&
        !metrics.hasDot &&
        tied.length === 2 &&
        tied.every(segment => segment.duration.denominator === 16)
      )
        pattern = candidate;
    }
    expect(pattern).toBeDefined();
    expect(patternMetrics(pattern!)).toMatchObject({
      hasFine: true,
      hasTie: true,
      sourceCount: 2,
    });
    const tied = pattern!.measures
      .flatMap(measure => measure.segments)
      .filter(segment => segment.tieGroupId !== undefined);
    expect(tied).toHaveLength(2);
    expect(tied.every(segment => segment.duration.denominator === 16)).toBe(
      true
    );
  });
  it("rejects three interacting difficulty sources in the Level 5 integrated budget", () => {
    const input: RhythmPattern = {
      id: "three-sources",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 60 },
      measures: [
        {
          id: "m",
          segments: [
            {
              id: "a",
              kind: "note",
              duration: { denominator: 8, dots: 1 },
              tieGroupId: "T",
            },
            {
              id: "b",
              kind: "note",
              duration: { denominator: 16, dots: 0 },
              tieGroupId: "T",
            },
            { id: "c", kind: "note", duration: { denominator: 8, dots: 0 } },
            { id: "r", kind: "rest", duration: { denominator: 4, dots: 1 } },
            { id: "d", kind: "note", duration: { denominator: 4, dots: 0 } },
          ],
        },
      ],
    };
    expect(patternMetrics(input)).toMatchObject({
      hasDotConcept: true,
      hasFine: true,
      hasTie: true,
      sourceCount: 3,
    });
    expect(() =>
      assertLevelConstraints(input, {
        seed: "audit",
        level: 5,
        meter: input.meter,
        pulseBpm: 60,
      })
    ).toThrow(/at most 2/);
  });
  it("does not call eighth-note pulse onsets syncopated in basic compound focus", () => {
    const input: RhythmPattern = {
      id: "compound-sync",
      meter: { numerator: 6, denominator: 8 },
      tempo: { pulseBpm: 60 },
      measures: [
        {
          id: "m",
          segments: [
            { id: "a", kind: "note", duration: { denominator: 8, dots: 0 } },
            { id: "b", kind: "note", duration: { denominator: 4, dots: 0 } },
            { id: "c", kind: "note", duration: { denominator: 8, dots: 0 } },
            { id: "d", kind: "note", duration: { denominator: 4, dots: 0 } },
          ],
        },
      ],
    };
    expect(patternMetrics(input).hasSyncopation).toBe(false);
    expect(() =>
      assertLevelConstraints(input, {
        seed: "audit",
        level: 6,
        meter: input.meter,
        pulseBpm: 60,
      })
    ).not.toThrow();
  });
  it("reuses ties in Level 5 syncopation items without exceeding one syncopated attack", () => {
    let tied = false;
    let untied = false;
    for (let seed = 0; seed < 40; seed++) {
      const pattern = generateRhythmPattern({
        seed: `sync-ties-${seed}`,
        level: 5,
        meter: { numerator: 4, denominator: 4 },
        pulseBpm: 60,
        focus: "syncopation",
      });
      const metrics = patternMetrics(pattern);
      tied ||= metrics.hasTie;
      untied ||= !metrics.hasTie;
      expect(metrics.hasSyncopation).toBe(true);
      expect(metrics.offbeatOnsetsPerBar.every(count => count <= 1)).toBe(true);
    }
    expect(tied && untied).toBe(true);
  });
  it("uses a diversity-safe default for four Level4 dot options", () => {
    const result = generateRhythmChoices({
      seed: "small-meter-regression",
      level: 4,
    });
    expect(result.target.meter).toEqual({ numerator: 4, denominator: 4 });
    expect(result.choices).toHaveLength(4);
  });
  it("fails closed for four choices in an explicitly fixed2/4 dot vocabulary, but can supply three", () => {
    const config = {
      seed: "finite-dot-vocabulary",
      level: 4 as const,
      meter: { numerator: 2 as const, denominator: 4 as const },
      focus: "dots" as const,
      bars: 1 as const,
      pulseBpm: 60,
    };
    expect(() => generateRhythmChoices({ ...config, count: 4 })).toThrow(
      InsufficientDistinctChoicesError
    );
    const result = generateRhythmChoices({ ...config, count: 3 });
    expect(result.choices).toHaveLength(3);
    expect(result.target.meter).toEqual(config.meter);
  });
});

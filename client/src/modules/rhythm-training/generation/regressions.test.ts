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
import { answerSignatures } from "./answerSignatures";

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
  it("accepts a valid imported two-bar combined 2/4 pattern while rejecting the infeasible single bar", () => {
    const pattern: RhythmPattern = {
      id: "combined-2-4-two-bars",
      meter: { numerator: 2, denominator: 4 },
      tempo: { pulseBpm: 60 },
      measures: [
        {
          id: "m1",
          segments: [
            {
              id: "m1-dot",
              kind: "note",
              duration: { denominator: 4, dots: 1 },
            },
            {
              id: "m1-rest",
              kind: "rest",
              duration: { denominator: 8, dots: 0 },
            },
          ],
        },
        {
          id: "m2",
          segments: [
            {
              id: "m2-tie-a",
              kind: "note",
              duration: { denominator: 8, dots: 0 },
              tieGroupId: "m2-tie",
            },
            {
              id: "m2-tie-b",
              kind: "note",
              duration: { denominator: 8, dots: 0 },
              tieGroupId: "m2-tie",
            },
            {
              id: "m2-rest",
              kind: "rest",
              duration: { denominator: 4, dots: 0 },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertLevelConstraints(pattern, {
        seed: "combined-2-4-two-bars",
        level: 3,
        meter: pattern.meter,
        bars: 2,
        focus: "combined",
        pulseBpm: 60,
      })
    ).not.toThrow();
    expect(patternMetrics(pattern)).toMatchObject({
      hasDot: true,
      hasTie: true,
      hasFine: false,
      restsPerBar: [1, 1],
    });
    expect(() =>
      generateRhythmPattern({
        seed: "combined-2-4-single-bar",
        level: 3,
        meter: { numerator: 2, denominator: 4 },
        bars: 1,
        focus: "combined",
      })
    ).toThrow(/single 2\/4 measure.*required rest/i);
    const generated = generateRhythmPattern({
      seed: "combined-2-4-generated-two-bars",
      level: 3,
      meter: { numerator: 2, denominator: 4 },
      bars: 2,
      focus: "combined",
    });
    expect(generated.measures).toHaveLength(2);
    expect(patternMetrics(generated)).toMatchObject({
      hasDot: true,
      hasTie: true,
      hasFine: false,
    });
  });

  it("fails closed beyond the exactly two real fixed-2/4 dot answers", () => {
    const config = {
      seed: "finite-dot-vocabulary",
      level: 4 as const,
      meter: { numerator: 2 as const, denominator: 4 as const },
      focus: "dots" as const,
      bars: 1 as const,
      pulseBpm: 60,
    };
    const productionSignatures = new Set<string>();
    for (let seed = 0; seed < 80; seed += 1) {
      const pattern = generateRhythmPattern({
        ...config,
        seed: `finite-dot-vocabulary/${seed}`,
      });
      productionSignatures.add(answerSignatures(pattern).discriminationSounding);
    }
    expect(productionSignatures).toEqual(
      new Set(["[[0,720]]", "[[720,960]]"])
    );

    const result = generateRhythmChoices({ ...config, count: 2 });
    expect(result.choices).toHaveLength(2);
    expect(result.target.meter).toEqual(config.meter);
    expect(
      new Set(
        result.choices.map(
          choice => answerSignatures(choice.pattern).discriminationSounding
        )
      )
    ).toEqual(productionSignatures);
    for (const count of [3, 4] as const) {
      expect(() => generateRhythmChoices({ ...config, count })).toThrow(
        InsufficientDistinctChoicesError
      );
    }
  });
});

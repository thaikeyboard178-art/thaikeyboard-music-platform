import { describe, expect, it } from "vitest";
import type { RhythmPattern } from "../types";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { deriveMeter, getDefaultPulseBpm } from "../rhythm/meters";
import { requireValidRhythmPattern } from "../rhythm/validate";
import {
  assertLevelConstraints,
  generateRhythmPattern,
  patternMetrics,
  type RhythmGenerationConfig,
} from "./generator";

const levels = [1, 2, 3, 4, 5, 6, "bonus"] as const;

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
      level: 5,
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

  it("generates Level 3 dots, ties, and mixed focus across the approved simple meters", () => {
    const cases = [
      { numerator: 2, denominator: 4 },
      { numerator: 3, denominator: 4 },
      { numerator: 4, denominator: 4 },
    ] as const;
    for (const meter of cases) {
      for (const focus of ["dots", "ties", "combined"] as const) {
        for (let seed = 0; seed < 6; seed += 1) {
          if (meter.numerator === 2 && focus === "combined") {
            expect(() =>
              generateRhythmPattern({
                seed: `level3/${meter.numerator}/${focus}/${seed}`,
                level: 3,
                meter,
                focus,
              })
            ).toThrow(/single 2\/4 measure.*required rest/i);
            continue;
          }
          const pattern = generateRhythmPattern({
            seed: `level3/${meter.numerator}/${focus}/${seed}`,
            level: 3,
            meter,
            focus,
          });
          const metrics = patternMetrics(pattern);
          expect(pattern.meter).toEqual(meter);
          expect(metrics.hasFine).toBe(false);
          if (focus === "dots")
            expect(metrics).toMatchObject({ hasDot: true, hasTie: false });
          if (focus === "ties")
            expect(metrics).toMatchObject({ hasDot: false, hasTie: true });
          if (focus === "combined")
            expect(metrics).toMatchObject({ hasDot: true, hasTie: true });
          expect(() =>
            assertLevelConstraints(pattern, {
              seed: `level3/${meter.numerator}/${focus}/${seed}`,
              level: 3,
              meter,
              focus,
            })
          ).not.toThrow();
        }
      }
    }
    const defaultPattern = generateRhythmPattern({
      seed: "level3-default-combined",
      level: 3,
    });
    expect(patternMetrics(defaultPattern)).toMatchObject({
      hasDot: true,
      hasTie: true,
      hasFine: false,
    });
    const omittedFocusAtTwoFour = generateRhythmPattern({
      seed: "level3-default-focus-two-four",
      level: 3,
      meter: { numerator: 2, denominator: 4 },
    });
    expect(omittedFocusAtTwoFour.meter).toEqual({
      numerator: 2,
      denominator: 4,
    });
    expect(patternMetrics(omittedFocusAtTwoFour)).toMatchObject({
      hasDot: true,
      hasTie: false,
      hasFine: false,
    });
  });

  it("keeps Level 4 dots and ties available and genuinely generates sixteenth notes and rests", () => {
    for (const focus of ["dots", "ties", "combined"] as const) {
      const pattern = generateRhythmPattern({
        seed: `level4/${focus}`,
        level: 4,
        focus,
      });
      const metrics = patternMetrics(pattern);
      expect(metrics.hasFine).toBe(false);
      if (focus === "dots")
        expect(metrics).toMatchObject({ hasDot: true, hasTie: false });
      if (focus === "ties")
        expect(metrics).toMatchObject({ hasDot: false, hasTie: true });
      if (focus === "combined")
        expect(metrics).toMatchObject({ hasDot: true, hasTie: true });
    }

    let sawSixteenthNote = false;
    let sawSixteenthRest = false;
    for (let seed = 0; seed < 60; seed += 1) {
      const pattern = generateRhythmPattern({
        seed: `level4-sixteenths-${seed}`,
        level: 4,
        focus: "sixteenths",
      });
      const segments = pattern.measures.flatMap(measure => measure.segments);
      const sixteenths = segments.filter(
        segment => segment.duration.denominator === 16
      );
      expect(patternMetrics(pattern).hasFine).toBe(true);
      expect(patternMetrics(pattern).hasDot).toBe(false);
      expect(patternMetrics(pattern).hasTie).toBe(false);
      sawSixteenthNote ||= sixteenths.some(segment => segment.kind === "note");
      sawSixteenthRest ||= sixteenths.some(segment => segment.kind === "rest");
    }
    expect(sawSixteenthNote).toBe(true);
    expect(sawSixteenthRest).toBe(true);

    const defaultPattern = generateRhythmPattern({
      seed: "level4-default",
      level: 4,
    });
    expect(patternMetrics(defaultPattern).hasFine).toBe(true);
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

  it("executes all approved Level 6 meters with their distinct pulse semantics", () => {
    const cases = [
      {
        meter: { numerator: 3, denominator: 8 },
        pulseTicks: 240,
        pulseCount: 3,
        pulseStarts: [0, 240, 480],
        groupStarts: [0, 240, 480],
        groups: [1, 1, 1],
        capacity: 720,
      },
      {
        meter: { numerator: 6, denominator: 8 },
        pulseTicks: 240,
        pulseCount: 6,
        pulseStarts: [0, 240, 480, 720, 960, 1200],
        groupStarts: [0, 720],
        groups: [3, 3],
        capacity: 1440,
      },
      {
        meter: { numerator: 9, denominator: 8 },
        pulseTicks: 240,
        pulseCount: 9,
        pulseStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
        groupStarts: [0, 720, 1440],
        groups: [3, 3, 3],
        capacity: 2160,
      },
    ] as const;
    for (const entry of cases) {
      for (let index = 0; index < 10; index += 1) {
        const pattern = generateRhythmPattern({
          seed: `level6-${entry.meter.numerator}-${index}`,
          level: 6,
          meter: entry.meter,
          pulseBpm: 60,
        });
        const timeline = deriveRhythmTimeline(pattern, 240);
        expect(pattern.meter).toEqual(entry.meter);
        expect(timeline.meter.pulseTicks).toBe(entry.pulseTicks);
        expect(timeline.meter.pulseCount).toBe(entry.pulseCount);
        expect(timeline.meter.pulseStarts).toEqual(entry.pulseStarts);
        expect(timeline.meter.groupStarts).toEqual(entry.groupStarts);
        expect(timeline.meter.groups).toEqual(entry.groups);
        expect(timeline.totalTicks).toBe(entry.capacity);
        expect(
          pattern.measures
            .flatMap(measure => measure.segments)
            .some(segment => segment.duration.denominator === 1)
        ).toBe(false);
      }
    }
  });

  it("builds every Level 6 6/8 and 9/8 focus from complete independent 720-tick groups", () => {
    for (const meter of [
      { numerator: 6, denominator: 8 },
      { numerator: 9, denominator: 8 },
    ] as const) {
      const info = deriveMeter(meter);
      const foci = ["basic", "compound", "dots", "ties", "combined"] as const;
      for (const focus of foci) {
        for (let seed = 0; seed < 8; seed += 1) {
          const pattern = generateRhythmPattern({
            seed: `groups/${meter.numerator}/${focus}/${seed}`,
            level: 6,
            meter,
            focus,
            pulseBpm: 72,
          });
          const timeline = deriveRhythmTimeline(pattern, 120);
          expect(timeline.meter.pulseTicks).toBe(240);
          expect(timeline.meter.groupStarts).toEqual(info.groupStarts);
          expect(timeline.totalTicks).toBe(info.measureTicks);
          for (
            let measureIndex = 0;
            measureIndex < pattern.measures.length;
            measureIndex += 1
          ) {
            const measure = timeline.segments.filter(
              position => position.measureIndex === measureIndex
            );
            const groupTotals = info.groupStarts.map((start, groupIndex) => {
              const end = info.groupStarts[groupIndex + 1] ?? info.measureTicks;
              return measure
                .filter(
                  position =>
                    position.measureOffsetTicks >= start &&
                    position.measureOffsetTicks < end
                )
                .reduce((sum, position) => sum + position.durationTicks, 0);
            });
            expect(groupTotals).toEqual(
              Array.from({ length: meter.numerator / 3 }, () => 720)
            );
            for (const position of measure) {
              const groupIndex = info.groupStarts.findIndex(
                (start, index) =>
                  position.measureOffsetTicks >= start &&
                  position.measureOffsetTicks + position.durationTicks <=
                    (info.groupStarts[index + 1] ?? info.measureTicks)
              );
              expect(groupIndex).toBeGreaterThanOrEqual(0);
              expect(position.durationTicks).toBeLessThanOrEqual(720);
            }
          }
          expect(() =>
            assertLevelConstraints(pattern, {
              seed: `groups/${meter.numerator}/${focus}/${seed}`,
              level: 6,
              meter,
              focus,
              pulseBpm: 72,
            })
          ).not.toThrow();
        }
      }
    }
  });

  it("supports optional 2/2 Bonus as two half-note pulses, not as another numbered level", () => {
    const pattern = generateRhythmPattern({
      seed: "alla-breve",
      level: "bonus",
      meter: { numerator: 2, denominator: 2 },
      pulseBpm: 60,
    });
    const timeline = deriveRhythmTimeline(pattern, 240);
    expect(timeline.meter).toMatchObject({
      pulseCount: 2,
      pulseTicks: 960,
      pulseStarts: [0, 960],
      groups: [1, 1],
    });
    expect(timeline.totalTicks).toBe(1920);
  });

  it("creates complete two-bar cross-bar ties only when requested at Levels 3 and 4", () => {
    for (const level of [3, 4] as const) {
      const pattern = generateRhythmPattern({
        seed: `cross-bar-${level}`,
        level,
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
    }
  });

  it("rejects invalid level, meter, seed, bar, focus, and tempo configurations", () => {
    const bad = [
      { seed: "x", level: 0 as never },
      { seed: "x", level: 7 as never },
      { seed: "x", level: 8 as never },
      { seed: "x", level: 1 as const, meter: { numerator: 3, denominator: 4 } },
      { seed: "x", level: 6 as const, meter: { numerator: 4, denominator: 4 } },
      { seed: "x", level: 1 as const, bars: 3 as never },
      { seed: "x", level: 1 as const, focus: "dots" as never },
      { seed: "x", level: 1 as const, pulseBpm: 29 },
      { seed: "x", level: 1 as const, pulseBpm: 301 },
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
        level: 2,
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

  it("defaults omitted BPM by canonical pulse unit and accepts exact 30/300 endpoints", () => {
    const entries = [
      { level: 3 as const, meter: { numerator: 2, denominator: 4 }, bpm: 100 },
      { level: 3 as const, meter: { numerator: 3, denominator: 4 }, bpm: 100 },
      { level: 3 as const, meter: { numerator: 4, denominator: 4 }, bpm: 100 },
      { level: 6 as const, meter: { numerator: 3, denominator: 8 }, bpm: 180 },
      { level: 6 as const, meter: { numerator: 6, denominator: 8 }, bpm: 180 },
      { level: 6 as const, meter: { numerator: 9, denominator: 8 }, bpm: 180 },
      {
        level: "bonus" as const,
        meter: { numerator: 2, denominator: 2 },
        bpm: 100,
      },
    ] as const;
    for (const [index, entry] of entries.entries()) {
      const input = {
        seed: `canonical-default-${index}`,
        level: entry.level,
        meter: entry.meter,
      };
      const first = generateRhythmPattern(input);
      expect(first.tempo.pulseBpm).toBe(entry.bpm);
      expect(getDefaultPulseBpm(entry.meter)).toBe(entry.bpm);
      expect(generateRhythmPattern(input)).toEqual(first);
      for (const pulseBpm of [30, 300]) {
        const edged = generateRhythmPattern({ ...input, pulseBpm });
        expect(edged.tempo.pulseBpm).toBe(pulseBpm);
      }
    }
  });
});

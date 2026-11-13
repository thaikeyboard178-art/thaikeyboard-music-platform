import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assertLevelConstraints,
  generateRhythmPattern,
  patternMetrics,
} from "./generator";
import {
  createTapRhythmExercise,
  generateTapRhythmExercise,
} from "../exercises/tapRhythm";
import { deriveMeter } from "../rhythm/meters";
import { segmentDurationToTicks } from "../rhythm/durations";
import { simpleNotationGroupStarts } from "../notation/simpleMeterEngraving";
import type { RhythmMeter, RhythmPattern, RhythmTrack } from "../types";

const simpleMeters: readonly RhythmMeter[] = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
];

function flatSegments(pattern: RhythmPattern) {
  return pattern.measures.flatMap(measure => measure.segments);
}

function isExactQuotaMeter(meter: RhythmMeter): boolean {
  return (
    (meter.denominator === 4 &&
      (meter.numerator === 2 ||
        meter.numerator === 3 ||
        meter.numerator === 4)) ||
    (meter.numerator === 2 && meter.denominator === 2)
  );
}

function expectTapRequirements(
  exercise: ReturnType<typeof generateTapRhythmExercise>
): void {
  const { pattern, track } = exercise;
  const metrics = patternMetrics(pattern);
  const segments = flatSegments(pattern);
  expect(pattern.measures[0]?.segments[0]?.kind).toBe("note");

  if (isExactQuotaMeter(pattern.meter)) {
    expect(metrics.restsPerBar).toEqual(
      Array.from({ length: pattern.measures.length }, () => 1)
    );
    const starts = simpleNotationGroupStarts(pattern.meter)!;
    const meterInfo = deriveMeter(pattern.meter);
    pattern.measures.forEach(measure => {
      let offset = 0;
      measure.segments.forEach(segment => {
        const end = offset + segmentDurationToTicks(segment);
        if (segment.kind === "rest") {
          const groupEnd =
            starts.find(boundary => boundary > offset) ??
            meterInfo.measureTicks;
          expect(end).toBeLessThanOrEqual(groupEnd);
        }
        if (
          (track === 1 || track === 2 || track === "bonus") &&
          segment.kind === "note" &&
          segment.tupletGroup === undefined
        ) {
          const groupEnd =
            starts.find(boundary => boundary > offset) ??
            meterInfo.measureTicks;
          expect(end).toBeLessThanOrEqual(groupEnd);
        }
        offset = end;
      });
    });
  }

  if (track === 2) {
    expect(
      segments.some(
        segment =>
          segment.kind === "note" &&
          segment.duration.denominator === 8 &&
          segment.duration.dots === 0
      )
    ).toBe(true);
    expect(
      segments.some(
        segment =>
          segment.kind === "rest" &&
          segment.duration.denominator === 8 &&
          segment.duration.dots === 0
      )
    ).toBe(true);
  }
  if (track === 3) {
    expect(metrics.hasDotConcept || metrics.hasTie).toBe(true);
  }
  if (track === 4) {
    expect(
      segments.some(
        segment =>
          segment.kind === "note" && segment.duration.denominator === 16
      )
    ).toBe(true);
    expect(metrics.sourceCount).toBeLessThanOrEqual(2);
  }
  if (track === 5) {
    expect(metrics.hasTuplets).toBe(true);
    expect(metrics.hasDotConcept || metrics.hasTie || metrics.hasFine).toBe(
      true
    );
    expect(metrics.sourceCount).toBeLessThanOrEqual(2);
  }
}

describe("Tap-specific generator corrections", () => {
  it("keeps one rest per eligible measure and requires each numbered Tap level's vocabulary across many seeds", () => {
    const cases: Array<{
      track: RhythmTrack;
      meter: RhythmMeter;
      focus?: NonNullable<
        Parameters<typeof generateTapRhythmExercise>[0]["focus"]
      >;
    }> = [];
    const fourFour = { numerator: 4, denominator: 4 } as const;
    const twoTwo = { numerator: 2, denominator: 2 } as const;

    for (const track of [1, 2] as const) cases.push({ track, meter: fourFour });
    for (const meter of [
      { numerator: 3, denominator: 8 },
      { numerator: 6, denominator: 8 },
      { numerator: 9, denominator: 8 },
    ] as const)
      cases.push({ track: 6, meter });
    for (const meter of simpleMeters) {
      cases.push({ track: 3, meter }); // defaults, including the 2/4 dots fallback
      cases.push({ track: 4, meter }); // default sixteenths
      cases.push({ track: 5, meter }); // default integrated triplet + L4 source
      for (const focus of meter.numerator === 2
        ? (["dots", "ties"] as const)
        : (["dots", "ties", "combined"] as const))
        cases.push({ track: 3, meter, focus });
      for (const focus of [
        "dots",
        "ties",
        "sixteenths",
        "snap",
        "sandwich",
        "integrated",
      ] as const)
        cases.push({ track: 4, meter, focus });
      for (const focus of [
        "sixteenths",
        "eighth-triplets",
        "triplet-combined",
        "integrated",
      ] as const)
        cases.push({ track: 5, meter, focus });
    }
    cases.push({ track: 5, meter: fourFour, focus: "dots" });
    for (const meter of simpleMeters.slice(1)) {
      cases.push({ track: 5, meter, focus: "ties" });
      cases.push({ track: 5, meter, focus: "sandwich" });
      cases.push({ track: 5, meter, focus: "quarter-triplets" });
    }
    cases.push({ track: "bonus", meter: twoTwo });

    for (const [caseIndex, entry] of cases.entries()) {
      for (let seedIndex = 0; seedIndex < 8; seedIndex += 1) {
        const exercise = generateTapRhythmExercise({
          track: entry.track,
          seed: `tap-owner-matrix-${caseIndex}-${seedIndex}`,
          meter: entry.meter,
          ...(entry.focus === undefined ? {} : { focus: entry.focus }),
          bars: ([1, 2, 4] as const)[seedIndex % 3],
        });
        expectTapRequirements(exercise);
        expect(() =>
          assertLevelConstraints(exercise.pattern, {
            seed: `tap-owner-matrix-audit-${caseIndex}-${seedIndex}`,
            level: entry.track,
            purpose: "tap",
            meter: entry.meter,
            bars: exercise.pattern.measures.length as 1 | 2 | 4,
            focus: entry.focus,
          })
        ).not.toThrow();
      }
    }
  });

  it("generates both Level 5 3:2 triplet kinds with an inherited Level 3/4 source", () => {
    for (const [focus, expected] of [
      ["quarter-triplets", "hasQuarterTriplets"],
      ["eighth-triplets", "hasEighthTriplets"],
    ] as const) {
      const meter = { numerator: 4, denominator: 4 } as const;
      for (let seedIndex = 0; seedIndex < 10; seedIndex += 1) {
        const exercise = generateTapRhythmExercise({
          track: 5,
          seed: `tap-owner-triplet-${focus}-${seedIndex}`,
          meter,
          focus,
        });
        const metrics = patternMetrics(exercise.pattern);
        expect(metrics.hasTuplets).toBe(true);
        expect(metrics[expected]).toBe(true);
        expect(metrics.hasFine).toBe(true);
        expect(metrics.sourceCount).toBeLessThanOrEqual(2);
        expect(metrics.restsPerBar).toEqual([1]);
      }
    }
  });

  it("rejects Tap imports with zero or two rests in each quota-owned measure", () => {
    const makePattern = (
      id: string,
      segments: RhythmPattern["measures"][number]["segments"]
    ) => ({
      id,
      meter: { numerator: 4, denominator: 4 } as const,
      tempo: { pulseBpm: 72 },
      measures: [{ id: "m1", segments }],
    });
    const noRest = makePattern("tap-no-rest", [
      { id: "whole", kind: "note", duration: { denominator: 1, dots: 0 } },
    ]);
    const twoRests = makePattern("tap-two-rests", [
      { id: "a", kind: "note", duration: { denominator: 4, dots: 0 } },
      { id: "r1", kind: "rest", duration: { denominator: 4, dots: 0 } },
      { id: "b", kind: "note", duration: { denominator: 4, dots: 0 } },
      { id: "r2", kind: "rest", duration: { denominator: 4, dots: 0 } },
    ]);
    const expected =
      "Tap patterns in 2/4, 3/4, 4/4, and Bonus 2/2 require exactly one rest in every measure.";
    expect(() =>
      createTapRhythmExercise({ track: 1, pattern: noRest })
    ).toThrow(expected);
    expect(() =>
      createTapRhythmExercise({ track: 1, pattern: twoRests })
    ).toThrow(expected);
  });

  it("rejects infeasible Tap foci with exact source-count or meter reasons", () => {
    const rejected = [
      {
        track: 4 as const,
        focus: "combined" as const,
        expected: /dot \+ tie \+ sixteenth.*3 difficulty sources/,
      },
      {
        track: 5 as const,
        focus: "combined" as const,
        expected: /dot \+ tie \+ required tuplet.*3 difficulty sources/,
      },
      {
        track: 5 as const,
        focus: "snap" as const,
        expected: /dot \+ sixteenth \+ required tuplet.*3 difficulty sources/,
      },
      {
        track: 5 as const,
        focus: "syncopation" as const,
        expected:
          /syncopation \+ required tuplet \+ inherited.*3 difficulty sources/,
      },
    ];
    for (const [index, entry] of rejected.entries()) {
      expect(() =>
        generateTapRhythmExercise({
          track: entry.track,
          seed: `tap-owner-infeasible-${index}`,
          meter: { numerator: 4, denominator: 4 },
          focus: entry.focus,
        })
      ).toThrow(entry.expected);
    }
    for (const focus of [
      "dots",
      "ties",
      "sandwich",
      "quarter-triplets",
    ] as const) {
      expect(() =>
        generateTapRhythmExercise({
          track: 5,
          seed: `tap-owner-infeasible-meter-${focus}`,
          meter: { numerator: 2, denominator: 4 },
          focus,
        })
      ).toThrow(/Tap Level 5 .*focus is infeasible in 2\/4/);
    }
  });

  it("preserves byte-for-byte seeded Level 6 x/8 generation and Tap output from the HEAD baseline", () => {
    const baseline = [
      [
        "3/8",
        "basic",
        "c162c6dc99842356871e6f0ec6dfb5382ecd81d02345f6246185f99190ce113b",
        "c162c6dc99842356871e6f0ec6dfb5382ecd81d02345f6246185f99190ce113b",
      ],
      [
        "3/8",
        "ties",
        "fca17e35bee0633958a87424bae390b0e0dd75b76b02d26277ea557e44478ff0",
        "fca17e35bee0633958a87424bae390b0e0dd75b76b02d26277ea557e44478ff0",
      ],
      [
        "6/8",
        "basic",
        "95b81d1543485484619a5dd17d690f817729513603d592d9b2eab3ce7b47cb4b",
        "95b81d1543485484619a5dd17d690f817729513603d592d9b2eab3ce7b47cb4b",
      ],
      [
        "6/8",
        "compound",
        "a5a3cb95c2696e2c602b3ec94768149fa378574650ee9db4ccb50a0dae18d681",
        "a5a3cb95c2696e2c602b3ec94768149fa378574650ee9db4ccb50a0dae18d681",
      ],
      [
        "6/8",
        "dots",
        "97fe58724a0d07e9f1aa2d0d83fe2654ccbdf5e0bc708c380526bda62ec97661",
        "97fe58724a0d07e9f1aa2d0d83fe2654ccbdf5e0bc708c380526bda62ec97661",
      ],
      [
        "6/8",
        "ties",
        "7fe6711e5addaa3ae8d9d30e8e4da4d73c99e2a578966967a7ae1436a455a740",
        "7fe6711e5addaa3ae8d9d30e8e4da4d73c99e2a578966967a7ae1436a455a740",
      ],
      [
        "6/8",
        "combined",
        "ae8af0461d34978ef1ea3adfd865b336969e6665110bebcca312a8eb447aa220",
        "ae8af0461d34978ef1ea3adfd865b336969e6665110bebcca312a8eb447aa220",
      ],
      [
        "9/8",
        "basic",
        "57fa38189c77dbe7c034344f9471ebda3527d0c0b2d60f2cbddf6b718d80c347",
        "2c463caba558d6031d7aa1058c568b598fde1d9d94d43109d31bf8377b33d50a",
      ],
      [
        "9/8",
        "compound",
        "4072150d472746ab5b3a18f22eb0595fc113719f0e15d51aabeaf628531de863",
        "4072150d472746ab5b3a18f22eb0595fc113719f0e15d51aabeaf628531de863",
      ],
      [
        "9/8",
        "dots",
        "fa64495bc39595ace25313c7189e818034d0a508029139daf8b7c4679eed9e92",
        "c38da28825512ca8931ef18f644a0707e644649ef09985f11be33d00d0f0bffa",
      ],
      [
        "9/8",
        "ties",
        "5f3bb9b76a2f2eb20afa879332225f3eb912525f05855f3b0d4d1320913c7ca4",
        "5f3bb9b76a2f2eb20afa879332225f3eb912525f05855f3b0d4d1320913c7ca4",
      ],
      [
        "9/8",
        "combined",
        "76690caa0c7a0f0894443fabda6b61400a99a2853c3cd699a419d228ae1bb4f5",
        "76690caa0c7a0f0894443fabda6b61400a99a2853c3cd699a419d228ae1bb4f5",
      ],
    ] as const;
    const digest = (value: unknown) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex");

    for (const [meterKey, focus, genericHash, tapHash] of baseline) {
      const [numerator, denominator] = meterKey.split("/").map(Number);
      const meter = { numerator, denominator } as RhythmMeter;
      const seed = `owner-x8-baseline-${meterKey}-${focus}`;
      const config = { seed, level: 6 as const, meter, focus };
      const generic = generateRhythmPattern(config);
      const tapPurpose = generateRhythmPattern({ ...config, purpose: "tap" });
      const tap = generateTapRhythmExercise({
        track: 6,
        seed,
        meter,
        focus,
      }).pattern;
      expect(digest(generic)).toBe(genericHash);
      expect(digest(tapPurpose)).toBe(genericHash);
      expect(digest(tap)).toBe(tapHash);
    }
  });
});

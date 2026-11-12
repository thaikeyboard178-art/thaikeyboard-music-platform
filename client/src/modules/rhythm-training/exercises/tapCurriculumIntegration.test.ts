import { describe, expect, it } from "vitest";
import type { CurriculumSection } from "../curriculum/curriculum";
import { generateTapRhythmExercise } from "./tapRhythm";
import { patternMetrics } from "../generation/generator";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import type { RhythmMeter, RhythmTrack } from "../types";

const fourFour: RhythmMeter = { numerator: 4, denominator: 4 };
const simpleMeters: readonly RhythmMeter[] = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
];
const groupingMeters: readonly RhythmMeter[] = [
  { numerator: 3, denominator: 8 },
  { numerator: 6, denominator: 8 },
  { numerator: 9, denominator: 8 },
];
const tracks: readonly RhythmTrack[] = [1, 2, 3, 4, 5, 6, "bonus"];
const sections: readonly CurriculumSection[] = ["practice", "assessment"];

type Exercise = ReturnType<typeof generateTapRhythmExercise>;

function segments(exercise: Exercise) {
  return exercise.pattern.measures.flatMap(measure => measure.segments);
}

function durationKey(duration: { denominator: number; dots: number }): string {
  return `${duration.denominator}/${duration.dots}`;
}

function expectNoDotsTiesOrSixteenths(exercise: Exercise): void {
  const flat = segments(exercise);
  expect(flat.some(segment => segment.duration.dots !== 0)).toBe(false);
  expect(flat.some(segment => segment.tieGroupId !== undefined)).toBe(false);
  expect(
    flat.some(
      segment =>
        segment.duration.denominator === 16 ||
        (segment.duration.denominator === 8 && segment.duration.dots === 1)
    )
  ).toBe(false);
}

function generateSeries(
  track: RhythmTrack,
  count: number,
  meter: RhythmMeter,
  section: CurriculumSection = "practice"
): Exercise[] {
  return Array.from({ length: count }, (_, index) =>
    generateTapRhythmExercise({
      track,
      section,
      seed: `tap-curriculum-${String(track)}-${section}-${index}`,
      meter,
    })
  );
}

describe("Tap Rhythm curriculum production integration", () => {
  it.each(
    tracks.flatMap(track => sections.map(section => ({ track, section })))
  )(
    "generates $section Tap exercises for track $track through the production API",
    ({ track, section }) => {
      const requestedMeter =
        track === 1 || track === 2
          ? fourFour
          : track === 3 || track === 4 || track === 5
            ? ({ numerator: 4, denominator: 4 } as const)
            : track === 6
              ? groupingMeters[0]
              : ({ numerator: 2, denominator: 2 } as const);
      const exercise = generateTapRhythmExercise({
        track,
        section,
        seed: `tap-production-gate-${String(track)}-${section}`,
        meter: requestedMeter,
      });

      expect(exercise.kind).toBe("tap-rhythm");
      expect(exercise.track).toBe(track);
      expect(exercise.section).toBe(section);
      expect(exercise.pattern.meter).toEqual(requestedMeter);
      expect(exercise.targets.length).toBeGreaterThan(0);
    }
  );

  it("generates Level 1 4/4 Tap patterns using only whole/half/quarter notes and quarter rests", () => {
    const exercises = generateSeries(1, 48, fourFour);
    const observedNotes = new Set(
      exercises.flatMap(exercise =>
        segments(exercise)
          .filter(segment => segment.kind === "note")
          .map(segment => segment.duration.denominator)
      )
    );
    const observedRests = new Set(
      exercises.flatMap(exercise =>
        segments(exercise)
          .filter(segment => segment.kind === "rest")
          .map(segment => durationKey(segment.duration))
      )
    );

    expect([...observedNotes]).toEqual(expect.arrayContaining([1, 2, 4]));
    expect([...observedNotes].every(value => [1, 2, 4].includes(value))).toBe(
      true
    );
    expect([...observedRests]).toContain("4/0");
    expect([...observedRests].every(value => value === "4/0")).toBe(true);
    for (const exercise of exercises) {
      expect(exercise.pattern.meter).toEqual(fourFour);
      expectNoDotsTiesOrSixteenths(exercise);
    }
  });

  it("keeps Level 2 on 4/4 binary quarter/eighth material and quarter/eighth rests", () => {
    const exercises = generateSeries(2, 64, fourFour);
    const observedNotes = new Set<number>();
    const observedRests = new Set<string>();

    for (const exercise of exercises) {
      expect(exercise.pattern.meter).toEqual(fourFour);
      expectNoDotsTiesOrSixteenths(exercise);
      for (const segment of segments(exercise)) {
        if (segment.kind === "note") {
          // Whole/half are inherited from Level 1's unchanged policy; Level 2
          // adds eighths without adding dots, ties, or a finer-than-binary grid.
          expect([1, 2, 4, 8]).toContain(segment.duration.denominator);
          observedNotes.add(segment.duration.denominator);
        } else {
          expect([4, 8]).toContain(segment.duration.denominator);
          observedRests.add(durationKey(segment.duration));
        }
      }
      const timeline = deriveRhythmTimeline(exercise.pattern, 240);
      expect(
        timeline.segments.every(
          position =>
            position.measureOffsetTicks % 240 === 0 &&
            position.durationTicks % 240 === 0
        )
      ).toBe(true);
    }

    expect([...observedNotes]).toEqual(expect.arrayContaining([4, 8]));
    expect([...observedRests]).toEqual(expect.arrayContaining(["4/0", "8/0"]));
  });

  it("generates Level 3 dots-and-ties combinations in simple meters without sixteenths", () => {
    for (const [index, meter] of simpleMeters.entries()) {
      const exercise = generateTapRhythmExercise({
        track: 3,
        seed: `tap-curriculum-level-3-meter-${index}`,
        meter,
        focus: "combined",
      });
      const flat = segments(exercise);
      expect(exercise.pattern.meter).toEqual(meter);
      expect(flat.some(segment => segment.duration.dots === 1)).toBe(true);
      expect(flat.some(segment => segment.tieGroupId !== undefined)).toBe(true);
      expect(flat.some(segment => segment.duration.denominator === 16)).toBe(
        false
      );
    }
  });

  it("generates Level 4 sixteenth notes on the taught four-part subdivision grid", () => {
    const defaultExercise = generateTapRhythmExercise({
      track: 4,
      seed: "tap-curriculum-level-4-default-sixteenths",
      meter: fourFour,
    });
    const sixteenthExercise = generateTapRhythmExercise({
      track: 4,
      seed: "tap-curriculum-level-4-sixteenths",
      meter: fourFour,
      focus: "sixteenths",
    });

    for (const exercise of [defaultExercise, sixteenthExercise]) {
      // Written sixteenth onsets are canonical; the protected tolerance-grid
      // input stays unchanged and actual-local attack gaps handle finer density.
      expect(exercise.gridTicks).toBe(240);
      expect(
        segments(exercise).some(segment => segment.duration.denominator === 16)
      ).toBe(true);
    }
    expect(
      segments(sixteenthExercise).some(segment => segment.duration.dots === 1)
    ).toBe(false);
    expect(
      segments(sixteenthExercise).some(
        segment => segment.tieGroupId !== undefined
      )
    ).toBe(false);
  });

  it("generates Level 5 approved sixteenth combinations within the one-pulse budget", () => {
    const combined = generateTapRhythmExercise({
      track: 5,
      seed: "tap-curriculum-level-5-combined",
      meter: fourFour,
      focus: "combined",
    });
    const sixteenths = generateTapRhythmExercise({
      track: 5,
      seed: "tap-curriculum-level-5-sixteenths",
      meter: fourFour,
      focus: "sixteenths",
    });
    const metrics = patternMetrics(combined.pattern);

    expect(metrics.hasFine).toBe(true);
    expect(metrics.hasTie).toBe(true);
    expect(metrics.hasDot).toBe(false);
    expect(metrics.sourceCount).toBeLessThanOrEqual(2);
    expect(metrics.finePulsesPerBar.every(count => count <= 1)).toBe(true);
    expect(
      segments(combined).some(segment => segment.duration.denominator === 16)
    ).toBe(true);
    expect(
      segments(sixteenths).some(segment => segment.duration.denominator === 16)
    ).toBe(true);
    expect(
      segments(sixteenths).some(segment => segment.tieGroupId !== undefined)
    ).toBe(false);
    expect(
      segments(sixteenths).some(segment => segment.duration.dots !== 0)
    ).toBe(false);
  });

  it("generates Level 6 only in 3/8, 6/8 and 9/8 without sixteenths or leaked meters", () => {
    for (const [index, meter] of groupingMeters.entries()) {
      const exercise = generateTapRhythmExercise({
        track: 6,
        seed: `tap-curriculum-level-6-meter-${index}`,
        meter,
        focus: "basic",
      });
      const metrics = patternMetrics(exercise.pattern);
      expect(exercise.pattern.meter).toEqual(meter);
      expect(metrics.hasDotConcept).toBe(false);
      expect(metrics.hasTie).toBe(false);
      expect(metrics.hasFine).toBe(false);
      for (const segment of segments(exercise)) {
        if (segment.duration.dots === 1) {
          // Dotted quarters in 6/8 and 9/8 are the existing compound pulse,
          // not a leaked dotted-note concept from Level 4.
          expect(segment.duration.denominator).toBe(4);
          expect([6, 9]).toContain(meter.numerator);
          expect(meter.denominator).toBe(8);
        }
      }
    }
  });

  it("generates Bonus Tap only in 2/2 while retaining its optional progression status", () => {
    const exercise = generateTapRhythmExercise({
      track: "bonus",
      seed: "tap-curriculum-bonus-2-2",
      meter: { numerator: 2, denominator: 2 },
    });
    expect(exercise.pattern.meter).toEqual({ numerator: 2, denominator: 2 });
    expectNoDotsTiesOrSixteenths(exercise);
  });
});

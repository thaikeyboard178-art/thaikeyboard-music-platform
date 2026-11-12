import { describe, expect, it } from "vitest";
import {
  evaluateCountBeatAnswer,
  generateCountBeatExercise,
} from "./countBeat";

describe("Count the Beat canonical timeline exercise runtime", () => {
  const cases = [
    {
      track: 3,
      meter: { numerator: 2, denominator: 4 },
      capacity: 960,
      pulseTicks: 480,
      pulseStarts: [0, 480],
      groupStarts: [0, 480],
      groups: [1, 1],
      accents: ["strong", "weak"],
    },
    {
      track: 3,
      meter: { numerator: 3, denominator: 4 },
      capacity: 1440,
      pulseTicks: 480,
      pulseStarts: [0, 480, 960],
      groupStarts: [0, 480, 960],
      groups: [1, 1, 1],
      accents: ["strong", "weak", "weak"],
    },
    {
      track: 3,
      meter: { numerator: 4, denominator: 4 },
      capacity: 1920,
      pulseTicks: 480,
      pulseStarts: [0, 480, 960, 1440],
      groupStarts: [0, 480, 960, 1440],
      groups: [1, 1, 1, 1],
      accents: ["strong", "weak", "medium", "weak"],
    },
    {
      track: 6,
      meter: { numerator: 3, denominator: 8 },
      capacity: 720,
      pulseTicks: 240,
      pulseStarts: [0, 240, 480],
      groupStarts: [0, 240, 480],
      groups: [1, 1, 1],
      accents: ["strong", "weak", "weak"],
    },
    {
      track: 6,
      meter: { numerator: 6, denominator: 8 },
      capacity: 1440,
      pulseTicks: 240,
      pulseStarts: [0, 240, 480, 720, 960, 1200],
      groupStarts: [0, 720],
      groups: [3, 3],
      accents: ["strong", "weak", "weak", "medium", "weak", "weak"],
    },
    {
      track: 6,
      meter: { numerator: 9, denominator: 8 },
      capacity: 2160,
      pulseTicks: 240,
      pulseStarts: [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
      groupStarts: [0, 720, 1440],
      groups: [3, 3, 3],
      accents: [
        "strong",
        "weak",
        "weak",
        "medium",
        "weak",
        "weak",
        "medium",
        "weak",
        "weak",
      ],
    },
    {
      track: "bonus",
      meter: { numerator: 2, denominator: 2 },
      capacity: 1920,
      pulseTicks: 960,
      pulseStarts: [0, 960],
      groupStarts: [0, 960],
      groups: [1, 1],
      accents: ["strong", "weak"],
    },
  ] as const;

  it.each(cases)(
    "derives correct pulse, subdivision and accent data for $meter.numerator/$meter.denominator",
    entry => {
      const exercise = generateCountBeatExercise({
        track: entry.track,
        seed: `count-meter/${entry.meter.numerator}-${entry.meter.denominator}`,
        meter: entry.meter,
        focus: "meter-semantics",
      });
      expect(exercise.pattern.meter).toEqual(entry.meter);
      expect(exercise.positions.at(-1)!.tick + exercise.gridTicks).toBe(
        entry.capacity
      );
      expect(
        exercise.positions
          .filter(position => position.isPulseStart)
          .map(position => position.tick)
      ).toEqual(entry.pulseStarts);
      expect(
        exercise.positions
          .filter(position => position.isGroupStart)
          .map(position => position.measureOffsetTicks)
      ).toEqual(entry.groupStarts);
      expect(exercise.semantics).toMatchObject({
        pulseCount: entry.pulseStarts.length,
        pulseTicks: entry.pulseTicks,
        groups: entry.groups,
        groupStarts: entry.groupStarts,
      });
      expect(
        exercise.positions
          .filter(position => position.isPulseStart)
          .map(position => position.structuralAccent)
      ).toEqual(entry.accents);
      expect(
        exercise.positions.every(position => position.isSubdivisionStart)
      ).toBe(true);
      expect(
        evaluateCountBeatAnswer(exercise, { semantics: exercise.semantics })
          .correct
      ).toBe(true);
    }
  );

  it("distinguishes all six eighth pulses from the two structural groups in 6/8", () => {
    const exercise = generateCountBeatExercise({
      track: 6,
      seed: "count-subdivision-6-8",
      meter: { numerator: 6, denominator: 8 },
      focus: "pulse-positions",
    });
    const pulseTicks = exercise.positions
      .filter(position => position.isPulseStart)
      .map(position => position.tick);
    expect(pulseTicks).toEqual([0, 240, 480, 720, 960, 1200]);
    expect(exercise.positions.map(position => position.tick)).toEqual([
      0, 240, 480, 720, 960, 1200,
    ]);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: pulseTicks }).correct
    ).toBe(true);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: [0, 720] }).correct
    ).toBe(false);
  });

  it("grades structural group starts independently of pulse positions", () => {
    const exercise = generateCountBeatExercise({
      track: 6,
      seed: "count-group-starts-6-8",
      meter: { numerator: 6, denominator: 8 },
      focus: "group-starts",
    });
    const groupTicks = exercise.positions
      .filter(position => position.isGroupStart)
      .map(position => position.tick);
    expect(groupTicks).toEqual([0, 720]);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: groupTicks }).correct
    ).toBe(true);
    expect(groupTicks).not.toEqual(
      exercise.positions
        .filter(position => position.isPulseStart)
        .map(position => position.tick)
    );
  });

  it("generates Count the Beat only in the sections placed by each curriculum track", () => {
    const sections = ["lessons", "practice", "assessment"] as const;
    for (const track of [3, 4, 5, 6] as const) {
      for (const section of sections) {
        const exercise = generateCountBeatExercise({
          track,
          section,
          seed: `count-section/${track}/${section}`,
          focus: "pulse-positions",
        });
        expect(exercise.section).toBe(section);
      }
    }
    const bonus = generateCountBeatExercise({
      track: "bonus",
      section: "practice",
      seed: "count-section/bonus/practice",
      focus: "pulse-positions",
    });
    expect(bonus.section).toBe("practice");
    const bonusAssessment = generateCountBeatExercise({
      track: "bonus",
      section: "assessment",
      seed: "count-section/bonus/assessment",
      focus: "pulse-positions",
    });
    expect(bonusAssessment.section).toBe("assessment");
    for (const section of ["lessons"] as const) {
      expect(() =>
        generateCountBeatExercise({
          track: "bonus",
          section,
          seed: `count-section/bonus/${section}`,
          focus: "pulse-positions",
        })
      ).toThrow(RangeError);
    }
  });

  it("derives the grid from the learner's taught subdivision rather than caller input", () => {
    const eighthGrid = generateCountBeatExercise({
      track: 3,
      seed: "count-grid-eighth",
      focus: "subdivision-positions",
      meter: { numerator: 2, denominator: 4 },
    });
    expect(eighthGrid.gridTicks).toBe(240);
    expect(eighthGrid.positions.map(position => position.tick)).toContain(240);

    const sixteenthGrid = generateCountBeatExercise({
      track: 5,
      seed: "count-grid-sixteenth",
      focus: "subdivision-positions",
      meter: { numerator: 4, denominator: 4 },
    });
    expect(sixteenthGrid.gridTicks).toBe(120);
    expect(sixteenthGrid.positions.map(position => position.tick)).toContain(
      120
    );
  });

  it("evaluates onset positions against canonical timeline onsets", () => {
    const exercise = generateCountBeatExercise({
      track: 3,
      seed: "count-onsets",
      meter: { numerator: 3, denominator: 4 },
      focus: "onset-positions",
    });
    const ticks = exercise.positions
      .filter(position => position.event === "onset")
      .map(position => position.tick);
    expect(ticks.length).toBeGreaterThan(0);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: ticks }).correct
    ).toBe(true);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: [...ticks, ticks[0]] })
        .correct
    ).toBe(false);
  });

  it("generates an actual rest and grades its exact grid positions", () => {
    const exercise = generateCountBeatExercise({
      track: 3,
      seed: "count-rest-positions",
      meter: { numerator: 4, denominator: 4 },
      focus: "rest-positions",
    });
    const ticks = exercise.positions
      .filter(position => position.event === "rest")
      .map(position => position.tick);
    expect(ticks.length).toBeGreaterThan(0);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: ticks }).correct
    ).toBe(true);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: [] }).correct
    ).toBe(false);
  });

  it("represents tie continuations as distinct events that are not new onsets", () => {
    const exercise = generateCountBeatExercise({
      track: 4,
      seed: "count-tie-continuation",
      meter: { numerator: 4, denominator: 4 },
      focus: "tie-continuations",
    });
    const continuationTicks = exercise.positions
      .filter(position => position.event === "tie-continuation")
      .map(position => position.tick);
    expect(continuationTicks.length).toBeGreaterThan(0);
    expect(
      exercise.positions
        .filter(position => position.event === "tie-continuation")
        .every(position => position.event !== "onset")
    ).toBe(true);
    expect(
      evaluateCountBeatAnswer(exercise, { selectedTicks: continuationTicks })
        .correct
    ).toBe(true);
  });

  it("grades one canonical event-at-position answer and rejects Count the Beat outside placement", () => {
    const exercise = generateCountBeatExercise({
      track: 3,
      seed: "count-event-at-position",
      meter: { numerator: 2, denominator: 4 },
      focus: "event-at-position",
    });
    const target = exercise.positions.find(
      position => position.tick === exercise.questionTick
    )!;
    expect(
      evaluateCountBeatAnswer(exercise, { event: target.event }).correct
    ).toBe(true);
    expect(evaluateCountBeatAnswer(exercise, { event: "rest" }).correct).toBe(
      target.event === "rest"
    );
    expect(() =>
      generateCountBeatExercise({
        track: 2,
        seed: "count-not-placed",
        focus: "pulse-positions",
      })
    ).toThrow(RangeError);
  });
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import type { RhythmPattern, RhythmSegment } from "../types";
import { createRhythmAudioPlan } from "../audio/plan";
import {
  createTapTargets,
  generateTapRhythmExercise,
} from "../exercises/tapRhythm";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { segmentDurationToTicks } from "../rhythm/durations";
import { requireValidRhythmPattern } from "../rhythm/validate";
import { renderRhythmNotation } from "./VexFlowRhythm";

beforeAll(() =>
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({
      measureText: (text: string) => ({ width: text.length * 7 }),
    }),
  })
);

function fixture(denominator: 4 | 8): RhythmPattern {
  const members: RhythmSegment[] = Array.from({ length: 3 }, (_, index) => ({
    id: `trip-${index}`,
    kind: "note",
    duration: { denominator, dots: 0 },
    tupletGroup: { groupId: "triplet", actualNotes: 3, normalNotes: 2 },
  }));
  return requireValidRhythmPattern({
    id: `real-${denominator}-triplets`,
    meter: { numerator: 4, denominator: 4 },
    tempo: { pulseBpm: 60 },
    measures: [
      {
        id: "bar",
        segments: [
          ...members,
          { id: "rest", kind: "rest", duration: { denominator: 4, dots: 0 } },
          {
            id: "tail",
            kind: "note",
            duration: { denominator: denominator === 4 ? 4 : 2, dots: 0 },
          },
        ],
      },
    ],
  });
}

describe("Canonical 3:2 tuplets through production timing and VexFlow", () => {
  it.each([4, 8] as const)(
    "executes real %s-note triplets without changing the written denominator or faking graphic spacing",
    denominator => {
      const pattern = fixture(denominator);
      const timeline = deriveRhythmTimeline(pattern);
      const memberTicks = denominator === 4 ? 320 : 160;
      expect(
        pattern.measures[0].segments.slice(0, 3).map(segmentDurationToTicks)
      ).toEqual([memberTicks, memberTicks, memberTicks]);
      expect(timeline.totalTicks).toBe(1920);
      expect(timeline.onsets.slice(0, 3)).toEqual([
        0,
        memberTicks,
        memberTicks * 2,
      ]);
      expect(timeline.structure.subdivisionTicks).toBe(40);
      const audio = createRhythmAudioPlan(pattern, "both");
      const taps = createTapTargets(pattern, 120);
      expect(audio.durationSeconds).toBe(4);
      expect(audio.onsetReferences.map(onset => onset.tick)).toEqual(
        timeline.onsets
      );
      expect(taps.map(target => target.tick)).toEqual(timeline.onsets);
      expect(taps.slice(0, 3).map(target => target.offsetMs)).toEqual([
        0,
        (memberTicks / 480) * 1000,
        ((memberTicks * 2) / 480) * 1000,
      ]);
      const container = document.createElement("div");
      document.body.appendChild(container);
      const rendered = renderRhythmNotation(container, pattern, { width: 320 });
      expect(rendered.parity.ok).toBe(true);
      expect(
        rendered.parity.voiceReports.every(
          report => report.strictComplete && report.tickMatches
        )
      ).toBe(true);
      expect(
        rendered.parity.segmentReports.every(
          report => report.tickMatches && report.positionMatches
        )
      ).toBe(true);
      const tuplets = rendered.svg.querySelectorAll(".vf-tuplet");
      expect(tuplets).toHaveLength(1);
      expect(tuplets[0].querySelectorAll("text").length).toBeGreaterThan(0);
      expect(tuplets[0].getAttribute("data-rhythm-tuplet-ratio")).toBe("3:2");
      expect(rendered.projection.tupletGroups[0].endTicks).toBe(
        memberTicks * 3
      );
      expect(
        rendered.svg.querySelectorAll("[data-rhythm-segment-id]")
      ).toHaveLength(5);
      container.remove();
    }
  );
  it.each([
    [4, "snap"],
    [4, "sandwich"],
    [4, "integrated"],
    [5, "quarter-triplets"],
    [5, "eighth-triplets"],
    [5, "triplet-combined"],
  ] as const)(
    "executes the actual Tap factory and VexFlow/audio at Level %s focus %s",
    (track, focus) => {
      for (const bars of [1, 2, 4] as const) {
        const exercise = generateTapRhythmExercise({
          track,
          focus,
          bars,
          meter: { numerator: 4, denominator: 4 },
          seed: `full-pipeline-${track}-${focus}-${bars}`,
          pulseBpm: 100,
        });
        const timeline = deriveRhythmTimeline(exercise.pattern);
        const audio = createRhythmAudioPlan(exercise.pattern, "both");
        expect(exercise.targets.map(target => target.tick)).toEqual(
          timeline.onsets
        );
        expect(audio.onsetReferences.map(target => target.tick)).toEqual(
          timeline.onsets
        );
        expect(timeline.totalTicks).toBe(bars * 1920);
        for (const measure of exercise.pattern.measures) {
          const rests = measure.segments.filter(
            segment => segment.kind === "rest"
          );
          expect(rests.length).toBeGreaterThanOrEqual(1);
          expect(rests.length).toBeLessThanOrEqual(2);
          expect(
            measure.segments.some(
              (segment, index) =>
                segment.kind === "rest" &&
                measure.segments[index + 1]?.kind === "rest"
            )
          ).toBe(false);
        }
        const host = document.createElement("div");
        document.body.appendChild(host);
        const rendered = renderRhythmNotation(host, exercise.pattern, {
          width: 320,
        });
        expect(rendered.parity.ok).toBe(true);
        if (focus.includes("triplet"))
          expect(
            rendered.svg.querySelectorAll(".vf-tuplet").length
          ).toBeGreaterThan(0);
        if (track === 4)
          expect(rendered.svg.querySelectorAll(".vf-tuplet")).toHaveLength(0);
        host.remove();
      }
    }
  );
  it("rejects incomplete, noncontiguous, dotted and non-3:2 tuplets instead of accepting a visually labeled wrong bar", () => {
    const valid = fixture(8);
    const incomplete = structuredClone(valid);
    delete (incomplete.measures[0].segments[2] as { tupletGroup?: unknown })
      .tupletGroup;
    expect(() => requireValidRhythmPattern(incomplete)).toThrow();
    const segments = valid.measures[0].segments;
    const noncontiguous = {
      ...valid,
      measures: [
        {
          id: "bar",
          segments: [
            segments[0],
            segments[3],
            segments[2],
            segments[1],
            segments[4],
          ],
        },
      ],
    };
    expect(() => requireValidRhythmPattern(noncontiguous)).toThrow();
    const dotted = structuredClone(valid);
    (dotted.measures[0].segments[0].duration as { dots: number }).dots = 1;
    expect(() => requireValidRhythmPattern(dotted)).toThrow();
    const wrong = structuredClone(valid);
    (
      wrong.measures[0].segments[0].tupletGroup as unknown as {
        actualNotes: number;
      }
    ).actualNotes = 5;
    expect(() => requireValidRhythmPattern(wrong)).toThrow();
  });
});

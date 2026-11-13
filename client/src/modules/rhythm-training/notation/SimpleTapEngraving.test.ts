// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import type { RhythmMeter, RhythmPattern, RhythmSegment } from "../types";
import { requireValidRhythmPattern } from "../rhythm/validate";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { projectRhythmNotation } from "./projection";
import { renderRhythmNotation } from "./VexFlowRhythm";
import {
  engraveSimpleTapPattern,
  simpleNotationGroupStarts,
} from "./simpleMeterEngraving";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";

beforeAll(() =>
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({
      measureText: (text: string) => ({ width: text.length * 7 }),
    }),
  })
);

const note = (
  id: string,
  denominator: 1 | 2 | 4 | 8 | 16,
  dots: 0 | 1 = 0
): RhythmSegment => ({ id, kind: "note", duration: { denominator, dots } });
const rest = (id: string, denominator: 1 | 2 | 4 | 8 | 16): RhythmSegment => ({
  id,
  kind: "rest",
  duration: { denominator, dots: 0 },
});
function pattern(
  meter: RhythmMeter,
  segments: readonly RhythmSegment[]
): RhythmPattern {
  return requireValidRhythmPattern({
    id: "simple-tap-example",
    meter,
    tempo: { pulseBpm: 90 },
    measures: [{ id: "bar", segments }],
  });
}
const examples = [
  {
    meter: { numerator: 2, denominator: 4 },
    groups: [0, 480],
    source: [note("dotted", 4, 1), rest("r", 8)],
  },
  {
    meter: { numerator: 3, denominator: 4 },
    groups: [0, 480, 960],
    source: [note("half", 2), rest("r", 4)],
  },
  {
    meter: { numerator: 4, denominator: 4 },
    groups: [0, 960],
    source: [note("one", 4), note("beat-two-half", 2), rest("r", 4)],
  },
  {
    meter: { numerator: 2, denominator: 2 },
    groups: [0, 960],
    source: [note("one", 4), note("half", 2), rest("r", 4)],
  },
] as const;

describe("Tap-only simple-meter grouping and sustained engraving", () => {
  it.each(examples)(
    "renders $meter.numerator/$meter.denominator with exact onset/sustain parity",
    example => {
      const source = pattern(example.meter, example.source);
      const before = deriveRhythmTimeline(source);
      const normalized = engraveSimpleTapPattern(source);
      const after = deriveRhythmTimeline(normalized);
      expect(simpleNotationGroupStarts(source.meter)).toEqual(example.groups);
      expect(after.onsets).toEqual(before.onsets);
      expect(after.totalTicks).toBe(before.totalTicks);
      expect(
        after.soundingSpans.map(span => [span.startTicks, span.endTicks])
      ).toEqual(
        before.soundingSpans.map(span => [span.startTicks, span.endTicks])
      );
      expect(
        after.segments.every(
          segment =>
            !example.groups.some(
              boundary =>
                boundary > segment.measureOffsetTicks &&
                boundary < segment.measureOffsetTicks + segment.durationTicks
            )
        )
      ).toBe(true);
      expect(
        normalized.measures[0].segments.filter(
          segment => segment.kind === "rest"
        )
      ).toHaveLength(1);
      const result = renderRhythmNotation(
        document.createElement("div"),
        source,
        { tapGroups: true }
      );
      expect(result.parity.ok).toBe(true);
      expect(result.svg.outerHTML).toContain("vf-stavetie");
      expect(result.projection.canonicalPattern).toEqual(source);
      expect(
        result.geometry[0].noteAnchors
          .filter(anchor => before.onsets.includes(anchor.tick))
          .map(anchor => anchor.tick)
      ).toEqual(before.onsets);
      // The generic/Quiz path stays unchanged, including unsplit source durations.
      const quiz = projectRhythmNotation(source);
      expect(quiz.pattern).toEqual(source);
      expect(quiz.tieEdges).toHaveLength(0);
    }
  );

  it("splits the required 4/4 beat-two half note into quarter + quarter tied across beat three", () => {
    const source = pattern(
      { numerator: 4, denominator: 4 },
      examples[2].source
    );
    const projection = projectRhythmNotation(source, { tapGroups: true });
    const original = projection.segments.find(
      segment => segment.segmentId === "beat-two-half"
    )!;
    expect(original).toMatchObject({
      startTicks: 480,
      endTicks: 960,
      duration: "4",
      onset: true,
      tieRole: "start",
    });
    const continuation = projection.segments.find(
      segment => segment.startTicks === 960
    )!;
    expect(continuation).toMatchObject({
      duration: "4",
      endTicks: 1440,
      onset: false,
      tieRole: "end",
    });
    expect(projection.tieEdges).toHaveLength(1);
  });

  it("beams eighths in 4/4 2+2 rather than across the boundary or insisting on four notes", () => {
    const source = pattern({ numerator: 4, denominator: 4 }, [
      ...Array.from({ length: 7 }, (_, i) => note(`e${i}`, 8)),
      rest("r", 8),
    ]);
    const result = renderRhythmNotation(document.createElement("div"), source, {
      tapGroups: true,
    });
    expect(result.parity.ok).toBe(true);
    expect(
      result.projection.beamGroups.map(group => group.segmentIds.length)
    ).toEqual([4, 3]);
    expect(
      result.projection.beamGroups.every(
        group => group.endTicks <= 960 || group.startTicks >= 960
      )
    ).toBe(true);
    expect(result.svg.querySelectorAll(".vf-beam").length).toBe(2);
  });

  it("preserves dotted/sixteenth notation within a group and existing cross-group ties", () => {
    const source = pattern({ numerator: 4, denominator: 4 }, [
      note("dot", 8, 1),
      note("fine", 16),
      note("tie-a", 4),
      { ...note("tie-b", 4), tieGroupId: "existing" },
      { ...note("tie-c", 8), tieGroupId: "existing" },
      rest("r", 8),
    ]);
    const result = renderRhythmNotation(document.createElement("div"), source, {
      tapGroups: true,
    });
    expect(result.parity.ok).toBe(true);
    expect(
      result.projection.segments.some(segment => segment.dotCount === 1)
    ).toBe(true);
    expect(
      result.projection.segments.some(segment => segment.duration === "16")
    ).toBe(true);
    expect(result.projection.tieEdges).toHaveLength(1);
  });

  it("preserves a complete quarter-triplet ratio across two simple pulses without splitting its tuplet members", () => {
    const source = pattern({ numerator: 3, denominator: 4 }, [
      ...Array.from({ length: 3 }, (_, i) => ({
        ...note(`t${i}`, 4),
        tupletGroup: {
          groupId: "q3",
          actualNotes: 3 as const,
          normalNotes: 2 as const,
        },
      })),
      rest("r", 4),
    ]);
    const result = renderRhythmNotation(document.createElement("div"), source, {
      tapGroups: true,
    });
    expect(result.parity.ok).toBe(true);
    expect(result.projection.tupletGroups).toHaveLength(1);
    expect(result.projection.timeline.onsets).toEqual([0, 320, 640]);
    expect(result.projection.pattern).toEqual(source);
  });

  it("rejects a rest crossing a required group instead of splitting it into two rest symbols", () => {
    const source = pattern({ numerator: 4, denominator: 4 }, [
      note("one", 4),
      rest("r", 2),
      note("four", 4),
    ]);
    expect(() => engraveSimpleTapPattern(source)).toThrow("rest must fit");
  });

  it.each(
    SEVEN_METER_RUNTIME_FIXTURES.filter(
      fixture => fixture.pattern.meter.denominator === 8
    ).map(fixture => ({ fixture }))
  )(
    "leaves $fixture.name projection and SVG geometry unchanged",
    ({ fixture }) => {
      const source = requireValidRhythmPattern(fixture.pattern);
      expect(engraveSimpleTapPattern(source)).toBe(source);
      expect(projectRhythmNotation(source, { tapGroups: true })).toEqual(
        projectRhythmNotation(source)
      );
      const original = renderRhythmNotation(
        document.createElement("div"),
        source
      );
      const tap = renderRhythmNotation(document.createElement("div"), source, {
        tapGroups: true,
      });
      expect(tap.parity).toEqual(original.parity);
      expect(tap.geometry).toEqual(original.geometry);
      // VexFlow emits unique DOM IDs; compare stable canonical data/glyphs only.
      expect(tap.svg.textContent).toBe(original.svg.textContent);
      expect(tap.svg.querySelectorAll(".vf-beam").length).toBe(
        original.svg.querySelectorAll(".vf-beam").length
      );
    }
  );
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import type { RhythmPattern, WrittenDuration } from "../types";
import { durationToTicks } from "../rhythm/durations";
import { validateRhythmPattern } from "../rhythm/validate";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { projectRhythmNotation } from "../notation/projection";
import { renderRhythmNotation } from "../notation/VexFlowRhythm";
import { SEVEN_METER_RUNTIME_FIXTURES } from "./fixtures";

beforeAll(() =>
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({
      measureText: (text: string) => ({ width: text.length * 7 }),
    }),
  })
);
const pulseValues: Record<string, WrittenDuration> = {
  "2/4": { denominator: 4, dots: 0 },
  "3/4": { denominator: 4, dots: 0 },
  "4/4": { denominator: 4, dots: 0 },
  "3/8": { denominator: 8, dots: 0 },
  "6/8": { denominator: 8, dots: 0 },
  "9/8": { denominator: 8, dots: 0 },
  "2/2": { denominator: 2, dots: 0 },
};

describe("Seven-meter written values and ties", () => {
  for (const f of SEVEN_METER_RUNTIME_FIXTURES) {
    it(`7M ${f.name} native pulse note values validate project and render`, () => {
      const duration = pulseValues[f.name];
      expect(durationToTicks(duration)).toBe(f.pulseTicks);
      const pattern: RhythmPattern = {
        ...f.pattern,
        id: `${f.pattern.id}-pulse-values`,
        measures: [
          {
            id: "pulse-values",
            segments: f.pulseStarts.map((_, index) => ({
              id: `p${index}`,
              kind: "note",
              duration,
            })),
          },
        ],
      };
      expect(validateRhythmPattern(pattern).valid).toBe(true);
      expect(deriveRhythmTimeline(pattern).onsets).toEqual(f.pulseStarts);
      const projection = projectRhythmNotation(pattern);
      expect(
        projection.segments.map(segment => segment.canonicalDurationTicks)
      ).toEqual(f.pulseStarts.map(() => f.pulseTicks));
      expect(
        projection.segments.every(
          segment =>
            segment.duration === String(duration.denominator) &&
            segment.dotCount === duration.dots
        )
      ).toBe(true);
      const rendered = renderRhythmNotation(
        document.createElement("div"),
        pattern
      );
      expect(rendered.parity.ok).toBe(true);
      expect(
        rendered.svg.querySelectorAll("[data-rhythm-segment-id]")
      ).toHaveLength(f.pulseStarts.length);
      if (duration.dots === 1) {
        for (const glyph of rendered.svg.querySelectorAll(
          "[data-rhythm-segment-id]"
        ))
          expect(glyph.textContent).toContain("\ue1e7");
      }
    });
    if (f.name === "6/8" || f.name === "9/8") {
      it(`7M ${f.name} written dotted-quarter groups preserve dots while metronome pulses remain eighths`, () => {
        const groupStarts = f.name === "6/8" ? [0, 720] : [0, 720, 1440];
        const duration = { denominator: 4, dots: 1 } as const;
        expect(durationToTicks(duration)).toBe(720);
        expect(f.pulseTicks).toBe(240);
        const pattern: RhythmPattern = {
          ...f.pattern,
          id: `${f.pattern.id}-dotted-groups`,
          measures: [
            {
              id: "dotted-groups",
              segments: groupStarts.map((_, index) => ({
                id: `dot-${index}`,
                kind: "note",
                duration,
              })),
            },
          ],
        };
        expect(validateRhythmPattern(pattern).valid).toBe(true);
        expect(deriveRhythmTimeline(pattern).onsets).toEqual(groupStarts);
        const projection = projectRhythmNotation(pattern);
        expect(
          projection.segments.map(segment => segment.canonicalDurationTicks)
        ).toEqual(groupStarts.map(() => 720));
        expect(
          projection.segments.every(
            segment => segment.duration === "4" && segment.dotCount === 1
          )
        ).toBe(true);
        const rendered = renderRhythmNotation(
          document.createElement("div"),
          pattern
        );
        expect(rendered.parity.ok).toBe(true);
        const glyphs = rendered.svg.querySelectorAll(
          "[data-rhythm-segment-id]"
        );
        expect(glyphs).toHaveLength(groupStarts.length);
        for (const glyph of glyphs)
          expect(glyph.textContent).toContain("\ue1e7");
      });
    }
    it(`7M ${f.name} intrabar tie preserves notation and suppresses continuation onset`, () => {
      const pattern: RhythmPattern = {
        ...f.pattern,
        id: `${f.pattern.id}-inside-tie`,
        measures: [
          {
            ...f.pattern.measures[0],
            segments: f.pattern.measures[0].segments.map((segment, index) =>
              index < 2 ? { ...segment, tieGroupId: "inside" } : segment
            ),
          },
        ],
      };
      expect(validateRhythmPattern(pattern).valid).toBe(true);
      const timeline = deriveRhythmTimeline(pattern);
      expect(timeline.onsets).toEqual(
        f.eighthStarts.filter(tick => tick !== 240)
      );
      expect(
        timeline.soundingSpans.find(span => span.tieGroupId === "inside")
      ).toMatchObject({ startTicks: 0, endTicks: 480 });
      expect(projectRhythmNotation(pattern).tieEdges).toHaveLength(1);
      const rendered = renderRhythmNotation(
        document.createElement("div"),
        pattern
      );
      expect(rendered.parity.ok).toBe(true);
      expect(
        rendered.svg.querySelectorAll('[data-rhythm-tie-part="full"]')
      ).toHaveLength(1);
      expect(
        rendered.svg
          .querySelector('[data-rhythm-segment-id="n1"]')
          ?.getAttribute("data-canonical-onset")
      ).toBe("false");
    });
  }
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { BarlineType, Stave } from "vexflow";
import type { RhythmPattern } from "../types";
import {
  VALID_FIXTURES,
  INVALID_FIXTURES,
  DOTTED_EIGHTH,
} from "../rhythm/fixtures";
import { generateRhythmPattern } from "../generation/generator";
import { projectRhythmNotation } from "./projection";
import { renderRhythmNotation } from "./VexFlowRhythm";
import { RHYTHM_NOTATION_EXAMPLES } from "./examples";

beforeAll(() =>
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({
      measureText: (text: string) => ({ width: text.length * 7 }),
    }),
  })
);
function eighths(numerator: 3 | 6, denominator: 4 | 8): RhythmPattern {
  return {
    id: "eighth-grid",
    meter: { numerator, denominator } as RhythmPattern["meter"],
    tempo: { pulseBpm: 60 },
    measures: [
      {
        id: "m",
        segments: Array.from({ length: 6 }, (_, index) => ({
          id: `s${index}`,
          kind: "note",
          duration: { denominator: 8, dots: 0 },
        })),
      },
    ],
  };
}
function hasFlag(element: Element) {
  return [...element.querySelectorAll("text")].some(glyph => {
    const code = glyph.textContent?.codePointAt(0) ?? 0;
    return code >= 0xe240 && code <= 0xe24f;
  });
}

describe("Phase2 actual notation regressions", () => {
  it("groups six eighths into exactly3+3 for6/8, not a single six-note beam", () => {
    const projected = projectRhythmNotation(eighths(6, 8));
    expect(projected.beamGroups.map(group => group.segmentIds)).toEqual([
      ["s0", "s1", "s2"],
      ["s3", "s4", "s5"],
    ]);
    expect(
      projected.beamGroups.map(group => [group.startTicks, group.endTicks])
    ).toEqual([
      [0, 720],
      [720, 1440],
    ]);
    const result = renderRhythmNotation(
      document.createElement("div"),
      eighths(6, 8)
    );
    expect(result.svg.querySelectorAll(".vf-beam")).toHaveLength(2);
    for (const id of projected.beamGroups.flatMap(group => group.segmentIds))
      expect(
        hasFlag(result.svg.querySelector(`[data-rhythm-segment-id="${id}"]`)!)
      ).toBe(false);
  });
  it("groups the same six eighths into2+2+2 in3/4", () => {
    expect(
      projectRhythmNotation(eighths(3, 4)).beamGroups.map(
        group => group.segmentIds
      )
    ).toEqual([
      ["s0", "s1"],
      ["s2", "s3"],
      ["s4", "s5"],
    ]);
    const result = renderRhythmNotation(
      document.createElement("div"),
      eighths(3, 4)
    );
    expect(result.svg.querySelectorAll(".vf-beam")).toHaveLength(3);
  });
  it("draws the dotted eighth/sixteenth beam before flags and preserves exact tick parity", () => {
    const result = renderRhythmNotation(
      document.createElement("div"),
      DOTTED_EIGHTH
    );
    expect(result.projection.beamGroups[0].segmentIds).toEqual(["a", "b"]);
    expect(
      result.projection.segments
        .slice(0, 2)
        .map(segment => segment.canonicalDurationTicks)
    ).toEqual([360, 120]);
    expect(result.svg.querySelectorAll(".vf-beam")).toHaveLength(1);
    expect(
      result.svg.querySelector('[data-rhythm-segment-id="a"]')!.textContent
    ).toContain("\ue1e7");
    expect(
      hasFlag(result.svg.querySelector('[data-rhythm-segment-id="a"]')!)
    ).toBe(false);
    expect(
      hasFlag(result.svg.querySelector('[data-rhythm-segment-id="b"]')!)
    ).toBe(false);
  });
  it("does not bridge a rest with a beam", () => {
    const original = eighths(6, 8);
    const pattern = {
      ...original,
      measures: [
        {
          ...original.measures[0],
          segments: original.measures[0].segments.map((segment, index) =>
            index === 1 ? { ...segment, kind: "rest" as const } : segment
          ),
        },
      ],
    };
    expect(
      projectRhythmNotation(pattern).beamGroups.map(group => group.segmentIds)
    ).toEqual([["s3", "s4", "s5"]]);
  });
  it("draws two partial tie arcs at a row break, never one diagonal full tie", () => {
    const result = renderRhythmNotation(
      document.createElement("div"),
      RHYTHM_NOTATION_EXAMPLES[3].pattern,
      { width: 320, measuresPerRow: 1 }
    );
    const ties = [
      ...result.svg.querySelectorAll('[data-rhythm-tie-id="tie-1"]'),
    ];
    expect(ties).toHaveLength(2);
    expect(ties.map(tie => tie.getAttribute("data-rhythm-tie-part"))).toEqual([
      "start",
      "end",
    ]);
    expect(ties.every(tie => tie.querySelector("path") !== null)).toBe(true);
    expect(
      result.svg
        .querySelector('[data-rhythm-segment-id="cross-tie-start"]')!
        .getAttribute("data-rhythm-row-index")
    ).toBe("0");
    expect(
      result.svg
        .querySelector('[data-rhythm-segment-id="cross-tie-end"]')!
        .getAttribute("data-rhythm-row-index")
    ).toBe("1");
    expect(
      result.svg
        .querySelector('[data-rhythm-segment-id="cross-tie-end"]')!
        .getAttribute("data-canonical-onset")
    ).toBe("false");
  });
  it("draws one full tie within a row and ordinary internal barlines", () => {
    const spy = vi.spyOn(Stave.prototype, "setEndBarType");
    try {
      const result = renderRhythmNotation(
        document.createElement("div"),
        RHYTHM_NOTATION_EXAMPLES[3].pattern,
        { width: 1040, measuresPerRow: 2 }
      );
      expect(
        result.svg.querySelectorAll('[data-rhythm-tie-part="full"]')
      ).toHaveLength(1);
      expect(spy.mock.calls.map(call => call[0])).toEqual([
        BarlineType.SINGLE,
        BarlineType.END,
      ]);
    } finally {
      spy.mockRestore();
    }
  });
  it("uses natural layout with uniform aspect-ratio scaling for dense narrow SVG, not glyph distortion", () => {
    const pattern = generateRhythmPattern({
      seed: "dense-width",
      level: 8,
      meter: { numerator: 4, denominator: 4 },
      focus: "sixteenths",
      bars: 2,
      pulseBpm: 60,
    });
    const result = renderRhythmNotation(
      document.createElement("div"),
      pattern,
      { width: 280, measuresPerRow: 2 }
    );
    const box = result.svg.getAttribute("viewBox")!.split(" ").map(Number);
    const width = Number(result.svg.getAttribute("width"));
    const height = Number(result.svg.getAttribute("height"));
    expect(width).toBe(280);
    expect(box[2]).toBeGreaterThanOrEqual(280);
    expect(width / box[2]).toBeCloseTo(height / box[3], 10);
    expect(result.svg.getAttribute("preserveAspectRatio")).toBe(
      "xMinYMin meet"
    );
    expect(result.parity.ok).toBe(true);
  });
  it.each(VALID_FIXTURES)(
    "renders Phase1 fixture$id with exact strict voice and actual note-position parity",
    pattern => {
      const result = renderRhythmNotation(
        document.createElement("div"),
        pattern,
        { width: 320, measuresPerRow: 1 }
      );
      expect(result.parity.ok).toBe(true);
      expect(result.parity.segmentReports).toHaveLength(
        result.projection.segments.length
      );
      for (const report of result.parity.segmentReports) {
        const segment = result.projection.segments.find(
          item => item.segmentId === report.segmentId
        )!;
        const relative =
          segment.startTicks -
          segment.measureIndex * result.projection.timeline.meter.measureTicks;
        // Independent integer fixture: one canonical sixteenth120 equals1024
        // VexFlow ticks at its fixed whole-note resolution16384.
        for (const [fraction, expected] of [
          [
            report.actualVexFlowDurationTicks,
            (segment.canonicalDurationTicks / 120) * 1024,
          ],
          [report.actualVexFlowStartTicks, (relative / 120) * 1024],
        ] as const) {
          const [numerator, denominator] = fraction.split("/").map(Number);
          expect(Number.isSafeInteger(numerator)).toBe(true);
          expect(Number.isSafeInteger(denominator) && denominator > 0).toBe(
            true
          );
          expect(numerator).toBe(expected * denominator);
        }
        expect(Number.isFinite(report.actualX)).toBe(true);
      }
      for (const segment of result.projection.segments.filter(
        item =>
          item.kind === "rest" || ["continue", "end"].includes(item.tieRole)
      ))
        expect(segment.onset).toBe(false);
    }
  );
  it.each(INVALID_FIXTURES)(
    "rejects$name before creating SVG or altering existing content",
    fixture => {
      const container = document.createElement("div");
      container.innerHTML = "<span>preserve</span>";
      expect(() => renderRhythmNotation(container, fixture.input)).toThrow(
        fixture.expectedCode
      );
      expect(container.innerHTML).toBe("<span>preserve</span>");
    }
  );
  it.each([1, 2, 3, 4, 5, 6, 7, 8] as const)(
    "keeps generated Level%s patterns and actual VexFlow notation in parity at narrow and wide sizes",
    level => {
      for (let seed = 0; seed < 3; seed++) {
        const pattern = generateRhythmPattern({
          seed: `render-matrix/${level}/${seed}`,
          level,
          bars: 2,
        });
        const original = JSON.stringify(pattern);
        for (const width of [320, 1040]) {
          const result = renderRhythmNotation(
            document.createElement("div"),
            pattern,
            { width, measuresPerRow: width < 400 ? 1 : 2 }
          );
          expect(result.parity.ok).toBe(true);
          expect(
            result.svg.querySelectorAll("[data-rhythm-segment-id]")
          ).toHaveLength(result.projection.segments.length);
          expect(result.svg.querySelectorAll(".vf-beam")).toHaveLength(
            result.projection.beamGroups.length
          );
        }
        expect(JSON.stringify(pattern)).toBe(original);
      }
    }
  );
  it("rejects subpixel width that would become a zero-width SVG after rounding", () =>
    expect(() =>
      renderRhythmNotation(document.createElement("div"), DOTTED_EIGHTH, {
        width: 0.5,
      })
    ).toThrow(/at least1px/));
});

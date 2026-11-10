// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { FOUR_FOUR } from "../rhythm/fixtures";
import { RHYTHM_NOTATION_EXAMPLES } from "./examples";
import {
  renderRhythmNotation,
  RhythmNotationRenderError,
} from "./VexFlowRhythm";

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () =>
      ({
        measureText: (text: string) => ({ width: text.length * 7 }),
      }) as unknown as CanvasRenderingContext2D,
  });
});

describe("renderRhythmNotation", () => {
  it("renders each complete example as real SVG with strict PPQ parity", () => {
    for (const example of RHYTHM_NOTATION_EXAMPLES) {
      const container = document.createElement("div");
      const result = renderRhythmNotation(container, example.pattern, {
        width: 760,
        measuresPerRow: 2,
      });
      expect(result.svg).toBeInstanceOf(SVGSVGElement);
      expect(result.parity.ok).toBe(true);
      expect(
        result.parity.voiceReports.every(report => report.strictComplete)
      ).toBe(true);
      expect(
        result.parity.voiceReports.every(report => report.tickMatches)
      ).toBe(true);
      expect(
        result.parity.segmentReports.every(report => report.tickMatches)
      ).toBe(true);
      expect(
        result.parity.segmentReports.every(report => report.positionMatches)
      ).toBe(true);
      expect(
        container.querySelectorAll("[data-rhythm-segment-id]").length
      ).toBe(result.projection.segments.length);
      expect(result.svg.getAttribute("data-rhythm-meter")).toBe(
        `${example.pattern.meter.numerator}/${example.pattern.meter.denominator}`
      );
    }
  });

  it("draws dots, beams, ties, rests, accents, and canonical metadata", () => {
    const container = document.createElement("div");
    const four = renderRhythmNotation(
      container,
      RHYTHM_NOTATION_EXAMPLES[0].pattern,
      {
        width: 1040,
        measuresPerRow: 2,
      }
    );
    expect(four.svg.outerHTML).toContain("vf-beam");
    expect(four.svg.outerHTML).toContain("vf-stavetie");
    expect(
      [...four.svg.querySelectorAll("text")].some(
        glyph => glyph.textContent === "\ue4a0"
      )
    ).toBe(true);
    expect(
      four.projection.segments.some(segment => segment.dotCount === 1)
    ).toBe(true);
    expect(
      four.projection.segments.some(segment => segment.kind === "rest")
    ).toBe(true);
    const marked = container.querySelector(
      '[data-rhythm-segment-id="four-dot-eighth"]'
    )!;
    expect(marked.getAttribute("data-canonical-tick")).toBe("0");
    expect(marked.getAttribute("data-tie-role")).toBe("none");

    const sixContainer = document.createElement("div");
    const six = renderRhythmNotation(
      sixContainer,
      RHYTHM_NOTATION_EXAMPLES[2].pattern,
      {
        width: 1040,
        measuresPerRow: 2,
      }
    );
    expect(
      six.projection.beamGroups.every(group => group.segmentIds.length >= 2)
    ).toBe(true);
    expect(six.projection.tieEdges).toHaveLength(1);
    expect(six.svg.outerHTML).toContain("vf-stavetie");
  });

  it("clears old SVG output on repeated renders and keeps a small width readable", () => {
    const container = document.createElement("div");
    const first = renderRhythmNotation(container, FOUR_FOUR, {
      width: 320,
      measuresPerRow: 1,
    });
    const firstSvg = first.svg;
    expect(container.childElementCount).toBe(1);
    const second = renderRhythmNotation(
      container,
      RHYTHM_NOTATION_EXAMPLES[1].pattern,
      {
        width: 320,
        measuresPerRow: 1,
      }
    );
    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild).not.toBe(firstSvg);
    expect(
      container
        .querySelector("[data-rhythm-pattern-id]")
        ?.getAttribute("data-rhythm-pattern-id")
    ).toBe("three-four-notation");
    expect(Number(second.svg.getAttribute("width"))).toBe(320);
  });

  it("rejects invalid input without mutating the container", () => {
    const container = document.createElement("div");
    container.innerHTML = "<span data-sentinel>keep</span>";
    const invalid = {
      ...FOUR_FOUR,
      measures: [
        {
          ...FOUR_FOUR.measures[0],
          segments: FOUR_FOUR.measures[0].segments.slice(0, -1),
        },
      ],
    };
    expect(() => renderRhythmNotation(container, invalid)).toThrow(
      /MEASURE_UNDERFILLED/
    );
    expect(container.querySelector("[data-sentinel]")).not.toBeNull();
  });

  it("splits rows without losing cross-bar tie edges", () => {
    const container = document.createElement("div");
    const result = renderRhythmNotation(
      container,
      RHYTHM_NOTATION_EXAMPLES[3].pattern,
      {
        width: 420,
        measuresPerRow: 1,
      }
    );
    expect(result.projection.tieEdges).toEqual([
      expect.objectContaining({ crossesBarline: true }),
    ]);
    expect(result.parity.ok).toBe(true);
    expect(result.svg.outerHTML).toContain("vf-stavetie");
  });

  it("uses a controlled renderer error for malformed options", () => {
    const container = document.createElement("div");
    expect(() =>
      renderRhythmNotation(container, FOUR_FOUR, { width: 0 })
    ).toThrow(RhythmNotationRenderError);
    expect(() =>
      renderRhythmNotation(container, FOUR_FOUR, { measuresPerRow: 1.5 })
    ).toThrow(RhythmNotationRenderError);
  });
});

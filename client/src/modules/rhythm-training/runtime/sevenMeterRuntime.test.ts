// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { rhythmPatternInputSchema } from "../rhythm/model";
import { durationToTicks } from "../rhythm/durations";
import {
  deriveMeter,
  deriveMeterStructure,
  ticksToSeconds,
} from "../rhythm/meters";
import {
  requireValidRhythmPattern,
  validateRhythmPattern,
} from "../rhythm/validate";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { projectRhythmNotation } from "../notation/projection";
import { renderRhythmNotation } from "../notation/VexFlowRhythm";
import type { RhythmMeter, RhythmPattern } from "../types";
import { mixedRuntimePattern, SEVEN_METER_RUNTIME_FIXTURES } from "./fixtures";

beforeAll(() =>
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({
      measureText: (text: string) => ({ width: text.length * 7 }),
    }),
  })
);

const strictVoiceCapacities: Record<string, number> = {
  "2/4": 8192,
  "3/4": 12288,
  "4/4": 16384,
  "3/8": 6144,
  "6/8": 12288,
  "9/8": 18432,
  "2/2": 16384,
};
function expectFraction(actual: string, expected: number) {
  const [numerator, denominator = 1] = actual.split("/").map(Number);
  expect(numerator).toBe(expected * denominator);
}
function hasFlag(element: Element) {
  return [...element.querySelectorAll("text")].some(glyph => {
    const code = glyph.textContent?.codePointAt(0) ?? 0;
    return code >= 0xe240 && code <= 0xe24f;
  });
}
function wrongFill(pattern: RhythmPattern, extra: boolean): RhythmPattern {
  const bar = pattern.measures[0];
  return {
    ...pattern,
    measures: [
      {
        ...bar,
        segments: extra
          ? [
              ...bar.segments,
              {
                id: "extra",
                kind: "note",
                duration: { denominator: 8, dots: 0 },
              },
            ]
          : bar.segments.slice(0, -1),
      },
    ],
  };
}

// Every S01..S10 case invokes production functions. Literal independent fixture
// expectations are reference examples, not a replacement implementation.
describe("Seven-meter runtime completion gate", () => {
  for (const f of SEVEN_METER_RUNTIME_FIXTURES) {
    it(`7M ${f.name} S01 canonical model acceptance`, () => {
      const parsed = rhythmPatternInputSchema.safeParse(f.pattern);
      expect(parsed.success).toBe(true);
      const canonical = requireValidRhythmPattern(f.pattern);
      expect(canonical.meter).toEqual(f.pattern.meter);
      expect(canonical).not.toBe(f.pattern);
      expect(Object.isFrozen(canonical)).toBe(true);
    });
    it(`7M ${f.name} S02 exact duration and pulse calculations`, () => {
      const ticks = f.pattern.measures[0].segments.map(segment =>
        durationToTicks(segment.duration)
      );
      expect(ticks.every(value => value === 240)).toBe(true);
      expect(ticks.reduce((sum, value) => sum + value, 0)).toBe(f.capacity);
      const meter = deriveMeter(f.pattern.meter);
      expect(meter.measureTicks).toBe(f.capacity);
      expect(meter.pulseTicks).toBe(f.pulseTicks);
      expect(meter.pulseStarts).toEqual(f.pulseStarts);
      expect(ticksToSeconds(f.capacity, f.pattern.meter, 60)).toBe(
        f.pulseStarts.length
      );
    });
    it(`7M ${f.name} S03 correctly filled bar validation`, () => {
      const result = validateRhythmPattern(f.pattern);
      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error(JSON.stringify(result.issues));
      expect(result.totalTicks).toBe(f.capacity);
      expect(result.pattern.meter).toEqual(f.pattern.meter);
    });
    it(`7M ${f.name} S04 underfilled and overfilled rejection`, () => {
      for (const [extra, code, ticks] of [
        [false, "MEASURE_UNDERFILLED", f.capacity - 240],
        [true, "MEASURE_OVERFILLED", f.capacity + 240],
      ] as const) {
        const bad = wrongFill(f.pattern, extra);
        const result = validateRhythmPattern(bad);
        expect(result.valid).toBe(false);
        if (result.valid) throw new Error("Invalid bar accepted");
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code,
            expectedTicks: f.capacity,
            actualTicks: ticks,
          })
        );
        expect(() => deriveRhythmTimeline(bad)).toThrow(code);
        expect(() => projectRhythmNotation(bad)).toThrow(code);
        const host = document.createElement("div");
        host.innerHTML = "<span>preserve</span>";
        expect(() => renderRhythmNotation(host, bad)).toThrow(code);
        expect(host.innerHTML).toBe("<span>preserve</span>");
      }
    });
    it(`7M ${f.name} S05 timeline onset derivation`, () => {
      const timeline = deriveRhythmTimeline(f.pattern, 240);
      expect(timeline.totalTicks).toBe(f.capacity);
      expect(timeline.onsets).toEqual(f.eighthStarts);
      expect(
        timeline.segments.map(segment => segment.absoluteStartTicks)
      ).toEqual(f.eighthStarts);
      expect(timeline.segments.every(segment => segment.isOnset)).toBe(true);
      expect(timeline.soundingSpans).toHaveLength(f.eighthStarts.length);
    });
    it(`7M ${f.name} S06 structural pulse and subdivision metadata`, () => {
      const timeline = deriveRhythmTimeline(f.pattern, 240);
      const structure = deriveMeterStructure(f.pattern.meter, 240);
      expect(timeline.structure).toEqual(structure);
      expect(structure.pulseStarts).toEqual(f.pulseStarts);
      expect(structure.subdivisionStarts).toEqual(f.eighthStarts);
      expect(structure.subdivisionTicks).toBe(240);
      expect(timeline.segments.map(segment => segment.pulseIndex)).toEqual(
        f.pulseIndices
      );
      expect(
        timeline.segments.map(segment => segment.subdivisionIndex)
      ).toEqual(f.subdivisionIndices);
      expect(structure.accentPositions.map(point => point.pulseIndex)).toEqual(
        f.pulseIndices
      );
      expect(
        structure.accentPositions.map(point => point.subdivisionIndex)
      ).toEqual(f.subdivisionIndices);
    });
    it(`7M ${f.name} S07 independent structural accents`, () => {
      const before = JSON.stringify(f.pattern);
      const plain = deriveRhythmTimeline(f.pattern, 240);
      expect(plain.structure.accentPositions.map(point => point.tick)).toEqual(
        f.eighthStarts
      );
      expect(plain.structure.accentPositions.map(point => point.level)).toEqual(
        f.accents
      );
      expect(plain.segments.every(segment => segment.accent === "normal")).toBe(
        true
      );
      const explicit: RhythmPattern = {
        ...f.pattern,
        measures: [
          {
            ...f.pattern.measures[0],
            segments: f.pattern.measures[0].segments.map((segment, index) =>
              index === 1 ? { ...segment, accent: "strong" } : segment
            ),
          },
        ],
      };
      const accented = deriveRhythmTimeline(explicit, 240);
      expect(accented.structure).toEqual(plain.structure);
      expect(accented.onsets).toEqual(plain.onsets);
      expect(accented.segments[1].accent).toBe("strong");
      const projection = projectRhythmNotation(explicit);
      expect(projection.segments[1].structuralAccent).toBe("weak");
      expect(projection.segments[1].accent).toBe("strong");
      expect(JSON.stringify(f.pattern)).toBe(before);
    });
    it(`7M ${f.name} S08 notation grouping and beam projection`, () => {
      const projection = projectRhythmNotation(f.pattern);
      expect(projection.canonicalPattern.meter).toEqual(f.pattern.meter);
      expect(projection.timeline.onsets).toEqual(f.eighthStarts);
      expect(projection.segments.map(segment => segment.startTicks)).toEqual(
        f.eighthStarts
      );
      expect(
        projection.segments.map(segment => segment.structuralAccent)
      ).toEqual(f.accents);
      expect(projection.beamGroups.map(group => group.segmentIds)).toEqual(
        f.beams
      );
      for (const group of projection.beamGroups) {
        const members = projection.segments.filter(segment =>
          group.segmentIds.includes(segment.segmentId)
        );
        expect(new Set(members.map(segment => segment.pulseIndex)).size).toBe(
          1
        );
        expect(new Set(members.map(segment => segment.measureIndex)).size).toBe(
          1
        );
      }
    });
    it(`7M ${f.name} S09 actual VexFlow SVG rendering`, () => {
      const result = renderRhythmNotation(
        document.createElement("div"),
        f.pattern,
        { width: 640 }
      );
      expect(result.svg.tagName.toLowerCase()).toBe("svg");
      expect(result.svg.getAttribute("data-rhythm-meter")).toBe(f.name);
      expect(result.parity.ok).toBe(true);
      expect(result.parity.voiceReports).toHaveLength(1);
      expectFraction(
        result.parity.voiceReports[0].actualTicks,
        strictVoiceCapacities[f.name]
      );
      expectFraction(
        result.parity.voiceReports[0].actualTicksUsed,
        strictVoiceCapacities[f.name]
      );
      expect(result.parity.voiceReports[0].strictComplete).toBe(true);
      expect(result.parity.segmentReports).toHaveLength(f.eighthStarts.length);
      for (const report of result.parity.segmentReports) {
        expect(report.tickMatches && report.positionMatches).toBe(true);
        expectFraction(report.actualVexFlowDurationTicks, 2048);
      }
      const notes = [
        ...result.svg.querySelectorAll("[data-rhythm-segment-id]"),
      ];
      expect(notes).toHaveLength(f.eighthStarts.length);
      expect(
        notes.map(note => Number(note.getAttribute("data-canonical-tick")))
      ).toEqual(f.eighthStarts);
      expect(
        notes.map(note => note.getAttribute("data-structural-accent"))
      ).toEqual(f.accents);
      expect(
        notes.map(note => Number(note.getAttribute("data-pulse-index")))
      ).toEqual(f.pulseIndices);
      expect(
        notes.every(note => note.querySelector("text,path") !== null)
      ).toBe(true);
    });
    it(`7M ${f.name} S10 rendered approved beam and flag rules`, () => {
      const result = renderRhythmNotation(
        document.createElement("div"),
        f.pattern,
        { width: 320 }
      );
      const beams = [...result.svg.querySelectorAll(".vf-beam")];
      expect(beams).toHaveLength(f.beams.length);
      expect(
        beams.map(beam =>
          beam.getAttribute("data-rhythm-beam-segments")?.split(",")
        )
      ).toEqual(f.beams);
      expect(beams.every(beam => beam.querySelector("path") !== null)).toBe(
        true
      );
      for (const note of result.svg.querySelectorAll(
        "[data-rhythm-segment-id]"
      )) {
        const id = note.getAttribute("data-rhythm-segment-id")!;
        const beamed = f.beams.some(group => group.includes(id));
        expect(hasFlag(note)).toBe(!beamed);
      }
      if (f.name === "3/8")
        expect(
          result.svg.querySelectorAll("[data-rhythm-segment-id]")
        ).toHaveLength(3);
    });

    it(`7M ${f.name} supported dots rests and cross-bar ties execute`, () => {
      const pattern = mixedRuntimePattern(f);
      expect(validateRhythmPattern(pattern).valid).toBe(true);
      const timeline = deriveRhythmTimeline(pattern);
      expect(timeline.totalTicks).toBe(f.capacity * 2);
      const continuation = timeline.segments.find(
        segment => segment.segmentId === "b0"
      )!;
      const rest = timeline.segments.find(
        segment => segment.segmentId === "b1"
      )!;
      expect(continuation.isOnset).toBe(false);
      expect(rest.kind).toBe("rest");
      expect(rest.isOnset).toBe(false);
      expect(timeline.onsets).not.toContain(f.capacity);
      const tiedSpan = timeline.soundingSpans.find(
        span => span.tieGroupId === "cross"
      )!;
      expect(tiedSpan.startTicks).toBe(f.capacity - 240);
      expect(tiedSpan.endTicks).toBe(f.capacity + 240);
      const projection = projectRhythmNotation(pattern);
      expect(projection.segments[0].dotCount).toBe(1);
      expect(projection.segments[0].canonicalDurationTicks).toBe(360);
      expect(projection.segments[1].canonicalDurationTicks).toBe(120);
      expect(projection.tieEdges.some(edge => edge.crossesBarline)).toBe(true);
      const result = renderRhythmNotation(
        document.createElement("div"),
        pattern,
        { width: 320, measuresPerRow: 1 }
      );
      expect(result.parity.ok).toBe(true);
      expect(
        result.svg.querySelector('[data-rhythm-segment-id="dot"]')?.textContent
      ).toContain("\ue1e7");
      expect(
        result.svg
          .querySelector('[data-rhythm-segment-id="b1"]')
          ?.getAttribute("data-rhythm-kind")
      ).toBe("rest");
      const parts = [...result.svg.querySelectorAll("[data-rhythm-tie-part]")];
      expect(
        parts.map(part => part.getAttribute("data-rhythm-tie-part"))
      ).toEqual(["start", "end"]);
      expect(parts.every(part => part.querySelector("path"))).toBe(true);
    });
    it(`7M ${f.name} all-rest bar executes without invented attacks`, () => {
      const rest: RhythmPattern = {
        ...f.pattern,
        measures: [
          {
            ...f.pattern.measures[0],
            segments: f.pattern.measures[0].segments.map(segment => ({
              ...segment,
              kind: "rest",
            })),
          },
        ],
      };
      expect(validateRhythmPattern(rest).valid).toBe(true);
      expect(deriveRhythmTimeline(rest).onsets).toEqual([]);
      expect(deriveRhythmTimeline(rest).soundingSpans).toEqual([]);
      expect(projectRhythmNotation(rest).beamGroups).toEqual([]);
      const result = renderRhythmNotation(document.createElement("div"), rest);
      expect(result.parity.ok).toBe(true);
      expect(
        result.svg.querySelectorAll('[data-rhythm-kind="rest"]')
      ).toHaveLength(f.eighthStarts.length);
      expect(
        result.svg.querySelectorAll('[data-canonical-onset="true"]')
      ).toHaveLength(0);
    });
  }
  it.each([
    { numerator: 5, denominator: 8 },
    { numerator: 7, denominator: 8 },
    { numerator: 6, denominator: 4 },
    { numerator: 4, denominator: 2 },
  ])("never falls back for unsupported meter %j", meter => {
    const pattern = { ...SEVEN_METER_RUNTIME_FIXTURES[0].pattern, meter };
    expect(rhythmPatternInputSchema.safeParse(pattern).success).toBe(false);
    expect(validateRhythmPattern(pattern).valid).toBe(false);
    expect(() => deriveMeter(meter as RhythmMeter)).toThrow(RangeError);
    expect(() => deriveRhythmTimeline(pattern)).toThrow("SCHEMA_INVALID");
    expect(() => projectRhythmNotation(pattern)).toThrow("SCHEMA_INVALID");
    expect(() =>
      renderRhythmNotation(document.createElement("div"), pattern)
    ).toThrow("SCHEMA_INVALID");
  });
});

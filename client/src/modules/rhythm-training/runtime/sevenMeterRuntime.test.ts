// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { createRhythmAudioPlan } from "../audio/plan";
import { createTapAttemptPlan, createTapReferencePlan } from "../audio/tapPlan";
import {
  createTapTargets,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
import { rhythmPatternInputSchema } from "../rhythm/model";
import { durationToTicks } from "../rhythm/durations";
import {
  deriveMeter,
  deriveMeterStructure,
  getDefaultPulseBpm,
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
import {
  groupedMixedCompoundPattern,
  mixedRuntimePattern,
  SEVEN_METER_RUNTIME_FIXTURES,
} from "./fixtures";

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

function expectedPulseData(f: (typeof SEVEN_METER_RUNTIME_FIXTURES)[number]) {
  const pulseTicks = f.name === "2/2" ? 960 : f.name.endsWith("/4") ? 480 : 240;
  const pulseStarts = Array.from(
    { length: f.capacity / pulseTicks },
    (_, index) => index * pulseTicks
  );
  const groupStarts =
    f.name === "6/8"
      ? [0, 720]
      : f.name === "9/8"
        ? [0, 720, 1440]
        : [...pulseStarts];
  return {
    pulseTicks,
    pulseStarts,
    groupStarts,
    pulseIndices: f.eighthStarts.map(tick => Math.floor(tick / pulseTicks)),
  };
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

function exactTotalGroupInvalidPattern(meter: RhythmMeter): RhythmPattern {
  const eighth = (id: string, kind: "note" | "rest" = "note") => ({
    id,
    kind,
    duration: { denominator: 8 as const, dots: 0 as const },
  });
  const quarter = (id: string, kind: "note" | "rest" = "note") => ({
    id,
    kind,
    duration: { denominator: 4 as const, dots: 0 as const },
  });
  const segments =
    meter.numerator === 6
      ? [eighth("a"), eighth("b"), quarter("crossing-note"), quarter("d")]
      : [
          eighth("a"),
          eighth("b"),
          quarter("crossing-note"),
          ...Array.from({ length: 5 }, (_, index) => eighth(`tail-${index}`)),
        ];
  return {
    id: `invalid-full-total-${meter.numerator}-8`,
    meter,
    tempo: { pulseBpm: 60 },
    measures: [{ id: "bar-1", segments }],
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
      const expected = expectedPulseData(f);
      const ticks = f.pattern.measures[0].segments.map(segment =>
        durationToTicks(segment.duration)
      );
      expect(ticks.every(value => value === 240)).toBe(true);
      expect(ticks.reduce((sum, value) => sum + value, 0)).toBe(f.capacity);
      const meter = deriveMeter(f.pattern.meter);
      expect(meter.measureTicks).toBe(f.capacity);
      expect(meter.pulseTicks).toBe(expected.pulseTicks);
      expect(meter.pulseCount).toBe(expected.pulseStarts.length);
      expect(meter.pulseStarts).toEqual(expected.pulseStarts);
      expect(meter.groupStarts).toEqual(expected.groupStarts);
      expect(ticksToSeconds(f.capacity, f.pattern.meter, 60)).toBe(
        expected.pulseStarts.length
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
      const expected = expectedPulseData(f);
      const timeline = deriveRhythmTimeline(f.pattern, 240);
      const structure = deriveMeterStructure(f.pattern.meter, 240);
      expect(timeline.structure).toEqual(structure);
      expect(structure.pulseStarts).toEqual(expected.pulseStarts);
      expect(structure.groupStarts).toEqual(expected.groupStarts);
      expect(structure.subdivisionStarts).toEqual(f.eighthStarts);
      expect(structure.subdivisionTicks).toBe(240);
      expect(timeline.segments.map(segment => segment.pulseIndex)).toEqual(
        expected.pulseIndices
      );
      expect(
        timeline.segments.map(segment => segment.subdivisionIndex)
      ).toEqual(f.subdivisionIndices);
      expect(structure.accentPositions.map(point => point.pulseIndex)).toEqual(
        expected.pulseIndices
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
      const expected = expectedPulseData(f);
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
        const groupStartFor = (tick: number) => {
          const measureIndex = Math.floor(tick / f.capacity);
          const offset = tick - measureIndex * f.capacity;
          const localStart = expected.groupStarts
            .filter(start => start <= offset)
            .at(-1)!;
          return measureIndex * f.capacity + localStart;
        };
        expect(
          new Set(members.map(segment => groupStartFor(segment.startTicks)))
            .size
        ).toBe(1);
        expect(new Set(members.map(segment => segment.measureIndex)).size).toBe(
          1
        );
      }
    });
    it(`7M ${f.name} S09 actual VexFlow SVG rendering`, () => {
      const expected = expectedPulseData(f);
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
      ).toEqual(expected.pulseIndices);
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
  for (const meter of [
    { numerator: 6, denominator: 8 },
    { numerator: 9, denominator: 8 },
  ] as const) {
    it(`7M ${meter.numerator}/8 S11 keeps mixed grouped ties, rests, dots, notation and SVG in parity`, () => {
      const pattern = groupedMixedCompoundPattern(meter);
      const canonicalResult = validateRhythmPattern(pattern);
      expect(canonicalResult.valid).toBe(true);
      if (!canonicalResult.valid)
        throw new Error(JSON.stringify(canonicalResult.issues));
      const canonical = canonicalResult.pattern;
      const info = deriveMeter(meter);
      const timeline = deriveRhythmTimeline(canonical, 120);
      expect(timeline.totalTicks).toBe(info.measureTicks * 2);
      expect(timeline.meter.pulseTicks).toBe(240);
      expect(timeline.meter.groupStarts).toEqual(info.groupStarts);

      for (
        let measureIndex = 0;
        measureIndex < canonical.measures.length;
        measureIndex += 1
      ) {
        const positions = timeline.segments.filter(
          position => position.measureIndex === measureIndex
        );
        const groupTotals = info.groupStarts.map((start, groupIndex) => {
          const end = info.groupStarts[groupIndex + 1] ?? info.measureTicks;
          const members = positions.filter(
            position =>
              position.measureOffsetTicks >= start &&
              position.measureOffsetTicks < end
          );
          expect(
            members.every(
              position =>
                position.measureOffsetTicks + position.durationTicks <= end
            )
          ).toBe(true);
          return members.reduce(
            (sum, position) => sum + position.durationTicks,
            0
          );
        });
        expect(groupTotals).toEqual(
          Array.from({ length: meter.numerator / 3 }, () => 720)
        );
      }

      const groupCount = meter.numerator / 3;
      const tieMembers = timeline.segments.filter(
        position => position.tieGroupId === "group-sustain"
      );
      expect(tieMembers.map(position => position.durationTicks)).toEqual(
        Array.from({ length: groupCount }, () => 720)
      );
      expect(tieMembers.map(position => position.measureOffsetTicks)).toEqual(
        Array.from({ length: groupCount }, (_, index) => index * 720)
      );
      expect(tieMembers.map(position => position.isOnset)).toEqual([
        true,
        ...Array.from({ length: groupCount - 1 }, () => false),
      ]);
      expect(
        timeline.segments
          .filter(position => position.measureIndex === 0 && position.isOnset)
          .map(position => position.absoluteStartTicks)
      ).toEqual([0]);
      expect(timeline.soundingSpans).toContainEqual(
        expect.objectContaining({ startTicks: 0, endTicks: info.measureTicks })
      );
      const mixedBar = timeline.segments.filter(
        position => position.measureIndex === 1
      );
      expect(mixedBar.some(position => position.kind === "rest")).toBe(true);
      expect(mixedBar.some(position => position.durationTicks === 360)).toBe(
        true
      );
      expect(mixedBar.some(position => position.durationTicks === 120)).toBe(
        true
      );
      expect(mixedBar.some(position => position.durationTicks === 480)).toBe(
        true
      );

      const projection = projectRhythmNotation(canonical);
      expect(projection.timeline.onsets).toEqual(timeline.onsets);
      expect(projection.segments.map(item => item.startTicks)).toEqual(
        timeline.segments.map(item => item.absoluteStartTicks)
      );
      expect(projection.tieEdges).toHaveLength(groupCount - 1);
      for (const edge of projection.tieEdges) {
        const from = projection.segments.find(
          segment => segment.segmentId === edge.fromSegmentId
        )!;
        const to = projection.segments.find(
          segment => segment.segmentId === edge.toSegmentId
        )!;
        expect(from.endTicks).toBe(to.startTicks);
        expect(from.endTicks % 720).toBe(0);
      }

      const rendered = renderRhythmNotation(
        document.createElement("div"),
        canonical,
        { width: 640, measuresPerRow: 1 }
      );
      expect(rendered.parity.ok).toBe(true);
      expect(rendered.parity.segmentReports).toHaveLength(
        projection.segments.length
      );
      expect(
        rendered.svg.querySelectorAll("[data-rhythm-segment-id]")
      ).toHaveLength(projection.segments.length);
      expect(
        rendered.svg
          .querySelector('[data-rhythm-segment-id="dotted-rest"]')
          ?.getAttribute("data-canonical-tick")
      ).toBe(String(info.measureTicks));
    });

    it(`7M ${meter.numerator}/8 S12 rejects exact-total group-invalid notes at canonical and render boundaries`, () => {
      const invalid = exactTotalGroupInvalidPattern(meter);
      const exactTicks = invalid.measures[0].segments.reduce(
        (sum, segment) => sum + durationToTicks(segment.duration),
        0
      );
      expect(exactTicks).toBe(deriveMeter(meter).measureTicks);
      const result = validateRhythmPattern(invalid);
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error("Group-invalid full bar was accepted");
      expect(
        result.issues.some(
          issue => issue.code === "GROUP_SEGMENT_CROSSES_BOUNDARY"
        )
      ).toBe(true);
      expect(() => deriveRhythmTimeline(invalid)).toThrow(
        "GROUP_SEGMENT_CROSSES_BOUNDARY"
      );
      expect(() => projectRhythmNotation(invalid)).toThrow(
        "GROUP_SEGMENT_CROSSES_BOUNDARY"
      );
      const host = document.createElement("div");
      host.innerHTML = "<span>preserve</span>";
      expect(() => renderRhythmNotation(host, invalid)).toThrow(
        "GROUP_SEGMENT_CROSSES_BOUNDARY"
      );
      expect(host.innerHTML).toBe("<span>preserve</span>");
    });
  }
  it("7M canonical endpoints align validation, duration, audio/count-in/reference and tap targets for 1/2/4 bars", () => {
    for (const f of SEVEN_METER_RUNTIME_FIXTURES) {
      const expected = expectedPulseData(f);
      const track = f.name === "2/2" ? "bonus" : f.name.endsWith("/8") ? 6 : 3;
      for (const pulseBpm of [30, getDefaultPulseBpm(f.pattern.meter), 300]) {
        for (const bars of [1, 2, 4] as const) {
          const pattern: RhythmPattern = {
            ...f.pattern,
            id: `${f.pattern.id}-${pulseBpm}-${bars}`,
            tempo: { pulseBpm },
            measures: Array.from({ length: bars }, (_, barIndex) => ({
              id: `bar-${barIndex + 1}`,
              segments: f.pattern.measures[0].segments.map(
                (segment, index) => ({
                  ...segment,
                  id: `b${barIndex + 1}-s${index + 1}`,
                })
              ),
            })),
          };
          expect(rhythmPatternInputSchema.safeParse(pattern).success).toBe(
            true
          );
          expect(validateRhythmPattern(pattern).valid).toBe(true);
          const canonical = requireValidRhythmPattern(pattern);
          const measureTicks = f.capacity;
          const totalTicks = measureTicks * bars;
          const expectedSeconds = ticksToSeconds(
            totalTicks,
            f.pattern.meter,
            pulseBpm
          );
          const audio = createRhythmAudioPlan(canonical, "both");
          expect(audio.totalTicks).toBe(totalTicks);
          expect(audio.durationSeconds).toBe(expectedSeconds);
          const exercisePulseTicks = Array.from(
            { length: bars },
            (_, barIndex) =>
              expected.pulseStarts.map(tick => barIndex * measureTicks + tick)
          ).flat();
          expect(audio.pulseEvents.map(event => event.tick)).toEqual(
            exercisePulseTicks
          );
          expect(audio.pulseEvents.map(event => event.offsetSeconds)).toEqual(
            exercisePulseTicks.map(tick =>
              ticksToSeconds(tick, f.pattern.meter, pulseBpm)
            )
          );

          const exercise: TapRhythmExercise = {
            id: `runtime-stress-${f.name}-${pulseBpm}-${bars}`,
            kind: "tap-rhythm",
            track,
            section: "practice",
            pattern: canonical,
            gridTicks: 240,
            targets: createTapTargets(canonical, 240),
          };
          const targetTicks = Array.from({ length: bars }, (_, barIndex) =>
            f.eighthStarts.map(tick => barIndex * measureTicks + tick)
          ).flat();
          expect(exercise.targets.map(target => target.tick)).toEqual(
            targetTicks
          );
          expect(exercise.targets.map(target => target.offsetMs)).toEqual(
            targetTicks.map(
              tick => ticksToSeconds(tick, f.pattern.meter, pulseBpm) * 1000
            )
          );

          const attempt = createTapAttemptPlan(exercise);
          const reference = createTapReferencePlan(exercise);
          const countInTicks = expected.pulseStarts;
          expect(attempt.pulseEvents).toHaveLength(
            2 * bars * countInTicks.length
          );
          const attemptPulseRounds = [
            { tickShift: 0, secondsShift: 0 },
            {
              tickShift: totalTicks,
              secondsShift: expectedSeconds,
            },
          ];
          for (const [roundIndex, round] of attemptPulseRounds.entries()) {
            const roundEvents = attempt.pulseEvents.slice(
              roundIndex * bars * countInTicks.length,
              (roundIndex + 1) * bars * countInTicks.length
            );
            expect(
              roundEvents.map(event => event.tick - round.tickShift)
            ).toEqual(exercisePulseTicks);
            roundEvents.forEach((event, index) =>
              expect(event.offsetSeconds - round.secondsShift).toBeCloseTo(
                ticksToSeconds(
                  exercisePulseTicks[index],
                  f.pattern.meter,
                  pulseBpm
                ),
                10
              )
            );
          }
          expect(reference.pulseEvents).toHaveLength(
            (bars + 1) * countInTicks.length
          );
          expect(
            reference.pulseEvents
              .slice(countInTicks.length)
              .map(event => event.tick - measureTicks)
          ).toEqual(exercisePulseTicks);
          expect(
            reference.toneEvents.map(event => event.tick - measureTicks)
          ).toEqual(targetTicks);
          expect(
            reference.onsetReferences.map(event => event.tick - measureTicks)
          ).toEqual(targetTicks);
          expect(
            reference.visualCounting
              .slice(0, countInTicks.length)
              .map(item => item.tick)
          ).toEqual(countInTicks);
        }
      }
    }
  });
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

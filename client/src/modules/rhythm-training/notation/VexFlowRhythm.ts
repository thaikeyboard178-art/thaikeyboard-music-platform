import {
  Articulation,
  BarlineType,
  Beam,
  Dot,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  VexFlow,
  Voice,
  type RenderContext,
} from "vexflow";
import type { RhythmMeter } from "../types";
import { PPQ } from "../rhythm/durations";
import {
  projectRhythmNotation,
  type ImmutableRhythmNotationProjection,
  type NotationBeamGroup,
  type NotationSegmentProjection,
} from "./projection";

export type RhythmNotationRenderOptions = Readonly<{
  width?: number;
  measuresPerRow?: number;
  displayTimeSignature?: boolean;
  exposeCanonicalMetadata?: boolean;
}>;

export type RhythmVoiceParityReport = Readonly<{
  measureId: string;
  expectedTicks: string;
  actualTicks: string;
  expectedTicksUsed: string;
  actualTicksUsed: string;
  strictComplete: boolean;
  tickMatches: boolean;
}>;

export type RhythmSegmentParityReport = Readonly<{
  segmentId: string;
  canonicalStartTicks: number;
  canonicalEndTicks: number;
  expectedVexFlowStartTicks: string;
  actualVexFlowStartTicks: string;
  expectedVexFlowDurationTicks: string;
  actualVexFlowDurationTicks: string;
  actualX: number;
  tickMatches: boolean;
  positionMatches: boolean;
}>;

export type RhythmNotationParityReport = Readonly<{
  ok: boolean;
  voiceReports: readonly RhythmVoiceParityReport[];
  segmentReports: readonly RhythmSegmentParityReport[];
}>;

export type RhythmNotationMeasureGeometry = Readonly<{
  measureIndex: number;
  rowIndex: number;
  startTicks: number;
  endTicks: number;
  xStart: number;
  xEnd: number;
  noteAnchors: readonly Readonly<{
    segmentId: string;
    tick: number;
    x: number;
  }>[];
  staveBounds: Readonly<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;
}>;

export type RhythmNotationRenderResult = Readonly<{
  svg: SVGSVGElement;
  projection: ImmutableRhythmNotationProjection;
  parity: RhythmNotationParityReport;
  geometry: readonly RhythmNotationMeasureGeometry[];
}>;

export class RhythmNotationRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RhythmNotationRenderError";
  }
}

const VEXFLOW_PPQ = VexFlow.RESOLUTION;
const CANONICAL_WHOLE_TICKS = PPQ * 4;
const DEFAULT_WIDTH = 820;
const MIN_STAVE_WIDTH = 180;
const MIN_USABLE_WIDTH = 150;
const RIGHT_GLYPH_GAP = 24;
const ROW_HEIGHT = 156;
const STAVE_TOP = 36;
const STAVE_LEFT = 10;
const STAVE_RIGHT = 10;

function canonicalToVexFlowTicks(ticks: number): Fraction {
  return new Fraction(ticks * VEXFLOW_PPQ, CANONICAL_WHOLE_TICKS).simplify();
}

function fractionString(fraction: Fraction): string {
  return fraction.toSimplifiedString();
}

function validateOptions(
  options: RhythmNotationRenderOptions | undefined
): Required<RhythmNotationRenderOptions> {
  const width = options?.width ?? DEFAULT_WIDTH;
  const measuresPerRow = options?.measuresPerRow ?? 0;
  if (!Number.isFinite(width) || width < 1) {
    throw new RhythmNotationRenderError(
      "Notation width must be a finite number of at least1px"
    );
  }
  if (!Number.isInteger(measuresPerRow) || measuresPerRow < 0) {
    throw new RhythmNotationRenderError(
      "measuresPerRow must be a non-negative integer when provided"
    );
  }
  return {
    width: Math.floor(width),
    measuresPerRow,
    displayTimeSignature: options?.displayTimeSignature ?? true,
    exposeCanonicalMetadata: options?.exposeCanonicalMetadata ?? true,
  };
}

function meterTime(meter: RhythmMeter): string {
  return `${meter.numerator}/${meter.denominator}`;
}

function makeStaveNote(segment: NotationSegmentProjection): StaveNote {
  const note = new StaveNote({
    keys: ["b/4"],
    duration: segment.duration,
    dots: segment.dotCount,
  });
  if (segment.dotCount > 0) Dot.buildAndAttach([note], { all: true });
  if (segment.accent === "strong" && segment.kind === "note") {
    note.addModifier(new Articulation("a>"), 0);
  }
  return note;
}

function buildRows(
  projection: ImmutableRhythmNotationProjection,
  requestedMeasuresPerRow: number,
  width: number
): readonly (readonly number[])[] {
  const total = projection.canonicalPattern.measures.length;
  const autoPerRow = width < 560 ? 1 : width < 790 ? 2 : 3;
  const perRow = Math.max(
    1,
    Math.min(
      total,
      requestedMeasuresPerRow > 0 ? requestedMeasuresPerRow : autoPerRow
    )
  );
  const rows: number[][] = [];
  for (let index = 0; index < total; index += perRow) {
    rows.push(
      Array.from(
        { length: Math.min(perRow, total - index) },
        (_, offset) => index + offset
      )
    );
  }
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function addCanonicalDataAttributes(
  svg: SVGSVGElement,
  noteElements: readonly StaveNote[],
  segments: readonly NotationSegmentProjection[],
  rowByMeasure: ReadonlyMap<number, number>
): void {
  const candidates = Array.from(
    svg.querySelectorAll<SVGGElement>('g[class*="stavenote"]')
  );
  const bySegment = new Map<string, SVGGElement>();
  const count = Math.min(candidates.length, noteElements.length);
  for (let index = 0; index < count; index += 1) {
    bySegment.set(segments[index].segmentId, candidates[index]);
  }
  for (const segment of segments) {
    const element = bySegment.get(segment.segmentId);
    if (!element) continue;
    element.setAttribute("data-rhythm-segment-id", segment.segmentId);
    element.setAttribute("data-canonical-segment-id", segment.segmentId);
    element.setAttribute("data-canonical-tick", String(segment.startTicks));
    element.setAttribute(
      "data-canonical-start-ticks",
      String(segment.startTicks)
    );
    element.setAttribute("data-canonical-end-ticks", String(segment.endTicks));
    element.setAttribute(
      "data-canonical-duration-ticks",
      String(segment.canonicalDurationTicks)
    );
    element.setAttribute("data-canonical-onset", String(segment.onset));
    element.setAttribute("data-tie-role", segment.tieRole);
    element.setAttribute("data-rhythm-kind", segment.kind);
    element.setAttribute("data-explicit-accent", segment.accent);
    element.setAttribute("data-structural-accent", segment.structuralAccent);
    element.setAttribute("data-pulse-index", String(segment.pulseIndex));
    element.setAttribute(
      "data-pulse-offset-ticks",
      String(segment.pulseOffsetTicks)
    );
    element.setAttribute(
      "data-subdivision-index",
      String(segment.subdivisionIndex)
    );
    element.setAttribute(
      "data-subdivision-ticks",
      String(segment.subdivisionTicks)
    );
    element.setAttribute(
      "data-rhythm-measure-index",
      String(segment.measureIndex)
    );
    element.setAttribute(
      "data-rhythm-row-index",
      String(rowByMeasure.get(segment.measureIndex) ?? -1)
    );
  }
}

function createBeams(
  groups: readonly NotationBeamGroup[],
  notesById: ReadonlyMap<string, StaveNote>
): readonly Beam[] {
  return Object.freeze(
    groups.map(group => {
      const notes = group.segmentIds
        .map(segmentId => notesById.get(segmentId))
        .filter((note): note is StaveNote => note !== undefined);
      if (notes.length !== group.segmentIds.length || notes.length < 2) {
        throw new RhythmNotationRenderError(
          `Beam group ${group.id} could not resolve all canonical notes`
        );
      }
      // Beam's constructor marks notes as beamed, which suppresses flags.
      // It must therefore run after formatting but before voice.draw().
      return new Beam(notes);
    })
  );
}

function prepareBeams(context: RenderContext, beams: readonly Beam[]): void {
  for (const beam of beams) {
    beam.setContext(context);
    beam.postFormat();
  }
}

function drawBeams(beams: readonly Beam[]): void {
  for (const beam of beams) beam.draw();
}

function markBeamElements(
  svg: SVGSVGElement,
  groups: readonly NotationBeamGroup[]
): void {
  const elements = Array.from(svg.querySelectorAll<SVGGElement>(".vf-beam"));
  if (elements.length !== groups.length) {
    throw new RhythmNotationRenderError(
      "Rendered beam count disagrees with the canonical projection"
    );
  }
  elements.forEach((element, index) => {
    if (!element.querySelector("path")) {
      throw new RhythmNotationRenderError(
        "VexFlow beam has no actual drawn path"
      );
    }
    const group = groups[index];
    element.setAttribute("data-rhythm-beam-id", group.id);
    element.setAttribute(
      "data-rhythm-beam-segments",
      group.segmentIds.join(",")
    );
    element.setAttribute("data-beam-pulse-index", String(group.pulseIndex));
    element.setAttribute("data-beam-start-ticks", String(group.startTicks));
    element.setAttribute("data-beam-end-ticks", String(group.endTicks));
  });
}

function compareActualPositions(
  note: StaveNote,
  segment: NotationSegmentProjection,
  measureTicks: number
): RhythmSegmentParityReport {
  const expectedStart = canonicalToVexFlowTicks(
    segment.startTicks - segment.measureIndex * measureTicks
  );
  const expectedDuration = canonicalToVexFlowTicks(
    segment.canonicalDurationTicks
  );
  const actualDuration = note.getTicks();
  const actualStart = new Fraction(note.getTickContext().getTickID(), 1);
  const tickMatches = actualDuration.equals(expectedDuration);
  const positionMatches = actualStart.equals(expectedStart);
  return Object.freeze({
    segmentId: segment.segmentId,
    canonicalStartTicks: segment.startTicks,
    canonicalEndTicks: segment.endTicks,
    expectedVexFlowStartTicks: fractionString(expectedStart),
    actualVexFlowStartTicks: fractionString(actualStart),
    expectedVexFlowDurationTicks: fractionString(expectedDuration),
    actualVexFlowDurationTicks: fractionString(actualDuration),
    actualX: note.getAbsoluteX(),
    tickMatches,
    positionMatches,
  });
}

function makeVoice(meter: RhythmMeter, notes: readonly StaveNote[]): Voice {
  const voice = new Voice({
    numBeats: meter.numerator,
    beatValue: meter.denominator,
    resolution: VEXFLOW_PPQ,
  });
  voice.setMode(Voice.Mode.STRICT);
  voice.addTickables([...notes]);
  if (!voice.getTicksUsed().equals(voice.getTotalTicks())) {
    throw new RhythmNotationRenderError(
      "VexFlow strict voice does not fill its meter"
    );
  }
  return voice;
}

function naturalMeasureWidth(voice: Voice, stave: Stave): number {
  const formatter = new Formatter();
  const minimumContentWidth = formatter.preCalculateMinTotalWidth([voice]);
  const noteStartOffset = stave.getNoteStartX() - stave.getX();
  // Keep a real right-side breathing room for the final stem, dot, or tie.
  return Math.max(
    MIN_STAVE_WIDTH,
    Math.ceil(
      noteStartOffset +
        Math.max(MIN_USABLE_WIDTH, minimumContentWidth) +
        RIGHT_GLYPH_GAP * 2
    )
  );
}

function assertNoMeasureOverflow(
  stavesByMeasure: ReadonlyMap<number, Stave>,
  notesByMeasure: ReadonlyMap<number, readonly StaveNote[]>
): void {
  for (const [measureIndex, notes] of notesByMeasure) {
    const stave = stavesByMeasure.get(measureIndex);
    if (!stave)
      throw new RhythmNotationRenderError("Measure stave was not created");
    const right = stave.getX() + stave.getWidth();
    for (const note of notes) {
      // getWidth includes spacing/modifier context, not just the glyph's
      // right extent. Adding it to AbsoluteX overcounts left spacing.
      const bounds = note.getBoundingBox();
      const noteRight = bounds.getX() + bounds.getW();
      if (noteRight > right + 0.5) {
        throw new RhythmNotationRenderError(
          `Notation measure ${measureIndex} exceeds its natural stave width (${noteRight.toFixed(2)} > ${right.toFixed(2)})`
        );
      }
    }
  }
}

type TieMarker = Readonly<{
  edgeId: string;
  part: "full" | "start" | "end";
  fromSegmentId: string;
  toSegmentId: string;
  crossesBarline: boolean;
}>;

function drawTie(
  context: RenderContext,
  marker: TieMarker,
  firstNote: StaveNote | undefined,
  lastNote: StaveNote | undefined,
  partial: "first" | "last" | undefined
): void {
  if (!firstNote && !lastNote) {
    throw new RhythmNotationRenderError(
      `Tie ${marker.edgeId} has no note endpoint`
    );
  }
  const notes =
    partial === "first"
      ? { firstNote, firstIndexes: [0] }
      : partial === "last"
        ? { lastNote, lastIndexes: [0] }
        : { firstNote, lastNote };
  new StaveTie(notes).setContext(context).draw();
}

function markTieElements(
  svg: SVGSVGElement,
  markers: readonly TieMarker[]
): void {
  const elements = Array.from(
    svg.querySelectorAll<SVGGElement>('g[class*="stavetie"]')
  );
  if (elements.length !== markers.length) {
    throw new RhythmNotationRenderError(
      `Expected ${markers.length} rendered tie paths but found ${elements.length}`
    );
  }
  elements.forEach((element, index) => {
    const marker = markers[index];
    element.setAttribute("data-rhythm-tie-id", marker.edgeId);
    element.setAttribute("data-rhythm-tie-part", marker.part);
    element.setAttribute(
      "data-rhythm-tie-crosses-barline",
      String(marker.crossesBarline)
    );
    element.setAttribute(
      "data-rhythm-tie-from-segment-id",
      marker.fromSegmentId
    );
    element.setAttribute("data-rhythm-tie-to-segment-id", marker.toSegmentId);
  });
}

export function renderRhythmNotation(
  container: HTMLElement,
  input: unknown,
  options?: RhythmNotationRenderOptions
): RhythmNotationRenderResult {
  if (
    container === null ||
    typeof container !== "object" ||
    typeof container.appendChild !== "function" ||
    typeof container.removeChild !== "function"
  ) {
    throw new RhythmNotationRenderError(
      "A writable HTMLElement container is required"
    );
  }
  const projection = projectRhythmNotation(input);
  const renderOptions = validateOptions(options);
  const rows = buildRows(
    projection,
    renderOptions.measuresPerRow,
    renderOptions.width
  );

  while (container.firstChild) container.removeChild(container.firstChild);

  const height = Math.max(ROW_HEIGHT, rows.length * ROW_HEIGHT);
  const initialWidth = Math.max(
    renderOptions.width,
    rows.reduce((max, row) => Math.max(max, row.length * MIN_STAVE_WIDTH), 0) +
      STAVE_LEFT +
      STAVE_RIGHT
  );
  const renderer = new Renderer(
    container as HTMLDivElement,
    Renderer.Backends.SVG
  );
  renderer.resize(initialWidth, height);
  const context = renderer.getContext();
  const notesById = new Map<string, StaveNote>();
  const allNotes: StaveNote[] = [];
  const voices: Voice[] = [];
  const voiceReports: RhythmVoiceParityReport[] = [];
  const stavesByMeasure = new Map<number, Stave>();
  const notesByMeasure = new Map<number, readonly StaveNote[]>();
  const rowByMeasure = new Map<number, number>();
  const provisionalRowWidth =
    (initialWidth - STAVE_LEFT - STAVE_RIGHT) /
    Math.max(...rows.map(row => row.length));

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    let provisionalX = STAVE_LEFT;
    for (let column = 0; column < row.length; column += 1) {
      const measureIndex = row[column];
      const measure = projection.canonicalPattern.measures[measureIndex];
      const measureSegments = projection.segments.filter(
        segment => segment.measureIndex === measureIndex
      );
      const staveWidth = Math.max(MIN_STAVE_WIDTH, provisionalRowWidth - 4);
      const stave = new Stave(
        provisionalX,
        STAVE_TOP + rowIndex * ROW_HEIGHT,
        staveWidth
      );
      stave.setEndBarType(
        measureIndex === projection.canonicalPattern.measures.length - 1
          ? BarlineType.END
          : BarlineType.SINGLE
      );
      if (column === 0) {
        stave.addClef("percussion");
        if (renderOptions.displayTimeSignature)
          stave.addTimeSignature(meterTime(projection.canonicalPattern.meter));
      }
      const notes = measureSegments.map(makeStaveNote);
      const voice = makeVoice(projection.canonicalPattern.meter, notes);
      voice.setStave(stave);
      stave.setContext(context);
      for (let index = 0; index < notes.length; index += 1) {
        notesById.set(measureSegments[index].segmentId, notes[index]);
        allNotes.push(notes[index]);
      }
      voices.push(voice);
      stavesByMeasure.set(measureIndex, stave);
      notesByMeasure.set(measureIndex, notes);
      rowByMeasure.set(measureIndex, rowIndex);
      provisionalX += staveWidth;
      const expectedTicks = canonicalToVexFlowTicks(
        projection.timeline.meter.measureTicks
      );
      const actualTicks = voice.getTotalTicks();
      const actualTicksUsed = voice.getTicksUsed();
      voiceReports.push(
        Object.freeze({
          measureId: measure.id,
          expectedTicks: fractionString(expectedTicks),
          actualTicks: fractionString(actualTicks),
          expectedTicksUsed: fractionString(expectedTicks),
          actualTicksUsed: fractionString(actualTicksUsed),
          strictComplete: voice.isComplete(),
          tickMatches:
            actualTicks.equals(expectedTicks) &&
            actualTicksUsed.equals(expectedTicks),
        })
      );
    }
  }

  const naturalWidths = new Map<number, number>();
  for (const [measureIndex, stave] of stavesByMeasure) {
    const voiceIndex = [...stavesByMeasure.keys()].indexOf(measureIndex);
    const voice = voices[voiceIndex];
    if (!voice)
      throw new RhythmNotationRenderError("Measure voice was not created");
    naturalWidths.set(measureIndex, naturalMeasureWidth(voice, stave));
  }

  const naturalWidth = Math.max(
    renderOptions.width,
    ...rows.map(
      row =>
        STAVE_LEFT +
        STAVE_RIGHT +
        row.reduce((sum, index) => sum + naturalWidths.get(index)!, 0)
    )
  );
  for (const row of rows) {
    let x = STAVE_LEFT;
    const rowWidth = row.reduce(
      (sum, index) => sum + naturalWidths.get(index)!,
      0
    );
    const extraPerMeasure =
      (naturalWidth - STAVE_LEFT - STAVE_RIGHT - rowWidth) / row.length;
    for (const measureIndex of row) {
      const stave = stavesByMeasure.get(measureIndex);
      const width = naturalWidths.get(measureIndex);
      if (!stave || width === undefined) {
        throw new RhythmNotationRenderError(
          "Natural measure layout was not created"
        );
      }
      stave.setX(x);
      stave.setWidth(width + extraPerMeasure);
      x += width + extraPerMeasure;
    }
  }
  renderer.resize(naturalWidth, height);

  for (let index = 0; index < voices.length; index += 1) {
    const voice = voices[index];
    const stave = voice.getStave();
    if (!stave)
      throw new RhythmNotationRenderError("Voice was not assigned a stave");
    // Tick spacing does not itself reserve the final flag/dot's right extent.
    const usableWidth =
      stave.getNoteEndX() - stave.getNoteStartX() - RIGHT_GLYPH_GAP;
    if (usableWidth < MIN_USABLE_WIDTH) {
      throw new RhythmNotationRenderError(
        `Notation measure ${index} has less than ${MIN_USABLE_WIDTH}px of usable width`
      );
    }
    new Formatter()
      .joinVoices([voice])
      .format([voice], usableWidth, { context, stave, alignRests: true });
  }

  const beams = createBeams(projection.beamGroups, notesById);
  prepareBeams(context, beams);
  for (let index = 0; index < voices.length; index += 1) {
    const voice = voices[index];
    const stave = voice.getStave();
    if (!stave)
      throw new RhythmNotationRenderError("Voice was not assigned a stave");
    stave.draw();
    voice.draw(context, stave);
  }
  drawBeams(beams);

  const tieMarkers: TieMarker[] = [];
  for (const edge of projection.tieEdges) {
    const firstNote = notesById.get(edge.fromSegmentId);
    const lastNote = notesById.get(edge.toSegmentId);
    if (!firstNote || !lastNote) {
      throw new RhythmNotationRenderError(
        `Tie ${edge.id} could not resolve its notes`
      );
    }
    const firstRow = rowByMeasure.get(
      projection.segments.find(
        segment => segment.segmentId === edge.fromSegmentId
      )!.measureIndex
    );
    const lastRow = rowByMeasure.get(
      projection.segments.find(
        segment => segment.segmentId === edge.toSegmentId
      )!.measureIndex
    );
    if (firstRow === undefined || lastRow === undefined) {
      throw new RhythmNotationRenderError(`Tie ${edge.id} has no row metadata`);
    }
    if (firstRow === lastRow) {
      const marker: TieMarker = {
        edgeId: edge.id,
        part: "full",
        fromSegmentId: edge.fromSegmentId,
        toSegmentId: edge.toSegmentId,
        crossesBarline: edge.crossesBarline,
      };
      drawTie(context, marker, firstNote, lastNote, undefined);
      tieMarkers.push(marker);
    } else {
      const startMarker: TieMarker = {
        edgeId: edge.id,
        part: "start",
        fromSegmentId: edge.fromSegmentId,
        toSegmentId: edge.toSegmentId,
        crossesBarline: edge.crossesBarline,
      };
      const endMarker: TieMarker = {
        edgeId: edge.id,
        part: "end",
        fromSegmentId: edge.fromSegmentId,
        toSegmentId: edge.toSegmentId,
        crossesBarline: edge.crossesBarline,
      };
      drawTie(context, startMarker, firstNote, undefined, "first");
      drawTie(context, endMarker, undefined, lastNote, "last");
      tieMarkers.push(startMarker, endMarker);
    }
  }

  const svg = container.querySelector("svg");
  if (!svg)
    throw new RhythmNotationRenderError(
      "VexFlow did not create an SVG element"
    );
  assertNoMeasureOverflow(stavesByMeasure, notesByMeasure);
  const segmentReports = projection.segments.map((segment, index) =>
    compareActualPositions(
      allNotes[index],
      segment,
      projection.timeline.meter.measureTicks
    )
  );
  const parity: RhythmNotationParityReport = Object.freeze({
    ok:
      voiceReports.every(
        report => report.tickMatches && report.strictComplete
      ) &&
      segmentReports.every(
        report => report.tickMatches && report.positionMatches
      ),
    voiceReports: Object.freeze(voiceReports),
    segmentReports: Object.freeze(segmentReports),
  });
  if (!parity.ok) {
    throw new RhythmNotationRenderError("VexFlow notation parity check failed");
  }
  if (renderOptions.exposeCanonicalMetadata) {
    addCanonicalDataAttributes(svg, allNotes, projection.segments, rowByMeasure);
    markTieElements(svg, tieMarkers);
    markBeamElements(svg, projection.beamGroups);
  }
  const measureTicks = projection.timeline.meter.measureTicks;
  const geometry: readonly RhythmNotationMeasureGeometry[] = Object.freeze(
    [...stavesByMeasure.entries()]
      .sort(([left], [right]) => left - right)
      .map(([measureIndex, stave]) => {
        const segments = projection.segments.filter(
          segment => segment.measureIndex === measureIndex
        );
        const notes = notesByMeasure.get(measureIndex) ?? [];
        const noteAnchors = Object.freeze(
          segments.map((segment, index) =>
            Object.freeze({
              segmentId: segment.segmentId,
              tick: segment.startTicks,
              x: notes[index].getAbsoluteX(),
            })
          )
        );
        return Object.freeze({
          measureIndex,
          rowIndex: rowByMeasure.get(measureIndex) ?? 0,
          startTicks: measureIndex * measureTicks,
          endTicks: (measureIndex + 1) * measureTicks,
          xStart: stave.getNoteStartX(),
          xEnd: stave.getX() + stave.getWidth(),
          noteAnchors,
          staveBounds: Object.freeze({
            left: stave.getX(),
            right: stave.getX() + stave.getWidth(),
            top: stave.getTopLineTopY(),
            bottom: stave.getBottomLineBottomY(),
          }),
        });
      })
  );
  if (renderOptions.exposeCanonicalMetadata) {
    svg.setAttribute("data-rhythm-pattern-id", projection.canonicalPattern.id);
    svg.setAttribute(
      "data-rhythm-meter",
      meterTime(projection.canonicalPattern.meter)
    );
    svg.setAttribute(
      "data-rhythm-total-ticks",
      String(projection.timeline.totalTicks)
    );
  }
  svg.setAttribute("data-rhythm-natural-width", String(naturalWidth));
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    renderOptions.exposeCanonicalMetadata
      ? `Rhythm notation ${projection.canonicalPattern.id}`
      : "Khuông nhạc tiết tấu, một ô nhịp hoàn chỉnh"
  );
  svg.setAttribute("viewBox", `0 0 ${naturalWidth} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
  svg.setAttribute("width", String(renderOptions.width));
  svg.setAttribute(
    "height",
    String((height * renderOptions.width) / naturalWidth)
  );
  return Object.freeze({ svg, projection, parity, geometry });
}

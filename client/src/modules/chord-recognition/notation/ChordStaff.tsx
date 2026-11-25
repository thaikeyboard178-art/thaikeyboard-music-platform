import React, { useLayoutEffect, useRef } from "react";
import { Accidental, Formatter, Renderer, Stave, StaveNote } from "vexflow";
import type { ChordPitch } from "../types";
import { projectChordStaff, type ChordStaffPitch } from "./chordStaffProjection";

export type ChordStaffProps = Readonly<{
  pitches: readonly ChordPitch[];
  reveal?: boolean;
}>;

type StaffGroup = Readonly<{
  clef: "bass" | "treble";
  pitches: readonly ChordStaffPitch[];
}>;

type PositionedStaffGroup = StaffGroup & Readonly<{ y: number }>;

const MIN_RENDER_WIDTH = 240;
const STAFF_HEIGHT = 112;
const GRAND_STAFF_HEIGHT = 210;
const LETTER_DIATONIC_INDEX: Readonly<Record<ChordStaffPitch["letter"], number>> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};
const NOTEHEAD_Y_FROM_STAVE_BOTTOM = 97;
const STAFF_LINE_SPACING = 12;
const NOTE_STEP_SPACING = STAFF_LINE_SPACING / 2;
const TOP_NOTEHEAD_MARGIN = 42;
const GRAND_STAFF_NOTE_GAP = 60;
const GRAND_STAFF_LINE_CLEARANCE = 32;
const BOTTOM_RENDER_MARGIN = 36;

function staveGroups(pitches: readonly ChordPitch[]): readonly StaffGroup[] {
  const projection = projectChordStaff(pitches);
  if (projection.bass.length && projection.treble.length) {
    return [
      { clef: "treble", pitches: projection.treble },
      { clef: "bass", pitches: projection.bass },
    ];
  }
  if (projection.bass.length) return [{ clef: "bass", pitches: projection.bass }];
  return [{ clef: "treble", pitches: projection.treble }];
}

function noteheadBounds(group: StaffGroup): Readonly<{ min: number; max: number }> {
  if (!group.pitches.length) return { min: 0, max: 0 };
  const bottomLineDiatonicIndex = group.clef === "treble" ? 4 * 7 + LETTER_DIATONIC_INDEX.E : 2 * 7 + LETTER_DIATONIC_INDEX.G;
  const yPositions = group.pitches.map((pitch) => {
    const diatonicIndex = pitch.octave * 7 + LETTER_DIATONIC_INDEX[pitch.letter];
    return NOTEHEAD_Y_FROM_STAVE_BOTTOM - (diatonicIndex - bottomLineDiatonicIndex) * NOTE_STEP_SPACING;
  });
  return { min: Math.min(...yPositions), max: Math.max(...yPositions) };
}

function positionedStaffGroups(groups: readonly StaffGroup[]): readonly PositionedStaffGroup[] {
  if (groups.length === 1) {
    const group = groups[0];
    const bounds = noteheadBounds(group);
    return [{ ...group, y: Math.max(29, TOP_NOTEHEAD_MARGIN - bounds.min) }];
  }

  const treble = groups.find((group) => group.clef === "treble")!;
  const bass = groups.find((group) => group.clef === "bass")!;
  const trebleBounds = noteheadBounds(treble);
  const bassBounds = noteheadBounds(bass);
  const trebleY = Math.max(8, TOP_NOTEHEAD_MARGIN - trebleBounds.min);
  const bassY = Math.max(
    108,
    trebleY + NOTEHEAD_Y_FROM_STAVE_BOTTOM + GRAND_STAFF_LINE_CLEARANCE - STAFF_LINE_SPACING * 4,
    trebleY + trebleBounds.max + GRAND_STAFF_NOTE_GAP - bassBounds.min,
  );
  return groups.map((group) => ({ ...group, y: group.clef === "treble" ? trebleY : bassY }));
}

function requiredSvgHeight(groups: readonly PositionedStaffGroup[]): number {
  const lowestStaffOrNote = Math.max(...groups.map((group) => {
    const bounds = noteheadBounds(group);
    return Math.max(group.y + NOTEHEAD_Y_FROM_STAVE_BOTTOM, group.y + bounds.max);
  }));
  return Math.ceil(lowestStaffOrNote + BOTTOM_RENDER_MARGIN);
}

/** Draw chord-owned, spelled pitches with the installed VexFlow 5 SVG backend. */
export function renderChordStaff(host: HTMLDivElement, pitches: readonly ChordPitch[], width: number): SVGSVGElement {
  const renderWidth = Math.max(MIN_RENDER_WIDTH, Math.floor(Number.isFinite(width) ? width : MIN_RENDER_WIDTH));
  const groups = positionedStaffGroups(staveGroups(pitches));
  const height = Math.max(groups.length > 1 ? GRAND_STAFF_HEIGHT : STAFF_HEIGHT, requiredSvgHeight(groups));
  host.replaceChildren();

  const renderer = new Renderer(host, Renderer.Backends.SVG);
  renderer.resize(renderWidth, height);
  const context = renderer.getContext();
  const staves = groups.map((group) => {
    const stave = new Stave(12, group.y, renderWidth - 24, { spacingBetweenLinesPx: STAFF_LINE_SPACING });
    stave.addClef(group.clef).setContext(context).draw();

    if (group.pitches.length) {
      const chord = new StaveNote({
        keys: group.pitches.map((pitch) => pitch.key),
        duration: "q",
        clef: group.clef,
        autoStem: true,
      });
      group.pitches.forEach((pitch, indexInChord) => {
        if (pitch.accidental !== 0) chord.addModifier(new Accidental(pitch.accidentalSymbol), indexInChord);
      });
      chord.setLedgerLineStyle({ strokeStyle: "#556578", lineWidth: 1.15 });
      Formatter.FormatAndDraw(context, stave, [chord]);
    }
    return group;
  });

  const svg = host.querySelector("svg");
  if (!svg) throw new Error("VexFlow did not create an SVG chord staff");
  const projection = projectChordStaff(pitches);
  svg.setAttribute("viewBox", `0 0 ${renderWidth} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", String(renderWidth));
  svg.setAttribute("height", String(height));
  svg.style.display = "block";
  svg.style.width = "100%";
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  svg.dataset.chordPitches = projection.pitches.map((pitch) => pitch.midi).join(",");
  svg.dataset.chordClefs = staves.map((group) => group.clef).join(",");
  return svg;
}

function measuredWidth(host: HTMLDivElement): number {
  return Math.max(MIN_RENDER_WIDTH, Math.floor(host.getBoundingClientRect().width || host.clientWidth || MIN_RENDER_WIDTH));
}

function scheduleFrame(callback: FrameRequestCallback): number {
  if (typeof window.requestAnimationFrame === "function") return window.requestAnimationFrame(callback);
  return window.setTimeout(() => callback(Date.now()), 16);
}

function cancelFrame(id: number): void {
  if (typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(id);
  else window.clearTimeout(id);
}

function pitchSignature(pitches: readonly ChordPitch[]): string {
  return pitches.map((pitch) => `${pitch.midi}:${pitch.letter}:${pitch.accidental}:${pitch.octave}:${pitch.name}`).join("|");
}

export function ChordStaff({ pitches, reveal = false }: ChordStaffProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const signature = pitchSignature(pitches);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let previousWidth = measuredWidth(host);
    let frameId: number | null = null;
    renderChordStaff(host, pitches, previousWidth);

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          if (disposed) return;
          const nextWidth = measuredWidth(host);
          if (nextWidth === previousWidth || frameId !== null) return;
          frameId = scheduleFrame(() => {
            frameId = null;
            if (disposed) return;
            const settledWidth = measuredWidth(host);
            if (settledWidth === previousWidth) return;
            renderChordStaff(host, pitches, settledWidth);
            previousWidth = settledWidth;
          });
        });
    observer?.observe(host);

    return () => {
      disposed = true;
      observer?.disconnect();
      if (frameId !== null) cancelFrame(frameId);
    };
  }, [signature]);

  const labels = projectChordStaff(pitches).pitches.map((pitch) => `${pitch.name}${pitch.octave}`);
  const accessibleName = reveal && labels.length
    ? `Khuông nhạc hợp âm: ${labels.join(", ")}`
    : "Khuông nhạc hợp âm";

  return (
    <figure className="chord-staff" style={{ margin: 0, width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <div
        ref={hostRef}
        className="chord-staff-host"
        role="img"
        aria-label={accessibleName}
        title="Khuông nhạc hợp âm"
        data-chord-clefs={staveGroups(pitches).map((group) => group.clef).join(",")}
        style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}
      />
      {reveal && labels.length > 0 && (
        <figcaption className="chord-staff-labels" aria-label={`Tên nốt: ${labels.join(", ")}`}>
          {labels.map((label, index) => <span className="chord-staff-note-label" key={`${label}-${index}`}>{label}</span>)}
        </figcaption>
      )}
    </figure>
  );
}

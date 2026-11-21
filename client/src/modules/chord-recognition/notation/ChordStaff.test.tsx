// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChordStaff, renderChordStaff } from "./ChordStaff";
import { accidentalToVexFlowSymbol, projectChordStaff } from "./chordStaffProjection";
import type { ChordPitch } from "../types";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () => ({ measureText: (text: string) => ({ width: text.length * 8 }) }),
});

function makePitch(letter: ChordPitch["letter"], accidental: number, name: string, octave: number, midi: number): ChordPitch {
  return { letter, accidental, name, octave, midi, pitchClass: ((midi % 12) + 12) % 12 };
}

const C2 = makePitch("C", 0, "C", 2, 36);
const C1 = makePitch("C", 0, "C", 1, 24);
const C3 = makePitch("C", 0, "C", 3, 48);
const C4 = makePitch("C", 0, "C", 4, 60);
const C8 = makePitch("C", 0, "C", 8, 108);
const E4 = makePitch("E", 0, "E", 4, 64);
const G4 = makePitch("G", 0, "G", 4, 67);
const Eb4 = makePitch("E", -1, "E♭", 4, 63);
const Bb4 = makePitch("B", -1, "B♭", 4, 70);
const D5 = makePitch("D", 0, "D", 5, 74);
const G2 = makePitch("G", 0, "G", 2, 43);
const G3 = makePitch("G", 0, "G", 3, 55);

const major = [C2, C3, C4, E4, G4];
const minor9 = [C2, C3, Eb4, G4, Bb4, D5];
const minor9SlashG = [G2, G3, C4, Eb4, Bb4, D5];

describe("ChordStaff actual VexFlow SVG", () => {
  it.each([
    ["C major", major],
    ["Cm9", minor9],
    ["Cm9/G", minor9SlashG],
  ] as const)("renders every actual ascending pitch for %s", (_name, pitches) => {
    const host = document.createElement("div");
    const svg = renderChordStaff(host, pitches, 320);
    const projection = projectChordStaff(pitches);
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.dataset.chordPitches?.split(",").map(Number)).toEqual(projection.pitches.map((pitch) => pitch.midi));
    expect(svg.querySelectorAll(".vf-notehead")).toHaveLength(pitches.length);
    expect(svg.querySelectorAll(".vf-stavenote")).toHaveLength(projection.bass.length && projection.treble.length ? 2 : 1);
    expect(Number(svg.getAttribute("width"))).toBe(320);
  });

  it("keeps exact accidental spelling, omits unaltered natural signs, and renders altered-note glyphs", () => {
    const fixtures = [
      { pitch: makePitch("C", 0, "C", 4, 60), symbol: "n", glyph: "" },
      { pitch: makePitch("C", 1, "C♯", 4, 61), symbol: "#", glyph: "" },
      { pitch: makePitch("D", -1, "D♭", 4, 61), symbol: "b", glyph: "" },
      { pitch: makePitch("F", 2, "F𝄪", 4, 67), symbol: "##", glyph: "" },
      { pitch: makePitch("G", -2, "G𝄫", 4, 65), symbol: "bb", glyph: "" },
    ] as const;
    for (const { pitch, symbol, glyph } of fixtures) {
      const projection = projectChordStaff([pitch]);
      expect(accidentalToVexFlowSymbol(pitch.accidental)).toBe(symbol);
      expect(projection.pitches[0]).toMatchObject({
        name: pitch.name,
        letter: pitch.letter,
        octave: pitch.octave,
        accidental: pitch.accidental,
        accidentalSymbol: symbol,
        key: `${pitch.letter.toLowerCase()}/${pitch.octave}`,
      });
      const svg = renderChordStaff(document.createElement("div"), [pitch], 280);
      const noteGlyphs = Array.from(svg.querySelectorAll(".vf-notehead text"), (text) => text.textContent);
      if (pitch.accidental === 0) {
        expect(noteGlyphs).toHaveLength(1);
        expect(noteGlyphs.at(-1)).not.toBe(glyph);
      } else {
        expect(noteGlyphs).toHaveLength(2);
        expect(noteGlyphs.at(-1)).toBe(glyph);
      }
      expect(svg.dataset.chordPitches).toBe(String(pitch.midi));
    }
  });

  it("does not draw natural glyphs on an unaltered C major chord", () => {
    const svg = renderChordStaff(document.createElement("div"), major, 320);
    expect(svg.querySelectorAll(".vf-accidental")).toHaveLength(0);
    expect(svg.querySelectorAll(".vf-notehead")).toHaveLength(5);
  });

  it("uses an actual bass and treble StaveNote when the pitches cross MIDI 60", () => {
    const svg = renderChordStaff(document.createElement("div"), [C4, C3], 320);
    expect(svg.dataset.chordClefs).toBe("treble,bass");
    expect(svg.querySelectorAll(".vf-stavenote")).toHaveLength(2);
    expect(svg.querySelectorAll(".vf-notehead")).toHaveLength(2);
    expect(svg.dataset.chordPitches).toBe("48,60");
  });

  it("expands vertical layout to contain extreme bass, ledger, and high treble noteheads", () => {
    const svg = renderChordStaff(document.createElement("div"), [C8, C1, C4], 320);
    const height = Number(svg.getAttribute("height"));
    const noteheadY = Array.from(svg.querySelectorAll(".vf-notehead text"), (text) => Number(text.getAttribute("y")));
    expect(svg.dataset.chordClefs).toBe("treble,bass");
    expect(svg.querySelectorAll(".vf-stavenote")).toHaveLength(2);
    expect(height).toBeGreaterThan(300);
    expect(Math.min(...noteheadY)).toBeGreaterThan(0);
    expect(Math.max(...noteheadY)).toBeLessThan(height);
    expect(svg.getAttribute("viewBox")).toBe(`0 0 320 ${height}`);
  });

  it("fits a narrow 240px host without changing its minimum drawing viewBox", () => {
    const host = document.createElement("div");
    const svg = renderChordStaff(host, [C4, E4, G4], 240);
    expect(svg.getAttribute("width")).toBe("240");
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 240 /);
    expect(svg.style.width).toBe("100%");
    expect(svg.style.maxWidth).toBe("100%");
  });

  it("keeps the hidden accessible name generic and only renders pitch labels after reveal", () => {
    const hidden = render(<ChordStaff pitches={[C4, Eb4, G4]} />);
    expect(screen.getByRole("img", { name: "Khuông nhạc hợp âm" })).toBeTruthy();
    expect(hidden.container.querySelector(".chord-staff-host")?.getAttribute("title")).toBe("Khuông nhạc hợp âm");
    expect(hidden.container.querySelector(".chord-staff-labels")).toBeNull();
    expect(hidden.container.textContent).not.toContain("C4");
    hidden.unmount();

    render(<ChordStaff pitches={[C4, Eb4, G4]} reveal />);
    expect(screen.getByRole("img", { name: "Khuông nhạc hợp âm: C4, E♭4, G4" })).toBeTruthy();
    expect(screen.getByText("C4")).toBeTruthy();
    expect(screen.getByText("E♭4")).toBeTruthy();
    expect(screen.getByText("G4")).toBeTruthy();
  });
});

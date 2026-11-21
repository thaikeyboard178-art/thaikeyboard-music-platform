// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChordPiano } from "./ChordPiano";
import type { ChordPitch } from "../types";

afterEach(cleanup);

function makePitch(letter: ChordPitch["letter"], accidental: number, name: string, octave: number, midi: number): ChordPitch {
  return { letter, accidental, name, octave, midi, pitchClass: ((midi % 12) + 12) % 12 };
}

const C2 = makePitch("C", 0, "C", 2, 36);
const C3 = makePitch("C", 0, "C", 3, 48);
const C4 = makePitch("C", 0, "C", 4, 60);
const E4 = makePitch("E", 0, "E", 4, 64);
const G4 = makePitch("G", 0, "G", 4, 67);
const Eb4 = makePitch("E", -1, "E♭", 4, 63);
const Bb4 = makePitch("B", -1, "B♭", 4, 70);
const D5 = makePitch("D", 0, "D", 5, 74);
const G2 = makePitch("G", 0, "G", 2, 43);
const G3 = makePitch("G", 0, "G", 3, 55);

const examples = [
  {
    name: "C major",
    left: [C2, C3],
    right: [C4, E4, G4],
    midis: [36, 48, 60, 64, 67],
    blackMidis: [],
  },
  {
    name: "Cm9",
    left: [C2, C3],
    right: [Eb4, G4, Bb4, D5],
    midis: [36, 48, 63, 67, 70, 74],
    blackMidis: [63, 70],
  },
  {
    name: "Cm9/G",
    left: [G2, G3],
    right: [C4, Eb4, Bb4, D5],
    midis: [43, 55, 60, 63, 70, 74],
    blackMidis: [63, 70],
  },
] as const;

describe("ChordPiano", () => {
  it.each(examples)("shows the exact pressed MIDI set and separate hands for $name without labels", ({ left, right, midis, blackMidis }) => {
    const { container } = render(<ChordPiano left={left} right={right} />);
    const pressed = Array.from(container.querySelectorAll<HTMLElement>(".chord-key.pressed"));
    expect(pressed.map((key) => Number(key.dataset.midi)).sort((a, b) => a - b)).toEqual([...midis].sort((a, b) => a - b));
    expect(pressed.filter((key) => key.dataset.hand === "left").map((key) => Number(key.dataset.midi)).sort((a, b) => a - b)).toEqual(left.map((pitch) => pitch.midi).sort((a, b) => a - b));
    expect(pressed.filter((key) => key.dataset.hand === "right").map((key) => Number(key.dataset.midi)).sort((a, b) => a - b)).toEqual(right.map((pitch) => pitch.midi).sort((a, b) => a - b));
    expect(container.querySelectorAll(".chord-key-label")).toHaveLength(0);
    expect(container.querySelector("[title]")).toBeNull();
    for (const key of pressed) expect(key.getAttribute("aria-label")).not.toMatch(/C[234]|E♭4|B♭4|D5|G[234]/);
    expect(screen.getByText("Tay trái · LH")).toBeTruthy();
    expect(screen.getByText("Tay phải · RH")).toBeTruthy();
    const blackPressed = Array.from(container.querySelectorAll<HTMLElement>(".chord-key.black.pressed"));
    expect(blackPressed.map((key) => Number(key.dataset.midi)).sort((a, b) => a - b)).toEqual([...blackMidis].sort((a, b) => a - b));
    for (const key of blackPressed) {
      expect(key.style.left).toMatch(/%$/);
      expect(key.style.width).toMatch(/%$/);
      expect(key.style.top).toBe("0px");
    }
    expect(container.querySelector(".chord-piano-scroll")?.getAttribute("style")).toContain("overflow-x: auto");
  });

  it("renders the pitches-only API as unassigned chord presses and reveals note labels only when requested", () => {
    const pitches = [C4, Eb4, G4];
    const hidden = render(<ChordPiano pitches={pitches} />);
    const hiddenPressed = hidden.container.querySelectorAll<HTMLElement>(".chord-key.pressed");
    expect(Array.from(hiddenPressed, (key) => key.dataset.hand)).toEqual(["unspecified", "unspecified", "unspecified"]);
    expect(hidden.container.querySelectorAll(".chord-key.pressed.both")).toHaveLength(3);
    expect(hidden.container.querySelector(".chord-piano-legend")).toBeNull();
    for (const key of hiddenPressed) expect(key.getAttribute("aria-label")).toBe("Phím đang được nhấn");
    expect(hidden.container.textContent).not.toContain("C4");
    expect(hidden.container.textContent).not.toContain("E♭4");
    expect(hidden.container.textContent).not.toContain("G4");
    hidden.unmount();

    const revealed = render(<ChordPiano pitches={pitches} showLabels />);
    expect(screen.getByText("C4")).toBeTruthy();
    expect(screen.getByText("E♭4")).toBeTruthy();
    expect(screen.getByText("G4")).toBeTruthy();
    expect(revealed.container.querySelectorAll(".chord-key-label")).toHaveLength(3);
  });

  it("filters to either hand and retains readable labels for the remaining hand", () => {
    const { container, rerender } = render(<ChordPiano left={[C2, C3]} right={[C4, E4, G4]} hand="left" />);
    expect(Array.from(container.querySelectorAll<HTMLElement>(".chord-key.pressed"), (key) => Number(key.dataset.midi))).toEqual([36, 48]);
    expect(container.querySelectorAll(".chord-key.right")).toHaveLength(0);
    expect(screen.getByText("Tay trái · LH")).toBeTruthy();
    expect(screen.queryByText("Tay phải · RH")).toBeNull();

    rerender(<ChordPiano left={[C2, C3]} right={[C4, E4, G4]} hand="right" />);
    expect(Array.from(container.querySelectorAll<HTMLElement>(".chord-key.pressed"), (key) => Number(key.dataset.midi))).toEqual([60, 64, 67]);
    expect(container.querySelectorAll(".chord-key.left")).toHaveLength(0);
    expect(screen.getByText("Tay phải · RH")).toBeTruthy();
  });
});

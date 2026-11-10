// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtualPiano } from "./VirtualPiano";
import { noteAtDiatonicPosition } from "../notation/musicTheory";

afterEach(cleanup);

describe("complete virtual piano keyboard", () => {
  it("has all 14 white and 10 black keys across two complete octaves", () => {
    render(<VirtualPiano target={noteAtDiatonicPosition("treble", 0)} disabled={false} lastAnswer={null} lastAnswerCorrect={null} onAnswer={() => undefined} />);
    expect(document.querySelectorAll(".piano-key-white")).toHaveLength(14);
    expect(document.querySelectorAll(".piano-key-black")).toHaveLength(10);
    expect(screen.getAllByRole("button", { name: /Phím La thăng/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Phím Mi thăng/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Phím Si thăng/ })).toBeNull();
  });

  it("sends the exact A-sharp pitch and octave through the existing answer path", async () => {
    const answer = vi.fn();
    render(<VirtualPiano target={noteAtDiatonicPosition("treble", 0)} disabled={false} lastAnswer={null} lastAnswerCorrect={null} onAnswer={answer} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Phím La thăng 3" }));
    expect(answer).toHaveBeenCalledWith({ letter: "A", octave: 3, accidental: "sharp", pitchValue: 58 });
  });
});

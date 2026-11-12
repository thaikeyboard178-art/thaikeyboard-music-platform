// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { sealTapAttempt } from "../exercises/tapCompletion";
import { matchTapRhythm } from "../exercises/tapMatcher";
import {
  createTapTargets,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
import { RHYTHM_NOTATION_EXAMPLES } from "../notation/examples";
import { TapResultNotation } from "./TapResultNotation";

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () =>
      ({
        measureText: (text: string) => ({ width: text.length * 7 }),
      }) as unknown as CanvasRenderingContext2D,
  });
});

afterEach(cleanup);

function exerciseFixture(): TapRhythmExercise {
  const pattern = RHYTHM_NOTATION_EXAMPLES[0].pattern;
  const targets = createTapTargets(pattern, 240);
  return Object.freeze({
    id: "result-notation-component-fixture",
    kind: "tap-rhythm",
    track: 4,
    section: "practice",
    pattern,
    gridTicks: 240,
    targets,
  });
}

function resultFixture(exercise: TapRhythmExercise) {
  const taps = Object.freeze([
    Object.freeze({
      sequence: 7,
      offsetMs: exercise.targets[0].offsetMs + 18.25,
    }),
  ]);
  const evaluation = matchTapRhythm(exercise.targets, taps);
  return sealTapAttempt({
    exerciseId: exercise.id,
    generation: 1,
    mode: "practice",
    status: "completed",
    reason: null,
    targetTicks: Object.freeze(exercise.targets.map(target => target.tick)),
    taps,
    evaluation,
    accuracyPercent: evaluation.accuracyPercent,
    rawCaptures: [],
  });
}

function setHostWidth(width: number) {
  const host = screen.getByTestId("tap-result-notation-host");
  Object.defineProperty(host, "clientWidth", {
    configurable: true,
    get: () => width,
  });
}

describe("TapResultNotation", () => {
  it("renders production notation and evaluation markers, exposes five statuses, and toggles only the overlay", () => {
    const exercise = exerciseFixture();
    const result = resultFixture(exercise);
    render(<TapResultNotation exercise={exercise} result={result} />);
    setHostWidth(390);
    act(() => window.dispatchEvent(new Event("resize")));

    const host = screen.getByTestId("tap-result-notation-host");
    const score = host.querySelector("svg[data-rhythm-pattern-id]");
    expect(score).not.toBeNull();
    expect(score?.querySelectorAll("[data-rhythm-segment-id]").length).toBe(
      exercise.pattern.measures.flatMap(measure => measure.segments).length
    );
    expect(score?.getAttribute("width")).toBe(
      score?.getAttribute("data-rhythm-natural-width")
    );
    expect(
      host.querySelector("svg[data-testid='tap-marker-layer']")
    ).not.toBeNull();
    expect(
      screen.getByTestId("tap-marker-legend").querySelectorAll("li")
    ).toHaveLength(5);
    expect(
      [...screen.getByTestId("tap-marker-legend").querySelectorAll("li")].map(
        item => item.getAttribute("data-status")
      )
    ).toEqual(["matched", "early", "late", "missing", "extra"]);

    const marker = screen
      .getAllByTestId("tap-marker")
      .find(item => item.getAttribute("data-sequence") === "7");
    expect(marker).toBeTruthy();
    expect(marker?.getAttribute("data-offset")).toBe("18.25");
    expect(marker?.getAttribute("data-status")).toBe("matched");
    expect(marker?.getAttribute("data-error-ms")).toBe("18.25");
    expect(marker?.textContent).toContain("t +18.25 ms");
    expect(marker?.textContent).toContain("Δ +18.25 ms");
    expect(marker?.querySelector("text")?.textContent).toBe("+18 ms");

    const toggle = screen.getByRole("checkbox", {
      name: /marker vị trí tap/i,
    }) as HTMLInputElement;
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(
      host
        .querySelector('[data-testid="tap-markers"]')
        ?.getAttribute("visibility")
    ).toBe("hidden");
    expect(host.querySelector("svg[data-rhythm-pattern-id]")).toBe(score);

    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
    expect(
      host
        .querySelector('[data-testid="tap-markers"]')
        ?.getAttribute("visibility")
    ).toBe("visible");
  });
});

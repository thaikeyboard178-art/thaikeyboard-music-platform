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

function resultWithAllMarkerStatuses(exercise: TapRhythmExercise) {
  const [first, second, third] = exercise.targets;
  const last = exercise.targets[exercise.targets.length - 1];
  if (!first || !second || !third || !last) {
    throw new Error("Fixture needs at least three targets");
  }
  const taps = Object.freeze([
    Object.freeze({
      sequence: 0,
      offsetMs: first.offsetMs - first.passMs - 1,
    }),
    Object.freeze({ sequence: 1, offsetMs: second.offsetMs }),
    Object.freeze({
      sequence: 2,
      offsetMs: third.offsetMs + third.passMs + 1,
    }),
    Object.freeze({ sequence: 3, offsetMs: last.offsetMs + 2000 }),
  ]);
  const evaluation = matchTapRhythm(exercise.targets, taps);
  return sealTapAttempt({
    exerciseId: exercise.id,
    generation: 2,
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

function drawAtWidth(width = 390) {
  setHostWidth(width);
  act(() => window.dispatchEvent(new Event("resize")));
}

describe("TapResultNotation", () => {
  it("renders notation with a compact two-state legend and toggles only the marker overlay", () => {
    const exercise = exerciseFixture();
    const result = resultFixture(exercise);
    render(<TapResultNotation exercise={exercise} result={result} />);
    drawAtWidth();

    const host = screen.getByTestId("tap-result-notation-host");
    const score = host.querySelector("svg[data-rhythm-pattern-id]");
    expect(score).not.toBeNull();
    expect(score?.querySelectorAll("[data-rhythm-segment-id]").length).toBe(
      exercise.pattern.measures.flatMap(measure => measure.segments).length
    );
    expect(score?.getAttribute("width")).toBe(
      score?.getAttribute("data-rhythm-natural-width")
    );
    const overlay = host.querySelector<SVGSVGElement>(
      "svg[data-testid='tap-marker-layer']"
    );
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("role")).toBe("group");
    expect(overlay?.querySelectorAll("text")).toHaveLength(0);

    const legend = screen.getByTestId("tap-marker-legend");
    expect(legend.querySelectorAll("li")).toHaveLength(2);
    expect(
      [...legend.querySelectorAll("li")].map(item =>
        item.getAttribute("data-state")
      )
    ).toEqual(["matched", "misaligned"]);
    expect(legend.textContent).toContain("Khớp");
    expect(legend.textContent).toContain("Lệch");
    expect(screen.getByText("Vòng tròn viền đỏ: chưa chạm.")).toBeTruthy();

    const marker = screen
      .getAllByTestId("tap-marker")
      .find(item => item.getAttribute("data-sequence") === "7");
    expect(marker).toBeTruthy();
    expect(marker?.getAttribute("data-offset")).toBe("18.25");
    expect(marker?.getAttribute("data-status")).toBe("matched");
    expect(marker?.getAttribute("data-error-ms")).toBe("18.25");
    expect(marker?.getAttribute("aria-label")).toContain("t +18.25 ms");
    expect(
      screen.getByRole("img", { name: "Khớp, t +18.25 ms, Δ +18.25 ms" })
    ).toBe(marker);
    expect(marker?.querySelector("title")?.textContent).toContain(
      "Δ +18.25 ms"
    );
    expect(marker?.querySelectorAll("text")).toHaveLength(0);
    expect(marker?.querySelector("circle")?.getAttribute("fill")).toBe(
      "#23835a"
    );
    expect(marker?.querySelector("circle")?.getAttribute("cx")).toBe(
      marker?.getAttribute("data-x")
    );
    expect(marker?.querySelector("circle")?.getAttribute("cy")).toBe(
      marker?.getAttribute("data-y")
    );

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
    expect(
      screen.queryByRole("img", { name: "Khớp, t +18.25 ms, Δ +18.25 ms" })
    ).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
    expect(
      host
        .querySelector('[data-testid="tap-markers"]')
        ?.getAttribute("visibility")
    ).toBe("visible");
  });

  it("uses only colored circles, with a hollow red circle for missing onsets", () => {
    const exercise = exerciseFixture();
    const result = resultWithAllMarkerStatuses(exercise);
    render(<TapResultNotation exercise={exercise} result={result} />);
    drawAtWidth();

    const host = screen.getByTestId("tap-result-notation-host");
    const overlay = host.querySelector<SVGSVGElement>(
      "svg[data-testid='tap-marker-layer']"
    );
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelectorAll("text")).toHaveLength(0);

    const markers = [...screen.getAllByTestId("tap-marker")];
    expect(
      new Set(markers.map(marker => marker.getAttribute("data-status")))
    ).toEqual(new Set(["matched", "early", "late", "missing", "extra"]));
    for (const marker of markers) {
      const circles = marker.querySelectorAll("circle");
      expect(circles).toHaveLength(1);
      expect(marker.querySelectorAll("text")).toHaveLength(0);
      expect(marker.querySelector("path, rect, polygon, line")).toBeNull();
      expect(circles[0].getAttribute("cx")).toBe(marker.getAttribute("data-x"));
      expect(circles[0].getAttribute("cy")).toBe(marker.getAttribute("data-y"));
    }

    const markerFor = (status: string) =>
      markers.find(marker => marker.getAttribute("data-status") === status);
    expect(
      markerFor("matched")?.querySelector("circle")?.getAttribute("fill")
    ).toBe("#23835a");
    for (const status of ["early", "late", "extra"]) {
      const circle = markerFor(status)?.querySelector("circle");
      expect(circle?.getAttribute("fill")).toBe("#c94b45");
      expect(circle?.hasAttribute("stroke")).toBe(false);
    }
    const missingCircle = markerFor("missing")?.querySelector("circle");
    expect(missingCircle?.getAttribute("fill")).toBe("none");
    expect(missingCircle?.getAttribute("stroke")).toBe("#c94b45");
  });
});

// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RhythmStepProgress } from "./RhythmStepProgress";

afterEach(cleanup);

describe("RhythmStepProgress", () => {
  it.each([
    ["setup", ["current", "waiting", "waiting"]],
    ["practice", ["completed", "current", "waiting"]],
    ["result", ["completed", "completed", "current"]],
  ] as const)("reflects the actual %s screen", (current, states) => {
    render(<RhythmStepProgress current={current} />);

    const progress = screen.getByTestId("rhythm-step-progress");
    const steps = screen.getAllByTestId("rhythm-step");
    expect(progress.getAttribute("data-current-step")).toBe(current);
    expect(steps.map(step => step.getAttribute("data-step"))).toEqual([
      "setup",
      "practice",
      "result",
    ]);
    expect(steps.map(step => step.getAttribute("data-state"))).toEqual(states);
    expect(
      steps.filter(step => step.getAttribute("aria-current") === "step")
    ).toHaveLength(1);
    expect(
      steps
        .find(step => step.getAttribute("data-step") === current)
        ?.getAttribute("aria-current")
    ).toBe("step");
    expect(steps.map(step => step.textContent)).toEqual([
      "Thiết lập",
      "Thực hành",
      "Kết quả",
    ]);
  });
});

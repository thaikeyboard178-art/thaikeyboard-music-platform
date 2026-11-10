// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ResultSummary } from "./ResultSummary";
import type { TrainingResult } from "./types";

function result(overrides: Partial<TrainingResult> = {}): TrainingResult {
  return {
    sessionId: "generic-session",
    moduleId: "rhythm-training",
    mode: "free",
    totalQuestions: 7,
    correctAnswers: 5,
    incorrectAnswers: 2,
    accuracy: 71,
    totalScore: 50,
    averageResponseTimeMs: 456,
    startedAt: 10,
    completedAt: 20,
    ...overrides,
  };
}

afterEach(cleanup);

describe("ResultSummary", () => {
  it("renders a non-note result with the exact score and five legacy stats", () => {
    const { container } = render(<ResultSummary result={result()} />);
    expect(container.firstElementChild?.className).toBe("result-score");
    expect(container.querySelector(".result-score")?.textContent).toBe("71%độ chính xác");
    expect(container.querySelector(".result-stats")?.children).toHaveLength(5);
    expect([...container.querySelectorAll(".result-stats > div")].map((item) => item.textContent)).toEqual([
      "7Tổng số câu",
      "5Trả lời đúng",
      "2Cần luyện thêm",
      "50Điểm tích lũy",
      "0.5sThời gian trung bình",
    ]);
  });

  it("uses Math.round(milliseconds / 100) / 10 for seconds", () => {
    const { container } = render(<ResultSummary result={result({ averageResponseTimeMs: 445 })} />);
    expect(container.querySelector(".result-stats > div:last-child")?.textContent).toBe("0.4sThời gian trung bình");
  });

  it("renders zero values without adding title, actions, or section assumptions", () => {
    const { container } = render(<ResultSummary result={result({ totalQuestions: 0, correctAnswers: 0, incorrectAnswers: 0, accuracy: 0, totalScore: 0, averageResponseTimeMs: 0 })} />);
    expect(container.children).toHaveLength(2);
    expect(container.querySelector(".result-score strong")?.textContent).toBe("0%");
    expect(container.querySelector(".result-stats")?.textContent).toContain("0s");
    expect(container.querySelector("section, h1, h2, button")).toBeNull();
  });
});

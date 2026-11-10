// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROGRESS_KEY, readPracticeProgress, recordCompletedResult, type PracticeProgress } from "./progress";
import type { TrainingResult } from "./types";

function result(overrides: Partial<TrainingResult> = {}): TrainingResult {
  return {
    sessionId: "session-1",
    moduleId: "generic-module",
    mode: "challenge",
    totalQuestions: 5,
    correctAnswers: 3,
    incorrectAnswers: 2,
    accuracy: 60,
    totalScore: 30,
    averageResponseTimeMs: 425,
    startedAt: 1,
    completedAt: 2,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("training progress storage", () => {
  it("reads empty defaults and records a completed generic result", () => {
    expect(readPracticeProgress()).toEqual({ sessionsCompleted: 0, questionsAnswered: 0, correctAnswers: 0 });
    expect(recordCompletedResult(result())).toBe(true);
    expect(readPracticeProgress()).toEqual({
      sessionsCompleted: 1,
      questionsAnswered: 5,
      correctAnswers: 3,
      lastSessionId: "session-1",
    });
    expect(localStorage.getItem(PROGRESS_KEY)).toContain('"lastSessionId":"session-1"');
  });

  it("does not record the same completed session twice", () => {
    expect(recordCompletedResult(result())).toBe(true);
    expect(recordCompletedResult(result())).toBe(false);
    expect(readPracticeProgress()).toMatchObject({ sessionsCompleted: 1, questionsAnswered: 5, correctAnswers: 3 });
  });

  it("preserves valid legacy v1 fields and clamps correct answers", () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      sessionsCompleted: 4,
      questionsAnswered: 8,
      correctAnswers: 12,
      lastSessionId: "legacy-session",
    }));
    expect(readPracticeProgress()).toEqual({
      sessionsCompleted: 4,
      questionsAnswered: 8,
      correctAnswers: 8,
      lastSessionId: "legacy-session",
    });
  });

  it("normalizes corrupt JSON, roots, and counter values", () => {
    const cases: unknown[] = ["not json", null, [], {
      sessionsCompleted: Number.NaN,
      questionsAnswered: Number.POSITIVE_INFINITY,
      correctAnswers: -1,
      lastSessionId: 12,
    }];

    for (const value of cases) {
      localStorage.setItem(PROGRESS_KEY, typeof value === "string" ? value : JSON.stringify(value));
      expect(readPracticeProgress()).toEqual({ sessionsCompleted: 0, questionsAnswered: 0, correctAnswers: 0 });
    }

    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ sessionsCompleted: 1.5, questionsAnswered: -2, correctAnswers: 2 }));
    expect(readPracticeProgress()).toEqual({ sessionsCompleted: 0, questionsAnswered: 0, correctAnswers: 0 });
  });

  it("repairs corrupt stored data when a valid new result is recorded", () => {
    localStorage.setItem(PROGRESS_KEY, "{broken");
    expect(recordCompletedResult(result({ sessionId: "repair-session", totalQuestions: 2, correctAnswers: 1, incorrectAnswers: 1 }))).toBe(true);
    expect(readPracticeProgress()).toEqual({
      sessionsCompleted: 1,
      questionsAnswered: 2,
      correctAnswers: 1,
      lastSessionId: "repair-session",
    });
  });

  it("returns safe defaults and false when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readPracticeProgress()).toEqual({ sessionsCompleted: 0, questionsAnswered: 0, correctAnswers: 0 });
    expect(recordCompletedResult(result())).toBe(false);
  });

  it("rejects invalid result ids and counts without writing", () => {
    const invalidResults: TrainingResult[] = [
      result({ sessionId: "" }),
      result({ totalQuestions: -1 }),
      result({ totalQuestions: 1.5 }),
      result({ correctAnswers: Number.NaN }),
      result({ correctAnswers: 6 }),
      result({ incorrectAnswers: Number.POSITIVE_INFINITY }),
      result({ correctAnswers: 4, incorrectAnswers: 3 }),
      result({ totalQuestions: Number.MAX_SAFE_INTEGER + 1 }),
    ];

    for (const invalid of invalidResults) expect(recordCompletedResult(invalid)).toBe(false);
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it("does not overflow valid stored totals into unsafe values", () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ sessionsCompleted: 1, questionsAnswered: Number.MAX_SAFE_INTEGER, correctAnswers: 0 }));
    const before = localStorage.getItem(PROGRESS_KEY);
    expect(recordCompletedResult(result())).toBe(false);
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(before);
  });

  it("keeps the scalar progress shape", () => {
    const progress: PracticeProgress = readPracticeProgress();
    expect(Object.keys(progress)).toEqual(["sessionsCompleted", "questionsAnswered", "correctAnswers"]);
  });
});

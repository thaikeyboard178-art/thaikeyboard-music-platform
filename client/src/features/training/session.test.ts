import { describe, expect, it } from "vitest";
import { advanceSession, createTrainingSession, finishSession, submitSessionAnswer, toTrainingResult } from "./session";

describe("shared training session", () => {
  it("adds ten points for correct answers and never subtracts for incorrect answers", () => {
    const first = createTrainingSession({ moduleId: "notes", mode: "free", clefConfiguration: "treble", noteRange: "staff", plannedQuestions: null, sessionId: "s1", startedAt: 10 }, { id: "q1" });
    const right = submitSessionAnswer(first, true, 500, 10, 1000);
    expect(right.totalScore).toBe(10);
    const next = advanceSession(right, { id: "q2" });
    const wrong = submitSessionAnswer(next, false, 700, 10, 2000);
    expect(wrong.totalScore).toBe(10);
    expect(wrong.correctAnswers).toBe(1);
    expect(wrong.incorrectAnswers).toBe(1);
    expect(wrong.accuracy).toBe(50);
    expect(wrong.averageResponseTimeMs).toBe(600);
  });

  it("prevents duplicate scoring and completes exactly at the configured question count", () => {
    const start = createTrainingSession({ moduleId: "notes", mode: "challenge", clefConfiguration: "bass", noteRange: "extended", plannedQuestions: 2, sessionId: "s2", startedAt: 5 }, { id: "q1" });
    const first = submitSessionAnswer(start, true, 400, 10, 100);
    expect(submitSessionAnswer(first, true, 400, 10, 200)).toBe(first);
    const second = submitSessionAnswer(advanceSession(first, { id: "q2" }), false, 600, 10, 300);
    expect(second.completedAt).toBe(300);
    expect(second.questionsAnswered).toBe(2);
    expect(second.totalScore).toBe(10);
    expect(toTrainingResult(second)).toMatchObject({ totalQuestions: 2, correctAnswers: 1, incorrectAnswers: 1, accuracy: 50, averageResponseTimeMs: 500, totalScore: 10 });
    expect(finishSession(second, 400)).toBe(second);
  });

  it("does not count unanswered questions in accuracy and allows manual speed-session finish", () => {
    const session = createTrainingSession({ moduleId: "notes", mode: "speed", clefConfiguration: "mixed", noteRange: "staff", plannedQuestions: null, sessionId: "s3", startedAt: 1 }, { id: "q1" });
    expect(session.accuracy).toBe(0);
    expect(toTrainingResult(session)).toBeNull();
    const answered = submitSessionAnswer(session, true, 250, 10, 2);
    const finished = finishSession(answered, 3);
    expect(finished.completedAt).toBe(3);
    expect(toTrainingResult(finished)?.accuracy).toBe(100);
  });
});

describe("QA scoring regressions", () => {
  it.each(["challenge", "daily"] as const)("does not complete a %s session early", (mode) => {
    const start = createTrainingSession({ moduleId: "notes", mode, clefConfiguration: "treble", noteRange: "staff", plannedQuestions: 10 }, { id: "q1" });
    const first = submitSessionAnswer(start, true, 200);
    expect(finishSession(first)).toBe(first);
    expect(toTrainingResult(first)).toBeNull();
  });

  it("honors configured score and rejects negative or non-finite score overrides", () => {
    const start = createTrainingSession({ moduleId: "notes", mode: "free", clefConfiguration: "bass", noteRange: "staff", plannedQuestions: null, pointsPerCorrect: 20 }, { id: "q1" });
    expect(submitSessionAnswer(start, true, 200).totalScore).toBe(20);
    for (const invalid of [-10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(submitSessionAnswer(start, true, 200, invalid).totalScore).toBe(20);
    }
    const invalidConfig = createTrainingSession({ moduleId: "notes", mode: "free", clefConfiguration: "bass", noteRange: "staff", plannedQuestions: null, pointsPerCorrect: -10 }, { id: "q1" });
    expect(submitSessionAnswer(invalidConfig, true, 200).totalScore).toBe(10);
  });
});

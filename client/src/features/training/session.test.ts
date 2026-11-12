import { describe, expect, it } from "vitest";
import {
  advanceSession,
  advanceSessionWithoutAnswer,
  applySessionPenalty,
  createTrainingSession,
  finishSession,
  submitSessionAnswer,
  submitSessionAnswerWithAward,
  toTrainingResult,
} from "./session";

describe("shared training session", () => {
  it("adds ten points for correct answers and never subtracts for incorrect answers", () => {
    const first = createTrainingSession(
      {
        moduleId: "notes",
        mode: "free",
        plannedQuestions: null,
        sessionId: "s1",
        startedAt: 10,
      },
      { id: "q1" }
    );
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
    const start = createTrainingSession(
      {
        moduleId: "notes",
        mode: "challenge",
        plannedQuestions: 2,
        sessionId: "s2",
        startedAt: 5,
      },
      { id: "q1" }
    );
    const first = submitSessionAnswer(start, true, 400, 10, 100);
    expect(submitSessionAnswer(first, true, 400, 10, 200)).toBe(first);
    const second = submitSessionAnswer(
      advanceSession(first, { id: "q2" }),
      false,
      600,
      10,
      300
    );
    expect(second.completedAt).toBe(300);
    expect(second.questionsAnswered).toBe(2);
    expect(second.totalScore).toBe(10);
    expect(toTrainingResult(second)).toMatchObject({
      totalQuestions: 2,
      correctAnswers: 1,
      incorrectAnswers: 1,
      accuracy: 50,
      averageResponseTimeMs: 500,
      totalScore: 10,
    });
    expect(finishSession(second, 400)).toBe(second);
  });

  it("does not count unanswered questions in accuracy and allows manual speed-session finish", () => {
    const session = createTrainingSession(
      {
        moduleId: "notes",
        mode: "speed",
        plannedQuestions: null,
        sessionId: "s3",
        startedAt: 1,
      },
      { id: "q1" }
    );
    expect(session.accuracy).toBe(0);
    expect(toTrainingResult(session)).toBeNull();
    const answered = submitSessionAnswer(session, true, 250, 10, 2);
    const finished = finishSession(answered, 3);
    expect(finished.completedAt).toBe(3);
    expect(toTrainingResult(finished)?.accuracy).toBe(100);
  });

  it("accepts non-note exercise data without clef or range fields", () => {
    const config = {
      moduleId: "generic-fixture",
      mode: "challenge" as const,
      plannedQuestions: 2,
      sessionId: "generic-session",
    };
    const session = createTrainingSession(config, {
      id: "one",
      data: { expectedValue: 42 },
    });
    expect("clefConfiguration" in session).toBe(false);
    expect("noteRange" in session).toBe(false);
    const correct = submitSessionAnswer(session, true, 100);
    expect(submitSessionAnswer(correct, false, 100)).toBe(correct);
    const final = submitSessionAnswer(
      advanceSession(correct, { id: "two", data: { expectedValue: 8 } }),
      false,
      200
    );
    expect(final.totalScore).toBe(10);
    expect(toTrainingResult(final)?.moduleId).toBe("generic-fixture");
    expect(toTrainingResult(final)?.totalQuestions).toBe(2);
  });
});

describe("QA scoring regressions", () => {
  it.each(["challenge", "daily"] as const)(
    "does not complete a %s session early",
    mode => {
      const start = createTrainingSession(
        { moduleId: "notes", mode, plannedQuestions: 10 },
        { id: "q1" }
      );
      const first = submitSessionAnswer(start, true, 200);
      expect(finishSession(first)).toBe(first);
      expect(toTrainingResult(first)).toBeNull();
    }
  );

  it("honors configured score and rejects negative or non-finite score overrides", () => {
    const start = createTrainingSession(
      {
        moduleId: "notes",
        mode: "free",
        plannedQuestions: null,
        pointsPerCorrect: 20,
      },
      { id: "q1" }
    );
    expect(submitSessionAnswer(start, true, 200).totalScore).toBe(20);
    for (const invalid of [-10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(submitSessionAnswer(start, true, 200, invalid).totalScore).toBe(
        20
      );
    }
    const invalidConfig = createTrainingSession(
      {
        moduleId: "notes",
        mode: "free",
        plannedQuestions: null,
        pointsPerCorrect: -10,
      },
      { id: "q1" }
    );
    expect(submitSessionAnswer(invalidConfig, true, 200).totalScore).toBe(10);
  });

  it("applies an explicit integer award independently of answer correctness", () => {
    const start = createTrainingSession(
      {
        moduleId: "rhythm-training",
        mode: "free",
        plannedQuestions: null,
        sessionId: "award-session",
      },
      { id: "q1" }
    );
    const incorrectWithAward = submitSessionAnswerWithAward(
      start,
      false,
      7,
      125,
      20
    );

    expect(incorrectWithAward.totalScore).toBe(7);
    expect(incorrectWithAward.questionsAnswered).toBe(1);
    expect(incorrectWithAward.correctAnswers).toBe(0);
    expect(incorrectWithAward.incorrectAnswers).toBe(1);
    expect(incorrectWithAward.accuracy).toBe(0);
    expect(incorrectWithAward.averageResponseTimeMs).toBe(125);
    expect(incorrectWithAward.completedAt).toBeNull();
    expect(
      submitSessionAnswerWithAward(incorrectWithAward, true, 10, 100, 30)
    ).toBe(incorrectWithAward);
  });

  it.each([
    [20, 15],
    [5, 0],
    [2, 0],
    [0, 0],
  ])(
    "applies a score-only penalty from %i to %i without recording an answer",
    (score, expectedScore) => {
      const start = createTrainingSession(
        {
          moduleId: "rhythm-training",
          mode: "free",
          plannedQuestions: null,
          sessionId: `penalty-${score}`,
        },
        { id: "q1" }
      );
      const session = { ...start, totalScore: score };
      const penalized = applySessionPenalty(session, 5);

      expect(penalized.totalScore).toBe(expectedScore);
      expect(penalized.questionsAnswered).toBe(0);
      expect(penalized.correctAnswers).toBe(0);
      expect(penalized.incorrectAnswers).toBe(0);
      expect(penalized.accuracy).toBe(0);
      expect(penalized.responseTimeTotalMs).toBe(0);
      expect(penalized.averageResponseTimeMs).toBe(0);
      expect(penalized.hasAnsweredCurrent).toBe(false);
      expect(penalized.lastAnswerCorrect).toBeNull();
    }
  );

  it("does not penalize an answered or completed current exercise", () => {
    const start = createTrainingSession(
      {
        moduleId: "rhythm-training",
        mode: "challenge",
        plannedQuestions: 1,
        sessionId: "penalty-guard",
      },
      { id: "q1" }
    );
    const answered = submitSessionAnswer(start, true, 100, 10, 2);
    expect(applySessionPenalty(answered, 5)).toBe(answered);
    expect(applySessionPenalty({ ...start, completedAt: 3 }, 5)).toEqual({
      ...start,
      completedAt: 3,
    });
  });

  it("advances an unanswered exercise without changing answer statistics or session identity", () => {
    const start = createTrainingSession(
      {
        moduleId: "rhythm-training",
        mode: "free",
        plannedQuestions: null,
        sessionId: "skip-advance",
      },
      { id: "q1" }
    );
    const firstAnswer = submitSessionAnswer(start, true, 150, 10, 2);
    const unanswered = advanceSession(firstAnswer, { id: "q2" });
    const next = advanceSessionWithoutAnswer(unanswered, { id: "q3" });

    expect(next.currentExercise).toEqual({ id: "q3" });
    expect(next.sessionId).toBe("skip-advance");
    expect(next.questionsAnswered).toBe(1);
    expect(next.correctAnswers).toBe(1);
    expect(next.incorrectAnswers).toBe(0);
    expect(next.accuracy).toBe(100);
    expect(next.totalScore).toBe(10);
    expect(next.hasAnsweredCurrent).toBe(false);
    expect(next.lastAnswerCorrect).toBeNull();
    expect(advanceSessionWithoutAnswer(firstAnswer, { id: "blocked" })).toBe(
      firstAnswer
    );
  });
});

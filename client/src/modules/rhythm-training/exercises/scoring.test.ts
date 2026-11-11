import { describe, expect, it } from "vitest";
import { generateCountBeatExercise } from "./countBeat";
import { generateMultipleChoiceExercise } from "./multipleChoice";
import {
  createRhythmTrainingSession,
  submitRhythmExerciseAnswer,
} from "./scoring";

function makeChoiceExercise(seed = "score-choice") {
  return generateMultipleChoiceExercise({
    track: 1,
    seed,
    focus: "duration",
  });
}

describe("Rhythm Training shared scoring adapter", () => {
  it("awards exactly +10 for a correct canonical Multiple Choice answer", () => {
    const exercise = makeChoiceExercise();
    const session = createRhythmTrainingSession(
      { mode: "challenge", plannedQuestions: 2, sessionId: "score-correct" },
      exercise
    );
    const result = submitRhythmExerciseAnswer(session, exercise, {
      type: "answer",
      answer: { canonicalIdentity: exercise.correctCanonicalIdentity },
      responseTimeMs: 500,
    });
    expect(result.status).toBe("graded");
    expect(result.correct).toBe(true);
    expect(result.scoreDelta).toBe(10);
    expect(result.session.totalScore).toBe(10);
    expect(result.session.questionsAnswered).toBe(1);
    expect(result.session.correctAnswers).toBe(1);
    expect(result.session.incorrectAnswers).toBe(0);
    expect(result.session.hasAnsweredCurrent).toBe(true);
  });

  it("awards +0 for an incorrect answer and never subtracts points", () => {
    const exercise = makeChoiceExercise("score-wrong");
    const wrong = exercise.options.find(
      option => option.canonicalIdentity !== exercise.correctCanonicalIdentity
    )!;
    const session = createRhythmTrainingSession(
      { mode: "free", plannedQuestions: null, sessionId: "score-wrong" },
      exercise
    );
    const result = submitRhythmExerciseAnswer(session, exercise, {
      type: "answer",
      answer: { canonicalIdentity: wrong.canonicalIdentity },
      responseTimeMs: 800,
    });
    expect(result.status).toBe("graded");
    expect(result.correct).toBe(false);
    expect(result.scoreDelta).toBe(0);
    expect(result.session.totalScore).toBe(0);
    expect(result.session.questionsAnswered).toBe(1);
    expect(result.session.incorrectAnswers).toBe(1);
  });

  it("awards Count the Beat through the same shared scoring contract", () => {
    const exercise = generateCountBeatExercise({
      track: 3,
      seed: "score-countbeat",
      meter: { numerator: 3, denominator: 4 },
      focus: "pulse-positions",
    });
    const selectedTicks = exercise.positions
      .filter(position => position.isPulseStart)
      .map(position => position.tick);
    const session = createRhythmTrainingSession(
      { mode: "free", plannedQuestions: null, sessionId: "score-countbeat" },
      exercise
    );
    const result = submitRhythmExerciseAnswer(session, exercise, {
      type: "answer",
      answer: { selectedTicks },
      responseTimeMs: 1200,
    });
    expect(result.status).toBe("graded");
    expect(result.correct).toBe(true);
    expect(result.scoreDelta).toBe(10);
    expect(result.session.totalScore).toBe(10);
    expect(result.session.questionsAnswered).toBe(1);
  });

  it("does not grade technical aborts as learner answers", () => {
    const exercise = makeChoiceExercise("score-abort");
    const session = createRhythmTrainingSession(
      { mode: "challenge", plannedQuestions: 1, sessionId: "score-abort" },
      exercise
    );
    const result = submitRhythmExerciseAnswer(session, exercise, {
      type: "technical-abort",
    });
    expect(result.status).toBe("technical-abort");
    expect(result.scoreDelta).toBe(0);
    expect(result.session).toBe(session);
    expect(result.session.questionsAnswered).toBe(0);
    expect(result.session.incorrectAnswers).toBe(0);
    expect(result.session.totalScore).toBe(0);
    expect(result.session.completedAt).toBeNull();
  });

  it("blocks duplicate retries/replays and stale exercise submissions from creating score or answers", () => {
    const exercise = makeChoiceExercise("score-replay");
    const session = createRhythmTrainingSession(
      { mode: "challenge", plannedQuestions: 3, sessionId: "score-replay" },
      exercise
    );
    const first = submitRhythmExerciseAnswer(session, exercise, {
      type: "answer",
      answer: { canonicalIdentity: exercise.correctCanonicalIdentity },
      responseTimeMs: 400,
    });
    const retry = submitRhythmExerciseAnswer(first.session, exercise, {
      type: "answer",
      answer: { canonicalIdentity: exercise.correctCanonicalIdentity },
      responseTimeMs: 400,
    });
    expect(retry.status).toBe("duplicate");
    expect(retry.session.totalScore).toBe(10);
    expect(retry.session.questionsAnswered).toBe(1);

    const staleExercise = { ...exercise, id: `${exercise.id}-stale` };
    const stale = submitRhythmExerciseAnswer(session, staleExercise, {
      type: "answer",
      answer: { canonicalIdentity: exercise.correctCanonicalIdentity },
      responseTimeMs: 400,
    });
    expect(stale.status).toBe("stale-exercise");
    expect(stale.scoreDelta).toBe(0);
    expect(stale.session.questionsAnswered).toBe(0);
    expect(stale.session.totalScore).toBe(0);
  });
});

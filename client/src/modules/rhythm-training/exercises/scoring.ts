import {
  createTrainingSession,
  submitSessionAnswer,
  type SessionConfiguration,
  type TrainingSession,
} from "@/features/training/session";
import {
  evaluateCountBeatAnswer,
  type CountBeatExercise,
} from "./countBeat";
import {
  evaluateMultipleChoice,
  type MultipleChoiceExercise,
} from "./multipleChoice";

export type RhythmGradedExercise =
  | MultipleChoiceExercise
  | CountBeatExercise;
export type RhythmTrainingSession = TrainingSession<RhythmGradedExercise>;

export type RhythmSubmissionResult = Readonly<{
  status: "graded" | "technical-abort" | "duplicate" | "stale-exercise";
  session: RhythmTrainingSession;
  correct?: boolean;
  scoreDelta: number;
}>;

export function createRhythmTrainingSession(
  configuration: Omit<SessionConfiguration, "moduleId" | "pointsPerCorrect">,
  exercise: RhythmGradedExercise
): RhythmTrainingSession {
  return createTrainingSession(
    {
      ...configuration,
      moduleId: "rhythm-training",
      pointsPerCorrect: 10,
    },
    exercise
  );
}

/**
 * Technical failures never become learner answers. Grading is delegated to the
 * shared session contract, whose answered-current guard prevents double score
 * submission and whose incorrect-answer delta is always zero.
 */
export function submitRhythmExerciseAnswer(
  session: RhythmTrainingSession,
  exercise: RhythmGradedExercise,
  submission:
    | Readonly<{ type: "answer"; answer: unknown; responseTimeMs: number }>
    | Readonly<{ type: "technical-abort" }>,
  completedAt = Date.now()
): RhythmSubmissionResult {
  if (session.currentExercise.id !== exercise.id) {
    return Object.freeze({
      status: "stale-exercise",
      session,
      scoreDelta: 0,
    });
  }
  if (submission.type === "technical-abort") {
    return Object.freeze({
      status: "technical-abort",
      session,
      scoreDelta: 0,
    });
  }
  if (session.hasAnsweredCurrent || session.completedAt !== null) {
    return Object.freeze({ status: "duplicate", session, scoreDelta: 0 });
  }

  const evaluation =
    exercise.kind === "multiple-choice"
      ? evaluateMultipleChoice(exercise, submission.answer)
      : evaluateCountBeatAnswer(exercise, submission.answer);
  const next = submitSessionAnswer(
    session,
    evaluation.correct,
    submission.responseTimeMs,
    10,
    completedAt
  );
  return Object.freeze({
    status: "graded",
    session: next,
    correct: evaluation.correct,
    scoreDelta: next.totalScore - session.totalScore,
  });
}

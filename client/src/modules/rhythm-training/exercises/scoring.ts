import {
  createTrainingSession,
  submitSessionAnswer,
  type SessionConfiguration,
  type TrainingSession,
} from "@/features/training/session";
import { evaluateCountBeatAnswer, type CountBeatExercise } from "./countBeat";
import {
  evaluateMultipleChoice,
  type MultipleChoiceExercise,
} from "./multipleChoice";
import { evaluateTapRhythmAnswer, type TapRhythmExercise } from "./tapRhythm";
import { isRuntimeTapAttempt } from "./tapCompletion";

// Ephemeral completion guard; no persistence or changes to shared session state.
const submittedTapAttempts = new WeakSet<object>();
const answeredTapQuestions = new Set<string>();

function tapQuestionKey(
  session: RhythmTrainingSession,
  exercise: TapRhythmExercise
): string {
  return JSON.stringify([
    session.sessionId,
    session.questionsAnswered,
    exercise.id,
  ]);
}

export type RhythmGradedExercise =
  | MultipleChoiceExercise
  | CountBeatExercise
  | TapRhythmExercise;
export type RhythmTrainingSession = TrainingSession<RhythmGradedExercise>;

export type RhythmSubmissionResult = Readonly<{
  status:
    | "graded"
    | "technical-abort"
    | "practice"
    | "duplicate"
    | "stale-exercise";
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

  if (exercise.kind === "tap-rhythm") {
    const attempt = submission.answer;
    if (
      !isRuntimeTapAttempt(attempt) ||
      attempt.status === "technical-abort" ||
      attempt.accuracyPercent === null
    ) {
      return Object.freeze({
        status: "technical-abort",
        session,
        scoreDelta: 0,
      });
    }
    if (
      attempt.exerciseId !== exercise.id ||
      attempt.targetTicks.length !== exercise.targets.length ||
      attempt.targetTicks.some(
        (tick, index) => tick !== exercise.targets[index].tick
      )
    ) {
      return Object.freeze({
        status: "stale-exercise",
        session,
        scoreDelta: 0,
      });
    }
    if (attempt.mode === "practice") {
      return Object.freeze({ status: "practice", session, scoreDelta: 0 });
    }
    if (
      submittedTapAttempts.has(attempt) ||
      answeredTapQuestions.has(tapQuestionKey(session, exercise))
    ) {
      return Object.freeze({ status: "duplicate", session, scoreDelta: 0 });
    }
  }

  const evaluation =
    exercise.kind === "multiple-choice"
      ? evaluateMultipleChoice(exercise, submission.answer)
      : exercise.kind === "count-beat"
        ? evaluateCountBeatAnswer(exercise, submission.answer)
        : evaluateTapRhythmAnswer(exercise, submission.answer);
  if (evaluation === null) {
    return Object.freeze({ status: "technical-abort", session, scoreDelta: 0 });
  }
  const next = submitSessionAnswer(
    session,
    evaluation.correct,
    submission.responseTimeMs,
    10,
    completedAt
  );
  if (
    exercise.kind === "tap-rhythm" &&
    isRuntimeTapAttempt(submission.answer)
  ) {
    submittedTapAttempts.add(submission.answer);
    answeredTapQuestions.add(tapQuestionKey(session, exercise));
  }
  return Object.freeze({
    status: "graded",
    session: next,
    correct: evaluation.correct,
    scoreDelta: next.totalScore - session.totalScore,
  });
}

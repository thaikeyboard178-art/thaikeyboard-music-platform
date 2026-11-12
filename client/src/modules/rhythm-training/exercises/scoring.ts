import {
  advanceSession,
  advanceSessionWithoutAnswer,
  applySessionPenalty,
  createTrainingSession,
  submitSessionAnswer,
  submitSessionAnswerWithAward,
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
const skippedRhythmQuestions = new Set<string>();

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

export type RhythmSkipResult = Readonly<{
  status: "skipped" | "duplicate" | "stale-exercise";
  session: RhythmTrainingSession;
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

/** Advances after an answer, or passes an unanswered exercise without recording an answer. */
export function advanceRhythmSession(
  session: RhythmTrainingSession,
  nextExercise: RhythmGradedExercise
): RhythmTrainingSession {
  return session.hasAnsweredCurrent
    ? advanceSession(session, nextExercise)
    : advanceSessionWithoutAnswer(session, nextExercise);
}

/** Skips one current exercise, applying the graded-only five-point penalty once. */
export function skipRhythmExercise(
  session: RhythmTrainingSession,
  currentExercise: RhythmGradedExercise,
  nextExercise: RhythmGradedExercise,
  kind: "graded" | "practice",
  _completedAt = Date.now()
): RhythmSkipResult {
  const skipKey = JSON.stringify([
    session.sessionId,
    session.questionsAnswered,
    currentExercise.id,
  ]);
  if (
    skippedRhythmQuestions.has(skipKey) ||
    (currentExercise.kind === "tap-rhythm" && answeredTapQuestions.has(skipKey))
  ) {
    return Object.freeze({ status: "duplicate", session, scoreDelta: 0 });
  }
  if (
    session.currentExercise.id !== currentExercise.id ||
    nextExercise.id === currentExercise.id
  ) {
    return Object.freeze({ status: "stale-exercise", session, scoreDelta: 0 });
  }
  if (session.hasAnsweredCurrent || session.completedAt !== null) {
    return Object.freeze({ status: "duplicate", session, scoreDelta: 0 });
  }

  const penalizedSession =
    kind === "graded" ? applySessionPenalty(session, 5) : session;
  const nextSession = advanceSessionWithoutAnswer(
    penalizedSession,
    nextExercise
  );
  if (nextSession === session) {
    return Object.freeze({ status: "duplicate", session, scoreDelta: 0 });
  }
  skippedRhythmQuestions.add(skipKey);
  return Object.freeze({
    status: "skipped",
    session: nextSession,
    scoreDelta: nextSession.totalScore - session.totalScore,
  });
}

/**
 * Technical failures never become learner answers. Tap scoring uses its valid
 * runtime accuracy receipt for the shared award while strict correctness stays
 * delegated to the existing evaluator; other exercise kinds keep default scoring.
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
  if (
    session.hasAnsweredCurrent ||
    session.completedAt !== null ||
    skippedRhythmQuestions.has(
      JSON.stringify([
        session.sessionId,
        session.questionsAnswered,
        exercise.id,
      ])
    )
  ) {
    return Object.freeze({ status: "duplicate", session, scoreDelta: 0 });
  }

  if (exercise.kind === "tap-rhythm") {
    const attempt = submission.answer;
    if (
      !isRuntimeTapAttempt(attempt) ||
      attempt.status === "technical-abort" ||
      attempt.accuracyPercent === null ||
      !Number.isFinite(attempt.accuracyPercent) ||
      attempt.accuracyPercent < 0 ||
      attempt.accuracyPercent > 100
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
  const next =
    exercise.kind === "tap-rhythm" && isRuntimeTapAttempt(submission.answer)
      ? submitSessionAnswerWithAward(
          session,
          evaluation.correct,
          Math.floor(
            ((submission.answer.accuracyPercent ?? 0) * 10) / 100 + 0.5
          ),
          submission.responseTimeMs,
          completedAt
        )
      : submitSessionAnswer(
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

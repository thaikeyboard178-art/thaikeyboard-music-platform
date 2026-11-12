import type { ExerciseMode, TrainingResult } from "./types";

export type SessionConfiguration = {
  moduleId: string;
  mode: ExerciseMode;
  plannedQuestions: number | null;
  pointsPerCorrect?: number;
  sessionId?: string;
  startedAt?: number;
};

export type TrainingSession<TExercise> = {
  sessionId: string;
  moduleId: string;
  mode: ExerciseMode;
  plannedQuestions: number | null;
  pointsPerCorrect: number;
  questionsAnswered: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  totalScore: number;
  averageResponseTimeMs: number;
  responseTimeTotalMs: number;
  startedAt: number;
  completedAt: number | null;
  currentExercise: TExercise;
  hasAnsweredCurrent: boolean;
  lastAnswerCorrect: boolean | null;
};

export function createTrainingSession<TExercise>(
  configuration: SessionConfiguration,
  currentExercise: TExercise
): TrainingSession<TExercise> {
  return {
    sessionId:
      configuration.sessionId ??
      globalThis.crypto?.randomUUID?.() ??
      `session-${Date.now()}`,
    moduleId: configuration.moduleId,
    mode: configuration.mode,
    plannedQuestions: configuration.plannedQuestions,
    pointsPerCorrect:
      Number.isFinite(configuration.pointsPerCorrect) &&
      configuration.pointsPerCorrect! >= 0
        ? configuration.pointsPerCorrect!
        : 10,
    questionsAnswered: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracy: 0,
    totalScore: 0,
    averageResponseTimeMs: 0,
    responseTimeTotalMs: 0,
    startedAt: configuration.startedAt ?? Date.now(),
    completedAt: null,
    currentExercise,
    hasAnsweredCurrent: false,
    lastAnswerCorrect: null,
  };
}

export function submitSessionAnswer<TExercise>(
  session: TrainingSession<TExercise>,
  isCorrect: boolean,
  responseTimeMs: number,
  pointsPerCorrect = session.pointsPerCorrect,
  completedAt = Date.now()
): TrainingSession<TExercise> {
  const scoreAward = isCorrect
    ? Number.isFinite(pointsPerCorrect) && pointsPerCorrect >= 0
      ? pointsPerCorrect
      : session.pointsPerCorrect
    : 0;
  return recordSessionAnswer(
    session,
    isCorrect,
    scoreAward,
    responseTimeMs,
    completedAt
  );
}

/** Records an answer with an explicit nonnegative integer award, independent of correctness. */
export function submitSessionAnswerWithAward<TExercise>(
  session: TrainingSession<TExercise>,
  isCorrect: boolean,
  scoreAward: number,
  responseTimeMs: number,
  completedAt = Date.now()
): TrainingSession<TExercise> {
  const validAward =
    Number.isFinite(scoreAward) &&
    Number.isInteger(scoreAward) &&
    scoreAward >= 0
      ? scoreAward
      : 0;
  return recordSessionAnswer(
    session,
    isCorrect,
    validAward,
    responseTimeMs,
    completedAt
  );
}

function recordSessionAnswer<TExercise>(
  session: TrainingSession<TExercise>,
  isCorrect: boolean,
  scoreAward: number,
  responseTimeMs: number,
  completedAt: number
): TrainingSession<TExercise> {
  if (session.hasAnsweredCurrent || session.completedAt !== null)
    return session;

  const questionsAnswered = session.questionsAnswered + 1;
  const correctAnswers = session.correctAnswers + (isCorrect ? 1 : 0);
  const incorrectAnswers = session.incorrectAnswers + (isCorrect ? 0 : 1);
  const responseTimeTotalMs =
    session.responseTimeTotalMs + Math.max(0, responseTimeMs);
  const isComplete =
    session.plannedQuestions !== null &&
    questionsAnswered >= session.plannedQuestions;

  return {
    ...session,
    questionsAnswered,
    correctAnswers,
    incorrectAnswers,
    accuracy: Math.round((correctAnswers / questionsAnswered) * 100),
    totalScore: session.totalScore + scoreAward,
    averageResponseTimeMs: Math.round(responseTimeTotalMs / questionsAnswered),
    responseTimeTotalMs,
    completedAt: isComplete ? completedAt : null,
    hasAnsweredCurrent: true,
    lastAnswerCorrect: isCorrect,
  };
}

/** Applies a score-only penalty to the unanswered, incomplete current exercise. */
export function applySessionPenalty<TExercise>(
  session: TrainingSession<TExercise>,
  penaltyPoints: number
): TrainingSession<TExercise> {
  if (session.hasAnsweredCurrent || session.completedAt !== null)
    return session;
  const validPenalty =
    Number.isFinite(penaltyPoints) && penaltyPoints > 0 ? penaltyPoints : 0;
  if (validPenalty === 0) return session;
  return {
    ...session,
    totalScore: Math.max(0, session.totalScore - validPenalty),
  };
}

export function advanceSession<TExercise>(
  session: TrainingSession<TExercise>,
  nextExercise: TExercise
): TrainingSession<TExercise> {
  if (!session.hasAnsweredCurrent || session.completedAt !== null)
    return session;
  return {
    ...session,
    currentExercise: nextExercise,
    hasAnsweredCurrent: false,
    lastAnswerCorrect: null,
  };
}

/** Moves past an unanswered exercise without recording a synthetic answer. */
export function advanceSessionWithoutAnswer<TExercise>(
  session: TrainingSession<TExercise>,
  nextExercise: TExercise
): TrainingSession<TExercise> {
  if (session.hasAnsweredCurrent || session.completedAt !== null)
    return session;
  return {
    ...session,
    currentExercise: nextExercise,
    hasAnsweredCurrent: false,
    lastAnswerCorrect: null,
  };
}

export function finishSession<TExercise>(
  session: TrainingSession<TExercise>,
  completedAt = Date.now()
): TrainingSession<TExercise> {
  if (session.completedAt !== null || session.questionsAnswered === 0)
    return session;
  if (
    (session.mode === "challenge" || session.mode === "daily") &&
    session.plannedQuestions !== null &&
    session.questionsAnswered < session.plannedQuestions
  )
    return session;
  return { ...session, completedAt };
}

export function toTrainingResult<TExercise>(
  session: TrainingSession<TExercise>
): TrainingResult | null {
  if (session.completedAt === null) return null;
  return {
    sessionId: session.sessionId,
    moduleId: session.moduleId,
    mode: session.mode,
    totalQuestions: session.questionsAnswered,
    correctAnswers: session.correctAnswers,
    incorrectAnswers: session.incorrectAnswers,
    accuracy: session.accuracy,
    totalScore: session.totalScore,
    averageResponseTimeMs: session.averageResponseTimeMs,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

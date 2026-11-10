import type { ExerciseMode, TrainingResult } from "./types";

export type SessionConfiguration = {
  moduleId: string;
  mode: ExerciseMode;
  clefConfiguration: string;
  noteRange: string;
  plannedQuestions: number | null;
  pointsPerCorrect?: number;
  sessionId?: string;
  startedAt?: number;
};

export type TrainingSession<TExercise> = {
  sessionId: string;
  moduleId: string;
  mode: ExerciseMode;
  clefConfiguration: string;
  noteRange: string;
  plannedQuestions: number | null;
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
  currentExercise: TExercise,
): TrainingSession<TExercise> {
  return {
    sessionId: configuration.sessionId ?? globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`,
    moduleId: configuration.moduleId,
    mode: configuration.mode,
    clefConfiguration: configuration.clefConfiguration,
    noteRange: configuration.noteRange,
    plannedQuestions: configuration.plannedQuestions,
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
  pointsPerCorrect = 10,
  completedAt = Date.now(),
): TrainingSession<TExercise> {
  if (session.hasAnsweredCurrent || session.completedAt !== null) return session;

  const questionsAnswered = session.questionsAnswered + 1;
  const correctAnswers = session.correctAnswers + (isCorrect ? 1 : 0);
  const incorrectAnswers = session.incorrectAnswers + (isCorrect ? 0 : 1);
  const responseTimeTotalMs = session.responseTimeTotalMs + Math.max(0, responseTimeMs);
  const isComplete = session.plannedQuestions !== null && questionsAnswered >= session.plannedQuestions;

  return {
    ...session,
    questionsAnswered,
    correctAnswers,
    incorrectAnswers,
    accuracy: Math.round((correctAnswers / questionsAnswered) * 100),
    totalScore: session.totalScore + (isCorrect ? pointsPerCorrect : 0),
    averageResponseTimeMs: Math.round(responseTimeTotalMs / questionsAnswered),
    responseTimeTotalMs,
    completedAt: isComplete ? completedAt : null,
    hasAnsweredCurrent: true,
    lastAnswerCorrect: isCorrect,
  };
}

export function advanceSession<TExercise>(
  session: TrainingSession<TExercise>,
  nextExercise: TExercise,
): TrainingSession<TExercise> {
  if (!session.hasAnsweredCurrent || session.completedAt !== null) return session;
  return {
    ...session,
    currentExercise: nextExercise,
    hasAnsweredCurrent: false,
    lastAnswerCorrect: null,
  };
}

export function finishSession<TExercise>(session: TrainingSession<TExercise>, completedAt = Date.now()): TrainingSession<TExercise> {
  if (session.completedAt !== null || session.questionsAnswered === 0) return session;
  return { ...session, completedAt };
}

export function toTrainingResult<TExercise>(session: TrainingSession<TExercise>): TrainingResult | null {
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

import {
  advanceSession,
  createTrainingSession,
  submitSessionAnswer,
  type TrainingSession,
} from "@/features/training/session";
import type { QuizQuestion, QuizTrack } from "./questionBank";

export type RhythmQuizSession = TrainingSession<QuizQuestion>;
export type RhythmQuizAnswer = Readonly<{
  questionId: string;
  optionId: string;
}>;

export function createRhythmQuizSession(
  track: QuizTrack,
  questions: readonly QuizQuestion[],
  runNumber: number,
  startedAt = Date.now()
): RhythmQuizSession {
  if (questions.length === 0)
    throw new RangeError("A Rhythm Quiz run needs at least one question.");
  return createTrainingSession(
    {
      moduleId: "rhythm-quiz",
      mode: "challenge",
      plannedQuestions: questions.length,
      pointsPerCorrect: 10,
      sessionId: `rhythm-quiz-${String(track)}-${runNumber}-${startedAt}`,
      startedAt,
    },
    questions[0]
  );
}

/** Bind canonical question and option IDs; shared scoring owns +10/+0 and duplicate protection. */
export function submitRhythmQuizAnswer(
  session: RhythmQuizSession,
  answer: RhythmQuizAnswer,
  responseTimeMs: number,
  completedAt = Date.now()
): RhythmQuizSession {
  if (
    session.hasAnsweredCurrent ||
    session.completedAt !== null ||
    answer.questionId !== session.currentExercise.id
  )
    return session;
  const isCorrect = answer.optionId === session.currentExercise.correctOptionId;
  return submitSessionAnswer(
    session,
    isCorrect,
    responseTimeMs,
    10,
    completedAt
  );
}

export function advanceRhythmQuizSession(
  session: RhythmQuizSession,
  nextQuestion: QuizQuestion
): RhythmQuizSession {
  return advanceSession(session, nextQuestion);
}

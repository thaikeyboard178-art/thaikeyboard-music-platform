import {
  advanceSession,
  createTrainingSession,
  submitSessionAnswer,
  type TrainingSession,
} from "@/features/training/session";
import type { QuizQuestion, QuizTrack } from "./questionBank";

export type RhythmQuizSession = TrainingSession<QuizQuestion> &
  Readonly<{
    runQuestionIds: readonly string[];
    seenQuestionIds: readonly string[];
  }>;
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
  const questionIds = questions.map(question => question.id);
  if (
    new Set(questionIds).size !== questionIds.length ||
    questions.some(question => String(question.track) !== String(track))
  )
    throw new RangeError(
      "A Rhythm Quiz session needs unique questions from its selected track."
    );
  const session = createTrainingSession(
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
  return {
    ...session,
    runQuestionIds: questionIds,
    seenQuestionIds: [questions[0].id],
  };
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
    answer.questionId !== session.currentExercise.id ||
    !session.currentExercise.options.some(
      option => option.id === answer.optionId
    )
  )
    return session;
  const isCorrect = answer.optionId === session.currentExercise.correctOptionId;
  const submitted = submitSessionAnswer(
    session,
    isCorrect,
    responseTimeMs,
    10,
    completedAt
  );
  return {
    ...submitted,
    runQuestionIds: session.runQuestionIds,
    seenQuestionIds: session.seenQuestionIds,
  };
}

export function advanceRhythmQuizSession(
  session: RhythmQuizSession,
  nextQuestion: QuizQuestion
): RhythmQuizSession {
  if (
    !session.hasAnsweredCurrent ||
    session.completedAt !== null ||
    String(nextQuestion.track) !== String(session.currentExercise.track) ||
    !session.runQuestionIds.includes(nextQuestion.id) ||
    session.seenQuestionIds.includes(nextQuestion.id)
  )
    return session;
  const advanced = advanceSession(session, nextQuestion);
  return {
    ...advanced,
    runQuestionIds: session.runQuestionIds,
    seenQuestionIds: [...session.seenQuestionIds, nextQuestion.id],
  };
}

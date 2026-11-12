import {
  advanceSession,
  advanceSessionWithoutAnswer,
  applySessionPenalty,
  createTrainingSession,
  submitSessionAnswer,
  type TrainingSession,
} from "@/features/training/session";
import type { QuizQuestion, QuizTrack } from "./questionBank";

export type RhythmQuizSession = TrainingSession<QuizQuestion> &
  Readonly<{
    runQuestionIds: readonly string[];
    seenQuestionIds: readonly string[];
    skippedQuestionIds: readonly string[];
    pointsDeducted: number;
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
    (track !== "mixed" &&
      questions.some(question => String(question.track) !== String(track))) ||
    (track === "mixed" && questions.some(question => question.track === "mixed"))
  )
    throw new RangeError(
      "A Rhythm Quiz session needs unique questions from its selected track."
    );
  const session = createTrainingSession(
    {
      moduleId: track === "mixed" ? "rhythm-quiz-mixed" : "rhythm-quiz",
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
    skippedQuestionIds: [],
    pointsDeducted: 0,
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
    ...(session.seenQuestionIds.length === session.runQuestionIds.length
      ? { completedAt }
      : {}),
    runQuestionIds: session.runQuestionIds,
    seenQuestionIds: session.seenQuestionIds,
    skippedQuestionIds: session.skippedQuestionIds,
    pointsDeducted: session.pointsDeducted,
  };
}

export function advanceRhythmQuizSession(
  session: RhythmQuizSession,
  nextQuestion: QuizQuestion
): RhythmQuizSession {
  if (
    !session.hasAnsweredCurrent ||
    session.completedAt !== null ||
    (session.moduleId !== "rhythm-quiz-mixed" &&
      String(nextQuestion.track) !== String(session.currentExercise.track)) ||
    !session.runQuestionIds.includes(nextQuestion.id) ||
    session.seenQuestionIds.includes(nextQuestion.id) ||
    nextQuestion.id !== session.runQuestionIds[session.seenQuestionIds.length]
  )
    return session;
  const advanced = advanceSession(session, nextQuestion);
  return {
    ...advanced,
    runQuestionIds: session.runQuestionIds,
    seenQuestionIds: [...session.seenQuestionIds, nextQuestion.id],
    skippedQuestionIds: session.skippedQuestionIds,
    pointsDeducted: session.pointsDeducted,
  };
}

/** Skip the current unanswered quiz item using shared clamped scoring semantics. */
export function skipRhythmQuizQuestion(
  session: RhythmQuizSession,
  nextQuestion: QuizQuestion | null,
  completedAt = Date.now()
): RhythmQuizSession {
  const currentIndex = session.runQuestionIds.indexOf(session.currentExercise.id);
  const isFinal = currentIndex === session.runQuestionIds.length - 1;
  if (
    session.hasAnsweredCurrent ||
    session.completedAt !== null ||
    currentIndex < 0 ||
    session.seenQuestionIds.at(-1) !== session.currentExercise.id ||
    session.skippedQuestionIds.includes(session.currentExercise.id) ||
    (isFinal && nextQuestion !== null) ||
    (!isFinal &&
      (nextQuestion === null ||
        nextQuestion.id !== session.runQuestionIds[currentIndex + 1] ||
        session.seenQuestionIds.includes(nextQuestion.id) ||
        (session.moduleId !== "rhythm-quiz-mixed" &&
          String(nextQuestion.track) !== String(session.currentExercise.track))))
  )
    return session;

  const penalized = applySessionPenalty(session, 5);
  const pointsDeducted = session.totalScore - penalized.totalScore;
  const skippedQuestionIds = [
    ...session.skippedQuestionIds,
    session.currentExercise.id,
  ];
  if (isFinal)
    return {
      ...penalized,
      completedAt,
      runQuestionIds: session.runQuestionIds,
      seenQuestionIds: session.seenQuestionIds,
      skippedQuestionIds,
      pointsDeducted: session.pointsDeducted + pointsDeducted,
    };

  const advanced = advanceSessionWithoutAnswer(penalized, nextQuestion!);
  return {
    ...advanced,
    runQuestionIds: session.runQuestionIds,
    seenQuestionIds: [...session.seenQuestionIds, nextQuestion!.id],
    skippedQuestionIds,
    pointsDeducted: session.pointsDeducted + pointsDeducted,
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQuizRun,
  getAvailableQuizQuestionCount,
  QUIZ_QUESTION_BANK,
  type QuizTrack,
} from "./questionBank";
import {
  advanceRhythmQuizSession,
  createRhythmQuizSession,
  skipRhythmQuizQuestion,
  submitRhythmQuizAnswer,
} from "./session";
import { toTrainingResult } from "@/features/training/session";

const bankFor = (track: QuizTrack) => QUIZ_QUESTION_BANK[String(track)];
afterEach(() => vi.unstubAllGlobals());

describe("randomized Rhythm Quiz runs and session guards", () => {
  it("creates fresh crypto-seeded decks when the seed is omitted", () => {
    let call = 0;
    const cryptoMock = {
      getRandomValues(words: Uint32Array) {
        words.set([0x13579bdf + call++, 0x2468ace0, 0xabcdef01, 0x10203040]);
        return words;
      },
    };
    vi.stubGlobal("crypto", cryptoMock);

    const first = createQuizRun(3, undefined, 10);
    const second = createQuizRun(3, undefined, 10);
    expect(call).toBe(2);
    expect(first.map(question => question.id)).not.toEqual(
      second.map(question => question.id)
    );
    expect(new Set(first.map(question => question.id)).size).toBe(first.length);
    expect(new Set(second.map(question => question.id)).size).toBe(
      second.length
    );
  });

  it("keeps exact requested counts and refuses a short eligible bank without filler", () => {
    const available = getAvailableQuizQuestionCount(5);
    const first = createQuizRun(5, "short-and-reproducible", available);
    const second = createQuizRun(5, "short-and-reproducible", available);
    expect(
      first.map(question => [
        question.id,
        question.options.map(option => option.id),
      ])
    ).toEqual(
      second.map(question => [
        question.id,
        question.options.map(option => option.id),
      ])
    );
    expect(first).toHaveLength(available);
    expect(first.every(question => question.track === 5)).toBe(true);
    expect(
      first.every(
        question => question.concept === "complex-rhythm-combinations"
      )
    ).toBe(true);
    expect(new Set(first.map(question => question.id)).size).toBe(first.length);
    expect(() => createQuizRun(5, "short-and-reproducible", available + 1)).toThrow(
      /unique questions are available/
    );
  });

  it("rejects duplicate or out-of-track session decks and never advances to a repeated ID", () => {
    const repeated = bankFor(1)[0];
    expect(() =>
      createRhythmQuizSession(1, [repeated, repeated], 1, 100)
    ).toThrow(/unique questions/);
    expect(() => createRhythmQuizSession(2, [repeated], 1, 100)).toThrow(
      /unique questions/
    );

    const deck = createQuizRun(3, "session-deck", 4);
    const start = createRhythmQuizSession(3, deck, 2, 1000);
    const firstAnswered = submitRhythmQuizAnswer(
      start,
      { questionId: deck[0].id, optionId: deck[0].correctOptionId },
      100,
      1100
    );
    expect(firstAnswered.totalScore).toBe(10);
    expect(firstAnswered.seenQuestionIds).toEqual([deck[0].id]);

    expect(advanceRhythmQuizSession(firstAnswered, deck[0])).toBe(
      firstAnswered
    );
    const advanced = advanceRhythmQuizSession(firstAnswered, deck[1]);
    expect(advanced.currentExercise.id).toBe(deck[1].id);
    expect(advanced.seenQuestionIds).toEqual([deck[0].id, deck[1].id]);
    expect(
      advanceRhythmQuizSession(
        advanced,
        bankFor(3).find(q => !start.runQuestionIds.includes(q.id))!
      )
    ).toBe(advanced);
  });

  it("grades shuffled choices by stable option ID and rejects an invalid option without scoring it", () => {
    const question = createQuizRun(3, "option-shuffle", 1)[0];
    const session = createRhythmQuizSession(3, [question], 1, 2000);
    const invalid = submitRhythmQuizAnswer(
      session,
      { questionId: question.id, optionId: "not-a-canonical-option" },
      10,
      2010
    );
    expect(invalid).toBe(session);
    expect(invalid.questionsAnswered).toBe(0);
    expect(invalid.incorrectAnswers).toBe(0);

    const correct = submitRhythmQuizAnswer(
      session,
      { questionId: question.id, optionId: question.correctOptionId },
      50,
      2050
    );
    expect(correct.questionsAnswered).toBe(1);
    expect(correct.correctAnswers).toBe(1);
    expect(correct.totalScore).toBe(10);
  });

  it("skips only the unanswered current question, advances once, clamps at zero, and reports actual deductions", () => {
    const deck = createQuizRun(1, "skip-guard", 3);
    const start = createRhythmQuizSession(1, deck, 1, 3000);
    const correct = submitRhythmQuizAnswer(
      start,
      { questionId: deck[0].id, optionId: deck[0].correctOptionId },
      10,
      3010
    );
    const second = advanceRhythmQuizSession(correct, deck[1]);
    const skipped = skipRhythmQuizQuestion(second, deck[2], 3020);
    expect(skipped.skippedQuestionIds).toEqual([deck[1].id]);
    expect(skipped.seenQuestionIds).toEqual(deck.slice(0, 3).map(q => q.id));
    expect(skipped.questionsAnswered).toBe(1);
    expect(skipped.correctAnswers).toBe(1);
    expect(skipped.incorrectAnswers).toBe(0);
    expect(skipped.totalScore).toBe(5);
    expect(skipped.pointsDeducted).toBe(5);
    expect(skipped.currentExercise.id).toBe(deck[2].id);
    const finalSkip = skipRhythmQuizQuestion(skipped, null, 3030);
    expect(finalSkip.totalScore).toBe(0);
    expect(finalSkip.pointsDeducted).toBe(10);
    expect(finalSkip.skippedQuestionIds).toEqual([deck[1].id, deck[2].id]);
    expect(finalSkip.completedAt).toBe(3030);
    expect(skipRhythmQuizQuestion(finalSkip, null, 3040)).toBe(finalSkip);
    expect(skipRhythmQuizQuestion(second, deck[2], 3020).pointsDeducted).toBe(5);
  });

  it("completes an all-skip run without learner error records, wrong answers or negative score", () => {
    const question = createQuizRun(2, "skip-only", 1)[0];
    const start = createRhythmQuizSession(2, [question], 1, 4000);
    const skipped = skipRhythmQuizQuestion(start, null, 4010);
    expect(skipped.completedAt).toBe(4010);
    expect(skipped.questionsAnswered).toBe(0);
    expect(skipped.incorrectAnswers).toBe(0);
    expect(skipped.skippedQuestionIds).toEqual([question.id]);
    expect(skipped.totalScore).toBe(0);
    expect(skipped.pointsDeducted).toBe(0);
    expect(toTrainingResult(skipped)?.totalQuestions).toBe(0);
  });

  it("keeps Mixed question level identity while advancing across all seven eligible source groups", () => {
    const deck = createQuizRun("mixed", "mixed-session", 30);
    expect(new Set(deck.map(question => String(question.track)))).toEqual(
      new Set([1, 2, 3, 4, 5, 6, "bonus"].map(String))
    );
    const session = createRhythmQuizSession("mixed", deck, 1, 5000);
    expect(session.moduleId).toBe("rhythm-quiz-mixed");
    expect(session.currentExercise.track).toBe(deck[0].track);
    const correct = submitRhythmQuizAnswer(
      session,
      { questionId: deck[0].id, optionId: deck[0].correctOptionId },
      10,
      5010
    );
    expect(advanceRhythmQuizSession(correct, deck[1]).currentExercise).toBe(deck[1]);
    expect(() => createRhythmQuizSession("mixed", [
      { ...deck[0], track: "mixed" },
    ], 1, 0)).toThrow(/unique questions/);
  });
});

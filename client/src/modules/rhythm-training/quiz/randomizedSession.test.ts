import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQuizRun,
  QUIZ_QUESTION_BANK,
  type QuizTrack,
} from "./questionBank";
import {
  advanceRhythmQuizSession,
  createRhythmQuizSession,
  submitRhythmQuizAnswer,
} from "./session";

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

  it("keeps an explicit seed deterministic and caps a short eligible bank without filler", () => {
    const first = createQuizRun(5, "short-and-reproducible", 10);
    const second = createQuizRun(5, "short-and-reproducible", 10);
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
    expect(first).toHaveLength(bankFor(5).length);
    expect(first.every(question => question.track === 5)).toBe(true);
    expect(
      first.every(
        question => question.concept === "complex-rhythm-combinations"
      )
    ).toBe(true);
    expect(new Set(first.map(question => question.id)).size).toBe(first.length);
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
});

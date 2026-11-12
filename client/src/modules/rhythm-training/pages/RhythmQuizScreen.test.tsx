// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RhythmQuizScreen from "./RhythmQuizScreen";
import { RhythmQuizNotation } from "../quiz/RhythmQuizNotation";
import type { RhythmPattern } from "../types";
import {
  createQuizRun,
  DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT,
  QUIZ_QUESTION_BANK,
  type QuizQuestion,
  type QuizTrack,
} from "../quiz/questionBank";
import {
  advanceRhythmQuizSession,
  createRhythmQuizSession,
  submitRhythmQuizAnswer,
} from "../quiz/session";

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({
      measureText: (text: string) => ({ width: text.length * 7 }),
    }),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function bank(track: QuizTrack): readonly QuizQuestion[] {
  return QUIZ_QUESTION_BANK[String(track)];
}

describe("Rhythm Quiz tiered visual question bank", () => {
  it("keeps the exact concepts inside each Level 1–6 and Bonus boundary", () => {
    const concepts = (track: QuizTrack) =>
      new Set(bank(track).map(question => question.concept));
    expect(concepts(1)).toEqual(
      new Set([
        "4-4-scaffold",
        "quarter-note",
        "half-note",
        "whole-note",
        "quarter-rest",
      ])
    );
    expect(concepts(2)).toEqual(
      new Set([
        "quarter-eighth-equivalence",
        "eighth-rest",
        "binary-subdivision",
      ])
    );
    expect(concepts(3)).toEqual(
      new Set([
        "simple-meter-pulses",
        "meter-identification",
        "dot-arithmetic",
        "tie-continuation",
      ])
    );
    expect(concepts(4)).toEqual(
      new Set([
        "sixteenth-subdivision",
        "sixteenth-rest",
        "approved-note-values",
      ])
    );
    expect(concepts(5)).toEqual(new Set(["complex-rhythm-combinations"]));
    expect(concepts(6)).toEqual(
      new Set([
        "eighth-metronome-count",
        "grouping-in-threes",
        "compound-group-accent",
        "meter-identification",
        "incomplete-bar-fill",
      ])
    );
    expect(concepts("bonus")).toEqual(
      new Set(["2-2-meter", "half-note-pulse", "meter-identification"])
    );
    expect(
      bank(1).every(
        question =>
          !/móc đơn|móc kép|chấm dôi|nối trường độ|6\/8|9\/8|3\/8/i.test(
            question.prompt + question.explanation
          )
      )
    ).toBe(true);
    expect(
      bank(2).every(
        question =>
          !/chấm dôi|nối trường độ|móc kép|6\/8|9\/8/i.test(
            question.prompt + question.explanation
          )
      )
    ).toBe(true);
  });

  it("derives all seven meter/pulse counts, compound groupings, and medium-group positions canonically", () => {
    const l3 = bank(3);
    for (const [meter, pulses] of [
      ["2/4", 2],
      ["3/4", 3],
      ["4/4", 4],
    ] as const) {
      expect(
        l3.find(
          question =>
            question.id === `l3-${meter.replace("/", "-")}-pulse-count`
        )?.correctOptionId
      ).toBe(`simple-pulses-${pulses}`);
    }
    expect(
      bank(6).find(question => question.id === "l6-3-8-eighth-beats")
        ?.correctOptionId
    ).toBe("eighth-count-3");
    expect(
      bank(6).find(question => question.id === "l6-6-8-eighth-beats")
        ?.correctOptionId
    ).toBe("eighth-count-6");
    expect(
      bank(6).find(question => question.id === "l6-9-8-eighth-beats")
        ?.correctOptionId
    ).toBe("eighth-count-9");
    expect(
      bank(6).find(question => question.id === "l6-6-8-grouping")
        ?.correctOptionId
    ).toBe("groups-3-3");
    expect(
      bank(6).find(question => question.id === "l6-9-8-grouping")
        ?.correctOptionId
    ).toBe("groups-3-3-3");
    expect(
      bank(6).find(question => question.id === "l6-six-eight-medium")
        ?.correctOptionId
    ).toBe("medium-eighth-4");
    expect(
      bank(6).find(question => question.id === "l6-nine-eight-medium")
        ?.correctOptionId
    ).toBe("medium-eighths-4-7");
    expect(
      bank("bonus").find(
        question => question.id === "bonus-two-two-pulse-count"
      )?.correctOptionId
    ).toBe("bonus-pulses-2");
    expect(
      bank("bonus").find(question => question.id === "bonus-two-two-pulse-unit")
        ?.correctOptionId
    ).toBe("bonus-unit-half");
    const unitQuestion = bank("bonus").find(
      question => question.id === "bonus-two-two-versus-four"
    )!;
    expect(
      unitQuestion.options.find(
        option => option.id === unitQuestion.correctOptionId
      )?.label
    ).toBe("Hai phách nốt trắng, không phải một phách nốt tròn");
    expect(unitQuestion.explanation).toContain(
      "tổng trường độ toàn ô đúng bằng một nốt tròn"
    );
  });

  it("uses stable question/option identities and deterministic seeded shuffles; labels and positions are not keys", () => {
    for (const track of [1, 2, 3, 4, 5, 6, "bonus"] as const) {
      for (const question of bank(track)) {
        expect(
          new Set(question.options.map(candidate => candidate.id)).size
        ).toBe(question.options.length);
        expect(
          question.options.some(
            candidate => candidate.id === question.correctOptionId
          )
        ).toBe(true);
      }
      expect(bank(track).length).toBeGreaterThan(0);
      const first = createQuizRun(track, "repro-seed", 10);
      const again = createQuizRun(track, "repro-seed", 10);
      expect(
        first.map(question => [
          question.id,
          question.options.map(candidate => candidate.id),
        ])
      ).toEqual(
        again.map(question => [
          question.id,
          question.options.map(candidate => candidate.id),
        ])
      );
      expect(first).toHaveLength(
        Math.min(DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT, bank(track).length)
      );
      expect(new Set(first.map(question => question.id)).size).toBe(
        first.length
      );
    }
    const session = createRhythmQuizSession(1, [bank(1)[0]], 1, 10);
    const wrongLabel = submitRhythmQuizAnswer(
      session,
      {
        questionId: session.currentExercise.id,
        optionId: bank(1)[0].options.find(
          option => option.id !== bank(1)[0].correctOptionId
        )!.label,
      },
      100,
      20
    );
    expect(wrongLabel).toBe(session);
    expect(wrongLabel.questionsAnswered).toBe(0);
    expect(wrongLabel.totalScore).toBe(0);
    const wrongOption = submitRhythmQuizAnswer(
      session,
      {
        questionId: session.currentExercise.id,
        optionId: session.currentExercise.options.find(
          option => option.id !== session.currentExercise.correctOptionId
        )!.id,
      },
      100,
      20
    );
    expect(wrongOption.incorrectAnswers).toBe(1);
    expect(wrongOption.totalScore).toBe(0);
  });

  it("ships a separate quiz-specific incomplete 3/8 illustration, never as canonical pattern data", () => {
    const question = bank(6).find(
      item => item.id === "l6-3-8-incomplete-fill"
    )!;
    expect(question.notation?.kind).toBe("illustrative-3-8-partial");
    expect(question.correctOptionId).toBe("partial-add-eighth");
    expect("pattern" in question.notation!).toBe(false);
  });
});

describe("shared in-memory Rhythm Quiz session", () => {
  it("uses moduleId rhythm-quiz, +10/+0 exactly once, and canonical option IDs only", () => {
    const questions = [bank(1)[0], bank(1)[1]];
    const start = createRhythmQuizSession(1, questions, 2, 1_000);
    expect(start.moduleId).toBe("rhythm-quiz");
    const right = submitRhythmQuizAnswer(
      start,
      {
        questionId: start.currentExercise.id,
        optionId: start.currentExercise.correctOptionId,
      },
      200,
      1_200
    );
    expect(right.totalScore).toBe(10);
    expect(right.correctAnswers).toBe(1);
    expect(
      submitRhythmQuizAnswer(
        right,
        {
          questionId: right.currentExercise.id,
          optionId: right.currentExercise.correctOptionId,
        },
        20,
        1_300
      )
    ).toBe(right);
    const advanced = advanceRhythmQuizSession(right, questions[1]);
    const wrongId = questions[1].options.find(
      option => option.id !== questions[1].correctOptionId
    )!.id;
    const wrong = submitRhythmQuizAnswer(
      advanced,
      { questionId: questions[1].id, optionId: wrongId },
      300,
      1_500
    );
    expect(wrong.totalScore).toBe(10);
    expect(wrong.correctAnswers).toBe(1);
    expect(wrong.incorrectAnswers).toBe(1);
    expect(wrong.completedAt).toBe(1_500);
    expect(
      submitRhythmQuizAnswer(
        wrong,
        { questionId: questions[1].id, optionId: questions[1].correctOptionId },
        1,
        1_600
      )
    ).toBe(wrong);
  });

  it("rejects a stale question identity even when its option ID is correct for the new question", () => {
    const questions = [bank(1)[0], bank(1)[1]];
    const start = createRhythmQuizSession(1, questions, 3, 1000);
    const answered = submitRhythmQuizAnswer(
      start,
      { questionId: questions[0].id, optionId: questions[0].correctOptionId },
      20,
      1020
    );
    const advanced = advanceRhythmQuizSession(answered, questions[1]);
    const stale = submitRhythmQuizAnswer(
      advanced,
      { questionId: questions[0].id, optionId: questions[1].correctOptionId },
      20,
      1040
    );
    expect(stale).toBe(advanced);
    expect(stale.hasAnsweredCurrent).toBe(false);
    expect(stale.questionsAnswered).toBe(1);
    expect(stale.totalScore).toBe(10);
    const current = submitRhythmQuizAnswer(
      stale,
      { questionId: questions[1].id, optionId: questions[1].correctOptionId },
      20,
      1060
    );
    expect(current.questionsAnswered).toBe(2);
    expect(current.totalScore).toBe(20);
  });

  it("leaves a technical rendering failure unanswered rather than submitting it as wrong", () => {
    const question = bank(3).find(item => item.id === "l3-2-4-identify-meter")!;
    const notation = question.notation!;
    if (notation.kind !== "canonical")
      throw new Error("Expected canonical meter staff fixture");
    const malformedPattern: RhythmPattern = {
      ...notation.pattern,
      measures: [
        {
          ...notation.pattern.measures[0],
          segments: notation.pattern.measures[0].segments.slice(0, -1),
        },
      ],
    };
    const errors = vi.fn();
    render(
      <RhythmQuizNotation
        notation={{ ...notation, pattern: malformedPattern }}
        onRenderError={errors}
      />
    );
    expect(errors).toHaveBeenCalledWith(
      expect.stringContaining("MEASURE_UNDERFILLED")
    );
    const session = createRhythmQuizSession(3, [question], 1, 10);
    expect(session.questionsAnswered).toBe(0);
    expect(session.incorrectAnswers).toBe(0);
    expect(session.completedAt).toBeNull();
  });
});

describe("RhythmQuizScreen visual-only flow", () => {
  it("works without AudioContext and exposes no Listen, Tap, Lesson, or audio control", () => {
    vi.stubGlobal("AudioContext", undefined);
    const { container } = render(<RhythmQuizScreen onBack={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Trắc nghiệm kiến thức nhịp điệu" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Level 1/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bonus · 2\/2/ })).toBeTruthy();
    expect(
      container.querySelector(
        "audio, audio + *, button[aria-label*='nghe' i], button[aria-label*='tap' i]"
      )
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /nghe|listen|tap|lesson|bài học/i })
    ).toBeNull();
  });

  it("renders actual VexFlow SVG for complete staff questions and for the partial-bar illustration", () => {
    let renderedStaffQuestions = 0;
    for (const track of [1, 2, 3, 4, 5, 6, "bonus"] as const) {
      for (const question of bank(track)) {
        if (question.notation?.kind !== "canonical") continue;
        const errors = vi.fn();
        const { container, unmount } = render(
          <RhythmQuizNotation
            notation={question.notation}
            onRenderError={errors}
          />
        );
        expect(
          container.querySelector(
            "svg[data-quiz-notation='canonical-complete-bar']"
          )
        ).toBeTruthy();
        expect(errors).not.toHaveBeenCalled();
        renderedStaffQuestions += 1;
        unmount();
      }
    }
    expect(renderedStaffQuestions).toBeGreaterThanOrEqual(8);
    const complete = bank(3).find(
      question => question.notation?.kind === "canonical"
    )!;
    const errors = vi.fn();
    const { container, rerender } = render(
      <RhythmQuizNotation
        notation={complete.notation!}
        onRenderError={errors}
      />
    );
    expect(
      container.querySelector(
        "svg[data-quiz-notation='canonical-complete-bar']"
      )
    ).toBeTruthy();
    expect(container.querySelector("svg .vf-stave")).toBeTruthy();
    expect(errors).not.toHaveBeenCalled();
    const partial = bank(6).find(
      item => item.id === "l6-3-8-incomplete-fill"
    )!.notation!;
    rerender(<RhythmQuizNotation notation={partial!} onRenderError={errors} />);
    expect(
      container.querySelector(
        "svg[data-quiz-notation='illustrative-incomplete-3-8']"
      )
    ).toBeTruthy();
    expect(container.textContent).toContain("không phải mẫu nhịp canonical");
    expect(errors).not.toHaveBeenCalled();
  });

  it("completes a finite run with unique question IDs, visible A–D labels, canonical option mapping, and a fresh retry", () => {
    const onBack = vi.fn();
    const { container } = render(<RhythmQuizScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Level 1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu Quiz" }));
    const plannedCount = Math.min(
      DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT,
      bank(1).length
    );
    const seenQuestionIds = new Set<string>();
    for (let index = 0; index < plannedCount; index += 1) {
      const prompt =
        container.querySelector(".rhythm-quiz-question")?.textContent ?? "";
      const question = bank(1).find(candidate => candidate.prompt === prompt);
      expect(question).toBeTruthy();
      expect(seenQuestionIds.has(question!.id)).toBe(false);
      seenQuestionIds.add(question!.id);
      const answerButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>(".rhythm-quiz-option")
      );
      expect(answerButtons).toHaveLength(4);
      expect(question!.options).toHaveLength(4);
      answerButtons.forEach((button, optionIndex) => {
        const letter = ["A", "B", "C", "D"][optionIndex];
        const optionId = button.getAttribute("data-option-id");
        const option = question!.options.find(
          candidate => candidate.id === optionId
        );
        expect(option).toBeTruthy();
        expect(
          button.querySelector(".rhythm-quiz-option-letter")?.textContent
        ).toBe(letter);
        expect(button.getAttribute("aria-label")).toBe(
          `${letter}. ${option!.label}`
        );
      });
      const correctIndex = answerButtons.findIndex(
        button =>
          button.getAttribute("data-option-id") === question!.correctOptionId
      );
      const correctOption = question!.options.find(
        option => option.id === question!.correctOptionId
      )!;
      const correctLabel = `${["A", "B", "C", "D"][correctIndex]}. ${correctOption.label}`;
      expect(
        screen.getByText(`Câu ${index + 1} / ${plannedCount}`)
      ).toBeTruthy();
      fireEvent.click(answerButtons[correctIndex]);
      expect(screen.getByRole("status").textContent).toContain("+10 điểm");
      expect(
        screen.getByText(`Câu ${index + 1} / ${plannedCount}`)
      ).toBeTruthy();
      expect(
        screen.getByRole("progressbar").getAttribute("aria-valuenow")
      ).toBe(String(index + 1));
      fireEvent.click(screen.getByRole("button", { name: correctLabel }));
      expect(
        screen.getByRole("progressbar").getAttribute("aria-valuenow")
      ).toBe(String(index + 1));
      const nextName =
        index === plannedCount - 1 ? "Xem tổng kết" : "Câu tiếp theo";
      fireEvent.click(screen.getByRole("button", { name: nextName }));
    }
    expect(screen.getByRole("heading", { name: "Tổng kết Quiz" })).toBeTruthy();
    expect(screen.getByText(String(plannedCount * 10))).toBeTruthy();
    expect(screen.getByText("Quiz run · chỉ số giao diện")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Làm lại lượt này" }));
    const secondPrompt =
      container.querySelector(".rhythm-quiz-question")?.textContent ?? "";
    expect(bank(1).some(candidate => candidate.prompt === secondPrompt)).toBe(
      true
    );
    expect(screen.getByText(/Quiz run 2/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thoát Quiz" }));
    expect(
      screen.getByRole("heading", { name: "Trắc nghiệm kiến thức nhịp điệu" })
    ).toBeTruthy();
  });

  it("reports the correct displayed letter and canonical answer after an incorrect selection", () => {
    render(<RhythmQuizScreen onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu Quiz" }));
    const prompt =
      document.querySelector(".rhythm-quiz-question")?.textContent ?? "";
    const question = bank(1).find(candidate => candidate.prompt === prompt)!;
    const answerButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".rhythm-quiz-option")
    );
    const correctIndex = answerButtons.findIndex(
      button =>
        button.getAttribute("data-option-id") === question.correctOptionId
    );
    const correctLetter = ["A", "B", "C", "D"][correctIndex];
    const wrongButton =
      answerButtons[(correctIndex + 1) % answerButtons.length];
    fireEvent.click(wrongButton);
    expect(screen.getByRole("status").textContent).toContain("+0 điểm");
    expect(screen.getByRole("status").textContent).toContain(
      `Đáp án đúng: ${correctLetter}. ${question.options.find(option => option.id === question.correctOptionId)!.label}`
    );
    expect(wrongButton.getAttribute("aria-pressed")).toBe("true");
    expect(wrongButton.disabled).toBe(true);
  });
});

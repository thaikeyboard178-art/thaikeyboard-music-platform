// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { sealTapAttempt } from "../exercises/tapCompletion";
import { matchTapRhythm, type TapMatchInput } from "../exercises/tapMatcher";
import {
  calculateTapTwoRoundScore,
  type TapRoundInput,
} from "../exercises/tapRoundScoring";
import type { TapTarget } from "../exercises/tapRhythm";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import { summarizeTapResult, TapResultPanel } from "./TapResultPanel";

const targets: readonly TapTarget[] = [
  { id: "onset-1", tick: 0, offsetMs: 100, passMs: 20, associationMs: 70 },
  { id: "onset-2", tick: 240, offsetMs: 300, passMs: 20, associationMs: 70 },
  { id: "onset-3", tick: 480, offsetMs: 500, passMs: 20, associationMs: 70 },
  { id: "onset-4", tick: 720, offsetMs: 700, passMs: 20, associationMs: 70 },
];
const mixedTaps: readonly TapMatchInput[] = [
  { sequence: 0, offsetMs: 100 },
  { sequence: 1, offsetMs: 270 },
  { sequence: 2, offsetMs: 540 },
  // A true extra in onset-3's already-paired cell; onset-4 remains untouched.
  { sequence: 3, offsetMs: 560 },
];
const slightlyLateTaps: readonly TapMatchInput[] = targets.map(
  (target, sequence) => ({ sequence, offsetMs: target.offsetMs + 10 })
);

type AttemptOptions = Readonly<{
  mode?: "graded" | "practice";
  targets?: readonly TapTarget[];
  round1Taps?: readonly TapMatchInput[];
  round2Taps?: readonly TapMatchInput[];
  skippedRounds?: readonly [boolean, boolean];
  exerciseId?: string;
}>;

function completedAttempt({
  mode = "graded",
  targets: attemptTargets = targets,
  round1Taps = mixedTaps,
  round2Taps = slightlyLateTaps,
  skippedRounds = [false, false],
  exerciseId = "result-panel-fixture",
}: AttemptOptions = {}) {
  const roundInputs: readonly [TapRoundInput, TapRoundInput] = [
    {
      roundNumber: 1,
      skipped: skippedRounds[0],
      taps: round1Taps,
    },
    {
      roundNumber: 2,
      skipped: skippedRounds[1],
      taps: round2Taps,
    },
  ];
  const score = calculateTapTwoRoundScore(attemptTargets, roundInputs, 200);
  const firstPlayedRound = score.rounds.find(
    round => round.status === "played"
  );
  // Keep the legacy projection sourced from the real production matcher too;
  // official totals and the immutable per-round results come from the scorer.
  const evaluation = firstPlayedRound
    ? matchTapRhythm(attemptTargets, firstPlayedRound.taps)
    : null;
  return sealTapAttempt({
    exerciseId,
    generation: 1,
    mode,
    status: "completed",
    reason: null,
    targetTicks: attemptTargets.map(target => target.tick),
    taps: firstPlayedRound?.taps ?? [],
    evaluation,
    accuracyPercent: score.overallAccuracyPercent,
    scoreOutOfTen: score.scoreOutOfTen,
    rounds: score.rounds,
    rawCaptures: [],
  });
}

function resultExercise(id = "result-panel-fixture"): TapRhythmExercise {
  return {
    id,
    kind: "tap-rhythm",
    track: 3,
    section: "practice",
    pattern: {
      id: "relative-feedback-test",
      meter: { numerator: 4, denominator: 4 },
      tempo: { pulseBpm: 60 },
      measures: [],
    },
    gridTicks: 240,
    targets,
  };
}

function technicalAttempt() {
  return sealTapAttempt({
    exerciseId: "technical-fixture",
    generation: 2,
    mode: "graded",
    status: "technical-abort",
    reason: "audio-blocked",
    targetTicks: targets.map(target => target.tick),
    taps: [],
    evaluation: null,
    accuracyPercent: null,
    rawCaptures: [],
  });
}

afterEach(cleanup);

describe("TapResultPanel", () => {
  it("shows practice feedback and a reference score without an official score or invented prior award", () => {
    render(
      <TapResultPanel
        result={completedAttempt({ mode: "practice" })}
        points={null}
        originalPoints={null}
        onRetry={() => undefined}
        onContinue={() => undefined}
        retryLabel="Chơi lại"
        continueLabel="Bài tiếp theo"
        practiceLabel="Chơi thử — kết quả và điểm /10 chỉ để tham khảo; không cộng vào tổng điểm."
      />
    );
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("73.8%");
    expect(screen.getByTestId("tap-round-1-accuracy").textContent).toBe(
      "57.5%"
    );
    expect(screen.getByTestId("tap-round-2-accuracy").textContent).toBe("90%");
    expect(screen.getByTestId("tap-reference-score").textContent).toBe("7/10");
    expect(screen.getByTestId("tap-rounds-played").textContent).toBe("2/2");
    expect(screen.getByTestId("tap-count-missing").textContent).toBe("1/8");
    expect(screen.getByTestId("tap-count-extra").textContent).toBe("1");
    expect(screen.queryByTestId("tap-points")).toBeNull();
    expect(screen.queryByText(/Điểm đã ghi từ bài chấm trước/)).toBeNull();
    expect(
      screen.getByText(
        "Chơi thử — kết quả và điểm /10 chỉ để tham khảo; không cộng vào tổng điểm."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/Chơi thử không tạo câu trả lời/)).toBeNull();
    expect(screen.getByTestId("tap-result-announcement").textContent).toContain(
      "Điểm tham khảo 7/10"
    );
    expect(screen.getByRole("button", { name: "Chơi lại" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bài tiếp theo" })).toBeTruthy();
  });

  it("shows a zero reference score for a played no-tap Practice attempt without awarding points", () => {
    render(
      <TapResultPanel
        result={completedAttempt({
          mode: "practice",
          round1Taps: [],
          round2Taps: [],
        })}
        points={null}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByTestId("tap-reference-score").textContent).toBe("0/10");
    expect(screen.queryByTestId("tap-points")).toBeNull();
    expect(screen.getByTestId("tap-result-announcement").textContent).toContain(
      "Điểm tham khảo 0/10"
    );
  });

  it("keeps scorer semantics and presents the seven metrics plus a collapsed five-column detail table", () => {
    const result = completedAttempt();
    const firstRound = result.rounds?.[0];
    expect(result.rounds).toHaveLength(2);
    expect(result.accuracyPercent).toBe(73.75);
    expect(result.scoreOutOfTen).toBe(7);
    expect(firstRound?.accuracyPercent).toBe(57.5);
    expect(result.rounds?.[1].accuracyPercent).toBe(90);
    expect(firstRound?.missedTargetCount).toBe(1);
    expect(firstRound?.extraTapCount).toBe(1);
    expect(
      firstRound?.evaluation?.targetResults.map(item => item.status)
    ).toEqual(["matched", "early", "late", "missing"]);
    expect(firstRound?.evaluation?.tapResults.map(item => item.status)).toEqual(
      ["matched", "early", "late", "extra"]
    );
    const assignedSequences = firstRound?.evaluation?.targetResults
      .filter(item => item.tapSequence !== null)
      .map(item => item.tapSequence as number);
    expect(assignedSequences).toEqual([0, 1, 2]);
    expect(new Set(assignedSequences).size).toBe(assignedSequences?.length);
    expect(firstRound?.evaluation?.targetResults[3].tapSequence).toBeNull();
    expect(firstRound?.evaluation?.tapResults[3]).toMatchObject({
      sequence: 3,
      status: "extra",
      targetIndex: null,
    });
    expect(summarizeTapResult(result)).toEqual({
      accuracyPercent: 73.75,
      scoreOutOfTen: 7,
      roundAccuracies: [57.5, 90],
      roundsPlayed: 2,
      roundsSkipped: 0,
      missedTargetCount: 1,
      playedTargetCount: 8,
      extraTapCount: 1,
      hasTwoRoundResult: true,
    });

    const view = render(
      <TapResultPanel
        result={result}
        exercise={resultExercise()}
        points={7}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByTestId("tap-result")).toBeTruthy();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("73.8%");
    expect(screen.getByTestId("tap-round-1-accuracy").textContent).toBe(
      "57.5%"
    );
    expect(screen.getByTestId("tap-round-2-accuracy").textContent).toBe("90%");
    expect(screen.getByTestId("tap-rounds-played").textContent).toBe("2/2");
    expect(screen.getByTestId("tap-count-missing").textContent).toBe("1/8");
    expect(screen.getByTestId("tap-count-extra").textContent).toBe("1");
    expect(screen.getByTestId("tap-reference-score").textContent).toBe("7/10");
    expect(screen.getByTestId("tap-points").textContent).toBe("+7 điểm");
    expect(screen.getByText("Chạm thừa")).toBeTruthy();

    const details = screen.getByTestId(
      "tap-detail-table-details"
    ) as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(screen.getByText("Bảng điểm chi tiết")).toBeTruthy();
    fireEvent.click(screen.getByText("Bảng điểm chi tiết"));
    expect(details.open).toBe(true);
    const table = screen.getByRole("table", {
      name: "Kết quả từng đầu nốt qua hai vòng",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(targets.length + 1);
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map(header => header.textContent)
    ).toEqual([
      "Đầu nốt",
      "Kết quả vòng 1",
      "Điểm vòng 1",
      "Kết quả vòng 2",
      "Điểm vòng 2",
    ]);
    for (let index = 0; index < targets.length; index += 1) {
      expect(screen.getByTestId(`tap-detail-onset-${index}`)).toBeTruthy();
    }
    expect(screen.getByTestId("tap-round-1-note-accuracy-0").textContent).toBe(
      "100%"
    );
    expect(screen.getByTestId("tap-round-1-note-accuracy-1").textContent).toBe(
      "70%"
    );
    expect(screen.getByTestId("tap-round-1-note-accuracy-2").textContent).toBe(
      "60%"
    );
    // Missing onset accuracy is the actual recorded zero for that played head.
    expect(screen.getByTestId("tap-round-1-note-accuracy-3").textContent).toBe(
      "0%"
    );
    for (let index = 0; index < targets.length; index += 1) {
      expect(
        screen.getByTestId(`tap-round-2-note-accuracy-${index}`).textContent
      ).toBe("90%");
    }
    expect(
      within(screen.getByTestId("tap-detail-onset-1")).getByText("Sớm 30%")
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("tap-detail-onset-2")).getByText("Muộn 40%")
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("tap-detail-onset-3")).getByText("Thiếu")
    ).toBeTruthy();
    expect(screen.getByTestId("tap-extra-summary").textContent).toContain(
      "Vòng 1 — 1; Vòng 2 — 0"
    );
    const visibleTableText = Array.from(table.querySelectorAll("tbody td"))
      .map(cell => cell.textContent)
      .join(" ");
    expect(visibleTableText).not.toMatch(
      /onset|matched|early|late|tick|Tap #|ms|deviation/i
    );
    fireEvent.click(screen.getByText("Bảng điểm chi tiết"));
    expect(details.open).toBe(false);

    const announcement = screen.getByTestId("tap-result-announcement");
    expect(announcement.getAttribute("role")).toBe("status");
    expect(announcement.getAttribute("aria-live")).toBe("polite");
    expect(announcement.getAttribute("aria-atomic")).toBe("true");
    expect(announcement.textContent).toContain("trung bình 73.8%");
    expect(announcement.textContent).toContain("Điểm đã ghi: +7 điểm");
    expect(announcement.textContent).toContain(
      "thiếu 1/8 đầu nốt; chạm thừa 1"
    );
    expect(announcement.textContent?.length ?? Infinity).toBeLessThan(200);
    expect(announcement.textContent).not.toMatch(
      /Đầu nốt|Inaccurate|Slightly Off/
    );
    expect(
      screen.getByTestId("tap-relative-feedback").closest("[aria-live]")
    ).toBeNull();
    expect(JSON.stringify(result.rounds?.[0].evaluation)).toBe(
      JSON.stringify(firstRound?.evaluation)
    );

    view.rerender(
      <TapResultPanel
        result={result}
        points={8}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByTestId("tap-points").textContent).toBe("+8 điểm");
  });

  it("counts real extra taps without including them in target-note accuracy or the score", () => {
    const withExtra = completedAttempt();
    const withoutExtra = completedAttempt({
      round1Taps: mixedTaps.filter(tap => tap.sequence !== 3),
    });
    expect(withExtra.rounds?.[0].extraTapCount).toBe(1);
    expect(withExtra.rounds?.[0].accuracyPercent).toBe(
      withoutExtra.rounds?.[0].accuracyPercent
    );
    expect(withExtra.accuracyPercent).toBe(withoutExtra.accuracyPercent);
    expect(withExtra.scoreOutOfTen).toBe(withoutExtra.scoreOutOfTen);
    expect(summarizeTapResult(withExtra).extraTapCount).toBe(1);
    expect(summarizeTapResult(withoutExtra).extraTapCount).toBe(0);
  });

  it("excludes skipped rounds from accuracy, missing-head denominators, and their round score", () => {
    const result = completedAttempt({ skippedRounds: [false, true] });
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds?.map(round => round.status)).toEqual([
      "played",
      "skipped",
    ]);
    expect(result.rounds?.[0].accuracyPercent).toBe(57.5);
    expect(result.rounds?.[1].accuracyPercent).toBeNull();
    expect(result.rounds?.[1].taps).toEqual([]);
    expect(result.accuracyPercent).toBe(57.5);
    expect(result.scoreOutOfTen).toBe(6);
    expect(summarizeTapResult(result)).toMatchObject({
      accuracyPercent: 57.5,
      scoreOutOfTen: 6,
      roundAccuracies: [57.5, null],
      roundsPlayed: 1,
      roundsSkipped: 1,
      missedTargetCount: 1,
      playedTargetCount: 4,
    });

    render(
      <TapResultPanel
        result={result}
        exercise={resultExercise()}
        points={6}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByTestId("tap-rounds-played").textContent).toBe("1/2");
    expect(screen.getByTestId("tap-count-missing").textContent).toBe("1/4");
    expect(screen.getByTestId("tap-round-1-accuracy").textContent).toBe(
      "57.5%"
    );
    expect(screen.getByTestId("tap-round-2-accuracy").textContent).toBe(
      "Đã bỏ qua"
    );
    const details = screen.getByTestId(
      "tap-detail-table-details"
    ) as HTMLDetailsElement;
    fireEvent.click(screen.getByText("Bảng điểm chi tiết"));
    expect(
      within(screen.getByTestId("tap-detail-onset-0")).getAllByText("Đã bỏ qua")
    ).toHaveLength(2);
    expect(screen.getByTestId("tap-extra-summary").textContent).toContain(
      "Vòng 1 — 1; Vòng 2 — Đã bỏ qua"
    );
    fireEvent.click(screen.getByText("Bảng điểm chi tiết"));
    expect(details.open).toBe(false);
  });

  it("keeps two skipped rounds as a valid no-score result instead of inventing zero percent", () => {
    const result = completedAttempt({ skippedRounds: [true, true] });
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds?.map(round => round.status)).toEqual([
      "skipped",
      "skipped",
    ]);
    expect(result.rounds?.every(round => round.taps.length === 0)).toBe(true);
    expect(result.accuracyPercent).toBeNull();
    expect(result.scoreOutOfTen).toBeNull();
    expect(summarizeTapResult(result)).toMatchObject({
      accuracyPercent: null,
      scoreOutOfTen: null,
      roundAccuracies: [null, null],
      roundsPlayed: 0,
      roundsSkipped: 2,
      missedTargetCount: 0,
      playedTargetCount: 0,
      hasTwoRoundResult: true,
    });

    render(
      <TapResultPanel
        result={result}
        exercise={resultExercise()}
        points={10}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByText("Không có điểm khả dụng.")).toBeTruthy();
    expect(screen.getByText(/Cả hai vòng đã được bỏ qua/)).toBeTruthy();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe(
      "Không khả dụng"
    );
    expect(screen.getByTestId("tap-rounds-played").textContent).toBe("0/2");
    expect(screen.getByTestId("tap-count-missing").textContent).toBe("—");
    expect(screen.getByTestId("tap-count-extra").textContent).toBe("—");
    expect(screen.getByTestId("tap-round-1-accuracy").textContent).toBe(
      "Đã bỏ qua"
    );
    expect(screen.getByTestId("tap-round-2-accuracy").textContent).toBe(
      "Đã bỏ qua"
    );
    expect(screen.getByTestId("tap-reference-score").textContent).toBe("—");
    expect(screen.getByTestId("tap-points").textContent).toBe("Chưa ghi điểm");
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("does not attach detailed feedback to a receipt from a different exercise", () => {
    render(
      <TapResultPanel
        result={completedAttempt()}
        exercise={resultExercise("different-exercise")}
        points={7}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.queryByTestId("tap-relative-feedback")).toBeNull();
    expect(screen.queryByText("Bảng điểm chi tiết")).toBeNull();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("73.8%");
    expect(screen.getByTestId("tap-points").textContent).toBe("+7 điểm");
  });

  it("shows technical aborts as ungraded without inventing metrics or points", () => {
    render(
      <TapResultPanel
        result={technicalAttempt()}
        points={10}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(
      screen.getByText("Bài chưa được chấm — đây không phải lỗi của bạn.")
    ).toBeTruthy();
    expect(
      screen.getByText("Trình duyệt chưa cho phép phát âm thanh.")
    ).toBeTruthy();
    expect(screen.queryByTestId("tap-accuracy")).toBeNull();
    expect(screen.queryByTestId("tap-count-missing")).toBeNull();
    expect(screen.queryByTestId("tap-count-extra")).toBeNull();
    expect(screen.queryByTestId("tap-reference-score")).toBeNull();
    expect(screen.queryByText("10%")).toBeNull();
    expect(screen.getByTestId("tap-points").textContent).toBe("Chưa ghi điểm");
    expect(screen.getByTestId("tap-result-announcement").textContent).toContain(
      "Bài chưa được chấm do sự cố kỹ thuật."
    );
  });

  it("keeps N = 0 unavailable rather than displaying a zero-percent score", () => {
    const result = completedAttempt({
      targets: [],
      round1Taps: [],
      round2Taps: [],
    });
    expect(result.rounds).toHaveLength(2);
    expect(result.accuracyPercent).toBeNull();
    expect(result.scoreOutOfTen).toBeNull();
    render(
      <TapResultPanel
        result={result}
        points={null}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByText("Không có điểm khả dụng.")).toBeTruthy();
    expect(
      screen.getByText(/Không có đủ khoảng đầu nốt tham chiếu hợp lệ/)
    ).toBeTruthy();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe(
      "Không khả dụng"
    );
    expect(screen.getByTestId("tap-count-missing").textContent).toBe("—");
    expect(screen.getByTestId("tap-points").textContent).toBe("Chưa ghi điểm");
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("keeps a practice result separate from original graded points", () => {
    render(
      <TapResultPanel
        result={completedAttempt({ mode: "practice" })}
        points={null}
        originalPoints={10}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(
      screen.getByText(
        "Chơi thử — kết quả và điểm /10 chỉ để tham khảo; không cộng vào tổng điểm."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/Điểm đã ghi từ bài chấm trước: \+10 điểm/)
    ).toBeTruthy();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("73.8%");
    expect(screen.getByTestId("tap-reference-score").textContent).toBe("7/10");
    expect(screen.queryByTestId("tap-points")).toBeNull();
  });

  it("shows Lesson diagnostic feedback without graded awards or a fictitious original score", () => {
    render(
      <TapResultPanel
        result={completedAttempt({ mode: "practice" })}
        points={0}
        originalPoints={null}
        lesson
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByText("BÀI HỌC — VÍ DỤ KHÔNG CHẤM ĐIỂM")).toBeTruthy();
    expect(
      screen.getByText(/Bài học — ví dụ thực hành không ghi điểm/)
    ).toBeTruthy();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("73.8%");
    expect(screen.queryByTestId("tap-points")).toBeNull();
    expect(screen.queryByText(/Điểm đã ghi từ bài chấm trước/)).toBeNull();
  });

  it("calls Retry and Continue and disables both actions while busy", async () => {
    const user = userEvent.setup();
    const retryCalls: number[] = [];
    const continueCalls: number[] = [];
    const view = render(
      <TapResultPanel
        result={completedAttempt()}
        points={7}
        onRetry={() => retryCalls.push(1)}
        onContinue={() => continueCalls.push(1)}
      />
    );
    await user.click(screen.getByRole("button", { name: "Luyện lại" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(retryCalls).toHaveLength(1);
    expect(continueCalls).toHaveLength(1);

    view.rerender(
      <TapResultPanel
        result={completedAttempt()}
        points={7}
        onRetry={() => retryCalls.push(1)}
        onContinue={() => continueCalls.push(1)}
        busy
      />
    );
    const retry = screen.getByRole("button", {
      name: "Luyện lại",
    }) as HTMLButtonElement;
    const next = screen.getByRole("button", {
      name: "Tiếp tục",
    }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    fireEvent.click(retry);
    fireEvent.click(next);
    expect(retryCalls).toHaveLength(1);
    expect(continueCalls).toHaveLength(1);
  });
});

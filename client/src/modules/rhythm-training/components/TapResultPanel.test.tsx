// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { sealTapAttempt } from "../exercises/tapCompletion";
import { matchTapRhythm } from "../exercises/tapMatcher";
import type { TapTarget } from "../exercises/tapRhythm";
import { summarizeTapResult, TapResultPanel } from "./TapResultPanel";

const targets: readonly TapTarget[] = [
  { id: "onset-1", tick: 0, offsetMs: 100, passMs: 20, associationMs: 70 },
  { id: "onset-2", tick: 240, offsetMs: 300, passMs: 20, associationMs: 70 },
  { id: "onset-3", tick: 480, offsetMs: 500, passMs: 20, associationMs: 70 },
  { id: "onset-4", tick: 720, offsetMs: 700, passMs: 20, associationMs: 70 },
];
const mixedTaps = [
  { sequence: 0, offsetMs: 100 },
  { sequence: 1, offsetMs: 270 },
  { sequence: 2, offsetMs: 540 },
  { sequence: 3, offsetMs: 1000 },
] as const;

function completedAttempt(
  mode: "graded" | "practice" = "graded",
  taps: typeof mixedTaps = mixedTaps
) {
  const evaluation = matchTapRhythm(targets, taps);
  return sealTapAttempt({
    exerciseId: "result-panel-fixture",
    generation: 1,
    mode,
    status: "completed",
    reason: null,
    targetTicks: targets.map(target => target.tick),
    taps,
    evaluation,
    accuracyPercent: evaluation.accuracyPercent,
    rawCaptures: [],
  });
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
  it("shows first play-only feedback without an official score or invented prior graded receipt", () => {
    render(
      <TapResultPanel
        result={completedAttempt("practice")}
        points={null}
        originalPoints={null}
        onRetry={() => undefined}
        onContinue={() => undefined}
        retryLabel="Chơi lại"
        continueLabel="Bài tiếp theo"
        practiceLabel="Chơi thử — Timing Accuracy tham khảo, không ghi điểm"
      />
    );
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("25%");
    expect(screen.queryByTestId("tap-points")).toBeNull();
    expect(screen.queryByText(/Điểm đã ghi từ bài chấm trước/)).toBeNull();
    expect(
      screen.getByText(/Chơi thử không tạo câu trả lời chấm điểm/)
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Chơi lại" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bài tiếp theo" })).toBeTruthy();
  });

  it("presents actual matcher statuses, Formula B accuracy, and the shared exercise points", () => {
    const result = completedAttempt();
    expect(result.evaluation?.targetResults.map(item => item.status)).toEqual([
      "matched",
      "early",
      "late",
      "missing",
    ]);
    expect(result.evaluation?.tapResults.map(item => item.status)).toEqual([
      "matched",
      "early",
      "late",
      "extra",
    ]);
    expect(result.evaluation?.accuracyPercent).toBe(25);
    expect(summarizeTapResult(result)).toMatchObject({
      accuracyPercent: 25,
      counts: {
        matched: 1,
        early: 1,
        late: 1,
        missing: 1,
        extra: 1,
        n: 4,
        k: 4,
      },
      notApplicable: false,
    });

    const view = render(
      <TapResultPanel
        result={result}
        points={0}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );

    expect(screen.getByTestId("tap-result")).toBeTruthy();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("25%");
    expect(screen.getByTestId("tap-count-matched").textContent).toBe("1");
    expect(screen.getByTestId("tap-count-early").textContent).toBe("1");
    expect(screen.getByTestId("tap-count-late").textContent).toBe("1");
    expect(screen.getByTestId("tap-count-missing").textContent).toBe("1");
    expect(screen.getByTestId("tap-count-extra").textContent).toBe("1");
    expect(screen.getByTestId("tap-points").textContent).toBe("+0 điểm");
    expect(screen.getAllByText(/ngoài vùng khớp/)).toHaveLength(2);
    expect(screen.getByText(/Sớm 30 ms/)).toBeTruthy();
    expect(screen.getByText(/Muộn 40 ms/)).toBeTruthy();
    expect(screen.getByText(/Có 1 lần chạm thừa/)).toBeTruthy();
    expect(screen.getByText(/không tính thành “khớp”/)).toBeTruthy();

    view.rerender(
      <TapResultPanel
        result={result}
        points={10}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );
    expect(screen.getByTestId("tap-points").textContent).toBe("+10 điểm");
  });

  it("shows the explicit ungraded message for technical aborts without inventing metrics or points", () => {
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
    expect(screen.queryByTestId("tap-count-matched")).toBeNull();
    expect(screen.queryByText("10%")).toBeNull();
    expect(screen.getByTestId("tap-points").textContent).toBe("Chưa ghi điểm");
  });

  it("treats N = 0 as not applicable instead of displaying a zero-percent result", () => {
    const evaluation = matchTapRhythm([], []);
    const result = sealTapAttempt({
      exerciseId: "empty-fixture",
      generation: 3,
      mode: "graded",
      status: "completed",
      reason: null,
      targetTicks: [],
      taps: [],
      evaluation,
      accuracyPercent: null,
      rawCaptures: [],
    });

    render(
      <TapResultPanel
        result={result}
        points={null}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );

    expect(
      screen.getByText("Bài chưa được chấm — đây không phải lỗi của bạn.")
    ).toBeTruthy();
    expect(
      screen.getByText(/N = 0.*Timing Accuracy không áp dụng/)
    ).toBeTruthy();
    expect(screen.queryByTestId("tap-accuracy")).toBeNull();
    expect(screen.queryByTestId("tap-count-matched")).toBeNull();
    expect(screen.getByTestId("tap-points").textContent).toBe("Chưa ghi điểm");
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("keeps a practice result separate from the original graded points", () => {
    const result = completedAttempt("practice");
    render(
      <TapResultPanel
        result={result}
        points={null}
        originalPoints={10}
        onRetry={() => undefined}
        onContinue={() => undefined}
      />
    );

    expect(screen.getByText("Luyện lại — không ghi thêm điểm")).toBeTruthy();
    expect(
      screen.getByText(/Điểm đã ghi từ bài chấm trước: \+10 điểm/)
    ).toBeTruthy();
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("25%");
    expect(screen.queryByTestId("tap-points")).toBeNull();
  });

  it("shows Lesson diagnostic feedback without graded points or a fictitious original score", () => {
    render(
      <TapResultPanel
        result={completedAttempt("practice")}
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
    expect(screen.getByTestId("tap-accuracy").textContent).toBe("25%");
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
        points={10}
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
        points={10}
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

// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import RhythmTrainingPage from "./RhythmTrainingPage";
import { isExerciseKindAllowed } from "../curriculum/curriculum";
import { generateRhythmPattern } from "../generation/generator";
import { QUIZ_QUESTION_BANK } from "../quiz/questionBank";

const scenario = vi.hoisted(() => ({ mode: "normal" }));
vi.mock("../components/RhythmNotation", () => ({
  RhythmNotation: ({
    pattern,
    onReady,
  }: {
    pattern: { id: string };
    onReady?: (ready: boolean) => void;
  }) => {
    React.useEffect(() => {
      onReady?.(scenario.mode !== "notation-error");
    }, [pattern, onReady]);
    return (
      <div
        data-testid="notation-jsdom-placeholder"
        data-pattern-id={pattern.id}
      >
        {scenario.mode === "notation-error"
          ? "Chưa thể hiển thị ký âm"
          : "Ký âm được mock riêng trong jsdom"}
      </div>
    );
  },
}));
vi.mock("../components/TapResultNotation", () => ({
  TapResultNotation: ({
    result,
    liveRounds,
    currentRound,
    isLive = false,
  }: {
    result: { status: string } | null;
    liveRounds?: readonly ({ status: string } | null)[];
    currentRound?: 1 | 2 | null;
    isLive?: boolean;
  }) => (
    <div
      data-testid="tap-result-notation"
      data-live={String(isLive)}
      data-current-round={currentRound ?? "none"}
      data-round-one-status={liveRounds?.[0]?.status ?? "none"}
    >
      {isLive ? "Live round markers" : `Receipt: ${result?.status ?? "none"}`}
    </div>
  ),
}));
vi.mock("../components/VisualMetronome", () => ({
  VisualMetronome: () => <div data-testid="visual-metronome-mock" />,
}));
vi.mock("../exercises/tapRhythm", async importOriginal => {
  const actual =
    await importOriginal<typeof import("../exercises/tapRhythm")>();
  return {
    ...actual,
    generateTapRhythmExercise: (
      input: Parameters<typeof actual.generateTapRhythmExercise>[0]
    ) => {
      if (scenario.mode === "generator-error")
        throw new Error("Không thể tạo bài theo cấu hình");
      if (scenario.mode === "empty") {
        // Canonically valid defensive N=0 data, not generator-approved content:
        // the normal exercise factory correctly rejects all-rest exercises.
        const pattern = {
          id: "ui-empty-2-4",
          meter: { numerator: 2, denominator: 4 },
          tempo: { pulseBpm: input.pulseBpm ?? 72 },
          measures: [
            {
              id: "empty-bar",
              segments: [
                {
                  id: "rest1",
                  kind: "rest",
                  duration: { denominator: 4, dots: 0 },
                },
                {
                  id: "rest2",
                  kind: "rest",
                  duration: { denominator: 4, dots: 0 },
                },
              ],
            },
          ],
        } as const;
        return Object.freeze({
          id: "defensive-empty-ui",
          kind: "tap-rhythm" as const,
          track: 3 as const,
          section: "practice" as const,
          pattern,
          gridTicks: 240 as const,
          targets: actual.createTapTargets(pattern, 240),
        });
      }
      return actual.generateTapRhythmExercise(input);
    },
  };
});

beforeEach(() => {
  scenario.mode = "normal";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function showPage() {
  const location = memoryLocation({ path: "/rhythm-training" });
  return render(
    <Router hook={location.hook}>
      <RhythmTrainingPage />
    </Router>
  );
}

async function openTapSetup() {
  const chooser = screen.getByTestId("screen-chooser");
  if (!chooser.hasAttribute("hidden")) {
    await userEvent.click(
      within(chooser).getByRole("button", { name: /Tap Rhythm/ })
    );
  }
  await waitFor(() =>
    expect(screen.getByTestId("screen-setup").hasAttribute("hidden")).toBe(
      false
    )
  );
}

async function openExercise(mode: "Chơi thử" | "Chấm điểm" = "Chơi thử") {
  await openTapSetup();
  await userEvent.click(
    screen.getByRole("button", { name: new RegExp(`^${mode}`) })
  );
  await waitFor(() =>
    expect(
      screen.getByTestId("screen-practice").getAttribute("hidden")
    ).toBeNull()
  );
}

async function openPracticeWorkspace(
  mode: "Chơi thử" | "Chấm điểm" = "Chơi thử"
) {
  await openExercise(mode);
  await screen.findByTestId("rhythm-workspace");
}

describe("Rhythm learner page: three screens and real controller integration", () => {
  it("starts at a dedicated chooser and projects setup, practice, and results for both selected flows", async () => {
    const user = userEvent.setup();
    showPage();
    const chooser = screen.getByTestId("screen-chooser");
    expect(chooser.hasAttribute("hidden")).toBe(false);
    expect(within(chooser).getAllByRole("button")).toHaveLength(2);
    expect(
      within(chooser).getByText("Luyện gõ tiết tấu theo ký âm.")
    ).not.toBeNull();
    expect(
      within(chooser).getByText("Trắc nghiệm kiến thức nhịp điệu.")
    ).not.toBeNull();
    expect(screen.queryByTestId("rhythm-step-progress")).toBeNull();
    expect(within(chooser).queryByLabelText("Tempo (BPM)")).toBeNull();
    expect(
      within(chooser).queryByRole("button", { name: /^Level 1 —/ })
    ).toBeNull();

    await user.click(
      within(chooser).getByRole("button", { name: /Tap Rhythm/ })
    );
    expect(screen.getByTestId("screen-setup").hasAttribute("hidden")).toBe(
      false
    );
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("setup");
    expect(
      within(screen.getByTestId("screen-setup")).queryByRole("button", {
        name: /Rhythm Quiz/,
      })
    ).toBeNull();
    const setup = screen.getByTestId("screen-setup");
    const setupHeading = within(setup).getByRole("heading", {
      name: "Thiết lập Tap Rhythm",
    });
    const headingActions = screen.getByTestId("rhythm-heading-actions");
    const setupReturn = screen.getByRole("button", {
      name: "Quay về Rhythm Training",
    });
    const setupTitleRow = setup.querySelector(".rhythm-setup-title-row");
    expect(
      within(headingActions).queryByRole("button", {
        name: "Quay về Rhythm Training",
      })
    ).toBeNull();
    expect(setupTitleRow?.firstElementChild).toBe(setupHeading);
    expect(setupTitleRow?.lastElementChild).toBe(setupReturn);
    await user.click(
      setupReturn
    );
    expect(screen.getByTestId("screen-chooser").hasAttribute("hidden")).toBe(
      false
    );
    expect(screen.queryByTestId("rhythm-step-progress")).toBeNull();

    await user.click(
      within(screen.getByTestId("screen-chooser")).getByRole("button", {
        name: /Rhythm Quiz/,
      })
    );
    const quiz = screen.getByTestId("screen-quiz");
    expect(quiz.hasAttribute("hidden")).toBe(false);
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("setup");
    expect(within(quiz).queryByLabelText(/BPM|metronome|Tap/i)).toBeNull();
    const autoNextSwitch = within(quiz).getByRole("switch", {
      name: "Tự động chuyển câu hỏi (Auto Next)",
    });
    expect(autoNextSwitch.getAttribute("aria-checked")).toBe("true");
    await user.click(autoNextSwitch);
    expect(autoNextSwitch.getAttribute("aria-checked")).toBe("false");
    await user.click(
      within(quiz).getByRole("button", { name: "Bắt đầu Quiz" })
    );
    const quizPracticeState = window.history.state;
    expect(quizPracticeState.rhythmTrainingScreen).toBe("quiz");
    expect(quizPracticeState.rhythmTrainingQuizScreen).toBe("quiz");
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("practice");
    expect(
      within(quiz).getByRole("progressbar", { name: "Tiến độ câu hỏi" })
    ).not.toBeNull();

    const available = QUIZ_QUESTION_BANK["1"];
    const seen = new Set<string>();
    const plannedCount = Math.min(10, available.length);
    for (let index = 0; index < plannedCount; index += 1) {
      const prompt =
        quiz.querySelector(".rhythm-quiz-question")?.textContent ?? "";
      const question = available.find(item => item.prompt === prompt);
      expect(question).toBeTruthy();
      expect(seen.has(question!.id)).toBe(false);
      seen.add(question!.id);
      const correctButton = Array.from(
        quiz.querySelectorAll<HTMLButtonElement>(".rhythm-quiz-option")
      ).find(
        button =>
          button.getAttribute("data-option-id") === question!.correctOptionId
      );
      expect(correctButton).toBeTruthy();
      await user.click(correctButton!);
      await user.click(
        within(quiz).getByRole("button", {
          name: index === plannedCount - 1 ? "Xem tổng kết" : "Câu tiếp theo",
        })
      );
    }
    expect(
      within(quiz).getByRole("heading", { name: "Tổng kết Quiz" })
    ).not.toBeNull();
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("result");
    const quizSummaryState = window.history.state;
    expect(quizSummaryState.rhythmTrainingQuizScreen).toBe("summary");

    window.dispatchEvent(
      new PopStateEvent("popstate", { state: quizPracticeState })
    );
    await waitFor(() =>
      expect(
        screen
          .getByTestId("rhythm-step-progress")
          .getAttribute("data-current-step")
      ).toBe("practice")
    );
    window.dispatchEvent(
      new PopStateEvent("popstate", { state: quizSummaryState })
    );
    await waitFor(() =>
      expect(
        screen
          .getByTestId("rhythm-step-progress")
          .getAttribute("data-current-step")
      ).toBe("result")
    );
    await user.click(
      within(quiz).getByRole("button", {
        name: "Quay về Rhythm Training",
      })
    );
    expect(screen.getByTestId("screen-chooser").hasAttribute("hidden")).toBe(
      false
    );
    expect(screen.queryByTestId("rhythm-step-progress")).toBeNull();
  });

  it("blocks invalid BPM rather than silently opening an old tempo, and accepts both global endpoints", async () => {
    const user = userEvent.setup();
    showPage();
    await openTapSetup();
    const input = screen.getByRole("spinbutton", { name: "Nhập tempo BPM" });
    const play = screen.getByRole("button", {
      name: /^Chơi thử/,
    }) as HTMLButtonElement;
    const grade = screen.getByRole("button", {
      name: /^Chấm điểm/,
    }) as HTMLButtonElement;
    const preview = screen.getByRole("button", {
      name: "Nghe thử metronome",
    }) as HTMLButtonElement;
    for (const value of ["29", "301", ""]) {
      await user.clear(input);
      if (value) await user.type(input, value);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(play.disabled).toBe(true);
      expect(grade.disabled).toBe(true);
      expect(preview.disabled).toBe(true);
      expect(screen.getByRole("alert").textContent).toContain("30 đến 300 BPM");
    }
    for (const value of ["30", "300"]) {
      await user.clear(input);
      await user.type(input, value);
      expect(input.getAttribute("aria-invalid")).toBe("false");
      expect(play.disabled).toBe(false);
      expect(grade.disabled).toBe(false);
      expect(preview.disabled).toBe(false);
    }
    await user.click(play);
    await screen.findByTestId("rhythm-workspace");
    expect(screen.getByTestId("rhythm-workspace").textContent).toContain("300");
  });

  it("offers Tap in Levels 1/2, keeps Bonus practice-only, and exposes no Lesson selector", async () => {
    const user = userEvent.setup();
    showPage();
    expect(screen.getByTestId("screen-chooser").hasAttribute("hidden")).toBe(
      false
    );
    expect(screen.queryByTestId("rhythm-step-progress")).toBeNull();
    await openTapSetup();
    expect(
      (screen.getByRole("button", { name: /^Level 1 —/ }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: /^Level 2 —/ }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(screen.getAllByRole("button", { name: /^Level 6 —/ })).toHaveLength(
      1
    );
    expect(screen.getByTestId("screen-setup").getAttribute("data-screen")).toBe(
      "setup"
    );
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("setup");
    expect(screen.queryByLabelText("Phần học")).toBeNull();
    expect(isExerciseKindAllowed(1, "practice", "tap-rhythm")).toBe(true);
    expect(isExerciseKindAllowed(2, "assessment", "tap-rhythm")).toBe(true);
    expect(isExerciseKindAllowed(6, "assessment", "tap-rhythm")).toBe(true);

    await user.click(screen.getByRole("button", { name: /^Level 1 —/ }));
    expect(
      within(screen.getByLabelText("Nhịp"))
        .getAllByRole("option")
        .map(option => option.textContent)
    ).toEqual(["4/4"]);
    await user.click(screen.getByRole("button", { name: /^Chơi thử/ }));
    expect(
      (await screen.findByTestId("rhythm-workspace")).getAttribute("data-track")
    ).toBe("1");
    expect(
      screen.getByTestId("rhythm-workspace").getAttribute("data-section")
    ).toBe("practice");
    const workspace = screen.getByTestId("rhythm-workspace");
    const zones = Array.from(
      workspace.querySelectorAll<HTMLElement>(".rhythm-practice-zone")
    );
    expect(
      zones.map(zone =>
        [
          "rhythm-info-zone",
          "rhythm-metronome-zone",
          "rhythm-staff-tap-zone",
          "rhythm-controls-zone",
        ].find(className => zone.classList.contains(className))
      )
    ).toEqual([
      "rhythm-info-zone",
      "rhythm-metronome-zone",
      "rhythm-staff-tap-zone",
      "rhythm-controls-zone",
    ]);
    expect(workspace.querySelectorAll(".rhythm-tempo-value")).toHaveLength(1);
    expect(workspace.querySelectorAll(".rhythm-tempo")).toHaveLength(0);
    const staffTapZone = zones[2];
    expect(zones[1].querySelectorAll('[data-testid="rhythm-status"]')).toHaveLength(1);
    expect(zones[3].querySelector('[data-testid="rhythm-status"]')).toBeNull();
    expect(zones[0].querySelector(".rhythm-meta h2")?.textContent).toContain(
      "4/4"
    );
    expect(zones[0].querySelector(".rhythm-mode-badge")?.textContent).toContain(
      "Chơi thử"
    );
    expect(zones[3].querySelectorAll(".rhythm-controls button").length).toBeGreaterThanOrEqual(3);
    const tapTarget = staffTapZone.querySelector(
      '[data-testid="rhythm-tap-surface"]'
    )!;
    expect(tapTarget.previousElementSibling?.getAttribute("data-testid")).toBe(
      "notation-jsdom-placeholder"
    );
    expect(staffTapZone.querySelectorAll(".rhythm-tap-surface")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Thiết lập lại" }));
    await user.click(screen.getByRole("button", { name: /^Level 2 —/ }));
    await user.click(screen.getByRole("button", { name: /^Chơi thử/ }));
    expect(
      (await screen.findByTestId("rhythm-workspace")).getAttribute("data-track")
    ).toBe("2");
    expect(
      screen.getByTestId("rhythm-workspace").getAttribute("data-section")
    ).toBe("practice");
    await user.click(screen.getByRole("button", { name: "Thiết lập lại" }));

    await user.click(screen.getByRole("button", { name: /^Bonus 2\/2 —/ }));
    expect((screen.getByLabelText("Nhịp") as HTMLSelectElement).value).toBe(
      "2/2"
    );
    expect(screen.getByText(/Bonus 2\/2 là luyện tập tùy chọn/)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /^Level 6 —/ }));
    expect(
      within(screen.getByLabelText("Nhịp"))
        .getAllByRole("option")
        .map(option => option.textContent)
    ).toEqual(["3/8", "6/8", "9/8"]);
    expect(
      within(screen.getByLabelText("Nội dung luyện")).queryByRole("option", {
        name: "Phách phức — nhóm ba",
      })
    ).toBeNull();
    expect(screen.queryByLabelText("Phần học")).toBeNull();
  });

  it("opens the independent visual-only Rhythm Quiz from the chooser and returns without entering Tap practice", async () => {
    const user = userEvent.setup();
    showPage();
    await user.click(screen.getByRole("button", { name: /Rhythm Quiz/ }));
    const quiz = screen.getByTestId("screen-quiz");
    expect(quiz.hasAttribute("hidden")).toBe(false);
    expect(
      within(quiz).getByRole("heading", {
        name: "Trắc nghiệm kiến thức nhịp điệu",
      })
    ).not.toBeNull();
    expect(
      within(quiz).queryByLabelText(/metronome|vùng chạm|âm lượng/i)
    ).toBeNull();
    await user.click(
      within(quiz).getByRole("button", { name: "Quay lại Rhythm Training" })
    );
    expect(screen.getByTestId("screen-chooser").hasAttribute("hidden")).toBe(
      false
    );
    expect(screen.queryByTestId("rhythm-step-progress")).toBeNull();
    expect(screen.getByTestId("screen-setup").hasAttribute("hidden")).toBe(
      true
    );
    expect(screen.getByTestId("screen-practice").hasAttribute("hidden")).toBe(
      true
    );
  });

  it("opens one real canonical practice exercise using the selected meter, four bars, practice gate, and explicit BPM", async () => {
    const user = userEvent.setup();
    showPage();
    await openTapSetup();
    expect((screen.getByLabelText("Độ dài") as HTMLSelectElement).value).toBe(
      "2"
    );
    expect(() =>
      generateRhythmPattern({
        level: 3,
        seed: "rhythm-ui-setup-impossible-combined-2/4",
        meter: { numerator: 2, denominator: 4 },
        bars: 1,
        focus: "combined",
      })
    ).toThrow(/infeasible in a single 2\/4 measure with the required rest/);
    const defaultPattern = generateRhythmPattern({
      level: 3,
      seed: "rhythm-ui-setup-default-3-2/4",
      meter: { numerator: 2, denominator: 4 },
      bars: 2,
      focus: "dots",
    });
    expect(
      (screen.getByLabelText("Nhập tempo BPM") as HTMLInputElement).value
    ).toBe(String(defaultPattern.tempo.pulseBpm));
    await user.selectOptions(screen.getByLabelText("Nhịp"), "4/4");
    await user.selectOptions(screen.getByLabelText("Độ dài"), "4");
    await user.clear(screen.getByLabelText("Nhập tempo BPM"));
    await user.type(screen.getByLabelText("Nhập tempo BPM"), "77");
    await openExercise("Chơi thử");

    const workspace = await screen.findByTestId("rhythm-workspace");
    expect(screen.queryByTestId("practice-mode-chooser")).toBeNull();
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("practice");
    expect(
      within(screen.getByTestId("screen-practice")).getByText(
        "Chế độ: Chơi thử"
      )
    ).not.toBeNull();
    expect(screen.getByTestId("rhythm-status").getAttribute("data-phase")).toBe(
      "ready"
    );
    expect(workspace.getAttribute("data-track")).toBe("3");
    expect(workspace.getAttribute("data-section")).toBe("practice");
    expect(workspace.getAttribute("data-exercise-id")).toMatch(/^tap-3-/);
    expect(
      within(workspace).getByRole("heading", { name: /Nhịp 4\/4/ }).textContent
    ).toContain("4 ô nhịp");
    expect(within(workspace).getByText(/4 phách mỗi ô/)).not.toBeNull();
    expect(
      within(workspace).getByText(
        /Tap đầu tiên được chấm cho phách 1 tại downbeat kế tiếp/
      )
    ).not.toBeNull();
    expect(
      within(workspace).queryByText(/Tín hiệu chạm chỉ xác nhận thao tác/)
    ).toBeNull();
    expect(screen.getByTestId("tap-first-tap-guidance").textContent).toContain(
      "kết quả vẫn là Sớm, không phải Chạm thừa hoặc Thiếu phách 1"
    );
    expect(screen.getByTestId("tap-first-tap-guidance").textContent).toContain(
      "Không cần chạm lại phách 1"
    );
    expect(
      (screen.getByLabelText("Âm lượng metronome") as HTMLInputElement).value
    ).toBe("0.8");
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
          .disabled
      ).toBe(false)
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Nghe mẫu (1 lần)",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
    expect(
      screen
        .getByRole("button", { name: /Vùng chạm tiết tấu/ })
        .getAttribute("tabindex")
    ).toBe("0");
  });

  it("uses the real audio-unavailable technical abort receipt without false accuracy or points", async () => {
    const user = userEvent.setup();
    showPage();
    await openPracticeWorkspace("Chấm điểm");
    expect(screen.queryByTestId("practice-mode-chooser")).toBeNull();
    expect(
      within(screen.getByTestId("screen-practice")).getByText(
        "Chế độ: Chấm điểm"
      )
    ).not.toBeNull();
    expect(screen.getByTestId("rhythm-status").getAttribute("data-phase")).toBe(
      "ready"
    );
    expect(screen.queryByTestId("tap-result")).toBeNull();
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("practice");
    await user.click(screen.getByRole("button", { name: "Bắt đầu" }));
    await screen.findByTestId("tap-result");
    expect(
      screen.getByTestId("screen-result").getAttribute("data-screen")
    ).toBe("result");
    expect(screen.getByTestId("rhythm-status").getAttribute("data-phase")).toBe(
      "aborted"
    );
    expect(screen.getByTestId("tap-result").textContent).toMatch(
      /chưa được chấm|chưa chấm/i
    );
    expect(screen.queryByTestId("tap-accuracy")).toBeNull();
    expect(screen.getByTestId("tap-result").textContent).not.toMatch(
      /\d+(?:\.\d+)?%/
    );
    expect(screen.getByTestId("tap-points").textContent).not.toContain("+10");
    expect(screen.getByTestId("tap-result-notation").textContent).toContain(
      "technical-abort"
    );
    expect(
      within(screen.getByTestId("screen-result")).getByTestId(
        "rhythm-total-points"
      ).textContent
    ).toBe("0");
    expect(
      within(screen.getByTestId("screen-result")).getByText("Chế độ: Chấm điểm")
    ).not.toBeNull();
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("result");
    expect(
      screen
        .getByTestId("tap-result-notation")
        .compareDocumentPosition(screen.getByTestId("tap-result")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Quay lại practice" }));
    const workspace = screen.getByTestId("rhythm-workspace");
    expect(
      within(workspace).queryByRole("button", { name: "Chấm điểm" })
    ).toBeNull();
    expect(within(workspace).getByText("Chế độ: Chấm điểm")).not.toBeNull();

    const originalExerciseId = screen
      .getByTestId("rhythm-workspace")
      .getAttribute("data-exercise-id");
    await user.click(screen.getByRole("button", { name: "Thiết lập lại" }));
    await waitFor(() =>
      expect(
        screen.getByTestId("screen-setup").getAttribute("hidden")
      ).toBeNull()
    );
    expect(
      screen
        .getByTestId("rhythm-step-progress")
        .getAttribute("data-current-step")
    ).toBe("setup");
    expect(
      screen.getByTestId("rhythm-workspace").getAttribute("data-exercise-id")
    ).toBe(originalExerciseId);
    expect(screen.getByTestId("tap-result")).not.toBeNull();
  });

  it("retimes the written Practice pattern within 30–300 BPM and blocks invalid values without clamping", async () => {
    const user = userEvent.setup();
    showPage();
    await openPracticeWorkspace("Chơi thử");

    const workspace = screen.getByTestId("rhythm-workspace");
    const originalExerciseId = workspace.getAttribute("data-exercise-id");
    const originalPatternId = screen
      .getByTestId("notation-jsdom-placeholder")
      .getAttribute("data-pattern-id");
    const bpmInput = screen.getByRole("spinbutton", {
      name: "BPM trong Practice",
    }) as HTMLInputElement;
    const bpmRange = screen.getByRole("slider", {
      name: "Tempo Practice (BPM)",
    }) as HTMLInputElement;

    expect(bpmInput.min).toBe("30");
    expect(bpmInput.max).toBe("300");
    expect(bpmRange.min).toBe("30");
    expect(bpmRange.max).toBe("300");
    expect(
      (screen.getByLabelText("Âm lượng metronome") as HTMLInputElement).disabled
    ).toBe(false);

    fireEvent.change(bpmInput, { target: { value: "120" } });
    await waitFor(() => expect(bpmInput.value).toBe("120"));
    expect(bpmRange.value).toBe("120");
    expect(workspace.getAttribute("data-exercise-id")).not.toBe(
      originalExerciseId
    );
    expect(
      screen
        .getByTestId("notation-jsdom-placeholder")
        .getAttribute("data-pattern-id")
    ).not.toBe(originalPatternId);
    expect(screen.getByLabelText("Tempo hiện tại").textContent).toContain(
      "120"
    );

    fireEvent.change(bpmInput, { target: { value: "301" } });
    expect(bpmInput.value).toBe("301");
    expect(bpmInput.getAttribute("aria-invalid")).toBe("true");
    expect(bpmRange.value).toBe("120");
    expect(
      (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(
      "không được tự điều chỉnh"
    );

    fireEvent.change(bpmRange, { target: { value: "300" } });
    await waitFor(() => expect(bpmInput.value).toBe("300"));
    expect(bpmInput.getAttribute("aria-invalid")).toBe("false");
    expect(screen.getByLabelText("Tempo hiện tại").textContent).toContain(
      "300"
    );
    expect(screen.queryByLabelText("Tổng điểm chính thức")).toBeNull();

    const currentExerciseId = workspace.getAttribute("data-exercise-id");
    const skipButton = screen.getByRole("button", { name: "Bỏ qua bài" });
    await user.click(skipButton);
    let dialog = screen.getByRole("dialog", { name: "Xác nhận bỏ qua bài" });
    expect(dialog.textContent).toContain("0 điểm phạt");
    await user.click(within(dialog).getByRole("button", { name: "Hủy" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(skipButton);
    expect(workspace.getAttribute("data-exercise-id")).toBe(currentExerciseId);

    await user.click(skipButton);
    dialog = screen.getByRole("dialog", { name: "Xác nhận bỏ qua bài" });
    await user.click(
      within(dialog).getByRole("button", { name: "Xác nhận bỏ qua" })
    );
    await waitFor(() =>
      expect(workspace.getAttribute("data-exercise-id")).not.toBe(
        currentExerciseId
      )
    );
    expect(bpmInput.value).toBe("300");
    expect(screen.getByTestId("rhythm-status").getAttribute("data-phase")).toBe(
      "ready"
    );
    expect(
      (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(screen.queryByTestId("tap-result")).toBeNull();
  });

  it("confirms a graded unanswered Skip separately, floors official shared total at zero, and leaves mode locked", async () => {
    const user = userEvent.setup();
    showPage();
    await openPracticeWorkspace("Chấm điểm");

    const workspace = screen.getByTestId("rhythm-workspace");
    const originalExerciseId = workspace.getAttribute("data-exercise-id");
    expect(
      within(screen.getByTestId("screen-practice")).getByTestId(
        "rhythm-total-points"
      ).textContent
    ).toBe("0");
    expect(within(workspace).getByText("Chế độ: Chấm điểm")).not.toBeNull();
    expect(
      within(workspace).queryByRole("button", { name: "Chấm điểm" })
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Bỏ qua bài" }));
    const dialog = screen.getByRole("dialog", {
      name: "Xác nhận bỏ qua bài",
    });
    expect(dialog.textContent).toMatch(
      /Chấm điểm chưa nộp\?.*trừ 5 điểm.*max\(0, tổng điểm hiện tại − 5\)/
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Xác nhận bỏ qua" })
    );
    await waitFor(() =>
      expect(workspace.getAttribute("data-exercise-id")).not.toBe(
        originalExerciseId
      )
    );
    expect(
      within(screen.getByTestId("screen-practice")).getByTestId(
        "rhythm-total-points"
      ).textContent
    ).toBe("0");
    expect(screen.getByTestId("rhythm-status").getAttribute("data-phase")).toBe(
      "ready"
    );
    expect(screen.queryByTestId("tap-result")).toBeNull();
    expect(within(workspace).getByText("Chế độ: Chấm điểm")).not.toBeNull();
  });
  it("does not start when notation failed and keeps generator errors actionable", async () => {
    scenario.mode = "notation-error";
    showPage();
    await openPracticeWorkspace("Chơi thử");
    expect(
      (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    cleanup();
    scenario.mode = "generator-error";
    showPage();
    await openExercise("Chơi thử");
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Bắt đầu" })).toBeNull();
    expect(screen.getByRole("button", { name: "Thử mở lại" })).not.toBeNull();
  });

  it("renders defensive N=0 as empty and offers another item without a result or fabricated grade", async () => {
    scenario.mode = "empty";
    showPage();
    await openExercise("Chơi thử");
    await screen.findByText("Không có onset cần chạm");
    expect(screen.getByTestId("rhythm-status").getAttribute("data-phase")).toBe(
      "empty"
    );
    expect(screen.queryByTestId("tap-result")).toBeNull();
    expect(screen.getByTestId("screen-result").hasAttribute("hidden")).toBe(
      true
    );
    expect(
      (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Mở bài khác" })).not.toBeNull();
  });
});

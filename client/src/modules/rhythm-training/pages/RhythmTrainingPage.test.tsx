// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
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
import { policyForLevel } from "../generation/levels";

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
  TapResultNotation: ({ result }: { result: { status: string } }) => (
    <div data-testid="tap-result-notation">Receipt: {result.status}</div>
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

async function openExercise(mode: "Chơi thử" | "Chấm điểm" = "Chơi thử") {
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
  it("blocks invalid BPM rather than silently opening an old tempo, and accepts both global endpoints", async () => {
    const user = userEvent.setup();
    showPage();
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

  it("opens the independent visual-only Rhythm Quiz from Setup and returns without entering Tap practice", async () => {
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
    expect(screen.getByTestId("screen-setup").hasAttribute("hidden")).toBe(
      false
    );
    expect(screen.getByTestId("screen-practice").hasAttribute("hidden")).toBe(
      true
    );
  });

  it("opens one real canonical practice exercise using the selected meter, four bars, practice gate, and explicit BPM", async () => {
    const user = userEvent.setup();
    showPage();
    expect((screen.getByLabelText("Độ dài") as HTMLSelectElement).value).toBe(
      "2"
    );
    const defaultPattern = generateRhythmPattern({
      level: 3,
      seed: "rhythm-ui-setup-default-3-2/4",
      meter: { numerator: 2, denominator: 4 },
      bars: 2,
      focus: policyForLevel(3).defaultFocus,
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
    expect(screen.getByTestId("rhythm-status").textContent).toContain(
      "Chơi thử"
    );
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
    expect(screen.getByTestId("rhythm-status").textContent).toContain(
      "Chấm điểm"
    );
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
      (
        within(workspace).getByRole("button", {
          name: "Chấm điểm",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

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

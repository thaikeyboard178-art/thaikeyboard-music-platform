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

async function openExercise() {
  await userEvent.click(
    screen.getByRole("button", { name: "Áp dụng và mở bài" })
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
  await openExercise();
  await screen.findByTestId("practice-mode-chooser");
  await userEvent.click(
    screen.getByRole("button", { name: new RegExp(`^${mode}`) })
  );
  await screen.findByTestId("rhythm-workspace");
}

describe("Rhythm learner page: three screens and real controller integration", () => {
  it("keeps Levels 1/2 disabled, Bonus practice-only, and removes the section selector while preserving curriculum gates", async () => {
    const user = userEvent.setup();
    showPage();
    expect(
      (screen.getByRole("button", { name: /^Level 1 —/ }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /^Level 2 —/ }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getAllByRole("button", { name: /^Level 6 —/ })).toHaveLength(
      1
    );
    expect(screen.getByTestId("screen-setup").getAttribute("data-screen")).toBe(
      "setup"
    );
    expect(screen.queryByLabelText("Phần học")).toBeNull();
    expect(isExerciseKindAllowed(6, "assessment", "tap-rhythm")).toBe(true);

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
    await openExercise();
    await user.click(screen.getByRole("button", { name: /^Chơi thử/ }));

    const workspace = await screen.findByTestId("rhythm-workspace");
    expect(workspace.getAttribute("data-track")).toBe("3");
    expect(workspace.getAttribute("data-section")).toBe("practice");
    expect(workspace.getAttribute("data-exercise-id")).toMatch(/^tap-3-/);
    expect(
      within(workspace).getByRole("heading", { name: /Nhịp 4\/4/ }).textContent
    ).toContain("4 ô nhịp");
    expect(within(workspace).getByText(/4 phách chính mỗi ô/)).not.toBeNull();
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
      screen
        .getByRole("button", { name: /Vùng chạm tiết tấu/ })
        .getAttribute("tabindex")
    ).toBe("0");
  });

  it("uses the real audio-unavailable technical abort receipt without false accuracy or points", async () => {
    const user = userEvent.setup();
    showPage();
    await openPracticeWorkspace("Chấm điểm");
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
    await userEvent.click(
      screen.getByRole("button", { name: "Áp dụng và mở bài" })
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Bắt đầu" })).toBeNull();
    expect(screen.getByRole("button", { name: "Thử mở lại" })).not.toBeNull();
  });

  it("renders defensive N=0 as empty and offers another item without a result or fabricated grade", async () => {
    scenario.mode = "empty";
    showPage();
    await openExercise();
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

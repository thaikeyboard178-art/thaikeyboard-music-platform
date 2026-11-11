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
          tempo: { pulseBpm: 72 },
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
    screen.getByRole("button", { name: "Mở bài Tap Rhythm" })
  );
  await screen.findByRole("region", { name: "Bài tập Tap Rhythm" });
}

describe("Phase5 learner Page curriculum and actual controller integration", () => {
  it("keeps Levels1/2 disabled and exposes one Level6 unit plus optional Practice-only Bonus", async () => {
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
    await user.click(screen.getByRole("button", { name: /^Bonus 2\/2 —/ }));
    const sections = within(screen.getByLabelText("Phần học")).getAllByRole(
      "option"
    );
    expect(sections.map(option => option.getAttribute("value"))).toEqual([
      "practice",
    ]);
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
  });
  it("opens a real canonical exercise through the existing generator with exact selected meter/section and large tap UI", async () => {
    const user = userEvent.setup();
    showPage();
    await user.selectOptions(screen.getByLabelText("Nhịp"), "4/4");
    await user.selectOptions(screen.getByLabelText("Độ dài"), "2");
    await user.selectOptions(screen.getByLabelText("Phần học"), "assessment");
    await openExercise();
    const workspace = screen.getByRole("region", {
      name: "Bài tập Tap Rhythm",
    });
    expect(workspace.getAttribute("data-track")).toBe("3");
    expect(workspace.getAttribute("data-section")).toBe("assessment");
    expect(workspace.getAttribute("data-exercise-id")).toMatch(/^tap-3-/);
    expect(
      within(workspace).getByRole("heading", { name: /Nhịp 4\/4/ }).textContent
    ).toContain("2 ô nhịp");
    expect(within(workspace).getByText(/4 phách chính mỗi ô/)).not.toBeNull();
    expect(
      screen.getByText(/không phải bộ Assessment tổng hợp/)
    ).not.toBeNull();
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
  it("uses real Phase4B audio-unavailable abort and shows ungraded rather than a false zero percentage", async () => {
    const user = userEvent.setup();
    showPage();
    await openExercise();
    await user.click(screen.getByRole("button", { name: "Bắt đầu" }));
    await screen.findByTestId("tap-result");
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
    expect(
      (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
  it("does not start when notation failed and renders an actionable generator error", async () => {
    scenario.mode = "notation-error";
    showPage();
    await openExercise();
    expect(
      (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    cleanup();
    scenario.mode = "generator-error";
    showPage();
    await userEvent.click(
      screen.getByRole("button", { name: "Mở bài Tap Rhythm" })
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Bắt đầu" })).toBeNull();
    expect(screen.getByRole("button", { name: "Thử mở lại" })).not.toBeNull();
  });
  it("renders defensive N0 empty state from canonical all-rest target data without a fabricated grade", async () => {
    scenario.mode = "empty";
    showPage();
    await openExercise();
    expect(screen.getByTestId("rhythm-status").getAttribute("data-phase")).toBe(
      "empty"
    );
    expect(screen.getByText("Không có onset cần chạm")).not.toBeNull();
    expect(screen.queryByTestId("tap-result")).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Bắt đầu" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Mở bài khác" })).not.toBeNull();
  });
});

// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteReadingPage from "./NoteReadingPage";
import { PREFERENCES_KEY } from "../services/preferences";

beforeEach(() => localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ autoAdvance: false, ledgerRange: { above: 1, below: 1 } })));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => ({ measureText: (text: string) => ({ width: text.length * 8 }) }) });

describe("QA session UI regressions", () => {
  it("keeps the daily session date fixed across local midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 10, 23, 59, 59));
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Thử thách hôm nay/ }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    expect(screen.getByText(/2026-11-10/).textContent).toContain("2026-11-10");
    vi.setSystemTime(new Date(2026, 10, 11, 0, 0, 1));
    await user.keyboard("1");
    expect(screen.getByText(/2026-11-10/).textContent).toContain("2026-11-10");
    expect(screen.queryByText(/2026-11-11/)).toBeNull();
  });

  it("does not bypass piano pitch and octave selection with multiple-choice number shortcuts", async () => {
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Piano ảo/ }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    await user.keyboard("1234567");
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("0");
    await user.click(screen.getAllByRole("button", { name: /Phím La thăng/ })[0]);
    expect((await screen.findByRole("status")).textContent).toContain("Không trừ điểm");
  });

  it("retains the current question during feedback, moves focus and rejects duplicate score", async () => {
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    expect(document.activeElement?.classList.contains("note-answer")).toBe(true);
    await user.keyboard("1");
    expect(screen.getByText("Câu 1")).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Câu tiếp/ }));
    const score = document.querySelector(".progress-copy")?.textContent;
    await user.keyboard("111");
    expect(document.querySelector(".progress-copy")?.textContent).toBe(score);
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("1");
    await user.click(screen.getByRole("button", { name: /Câu tiếp/ }));
    expect(screen.getByText("Câu 2")).not.toBeNull();
    expect(document.activeElement?.classList.contains("note-answer")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Quay lại thiết lập" }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Đọc nốt nhạc", level: 1 }));
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe("Đọc nốt");
  });

  it("shows current-question response time rather than the session average", async () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    now = 1000;
    await user.keyboard("1");
    await user.click(screen.getByRole("button", { name: /Câu tiếp/ }));
    now = 1100;
    await user.keyboard("1");
    expect(document.querySelector(".timer-card strong")?.textContent).toBe("0.1s");
  });

  it.each(["Thử thách", "Thử thách hôm nay"])("does not expose early completion for %s", async (mode) => {
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: new RegExp(`^${mode}(?! hôm nay)`) }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    await user.keyboard("1");
    expect(screen.queryByRole("button", { name: /Kết thúc lượt/ })).toBeNull();
    expect(document.querySelector(".result-view")).toBeNull();
  });

  it("records only one zero-point speed timeout and restarts its timer on next", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Luyện tốc độ/ }));
    await user.click(screen.getByRole("button", { name: "3 giây" }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    await act(async () => { vi.advanceTimersByTime(3200); });
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("1 / 10");
    expect(screen.getByText("0 điểm")).not.toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Không trừ điểm");
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("1 / 10");
    await user.click(screen.getByRole("button", { name: /Câu tiếp/ }));
    expect(document.querySelector(".timer-card strong")?.textContent).toBe("3s");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("completes daily only after ten answers, stores aggregate progress and resets on retry", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Thử thách hôm nay/ }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    for (let index = 0; index < 10; index++) {
      await user.keyboard("1");
      if (index < 9) {
        expect(document.querySelector(".result-view")).toBeNull();
        await user.click(screen.getByRole("button", { name: /Câu tiếp/ }));
      }
    }
    expect(screen.getByRole("status")).not.toBeNull();
    expect(document.querySelector(".result-view")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Xem kết quả/ }));
    expect(screen.getByRole("heading", { name: "Kết quả luyện tập" })).not.toBeNull();
    const values = Object.fromEntries([...document.querySelectorAll(".result-stats > div")].map(node => [node.querySelector("span")?.textContent, Number(node.querySelector("strong")?.textContent)]));
    expect(values["Tổng số câu"]).toBe(10);
    expect(values["Trả lời đúng"] + values["Cần luyện thêm"]).toBe(10);
    expect(values["Điểm tích lũy"]).toBe(values["Trả lời đúng"] * 10);
    expect(document.activeElement?.id).toBe("result-title");
    const saved = JSON.parse(localStorage.getItem("thaikeyboard-music-training-progress-v1")!);
    expect(saved).toMatchObject({ sessionsCompleted: 1, questionsAnswered: 10, correctAnswers: values["Trả lời đúng"] });
    await user.click(screen.getByRole("button", { name: /Luyện lại/ }));
    expect(screen.getByText("0 điểm")).not.toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("0 / 10");
    expect(JSON.parse(localStorage.getItem("thaikeyboard-music-training-progress-v1")!).sessionsCompleted).toBe(1);
  });
});

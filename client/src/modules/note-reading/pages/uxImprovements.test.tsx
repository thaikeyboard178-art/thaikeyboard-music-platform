// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteReadingPage from "./NoteReadingPage";
import { NOTE_SOLFEGE, noteAtDiatonicPosition } from "../notation/musicTheory";
import { PREFERENCES_KEY } from "../services/preferences";
import type { AnswerMethod, Clef } from "../types";

// React Testing Library's default async wrapper checks Jest, not Vitest timers.
// userEvent already wraps events in act; timer advances below are explicit act.
configure({ asyncWrapper: async (callback) => callback() });
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => ({ measureText: (text: string) => ({ width: text.length * 8 }) }) });
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });
const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
async function wait(ms: number) { await act(async () => { vi.advanceTimersByTime(ms); }); }
function currentNote() {
  const host = document.querySelector<HTMLElement>(".notation-host")!;
  return noteAtDiatonicPosition(host.dataset.clef as Clef, Number(host.dataset.position));
}
async function answer(learner: ReturnType<typeof user>, method: AnswerMethod, correct = true) {
  const note = currentNote();
  if (method === "piano") {
    const button = correct ? screen.getByRole("button", { name: `Phím ${NOTE_SOLFEGE[note.letter]} ${note.octave}` }) : screen.getAllByRole("button", { name: /Phím Đô thăng/ })[0];
    await learner.click(button);
  } else {
    const letter = correct ? note.letter : note.letter === "C" ? "D" : "C";
    await learner.click(screen.getByRole("button", { name: `${NOTE_SOLFEGE[letter]} (${letter})` }));
  }
}
async function start(method: AnswerMethod = "multiple-choice", enabled = true, mode = "Luyện tự do") {
  const learner = user();
  render(<NoteReadingPage />);
  if (!enabled) await learner.click(screen.getByRole("switch", { name: "Tự động chuyển câu tiếp theo" }));
  await learner.click(screen.getByRole("button", { name: new RegExp(`^${mode}(?! hôm nay)`) }));
  if (method === "piano") await learner.click(screen.getByRole("button", { name: /Piano ảo/ }));
  await learner.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
  return learner;
}

describe("auto-advance flow", () => {
  for (const method of ["multiple-choice", "piano"] as const) {
    for (const correct of [true, false]) {
      it(`${method} ON: immediate score/feedback then exactly one transition at 900ms (${correct})`, async () => {
        const learner = await start(method);
        await answer(learner, method, correct);
        expect(screen.getByRole("status").textContent).toContain(correct ? "+10 điểm" : "Không trừ điểm");
        expect(screen.getByText(`${correct ? 10 : 0} điểm`)).not.toBeNull();
        expect(document.querySelectorAll(".answer-is-correct").length).toBeGreaterThan(0);
        expect(screen.getByText("Câu 1")).not.toBeNull();
        await wait(899);
        expect(screen.getByText("Câu 1")).not.toBeNull();
        await wait(1);
        expect(screen.getByText("Câu 2")).not.toBeNull();
        expect(screen.queryByRole("status")).toBeNull();
        expect(document.querySelector(".side-stat strong")?.textContent).toBe("1");
        await wait(2000);
        expect(screen.getByText("Câu 2")).not.toBeNull();
      });
    }
    it(`${method} OFF: feedback remains until manual continuation`, async () => {
      const learner = await start(method, false);
      await answer(learner, method);
      await wait(5000);
      expect(screen.getByText("Câu 1")).not.toBeNull();
      expect(screen.getByRole("status")).not.toBeNull();
      await learner.click(screen.getByRole("button", { name: /Câu tiếp theo/ }));
      expect(screen.getByText("Câu 2")).not.toBeNull();
    });
  }

  it.each(["multiple-choice", "piano"] as const)("accepts touchscreen pointer answer in %s", async (method) => {
    const learner = await start(method);
    const note = currentNote();
    const name = method === "piano" ? `Phím ${NOTE_SOLFEGE[note.letter]} ${note.octave}` : `${NOTE_SOLFEGE[note.letter]} (${note.letter})`;
    const button = screen.getByRole("button", { name });
    await learner.pointer([{ keys: "[TouchA>]", target: button }, { keys: "[/TouchA]", target: button }]);
    expect(screen.getByRole("status").textContent).toContain("+10 điểm");
    await wait(900);
    expect(screen.getByText("Câu 2")).not.toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("1");
  });

  it("manual next cancels the old timer and does not move a newly answered question early", async () => {
    const learner = await start();
    await answer(learner, "multiple-choice");
    await wait(500);
    await learner.click(screen.getByRole("button", { name: /Câu tiếp theo/ }));
    await answer(learner, "multiple-choice");
    await wait(400);
    expect(screen.getByText("Câu 2")).not.toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("2");
    expect(screen.getByText("20 điểm")).not.toBeNull();
    await wait(500);
    expect(screen.getByText("Câu 3")).not.toBeNull();
  });

  it("blocks keyboard duplicate submissions and duplicate manual transitions", async () => {
    const learner = await start();
    await answer(learner, "multiple-choice");
    await learner.keyboard("1234567");
    expect(screen.getByText("10 điểm")).not.toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("1");
    const next = screen.getByRole("button", { name: /Câu tiếp theo/ });
    act(() => { next.click(); next.click(); });
    expect(screen.getByText("Câu 2")).not.toBeNull();
    await wait(2000);
    expect(screen.getByText("Câu 2")).not.toBeNull();
  });

  it("never advances unanswered questions and blocks same-render answer duplicates", async () => {
    const learner = await start();
    await wait(3000);
    expect(screen.getByText("Câu 1")).not.toBeNull();
    expect(screen.getByText("0 điểm")).not.toBeNull();
    const note = currentNote();
    const button = screen.getByRole("button", { name: `${NOTE_SOLFEGE[note.letter]} (${note.letter})` });
    act(() => { button.click(); button.click(); });
    expect(screen.getByText("10 điểm")).not.toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("1");
    await wait(900);
    expect(screen.getByText("Câu 2")).not.toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("1");
  });

  it("turning OFF cancels pending feedback advance; turning ON starts a fresh 900ms", async () => {
    const learner = await start();
    await answer(learner, "multiple-choice");
    await wait(500);
    await learner.click(screen.getByRole("switch"));
    await wait(5000);
    expect(screen.getByText("Câu 1")).not.toBeNull();
    await learner.click(screen.getByRole("switch"));
    await wait(899);
    expect(screen.getByText("Câu 1")).not.toBeNull();
    await wait(1);
    expect(screen.getByText("Câu 2")).not.toBeNull();
  });

  it("reset with pending timer cannot advance the fresh session", async () => {
    const learner = await start();
    await answer(learner, "multiple-choice");
    await wait(500);
    await learner.click(screen.getByRole("button", { name: "Quay lại thiết lập" }));
    await learner.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    await wait(1000);
    expect(screen.getByText("Câu 1")).not.toBeNull();
    expect(screen.getByText("0 điểm")).not.toBeNull();
    expect(document.querySelector(".side-stat strong")?.textContent).toBe("0");
  });

  it("unmount while feedback is pending removes its timer", async () => {
    const learner = await start();
    await answer(learner, "multiple-choice");
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    await wait(2000);
    expect(document.querySelector(".exercise-workspace")).toBeNull();
  });

  it("ending a free session cancels a pending auto timer", async () => {
    const learner = await start();
    await answer(learner, "multiple-choice");
    await learner.click(screen.getByRole("button", { name: /Kết thúc lượt/ }));
    expect(screen.getByRole("heading", { name: "Kết quả luyện tập" })).not.toBeNull();
    await wait(2000);
    expect(document.querySelector(".result-view")).not.toBeNull();
    await learner.click(screen.getByRole("button", { name: /Luyện lại/ }));
    await wait(1000);
    expect(screen.getByText("Câu 1")).not.toBeNull();
  });

  for (const [mode, method] of [["Thử thách", "multiple-choice"], ["Thử thách hôm nay", "multiple-choice"], ["Thử thách", "piano"], ["Thử thách hôm nay", "piano"]] as const) {
    for (const enabled of [true, false]) {
      it(`${mode} ${method} final feedback is never skipped, auto=${enabled}`, async () => {
        const learner = await start(method, enabled, mode);
        for (let index = 1; index <= 10; index++) {
          await answer(learner, method);
          if (index < 10) await learner.click(screen.getByRole("button", { name: /Câu tiếp theo/ }));
        }
        expect(screen.getByText("Câu 10 / 10")).not.toBeNull();
        expect(screen.getByRole("status").textContent).toContain("+10 điểm");
        expect(screen.getByText("100 điểm")).not.toBeNull();
        expect(document.querySelector(".result-view")).toBeNull();
        if (enabled) {
          await wait(899);
          expect(document.querySelector(".result-view")).toBeNull();
          await wait(1);
        } else {
          await wait(5000);
          expect(document.querySelector(".result-view")).toBeNull();
          await learner.click(screen.getByRole("button", { name: /Xem kết quả/ }));
        }
        expect(screen.getByRole("heading", { name: "Kết quả luyện tập" })).not.toBeNull();
        expect(document.querySelector(".result-score strong")?.textContent).toBe("100%");
      });
    }
  }
});

describe("ledger setup and persistence", () => {
  it.each(["treble", "bass", "mixed"] as const)("passes custom4/0 through the full %s page into VexFlow and answer validation", async (clef) => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    const learner = user();
    render(<NoteReadingPage />);
    const label = clef === "treble" ? "Khóa Sol" : clef === "bass" ? "Khóa Fa" : "Xen kẽ";
    await learner.click(screen.getByRole("button", { name: new RegExp(label) }));
    await learner.selectOptions(screen.getByLabelText("Dòng phụ phía trên"), "4");
    await learner.selectOptions(screen.getByLabelText("Dòng phụ phía dưới"), "0");
    await learner.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    expect(document.querySelector<HTMLElement>(".notation-host")?.dataset.position).toBe("16");
    expect(Number(document.querySelector(".vf-notehead text")?.getAttribute("y"))).toBe(38);
    expect(currentNote().clef).toBe(clef === "mixed" ? "bass" : clef);
    await answer(learner, "multiple-choice");
    expect(screen.getByText("10 điểm")).not.toBeNull();
  });

  it("defaults1/1, accepts independent4/2, preserves choices and supports staff-only", async () => {
    const learner = user();
    const { unmount } = render(<NoteReadingPage />);
    expect((screen.getByLabelText("Dòng phụ phía trên") as HTMLSelectElement).value).toBe("1");
    expect((screen.getByLabelText("Dòng phụ phía dưới") as HTMLSelectElement).value).toBe("1");
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    await learner.selectOptions(screen.getByLabelText("Dòng phụ phía trên"), "4");
    await learner.selectOptions(screen.getByLabelText("Dòng phụ phía dưới"), "2");
    await learner.click(screen.getByRole("switch"));
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY)!);
    expect(saved).toEqual({ autoAdvance: false, ledgerRange: { above: 4, below: 2 } });
    unmount();
    render(<NoteReadingPage />);
    expect((screen.getByLabelText("Dòng phụ phía trên") as HTMLSelectElement).value).toBe("4");
    expect((screen.getByLabelText("Dòng phụ phía dưới") as HTMLSelectElement).value).toBe("2");
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    await learner.click(screen.getByRole("button", { name: /Chỉ trong khuông/ }));
    expect((screen.getByLabelText("Dòng phụ phía trên") as HTMLSelectElement).value).toBe("0");
    expect((screen.getByLabelText("Dòng phụ phía dưới") as HTMLSelectElement).value).toBe("0");
  });
});

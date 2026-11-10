// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Home from "./Home";
import { PROGRESS_KEY } from "@/features/training/progress";
afterEach(() => { cleanup(); localStorage.clear(); });

it("places the labeled Mi4 landing illustration on the treble bottom staff line", () => {
  render(<Home />);
  const lines = [...document.querySelectorAll(".hero-staff-lines line")];
  const bottom = Math.max(...lines.map(line => Number(line.getAttribute("y1"))));
  expect(lines).toHaveLength(5);
  expect(Number(document.querySelector(".hero-notehead")?.getAttribute("cy"))).toBe(bottom);
  expect(document.querySelector(".hero-note-name")?.textContent).toBe("Mi₄");
});

it("shows all three modules but only Note Reading has an enabled lesson action", () => {
  render(<Home />);
  const notes = screen.getByRole("article", { name: "Đọc nốt nhạc" });
  expect(within(notes).getByRole("link", { name: /Mở bài học/ }).getAttribute("href")).toBe("/note-reading");
  for (const name of ["Luyện tiết tấu", "Nhận diện hợp âm"]) {
    const card = screen.getByRole("article", { name });
    expect(within(card).getByText("Coming Soon")).not.toBeNull();
    expect(within(card).queryByRole("link")).toBeNull();
    expect(within(card).queryByRole("button")).toBeNull();
  }
});

it("preserves legacy totals but does not present them as invented per-module progress", () => {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ sessionsCompleted: 2, questionsAnswered: 20, correctAnswers: 15, lastSessionId: "legacy" }));
  render(<Home />);
  const summary = screen.getByLabelText("Tiến trình luyện tập tổng hợp");
  expect(summary.textContent).toContain("20");
  expect(summary.textContent).toContain("2 lượt hoàn thành");
  expect(summary.textContent).toContain("75%");
  for (const card of screen.getAllByRole("article")) expect(card.contains(summary)).toBe(false);
});

it("remains usable with corrupted progress data", () => {
  localStorage.setItem(PROGRESS_KEY, "invalid-json");
  render(<Home />);
  expect(screen.queryByLabelText("Tiến trình luyện tập tổng hợp")).toBeNull();
  expect(screen.getByRole("heading", { name: "Chọn một bài học" })).not.toBeNull();
});

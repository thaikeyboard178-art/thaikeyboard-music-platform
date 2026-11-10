// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NoteReadingPage from "./NoteReadingPage";

afterEach(() => cleanup());

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () => ({ measureText: (text: string) => ({ width: text.length * 8 }) }),
});

describe("Note Reading browser interactions", () => {
  it("lets a learner configure the bass clef, extended range, and timed speed mode", async () => {
    const user = userEvent.setup();
    render(<NoteReadingPage />);

    const bass = screen.getByRole("button", { name: /Khóa Fa/ });
    await user.click(bass);
    expect(bass.getAttribute("aria-pressed")).toBe("true");

    const extended = screen.getByRole("button", { name: /Mở rộng/ });
    await user.click(extended);
    expect(extended.getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: /Luyện tốc độ/ }));
    const fiveSeconds = screen.getByRole("button", { name: "5 giây" });
    await user.click(fiveSeconds);
    expect(fiveSeconds.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Piano ảo/ }).textContent).toContain("Piano ảo");
  });

  it("renders the score through VexFlow and accepts the 1–7 keyboard shortcut", async () => {
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));

    expect(screen.getByRole("img", { name: /Khuông nhạc khóa Sol/ })).not.toBeNull();
    expect(document.querySelector(".notation-host svg")).not.toBeNull();
    await user.keyboard("1");
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/Chính xác|Chưa đúng/);
    expect(screen.getByRole("button", { name: /Câu tiếp/ })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /Câu tiếp/ }));
    expect(screen.getByText("Câu 2").textContent).toBe("Câu 2");
  });

  it("shows a functional two-octave piano and rejects an incorrect black key without negative points", async () => {
    const user = userEvent.setup();
    render(<NoteReadingPage />);
    await user.click(screen.getByRole("button", { name: /Piano ảo/ }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));

    expect(screen.getByRole("group", { name: /Bàn phím hai quãng tám/ })).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /Phím Đô \d/ }).length).toBeGreaterThanOrEqual(2);
    await user.click(screen.getAllByRole("button", { name: /Phím Đô thăng/ })[0]);
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/Chưa đúng/);
    expect(status.textContent).toMatch(/Không trừ điểm/);
    expect(screen.getByText("0 điểm").textContent).toBe("0 điểm");
  });
});

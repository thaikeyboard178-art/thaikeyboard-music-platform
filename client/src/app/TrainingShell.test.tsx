// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrainingHeader, TrainingFooter } from "./TrainingShell";

afterEach(cleanup);
describe("shared application shell", () => {
  it("uses catalog links for active modules and only text for Coming Soon modules", () => {
    render(<TrainingHeader currentModuleId="note-reading" />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng" });
    expect(within(nav).getByRole("link", { name: "Đọc nốt" }).getAttribute("href")).toBe("/note-reading");
    expect(within(nav).getByRole("link", { name: "Đọc nốt" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).queryByRole("link", { name: /Tiết tấu|Hợp âm/ })).toBeNull();
    expect(within(nav).queryByRole("button")).toBeNull();
    expect(within(nav).getAllByText("Coming Soon")).toHaveLength(2);
  });
  it("accepts an unknown module identity without a Note Reading-specific branch", () => {
    render(<TrainingHeader currentModuleId="some-future-module" />);
    expect(screen.getByRole("link", { name: "Đọc nốt" }).hasAttribute("aria-current")).toBe(false);
  });
  it("toggles the narrow-screen navigation and closes on real navigation", async () => {
    const user = userEvent.setup();
    render(<TrainingHeader />);
    const toggle = screen.getByRole("button", { name: "Mở menu bài học" });
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.click(screen.getByRole("link", { name: "Đọc nốt" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
  it("closes on Escape and restores the toggle focus", async () => {
    const user = userEvent.setup();
    render(<TrainingHeader />);
    const toggle = screen.getByRole("button", { name: "Mở menu bài học" });
    await user.click(toggle);
    await user.keyboard("{Escape}");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });
  it("renders a module-neutral footer without exercise controls", () => {
    render(<TrainingFooter />);
    expect(screen.getByText("Luyện nhạc mỗi ngày, tiến bộ từng bước.")).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

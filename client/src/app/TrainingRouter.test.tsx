// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { TrainingRouter } from "../App";

afterEach(() => { cleanup(); localStorage.clear(); });
describe("catalog-driven router integration", () => {
  it("opens the existing lazy module through its landing action", async () => {
    const location = memoryLocation({ path: "/" });
    const user = userEvent.setup();
    render(<Router hook={location.hook}><TrainingRouter /></Router>);
    await user.click(within(screen.getByRole("article", { name: "Đọc nốt nhạc" })).getByRole("link", { name: "Mở bài học" }));
    expect(await screen.findByRole("heading", { name: "Đọc nốt nhạc" })).not.toBeNull();
    expect((screen.getByLabelText("Dòng phụ phía trên") as HTMLSelectElement).value).toBe("1");
    expect(screen.getByRole("switch", { name: "Tự động chuyển câu tiếp theo" }).getAttribute("aria-checked")).toBe("true");
  });
  it("loads /note-reading directly and can return through shared navigation", async () => {
    const location = memoryLocation({ path: "/note-reading" });
    const user = userEvent.setup();
    render(<Router hook={location.hook}><TrainingRouter /></Router>);
    await screen.findByRole("heading", { name: "Đọc nốt nhạc" });
    await user.click(screen.getByRole("link", { name: "Trang chủ" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Chọn một bài học" })).not.toBeNull());
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});

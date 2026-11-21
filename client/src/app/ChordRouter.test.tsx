// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { TrainingRouter } from "../App";
afterEach(() => { cleanup(); localStorage.clear(); });
describe("Chord route integration", () => {
  it("opens the real Chord module from Home and marks its shared navigation link current", async () => {
    const user = userEvent.setup();
    const location = memoryLocation({ path: "/" });
    render(<Router hook={location.hook}><TrainingRouter /></Router>);
    const card = screen.getByRole("article", { name: "Nhận diện hợp âm" });
    await user.click(within(card).getByRole("link", { name: "Mở bài học" }));
    expect(await screen.findByRole("heading", { name: "Nhận diện hợp âm" })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /Visual Recognition/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: "Hợp âm" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Mở bảng tra cứu" })).not.toBeNull();
  });
  it("loads /chord-recognition directly and can return through the shared home navigation", async () => {
    const user = userEvent.setup();
    const location = memoryLocation({ path: "/chord-recognition" });
    render(<Router hook={location.hook}><TrainingRouter /></Router>);
    await screen.findByRole("heading", { name: "Nhận diện hợp âm" });
    await user.click(within(screen.getByRole("navigation", { name: "Điều hướng" })).getByRole("link", { name: "Trang chủ" }));
    expect(await screen.findByRole("heading", { name: "Chọn một bài học" })).not.toBeNull();
    const card = screen.getByRole("article", { name: "Nhận diện hợp âm" });
    expect(within(card).queryByText("Coming Soon")).toBeNull();
    expect(within(card).getByRole("link", { name: "Mở bài học" }).getAttribute("href")).toBe("/chord-recognition");
  });
});

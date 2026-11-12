// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
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
import { TrainingRouter } from "../App";

afterEach(cleanup);
describe("Phase5 real lazy Rhythm learner route integration", () => {
  it("opens the Rhythm learner page from its own real landing action", async () => {
    const user = userEvent.setup();
    const location = memoryLocation({ path: "/" });
    render(
      <Router hook={location.hook}>
        <TrainingRouter />
      </Router>
    );
    await user.click(
      within(screen.getByRole("article", { name: "Luyện tiết tấu" })).getByRole(
        "link",
        { name: "Mở bài học" }
      )
    );
    expect(
      await screen.findByRole("heading", { name: "Luyện tiết tấu" })
    ).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: /^Level 1 —/ }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(screen.getByRole("button", { name: "Chơi thử" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Chấm điểm" })).not.toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Tiết tấu" })
        .getAttribute("aria-current")
    ).toBe("page");
  });
  it("loads Rhythm directly and returns through shared navigation, without fake Chord links", async () => {
    const user = userEvent.setup();
    const location = memoryLocation({ path: "/rhythm-training" });
    render(
      <Router hook={location.hook}>
        <TrainingRouter />
      </Router>
    );
    await screen.findByRole("heading", { name: "Luyện tiết tấu" });
    expect(screen.queryByRole("link", { name: "Hợp âm" })).toBeNull();
    await user.click(
      within(screen.getByRole("navigation", { name: "Điều hướng" })).getByRole(
        "link",
        { name: "Trang chủ" }
      )
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Chọn một bài học" })
      ).not.toBeNull()
    );
    expect(
      within(
        screen.getByRole("article", { name: "Nhận diện hợp âm" })
      ).getByText("Coming Soon")
    ).not.toBeNull();
  });
});

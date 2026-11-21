// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChordRecognitionPage from "./ChordRecognitionPage";
import { readChordHistory } from "../practice/history";

const audio = vi.hoisted(() => ({ play: vi.fn(async (_pitches: readonly { midi: number }[], _config: { mode: string }) => ({ durationSeconds: 0.001 })), stop: vi.fn() }));
vi.mock("../audio/playback", async importOriginal => ({ ...(await importOriginal<object>()), ChordAudioPlayer: class { play = audio.play; stop = audio.stop; } }));
// Real VexFlow engraving is executed in the dedicated notation suite, not duplicated here.
vi.mock("../notation/ChordStaff", () => ({ ChordStaff: ({ pitches }: { pitches: { midi: number }[] }) => <div role="img" aria-label="Khuông nhạc hợp âm" data-testid="chord-staff">{pitches.map(p => <i key={p.midi} data-midi={p.midi} />)}</div> }));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
describe("real Chord learner workflow", () => {
  it("keeps separate Visual/Ear setup and preserves active Visual question while switching", async () => {
    const user = userEvent.setup(); render(<ChordRecognitionPage />);
    await user.selectOptions(screen.getByLabelText("Level hợp âm"), "6");
    await user.selectOptions(screen.getByLabelText("Số câu hỏi"), "20");
    await user.click(screen.getByRole("tab", { name: /Ear Training/ }));
    expect((screen.getByLabelText("Level hợp âm") as HTMLSelectElement).value).toBe("1");
    await user.click(screen.getByRole("tab", { name: /Visual Recognition/ }));
    expect((screen.getByLabelText("Level hợp âm") as HTMLSelectElement).value).toBe("6");
    await user.click(screen.getByRole("button", { name: "Bắt đầu bài tập" }));
    expect(screen.getByText("Câu 1 / 20")).not.toBeNull();
    await user.click(screen.getByRole("tab", { name: /Ear Training/ }));
    await user.click(screen.getByRole("tab", { name: /Visual Recognition/ }));
    expect(screen.getByText("Câu 1 / 20")).not.toBeNull();
  });
  it("toggles independent reference during practice without resetting question or reference selections", async () => {
    const user = userEvent.setup(); render(<ChordRecognitionPage />);
    await user.click(screen.getByRole("button", { name: "Bắt đầu bài tập" }));
    await user.click(screen.getByRole("button", { name: "Mở bảng tra cứu" }));
    await user.selectOptions(screen.getByLabelText("Loại hợp âm tra cứu"), "minor9");
    await user.selectOptions(screen.getByLabelText("Nốt bass tra cứu"), "G");
    const ref = screen.getByRole("region", { name: "Bảng tra cứu hợp âm" });
    expect(within(ref).getByText("Cm9/G")).not.toBeNull();
    expect(within(ref).getByText("Cách chơi gợi ý trên Piano")).not.toBeNull();
    expect(within(ref).getByText("C4 – E♭4 – B♭4 – D5")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Thu gọn bảng tra cứu" }));
    expect(screen.getByText("Câu 1 / 10")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Mở bảng tra cứu" }));
    expect((screen.getByLabelText("Nốt bass tra cứu") as HTMLSelectElement).value).toBe("G");
  });
  it.each(["staff", "piano", "both"])("implements Visual display %s and hides note names before answer", async display => {
    const user = userEvent.setup(); render(<ChordRecognitionPage />);
    await user.selectOptions(screen.getByLabelText("Cách hiển thị"), display);
    await user.click(screen.getByRole("button", { name: "Bắt đầu bài tập" }));
    const practice = screen.getByRole("region", { name: "Bài luyện hợp âm" });
    expect(within(practice).queryByTestId("chord-staff") !== null).toBe(display !== "piano");
    expect(practice.querySelector(".chord-piano") !== null).toBe(display !== "staff");
    expect(practice.querySelectorAll(".chord-key span")).toHaveLength(0);
    expect(within(practice).queryByText(/Đáp án:/)).toBeNull();
    await user.click(within(screen.getByLabelText("Các đáp án")).getAllByRole("button")[0]);
    expect(screen.getByRole("status").textContent).toContain("Đáp án:");
    expect(within(screen.getByLabelText("Các đáp án")).getAllByRole("button").every(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });
  it("records answer/skip/early-stop, retains results, and supports replay/new/setup", async () => {
    const user = userEvent.setup(); render(<ChordRecognitionPage />);
    await user.click(screen.getByRole("button", { name: "Bắt đầu bài tập" }));
    await user.click(within(screen.getByLabelText("Các đáp án")).getAllByRole("button")[0]);
    await user.click(screen.getByRole("button", { name: "Câu tiếp theo" }));
    await user.click(screen.getByRole("button", { name: "Bỏ qua câu" }));
    expect(screen.getByText("Câu 3 / 10")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Dừng phiên" }));
    expect(readChordHistory()[0]).toMatchObject({ presented: 3, answered: 1, skipped: 1, status: "stopped" });
    await user.click(screen.getByText("Chi tiết 3 câu"));
    expect(screen.getByText("Chưa trả lời", { selector: ".chord-detail-row span" })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Làm lại bộ câu hỏi" }));
    expect(screen.getByText("Câu 1 / 10")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Dừng phiên" }));
    await user.click(screen.getByRole("button", { name: "Tạo phiên mới" }));
    expect(screen.getByText("Câu 1 / 10")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Dừng phiên" }));
    await user.click(screen.getByRole("button", { name: "Cấu hình lại" }));
    expect(screen.getByRole("button", { name: "Bắt đầu bài tập" })).not.toBeNull();
    expect(readChordHistory()).toHaveLength(3);
  });
  it("completes all 10 questions with final feedback before results", async () => {
    const user = userEvent.setup(); render(<ChordRecognitionPage />);
    await user.click(screen.getByRole("button", { name: "Bắt đầu bài tập" }));
    for (let i = 0; i < 10; i++) {
      await user.click(within(screen.getByLabelText("Các đáp án")).getAllByRole("button")[0]);
      expect(screen.queryByRole("heading", { name: "Kết quả phiên luyện" })).toBeNull();
      await user.click(screen.getByRole("button", { name: i === 9 ? "Xem kết quả" : "Câu tiếp theo" }));
    }
    expect(readChordHistory()[0]).toMatchObject({ presented: 10, answered: 10, status: "completed" });
  });
  it("Ear hides tones, grants free first play plus one replay, uses same pitches across modes and cancels on skip", async () => {
    const user = userEvent.setup(); render(<ChordRecognitionPage />);
    await user.click(screen.getByRole("tab", { name: /Ear Training/ }));
    await user.selectOptions(screen.getByLabelText("Giới hạn nghe lại"), "1");
    await user.click(screen.getByRole("button", { name: "Bắt đầu bài tập" }));
    const practice = screen.getByRole("region", { name: "Bài luyện hợp âm" });
    expect(practice.querySelector(".chord-piano")).toBeNull();
    expect(within(practice).queryByRole("img")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Phát hợp âm" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Nghe lại" }) as HTMLButtonElement).disabled).toBe(false));
    const pitches = audio.play.mock.calls[0][0];
    await user.click(screen.getByText("Tùy chỉnh cách nghe"));
    await user.selectOptions(screen.getByLabelText("Cách phát"), "harmony");
    await user.click(screen.getByRole("button", { name: "Nghe lại" }));
    await waitFor(() => expect(screen.getByText("Còn 0 lần nghe lại.")).not.toBeNull());
    expect(audio.play.mock.calls[1][0]).toEqual(pitches);
    expect(audio.play.mock.calls[1][1]).toMatchObject({ mode: "harmony" });
    expect((screen.getByRole("button", { name: "Nghe lại" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Bỏ qua câu" }));
    expect(screen.getByRole("button", { name: "Phát hợp âm" })).not.toBeNull();
    expect(audio.stop).toHaveBeenCalled();
  });
});

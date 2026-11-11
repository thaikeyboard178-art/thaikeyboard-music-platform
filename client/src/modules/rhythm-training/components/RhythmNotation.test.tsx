// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RhythmPattern } from "../types";

const renderMock = vi.hoisted(() => vi.fn());
vi.mock("../notation/VexFlowRhythm", () => ({
  renderRhythmNotation: renderMock,
}));

import { RhythmNotation } from "./RhythmNotation";

const pattern: RhythmPattern = {
  id: "notation-ui-fixture",
  meter: { numerator: 4, denominator: 4 },
  tempo: { pulseBpm: 72 },
  measures: [
    {
      id: "measure-1",
      segments: [
        {
          id: "note-a",
          kind: "note",
          duration: { denominator: 4, dots: 0 },
          tieGroupId: "tie-a",
        },
        { id: "rest-a", kind: "rest", duration: { denominator: 4, dots: 0 } },
        {
          id: "note-b",
          kind: "note",
          duration: { denominator: 4, dots: 0 },
          tieGroupId: "tie-a",
        },
      ],
    },
    {
      id: "measure-2",
      segments: [
        { id: "note-c", kind: "note", duration: { denominator: 4, dots: 0 } },
      ],
    },
  ],
};

function setHostWidth(width: number) {
  const host = document.querySelector(".rhythm-notation-host");
  if (!host) throw new Error("Expected notation render host");
  Object.defineProperty(host, "clientWidth", {
    configurable: true,
    get: () => width,
  });
}

function mockVexFlow(container: HTMLElement) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 420 156");
  svg.setAttribute("data-rhythm-natural-width", "420");
  svg.setAttribute("width", "390");
  svg.setAttribute("height", "145");
  container.replaceChildren(svg);
  return { svg };
}

beforeEach(() => {
  renderMock.mockReset();
  renderMock.mockImplementation((container: HTMLElement) =>
    mockVexFlow(container)
  );
});
afterEach(cleanup);

describe("RhythmNotation", () => {
  it("uses the current mobile width, one bar per row, and a Vietnamese accessible SVG label", () => {
    const ready = vi.fn();
    render(<RhythmNotation pattern={pattern} onReady={ready} />);
    expect(screen.getByRole("status").textContent).toMatch(/Đang chuẩn bị/);

    setHostWidth(390);
    act(() => window.dispatchEvent(new Event("resize")));

    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(renderMock.mock.calls[0][0].clientWidth).toBe(390);
    expect(renderMock.mock.calls[0][2]).toEqual({
      width: 390,
      measuresPerRow: 1,
    });
    const svg = screen.getByRole("img", {
      name: "Ký âm tiết tấu nhịp 4/4, 2 ô nhịp",
    });
    expect(svg.getAttribute("width")).toBe("420");
    expect(svg.getAttribute("height")).toBe("156");
    expect(ready).toHaveBeenLastCalledWith(true);
    expect(
      screen.getByText(/3 nốt hoặc đoạn nốt, 1 ký hiệu lặng/)
    ).toBeTruthy();
    expect(screen.getByText(/1 nhóm nốt được nối bằng dấu nối/)).toBeTruthy();
  });

  it("rerenders at a new observed window width and removes the resize listener on unmount", () => {
    const view = render(<RhythmNotation pattern={pattern} />);
    setHostWidth(390);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(renderMock.mock.calls[0][2]).toMatchObject({
      width: 390,
      measuresPerRow: 1,
    });

    setHostWidth(320);
    act(() => window.dispatchEvent(new Event("resize")));
    expect(renderMock).toHaveBeenCalledTimes(2);
    expect(renderMock.mock.calls[1][2]).toMatchObject({
      width: 320,
      measuresPerRow: 1,
    });

    view.unmount();
    act(() => window.dispatchEvent(new Event("resize")));
    expect(renderMock).toHaveBeenCalledTimes(2);
  });

  it("reports a renderer failure as not ready and never fabricates fallback notation", () => {
    const ready = vi.fn();
    renderMock.mockImplementationOnce(() => {
      throw new Error("renderer failed");
    });
    render(<RhythmNotation pattern={pattern} onReady={ready} />);
    setHostWidth(320);
    act(() => window.dispatchEvent(new Event("resize")));

    expect(screen.getByRole("alert").textContent).toMatch(
      /Chưa thể hiển thị khuông nhạc/
    );
    expect(document.querySelector(".rhythm-notation-host svg")).toBeNull();
    expect(ready).toHaveBeenLastCalledWith(false);
  });
});

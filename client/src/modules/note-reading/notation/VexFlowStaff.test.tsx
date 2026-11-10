// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { VexFlowStaff } from "./VexFlowStaff";
import { noteAtDiatonicPosition } from "./musicTheory";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => ({ measureText: (text: string) => ({ width: text.length * 8 }) }) });

describe("responsive SVG notation regressions", () => {
  it("renders at a 240px host instead of overflowing with a 300px minimum", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 240, 198));
    render(<VexFlowStaff note={noteAtDiatonicPosition("treble", 0)} />);
    expect(document.querySelector(".notation-host svg")?.getAttribute("width")).toBe("240");
  });
  it.each(["treble", "bass"] as const)("renders all staff and extreme ledger fixtures for %s", (clef) => {
    for (const position of Array.from({ length: 25 }, (_, index) => index - 8)) {
      const { unmount } = render(<VexFlowStaff note={noteAtDiatonicPosition(clef, position)} revealAnswer />);
      expect(document.querySelectorAll(".vf-stave path")).toHaveLength(5);
      expect(Number(document.querySelector(".vf-notehead text")?.getAttribute("y"))).toBe(134 - 6 * position);
      expect(document.querySelector(".notation-error")).toBeNull();
      unmount();
    }
  });
});

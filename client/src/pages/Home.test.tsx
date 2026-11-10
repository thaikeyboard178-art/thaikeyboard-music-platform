// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Home from "./Home";
afterEach(cleanup);
it("places the labeled Mi4 landing illustration on the treble bottom staff line", () => {
  render(<Home />);
  const lines = [...document.querySelectorAll(".hero-staff-lines line")];
  const bottom = Math.max(...lines.map(line => Number(line.getAttribute("y1"))));
  expect(lines).toHaveLength(5);
  expect(Number(document.querySelector(".hero-notehead")?.getAttribute("cy"))).toBe(bottom);
  expect(document.querySelector(".hero-note-name")?.textContent).toBe("Mi₄");
});

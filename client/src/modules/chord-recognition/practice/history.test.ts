// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { defaultChordConfiguration } from "../configuration";
import { generateChordQuestions } from "../generation/generator";
import { createChordSession, stopChordSession, toChordResult } from "./session";
import { historyFor, readChordHistory, recordChordResult } from "./history";
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
function result(method: "visual" | "ear", level: 1 | 6, id: string) { const config = { ...defaultChordConfiguration(method), level }; return toChordResult(stopChordSession(createChordSession(config, generateChordQuestions(config, 1), 1, id)))!; }
it("persists independent method/Level histories without shared progress and deduplicates IDs", () => {
  const r = result("visual", 1, "v1");
  expect(recordChordResult(r)).toBe(true); expect(recordChordResult(r)).toBe(false);
  recordChordResult(result("ear", 1, "e1")); recordChordResult(result("visual", 6, "v6"));
  expect(readChordHistory()).toHaveLength(3);
  expect(historyFor("visual", 1).map(r => r.sessionId)).toEqual(["v1"]);
  expect(historyFor("ear", 1).map(r => r.sessionId)).toEqual(["e1"]);
  expect(historyFor("visual", 6).map(r => r.sessionId)).toEqual(["v6"]);
  expect(localStorage.getItem("thaikeyboard-music-training-progress-v1")).toBeNull();
});
it("tolerates malformed and denied browser storage", () => {
  localStorage.setItem("thaikeyboard-chord-results-v1", JSON.stringify([{}, null])); expect(readChordHistory()).toEqual([]);
  localStorage.setItem("thaikeyboard-chord-results-v1", "bad json"); expect(readChordHistory()).toEqual([]);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
  expect(recordChordResult(result("ear", 1, "denied"))).toBe(false);
});

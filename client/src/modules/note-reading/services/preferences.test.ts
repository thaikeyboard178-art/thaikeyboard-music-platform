// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PREFERENCES_KEY, readPracticePreferences, savePracticePreferences } from "./preferences";
import { noteReadingConfigurationSchema } from "../configuration";
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("local UX preferences", () => {
  it("defaults to auto ON and one ledger line on each side", () => {
    expect(readPracticePreferences()).toEqual({ autoAdvance: true, ledgerRange: { above: 1, below: 1 } });
  });
  it("persists asymmetric counts and auto OFF", () => {
    savePracticePreferences({ autoAdvance: false, ledgerRange: { above: 3, below: 2 } });
    expect(readPracticePreferences()).toEqual({ autoAdvance: false, ledgerRange: { above: 3, below: 2 } });
  });
  it.each(["invalid-json", JSON.stringify({ autoAdvance: "true", ledgerRange: { above: 1, below: 1 } }), JSON.stringify({ autoAdvance: false, ledgerRange: { above: 5, below: 1 } })])("falls back safely for malformed preferences %s", (raw) => {
    localStorage.setItem(PREFERENCES_KEY, raw);
    expect(readPracticePreferences().autoAdvance).toBe(true);
    expect(readPracticePreferences().ledgerRange).toEqual({ above: 1, below: 1 });
  });
  it("does not block practice when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readPracticePreferences().autoAdvance).toBe(true);
    expect(() => savePracticePreferences({ autoAdvance: false, ledgerRange: { above: 2, below: 1 } })).not.toThrow();
  });
  it("validates ledger and auto-advance configuration without rejecting legacy configs", () => {
    const base = { clef: "treble", range: "staff", mode: "free", answerMethod: "multiple-choice", questionCount: 10, speedLimitSeconds: null, challengeDate: "2026-11-10" };
    expect(noteReadingConfigurationSchema.safeParse({ ...base, autoAdvance: true, ledgerRange: { above: 4, below: 1 } }).success).toBe(true);
    expect(noteReadingConfigurationSchema.safeParse({ ...base, ledgerRange: { above: -1, below: 1 } }).success).toBe(false);
    expect(noteReadingConfigurationSchema.safeParse({ ...base, autoAdvance: "on" }).success).toBe(false);
  });
});

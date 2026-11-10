import { describe, expect, it } from "vitest";
import { noteReadingConfigurationSchema } from "./configuration";

describe("Note Reading configuration schema", () => {
  it("accepts supported clefs, ranges, exercise modes and challenge lengths", () => {
    expect(noteReadingConfigurationSchema.safeParse({ clef: "mixed", range: "extended", mode: "speed", answerMethod: "piano", questionCount: 30, speedLimitSeconds: 5, challengeDate: "2026-11-10" }).success).toBe(true);
    expect(noteReadingConfigurationSchema.safeParse({ clef: "treble", range: "staff", mode: "free", answerMethod: "multiple-choice", questionCount: 10, speedLimitSeconds: null, challengeDate: "2026-11-10" }).success).toBe(true);
  });

  it("rejects invalid question counts, invalid time limits, and invalid dates", () => {
    expect(noteReadingConfigurationSchema.safeParse({ clef: "treble", range: "staff", mode: "challenge", answerMethod: "multiple-choice", questionCount: 11, speedLimitSeconds: null, challengeDate: "2026-11-10" }).success).toBe(false);
    expect(noteReadingConfigurationSchema.safeParse({ clef: "bass", range: "staff", mode: "speed", answerMethod: "piano", questionCount: 10, speedLimitSeconds: 4, challengeDate: "2026-11-10" }).success).toBe(false);
    expect(noteReadingConfigurationSchema.safeParse({ clef: "bass", range: "staff", mode: "daily", answerMethod: "piano", questionCount: 10, speedLimitSeconds: null, challengeDate: "not-a-date" }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { defaultChordConfiguration } from "../configuration";
import { generateChordQuestions } from "../generation/generator";
import { advanceChordQuestion, answerChordQuestion, createChordSession, skipChordQuestion, stopChordSession, toChordResult } from "./session";
import type { ChordSession } from "../types";
function fixture(method: "visual" | "ear" = "visual") { const config = defaultChordConfiguration(method); return createChordSession(config, generateChordQuestions(config, 45), 45, `test-${method}`, 1); }
function answer(s: ChordSession, correct = true) { const q = s.records[s.index].question; return answerChordQuestion(s, q.id, correct ? q.correctAnswer.id : q.choices.find(a => a.id !== q.correctAnswer.id)!.id); }
describe("Chord-local practice transitions", () => {
  it("records correct/incorrect/skip and ignores duplicate, stale and forged answers", () => {
    let s = fixture(); const id = s.questions[0].id;
    expect(answerChordQuestion(s, id, "forged")).toBe(s);
    expect(advanceChordQuestion(s, id)).toBe(s);
    s = answer(s);
    expect(answer(s, false)).toBe(s);
    expect(skipChordQuestion(s, id)).toBe(s);
    s = advanceChordQuestion(s, id);
    expect(answerChordQuestion(s, id, s.questions[0].correctAnswer.id)).toBe(s);
    s = answer(s, false); s = advanceChordQuestion(s, s.questions[1].id);
    s = skipChordQuestion(s, s.questions[2].id);
    const result = toChordResult(stopChordSession(s, 22))!;
    expect(result).toMatchObject({ presented: 4, answered: 2, correct: 1, incorrect: 1, skipped: 1, accuracy: 50, status: "stopped" });
    expect(result.details[3].status).toBe("unanswered");
  });
  it("does not turn unseen, skipped or presented-unanswered items into mistakes", () => {
    const s = fixture(); const stopped = stopChordSession(s, 2);
    expect(toChordResult(stopped)).toMatchObject({ presented: 1, answered: 0, incorrect: 0, accuracy: null });
    expect(stopChordSession(stopped)).toBe(stopped);
    expect(answer(stopped)).toBe(stopped);
    expect(toChordResult(s)).toBeNull();
  });
  it("completes a ten-question session through production transitions", () => {
    let s = fixture("ear");
    for (let i = 0; i < 10; i++) { s = answer(s); s = advanceChordQuestion(s, s.questions[i].id, [], 99); }
    expect(toChordResult(s)).toMatchObject({ method: "ear", level: 1, presented: 10, answered: 10, correct: 10, skipped: 0, accuracy: 100, status: "completed" });
    expect(advanceChordQuestion(s, s.questions[9].id)).toBe(s);
  });
  it("finishes on the final skip without recording a synthetic answer", () => {
    let s = fixture();
    for (let i = 0; i < 10; i++) s = skipChordQuestion(s, s.records[s.index].question.id);
    expect(toChordResult(s)).toMatchObject({ presented: 10, answered: 0, skipped: 10, incorrect: 0, accuracy: null, status: "completed" });
  });
  it("extends unlimited sessions explicitly; rejects missing or mismatched question data", () => {
    const config = { ...defaultChordConfiguration("visual"), questionCount: null };
    let s = createChordSession(config, generateChordQuestions(config, 4, 2), 4);
    s = answer(s); s = advanceChordQuestion(s, s.questions[0].id); s = answer(s);
    expect(() => advanceChordQuestion(s, s.questions[1].id)).toThrow(/không giảm Level/);
    const extra = generateChordQuestions(config, 99, 2);
    s = advanceChordQuestion(s, s.questions[1].id, extra);
    expect(s.records).toHaveLength(3); expect(s.status).toBe("active");
    expect(() => createChordSession(config, [], 1)).toThrow();
    expect(() => createChordSession({ ...config, method: "ear" }, extra, 1)).toThrow();
  });
  it("keeps Visual/Ear and different Levels in distinct result records", () => {
    const v = toChordResult(stopChordSession(fixture("visual")))!;
    const e = toChordResult(stopChordSession(fixture("ear")))!;
    const config = { ...defaultChordConfiguration("visual"), level: 6 as const };
    const six = toChordResult(stopChordSession(createChordSession(config, generateChordQuestions(config, 55), 55)))!;
    expect([v.method, e.method, six.level]).toEqual(["visual", "ear", 6]);
    expect("totalScore" in v).toBe(false);
  });
});

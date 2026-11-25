import { describe, expect, it } from "vitest";
import type { ChordConfiguration } from "../types";
import { eligibleQualities } from "../curriculum/levels";
import { createChord } from "../theory/chords";
import { generateChordQuestions } from "./generator";

function configuration(level: ChordConfiguration["level"], overrides: Partial<ChordConfiguration> = {}): ChordConfiguration {
  return {
    method: "visual",
    level,
    questionCount: 20,
    answerMode: level % 2 === 0 ? "full" : "quality",
    inversions: level >= 3,
    display: "both",
    register: (level % 3 + 3) as 3 | 4 | 5,
    playback: { mode: "both", direction: "random", spacingMs: 350 },
    replayLimit: 3,
    ...overrides,
  };
}

function pcSet(question: ReturnType<typeof generateChordQuestions>[number]): string {
  return [...new Set(question.chord.pitches.map(({ midi }) => ((midi % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
}

describe("seeded chord question generation", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)("generates a diverse canonical 20-question Level %i set with selected-tier content", (level) => {
    const config = configuration(level);
    const questions = generateChordQuestions(config, 2700 + level, 20);
    expect(questions).toHaveLength(20);
    expect(questions.every((question) => question.level === level && question.method === config.method)).toBe(true);
    expect(questions.some((question) => eligibleQualities(level).find(({ id }) => id === question.chord.quality)?.level === level)).toBe(true);
    expect(new Set(questions.map(({ signature }) => signature)).size).toBe(20);
    expect(new Set(questions.map(({ id }) => id)).size).toBe(20);

    for (const question of questions) {
      expect(question.signature).toBe(question.chord.signature);
      expect(question.chord.root.name.length).toBeGreaterThan(0);
      expect(eligibleQualities(level).some(({ id }) => id === question.chord.quality)).toBe(true);
      expect(question.chord.tones.length).toBe(question.chord.intervals.length);
      expect(question.chord.pitchClasses).toEqual([...new Set(question.chord.tones.map(({ pitchClass }) => pitchClass))].sort((a, b) => a - b));
      expect(question.chord.pitches.every(({ midi }) => midi >= 24 && midi <= 108)).toBe(true);
      expect(question.correctAnswer.id).toBe(config.answerMode === "quality" ? question.chord.quality : `${question.chord.root.name}|${question.chord.quality}`);
      expect(question.choices.some(({ id }) => id === question.correctAnswer.id)).toBe(true);
      expect(new Set(question.choices.map(({ id }) => id)).size).toBe(question.choices.length);
      expect(Object.isFrozen(question)).toBe(true);
      expect(Object.isFrozen(question.chord.pitches)).toBe(true);
    }
    for (let i = 1; i < questions.length; i += 1) {
      expect(questions[i].signature).not.toBe(questions[i - 1].signature);
      expect(pcSet(questions[i])).not.toBe(pcSet(questions[i - 1]));
    }
  });

  it("is exactly deterministic for equal seed/config and differs when the seed changes", () => {
    const config = configuration(6, { answerMode: "full", register: 4, inversions: true });
    const first = generateChordQuestions(config, 12345, 30);
    const again = generateChordQuestions(config, 12345, 30);
    const changed = generateChordQuestions(config, 12346, 30);
    expect(again).toEqual(first);
    expect(changed.map(({ id }) => id)).not.toEqual(first.map(({ id }) => id));
  });

  it("shuffles choices deterministically so the correct answer is not leaked by position", () => {
    const config = configuration(4, { answerMode: "quality", inversions: false });
    const first = generateChordQuestions(config, 6012, 20);
    const again = generateChordQuestions(config, 6012, 20);
    const positions = first.map(({ choices, correctAnswer }) => choices.findIndex(({ id }) => id === correctAnswer.id));
    expect(positions).toEqual(again.map(({ choices, correctAnswer }) => choices.findIndex(({ id }) => id === correctAnswer.id)));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it("gives Level 1 quality mode exactly two real choices", () => {
    const questions = generateChordQuestions(configuration(1, { answerMode: "quality", inversions: false }), 7, 20);
    expect(questions.every(({ choices }) => choices.length === 2)).toBe(true);
    expect(questions.every(({ choices }) => choices.every(({ id }) => ["major", "minor"].includes(id)))).toBe(true);
  });

  it("keeps quality-mode distractors musically non-equivalent at the displayed root", () => {
    const config = configuration(6, { answerMode: "quality" });
    const questions = generateChordQuestions(config, 736, 30);
    for (const question of questions) {
      const correctSet = pcSet(question);
      for (const answer of question.choices) {
        if (answer.id === question.correctAnswer.id) continue;
        const candidate = createChord(question.chord.root.name, answer.id as never, { octave: config.register });
        const candidateSet = [...new Set(candidate.pitches.map(({ midi }) => ((midi % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
        expect(candidateSet).not.toBe(correctSet);
      }
    }
  });

  it("uses same-root full-name distractors and excludes pitch-set-equivalent chords", () => {
    for (const level of [2, 4, 5, 6] as const) {
      const questions = generateChordQuestions(configuration(level, { answerMode: "full", inversions: true }), 8840 + level, 20);
      for (const question of questions) {
        expect(question.choices.every(({ id }) => id.split("|")[0] === question.chord.root.name)).toBe(true);
        const correctSet = pcSet(question);
        for (const { id } of question.choices) {
          if (id === question.correctAnswer.id) continue;
          const [root, quality] = id.split("|");
          const distractor = createChord(root, quality as never, { octave: configuration(level).register });
          const distractorSet = [...new Set(distractor.pitches.map(({ midi }) => ((midi % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
          expect(distractorSet).not.toBe(correctSet);
        }
      }
    }
  });

  it("defaults unlimited sessions to a 30-question initial chunk and snapshots playback", () => {
    const config = configuration(2, { questionCount: null });
    const questions = generateChordQuestions(config, 9);
    expect(questions).toHaveLength(30);
    expect(questions[0].playback).toEqual(config.playback);
    expect(questions[0].playback).not.toBe(config.playback);
    expect(Object.isFrozen(questions[0].playback)).toBe(true);
  });

  it.each([3, 4, 5] as const)("keeps 20-question Level 6 sets inside the supported MIDI range in register %i", (register) => {
    const questions = generateChordQuestions(configuration(6, { register, answerMode: "full", inversions: true }), 5220 + register, 20);
    expect(questions).toHaveLength(20);
    for (const question of questions) {
      expect(question.chord.pitches.every(({ midi }) => midi >= 24 && midi <= 108)).toBe(true);
    }
  });

  it("rejects malformed runtime configuration, seeds, and counts without fallback", () => {
    expect(() => generateChordQuestions(configuration(1, { level: 0 as never }), 1)).toThrow(RangeError);
    expect(() => generateChordQuestions(configuration(1, { register: 2 as never }), 1)).toThrow(RangeError);
    expect(() => generateChordQuestions(configuration(1, { playback: { mode: "harmony", direction: "ascending", spacingMs: 1 } }), 1)).toThrow(RangeError);
    expect(() => generateChordQuestions(configuration(1), 1.25)).toThrow(RangeError);
    expect(() => generateChordQuestions(configuration(1), 1, 0)).toThrow(RangeError);
    expect(() => generateChordQuestions(configuration(1), 1, 10_001)).toThrow(RangeError);
  });
});

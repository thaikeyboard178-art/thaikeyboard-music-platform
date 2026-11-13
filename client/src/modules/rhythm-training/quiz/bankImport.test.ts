import { describe, expect, it } from "vitest";
import {
  createQuizRun,
  getAvailableQuizQuestionCount,
  QUIZ_QUESTION_BANK,
  SOURCE_TRACKS,
  validateQuizBank,
} from "./questionBank";
import {
  advanceRhythmQuizSession,
  createRhythmQuizSession,
  submitRhythmQuizAnswer,
} from "./session";

// Schema/load fixtures only, not music questions. Never exported or added to the learner bank.
function capacityFixture() {
  return Object.fromEntries(
    SOURCE_TRACKS.map(track => [
      String(track),
      Array.from({ length: 50 }, (_, index) => ({
        id: `capacity-only-${track}-${index}`,
        track,
        concept: "test-only-capacity",
        prompt: `Structural capacity fixture ${track}/${index}; not learner content.`,
        options: ["a", "b", "c", "d"].map(id => ({
          id,
          label: `Fixture ${id}`,
        })),
        correctOptionId: "b",
        explanation: "Test-only schema record, not an authored music question.",
      })),
    ])
  );
}

describe("Owner-authored Quiz bank import and capacity", () => {
  it("validates 50 records per source and runs all 50 through the existing identity scorer exactly once", () => {
    const banks = validateQuizBank(capacityFixture());
    for (const track of SOURCE_TRACKS) {
      const deck = createQuizRun(track, `capacity-${track}`, 50, banks);
      expect(deck).toHaveLength(50);
      expect(new Set(deck.map(question => question.id)).size).toBe(50);
      expect(getAvailableQuizQuestionCount(track, banks)).toBe(50);
      let session = createRhythmQuizSession(track, deck, 0, 0);
      for (const [index, question] of deck.entries()) {
        expect(session.currentExercise.id).toBe(question.id);
        const answered = submitRhythmQuizAnswer(
          session,
          { questionId: question.id, optionId: question.correctOptionId },
          index + 1,
          index + 1
        );
        expect(
          submitRhythmQuizAnswer(
            answered,
            { questionId: question.id, optionId: question.correctOptionId },
            index + 1,
            index + 1
          )
        ).toBe(answered);
        session =
          index < deck.length - 1
            ? advanceRhythmQuizSession(answered, deck[index + 1])
            : answered;
      }
      expect(session.totalScore).toBe(500);
    }
  });
  it("Mixed draws all 350 IDs exclusively from the seven supplied source banks", () => {
    const banks = validateQuizBank(capacityFixture());
    const deck = createQuizRun("mixed", "mixed-capacity", 350, banks);
    expect(deck).toHaveLength(350);
    expect(new Set(deck.map(question => question.id)).size).toBe(350);
    expect(deck.every(question => question.track !== "mixed")).toBe(true);
    expect(getAvailableQuizQuestionCount("mixed", banks)).toBe(350);
    expect(Object.keys(banks)).not.toContain("mixed");
    expect(() => createQuizRun("mixed", "mixed-capacity", 351, banks)).toThrow(
      /350/
    );
    expect(createQuizRun("mixed", "mixed-capacity", 350, banks)).toEqual(deck);
  });
  it("rejects wrong tracks, unknown answer IDs, duplicate options, duplicate IDs and ID-only duplicated content", () => {
    const wrongTrack = capacityFixture();
    wrongTrack["1"][0].track = 2;
    expect(() => validateQuizBank(wrongTrack)).toThrow(/record/);
    const wrongAnswer = capacityFixture();
    wrongAnswer["1"][0].correctOptionId = "unknown";
    expect(() => validateQuizBank(wrongAnswer)).toThrow(/identity/);
    const options = capacityFixture();
    options["1"][0].options[3].label = options["1"][0].options[0].label;
    expect(() => validateQuizBank(options)).toThrow(/Duplicate options/);
    const ids = capacityFixture();
    ids["2"][0].id = ids["1"][0].id;
    expect(() => validateQuizBank(ids)).toThrow(/Duplicate Quiz question ID/);
    const content = capacityFixture();
    content["1"][1] = { ...content["1"][0], id: "new-id-same-content" };
    expect(() => validateQuizBank(content)).toThrow(/Duplicate Quiz content/);
    expect(() => validateQuizBank({ ...capacityFixture(), mixed: [] })).toThrow(
      /Mixed is derived/
    );
  });
  it("validates real existing source questions without counting Mixed as another bank", () => {
    const bank = validateQuizBank(QUIZ_QUESTION_BANK);
    expect(Object.keys(bank)).toEqual(SOURCE_TRACKS.map(String));
    for (const track of SOURCE_TRACKS)
      expect(bank[String(track)].length).toBe(
        QUIZ_QUESTION_BANK[String(track)].length
      );
    const wrongMeter = {
      ...capacityFixture(),
      "4": [
        {
          ...capacityFixture()["4"][0],
          notation: {
            kind: "canonical",
            pattern: {
              id: "out-of-level",
              meter: { numerator: 6, denominator: 8 },
              tempo: { pulseBpm: 100 },
              measures: [
                {
                  id: "m",
                  segments: Array.from({ length: 6 }, (_, index) => ({
                    id: `n${index}`,
                    kind: "note",
                    duration: { denominator: 8, dots: 0 },
                  })),
                },
              ],
            },
            caption: "Meter fixture",
          },
        },
      ],
    };
    expect(() => validateQuizBank(wrongMeter)).toThrow(/vocabulary/);
  });
  it("does not mutate supplied input or pad the current production banks", () => {
    const source = capacityFixture();
    const before = JSON.stringify(source);
    const banks = validateQuizBank(source);
    createQuizRun(1, "capacity", 50, banks);
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(banks["1"][0].options)).toBe(true);
    expect(
      QUIZ_QUESTION_BANK["1"].some(question =>
        question.id.startsWith("capacity-only")
      )
    ).toBe(false);
  });
});

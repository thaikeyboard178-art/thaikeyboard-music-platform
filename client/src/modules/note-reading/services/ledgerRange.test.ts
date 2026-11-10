import { describe, expect, it } from "vitest";
import {
  getLedgerBounds,
  getLedgerPositions,
  ledgerRangeLabel,
  midiPitch,
  noteAtDiatonicPosition,
  validateLedgerRange,
} from "../notation/musicTheory";
import type { Clef, LedgerRange } from "../types";
import {
  dailyChallengeSeed,
  generateDailyExercises,
  generateExercise,
  isAllowedGeneratedNote,
  positionsForClefSelection,
  validateNoteAnswer,
} from "./exercises";

const counts = [0, 1, 2, 3, 4] as const;
const clefs = ["treble", "bass", "mixed"] as const;

function rangeFor(above: number, below: number): LedgerRange {
  return { above, below };
}

function randomForPosition(
  positionIndex: number,
  positionCount: number,
  clefIndex = 0
): () => number {
  let call = 0;
  return () => {
    const value =
      call++ % 2 === 0
        ? (clefIndex + 0.25) / 2
        : (positionIndex + 0.25) / positionCount;
    return Math.min(value, 0.999999);
  };
}

describe("pure ledger range services", () => {
  it("validates independent counts and returns inclusive bounds/positions for all 25 combinations", () => {
    for (const above of counts) {
      for (const below of counts) {
        const ledgerRange = rangeFor(above, below);
        expect(validateLedgerRange(ledgerRange)).toBe(ledgerRange);
        expect(getLedgerBounds(ledgerRange)).toEqual({
          min: -2 * below,
          max: 8 + 2 * above,
        });
        expect(getLedgerPositions(ledgerRange)).toEqual(
          Array.from(
            { length: 9 + 2 * above + 2 * below },
            (_, index) => index - 2 * below
          )
        );
        expect(
          positionsForClefSelection("treble", "staff", ledgerRange)
        ).toEqual(getLedgerPositions(ledgerRange));
        expect(
          positionsForClefSelection("bass", "extended", ledgerRange)
        ).toEqual(getLedgerPositions(ledgerRange));
        expect(
          positionsForClefSelection("mixed", "one-ledger", ledgerRange)
        ).toEqual(getLedgerPositions(ledgerRange));
      }
    }
  });

  it("uses staff-only wording and actual Vietnamese ledger counts", () => {
    expect(ledgerRangeLabel({ above: 0, below: 0 })).toBe("Chỉ trong khuông");
    expect(ledgerRangeLabel({ above: 1, below: 0 })).toBe(
      "1 dòng phụ phía trên"
    );
    expect(ledgerRangeLabel({ above: 0, below: 2 })).toBe(
      "2 dòng phụ phía dưới"
    );
    expect(ledgerRangeLabel({ above: 3, below: 4 })).toBe(
      "3 dòng phụ phía trên · 4 dòng phụ phía dưới"
    );
  });

  it("rejects fractions, negative counts, counts above four, and malformed values", () => {
    const invalidRanges = [
      { above: 0.5, below: 0 },
      { above: 0, below: 1.5 },
      { above: -1, below: 0 },
      { above: 0, below: -1 },
      { above: 5, below: 0 },
      { above: 0, below: 5 },
      { above: Number.NaN, below: 0 },
      { above: 0, below: Number.POSITIVE_INFINITY },
    ] as LedgerRange[];

    for (const invalidRange of invalidRanges) {
      expect(() => validateLedgerRange(invalidRange)).toThrow(RangeError);
      expect(() => getLedgerBounds(invalidRange)).toThrow(RangeError);
      expect(() => getLedgerPositions(invalidRange)).toThrow(RangeError);
      expect(() => ledgerRangeLabel(invalidRange)).toThrow(RangeError);
      expect(() =>
        generateExercise(
          {
            clef: "treble",
            range: "staff",
            exerciseId: "invalid",
            index: 1,
            ledgerRange: invalidRange,
          },
          () => 0
        )
      ).toThrow(RangeError);
      expect(() =>
        dailyChallengeSeed("2026-11-10", "treble", "staff", 10, invalidRange)
      ).toThrow(RangeError);
    }
  });

  it("samples every inclusive position deterministically for treble, bass, and mixed clefs", () => {
    for (const above of counts) {
      for (const below of counts) {
        const ledgerRange = rangeFor(above, below);
        const positions = getLedgerPositions(ledgerRange);
        for (const clef of clefs) {
          const generatedClefs: readonly Clef[] =
            clef === "mixed" ? ["treble", "bass"] : [clef];
          for (const [clefIndex, expectedClef] of generatedClefs.entries()) {
            for (const [
              positionIndex,
              expectedPosition,
            ] of positions.entries()) {
              const exercise = generateExercise(
                {
                  clef,
                  range: "staff",
                  exerciseId: `${clef}-${above}-${below}-${positionIndex}`,
                  index: positionIndex + 1,
                  ledgerRange,
                },
                randomForPosition(
                  positionIndex,
                  positions.length,
                  expectedClef === "bass" ? 1 : 0
                )
              );
              expect(exercise.note.clef).toBe(expectedClef);
              expect(exercise.note.diatonicPosition).toBe(expectedPosition);
              expect(
                isAllowedGeneratedNote(exercise.note, "extended", ledgerRange)
              ).toBe(true);
              expect(exercise.note.pitchValue).toBe(
                midiPitch(
                  exercise.note.letter,
                  exercise.note.octave,
                  exercise.note.accidental
                )
              );
              expect(
                validateNoteAnswer(exercise.note, {
                  letter: exercise.note.letter,
                  octave: exercise.note.octave,
                  accidental: exercise.note.accidental,
                  pitchValue: exercise.note.pitchValue,
                })
              ).toBe(true);
              expect(exercise.note.octave).toBeGreaterThanOrEqual(1);
              expect(exercise.note.octave).toBeLessThanOrEqual(6);
            }
          }
        }
      }
    }
  });

  it("rejects notes just outside either selected ledger endpoint", () => {
    const ledgerRange = { above: 2, below: 3 } as const;
    const { min, max } = getLedgerBounds(ledgerRange);
    for (const clef of ["treble", "bass"] as const) {
      expect(
        isAllowedGeneratedNote(
          noteAtDiatonicPosition(clef, min - 1),
          "extended",
          ledgerRange
        )
      ).toBe(false);
      expect(
        isAllowedGeneratedNote(
          noteAtDiatonicPosition(clef, max + 1),
          "extended",
          ledgerRange
        )
      ).toBe(false);
    }
  });

  it("keeps legacy seed behavior without a ledger range and separates asymmetric seeded configurations", () => {
    const legacy = dailyChallengeSeed("2026-11-10", "mixed", "extended", 30);
    expect(legacy).toBe(
      dailyChallengeSeed("2026-11-10", "mixed", "extended", 30)
    );
    expect(legacy).not.toBe(
      dailyChallengeSeed("2026-11-10", "mixed", "extended", 30, {
        above: 0,
        below: 0,
      })
    );
    expect(
      dailyChallengeSeed("2026-11-10", "mixed", "extended", 30, {
        above: 1,
        below: 2,
      })
    ).not.toBe(
      dailyChallengeSeed("2026-11-10", "mixed", "extended", 30, {
        above: 2,
        below: 1,
      })
    );

    const first = generateDailyExercises("2026-11-10", "mixed", "staff", 40, {
      above: 1,
      below: 2,
    });
    const second = generateDailyExercises("2026-11-10", "mixed", "staff", 40, {
      above: 1,
      below: 2,
    });
    expect(second).toEqual(first);
    expect(
      first.every(exercise =>
        isAllowedGeneratedNote(exercise.note, "staff", { above: 1, below: 2 })
      )
    ).toBe(true);
    expect(
      generateDailyExercises("2026-11-10", "mixed", "staff", 40, {
        above: 2,
        below: 1,
      })
    ).not.toEqual(first);
  });
});

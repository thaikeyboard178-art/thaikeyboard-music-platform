import type { ChordPitch, SpelledNote } from "../types";

export const ROOT_NAMES: readonly string[] = Object.freeze(["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"]);

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PITCH_CLASSES: Readonly<Record<(typeof LETTERS)[number], number>> = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });
const NATURAL_MIDI_BASE: Readonly<Record<(typeof LETTERS)[number], number>> = Object.freeze({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 });

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

function accidentalValue(text: string): number {
  if (!text) return 0;
  if (/^(?:#|♯)+$/.test(text)) return [...text].length;
  if (/^(?:b|♭)+$/.test(text)) return -[...text].length;
  if (text === "𝄪" || text === "x" || text === "X") return 2;
  if (text === "𝄫") return -2;
  throw new RangeError(`Invalid accidental: ${text}`);
}

export function accidentalText(accidental: number): string {
  if (!Number.isInteger(accidental)) throw new RangeError("Accidental must be an integer");
  if (accidental === 0) return "";
  if (accidental === 2) return "𝄪";
  if (accidental === -2) return "𝄫";
  return accidental > 0 ? "♯".repeat(accidental) : "♭".repeat(-accidental);
}

export function parseNote(name: string): SpelledNote {
  if (typeof name !== "string") throw new TypeError("Note name must be a string");
  const match = /^\s*([A-Ga-g])((?:#|b|♯|♭)+|𝄪|𝄫|x|X)?\s*$/.exec(name);
  if (!match) throw new RangeError(`Invalid note name: ${String(name)}`);
  const letter = match[1].toUpperCase() as SpelledNote["letter"];
  const accidental = accidentalValue(match[2] ?? "");
  const normalized = `${letter}${accidentalText(accidental)}`;
  return Object.freeze({ letter, accidental, name: normalized, pitchClass: mod12(NATURAL_PITCH_CLASSES[letter] + accidental) });
}

/** Spell an interval's target diatonic degree above root, retaining its harmonic function. */
export function spellDegree(root: SpelledNote, degree: number, semitones: number): SpelledNote {
  if (!Number.isInteger(degree) || degree < 1 || !Number.isInteger(semitones) || semitones < 0) {
    throw new RangeError("Interval degree must be positive and semitones must be a non-negative integer");
  }
  const rootLetterIndex = LETTERS.indexOf(root.letter);
  const degreeOffset = degree - 1;
  const targetLetterIndex = (rootLetterIndex + degreeOffset) % 7;
  const letter = LETTERS[targetLetterIndex];
  const desiredPitchClass = mod12(root.pitchClass + semitones);
  let accidental = mod12(desiredPitchClass - NATURAL_PITCH_CLASSES[letter]);
  if (accidental > 6) accidental -= 12;
  const name = `${letter}${accidentalText(accidental)}`;
  return Object.freeze({ letter, accidental, name, pitchClass: desiredPitchClass });
}

/** Map a written octave to MIDI using the spelled letter/octave, so B♯3 is MIDI C4. */
export function pitchAt(note: SpelledNote | string, octave: number): ChordPitch {
  const spelled = typeof note === "string" ? parseNote(note) : note;
  if (!Number.isInteger(octave) || octave < -1 || octave > 10) throw new RangeError("Octave must be an integer from -1 through 10");
  const midi = 12 * (octave + 1) + NATURAL_MIDI_BASE[spelled.letter] + spelled.accidental;
  return Object.freeze({ ...spelled, octave, midi });
}

export function formatPitch(pitch: Pick<ChordPitch, "name" | "octave">): string {
  return `${pitch.name}${pitch.octave}`;
}

export function letterIndex(letter: SpelledNote["letter"]): number {
  return LETTERS.indexOf(letter);
}

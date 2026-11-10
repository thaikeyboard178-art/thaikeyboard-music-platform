import type { Clef, NoteEvent, NoteLetter, NoteRange } from "../types";

export const NOTE_LETTERS: readonly NoteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];
export const NOTE_SOLFEGE: Record<NoteLetter, string> = {
  C: "Đô",
  D: "Rê",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};
export const NOTE_SEMITONES: Record<NoteLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const CLEF_BASE: Record<Clef, { letter: NoteLetter; octave: number }> = {
  treble: { letter: "E", octave: 4 },
  bass: { letter: "G", octave: 2 },
};

export const NOTE_RANGES: Record<NoteRange, { min: number; max: number; label: string; detail: string }> = {
  staff: { min: 0, max: 8, label: "Trong khuông", detail: "5 dòng kẻ · 4 khe" },
  "one-ledger": { min: -2, max: 10, label: "Thêm dòng phụ", detail: "1 dòng phụ trên và dưới" },
  extended: { min: -8, max: 16, label: "Mở rộng", detail: "Nhiều dòng phụ · nhiều quãng tám" },
};

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / divisor);
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function noteAtDiatonicPosition(clef: Clef, position: number, id = "note"): NoteEvent {
  if (!Number.isInteger(position)) throw new RangeError("Staff position must be an integer diatonic step");
  const base = CLEF_BASE[clef];
  const baseIndex = base.octave * 7 + NOTE_LETTERS.indexOf(base.letter);
  const absoluteIndex = baseIndex + position;
  const octave = floorDiv(absoluteIndex, 7);
  const letter = NOTE_LETTERS[modulo(absoluteIndex, 7)];
  return {
    id,
    clef,
    letter,
    octave,
    diatonicPosition: position,
    pitchValue: midiPitch(letter, octave),
    accidental: "natural",
  };
}

export function diatonicPositionOf(clef: Clef, letter: NoteLetter, octave: number): number {
  if (!Number.isInteger(octave)) throw new RangeError("Octave must be an integer");
  const base = CLEF_BASE[clef];
  return octave * 7 + NOTE_LETTERS.indexOf(letter) - (base.octave * 7 + NOTE_LETTERS.indexOf(base.letter));
}

export function midiPitch(letter: NoteLetter, octave: number, accidental: "natural" | "sharp" | "flat" = "natural"): number {
  const modifier = accidental === "sharp" ? 1 : accidental === "flat" ? -1 : 0;
  return 12 * (octave + 1) + NOTE_SEMITONES[letter] + modifier;
}

export function vexFlowKey(note: Pick<NoteEvent, "letter" | "octave" | "accidental">): string {
  const accidental = note.accidental === "natural" ? "" : note.accidental === "sharp" ? "#" : "b";
  return `${note.letter.toLowerCase()}${accidental}/${note.octave}`;
}

export function getAllowedPositions(range: NoteRange): number[] {
  const { min, max } = NOTE_RANGES[range];
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export function isPositionInRange(range: NoteRange, position: number): boolean {
  const { min, max } = NOTE_RANGES[range];
  return Number.isInteger(position) && position >= min && position <= max;
}

export function noteAnswer(note: NoteEvent) {
  return { letter: note.letter, octave: note.octave, accidental: note.accidental, pitchValue: note.pitchValue } as const;
}

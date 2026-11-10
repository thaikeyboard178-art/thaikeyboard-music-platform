import type { NoteAnswer, NoteEvent, NoteExercise } from "../types";
import { getAllowedPositions, isPositionInRange, midiPitch, noteAtDiatonicPosition, NOTE_RANGES } from "../notation/musicTheory";
import type { ClefSelection, ExerciseGenerationOptions, NoteRange } from "../types";

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function dailyChallengeSeed(date: string, clef: ClefSelection, range: NoteRange, questionCount: number): number {
  return hashSeed(`${date}|${clef}|${range}|${questionCount}|note-reading-v1`);
}

export function randomNote(
  clefSelection: ClefSelection,
  range: NoteRange,
  exerciseId: string,
  random: () => number = Math.random,
  previous?: Pick<NoteEvent, "clef" | "diatonicPosition">,
): NoteEvent {
  const clefs = clefSelection === "mixed" ? (["treble", "bass"] as const) : ([clefSelection] as const);
  const positions = getAllowedPositions(range);
  let candidate: NoteEvent | undefined;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const clef = clefs[Math.floor(random() * clefs.length)] ?? clefs[0];
    const position = positions[Math.floor(random() * positions.length)] ?? positions[0];
    candidate = noteAtDiatonicPosition(clef, position, exerciseId);
    if (!previous || candidate.clef !== previous.clef || candidate.diatonicPosition !== previous.diatonicPosition) return candidate;
  }
  return candidate ?? noteAtDiatonicPosition(clefs[0], positions[0], exerciseId);
}

export function generateExercise(options: ExerciseGenerationOptions, random: () => number = Math.random): NoteExercise {
  const note = randomNote(options.clef, options.range, options.exerciseId, random, options.previous);
  return { id: options.exerciseId, index: options.index, note };
}

export function validateNoteAnswer(note: NoteEvent, answer: NoteAnswer): boolean {
  return note.pitchValue === answer.pitchValue && note.letter === answer.letter && note.octave === answer.octave && note.accidental === answer.accidental;
}

export function isAllowedGeneratedNote(note: NoteEvent, range: NoteRange): boolean {
  return isPositionInRange(range, note.diatonicPosition) && note.pitchValue === midiPitch(note.letter, note.octave, note.accidental);
}

export function positionsForClefSelection(clef: ClefSelection, range: NoteRange): number[] {
  const { min, max } = NOTE_RANGES[range];
  return Array.from({ length: max - min + 1 }, (_, index) => index + min).filter((position) => {
    if (clef === "mixed") return true;
    return isPositionInRange(range, position);
  });
}

export function generateDailyExercises(
  date: string,
  clef: ClefSelection,
  range: NoteRange,
  questionCount: number,
): NoteExercise[] {
  const random = createSeededRandom(dailyChallengeSeed(date, clef, range, questionCount));
  const exercises: NoteExercise[] = [];
  let previous: Pick<NoteEvent, "clef" | "diatonicPosition"> | undefined;
  for (let index = 0; index < questionCount; index += 1) {
    const exercise = generateExercise({ clef, range, exerciseId: `daily-${date}-${index + 1}`, index: index + 1, previous }, random);
    exercises.push(exercise);
    previous = exercise.note;
  }
  return exercises;
}

import type { ChordAnswer, ChordConfiguration, ChordLevel, ChordQuestion, CanonicalChord, QualityId } from "../types";
import { eligibleQualities, qualitiesAtLevel } from "../curriculum/levels";
import { createChord } from "../theory/chords";
import { ROOT_NAMES } from "../theory/spelling";
import { isChordLevel } from "../theory/qualityCatalog";

const MAX_GENERATED_QUESTIONS = 10_000;
const QUALITY_CHOICE_COUNT = 4;

type Candidate = Readonly<{ chord: CanonicalChord; answer: ChordAnswer }>;

function validateConfig(config: ChordConfiguration): void {
  if (!config || typeof config !== "object") throw new TypeError("Chord configuration is required");
  if (config.method !== "visual" && config.method !== "ear") throw new RangeError("Invalid chord method");
  if (!isChordLevel(config.level)) throw new RangeError("Invalid chord level");
  if (![10, 20, 30, null].includes(config.questionCount)) throw new RangeError("Invalid question count");
  if (config.answerMode !== "quality" && config.answerMode !== "full") throw new RangeError("Invalid answer mode");
  if (typeof config.inversions !== "boolean") throw new TypeError("inversions must be boolean");
  if (config.display !== "staff" && config.display !== "piano" && config.display !== "both") throw new RangeError("Invalid display mode");
  if (config.register !== 3 && config.register !== 4 && config.register !== 5) throw new RangeError("Register must be 3, 4, or 5");
  const playback = config.playback;
  if (!playback || !["melody", "harmony", "both"].includes(playback.mode)) throw new RangeError("Invalid playback mode");
  if (!["ascending", "descending", "random"].includes(playback.direction)) throw new RangeError("Invalid melody direction");
  if (!Number.isFinite(playback.spacingMs) || playback.spacingMs < 150 || playback.spacingMs > 1000) throw new RangeError("Playback spacing must be between 150 and 1000 ms");
  if (![1, 3, null].includes(config.replayLimit)) throw new RangeError("Invalid replay limit");
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function hash(text: string): string {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return (value >>> 0).toString(36);
}

function pitchSetSignature(chord: CanonicalChord): string {
  return [...new Set(chord.pitches.map(({ midi }) => ((midi % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
}

function answerFor(chord: CanonicalChord, mode: ChordConfiguration["answerMode"]): ChordAnswer {
  if (mode === "quality") {
    const quality = eligibleQualities(6).find((item) => item.id === chord.quality)!;
    return Object.freeze({ id: chord.quality, label: quality.name });
  }
  return Object.freeze({ id: `${chord.root.name}|${chord.quality}`, label: chord.name });
}

function candidateFor(root: string, quality: QualityId, inversion: number, config: ChordConfiguration): Candidate | null {
  const chord = createChord(root, quality, { octave: config.register, inversion });
  if (chord.pitches.some(({ midi }) => midi < 24 || midi > 108)) return null;
  return Object.freeze({ chord, answer: answerFor(chord, config.answerMode) });
}

function makeChoices(correct: Candidate, config: ChordConfiguration, random: () => number): readonly ChordAnswer[] {
  const permitted = eligibleQualities(config.level);
  const correctSet = pitchSetSignature(correct.chord);
  if (config.answerMode === "quality") {
    const alternatives = permitted.filter((quality) => {
      if (quality.id === correct.chord.quality) return false;
      const alternative = createChord(correct.chord.root.name, quality.id, { octave: 4 });
      return pitchSetSignature(alternative) !== correctSet;
    });
    const count = Math.min(QUALITY_CHOICE_COUNT, alternatives.length + 1);
    const selected = alternatives.slice(0, count - 1).map((quality) => Object.freeze({ id: quality.id, label: quality.name }));
    return Object.freeze(shuffle([correct.answer, ...selected], random));
  }

  const candidates: Candidate[] = permitted
    .filter((quality) => quality.id !== correct.chord.quality)
    .map((quality) => candidateFor(correct.chord.root.name, quality.id, 0, config))
    .filter((value): value is Candidate => value !== null && pitchSetSignature(value.chord) !== correctSet);
  const desiredCount = Math.min(QUALITY_CHOICE_COUNT, permitted.length);
  const unique = new Map<string, ChordAnswer>();
  for (const candidate of candidates) unique.set(candidate.answer.id, candidate.answer);
  const answers = [...unique.values()].slice(0, desiredCount - 1);
  if (answers.length !== desiredCount - 1) throw new Error(`Unable to construct non-equivalent full-name distractors at Level ${config.level} for ${correct.chord.name}`);
  return Object.freeze(shuffle([correct.answer, ...answers], random));
}

function validateAnswerSet(question: ChordQuestion): void {
  const ids = question.choices.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error("Generated duplicate answer IDs");
  if (!ids.includes(question.correctAnswer.id)) throw new Error("Correct answer is missing from choices");
}

/**
 * Seeded canonical questions. Augmented triads and fully diminished sevenths are kept in root position:
 * their pitch-class sets are rotationally symmetric, so generated questions never ask learners to infer
 * an arbitrary root from an inversion. Full-name distractors also remain on the correct root.
 */
export function generateChordQuestions(config: ChordConfiguration, seed: number, count?: number): readonly ChordQuestion[] {
  validateConfig(config);
  if (!Number.isSafeInteger(seed)) throw new RangeError("Seed must be a safe integer");
  const requested = count ?? config.questionCount ?? 30;
  if (!Number.isSafeInteger(requested) || requested < 1 || requested > MAX_GENERATED_QUESTIONS) {
    throw new RangeError(`Count must be an integer from 1 through ${MAX_GENERATED_QUESTIONS}`);
  }
  const random = seededRandom(seed);
  const allowed = eligibleQualities(config.level);
  const tierQualities = qualitiesAtLevel(config.level);
  const qualityOrder = [...tierQualities, ...allowed.filter((quality) => quality.level < config.level)];
  const grouped = new Map<QualityId, Candidate[]>();

  for (const quality of qualityOrder) {
    const inversions = config.inversions && quality.id !== "augmented" && quality.id !== "diminished7"
      ? Array.from({ length: quality.intervals.length }, (_, index) => index)
      : [0];
    const group: Candidate[] = [];
    for (const root of ROOT_NAMES) {
      for (const inversion of inversions) {
        const candidate = candidateFor(root, quality.id, inversion, config);
        if (candidate) group.push(candidate);
      }
    }
    if (!group.length) throw new Error(`No valid chord candidates for ${quality.id} in register ${config.register}`);
    grouped.set(quality.id, shuffle(group, random));
  }

  const cursors = new Map<QualityId, number>();
  const questions: ChordQuestion[] = [];
  let previousSignature = "";
  let previousPitchSet = "";

  for (let index = 0; index < requested; index += 1) {
    const quality = qualityOrder[index % qualityOrder.length];
    const group = grouped.get(quality.id)!;
    let cursor = cursors.get(quality.id) ?? 0;
    let chosen: Candidate | undefined;
    for (let attempt = 0; attempt < group.length; attempt += 1) {
      const candidate = group[(cursor + attempt) % group.length];
      const pcSet = pitchSetSignature(candidate.chord);
      if (candidate.chord.signature !== previousSignature && pcSet !== previousPitchSet) {
        chosen = candidate;
        cursor = (cursor + attempt + 1) % group.length;
        break;
      }
    }
    if (!chosen) throw new Error(`Capacity error: no non-repeating ${quality.id} question remains for the selected level and register`);
    cursors.set(quality.id, cursor);
    previousSignature = chosen.chord.signature;
    previousPitchSet = pitchSetSignature(chosen.chord);

    const choices = makeChoices(chosen, config, random);
    const id = `chord-${hash(`${seed}|${index}|${chosen.chord.signature}`)}`;
    const question: ChordQuestion = Object.freeze({
      id,
      chord: chosen.chord,
      method: config.method,
      level: config.level as ChordLevel,
      correctAnswer: chosen.answer,
      choices,
      playback: Object.freeze({ ...config.playback }),
      signature: chosen.chord.signature,
    });
    validateAnswerSet(question);
    questions.push(question);
  }
  return Object.freeze(questions);
}

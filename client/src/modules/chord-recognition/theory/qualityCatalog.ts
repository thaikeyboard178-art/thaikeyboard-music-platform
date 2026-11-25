import type { ChordInterval, ChordLevel, ChordQuality, QualityId } from "../types";

const interval = (degree: number, semitones: number, label: string): ChordInterval =>
  Object.freeze({ degree, semitones, label });

const qualities: ChordQuality[] = [
  { id: "major", name: "Major", symbol: "", level: 1, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5")] },
  { id: "minor", name: "Minor", symbol: "m", level: 1, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 7, "5")] },
  { id: "diminished", name: "Diminished", symbol: "°", level: 2, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 6, "♭5")] },
  { id: "augmented", name: "Augmented", symbol: "+", level: 2, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 8, "♯5")] },
  { id: "sus2", name: "Suspended 2", symbol: "sus2", level: 3, intervals: [interval(1, 0, "1"), interval(2, 2, "2"), interval(5, 7, "5")] },
  { id: "sus4", name: "Suspended 4", symbol: "sus4", level: 3, intervals: [interval(1, 0, "1"), interval(4, 5, "4"), interval(5, 7, "5")] },
  { id: "dominant7", name: "Dominant 7", symbol: "7", level: 4, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 10, "♭7")] },
  { id: "major7", name: "Major 7", symbol: "maj7", level: 4, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 11, "7")] },
  { id: "minor7", name: "Minor 7", symbol: "m7", level: 4, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 7, "5"), interval(7, 10, "♭7")] },
  { id: "halfDiminished7", name: "Half-diminished 7", symbol: "m7♭5", level: 5, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 6, "♭5"), interval(7, 10, "♭7")] },
  { id: "diminished7", name: "Diminished 7", symbol: "°7", level: 5, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 6, "♭5"), interval(7, 9, "♭♭7")] },
  { id: "minorMajor7", name: "Minor-major 7", symbol: "m(maj7)", level: 5, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 7, "5"), interval(7, 11, "7")] },
  { id: "dominant9", name: "Dominant 9", symbol: "9", level: 6, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 10, "♭7"), interval(9, 14, "9")] },
  { id: "major9", name: "Major 9", symbol: "maj9", level: 6, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 11, "7"), interval(9, 14, "9")] },
  { id: "minor9", name: "Minor 9", symbol: "m9", level: 6, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 7, "5"), interval(7, 10, "♭7"), interval(9, 14, "9")] },
  { id: "dominant11", name: "Dominant 11", symbol: "11", level: 6, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 10, "♭7"), interval(9, 14, "9"), interval(11, 17, "11")] },
  { id: "major11", name: "Major 11", symbol: "maj11", level: 6, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 11, "7"), interval(9, 14, "9"), interval(11, 17, "11")] },
  { id: "minor11", name: "Minor 11", symbol: "m11", level: 6, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 7, "5"), interval(7, 10, "♭7"), interval(9, 14, "9"), interval(11, 17, "11")] },
  { id: "dominant13", name: "Dominant 13", symbol: "13", level: 6, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 10, "♭7"), interval(9, 14, "9"), interval(11, 17, "11"), interval(13, 21, "13")] },
  { id: "major13", name: "Major 13", symbol: "maj13", level: 6, intervals: [interval(1, 0, "1"), interval(3, 4, "3"), interval(5, 7, "5"), interval(7, 11, "7"), interval(9, 14, "9"), interval(11, 17, "11"), interval(13, 21, "13")] },
  { id: "minor13", name: "Minor 13", symbol: "m13", level: 6, intervals: [interval(1, 0, "1"), interval(3, 3, "♭3"), interval(5, 7, "5"), interval(7, 10, "♭7"), interval(9, 14, "9"), interval(11, 17, "11"), interval(13, 21, "13")] },
];

export const CHORD_QUALITIES: readonly ChordQuality[] = Object.freeze(
  qualities.map((quality) => Object.freeze({ ...quality, intervals: Object.freeze([...quality.intervals]) })),
);

const qualityById: ReadonlyMap<QualityId, ChordQuality> = new Map(CHORD_QUALITIES.map((quality) => [quality.id, quality]));

export function getQuality(id: QualityId): ChordQuality {
  const quality = qualityById.get(id);
  if (!quality) throw new RangeError(`Unknown chord quality: ${String(id)}`);
  return quality;
}

export function isChordLevel(value: unknown): value is ChordLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}

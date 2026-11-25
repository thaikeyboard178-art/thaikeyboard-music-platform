import type { CanonicalChord, ChordPitch, QualityId, SpelledNote } from "../types";
import { getQuality } from "./qualityCatalog";
import { letterIndex, parseNote, pitchAt, spellDegree } from "./spelling";

export type CreateChordOptions = Readonly<{ octave?: number; inversion?: number; bass?: string }>;

function withOctave(pitch: ChordPitch, octave: number): ChordPitch {
  return pitchAt(pitch, octave);
}

function octaveForDegree(root: SpelledNote, octave: number, degree: number): number {
  return octave + Math.floor((letterIndex(root.letter) + degree - 1) / 7);
}

export function createChord(rootName: string, qualityId: QualityId, options: CreateChordOptions = {}): CanonicalChord {
  const root = parseNote(rootName);
  const quality = getQuality(qualityId);
  if (!options || typeof options !== "object") throw new TypeError("Chord options must be an object");
  const octave = options.octave ?? 4;
  const inversion = options.inversion ?? 0;
  if (!Number.isInteger(octave) || octave < 0 || octave > 8) throw new RangeError("Chord octave must be an integer from 0 through 8");
  if (!Number.isInteger(inversion) || inversion < 0 || inversion >= quality.intervals.length) {
    throw new RangeError(`Inversion must be an integer from 0 through ${quality.intervals.length - 1}`);
  }
  const slashBass = options.bass === undefined ? undefined : parseNote(options.bass);
  const tones = Object.freeze(quality.intervals.map(({ degree, semitones }) => spellDegree(root, degree, semitones)));
  const pitchClasses = Object.freeze([...new Set(tones.map((tone) => tone.pitchClass))].sort((a, b) => a - b));
  const structuralPitches = quality.intervals.map(({ degree, semitones }, index) =>
    pitchAt(tones[index], octaveForDegree(root, octave, degree)),
  );

  let orderedPitches: ChordPitch[];
  if (inversion === 0) {
    orderedPitches = structuralPitches;
  } else {
    const rotated = [...structuralPitches.slice(inversion), ...structuralPitches.slice(0, inversion)];
    // Put a high extension selected as bass in the register nearest the root, then rotate upward.
    let first = rotated[0];
    const rootPitch = pitchAt(root, octave);
    while (first.midi >= rootPitch.midi + 12) first = withOctave(first, first.octave - 1);
    while (first.midi < rootPitch.midi - 12) first = withOctave(first, first.octave + 1);
    orderedPitches = [first];
    for (const original of rotated.slice(1)) {
      let candidate = original;
      while (candidate.midi <= orderedPitches[orderedPitches.length - 1].midi) candidate = withOctave(candidate, candidate.octave + 1);
      orderedPitches.push(candidate);
    }
    while (Math.max(...orderedPitches.map(({ midi }) => midi)) > 108 && Math.min(...orderedPitches.map(({ midi }) => midi)) - 12 >= 24) {
      orderedPitches = orderedPitches.map((pitch) => withOctave(pitch, pitch.octave - 1));
    }
  }

  const bass = slashBass ?? tones[inversion];
  if (slashBass) {
    const bassPitch = pitchAt(slashBass, octave - 2);
    orderedPitches = [...orderedPitches, bassPitch].sort((a, b) => a.midi - b.midi || a.name.localeCompare(b.name));
  }
  const symbol = `${root.name}${quality.symbol}${slashBass ? `/${slashBass.name}` : ""}`;
  const name = `${root.name} ${quality.name}${slashBass ? ` / ${slashBass.name}` : ""}`;
  const signature = `${root.name}|${quality.id}|${bass.name}|${inversion}|${orderedPitches.map((pitch) => pitch.midi).join(",")}`;
  return Object.freeze({
    root,
    quality: quality.id,
    symbol,
    name,
    intervals: quality.intervals,
    tones,
    pitchClasses,
    pitches: Object.freeze(orderedPitches),
    bass,
    inversion,
    signature,
  });
}

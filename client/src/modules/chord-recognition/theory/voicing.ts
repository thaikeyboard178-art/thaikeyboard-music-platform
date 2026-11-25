import type { CanonicalChord, ChordPitch, PianoVoicing } from "../types";
import { letterIndex, pitchAt } from "./spelling";

function octaveForDegree(chord: CanonicalChord, index: number): number {
  const degree = chord.intervals[index].degree;
  return 4 + Math.floor((letterIndex(chord.root.letter) + degree - 1) / 7);
}

function sameSpelling(a: string, b: string): boolean {
  return a === b;
}

function compactIfWide(pitches: readonly ChordPitch[], fixedNames: ReadonlySet<string>): ChordPitch[] {
  const currentSpan = Math.max(...pitches.map(({ midi }) => midi)) - Math.min(...pitches.map(({ midi }) => midi));
  if (currentSpan <= 19 || pitches.length < 2) return [...pitches];
  const movable = pitches.map((pitch) => fixedNames.has(pitch.name) ? [pitch] : [-1, 0, 1].map((shift) => pitchAt(pitch, pitch.octave + shift)));
  let best: ChordPitch[] = [...pitches];
  let bestSpan = currentSpan;
  let bestMovement = 0;
  const visit = (index: number, selected: ChordPitch[], movement: number) => {
    if (index === movable.length) {
      const span = Math.max(...selected.map(({ midi }) => midi)) - Math.min(...selected.map(({ midi }) => midi));
      if (span < bestSpan || (span === bestSpan && movement < bestMovement)) {
        best = [...selected];
        bestSpan = span;
        bestMovement = movement;
      }
      return;
    }
    for (const candidate of movable[index]) {
      if (candidate.octave < 3 || candidate.octave > 7) continue;
      visit(index + 1, [...selected, candidate], movement + Math.abs(candidate.octave - pitches[index].octave));
    }
  };
  visit(0, [], 0);
  return best.sort((a, b) => a.midi - b.midi || a.name.localeCompare(b.name));
}

export function suggestVoicing(chord: CanonicalChord): PianoVoicing {
  if (!chord || !Array.isArray(chord.tones) || chord.tones.length === 0) throw new TypeError("A canonical chord is required");
  const bass = chord.bass;
  const left = Object.freeze([pitchAt(bass, 2), pitchAt(bass, 3)]);
  const allRight = chord.tones.map((tone, index) => pitchAt(tone, octaveForDegree(chord, index)));
  const bassIsRoot = sameSpelling(bass.name, chord.root.name);
  const rootRequired = !bassIsRoot;

  // LH bass doubles suppress its matching chord tone. Root remains in RH for slash basses.
  let candidates = allRight.filter((pitch) => {
    if (rootRequired) return !sameSpelling(pitch.name, bass.name);
    return !sameSpelling(pitch.name, chord.root.name);
  });
  if (rootRequired) {
    const rootPitch = allRight.find((pitch) => sameSpelling(pitch.name, chord.root.name));
    if (rootPitch && !candidates.some((pitch) => sameSpelling(pitch.name, chord.root.name))) candidates.push(rootPitch);
  }
  // Keep all available chord tones for compact chords (the C major and Cm9 reference cases).
  if (candidates.length < 3) candidates = [...allRight];

  if (candidates.length > 4) {
    const requiredDegrees = new Set<number>();
    const thirdIndex = chord.intervals.findIndex(({ degree }) => degree === 3);
    const seventhIndex = chord.intervals.findIndex(({ degree }) => degree === 7);
    if (thirdIndex >= 0) requiredDegrees.add(3);
    if (seventhIndex >= 0) requiredDegrees.add(7);
    const extensions = chord.intervals.filter(({ degree }) => degree >= 9);
    if (extensions.length) requiredDegrees.add(extensions[extensions.length - 1].degree);
    if (rootRequired) requiredDegrees.add(1);
    const selected = candidates.filter((pitch) => {
      const index = allRight.findIndex((candidate) => candidate.name === pitch.name);
      return requiredDegrees.has(chord.intervals[index]?.degree ?? -1);
    });
    for (const candidate of candidates) {
      if (selected.length >= 4) break;
      if (!selected.some((item) => item.name === candidate.name)) selected.push(candidate);
    }
    candidates = selected.slice(0, 4);
  }

  const right: ChordPitch[] = compactIfWide(candidates, rootRequired ? new Set([chord.root.name]) : new Set());
  return Object.freeze({ left, right: Object.freeze(right) });
}

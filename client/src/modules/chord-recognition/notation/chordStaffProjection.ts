import type { ChordPitch } from "../types";

export type VexFlowAccidental = "bb" | "b" | "n" | "#" | "##";
export type ChordStaffClef = "bass" | "treble";

export type ChordStaffPitch = Readonly<{
  midi: number;
  letter: ChordPitch["letter"];
  octave: number;
  accidental: number;
  accidentalSymbol: VexFlowAccidental;
  name: string;
  pitchClass: number;
  key: string;
  clef: ChordStaffClef;
}>;

export type ChordStaffProjection = Readonly<{
  pitches: readonly ChordStaffPitch[];
  bass: readonly ChordStaffPitch[];
  treble: readonly ChordStaffPitch[];
}>;

const ACCIDENTAL_SYMBOLS: Readonly<Record<number, VexFlowAccidental>> = {
  [-2]: "bb",
  [-1]: "b",
  [0]: "n",
  [1]: "#",
  [2]: "##",
};

/** Map the exact chord spelling to a VexFlow key and an explicit accidental glyph. */
export function accidentalToVexFlowSymbol(accidental: number): VexFlowAccidental {
  const symbol = ACCIDENTAL_SYMBOLS[accidental];
  if (!symbol) {
    throw new RangeError(`Unsupported chord accidental: ${accidental}`);
  }
  return symbol;
}

/**
 * Project actual pitches, not pitch classes: MIDI order, spelling, octave and accidental are
 * retained for rendering and parity checks. Pitches below middle C (MIDI 60) use bass clef.
 */
export function projectChordStaff(pitches: readonly ChordPitch[]): ChordStaffProjection {
  const projected = pitches
    .map((pitch): ChordStaffPitch => ({
      midi: pitch.midi,
      letter: pitch.letter,
      octave: pitch.octave,
      accidental: pitch.accidental,
      accidentalSymbol: accidentalToVexFlowSymbol(pitch.accidental),
      name: pitch.name,
      pitchClass: pitch.pitchClass,
      key: `${pitch.letter.toLowerCase()}/${pitch.octave}`,
      clef: pitch.midi < 60 ? "bass" : "treble",
    }))
    .sort((a, b) => a.midi - b.midi);

  return {
    pitches: projected,
    bass: projected.filter((pitch) => pitch.clef === "bass"),
    treble: projected.filter((pitch) => pitch.clef === "treble"),
  };
}

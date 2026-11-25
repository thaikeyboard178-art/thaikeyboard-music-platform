import React from "react";
import type { CSSProperties } from "react";
import type { ChordPitch } from "../types";

export type ChordPianoProps = Readonly<{
  pitches?: readonly ChordPitch[];
  left?: readonly ChordPitch[];
  right?: readonly ChordPitch[];
  showLabels?: boolean;
  hand?: "both" | "left" | "right";
}>;

type Hand = "left" | "right" | "both" | "unspecified";
type VisiblePitch = Readonly<{ pitch: ChordPitch; hand: Hand }>;
type PianoKey = Readonly<{ midi: number; whiteIndex?: number; pitch?: VisiblePitch }>;

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

function selectedPitchEntries({ pitches = [], left, right, hand = "both" }: ChordPianoProps): VisiblePitch[] {
  const hasHandCollections = left !== undefined || right !== undefined;
  const entries: VisiblePitch[] = hasHandCollections
    ? [
        ...(left ?? []).map((pitch) => ({ pitch, hand: "left" as const })),
        ...(right ?? []).map((pitch) => ({ pitch, hand: "right" as const })),
      ]
    : pitches.map((pitch) => ({ pitch, hand: "unspecified" }));

  return hasHandCollections
    ? entries.filter((entry) => hand === "both" || entry.hand === "both" || entry.hand === hand)
    : entries;
}

function mergePitchesByMidi(entries: readonly VisiblePitch[]): Map<number, VisiblePitch> {
  const byMidi = new Map<number, VisiblePitch>();
  for (const entry of entries) {
    const existing = byMidi.get(entry.pitch.midi);
    if (!existing) {
      byMidi.set(entry.pitch.midi, entry);
      continue;
    }
    const mergedHand: Hand = existing.hand === entry.hand ? existing.hand : "both";
    byMidi.set(entry.pitch.midi, { pitch: existing.pitch, hand: mergedHand });
  }
  return byMidi;
}

function keysAroundPitches(entries: readonly VisiblePitch[]): { white: PianoKey[]; black: PianoKey[] } {
  const midiValues = entries.map(({ pitch }) => pitch.midi);
  const firstMidi = midiValues.length ? Math.min(...midiValues) : 48;
  const lastMidi = midiValues.length ? Math.max(...midiValues) : 71;
  const startC = Math.floor(firstMidi / 12) * 12;
  const endB = Math.floor(lastMidi / 12) * 12 + 11;
  const whiteMidis: number[] = [];
  for (let midi = startC; midi <= endB; midi += 1) {
    if (!isBlackKey(midi)) whiteMidis.push(midi);
  }
  const whiteIndex = new Map(whiteMidis.map((midi, index) => [midi, index]));
  const pitchByMidi = mergePitchesByMidi(entries);
  const white = whiteMidis.map((midi) => ({ midi, whiteIndex: whiteIndex.get(midi), pitch: pitchByMidi.get(midi) }));
  const black: PianoKey[] = [];
  for (let midi = startC; midi <= endB; midi += 1) {
    if (!isBlackKey(midi)) continue;
    let previousWhite = midi - 1;
    while (previousWhite >= startC && isBlackKey(previousWhite)) previousWhite -= 1;
    black.push({ midi, whiteIndex: whiteIndex.get(previousWhite), pitch: pitchByMidi.get(midi) });
  }
  return { white, black };
}

function keyClassName(color: "white" | "black", pitch: VisiblePitch | undefined): string {
  // `.both` is a neutral shared style for unspecified chord-wide presses, not a hand assignment.
  const handClass = pitch?.hand === "unspecified" ? "both" : pitch?.hand;
  return ["chord-key", color, pitch ? "pressed" : "", handClass ?? ""].filter(Boolean).join(" ");
}

function renderKey(key: PianoKey, color: "white" | "black", whiteCount: number, showLabels: boolean, genericHand: boolean) {
  const whiteWidth = 100 / whiteCount;
  const width = color === "white" ? whiteWidth : whiteWidth * 0.62;
  const left = color === "white"
    ? (key.whiteIndex ?? 0) * whiteWidth
    : ((key.whiteIndex ?? 0) + 1) * whiteWidth - width / 2;
  const style: CSSProperties = {
    position: "absolute",
    top: 0,
    left: `${left}%`,
    width: `${width}%`,
    ...(color === "black" ? { height: "63%", zIndex: 2 } : { height: "100%", zIndex: 1 }),
  };
  const pitch = key.pitch;
  const handDescription = pitch?.hand === "left" ? "tay trái" : pitch?.hand === "right" ? "tay phải" : "cả hai tay";
  const accessibleLabel = pitch
    ? showLabels
      ? genericHand
        ? `Phím ${pitch.pitch.name}${pitch.pitch.octave} đang được nhấn`
        : `Phím ${pitch.pitch.name}${pitch.pitch.octave}, được nhấn bởi ${handDescription}`
      : genericHand
        ? "Phím đang được nhấn"
        : `Phím đang được nhấn bởi ${handDescription}`
    : undefined;

  return (
    <div
      key={key.midi}
      className={keyClassName(color, pitch)}
      style={style}
      data-midi={key.midi}
      data-hand={pitch ? (pitch.hand === "unspecified" ? "unspecified" : pitch.hand) : undefined}
      role={pitch ? "img" : undefined}
      aria-label={accessibleLabel}
      aria-hidden={pitch ? undefined : true}
    >
      {showLabels && pitch && <span className="chord-key-label">{pitch.pitch.name}{pitch.pitch.octave}</span>}
    </div>
  );
}

export function ChordPiano({ pitches = [], left, right, showLabels = false, hand = "both" }: ChordPianoProps) {
  const hasHandCollections = left !== undefined || right !== undefined;
  const visiblePitches = selectedPitchEntries({ pitches, left, right, hand });
  const { white, black } = keysAroundPitches(visiblePitches);
  const whiteCount = white.length;
  const minimumKeybedWidth = Math.max(360, whiteCount * 30);
  const style: CSSProperties = {
    position: "relative",
    width: "100%",
    minWidth: `${minimumKeybedWidth}px`,
    minHeight: "132px",
    boxSizing: "border-box",
  };
  const hasLeft = visiblePitches.some((entry) => entry.hand === "left" || entry.hand === "both");
  const hasRight = visiblePitches.some((entry) => entry.hand === "right" || entry.hand === "both");

  return (
    <section className="chord-piano" aria-label="Piano ảo">
      <div
        className="chord-piano-scroll"
        role="region"
        tabIndex={0}
        aria-label="Bàn phím piano, có thể cuộn ngang trên màn hình nhỏ"
        style={{ width: "100%", maxWidth: "100%", overflowX: "auto", overscrollBehaviorX: "contain" }}
      >
        <div className="chord-keybed" role="group" aria-label="Bàn phím piano" style={style}>
          <div className="chord-key-layer chord-white-keys">
            {white.map((key) => renderKey(key, "white", whiteCount, showLabels, !hasHandCollections))}
          </div>
          <div className="chord-key-layer chord-black-keys">
            {black.map((key) => renderKey(key, "black", whiteCount, showLabels, !hasHandCollections))}
          </div>
        </div>
      </div>
      {hasHandCollections && (hasLeft || hasRight) && (
        <div className="chord-piano-legend" aria-label="Màu bàn tay">
          {hasLeft && <span className="chord-piano-legend-item left"><i aria-hidden="true" />Tay trái · LH</span>}
          {hasRight && <span className="chord-piano-legend-item right"><i aria-hidden="true" />Tay phải · RH</span>}
        </div>
      )}
    </section>
  );
}

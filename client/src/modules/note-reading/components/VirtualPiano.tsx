import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { BrowserAudioEngine } from "../services/audio";
import { midiPitch, NOTE_LETTERS, NOTE_SEMITONES, NOTE_SOLFEGE } from "../notation/musicTheory";
import type { Accidental, NoteAnswer, NoteEvent, NoteLetter } from "../types";

type PianoKey = {
  id: string;
  letter: NoteLetter;
  octave: number;
  accidental: Accidental;
  midi: number;
  label: string;
  black: boolean;
  whiteIndex?: number;
};

type VirtualPianoProps = {
  target: NoteEvent;
  disabled: boolean;
  lastAnswer: NoteAnswer | null;
  lastAnswerCorrect: boolean | null;
  onAnswer: (answer: NoteAnswer) => void;
};

const BLACK_KEY_AFTER: Partial<Record<NoteLetter, NoteLetter>> = { C: "D", D: "E", F: "G", G: "A", A: "B" };
const OCTAVE_MIN = 1;
const OCTAVE_MAX_START = 6;

function keysForOctaves(startOctave: number): PianoKey[] {
  const keys: PianoKey[] = [];
  for (let octaveOffset = 0; octaveOffset < 2; octaveOffset += 1) {
    const octave = startOctave + octaveOffset;
    NOTE_LETTERS.forEach((letter, whiteIndex) => {
      keys.push({
        id: `${letter}${octave}`,
        letter,
        octave,
        accidental: "natural",
        midi: midiPitch(letter, octave),
        label: `${NOTE_SOLFEGE[letter]} ${octave}`,
        black: false,
        whiteIndex: octaveOffset * 7 + whiteIndex,
      });
      const sharpLetter = BLACK_KEY_AFTER[letter];
      if (sharpLetter) {
        const sharpName = `${letter}#`;
        keys.push({
          id: `${sharpName}${octave}`,
          letter,
          octave,
          accidental: "sharp",
          midi: 12 * (octave + 1) + NOTE_SEMITONES[letter] + 1,
          label: `${NOTE_SOLFEGE[letter]} thăng ${octave}`,
          black: true,
          whiteIndex: octaveOffset * 7 + whiteIndex,
        });
      }
    });
  }
  return keys;
}

export function VirtualPiano({ target, disabled, lastAnswer, lastAnswerCorrect, onAnswer }: VirtualPianoProps) {
  const [startOctave, setStartOctave] = useState(() => Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX_START, target.octave - 1)));
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const audioRef = useRef<BrowserAudioEngine | null>(null);
  const keys = useMemo(() => keysForOctaves(startOctave), [startOctave]);
  const whiteKeys = keys.filter((key) => !key.black);
  const blackKeys = keys.filter((key) => key.black);

  useEffect(() => {
    const preferredStart = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX_START, target.octave - 1));
    setStartOctave((current) => target.octave < current || target.octave > current + 1 ? preferredStart : current);
  }, [target.octave]);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  function press(key: PianoKey) {
    if (disabled) return;
    audioRef.current ??= new BrowserAudioEngine();
    void audioRef.current.play(key.midi);
    setPressedKey(key.id);
    window.setTimeout(() => setPressedKey((current) => current === key.id ? null : current), 260);
    onAnswer({ letter: key.letter, octave: key.octave, accidental: key.accidental, pitchValue: key.midi });
  }

  return (
    <section className="piano-panel" aria-label="Piano ảo">
      <div className="piano-toolbar">
        <div className="piano-caption"><Volume2 size={15} /><span>Piano ảo</span><small>· 2 quãng tám</small></div>
        <div className="octave-navigation" aria-label="Chọn quãng tám">
          <button type="button" onClick={() => setStartOctave((value) => Math.max(OCTAVE_MIN, value - 1))} disabled={startOctave <= OCTAVE_MIN} aria-label="Hạ quãng tám"><ChevronLeft size={15} /></button>
          <span>Đô {startOctave} – Si {startOctave + 1}</span>
          <button type="button" onClick={() => setStartOctave((value) => Math.min(OCTAVE_MAX_START, value + 1))} disabled={startOctave >= OCTAVE_MAX_START} aria-label="Tăng quãng tám"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="piano-scroll" role="region" tabIndex={0} aria-label="Bàn phím đàn, có thể cuộn ngang trên màn hình nhỏ">
        <div className="piano-keybed" role="group" aria-label={`Bàn phím hai quãng tám bắt đầu ở quãng ${startOctave}`}>
          <div className="piano-white-keys">
            {whiteKeys.map((key) => (
              <button key={key.id} type="button" className={`piano-key piano-key-white ${pressedKey === key.id ? "is-pressed" : ""} ${disabled && key.midi === target.pitchValue ? "answer-is-correct" : ""} ${disabled && lastAnswerCorrect === false && lastAnswer?.pitchValue === key.midi ? "answer-selected-wrong" : ""}`} onClick={() => press(key)} disabled={disabled} aria-label={`Phím ${key.label}`} aria-pressed={pressedKey === key.id}>
                <span>{NOTE_SOLFEGE[key.letter]}</span><small>{key.letter}{key.octave}</small>
              </button>
            ))}
          </div>
          <div className="piano-black-keys">
            {blackKeys.map((key) => (
              <button key={key.id} type="button" className={`piano-key piano-key-black ${pressedKey === key.id ? "is-pressed" : ""} ${disabled && key.midi === target.pitchValue ? "answer-is-correct" : ""} ${disabled && lastAnswerCorrect === false && lastAnswer?.pitchValue === key.midi ? "answer-selected-wrong" : ""}`} style={{ left: `${((key.whiteIndex ?? 0) + 1) / whiteKeys.length * 100}%` }} onClick={() => press(key)} disabled={disabled} aria-label={`Phím ${key.label}`} aria-pressed={pressedKey === key.id}>
                <span>{key.letter}♯</span><small>{key.octave}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="piano-help">Chọn phím có đúng tên nốt và quãng tám. Phím đen là nốt thăng, dùng để làm quen cao độ.</p>
    </section>
  );
}

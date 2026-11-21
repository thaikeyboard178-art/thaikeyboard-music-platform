import { describe, expect, it } from "vitest";
import type { ChordPitch, PlaybackConfiguration } from "../types";
import {
  canPlay,
  ChordAudioPlayer,
  createChordPlaybackPlan,
  replayRemaining,
} from "./playback";

type OscillatorRecord = {
  type: OscillatorType;
  frequencyValues: Array<[number, number]>;
  startCalls: number[];
  stopCalls: number[];
  disconnected: boolean;
  onended: (() => void) | null;
};

type GainRecord = {
  events: Array<[string, number, number]>;
  disconnected: boolean;
};

function fakeAudioContext() {
  const oscillators: OscillatorRecord[] = [];
  const gains: GainRecord[] = [];
  let currentTime = 5;
  let state: AudioContextState = "running";
  let resumeImplementation: () => Promise<void> = () => Promise.resolve();
  let resumeCalls = 0;
  const context = {
    get currentTime() {
      return currentTime;
    },
    set currentTime(value: number) {
      currentTime = value;
    },
    get state() {
      return state;
    },
    set state(value: AudioContextState) {
      state = value;
    },
    destination: {},
    setResumeImplementation(implementation: () => Promise<void>) {
      resumeImplementation = implementation;
    },
    setState(value: AudioContextState) {
      state = value;
    },
    get resumeCalls() {
      return resumeCalls;
    },
    resume() {
      resumeCalls++;
      return resumeImplementation().then(() => {
        state = "running";
      });
    },
    createOscillator() {
      const record: OscillatorRecord = {
        type: "sine",
        frequencyValues: [],
        startCalls: [],
        stopCalls: [],
        disconnected: false,
        onended: null,
      };
      oscillators.push(record);
      return {
        frequency: {
          setValueAtTime(value: number, at: number) {
            record.frequencyValues.push([value, at]);
          },
        },
        get type() {
          return record.type;
        },
        set type(value: OscillatorType) {
          record.type = value;
        },
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
        start(at: number) {
          record.startCalls.push(at);
        },
        stop(at: number) {
          record.stopCalls.push(at);
        },
        get onended() {
          return record.onended;
        },
        set onended(value: (() => void) | null) {
          record.onended = value;
        },
      };
    },
    createGain() {
      const record: GainRecord = { events: [], disconnected: false };
      gains.push(record);
      return {
        gain: {
          setValueAtTime(value: number, at: number) {
            record.events.push(["set", value, at]);
          },
          linearRampToValueAtTime(value: number, at: number) {
            record.events.push(["ramp", value, at]);
          },
          cancelScheduledValues(at: number) {
            record.events.push(["cancel", 0, at]);
          },
        },
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
      };
    },
  };
  return {
    context: context as unknown as AudioContext,
    oscillators,
    gains,
    setResumeImplementation: context.setResumeImplementation,
    setState: context.setState,
    get resumeCalls() {
      return context.resumeCalls;
    },
  };
}

function pitch(midi: number): ChordPitch {
  const letters = [
    "C",
    "C",
    "D",
    "D",
    "E",
    "F",
    "F",
    "G",
    "G",
    "A",
    "A",
    "B",
  ] as const;
  return {
    letter: letters[midi % 12],
    accidental: 0,
    name: `MIDI ${midi}`,
    pitchClass: midi % 12,
    octave: Math.floor(midi / 12) - 1,
    midi,
  };
}

const pitches = [pitch(67), pitch(60), pitch(64)];
const baseConfig: PlaybackConfiguration = {
  mode: "melody",
  direction: "ascending",
  spacingMs: 200,
};

let sharedFake: ReturnType<typeof fakeAudioContext> | undefined;

describe("Chord playback planning and scheduling", () => {
  it("creates immutable ascending and descending melodies with bounded gates", () => {
    const ascending = createChordPlaybackPlan(pitches, baseConfig);
    const descending = createChordPlaybackPlan(pitches, {
      ...baseConfig,
      direction: "descending",
    });

    expect(ascending.notes.map(note => note.midi)).toEqual([60, 64, 67]);
    expect(descending.notes.map(note => note.midi)).toEqual([67, 64, 60]);
    expect(ascending.notes.map(note => note.startSeconds)).toEqual([
      0, 0.2, 0.4,
    ]);
    expect(
      ascending.notes.every(note => note.endSeconds - note.startSeconds <= 0.16)
    ).toBe(true);
    expect(ascending.durationSeconds).toBeCloseTo(0.55);
    expect(Object.isFrozen(ascending)).toBe(true);
    expect(Object.isFrozen(ascending.notes)).toBe(true);
    expect(ascending.notes.every(Object.isFrozen)).toBe(true);
    expect(pitches.map(note => note.midi)).toEqual([67, 60, 64]);
  });

  it("resolves random direction once per melody play", () => {
    let calls = 0;
    const ascending = createChordPlaybackPlan(
      pitches,
      { ...baseConfig, direction: "random" },
      () => {
        calls++;
        return 0.49;
      }
    );
    expect(ascending.notes.map(note => note.midi)).toEqual([60, 64, 67]);
    expect(calls).toBe(1);

    const descending = createChordPlaybackPlan(
      pitches,
      { ...baseConfig, mode: "both", direction: "random" },
      () => {
        calls++;
        return 0.5;
      }
    );
    expect(descending.notes.slice(0, 3).map(note => note.midi)).toEqual([
      67, 64, 60,
    ]);
    expect(calls).toBe(2);
  });

  it("schedules a block chord simultaneously and Both after a clear release gap", () => {
    const harmony = createChordPlaybackPlan(pitches, {
      ...baseConfig,
      mode: "harmony",
      direction: "descending",
    });
    expect(harmony.notes.map(note => note.startSeconds)).toEqual([0, 0, 0]);
    expect(harmony.durationSeconds).toBe(0.9);

    const both = createChordPlaybackPlan(pitches, {
      ...baseConfig,
      mode: "both",
    });
    const melody = both.notes.slice(0, 3);
    const chord = both.notes.slice(3);
    expect(
      chord.every(note => Math.abs(note.startSeconds - 0.95) < 1e-12)
    ).toBe(true);
    expect(chord[0].startSeconds - melody.at(-1)!.endSeconds).toBeCloseTo(0.4);
    expect(both.durationSeconds).toBeCloseTo(1.85);
  });

  it("accepts inclusive spacing and MIDI boundaries and rejects invalid input explicitly", () => {
    for (const spacingMs of [150, 1000]) {
      const plan = createChordPlaybackPlan([pitch(24), pitch(108)], {
        ...baseConfig,
        spacingMs,
      });
      expect(plan.notes[0].midi).toBe(24);
      expect(plan.notes[1].midi).toBe(108);
      expect(plan.notes[0].endSeconds - plan.notes[0].startSeconds).toBeCloseTo(
        (spacingMs / 1000) * 0.75
      );
    }
    expect(() => createChordPlaybackPlan([], baseConfig)).toThrow(RangeError);
    expect(() => createChordPlaybackPlan([pitch(23)], baseConfig)).toThrow(
      RangeError
    );
    expect(() => createChordPlaybackPlan([pitch(109)], baseConfig)).toThrow(
      RangeError
    );
    expect(() => createChordPlaybackPlan([pitch(NaN)], baseConfig)).toThrow(
      RangeError
    );
    expect(() =>
      createChordPlaybackPlan(pitches, { ...baseConfig, spacingMs: 149 })
    ).toThrow(RangeError);
    expect(() =>
      createChordPlaybackPlan(pitches, { ...baseConfig, spacingMs: 1001 })
    ).toThrow(RangeError);
    expect(() =>
      createChordPlaybackPlan(pitches, { ...baseConfig, spacingMs: Infinity })
    ).toThrow(RangeError);
    expect(() =>
      createChordPlaybackPlan(
        pitches,
        { ...baseConfig, direction: "random" },
        () => 1
      )
    ).toThrow(RangeError);
  });

  it("calls the approved voice helper for real oscillator schedules and shares one context", async () => {
    const fake = fakeAudioContext();
    sharedFake = fake;
    let firstFactoryCalls = 0;
    let secondFactoryCalls = 0;
    const firstOwner = new ChordAudioPlayer(() => {
      firstFactoryCalls++;
      return fake.context;
    });
    const secondOwner = new ChordAudioPlayer(() => {
      secondFactoryCalls++;
      return fakeAudioContext().context;
    });

    const result = await firstOwner.play(pitches, {
      ...baseConfig,
      mode: "harmony",
    });
    expect(result.durationSeconds).toBe(0.9);
    expect(firstFactoryCalls).toBe(1);
    expect(fake.oscillators).toHaveLength(3);
    expect(
      fake.oscillators.map(oscillator => oscillator.startCalls[0])
    ).toEqual([5.04, 5.04, 5.04]);
    expect(fake.oscillators.map(oscillator => oscillator.stopCalls[0])).toEqual(
      [5.94, 5.94, 5.94]
    );
    for (const oscillator of fake.oscillators) {
      const midi = Math.round(
        69 + 12 * Math.log2(oscillator.frequencyValues[0][0] / 440)
      );
      expect([60, 64, 67]).toContain(midi);
    }
    expect(fake.gains.slice(0, 3).map(gain => gain.events[1][1])).toEqual([
      0.06, 0.06, 0.06,
    ]);

    await secondOwner.play(pitches, { ...baseConfig, mode: "both" });
    expect(secondFactoryCalls).toBe(0);
    expect(fake.oscillators).toHaveLength(9);
    const bothOscillators = fake.oscillators.slice(3);
    expect(
      bothOscillators.slice(0, 3).map(oscillator => oscillator.startCalls[0])
    ).toEqual([5.04, 5.24, 5.44]);
    expect(
      bothOscillators
        .slice(3)
        .every(oscillator => Math.abs(oscillator.startCalls[0] - 5.99) < 1e-12)
    ).toBe(true);

    firstOwner.stop();
    expect(
      fake.oscillators.slice(0, 3).every(oscillator => oscillator.disconnected)
    ).toBe(true);
    expect(
      fake.oscillators.slice(3).every(oscillator => !oscillator.disconnected)
    ).toBe(true);
    expect(
      fake.oscillators
        .slice(3)
        .every(oscillator => oscillator.stopCalls.length === 1)
    ).toBe(true);
    secondOwner.stop();
    expect(
      fake.oscillators.slice(3).every(oscillator => oscillator.disconnected)
    ).toBe(true);
    expect(
      fake.oscillators
        .slice(3)
        .every(oscillator => oscillator.stopCalls.at(-1) === 5)
    ).toBe(true);
  });

  it("cancels existing and pending-resume playback without resurrecting voices", async () => {
    const fake = sharedFake;
    expect(fake).toBeDefined();
    const player = new ChordAudioPlayer();
    await player.play([pitch(60)], { ...baseConfig, mode: "harmony" });
    const priorVoice = fake!.oscillators.at(-1)!;
    expect(priorVoice.disconnected).toBe(false);

    let resolveResume!: () => void;
    fake!.setState("suspended");
    fake!.setResumeImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveResume = resolve;
        })
    );
    const beforePending = fake!.oscillators.length;
    const pending = player.play(pitches, { ...baseConfig, mode: "both" });
    expect(fake!.resumeCalls).toBe(1);
    expect(priorVoice.disconnected).toBe(true);
    expect(priorVoice.stopCalls.at(-1)).toBe(5);
    expect(fake!.oscillators).toHaveLength(beforePending);

    player.stop();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    resolveResume();
    await Promise.resolve();
    await Promise.resolve();
    expect(fake!.oscillators).toHaveLength(beforePending);
    expect(fake!.gains.at(-1)?.disconnected).toBe(true);
    fake!.setResumeImplementation(() => Promise.resolve());
  });

  it("counts the initial play as free and applies replay limits only after success", () => {
    expect(canPlay(0, 1)).toBe(true);
    expect(replayRemaining(0, 1)).toBe(1);
    expect(canPlay(1, 1)).toBe(true);
    expect(replayRemaining(1, 1)).toBe(1);
    expect(canPlay(2, 1)).toBe(false);
    expect(replayRemaining(2, 1)).toBe(0);
    expect(canPlay(3, 3)).toBe(true);
    expect(canPlay(4, 3)).toBe(false);
    expect(replayRemaining(4, 3)).toBe(0);
    expect(canPlay(100, null)).toBe(true);
    expect(replayRemaining(100, null)).toBeNull();
    expect(() => canPlay(-1, 1)).toThrow(RangeError);
    expect(() => replayRemaining(0.5, 3)).toThrow(RangeError);
  });
});

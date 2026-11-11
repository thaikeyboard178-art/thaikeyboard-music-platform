import { describe, expect, it } from "vitest";
import { HALF_TIE, WHOLE_NOTE } from "../rhythm/fixtures";
import { createListenPlaybackPlan, createRhythmAudioPlan } from "./plan";
import {
  scheduleRhythmVoice,
  validateVoiceSettings,
  type RhythmVoiceSettings,
} from "./voices";

const settings: RhythmVoiceSettings = {
  pattern: {
    frequencyHz: 440,
    level: 0.1,
    waveform: "triangle",
    edgeSeconds: 0.005,
  },
  metronome: {
    frequencyHz: 1000,
    level: 0.1,
    waveform: "square",
    durationSeconds: 0.025,
    edgeSeconds: 0.003,
  },
};
function fakeContext() {
  const gains: { values: [string, number, number][]; disconnected: boolean }[] =
    [];
  const oscillators: {
    start: number | null;
    stop: number | null;
    onended: (() => void) | null;
    disconnected: boolean;
  }[] = [];
  const context = {
    currentTime: 1,
    destination: {},
    createOscillator: () => {
      const record = {
        start: null as number | null,
        stop: null as number | null,
        onended: null as (() => void) | null,
        disconnected: false,
      };
      oscillators.push(record);
      return {
        frequency: { setValueAtTime() {} },
        type: "sine",
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
        start(at: number) {
          record.start = at;
        },
        stop(at: number) {
          record.stop = at;
        },
        get onended() {
          return record.onended;
        },
        set onended(value: (() => void) | null) {
          record.onended = value;
        },
      };
    },
    createGain: () => {
      const record = {
        values: [] as [string, number, number][],
        disconnected: false,
      };
      gains.push(record);
      return {
        gain: {
          setValueAtTime(value: number, at: number) {
            record.values.push(["set", value, at]);
          },
          linearRampToValueAtTime(value: number, at: number) {
            record.values.push(["ramp", value, at]);
          },
          cancelScheduledValues(at: number) {
            record.values.push(["cancel", 0, at]);
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
    context: context as unknown as BaseAudioContext,
    oscillators,
    gains,
  };
}

describe("production native Web Audio rhythm voices", () => {
  it("holds one oscillator gate over the entire tie group with no continuation attack", () => {
    const event = createListenPlaybackPlan(HALF_TIE).toneEvents[0];
    const { context, oscillators, gains } = fakeContext();
    let ended = 0;
    scheduleRhythmVoice(context, event, 2, 6, settings, () => {
      ended++;
    });
    expect(event.segmentIds).toHaveLength(2);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]).toMatchObject({ start: 2, stop: 6 });
    expect(gains[0].values.at(-1)).toEqual(["ramp", 0, 6]);
    oscillators[0].onended!();
    expect(gains[0].disconnected).toBe(true);
    expect(oscillators[0].disconnected).toBe(true);
    expect(ended).toBe(1);
  });

  it("does not derive arbitrary amplitude ratios from structural or explicit segment accents", () => {
    const base = createListenPlaybackPlan(WHOLE_NOTE).toneEvents[0];
    const { context, gains } = fakeContext();
    for (const structuralAccent of ["strong", "medium", "weak"] as const)
      scheduleRhythmVoice(
        context,
        { ...base, structuralAccent, segmentAccent: "strong" },
        2,
        6,
        settings
      );
    expect(gains.map(g => g.values)).toEqual([
      gains[0].values,
      gains[0].values,
      gains[0].values,
    ]);
    expect(
      gains[0].values.some(([, value]) => value === settings.pattern.level)
    ).toBe(true);
  });

  it("metronome uses a short tick envelope rather than a sustained pattern voice", () => {
    const event = createRhythmAudioPlan(WHOLE_NOTE, "metronome").pulseEvents[0];
    const { context, oscillators, gains } = fakeContext();
    const handle = scheduleRhythmVoice(context, event, 2, 3, settings);
    expect(oscillators[0].stop).toBe(2.025);
    expect(gains[0].values.at(-1)).toEqual(["ramp", 0, 2.025]);
    handle.cancel();
    handle.cancel();
    expect(oscillators[0].stop).toBe(1);
    expect(gains[0].disconnected).toBe(true);
    expect(oscillators[0].onended).toBeNull();
  });

  it("disconnects created nodes and preserves the original source-start exception", () => {
    const { context, oscillators, gains } = fakeContext();
    const originalCreate = context.createOscillator.bind(context);
    const failure = new Error("native source start failed");
    context.createOscillator = () => {
      const oscillator = originalCreate();
      oscillator.start = () => {
        throw failure;
      };
      return oscillator;
    };
    let callbacks = 0;
    const event = createListenPlaybackPlan(WHOLE_NOTE).toneEvents[0];
    expect(() =>
      scheduleRhythmVoice(context, event, 2, 6, settings, () => {
        callbacks++;
      })
    ).toThrow(failure);
    expect(oscillators[0].disconnected).toBe(true);
    expect(gains[0].disconnected).toBe(true);
    expect(callbacks).toBe(1);
  });

  it("rejects malformed settings and impossible audio gates", () => {
    for (const level of [0, -1, 2, NaN, Infinity])
      expect(() =>
        validateVoiceSettings({
          ...settings,
          pattern: { ...settings.pattern, level },
        })
      ).toThrow(RangeError);
    expect(() =>
      validateVoiceSettings({
        ...settings,
        metronome: { ...settings.metronome, durationSeconds: Infinity },
      })
    ).toThrow(RangeError);
    const event = createListenPlaybackPlan(WHOLE_NOTE).toneEvents[0];
    const { context } = fakeContext();
    for (const end of [2, 1, NaN, Infinity])
      expect(() =>
        scheduleRhythmVoice(context, event, 2, end, settings)
      ).toThrow(RangeError);
  });
});

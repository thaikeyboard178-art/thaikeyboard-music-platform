import { describe, expect, it } from "vitest";
import { HALF_TIE } from "../rhythm/fixtures";
import { createRhythmAudioPlan } from "./plan";
import { experienceVoiceSettings } from "./experienceAudio";
import { scheduleRhythmVoice } from "./voices";

type Automation = ["set" | "ramp" | "exponential" | "cancel", number, number];
type OscillatorRecord = {
  frequency: Automation[];
  starts: number[];
  stops: number[];
  connections: unknown[];
  disconnected: boolean;
  onended: (() => void) | null;
};
type GainRecord = {
  values: Automation[];
  connections: unknown[];
  disconnected: boolean;
};

function mockAudioContext(failStartOn?: number) {
  const destination = { name: "destination" } as unknown as AudioNode;
  const oscillators: OscillatorRecord[] = [];
  const gains: GainRecord[] = [];
  const audioParam = (record: Automation[]) => ({
    setValueAtTime(value: number, at: number) {
      record.push(["set", value, at]);
    },
    linearRampToValueAtTime(value: number, at: number) {
      record.push(["ramp", value, at]);
    },
    exponentialRampToValueAtTime(value: number, at: number) {
      record.push(["exponential", value, at]);
    },
    cancelScheduledValues(at: number) {
      record.push(["cancel", 0, at]);
    },
  });
  let startCalls = 0;
  const context = {
    currentTime: 1.5,
    destination,
    createOscillator: () => {
      const record: OscillatorRecord = {
        frequency: [],
        starts: [],
        stops: [],
        connections: [],
        disconnected: false,
        onended: null,
      };
      oscillators.push(record);
      return {
        type: "sine" as OscillatorType,
        frequency: audioParam(record.frequency),
        connect(node: unknown) {
          record.connections.push(node);
        },
        disconnect() {
          record.disconnected = true;
        },
        start(at: number) {
          startCalls += 1;
          if (startCalls === failStartOn)
            throw new Error("resonant oscillator start failed");
          record.starts.push(at);
        },
        stop(at?: number) {
          if (at !== undefined) record.stops.push(at);
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
      const record: GainRecord = {
        values: [],
        connections: [],
        disconnected: false,
      };
      gains.push(record);
      return {
        gain: audioParam(record.values),
        connect(node: unknown) {
          record.connections.push(node);
        },
        disconnect() {
          record.disconnected = true;
        },
      };
    },
    createBufferSource: () => {
      throw new Error("Resonant knocks should use native oscillator modes.");
    },
    createBuffer: () => {
      throw new Error(
        "Resonant knocks should not synthesize a PCM click buffer."
      );
    },
  };
  return {
    context: context as unknown as BaseAudioContext,
    oscillators,
    gains,
  };
}

const metronomeEvent = () =>
  createRhythmAudioPlan(HALF_TIE, "metronome").pulseEvents[0];

describe("opt-in resonant metronome voice", () => {
  it("uses distinct structural modes and rings past a shorter event gate without moving its onset", () => {
    const { context, oscillators, gains } = mockAudioContext();
    const output = { name: "metronome-output" } as unknown as AudioNode;
    const settings = experienceVoiceSettings({} as AudioBuffer, output);
    expect(settings.metronome.resonantKnock).toBe(true);
    expect(settings.metronome.durationSeconds).toBe(0.18);
    expect(settings.metronome.durationSeconds).toBeLessThan(60 / 300);
    expect(settings.metronome.edgeSeconds).toBeLessThanOrEqual(0.001);

    const modalFrequencies: number[][] = [];
    const profilePeaks: number[] = [];
    for (const structuralAccent of ["strong", "medium", "weak"] as const) {
      const firstVoiceIndex = oscillators.length;
      const firstGainIndex = gains.length;
      scheduleRhythmVoice(
        context,
        { ...metronomeEvent(), structuralAccent },
        2,
        2.032,
        settings
      );
      const voices = oscillators.slice(firstVoiceIndex);
      const voiceGains = gains.slice(firstGainIndex);
      expect(voices).toHaveLength(4);
      expect(voiceGains).toHaveLength(4);
      expect(voices.map(voice => voice.starts)).toEqual([[2], [2], [2], [2]]);
      expect(voices.map(voice => voice.stops)).toEqual([
        [2.18],
        [2.18],
        [2.18],
        [2.18],
      ]);
      expect(voiceGains.every(gain => gain.connections[0] === output)).toBe(
        true
      );
      modalFrequencies.push(voices.map(voice => voice.frequency[0][1]));
      const modePeaks = voiceGains.map(
        gain => gain.values.find(value => value[0] === "ramp")![1]
      );
      profilePeaks.push(modePeaks[0]);
      expect(
        modePeaks.reduce((sum, peak) => sum + peak, 0)
      ).toBeLessThanOrEqual(0.4);
      expect(
        voiceGains.every(gain => {
          const attack = gain.values.find(value => value[0] === "ramp")!;
          const decay = gain.values.find(value => value[0] === "exponential")!;
          const terminalFade = gain.values
            .filter(value => value[0] === "ramp")
            .at(-1)!;
          return (
            decay[1] > 0 &&
            decay[1] < attack[1] &&
            decay[2] < 2.18 &&
            terminalFade[1] === 0 &&
            terminalFade[2] === 2.18
          );
        })
      ).toBe(true);
    }
    expect(modalFrequencies).toEqual([
      [560, 1423, 2705, 3689],
      [446, 1127, 2119, 2963],
      [342, 879, 1613, 2457],
    ]);
    expect(
      new Set(modalFrequencies.map(frequencies => frequencies.join(","))).size
    ).toBe(3);
    expect(new Set(profilePeaks).size).toBe(3);
  });

  it("releases every modal node and calls onEnded once after natural completion", () => {
    const { context, oscillators, gains } = mockAudioContext();
    const settings = experienceVoiceSettings({} as AudioBuffer);
    let ended = 0;
    const handle = scheduleRhythmVoice(
      context,
      { ...metronomeEvent(), structuralAccent: "strong" },
      2,
      2.025,
      settings,
      () => ended++
    );
    const callbacks = oscillators.map(oscillator => oscillator.onended!);

    callbacks.slice(0, 3).forEach(callback => callback());
    expect(ended).toBe(0);
    callbacks[3]();
    expect(ended).toBe(1);
    expect(oscillators.every(oscillator => oscillator.disconnected)).toBe(true);
    expect(gains.every(gain => gain.disconnected)).toBe(true);
    handle.cancel();
    expect(ended).toBe(1);
  });

  it("cancels a scheduled ring idempotently and preserves setup errors with cleanup", () => {
    const { context, oscillators, gains } = mockAudioContext();
    const settings = experienceVoiceSettings({} as AudioBuffer);
    let ended = 0;
    const handle = scheduleRhythmVoice(
      context,
      { ...metronomeEvent(), structuralAccent: "medium" },
      2,
      2.025,
      settings,
      () => ended++
    );
    handle.cancel();
    handle.cancel();
    expect(ended).toBe(1);
    expect(oscillators.map(oscillator => oscillator.stops.at(-1))).toEqual([
      1.5, 1.5, 1.5, 1.5,
    ]);
    expect(oscillators.every(oscillator => oscillator.disconnected)).toBe(true);
    expect(gains.every(gain => gain.disconnected)).toBe(true);

    const failing = mockAudioContext(2);
    let failedEnded = 0;
    expect(() =>
      scheduleRhythmVoice(
        failing.context,
        { ...metronomeEvent(), structuralAccent: "weak" },
        2,
        2.025,
        settings,
        () => failedEnded++
      )
    ).toThrow("resonant oscillator start failed");
    expect(failedEnded).toBe(1);
    expect(
      failing.oscillators.every(oscillator => oscillator.disconnected)
    ).toBe(true);
    expect(failing.gains.every(gain => gain.disconnected)).toBe(true);
  });
});

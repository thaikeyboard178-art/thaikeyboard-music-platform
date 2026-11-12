import { describe, expect, it } from "vitest";
import { HALF_TIE } from "../rhythm/fixtures";
import { createRhythmAudioPlan } from "./plan";
import { experienceVoiceSettings } from "./experienceAudio";
import { scheduleRhythmVoice } from "./voices";

type Automation = ["set" | "ramp" | "exponential" | "cancel", number, number];
type OscillatorRecord = {
  type: OscillatorType;
  frequency: Automation[];
  starts: number[];
  stops: number[];
  disconnected: boolean;
  onended: (() => void) | null;
};
type GainRecord = {
  values: Automation[];
  disconnected: boolean;
};

function nativeLikeAudioContext(failStartOn?: number) {
  const destination = { name: "destination" } as unknown as AudioNode;
  const oscillators: OscillatorRecord[] = [];
  const gains: GainRecord[] = [];
  let startCalls = 0;
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
  const context = {
    currentTime: 1.5,
    destination,
    createOscillator: () => {
      const record: OscillatorRecord = {
        type: "sine",
        frequency: [],
        starts: [],
        stops: [],
        disconnected: false,
        onended: null,
      };
      oscillators.push(record);
      return {
        get type() {
          return record.type;
        },
        set type(value: OscillatorType) {
          record.type = value;
        },
        frequency: audioParam(record.frequency),
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
        start(at: number) {
          startCalls += 1;
          if (startCalls === failStartOn)
            throw new Error("native-like oscillator start failed");
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
      const record: GainRecord = { values: [], disconnected: false };
      gains.push(record);
      return {
        gain: audioParam(record.values),
        connect() {},
        disconnect() {
          record.disconnected = true;
        },
      };
    },
    createBufferSource: () => {
      throw new Error("The resonant metronome must use oscillator modes.");
    },
    createBuffer: () => {
      throw new Error("The resonant metronome must not synthesize click PCM.");
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
const settingsAtLevel = (level: number) => {
  const settings = experienceVoiceSettings({} as AudioBuffer);
  return {
    ...settings,
    metronome: { ...settings.metronome, level },
  };
};

describe("consolidated resonant metronome scheduler", () => {
  it("schedules four distinct modal profiles at the requested onset with a capped sum and a smooth terminal fade", () => {
    const { context, oscillators, gains } = nativeLikeAudioContext();
    const settings = settingsAtLevel(1);
    const startTime = 3.125;
    const stopTime = startTime + 0.18;
    expect(settings.metronome.durationSeconds).toBeLessThan(60 / 300);
    expect(settings.metronome.edgeSeconds).toBeLessThanOrEqual(0.001);
    const expectedProfiles = [
      {
        accent: "strong",
        frequencies: [560, 1423, 2705, 3689],
        totalPeak: 0.4,
      },
      {
        accent: "medium",
        frequencies: [446, 1127, 2119, 2963],
        totalPeak: 0.32,
      },
      { accent: "weak", frequencies: [342, 879, 1613, 2457], totalPeak: 0.24 },
    ] as const;

    for (const profile of expectedProfiles) {
      const firstOscillator = oscillators.length;
      const firstGain = gains.length;
      scheduleRhythmVoice(
        context,
        { ...metronomeEvent(), structuralAccent: profile.accent },
        startTime,
        startTime + 0.025,
        settings
      );

      const modes = oscillators.slice(firstOscillator);
      const modeGains = gains.slice(firstGain);
      expect(modes).toHaveLength(4);
      expect(modeGains).toHaveLength(4);
      expect(modes.map(mode => mode.frequency[0][1])).toEqual(
        profile.frequencies
      );
      expect(modes.map(mode => mode.starts)).toEqual(
        Array.from({ length: 4 }, () => [startTime])
      );
      expect(modes.map(mode => mode.stops)).toEqual(
        Array.from({ length: 4 }, () => [stopTime])
      );

      const attackPeaks = modeGains.map(
        gain => gain.values.find(change => change[0] === "ramp")![1]
      );
      expect(attackPeaks.reduce((sum, peak) => sum + peak, 0)).toBeCloseTo(
        profile.totalPeak
      );
      expect(
        attackPeaks.reduce((sum, peak) => sum + peak, 0)
      ).toBeLessThanOrEqual(0.4);

      for (const gain of modeGains) {
        const attack = gain.values.find(change => change[0] === "ramp")!;
        const decay = gain.values.find(change => change[0] === "exponential")!;
        const ramps = gain.values.filter(change => change[0] === "ramp");
        expect(decay[1]).toBeGreaterThan(0);
        expect(decay[1]).toBeLessThan(attack[1]);
        expect(decay[2]).toBeCloseTo(stopTime - 0.008);
        expect(ramps.at(-1)).toEqual(["ramp", 0, stopTime]);
      }
    }
  });

  it("cancels all modes immediately and invokes completion once, including stale onended callbacks", () => {
    const { context, oscillators, gains } = nativeLikeAudioContext();
    const settings = settingsAtLevel(0.4);
    let ended = 0;
    const handle = scheduleRhythmVoice(
      context,
      { ...metronomeEvent(), structuralAccent: "strong" },
      4,
      4.04,
      settings,
      () => ended++
    );
    const nativeEndedCallbacks = oscillators.map(mode => mode.onended!);

    handle.cancel();
    handle.cancel();
    nativeEndedCallbacks.forEach(callback => callback());

    expect(ended).toBe(1);
    expect(oscillators).toHaveLength(4);
    expect(oscillators.map(mode => mode.stops.at(-1))).toEqual([
      context.currentTime,
      context.currentTime,
      context.currentTime,
      context.currentTime,
    ]);
    expect(oscillators.every(mode => mode.disconnected)).toBe(true);
    expect(gains.every(gain => gain.disconnected)).toBe(true);
  });

  it("completes once after all native modes end and cleans every node after a start failure", () => {
    const natural = nativeLikeAudioContext();
    let naturalEnded = 0;
    scheduleRhythmVoice(
      natural.context,
      { ...metronomeEvent(), structuralAccent: "medium" },
      2,
      2.03,
      settingsAtLevel(0.4),
      () => naturalEnded++
    );
    const nativeEndedCallbacks = natural.oscillators.map(mode => mode.onended!);
    nativeEndedCallbacks.forEach(callback => callback());
    nativeEndedCallbacks.forEach(callback => callback());
    expect(naturalEnded).toBe(1);
    expect(natural.oscillators.every(mode => mode.disconnected)).toBe(true);
    expect(natural.gains.every(gain => gain.disconnected)).toBe(true);

    const failure = new Error("native-like oscillator start failed");
    const failing = nativeLikeAudioContext(2);
    let failedEnded = 0;
    expect(() =>
      scheduleRhythmVoice(
        failing.context,
        { ...metronomeEvent(), structuralAccent: "weak" },
        2,
        2.03,
        settingsAtLevel(0.4),
        () => {
          failedEnded++;
          throw new Error("cleanup callbacks must not replace setup errors");
        }
      )
    ).toThrow(failure);
    expect(failedEnded).toBe(1);
    expect(failing.oscillators).toHaveLength(4);
    expect(
      failing.oscillators.every(
        mode => mode.stops.at(-1) === failing.context.currentTime
      )
    ).toBe(true);
    expect(failing.oscillators.every(mode => mode.disconnected)).toBe(true);
    expect(failing.gains.every(gain => gain.disconnected)).toBe(true);
  });
});

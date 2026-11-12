import { describe, expect, it } from "vitest";
import { HALF_TIE } from "../rhythm/fixtures";
import { createListenPlaybackPlan, createRhythmAudioPlan } from "./plan";
import { experienceVoiceSettings } from "./experienceAudio";
import { scheduleRhythmVoice } from "./voices";

function pianoBuffer(duration = 8.0332, sampleValue = 0.8): AudioBuffer {
  const samples = new Float32Array(128).fill(sampleValue);
  return {
    duration,
    length: samples.length,
    numberOfChannels: 1,
    sampleRate: 44100,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

function mockAudioContext() {
  const destination = { name: "destination" } as unknown as AudioNode;
  const sources: {
    buffer: AudioBuffer | null;
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    starts: number[];
    stops: number[];
    connections: unknown[];
    disconnected: boolean;
    onended: (() => void) | null;
  }[] = [];
  const gains: {
    values: ["set" | "ramp" | "cancel", number, number][];
    connections: unknown[];
    disconnected: boolean;
  }[] = [];
  const clickPcm: Float32Array[] = [];
  let oscillatorCount = 0;
  const context = {
    currentTime: 1.5,
    sampleRate: 44100,
    destination,
    createOscillator: () => {
      oscillatorCount++;
      throw new Error("Opt-in experience voices must not create oscillators.");
    },
    createBufferSource: () => {
      const record = {
        buffer: null as AudioBuffer | null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        starts: [] as number[],
        stops: [] as number[],
        connections: [] as unknown[],
        disconnected: false,
        onended: null as (() => void) | null,
      };
      sources.push(record);
      return {
        get buffer() {
          return record.buffer;
        },
        set buffer(value: AudioBuffer | null) {
          record.buffer = value;
        },
        get loop() {
          return record.loop;
        },
        set loop(value: boolean) {
          record.loop = value;
        },
        get loopStart() {
          return record.loopStart;
        },
        set loopStart(value: number) {
          record.loopStart = value;
        },
        get loopEnd() {
          return record.loopEnd;
        },
        set loopEnd(value: number) {
          record.loopEnd = value;
        },
        connect(node: unknown) {
          record.connections.push(node);
        },
        disconnect() {
          record.disconnected = true;
        },
        start(at: number) {
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
      const record = {
        values: [] as ["set" | "ramp" | "cancel", number, number][],
        connections: [] as unknown[],
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
        connect(node: unknown) {
          record.connections.push(node);
        },
        disconnect() {
          record.disconnected = true;
        },
      };
    },
    createBuffer: (_channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      clickPcm.push(data);
      return {
        duration: length / sampleRate,
        length,
        numberOfChannels: 1,
        sampleRate,
        getChannelData: () => data,
      } as unknown as AudioBuffer;
    },
  };
  return {
    context: context as unknown as BaseAudioContext,
    sources,
    gains,
    clickPcm,
    oscillatorCount: () => oscillatorCount,
  };
}

describe("opt-in experience AudioBuffer voices", () => {
  it("plays the real piano buffer once and truncates its release at the note gate", () => {
    const { context, sources, gains, oscillatorCount } = mockAudioContext();
    const sample = pianoBuffer();
    const output = { name: "pattern-output" } as unknown as AudioNode;
    const settings = experienceVoiceSettings(sample);
    const customSettings = {
      ...settings,
      pattern: { ...settings.pattern, level: 0.9, output },
    };
    const event = createListenPlaybackPlan(HALF_TIE).toneEvents[0];
    let ended = 0;

    const handle = scheduleRhythmVoice(
      context,
      event,
      2,
      6,
      customSettings,
      () => ended++
    );

    expect(oscillatorCount()).toBe(0);
    expect(sources).toHaveLength(1);
    expect(sources[0].buffer).toBe(sample);
    expect(sources[0].starts).toEqual([2]);
    expect(sources[0].stops).toEqual([6]);
    expect(sources[0].connections).toEqual([expect.any(Object)]);
    expect(gains[0].connections).toEqual([output]);
    expect(gains[0].values.at(-1)).toEqual(["ramp", 0, 6]);
    const peak = Math.max(
      ...gains[0].values
        .filter(value => value[0] === "ramp")
        .map(value => value[1])
    );
    expect(peak * 0.8).toBeLessThan(0.4);

    handle.cancel();
    handle.cancel();
    expect(sources[0].stops.at(-1)).toBe(context.currentTime);
    expect(sources[0].disconnected).toBe(true);
    expect(gains[0].disconnected).toBe(true);
    expect(ended).toBe(1);
  });

  it("uses the recorded sustain loop only for gates longer than the sample", () => {
    const { context, sources } = mockAudioContext();
    const settings = experienceVoiceSettings(pianoBuffer());
    const event = createListenPlaybackPlan(HALF_TIE).toneEvents[0];

    scheduleRhythmVoice(context, event, 2, 12, settings);

    expect(sources[0].loop).toBe(true);
    expect(sources[0].loopStart).toBeCloseTo(199374 / 44100);
    expect(sources[0].loopEnd).toBeCloseTo(354248 / 44100);
    expect(sources[0].starts).toEqual([2]);
    expect(sources[0].stops).toEqual([12]);
  });

  it("makes a short high-frequency noise-plus-chirp PCM click with bounded structural profiles", () => {
    const { context, sources, gains, clickPcm, oscillatorCount } =
      mockAudioContext();
    const sample = pianoBuffer();
    const output = {
      name: "independent-metronome-gain",
    } as unknown as AudioNode;
    const base = experienceVoiceSettings(sample, output);
    const settings = {
      ...base,
      metronome: { ...base.metronome, level: 0.9 },
    };
    const pulse = createRhythmAudioPlan(HALF_TIE, "metronome").pulseEvents[0];
    const accents = ["strong", "medium", "weak"] as const;

    for (const structuralAccent of accents) {
      scheduleRhythmVoice(
        context,
        { ...pulse, structuralAccent, segmentAccent: "strong" },
        2,
        3,
        settings
      );
    }

    expect(oscillatorCount()).toBe(0);
    expect(sources).toHaveLength(3);
    expect(clickPcm).toHaveLength(3);
    expect(sources.map(source => source.starts)).toEqual([[2], [2], [2]]);
    expect(sources.map(source => source.stops)).toEqual([
      [2.032],
      [2.032],
      [2.032],
    ]);
    expect(gains.map(gain => gain.connections)).toEqual([
      [output],
      [output],
      [output],
    ]);
    const levels = gains.map(
      gain => gain.values.find(value => value[0] === "ramp")![1]
    );
    expect(levels[0]).toBeCloseTo(0.32);
    expect(levels[1]).toBeCloseTo(0.32 * 0.74);
    expect(levels[2]).toBeCloseTo(0.16);
    expect(levels.every(level => level < 0.4)).toBe(true);
    expect(
      clickPcm.every(pcm => pcm.some(sampleValue => sampleValue !== 0))
    ).toBe(true);
    expect(clickPcm.every(pcm => [...pcm].every(Number.isFinite))).toBe(true);
    const pcmPeaks = clickPcm.map(pcm =>
      [...pcm].reduce(
        (max, sampleValue) => Math.max(max, Math.abs(sampleValue)),
        0
      )
    );
    expect(pcmPeaks.every(peak => peak > 0 && peak <= 1)).toBe(true);
    expect(new Set(clickPcm.map(pcm => [...pcm].join(","))).size).toBe(3);
    expect(Math.min(...levels) + 0.22).toBeLessThan(1);
  });

  it("cleans up a partially created voice and preserves source-start errors", () => {
    const { context, sources, gains } = mockAudioContext();
    const failure = new Error("buffer source start failed");
    const nativeCreate = context.createBufferSource.bind(context);
    context.createBufferSource = () => {
      const source = nativeCreate();
      source.start = () => {
        throw failure;
      };
      return source;
    };
    const event = createListenPlaybackPlan(HALF_TIE).toneEvents[0];
    let ended = 0;

    expect(() =>
      scheduleRhythmVoice(
        context,
        event,
        2,
        6,
        experienceVoiceSettings(pianoBuffer()),
        () => ended++
      )
    ).toThrow(failure);
    expect(sources[0].disconnected).toBe(true);
    expect(gains[0].disconnected).toBe(true);
    expect(ended).toBe(1);
  });
});

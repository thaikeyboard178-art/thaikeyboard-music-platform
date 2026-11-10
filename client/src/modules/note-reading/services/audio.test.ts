// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserAudioEngine, frequencyForMidiPitch, pianoTone } from "./audio";

const originalAudioContext = Object.getOwnPropertyDescriptor(window, "AudioContext");
afterEach(() => {
  if (originalAudioContext) Object.defineProperty(window, "AudioContext", originalAudioContext);
  else Reflect.deleteProperty(window, "AudioContext");
});

describe("virtual piano pitch helpers", () => {
  it("uses equal-tempered MIDI frequencies", () => {
    expect(frequencyForMidiPitch(69)).toBeCloseTo(440, 8);
    expect(frequencyForMidiPitch(60)).toBeCloseTo(261.625565, 4);
    expect(frequencyForMidiPitch(72)).toBeCloseTo(523.25113, 3);
    expect(pianoTone(60)).toMatchObject({ midiPitch: 60, frequency: expect.closeTo(261.625565, 3) });
  });

  it("initializes audio only when play is requested, reuses the context, and closes it on cleanup", async () => {
    const frequency = { setValueAtTime: vi.fn() };
    const gainParameter = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    const oscillator = { type: "sine", frequency, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null };
    const gain = { gain: gainParameter, connect: vi.fn(), disconnect: vi.fn() };
    const context = {
      state: "suspended",
      currentTime: 2,
      destination: {},
      resume: vi.fn(async () => undefined),
      createOscillator: vi.fn(() => oscillator),
      createGain: vi.fn(() => gain),
      close: vi.fn(async () => undefined),
    };
    const AudioContextMock = vi.fn(() => context);
    Object.defineProperty(window, "AudioContext", { configurable: true, value: AudioContextMock });

    const engine = new BrowserAudioEngine();
    expect(AudioContextMock).not.toHaveBeenCalled();
    await engine.play(69);
    await engine.play(60);
    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
    expect(frequency.setValueAtTime).toHaveBeenNthCalledWith(1, 440, 2);
    expect(frequency.setValueAtTime).toHaveBeenNthCalledWith(2, frequencyForMidiPitch(60), 2);

    await engine.close();
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("continues safely when Web Audio is unavailable", async () => {
    Reflect.deleteProperty(window, "AudioContext");
    const engine = new BrowserAudioEngine();
    await expect(engine.play(60)).resolves.toBeUndefined();
    await expect(engine.close()).resolves.toBeUndefined();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTapRhythmExercise,
  createTapTargets,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import { createRhythmAudioPlan } from "./plan";
import { createTapAttemptPlan, createTapReferencePlan } from "./tapPlan";
import { experienceVoiceSettings, loadPianoBuffer } from "./experienceAudio";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function pianoBuffer(): AudioBuffer {
  return { duration: 8 } as AudioBuffer;
}

function audioContext(
  decodeAudioData = vi.fn(async () => pianoBuffer())
): BaseAudioContext {
  return {
    decodeAudioData,
  } as unknown as BaseAudioContext;
}

function pianoResponse() {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(8),
  };
}

function exerciseFor(index: number, bars: 1 | 2 | 4): TapRhythmExercise {
  const fixture = SEVEN_METER_RUNTIME_FIXTURES[index];
  const track = index < 3 ? 3 : index === 6 ? "bonus" : 6;
  const initial = createTapRhythmExercise({ track, pattern: fixture.pattern });
  const pattern = {
    ...initial.pattern,
    id: `${initial.pattern.id}-${bars}bars`,
    measures: Array.from({ length: bars }, (_, barIndex) => ({
      id: `${initial.pattern.id}-bar-${barIndex + 1}`,
      segments: initial.pattern.measures[0].segments.map(segment => ({
        ...segment,
        id: `${segment.id}-bar-${barIndex + 1}`,
      })),
    })),
  };
  return {
    ...initial,
    id: `${initial.id}-${bars}bars`,
    pattern,
    targets: createTapTargets(pattern, initial.gridTicks),
  };
}

describe("recorded piano loading and reference plan", () => {
  it("fetches and decodes the bundled sample once per AudioContext", async () => {
    const decode = vi.fn(async () => pianoBuffer());
    const context = audioContext(decode);
    const fetchMock = vi.fn(async () => pianoResponse());
    vi.stubGlobal("fetch", fetchMock);

    const first = loadPianoBuffer(context);
    const second = loadPianoBuffer(context);
    expect(first).toBe(second);
    await expect(first).resolves.toBe(await second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it("keeps contexts independent and evicts a failed load so it can be retried", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(pianoResponse())
      .mockResolvedValueOnce(pianoResponse());
    vi.stubGlobal("fetch", fetchMock);
    const decodeFirst = vi.fn(async () => pianoBuffer());
    const decodeSecond = vi.fn(async () => pianoBuffer());
    const firstContext = audioContext(decodeFirst);
    const secondContext = audioContext(decodeSecond);

    await expect(loadPianoBuffer(firstContext)).rejects.toThrow(/503/);
    await expect(loadPianoBuffer(firstContext)).resolves.toBeInstanceOf(Object);
    await expect(loadPianoBuffer(secondContext)).resolves.toBeInstanceOf(
      Object
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(decodeFirst).toHaveBeenCalledTimes(1);
    expect(decodeSecond).toHaveBeenCalledTimes(1);
  });

  it("returns opt-in sampled voices and an independent optional metronome output", () => {
    const sample = pianoBuffer();
    const output = { name: "metronome-gain" } as unknown as AudioNode;
    const settings = experienceVoiceSettings(sample, output);
    const defaults = experienceVoiceSettings(sample);

    expect(settings.pattern.pianoBuffer).toBe(sample);
    expect(settings.pattern.level).toBeLessThan(0.4);
    expect(settings.pattern.output).toBeUndefined();
    expect(settings.metronome.brightClick).toBe(true);
    expect(settings.metronome.output).toBe(output);
    expect(settings.metronome.level).toBeLessThan(0.4);
    expect(defaults.metronome.output).toBeUndefined();
    expect(Object.isFrozen(settings)).toBe(true);
    expect(Object.isFrozen(settings.pattern)).toBe(true);
    expect(Object.isFrozen(settings.metronome)).toBe(true);
  });

  it.each(
    SEVEN_METER_RUNTIME_FIXTURES.flatMap((fixture, index) =>
      ([1, 2, 4] as const).map(bars => ({ fixture, index, bars }))
    )
  )(
    "prepends one count-in bar and shifts both canonical lanes for $fixture.name with $bars bar(s)",
    ({ index, bars }) => {
      const exercise = exerciseFor(index, bars);
      const originalExercise = JSON.stringify(exercise);
      const expectedTargets = exercise.targets;
      const attemptBefore = createTapAttemptPlan(exercise);
      const base = createRhythmAudioPlan(exercise.pattern, "both");
      const reference = createTapReferencePlan(exercise);
      const meter = deriveMeter(exercise.pattern.meter);
      const barTicks = meter.measureTicks;
      const barSeconds = ticksToSeconds(
        barTicks,
        exercise.pattern.meter,
        exercise.pattern.tempo.pulseBpm
      );

      expect(reference.totalTicks).toBe(base.totalTicks + barTicks);
      expect(reference.durationSeconds).toBe(base.durationSeconds + barSeconds);
      expect(reference.toneEvents).toHaveLength(base.toneEvents.length);
      expect(reference.toneEvents.map(event => event.tick)).toEqual(
        base.toneEvents.map(event => event.tick + barTicks)
      );
      expect(reference.toneEvents.map(event => event.offsetSeconds)).toEqual(
        base.toneEvents.map(event => event.offsetSeconds + barSeconds)
      );
      expect(reference.toneEvents.map(event => event.measureIndex)).toEqual(
        base.toneEvents.map(event => event.measureIndex + 1)
      );
      expect(reference.pulseEvents).toHaveLength((bars + 1) * meter.pulseCount);
      expect(
        reference.pulseEvents
          .slice(0, meter.pulseCount)
          .every(event => event.id.startsWith("count-in:"))
      ).toBe(true);
      expect(
        reference.pulseEvents.slice(meter.pulseCount).map(event => event.tick)
      ).toEqual(base.pulseEvents.map(event => event.tick + barTicks));
      expect(reference.events).toHaveLength(
        reference.toneEvents.length + reference.pulseEvents.length
      );
      expect(reference.onsetReferences).toEqual(
        base.onsetReferences.map(onset => ({
          ...onset,
          tick: onset.tick + barTicks,
          offsetSeconds: onset.offsetSeconds + barSeconds,
        }))
      );
      expect(reference.visualCounting).toHaveLength(
        (bars + 1) * meter.pulseCount
      );
      expect(
        reference.visualCounting
          .slice(0, meter.pulseCount)
          .map(count => count.tick)
      ).toEqual(
        base.visualCounting.slice(0, meter.pulseCount).map(count => count.tick)
      );
      expect(
        reference.visualCounting
          .slice(meter.pulseCount)
          .map(count => count.tick)
      ).toEqual(base.visualCounting.map(count => count.tick + barTicks));
      expect(exercise.targets).toEqual(expectedTargets);
      expect(JSON.stringify(exercise)).toBe(originalExercise);
      expect(createTapAttemptPlan(exercise)).toEqual(attemptBefore);
    }
  );
});

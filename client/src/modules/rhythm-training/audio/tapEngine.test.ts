import { describe, expect, it } from "vitest";
import { TapRhythmEngine } from "./tapEngine";
import {
  createTapAttemptPlan,
  createTapMetronomeLoopPlan,
} from "./tapPlan";
import { deriveMeter, getDefaultPulseBpm } from "../rhythm/meters";
import { TapFakeClock, TEST_TAP_VOICES } from "./tapTestHelpers";
import {
  createTapRhythmExercise,
  createTapTargets,
  evaluateTapRhythmAnswer,
} from "../exercises/tapRhythm";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import { requireValidRhythmPattern } from "../rhythm/validate";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { RhythmScheduledEvent } from "./transport";
import type { RhythmTrack } from "../types";
import type { RhythmPattern } from "../types";

function sparseSustainPattern(
  fixture: (typeof SEVEN_METER_RUNTIME_FIXTURES)[number],
  bars: number
): RhythmPattern {
  const meter = fixture.pattern.meter;
  const source = fixture.pattern.measures[0].segments;
  const sustainCount =
    meter.denominator === 8
      ? meter.numerator === 3
        ? 2
        : 3
      : meter.denominator === 2 || meter.numerator >= 3
        ? 4
        : 2;
  return {
    ...fixture.pattern,
    id: `${fixture.pattern.id}-sparse-sustain-${bars}`,
    measures: Array.from({ length: bars }, (_, barIndex) => ({
      id: `sparse-bar-${barIndex + 1}`,
      segments: source.map((segment, segmentIndex) => ({
        id: `sparse-b${barIndex + 1}-s${segmentIndex + 1}`,
        kind: segmentIndex < sustainCount ? ("note" as const) : ("rest" as const),
        duration: segment.duration,
        ...(segmentIndex < sustainCount
          ? { tieGroupId: `sustain-bar-${barIndex + 1}` }
          : {}),
      })),
    })),
  };
}

function repeatedMeterPattern(
  fixture: (typeof SEVEN_METER_RUNTIME_FIXTURES)[number],
  pulseBpm: number,
  bars: number
): RhythmPattern {
  const source = fixture.pattern.measures[0];
  return {
    ...fixture.pattern,
    id: `${fixture.pattern.id}-loop-${pulseBpm}-${bars}`,
    tempo: { ...fixture.pattern.tempo, pulseBpm },
    measures: Array.from({ length: bars }, (_, barIndex) => ({
      id: `loop-bar-${barIndex + 1}`,
      segments: source.segments.map((segment, segmentIndex) => ({
        ...segment,
        id: `loop-bar-${barIndex + 1}-segment-${segmentIndex + 1}`,
        ...(segment.tieGroupId
          ? { tieGroupId: `${segment.tieGroupId}-bar-${barIndex + 1}` }
          : {}),
        ...(segment.tupletGroup
          ? {
              tupletGroup: {
                ...segment.tupletGroup,
                groupId: `${segment.tupletGroup.groupId}-bar-${barIndex + 1}`,
              },
            }
          : {}),
      })),
    })),
  };
}

function setup(
  index = 0,
  patternOverride?: RhythmPattern,
  onResult?: (result: TapAttemptResult) => void
) {
  const fixture = SEVEN_METER_RUNTIME_FIXTURES[index];
  const track: RhythmTrack = index < 3 ? 3 : index === 6 ? "bonus" : 6;
  const baseExercise = createTapRhythmExercise({
    track,
    pattern: fixture.pattern,
  });
  const canonicalOverride = patternOverride
    ? requireValidRhythmPattern(patternOverride)
    : null;
  const exercise = canonicalOverride
    ? Object.freeze({
        ...baseExercise,
        id: `${baseExercise.id}-${canonicalOverride.id}`,
        pattern: canonicalOverride,
        targets: createTapTargets(canonicalOverride, baseExercise.gridTicks),
      })
    : baseExercise;
  const clock = new TapFakeClock();
  const input = new EventTarget();
  const blur = new EventTarget();
  const visibility = Object.assign(new EventTarget(), { hidden: false });
  const scheduledEvents: RhythmScheduledEvent[] = [];
  let factories = 0;
  const engine = new TapRhythmEngine({
    exercise,
    inputTarget: input,
    blurSource: blur,
    onResult,
    now: clock.now,
    timeOrigin: () => 1700000000000,
    transport: {
      voices: TEST_TAP_VOICES,
      timers: clock.timers,
      contextFactory: () => {
        factories++;
        return clock.context as unknown as AudioContext;
      },
      visibilitySource: visibility as unknown as Document,
      onScheduled: event => scheduledEvents.push(event),
    },
  });
  return {
    fixture,
    exercise,
    clock,
    input,
    blur,
    visibility,
    scheduledEvents,
    engine,
    factoryCount: () => factories,
  };
}
async function sendFirstTap(
  h: ReturnType<typeof setup>,
  scheduledEventsFrom = 0
) {
  const loop = createTapMetronomeLoopPlan(h.exercise);
  const firstPulse = h.scheduledEvents
    .slice(scheduledEventsFrom)
    .find(event => event.event.lane === "metronome");
  if (!firstPulse) throw new Error("The free metronome did not schedule a pulse.");
  const nextBarline = firstPulse.startTime + loop.durationSeconds;
  const firstTap = nextBarline;
  h.clock.at(firstTap);
  h.input.dispatchEvent(h.clock.nativeTap(firstTap));
  if (!h.engine.snapshot) throw new Error("The first Tap did not align an attempt.");
}

async function startAttempt(h: ReturnType<typeof setup>, mode?: "practice" | "graded") {
  const scheduledEventsFrom = h.scheduledEvents.length;
  await h.engine.start(mode);
  await sendFirstTap(h, scheduledEventsFrom);
}

function tapTargets(
  h: ReturnType<typeof setup>,
  targets: readonly { audioTime: number }[],
  delta = 0
) {
  for (const target of targets) {
    h.clock.at(target.audioTime + Math.max(delta, 0));
    h.input.dispatchEvent(h.clock.nativeTap(target.audioTime + delta));
  }
}
function tapAll(h: ReturnType<typeof setup>, delta = 0) {
  const targets = h.engine.snapshot!.expectedOnsets.filter(
    onset => !(onset.roundNumber === 1 && onset.targetIndex === 0)
  );
  tapTargets(h, targets, delta);
}
function finish(h: ReturnType<typeof setup>) {
  const snapshot = h.engine.snapshot!;
  const end = Math.max(snapshot.planEndAudioTime, snapshot.drainEndAudioTime);
  h.clock.at(end + 0.03);
  // Transport and engine timers may share a deadline; allow one extra wake for
  // the engine to observe the transport's completed state.
  h.clock.at(end + 0.08);
}
function expectTwoRoundTargets(h: ReturnType<typeof setup>) {
  const snapshot = h.engine.snapshot!;
  const targets = h.exercise.targets;
  const expectedTicks = targets.map(target => target.tick);
  expect(snapshot.expectedOnsets).toHaveLength(targets.length * 2);
  expect(snapshot.expectedOnsets.map(onset => onset.roundNumber)).toEqual([
    ...Array.from({ length: targets.length }, () => 1),
    ...Array.from({ length: targets.length }, () => 2),
  ]);
  for (const [index, round] of snapshot.rounds.entries()) {
    expect(round.roundNumber).toBe(index + 1);
    expect(round.expectedOnsets.map(onset => onset.tick)).toEqual(expectedTicks);
    expect(round.expectedOnsets.map(onset => onset.targetIndex)).toEqual(
      targets.map((_, targetIndex) => targetIndex)
    );
    round.expectedOnsets.forEach((onset, targetIndex) =>
      expect(onset.audioTime - round.anchorAudioTime).toBeCloseTo(
        targets[targetIndex].offsetMs / 1000,
        12
      )
    );
  }
  expect(snapshot.rounds[0].endAudioTime).toBeCloseTo(
    snapshot.rounds[1].startAudioTime,
    12
  );
}
function expectTwoRoundPulsePlan(h: ReturnType<typeof setup>) {
  const plan = createTapAttemptPlan(h.exercise);
  const meter = deriveMeter(h.exercise.pattern.meter);
  const totalMeasures = 2 * h.exercise.pattern.measures.length;
  const expectedPulseTicks = Array.from({ length: totalMeasures }, (_, measure) =>
    meter.pulseStarts.map(tick => measure * meter.measureTicks + tick)
  ).flat();
  expect(plan.pulseEvents.map(event => event.tick)).toEqual(expectedPulseTicks);
  expect(plan.pulseEvents).toHaveLength(totalMeasures * meter.pulseCount);
  expect(plan.totalTicks).toBe(totalMeasures * meter.measureTicks);
  expect(plan.pulseEvents.some(event => event.tick === plan.totalTicks)).toBe(false);
  return plan;
}

describe("production Tap Engine with real canonical scheduler and deterministic clock", () => {
  it("executes target alignment at 30/default/300 BPM for all seven meters and 1/2/4 bars", async () => {
    for (const [index, fixture] of SEVEN_METER_RUNTIME_FIXTURES.entries()) {
      const bpmValues = [30, getDefaultPulseBpm(fixture.pattern.meter), 300];
      for (const pulseBpm of bpmValues) {
        for (const bars of [1, 2, 4] as const) {
          const pattern: RhythmPattern = {
            ...fixture.pattern,
            id: `${fixture.pattern.id}-engine-${pulseBpm}-${bars}`,
            tempo: { pulseBpm },
            measures: Array.from({ length: bars }, (_, barIndex) => ({
              id: `bar-${barIndex + 1}`,
              segments: fixture.pattern.measures[0].segments.map(
                (segment, segmentIndex) => ({
                  ...segment,
                  id: `b${barIndex + 1}-s${segmentIndex + 1}`,
                })
              ),
            })),
          };
          const h = setup(index, pattern);
          expectTwoRoundPulsePlan(h);
          await startAttempt(h);
          expectTwoRoundTargets(h);
          tapAll(h);
          finish(h);
          expect(h.engine.state).toBe("completed");
          expect(h.engine.result!.evaluation!.correct).toBe(true);
          expect(h.engine.result!.accuracyPercent).toBeCloseTo(100, 6);
          expect(h.engine.result!.rounds?.map(round => round.status)).toEqual([
            "played",
            "played",
          ]);
          expect(
            h.engine.result!.rounds?.every(round => round.evaluation?.correct)
          ).toBe(true);
          await h.engine.dispose();
          expect(h.clock.tasks.size).toBe(0);
        }
      }
    }
  });
  it.each(
    SEVEN_METER_RUNTIME_FIXTURES.map((fixture, index) => ({ fixture, index }))
  )(
    "executes free listening, first Tap, pulse, capture, DP and Formula B for $fixture.name",
    async ({ index }) => {
      let completionCount = 0;
      const h = setup(index, undefined, () => completionCount++);
      const plan = expectTwoRoundPulsePlan(h);
      expect(plan.toneEvents).toHaveLength(0);
      await startAttempt(h);
      expect(h.engine.state).toBe("collecting");
      expectTwoRoundTargets(h);
      expect(h.engine.snapshot!.rounds.map(round =>
        round.expectedOnsets.map(onset => onset.tick)
      )).toEqual([h.fixture.eighthStarts, h.fixture.eighthStarts]);
      tapAll(h);
      finish(h);
      const completedAt = Math.max(
        h.engine.snapshot!.planEndAudioTime,
        h.engine.snapshot!.drainEndAudioTime
      );
      expect(h.engine.state).toBe("completed");
      expect(completionCount).toBe(1);
      expect(h.engine.result!.evaluation!.correct).toBe(true);
      expect(h.engine.result!.accuracyPercent).toBeCloseTo(100, 6);
      expect(h.engine.result!.scoreOutOfTen).toBe(10);
      expect(h.engine.result!.rawCaptures).toHaveLength(
        h.exercise.targets.length * 2
      );
      expect(h.engine.result!.rounds?.map(round => round.evaluation?.correct)).toEqual([
        true,
        true,
      ]);
      expect(
        h.engine.result!.rawCaptures.every(x => x.arrivalMs >= x.performanceMs)
      ).toBe(true);
      expect(h.factoryCount()).toBe(1);
      expect(h.engine.hasPendingWakeup).toBe(false);
      expect(h.engine.transport.activeVoiceCount).toBe(0);
      h.clock.at(completedAt + 2);
      expect(completionCount).toBe(1);
      expect(h.engine.result!.rounds?.map(round => round.status)).toEqual([
        "played",
        "played",
      ]);
      await h.engine.dispose();
      expect(h.clock.tasks.size).toBe(0);
    }
  );
  it("scores only the played round when the other round is explicitly skipped and preserves its captures", async () => {
    const h = setup();
    await startAttempt(h);
    const snapshot = h.engine.snapshot!;
    expectTwoRoundTargets(h);
    tapTargets(h, snapshot.rounds[0].expectedOnsets.slice(1));
    h.clock.at(snapshot.rounds[1].startAudioTime);
    expect(h.engine.currentRound).toBe(2);
    expect(h.engine.canSkipCurrentRound).toBe(true);
    expect(h.engine.skipCurrentRound()).toBe(true);
    expect(h.engine.skipCurrentRound()).toBe(false);
    finish(h);

    const result = h.engine.result!;
    expect(result.rounds?.map(round => round.status)).toEqual([
      "played",
      "skipped",
    ]);
    expect(result.rounds?.[0].evaluation?.correct).toBe(true);
    expect(result.rounds?.[0].accuracyPercent).toBeCloseTo(100, 6);
    expect(result.rounds?.[1].evaluation).toBeNull();
    expect(result.rounds?.[1].taps).toHaveLength(0);
    expect(result.evaluation?.correct).toBe(true);
    expect(result.accuracyPercent).toBeCloseTo(100, 6);
    expect(result.scoreOutOfTen).toBe(10);
    expect(result.rawCaptures).toHaveLength(h.exercise.targets.length);
    expect(result.rounds?.[0].taps).toHaveLength(h.exercise.targets.length);
    expect(result.rounds?.[1].taps).toHaveLength(0);
    await h.engine.dispose();
  });
  it("freezes the Round 1 result while Round 2 runs and finishes only after the complete second pulse grid", async () => {
    const pattern = sparseSustainPattern(SEVEN_METER_RUNTIME_FIXTURES[0], 1);
    const h = setup(0, pattern);
    const plan = expectTwoRoundPulsePlan(h);
    await startAttempt(h);
    const snapshot = h.engine.snapshot!;
    expect(snapshot.rounds[0].expectedOnsets).toHaveLength(1);
    expect(snapshot.rounds[1].expectedOnsets).toHaveLength(1);
    h.clock.at(snapshot.rounds[0].drainEndAudioTime + 0.03);
    expect(h.engine.roundResults[0]).toBeNull();
    expect(h.engine.canSkipCurrentRound).toBe(true);
    expect(h.engine.roundResults[1]).toBeNull();

    h.clock.at(snapshot.rounds[1].startAudioTime + 0.03);
    expect(h.engine.currentRound).toBe(2);
    expect(h.engine.roundResults[0]?.status).toBe("played");
    expect(h.engine.roundResults[0]?.accuracyPercent).toBeCloseTo(100, 6);
    expect(h.engine.roundResults[1]).toBeNull();
    expect(h.engine.state).not.toBe("completed");
    expect(h.engine.transport.state).toBe("playing");

    h.clock.at(snapshot.rounds[1].drainEndAudioTime + 0.03);
    expect(h.engine.roundResults[1]).toBeNull();
    expect(h.engine.state).not.toBe("completed");
    expect(h.engine.transport.state).toBe("playing");

    h.clock.at(snapshot.planEndAudioTime - 0.01);
    expect(h.engine.state).not.toBe("completed");
    expect(h.engine.transport.state).toBe("playing");
    h.clock.at(snapshot.planEndAudioTime + 0.03);
    expect(h.engine.state).toBe("completed");
    expect(h.engine.transport.state).toBe("completed");
    expect(h.engine.result?.rounds?.map(round => round.status)).toEqual([
      "played",
      "played",
    ]);
    expect(h.engine.result?.rounds?.[1].missedTargetCount).toBe(1);
    expect(h.engine.result?.accuracyPercent).toBeCloseTo(50, 6);
    expect(h.engine.result?.scoreOutOfTen).toBe(5);
    expect(plan.pulseEvents.at(-1)?.tick).toBeLessThan(plan.totalTicks);
    await h.engine.dispose();
  });
  it("closes the exact drain cutoff and keeps a finalized Round 1 immutable after Round 2 starts", async () => {
    const pattern = sparseSustainPattern(SEVEN_METER_RUNTIME_FIXTURES[0], 1);
    const h = setup(0, pattern);
    await startAttempt(h);
    const snapshot = h.engine.snapshot!;
    const roundOne = snapshot.rounds[0];
    const firstOnset = roundOne.expectedOnsets[0];

    h.clock.at(roundOne.drainEndAudioTime);
    h.input.dispatchEvent(h.clock.nativeTap(firstOnset.audioTime));
    h.clock.at(roundOne.endAudioTime + 0.03);

    const finalizedRoundOne = h.engine.roundResults[0];
    expect(finalizedRoundOne?.status).toBe("played");
    expect(finalizedRoundOne?.missedTargetCount).toBe(0);
    expect(finalizedRoundOne?.extraTapCount).toBe(0);
    expect(h.engine.currentRound).toBe(2);
    expect(h.engine.roundResults[1]).toBeNull();
    expect(h.engine.skipCurrentRound()).toBe(true);
    expect(h.engine.roundResults[0]).toBe(finalizedRoundOne);
    expect(h.engine.roundResults[1]?.status).toBe("skipped");

    finish(h);
    expect(h.engine.result?.rounds?.map(round => round.status)).toEqual([
      "played",
      "skipped",
    ]);
    expect(h.engine.result?.rounds?.[0].missedTargetCount).toBe(0);
    await h.engine.dispose();
  });
  it("two explicit skips yield no score or answer, while unskipped silence is two played rounds of misses", async () => {
    const skipped = setup();
    await startAttempt(skipped);
    for (const [index, round] of skipped.engine.snapshot!.rounds.entries()) {
      skipped.clock.at(round.startAudioTime);
      expect(skipped.engine.currentRound).toBe(index + 1);
      expect(skipped.engine.skipCurrentRound()).toBe(true);
    }
    finish(skipped);
    expect(skipped.engine.result!.rounds?.map(round => round.status)).toEqual([
      "skipped",
      "skipped",
    ]);
    expect(skipped.engine.result!.evaluation).toBeNull();
    expect(skipped.engine.result!.accuracyPercent).toBeNull();
    expect(skipped.engine.result!.scoreOutOfTen).toBeNull();
    expect(skipped.engine.result!.rawCaptures).toHaveLength(0);
    await skipped.engine.dispose();

    const silent = setup();
    await startAttempt(silent);
    finish(silent);
    const result = silent.engine.result!;
    expect(result.rounds?.map(round => round.status)).toEqual([
      "played",
      "played",
    ]);
    expect(result.rounds?.map(round => round.missedTargetCount)).toEqual([
      silent.exercise.targets.length - 1,
      silent.exercise.targets.length,
    ]);
    expect(result.rounds?.every(round => round.evaluation?.correct === false)).toBe(
      true
    );
    expect(result.evaluation?.missing).toBe(silent.exercise.targets.length - 1);
    expect(result.accuracyPercent).toBeGreaterThan(0);
    expect(result.scoreOutOfTen).toBeGreaterThan(0);
    await silent.engine.dispose();
  });
  it.each(
    SEVEN_METER_RUNTIME_FIXTURES.flatMap((fixture, index) => [
      { name: `${fixture.name} at 30 BPM / 1 bar`, index, pulseBpm: 30, bars: 1 },
      {
        name: `${fixture.name} at default BPM / 2 bars`,
        index,
        pulseBpm: getDefaultPulseBpm(fixture.pattern.meter),
        bars: 2,
      },
      { name: `${fixture.name} at 300 BPM / 4 bars`, index, pulseBpm: 300, bars: 4 },
    ])
  )("runs a continuous free-listen and two-round Tap attempt for $name", async ({ index, pulseBpm, bars }) => {
    const fixture = SEVEN_METER_RUNTIME_FIXTURES[index];
    const pattern = repeatedMeterPattern(fixture, pulseBpm, bars);
    const h = setup(index, pattern);
    await h.engine.start();
    const generation = h.engine.transport.generation;
    const loop = createTapMetronomeLoopPlan(h.exercise);
    const firstPulse = h.scheduledEvents.find(
      event => event.generation === generation && event.event.lane === "metronome"
    )!;
    h.clock.at(firstPulse.startTime + 3 * loop.durationSeconds);
    expect(h.engine.state).toBe("listening");
    expect(h.engine.snapshot).toBeNull();
    expect(h.engine.transport.generation).toBe(generation);

    const downbeat = firstPulse.startTime + 4 * loop.durationSeconds;
    h.clock.at(downbeat);
    h.input.dispatchEvent(h.clock.nativeTap(downbeat));
    const snapshot = h.engine.snapshot!;
    expect(snapshot.rounds.map(round => round.anchorAudioTime)).toEqual([
      downbeat,
      downbeat + createTapAttemptPlan(h.exercise).durationSeconds / 2,
    ]);
    expect(h.engine.transport.generation).toBe(generation);
    expect(
      h.scheduledEvents.filter(
        event =>
          event.generation === generation &&
          event.event.lane === "metronome" &&
          Math.abs(event.startTime - downbeat) < 1e-7
      )
    ).toHaveLength(1);

    tapAll(h);
    finish(h);
    const result = h.engine.result!;
    expect(result.status).toBe("completed");
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds?.[0].firstTapSequence).toBe(0);
    expect(result.rounds?.every(round => round.evaluation?.correct)).toBe(true);
    const pulseCount = deriveMeter(h.exercise.pattern.meter).pulseCount;
    expect(
      h.scheduledEvents.filter(
        event => event.generation === generation && event.event.lane === "metronome"
      )
    ).toHaveLength((4 + 2 * h.exercise.pattern.measures.length) * pulseCount);
    await h.engine.dispose();
    expect(h.clock.tasks.size).toBe(0);
  });

  it("keeps the free loop unbounded and grades a first Tap outside Wassoc as Extra + Missing", async () => {
    const h = setup();
    await h.engine.start();
    const loop = createTapMetronomeLoopPlan(h.exercise);
    const loopGeneration = h.engine.transport.generation;
    const firstLoopPulse = h.scheduledEvents.find(event => event.event.lane === "metronome")!;
    const completedFreeBars = firstLoopPulse.startTime + 3 * loop.durationSeconds;
    h.clock.at(completedFreeBars);
    expect(h.engine.state).toBe("listening");
    expect(h.engine.snapshot).toBeNull();
    expect(h.engine.transport.generation).toBe(loopGeneration);
    expect(
      h.scheduledEvents.filter(event => event.event.lane === "metronome").length
    ).toBeGreaterThan(loop.pulseEvents.length * 2);

    const nextBarline = firstLoopPulse.startTime + 4 * loop.durationSeconds;
    const firstTap = nextBarline - 0.12;
    h.clock.at(firstTap);
    h.input.dispatchEvent(h.clock.nativeTap(firstTap));
    expect(h.engine.snapshot!.rounds[0].anchorAudioTime).toBeCloseTo(nextBarline, 9);
    expect(h.engine.state).toBe("aligning");
    expect(h.engine.transport.generation).toBe(loopGeneration);
    tapAll(h);
    finish(h);

    const firstRound = h.engine.result!.rounds![0];
    expect(firstRound.firstTapSequence).toBe(0);
    expect(firstRound.evaluation?.targetResults[0]?.status).toBe("missing");
    expect(firstRound.evaluation?.tapResults[0]).toMatchObject({
      sequence: 0,
      status: "extra",
      targetIndex: null,
    });
    expect(firstRound.evaluation).toMatchObject({ missing: 1, extra: 1 });
    expect(h.engine.result!.rounds![1].evaluation?.correct).toBe(true);
    expect(evaluateTapRhythmAnswer(h.exercise, h.engine.result)).toMatchObject({
      correct: false,
      accuracyPercent: h.engine.result!.accuracyPercent,
      scoreOutOfTen: h.engine.result!.scoreOutOfTen,
    });
    await h.engine.dispose();
    expect(h.clock.tasks.size).toBe(0);
  });

  it("accepts early/late within pass and diagnoses near-miss without changing timing policy", async () => {
    const h = setup();
    await startAttempt(h);
    const targets = h.engine.snapshot!.expectedOnsets.slice(1);
    const shifts = [20, -65, 65, -20];
    for (let i = 0; i < targets.length; i++) {
      const at = targets[i].audioTime + shifts[i % shifts.length] / 1000;
      h.clock.at(at);
      h.input.dispatchEvent(h.clock.nativeTap(at));
    }
    finish(h);
    expect(h.engine.result!.evaluation!.tp).toBe(2);
    expect(h.engine.result!.evaluation!.nearMiss).toBe(2);
    expect(h.engine.result!.accuracyPercent).toBeCloseTo(84, 0);
    expect(h.engine.result!.evaluation!.correct).toBe(false);
    await h.engine.dispose();
  });
  it("deduplicates native event identity but preserves two equal-time physical taps and ignores Space repeat/secondary pointers", async () => {
    const h = setup();
    await startAttempt(h);
    const first = h.engine.snapshot!.expectedOnsets[0].audioTime;
    h.clock.at(first);
    const e = h.clock.nativeTap(first);
    h.input.dispatchEvent(e);
    h.input.dispatchEvent(e);
    h.input.dispatchEvent(h.clock.nativeTap(first));
    h.input.dispatchEvent(
      h.clock.nativeTap(first, "keydown", { repeat: true })
    );
    h.input.dispatchEvent(
      h.clock.nativeTap(first, "pointerdown", {
        isPrimary: false,
        pointerId: 2,
      })
    );
    for (const target of h.engine.snapshot!.rounds[0].expectedOnsets.slice(1)) {
      h.clock.at(target.audioTime);
      h.input.dispatchEvent(h.clock.nativeTap(target.audioTime, "keydown"));
    }
    finish(h);
    expect(h.engine.result!.evaluation!.k).toBe(h.exercise.targets.length + 2);
    expect(h.engine.result!.evaluation!.extra).toBe(2);
    expect(h.engine.result!.evaluation!.correct).toBe(false);
    await h.engine.dispose();
  });
  it("drains a delayed original event inside the interval, excludes outside events, and never extends musical cutoff", async () => {
    const h = setup();
    await startAttempt(h);
    const snapshot = h.engine.snapshot!;
    for (const target of snapshot.expectedOnsets.slice(1, -1)) {
      h.clock.at(target.audioTime);
      h.input.dispatchEvent(h.clock.nativeTap(target.audioTime));
    }
    const last = snapshot.expectedOnsets.at(-1)!.audioTime;
    h.clock.at(last + 0.12);
    expect(h.engine.state).toBe("draining");
    h.input.dispatchEvent(h.clock.nativeTap(last + 0.05));
    h.input.dispatchEvent(h.clock.nativeTap(last + 0.1));
    finish(h);
    expect(h.engine.snapshot).toBe(snapshot);
    expect(h.engine.result!.evaluation!.k).toBe(h.exercise.targets.length);
    expect(h.engine.result!.evaluation!.correct).toBe(true);
    await h.engine.dispose();
  });
  it("rejects delayed deliveries after drain without adding physical taps", async () => {
    const h = setup();
    await startAttempt(h);
    const snapshot = h.engine.snapshot!;
    tapAll(h);
    finish(h);
    const result = h.engine.result;
    h.input.dispatchEvent(
      h.clock.nativeTap(snapshot.expectedOnsets[0].audioTime)
    );
    expect(h.engine.result).toBe(result);
    expect(result!.evaluation!.k).toBe(h.exercise.targets.length);
    await h.engine.dispose();
  });
  it.each([
    "pointercancel",
    "blur",
    "hidden",
    "context",
    "stop",
    "pause",
    "starved",
    "generation",
  ])("technical %s never becomes incorrect and cleans up", async kind => {
    const h = setup();
    await startAttempt(h);
    h.clock.at(h.engine.snapshot!.expectedOnsets[0].audioTime);
    if (kind === "pointercancel")
      h.input.dispatchEvent(
        h.clock.nativeTap(h.clock.context.currentTime, "pointercancel")
      );
    if (kind === "blur") h.blur.dispatchEvent(new Event("blur"));
    if (kind === "hidden") {
      h.visibility.hidden = true;
      h.visibility.dispatchEvent(new Event("visibilitychange"));
    }
    if (kind === "context") {
      h.clock.context.state = "suspended";
      h.clock.context.dispatchEvent(new Event("statechange"));
      h.clock.advance(0.03);
    }
    if (kind === "stop") h.engine.stop();
    if (kind === "pause") h.engine.pause();
    if (kind === "starved") {
      h.clock.context.currentTime += 1;
      const callbacks = [...h.clock.tasks.values()].map(t => t.callback);
      h.clock.tasks.clear();
      callbacks.forEach(fn => fn());
    }
    if (kind === "generation") {
      await h.engine.transport.replay();
      h.clock.advance(0.03);
    }
    expect(h.engine.state).toBe("aborted");
    expect(h.engine.result!.status).toBe("technical-abort");
    expect(h.engine.result!.accuracyPercent).toBeNull();
    expect(h.engine.result!.evaluation).toBeNull();
    expect(h.clock.tasks.size).toBe(0);
    await h.engine.dispose();
  });
  it.each(["missing", "nan", "negative", "backwards", "stale"])(
    "invalid %s output mapping aborts the active attempt",
    async kind => {
      const h = setup();
      await startAttempt(h);
      h.clock.at(h.engine.snapshot!.expectedOnsets[0].audioTime);
      const old = h.clock.context.getOutputTimestamp();
      if (kind === "missing")
        Object.defineProperty(h.clock.context, "getOutputTimestamp", {
          value: undefined,
        });
      else
        h.clock.context.sampleOverride = () =>
          kind === "nan"
            ? { contextTime: NaN, performanceTime: old.performanceTime }
            : kind === "negative"
              ? { contextTime: -1, performanceTime: -1 }
              : kind === "backwards"
                ? {
                    contextTime: old.contextTime - 1,
                    performanceTime: old.performanceTime - 1000,
                  }
                : old;
      h.clock.advance(kind === "stale" ? 0.15 : 0.03);
      expect(h.engine.state).toBe("aborted");
      expect(h.engine.result!.accuracyPercent).toBeNull();
      await h.engine.dispose();
    }
  );
  it("rejects stale generation capture while a retry runs practice-only", async () => {
    const h = setup();
    await startAttempt(h);
    const generation = h.engine.generation;
    tapAll(h);
    finish(h);
    expect(h.engine.result!.mode).toBe("graded");
    const retryEventsFrom = h.scheduledEvents.length;
    await h.engine.retry();
    await sendFirstTap(h, retryEventsFrom);
    const first = h.engine.snapshot!.expectedOnsets[0].audioTime;
    h.clock.at(first);
    h.engine.handleEvent(h.clock.nativeTap(first), generation);
    tapAll(h);
    finish(h);
    expect(h.engine.result!.mode).toBe("practice");
    expect(h.engine.result!.evaluation!.k).toBe(h.exercise.targets.length);
    expect(h.factoryCount()).toBe(1);
    await h.engine.dispose();
  });
  it("one reference before the free-loop attempt, no in-attempt reference replay", async () => {
    const h = setup();
    const pending = h.engine.playReference();
    await Promise.resolve();
    await Promise.resolve();
    h.clock.advance(3);
    await pending;
    expect(h.engine.state).toBe("idle");
    await expect(h.engine.playReference()).rejects.toThrow();
    await startAttempt(h);
    await expect(h.engine.playReference()).rejects.toThrow();
    await expect(h.engine.replay()).rejects.toThrow();
    tapAll(h);
    finish(h);
    expect(h.factoryCount()).toBe(1);
    await h.engine.dispose();
  });
  it("keeps the snapshot at bounded drain while the finite transport finishes the complete bar", async () => {
    const clock = new TapFakeClock();
    const base = createTapRhythmExercise({
      track: 3,
      pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
    });
    // Canonical stress test only, not a permitted learner tempo or curriculum change.
    const pattern = { ...base.pattern, tempo: { pulseBpm: 300 } };
    const exercise = {
      ...base,
      pattern,
      targets: createTapTargets(pattern, 240),
    };
    const input = new EventTarget();
    const scheduledEvents: RhythmScheduledEvent[] = [];
    const engine = new TapRhythmEngine({
      exercise,
      inputTarget: input,
      blurSource: null,
      now: clock.now,
      timeOrigin: () => 1700000000000,
      transport: {
        voices: TEST_TAP_VOICES,
        timers: clock.timers,
        contextFactory: () => clock.context as unknown as AudioContext,
        visibilitySource: null,
        onScheduled: event => scheduledEvents.push(event),
      },
    });
    await engine.start();
    const loop = createTapMetronomeLoopPlan(exercise);
    const firstLoopPulse = scheduledEvents.find(event => event.event.lane === "metronome")!;
    const firstTap = firstLoopPulse.startTime + loop.durationSeconds - 0.000000001;
    clock.at(firstTap);
    input.dispatchEvent(clock.nativeTap(firstTap));
    const plan = createTapAttemptPlan(exercise);
    const timing = engine.transport.getReferenceTiming()!;
    const snapshot = engine.snapshot!;
    expect(snapshot.planEndAudioTime).toBeCloseTo(
      timing.anchorTime + plan.durationSeconds,
      12
    );
    for (const target of snapshot.expectedOnsets.slice(1)) {
      clock.at(target.audioTime);
      input.dispatchEvent(clock.nativeTap(target.audioTime));
    }
    clock.at(snapshot.drainEndAudioTime - 0.05);
    expect(engine.transport.state).toBe("playing");
    expect(engine.state).toBe("draining");
    expect(engine.snapshot).toBe(snapshot);
    const finalBound = Math.max(
      snapshot.planEndAudioTime,
      snapshot.drainEndAudioTime
    );
    clock.at(finalBound - 0.01);
    expect(engine.result).toBeNull();
    expect(engine.state).not.toBe("completed");
    expect(engine.transport.state).toBe(
      snapshot.planEndAudioTime <= finalBound - 0.01 ? "completed" : "playing"
    );
    clock.at(finalBound + 0.03);
    expect(engine.result!.status).toBe("completed");
    expect(engine.result!.evaluation!.correct).toBe(true);
    expect(engine.state).toBe("completed");
    expect(engine.transport.state).toBe("completed");
    await engine.dispose();
    expect(clock.tasks.size).toBe(0);
  });

  it.each(
    SEVEN_METER_RUNTIME_FIXTURES.map((fixture, index) => ({ fixture, index }))
  )(
    "plays every free-loop and full-measure pulse after one early sustained onset with rest tails in $fixture.name",
    async ({ fixture, index }) => {
      for (const bars of [1, 2, 4] as const) {
        const h = setup(index, sparseSustainPattern(fixture, bars));
        const plan = expectTwoRoundPulsePlan(h);
        const measureTicks = deriveMeter(fixture.pattern.meter).measureTicks;
        expect(h.exercise.targets).toHaveLength(bars);
        expect(
          h.exercise.targets.map(target => target.tick % measureTicks)
        ).toEqual(Array.from({ length: bars }, () => 0));
        await startAttempt(h);
        expectTwoRoundTargets(h);
        tapAll(h);
        finish(h);
        expect(h.engine.state).toBe("completed");
        expect(h.engine.result!.evaluation!.correct).toBe(true);
        expect(h.engine.transport.state).toBe("completed");

        const snapshot = h.engine.snapshot!;
        const attemptPulses = h.scheduledEvents
          .filter(
            event =>
              event.event.lane === "metronome" &&
              event.startTime >= snapshot.rounds[0].anchorAudioTime - 1e-9 &&
              event.startTime < snapshot.planEndAudioTime - 1e-9
          )
          .sort((a, b) => a.startTime - b.startTime);
        const expectedPulseTimes = plan.pulseEvents.map(
          event => snapshot.rounds[0].anchorAudioTime + event.offsetSeconds
        );
        expect(attemptPulses.map(event => event.startTime)).toHaveLength(
          expectedPulseTimes.length
        );
        attemptPulses.forEach((event, index) =>
          expect(event.startTime).toBeCloseTo(expectedPulseTimes[index], 8)
        );
        expect(new Set(attemptPulses.map(event => event.startTime)).size).toBe(
          attemptPulses.length
        );
        await h.engine.dispose();
        expect(h.clock.tasks.size).toBe(0);
      }
    }
  );
});

import { describe, expect, it } from "vitest";
import { FOUR_FOUR, WHOLE_NOTE } from "../rhythm/fixtures";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";
import { createRhythmAudioPlan } from "./plan";
import { RhythmAudioTransport, type RhythmScheduledEvent } from "./transport";
import type { RhythmVoiceSettings } from "./voices";

// Test synthesis inputs only: these values are NOT product accent/gain policy.
const voices: RhythmVoiceSettings = {
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
class FakeParam {
  values: [string, number, number][] = [];
  setValueAtTime(value: number, at: number) {
    this.values.push(["set", value, at]);
  }
  linearRampToValueAtTime(value: number, at: number) {
    this.values.push(["ramp", value, at]);
  }
  cancelScheduledValues(at: number) {
    this.values.push(["cancel", 0, at]);
  }
}
class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  type = "sine";
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: number[] = [];
  disconnected = false;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
  start(at: number) {
    this.starts.push(at);
  }
  stop(at = 0) {
    this.stops.push(at);
  }
}
class FakeContext extends EventTarget {
  currentTime = 10;
  state = "running";
  destination = {};
  nodes: FakeNode[] = [];
  gains: FakeNode[] = [];
  resumePromise: Promise<void> | null = null;
  blocked = false;
  closed = false;
  createOscillator() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }
  createGain() {
    const node = new FakeNode();
    this.gains.push(node);
    return node;
  }
  async resume() {
    if (this.blocked) throw new Error("autoplay denied");
    if (this.resumePromise) await this.resumePromise;
    this.state = "running";
  }
  async close() {
    this.closed = true;
    this.state = "closed";
  }
  finishNodes() {
    for (const node of this.nodes)
      if (!node.disconnected && node.stops.at(-1)! <= this.currentTime)
        node.onended?.();
  }
}
class Clock {
  context = new FakeContext();
  next = 0;
  tasks = new Map<number, { due: number; callback: () => void }>();
  history: (() => void)[] = [];
  timers = {
    set: (callback: () => void, ms: number) => {
      const id = ++this.next;
      this.tasks.set(id, {
        due: this.context.currentTime + ms / 1000,
        callback,
      });
      this.history.push(callback);
      return id;
    },
    clear: (id: unknown) => {
      this.tasks.delete(id as number);
    },
  };
  advance(seconds: number) {
    const target = this.context.currentTime + seconds;
    while (true) {
      const entry = [...this.tasks].sort((a, b) => a[1].due - b[1].due)[0];
      if (!entry || entry[1].due > target) break;
      this.tasks.delete(entry[0]);
      this.context.currentTime = entry[1].due;
      this.context.finishNodes();
      entry[1].callback();
    }
    this.context.currentTime = target;
    this.context.finishNodes();
  }
}
function setup(visibility: (EventTarget & { hidden: boolean }) | null = null) {
  const clock = new Clock();
  const events: RhythmScheduledEvent[] = [];
  const transport = new RhythmAudioTransport({
    voices,
    contextFactory: () => clock.context as unknown as AudioContext,
    timers: clock.timers,
    visibilitySource: visibility as Document | null,
    onScheduled: event => events.push(event),
  });
  return { clock, transport, events };
}

describe("production currentTime Rhythm audio transport", () => {
  it("exposes canonical onset references even when only the metronome lane is audible", async () => {
    const { clock, transport, events } = setup();
    const plan = createRhythmAudioPlan(FOUR_FOUR, "metronome");
    await transport.start(plan);
    const timing = transport.getReferenceTiming()!;
    expect(timing.expectedOnsets.map(event => event.tick)).toEqual([
      0, 480, 720, 1440,
    ]);
    expect(plan.toneEvents).toHaveLength(0);
    clock.advance(plan.durationSeconds + 0.1);
    expect(events.every(event => event.event.lane === "metronome")).toBe(true);
    await transport.dispose();
  });

  it("keeps a free metronome loop alive across bars on one generation and anchor", async () => {
    const { clock, transport, events } = setup();
    const plan = createRhythmAudioPlan(FOUR_FOUR, "metronome");
    const timing = await transport.startLoop(plan);
    clock.advance(plan.durationSeconds * 3 + 0.1);
    expect(transport.state).toBe("playing");
    expect(transport.getReferenceTiming()).toBeNull();
    const pulses = events.filter(event => event.event.lane === "metronome");
    expect(pulses.length).toBeGreaterThanOrEqual(plan.pulseCount * 3);
    expect(new Set(pulses.map(event => event.generation))).toEqual(
      new Set([timing.generation])
    );
    expect(pulses.map(event => event.startTime)).toEqual(
      [...pulses.map(event => event.startTime)].sort((a, b) => a - b)
    );
    expect(new Set(pulses.map(event => event.event.id)).size).toBe(
      pulses.length
    );
    transport.stop();
    expect(transport.hasPendingWakeup).toBe(false);
    await transport.dispose();
  });

  it("appends at a scheduled loop barline without a duplicate pulse or new generation", async () => {
    const { clock, transport, events } = setup();
    const loop = createRhythmAudioPlan(FOUR_FOUR, "metronome");
    const exercise = createRhythmAudioPlan(FOUR_FOUR, "metronome");
    const timing = await transport.startLoop(loop);
    const boundary = timing.anchorTime + loop.durationSeconds;
    clock.advance(boundary - clock.context.currentTime - 0.2);
    clock.advance(0.2);
    const before = events.filter(event => event.event.lane === "metronome");
    expect(before.some(event => Math.abs(event.startTime - boundary) < 1e-9)).toBe(true);
    const reference = transport.appendPlanAtLoopBoundary(exercise, boundary);
    expect(reference.generation).toBe(timing.generation);
    expect(reference.anchorTime).toBe(boundary);
    expect(reference.expectedOnsets[0].audioTime).toBe(boundary);
    clock.advance(exercise.durationSeconds + 0.2);
    expect(transport.state).toBe("completed");
    const allPulses = events.filter(event => event.event.lane === "metronome");
    expect(allPulses.filter(event => Math.abs(event.startTime - boundary) < 1e-9)).toHaveLength(1);
    expect(new Set(allPulses.map(event => event.generation))).toEqual(
      new Set([timing.generation])
    );
    expect(transport.hasPendingWakeup).toBe(false);
    await transport.dispose();
  });

  it("uses the continuation pulse when the free loop has not scheduled the boundary yet", async () => {
    const { clock, transport, events } = setup();
    const loop = createRhythmAudioPlan(FOUR_FOUR, "metronome");
    const exercise = createRhythmAudioPlan(FOUR_FOUR, "metronome");
    const timing = await transport.startLoop(loop);
    const boundary = timing.anchorTime + loop.durationSeconds;
    clock.advance(0.3);
    transport.appendPlanAtLoopBoundary(exercise, boundary);
    clock.advance(boundary - clock.context.currentTime + exercise.durationSeconds + 0.2);
    expect(transport.state).toBe("completed");
    expect(
      events.filter(
        event =>
          event.event.lane === "metronome" &&
          Math.abs(event.startTime - boundary) < 1e-9
      )
    ).toHaveLength(1);
    await transport.dispose();
  });

  it.each(SEVEN_METER_RUNTIME_FIXTURES)(
    "schedules native voice calls with exact pulse times for $name",
    async fixture => {
      const { clock, transport, events } = setup();
      const plan = createRhythmAudioPlan(fixture.pattern, "both");
      await transport.start(plan);
      const reference = transport.getReferenceTiming()!;
      expect(reference.clock).toBe("audio-context-seconds");
      expect(reference.expectedOnsets.map(e => e.tick)).toEqual(
        fixture.eighthStarts
      );
      clock.advance(plan.durationSeconds + 0.1);
      expect(transport.state).toBe("completed");
      expect(events).toHaveLength(plan.events.length);
      expect(new Set(events.map(e => e.event.id)).size).toBe(
        plan.events.length
      );
      for (const scheduled of events)
        expect(scheduled.startTime).toBeCloseTo(
          reference.anchorTime + scheduled.event.offsetSeconds,
          12
        );
      expect(
        events.filter(e => e.event.lane === "metronome").map(e => e.event.tick)
      ).toEqual(fixture.pulseStarts);
      expect(clock.context.nodes).toHaveLength(plan.events.length);
      expect(clock.context.nodes.every(node => node.disconnected)).toBe(true);
      expect(transport.activeVoiceCount).toBe(0);
      expect(transport.hasPendingWakeup).toBe(false);
      await transport.dispose();
    }
  );

  it("stop cancels all nodes and pending wakeups; stale callbacks cannot restart sound", async () => {
    const { clock, transport } = setup();
    await transport.start(createRhythmAudioPlan(FOUR_FOUR, "both"));
    const stale = clock.history[0];
    const count = clock.context.nodes.length;
    transport.stop();
    stale();
    clock.advance(10);
    expect(transport.state).toBe("stopped");
    expect(clock.tasks.size).toBe(0);
    expect(clock.context.nodes).toHaveLength(count);
    expect(clock.context.nodes.every(node => node.disconnected)).toBe(true);
    await transport.dispose();
    expect(clock.context.closed).toBe(true);
  });

  it("a scheduled-event observer can stop playback without leaking the remaining queue", async () => {
    const clock = new Clock();
    let transport!: RhythmAudioTransport;
    transport = new RhythmAudioTransport({
      voices,
      timers: clock.timers,
      contextFactory: () => clock.context as unknown as AudioContext,
      visibilitySource: null,
      onScheduled: () => transport.stop(),
    });
    await transport.start(createRhythmAudioPlan(FOUR_FOUR, "both"));
    expect(transport.state).toBe("stopped");
    expect(clock.context.nodes).toHaveLength(1);
    expect(clock.context.nodes.every(node => node.disconnected)).toBe(true);
    expect(clock.tasks.size).toBe(0);
    expect(transport.hasPendingWakeup).toBe(false);
    await transport.dispose();
  });

  it("pause cancels gates and resumes only remaining sustain without a new canonical onset", async () => {
    const { clock, transport, events } = setup();
    const plan = createRhythmAudioPlan(WHOLE_NOTE, "pattern");
    await transport.start(plan);
    clock.advance(1.05);
    transport.pause();
    expect(transport.state).toBe("paused");
    expect(transport.activeVoiceCount).toBe(0);
    expect(clock.tasks.size).toBe(0);
    clock.advance(5);
    await transport.resume();
    expect(events).toHaveLength(2);
    expect(events[1].resumedSustain).toBe(true);
    expect(events[1].endTime - events[1].startTime).toBeCloseTo(3, 10);
    expect(transport.getReferenceTiming()!.expectedOnsets).toEqual([]);
    clock.advance(3.2);
    expect(transport.state).toBe("completed");
    await transport.dispose();
  });

  it("replay reuses immutable pattern and never retains old-generation events", async () => {
    const { clock, transport, events } = setup();
    const plan = createRhythmAudioPlan(FOUR_FOUR, "pattern");
    const snapshot = JSON.stringify(plan);
    await transport.start(plan);
    const generation = events[0].generation;
    const stale = clock.history[0];
    clock.advance(0.1);
    await transport.replay();
    stale();
    clock.advance(plan.durationSeconds + 0.1);
    const replayEvents = events.filter(
      event => event.generation !== generation
    );
    expect(replayEvents).toHaveLength(plan.events.length);
    expect(new Set(replayEvents.map(event => event.event.id)).size).toBe(
      plan.events.length
    );
    expect(JSON.stringify(plan)).toBe(snapshot);
    await transport.dispose();
  });

  it("aborts missed lookahead instead of emitting late or bunched attacks", async () => {
    const { clock, transport } = setup();
    await transport.start(createRhythmAudioPlan(FOUR_FOUR, "both"));
    clock.context.currentTime += 1;
    clock.history[0]();
    expect(transport.state).toBe("aborted");
    expect(transport.abortReason).toBe("scheduler-starved");
    expect(transport.activeVoiceCount).toBe(0);
    expect(transport.hasPendingWakeup).toBe(false);
    await transport.dispose();
  });

  it("aborts context interruptions and output-route changes without scoring", async () => {
    for (const reason of [
      "context-interrupted",
      "output-route-change",
    ] as const) {
      const { clock, transport } = setup();
      await transport.start(createRhythmAudioPlan(FOUR_FOUR, "both"));
      if (reason === "context-interrupted") clock.context.state = "suspended";
      clock.context.dispatchEvent(
        new Event(
          reason === "context-interrupted" ? "statechange" : "sinkchange"
        )
      );
      expect(transport.abortReason).toBe(reason);
      expect(transport.state).toBe("aborted");
      expect(transport.activeVoiceCount).toBe(0);
      expect(clock.tasks.size).toBe(0);
      await transport.dispose();
    }
  });

  it("does not falsely complete if a delayed wakeup skipped all remaining events", async () => {
    const { clock, transport } = setup();
    await transport.start(createRhythmAudioPlan(FOUR_FOUR, "both"));
    clock.context.currentTime += 20;
    clock.history[0]();
    expect(transport.state).toBe("aborted");
    expect(transport.abortReason).toBe("scheduler-starved");
    expect(transport.activeVoiceCount).toBe(0);
    await transport.dispose();
  });

  it("anchors every event absolutely across 32 bars without duplicates or cumulative timer drift", async () => {
    const { clock, transport, events } = setup();
    const pattern = {
      ...FOUR_FOUR,
      id: "long-audio",
      measures: Array.from({ length: 32 }, (_, bar) => ({
        id: `bar-${bar}`,
        segments: FOUR_FOUR.measures[0].segments.map(segment => ({
          ...segment,
          id: `${bar}-${segment.id}`,
        })),
      })),
    };
    const plan = createRhythmAudioPlan(pattern, "both");
    await transport.start(plan);
    const anchor = transport.getReferenceTiming()!.anchorTime;
    clock.advance(plan.durationSeconds + 0.1);
    expect(transport.state).toBe("completed");
    expect(events).toHaveLength(plan.events.length);
    expect(new Set(events.map(event => event.event.id)).size).toBe(
      plan.events.length
    );
    for (const event of events)
      expect(event.startTime - anchor).toBeCloseTo(
        event.event.offsetSeconds,
        10
      );
    expect(transport.activeVoiceCount).toBe(0);
    expect(clock.tasks.size).toBe(0);
    await transport.dispose();
  });

  it("hidden document aborts and cleanup removes the visibility listener", async () => {
    const visibility = Object.assign(new EventTarget(), { hidden: false });
    const { transport } = setup(visibility);
    await transport.start(createRhythmAudioPlan(FOUR_FOUR, "pattern"));
    visibility.hidden = true;
    visibility.dispatchEvent(new Event("visibilitychange"));
    expect(transport.abortReason).toBe("visibility-hidden");
    await transport.dispose();
    visibility.dispatchEvent(new Event("visibilitychange"));
    expect(transport.state).toBe("disposed");
  });

  it("reports unavailable/blocked audio rather than silently claiming playback", async () => {
    const unavailable = new RhythmAudioTransport({
      voices,
      contextFactory: () => {
        throw new Error("unsupported");
      },
    });
    await expect(
      unavailable.start(createRhythmAudioPlan(WHOLE_NOTE, "pattern"))
    ).rejects.toThrow("unsupported");
    expect(unavailable.abortReason).toBe("audio-unavailable");
    await unavailable.dispose();
    const { clock, transport } = setup();
    clock.context.state = "suspended";
    clock.context.blocked = true;
    await expect(
      transport.start(createRhythmAudioPlan(WHOLE_NOTE, "pattern"))
    ).rejects.toThrow("autoplay denied");
    expect(transport.abortReason).toBe("audio-blocked");
    expect(transport.activeVoiceCount).toBe(0);
    await transport.dispose();
  });

  it("a stop or dispose during pending AudioContext resume cannot resurrect playback", async () => {
    for (const action of ["stop", "dispose"] as const) {
      const { clock, transport } = setup();
      clock.context.state = "suspended";
      let unblock!: () => void;
      clock.context.resumePromise = new Promise<void>(resolve => {
        unblock = resolve;
      });
      const pending = transport.start(
        createRhythmAudioPlan(WHOLE_NOTE, "pattern")
      );
      if (action === "stop") transport.stop();
      else await transport.dispose();
      unblock();
      await pending;
      expect(clock.context.nodes).toHaveLength(0);
      expect(transport.state).toBe(action === "stop" ? "stopped" : "disposed");
      expect(clock.tasks.size).toBe(0);
      await transport.dispose();
    }
  });

  it("aborts and disconnects all nodes if a native source fails to start", async () => {
    const { clock, transport } = setup();
    const original = clock.context.createOscillator.bind(clock.context);
    clock.context.createOscillator = () => {
      const node = original();
      node.start = () => {
        throw new Error("source failure");
      };
      return node;
    };
    await transport.start(createRhythmAudioPlan(WHOLE_NOTE, "pattern"));
    expect(transport.state).toBe("aborted");
    expect(transport.abortReason).toBe("scheduling-error");
    expect(clock.context.nodes.every(node => node.disconnected)).toBe(true);
    expect(clock.context.gains.every(node => node.disconnected)).toBe(true);
    expect(transport.activeVoiceCount).toBe(0);
    expect(transport.hasPendingWakeup).toBe(false);
    await transport.dispose();
  });
});

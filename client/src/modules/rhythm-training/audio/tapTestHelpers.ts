import type { RhythmVoiceSettings } from "./voices";

/** Test-only support; no production entrypoint imports this file. */
export const TEST_TAP_VOICES: RhythmVoiceSettings = {
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
class Parameter {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class VoiceNode {
  frequency = new Parameter();
  gain = new Parameter();
  type = "sine";
  onended: (() => void) | null = null;
  stopAt = Infinity;
  disconnected = false;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
  start() {}
  stop(at = 0) {
    this.stopAt = at;
  }
}
export class TapFakeContext extends EventTarget {
  currentTime = 10;
  state = "running";
  destination = {};
  nodes: VoiceNode[] = [];
  sampleOverride:
    | (() => { contextTime: number; performanceTime: number })
    | null = null;
  getOutputTimestamp() {
    return (
      this.sampleOverride?.() ?? {
        contextTime: this.currentTime - 0.02,
        performanceTime: this.currentTime * 1000 + 980,
      }
    );
  }
  createOscillator() {
    const node = new VoiceNode();
    this.nodes.push(node);
    return node;
  }
  createGain() {
    const node = new VoiceNode();
    this.nodes.push(node);
    return node;
  }
  async resume() {
    this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
  finishNodes() {
    for (const node of this.nodes)
      if (!node.disconnected && node.stopAt <= this.currentTime)
        node.onended?.();
  }
}
export class TapFakeClock {
  context = new TapFakeContext();
  next = 0;
  tasks = new Map<number, { due: number; callback: () => void }>();
  now = () => this.context.currentTime * 1000 + 1000;
  timers = {
    set: (callback: () => void, ms: number) => {
      const id = ++this.next;
      this.tasks.set(id, {
        due: this.context.currentTime + ms / 1000,
        callback,
      });
      return id;
    },
    clear: (id: unknown) => {
      this.tasks.delete(id as number);
    },
  };
  advance(seconds: number) {
    const target = this.context.currentTime + seconds;
    while (true) {
      const entry = [...this.tasks].sort(
        (a, b) => a[1].due - b[1].due || a[0] - b[0]
      )[0];
      if (!entry || entry[1].due > target) break;
      this.tasks.delete(entry[0]);
      this.context.currentTime = entry[1].due;
      this.context.finishNodes();
      entry[1].callback();
    }
    this.context.currentTime = target;
    this.context.finishNodes();
  }
  at(audioTime: number) {
    this.advance(Math.max(0, audioTime - this.context.currentTime));
  }
  nativeTap(
    audioTime: number,
    type = "pointerdown",
    properties: Record<string, unknown> = {}
  ): Event {
    const event = new Event(type);
    Object.defineProperties(event, {
      timeStamp: { value: audioTime * 1000 + 1000 },
      isPrimary: { value: true },
      pointerId: { value: 1 },
      code: { value: "Space" },
      key: { value: " " },
      repeat: { value: false },
      ...Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, { value }])
      ),
    });
    return event;
  }
}

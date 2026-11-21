import type { ChordPitch, PlaybackConfiguration } from "../types";
import {
  scheduleRhythmVoice,
  type RhythmVoiceHandle,
  type RhythmVoiceSettings,
} from "../../rhythm-training/audio/voices";
import type { RhythmAudioEvent } from "../../rhythm-training/audio/plan";

export type ChordPlaybackNote = Readonly<{
  midi: number;
  startSeconds: number;
  endSeconds: number;
}>;

export type ChordPlaybackPlan = Readonly<{
  notes: readonly ChordPlaybackNote[];
  durationSeconds: number;
}>;

export type ChordAudioContextFactory = () => AudioContext;

const MELODY_GATE_FRACTION = 0.75;
const BOTH_GAP_SECONDS = 0.4;
const CHORD_GATE_SECONDS = 0.9;
const AUDIO_START_LEAD_SECONDS = 0.04;
const AGGREGATE_GAIN_LIMIT = 0.18;
const CANCELLED = Symbol("chord playback cancelled");

let sharedContext: AudioContext | undefined;
let sharedResumePromise: Promise<void> | undefined;

function isPlaybackMode(
  value: unknown
): value is PlaybackConfiguration["mode"] {
  return value === "melody" || value === "harmony" || value === "both";
}

function isMelodyDirection(
  value: unknown
): value is PlaybackConfiguration["direction"] {
  return value === "ascending" || value === "descending" || value === "random";
}

function validateConfiguration(config: PlaybackConfiguration): void {
  if (typeof config !== "object" || config === null) {
    throw new TypeError("A playback configuration is required.");
  }
  if (!isPlaybackMode(config.mode)) {
    throw new RangeError("Playback mode must be melody, harmony, or both.");
  }
  if (!isMelodyDirection(config.direction)) {
    throw new RangeError(
      "Melody direction must be ascending, descending, or random."
    );
  }
  if (
    !Number.isFinite(config.spacingMs) ||
    config.spacingMs < 150 ||
    config.spacingMs > 1000
  ) {
    throw new RangeError("Note spacing must be between 150 and 1000 ms.");
  }
}

function validatePitches(pitches: readonly ChordPitch[]): number[] {
  if (!Array.isArray(pitches) || pitches.length === 0) {
    throw new RangeError("A chord playback requires at least one pitch.");
  }
  return pitches.map((pitch, index) => {
    if (typeof pitch !== "object" || pitch === null) {
      throw new TypeError(`Chord pitch ${index + 1} is invalid.`);
    }
    const midi: unknown = pitch.midi;
    if (
      typeof midi !== "number" ||
      !Number.isFinite(midi) ||
      !Number.isInteger(midi) ||
      midi < 24 ||
      midi > 108
    ) {
      throw new RangeError(
        `Chord pitch ${index + 1} MIDI value must be an integer from 24 to 108.`
      );
    }
    return midi;
  });
}

function orderedMelodyPitches(
  midiPitches: readonly number[],
  direction: PlaybackConfiguration["direction"],
  random: () => number
): number[] {
  const ascending = [...midiPitches].sort((left, right) => left - right);
  let resolvedDirection = direction;
  if (direction === "random") {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError(
        "The playback random source must return a value in [0, 1)."
      );
    }
    resolvedDirection = value < 0.5 ? "ascending" : "descending";
  }
  return resolvedDirection === "descending" ? ascending.reverse() : ascending;
}

/** Build a frozen, time-relative schedule from one immutable chord pitch set. */
export function createChordPlaybackPlan(
  pitches: readonly ChordPitch[],
  config: PlaybackConfiguration,
  random: () => number = Math.random
): ChordPlaybackPlan {
  validateConfiguration(config);
  if (typeof random !== "function") {
    throw new TypeError("The playback random source must be a function.");
  }
  const midiPitches = validatePitches(pitches);
  const sortedPitches = [...midiPitches].sort((left, right) => left - right);
  const notes: ChordPlaybackNote[] = [];
  const spacingSeconds = config.spacingMs / 1000;
  const melodyGateSeconds = spacingSeconds * MELODY_GATE_FRACTION;

  if (config.mode === "melody" || config.mode === "both") {
    const melody = orderedMelodyPitches(midiPitches, config.direction, random);
    melody.forEach((midi, index) => {
      const startSeconds = index * spacingSeconds;
      notes.push(
        Object.freeze({
          midi,
          startSeconds,
          endSeconds: startSeconds + melodyGateSeconds,
        })
      );
    });
  }

  if (config.mode === "harmony") {
    for (const midi of sortedPitches) {
      notes.push(
        Object.freeze({
          midi,
          startSeconds: 0,
          endSeconds: CHORD_GATE_SECONDS,
        })
      );
    }
  } else if (config.mode === "both") {
    const lastMelodyRelease =
      (midiPitches.length - 1) * spacingSeconds + melodyGateSeconds;
    const chordStart = lastMelodyRelease + BOTH_GAP_SECONDS;
    const chordEnd = chordStart + CHORD_GATE_SECONDS;
    for (const midi of sortedPitches) {
      notes.push(
        Object.freeze({
          midi,
          startSeconds: chordStart,
          endSeconds: chordEnd,
        })
      );
    }
  }

  const durationSeconds = notes.reduce(
    (duration, note) => Math.max(duration, note.endSeconds),
    0
  );
  return Object.freeze({
    notes: Object.freeze(notes),
    durationSeconds,
  });
}

function validateReplayInputs(plays: number, limit: 1 | 3 | null): void {
  if (!Number.isInteger(plays) || plays < 0) {
    throw new RangeError(
      "Successful play count must be a non-negative integer."
    );
  }
  if (limit !== 1 && limit !== 3 && limit !== null) {
    throw new RangeError("Replay limit must be 1, 3, or unlimited (null).");
  }
}

/** `limit` counts replays after the free initial play; `plays` counts successes. */
export function replayRemaining(
  plays: number,
  limit: 1 | 3 | null
): number | null {
  validateReplayInputs(plays, limit);
  if (limit === null) return null;
  return Math.max(0, limit - Math.max(0, plays - 1));
}

/** The initial play is free, so `plays <= limit` remains eligible for one replay. */
export function canPlay(plays: number, limit: 1 | 3 | null): boolean {
  validateReplayInputs(plays, limit);
  return limit === null || plays <= limit;
}

function createDefaultContext(): AudioContext {
  if (typeof globalThis.AudioContext !== "function") {
    throw new Error("Web Audio is unavailable in this environment.");
  }
  return new globalThis.AudioContext();
}

function getSharedContext(factory?: ChordAudioContextFactory): AudioContext {
  if (sharedContext !== undefined) return sharedContext;
  const context = (factory ?? createDefaultContext)();
  if (typeof context !== "object" || context === null) {
    throw new TypeError("The AudioContext factory did not return a context.");
  }
  sharedContext = context;
  return context;
}

function resumeSharedContext(context: AudioContext): Promise<void> {
  if (context.state === "running") return Promise.resolve();
  if (context.state === "closed") {
    return Promise.reject(new Error("The shared AudioContext is closed."));
  }
  if (sharedResumePromise !== undefined) return sharedResumePromise;

  let resume: Promise<void>;
  try {
    // Called synchronously by play() so browsers can honor the user gesture.
    resume = context.resume();
  } catch (error) {
    return Promise.reject(error);
  }
  const wrapped = Promise.resolve(resume).then(() => undefined);
  sharedResumePromise = wrapped;
  void wrapped.then(
    () => {
      if (sharedResumePromise === wrapped) sharedResumePromise = undefined;
    },
    () => {
      if (sharedResumePromise === wrapped) sharedResumePromise = undefined;
    }
  );
  return wrapped;
}

function makeAbortError(): Error {
  const error = new Error("Chord playback was stopped before it started.");
  error.name = "AbortError";
  return error;
}

function toRhythmEvent(
  midi: number,
  startSeconds: number,
  endSeconds: number,
  index: number,
  phase: "melody" | "harmony"
): RhythmAudioEvent {
  const id = `chord:${phase}:${index + 1}:midi-${midi}`;
  return Object.freeze({
    id,
    lane: "pattern",
    tick: Math.round(startSeconds * 1000),
    endTick: Math.round(endSeconds * 1000),
    offsetSeconds: startSeconds,
    endOffsetSeconds: endSeconds,
    structuralAccent: "weak",
    segmentAccent: "normal",
    segmentIds: Object.freeze([id]),
    measureIndex: 0,
    pulseIndex: index,
    count: index + 1,
  });
}

const VOICE_SETTINGS_BASE = Object.freeze({
  waveform: "sine" as OscillatorType,
  edgeSeconds: 0.01,
});

/** One chord-owned adapter; instances share the module AudioContext but own their voices. */
export class ChordAudioPlayer {
  private readonly handles = new Set<RhythmVoiceHandle>();
  private generation = 0;
  private cancelPendingResume: (() => void) | undefined;

  public constructor(
    private readonly contextFactory?: ChordAudioContextFactory
  ) {}

  public async play(
    pitches: readonly ChordPitch[],
    config: PlaybackConfiguration
  ): Promise<{ durationSeconds: number }> {
    this.stop();
    const plan = createChordPlaybackPlan(pitches, config);
    const context = getSharedContext(this.contextFactory);
    const generation = this.generation;
    let resolveCancelled!: (value: typeof CANCELLED) => void;
    const cancelled = new Promise<typeof CANCELLED>(resolve => {
      resolveCancelled = resolve;
    });
    const cancelThisResume = () => resolveCancelled(CANCELLED);
    this.cancelPendingResume = cancelThisResume;

    // Start/resume on the calling gesture before yielding from this method.
    const resumed = resumeSharedContext(context).then(() => true as const);
    const resumeResult = await Promise.race([resumed, cancelled]);
    if (resumeResult === CANCELLED || generation !== this.generation) {
      if (this.cancelPendingResume === cancelThisResume) {
        this.cancelPendingResume = undefined;
      }
      throw makeAbortError();
    }
    if (this.cancelPendingResume === cancelThisResume) {
      this.cancelPendingResume = undefined;
    }

    if (context.state !== "running") {
      throw new Error(
        "The shared AudioContext did not enter the running state."
      );
    }
    const audioStart = context.currentTime + AUDIO_START_LEAD_SECONDS;
    if (!Number.isFinite(context.currentTime) || context.currentTime < 0) {
      throw new RangeError(
        "AudioContext currentTime must be finite and non-negative."
      );
    }

    const maxSimultaneousNotes = pitches.length;
    const level = AGGREGATE_GAIN_LIMIT / maxSimultaneousNotes;
    const settings: RhythmVoiceSettings = {
      pattern: {
        ...VOICE_SETTINGS_BASE,
        frequencyHz: 440,
        level,
      },
      metronome: {
        ...VOICE_SETTINGS_BASE,
        frequencyHz: 1000,
        level: 0.01,
        durationSeconds: 0.025,
      },
    };

    try {
      for (let index = 0; index < plan.notes.length; index++) {
        const note = plan.notes[index];
        const phase =
          config.mode === "both" &&
          note.startSeconds > 0 &&
          index >= pitches.length
            ? "harmony"
            : config.mode === "harmony"
              ? "harmony"
              : "melody";
        const start = audioStart + note.startSeconds;
        const end = audioStart + note.endSeconds;
        const noteSettings: RhythmVoiceSettings = {
          ...settings,
          pattern: {
            ...settings.pattern,
            frequencyHz: 440 * 2 ** ((note.midi - 69) / 12),
          },
        };
        let handle: RhythmVoiceHandle | undefined;
        let endedBeforeRegistration = false;
        handle = scheduleRhythmVoice(
          context,
          toRhythmEvent(
            note.midi,
            note.startSeconds,
            note.endSeconds,
            index,
            phase
          ),
          start,
          end,
          noteSettings,
          () => {
            if (handle === undefined) endedBeforeRegistration = true;
            else this.handles.delete(handle);
          }
        );
        if (!endedBeforeRegistration) this.handles.add(handle);
      }
    } catch (error) {
      this.stop();
      throw error;
    }

    return { durationSeconds: plan.durationSeconds };
  }

  /** Stop only this instance's playback; another owner's newer voices are untouched. */
  public stop(): void {
    this.generation++;
    this.cancelPendingResume?.();
    this.cancelPendingResume = undefined;
    for (const handle of [...this.handles]) handle.cancel();
    this.handles.clear();
  }
}

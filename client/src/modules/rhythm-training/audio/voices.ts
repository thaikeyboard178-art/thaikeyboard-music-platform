import type { RhythmAudioEvent } from "./plan";

/** Synthesis settings are caller inputs, not approved accent/velocity policy. */
export type RhythmVoiceSettings = Readonly<{
  pattern: Readonly<{
    frequencyHz: number;
    level: number;
    waveform: OscillatorType;
    edgeSeconds: number;
    /** Opt-in real instrument sample; when present, no pattern oscillator is used. */
    pianoBuffer?: AudioBuffer;
    /** Optional caller-owned lane gain/output (for example, an independent volume control). */
    output?: AudioNode;
  }>;
  metronome: Readonly<{
    frequencyHz: number;
    level: number;
    waveform: OscillatorType;
    durationSeconds: number;
    edgeSeconds: number;
    /** Opt-in synthesized PCM click; when present, no metronome oscillator is used. */
    brightClick?: true;
    /** Opt-in inharmonic modal knock with a bounded, independently decaying tail. */
    resonantKnock?: true;
    /** Optional caller-owned lane gain/output (for example, an independent volume control). */
    output?: AudioNode;
  }>;
}>;

export type RhythmVoiceHandle = Readonly<{
  cancel: () => void;
}>;

export function validateVoiceSettings(settings: RhythmVoiceSettings): void {
  for (const voice of [settings.pattern, settings.metronome]) {
    if (
      !Number.isFinite(voice.frequencyHz) ||
      voice.frequencyHz <= 0 ||
      !Number.isFinite(voice.level) ||
      voice.level <= 0 ||
      voice.level > 1 ||
      !Number.isFinite(voice.edgeSeconds) ||
      voice.edgeSeconds <= 0 ||
      !["sine", "square", "triangle", "sawtooth"].includes(voice.waveform)
    )
      throw new RangeError("Invalid explicit Rhythm voice settings.");
  }
  if (
    !Number.isFinite(settings.metronome.durationSeconds) ||
    settings.metronome.durationSeconds <= 0 ||
    settings.metronome.durationSeconds > 0.25
  )
    throw new RangeError("Metronome voice must be a short, finite tick.");
  if (
    settings.metronome.brightClick === true &&
    settings.metronome.resonantKnock === true
  )
    throw new RangeError("Choose only one opt-in metronome synthesis voice.");
}

/**
 * Safely releases a short-lived AudioBufferSourceNode voice. All scheduling and
 * cancellation use the same audio-clock timebase as the canonical transport.
 */
function scheduleBufferVoice(
  context: BaseAudioContext,
  buffer: AudioBuffer,
  startTime: number,
  gateEnd: number,
  level: number,
  edgeSeconds: number,
  output: AudioNode | undefined,
  onEnded: () => void
): RhythmVoiceHandle {
  let source: AudioBufferSourceNode | undefined;
  let gain: GainNode | undefined;
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    if (source) {
      source.onended = null;
      try {
        source.disconnect();
      } catch {
        /* Cleanup remains idempotent even if native teardown already occurred. */
      }
    }
    if (gain) {
      try {
        gain.disconnect();
      } catch {
        /* Cleanup remains idempotent even if native teardown already occurred. */
      }
    }
    try {
      onEnded();
    } catch {
      /* Scheduler cleanup callbacks must not interrupt native audio teardown. */
    }
  };

  try {
    source = context.createBufferSource();
    gain = context.createGain();
    source.buffer = buffer;
    if (
      gateEnd - startTime > buffer.duration &&
      PIANO_LOOP_END_SECONDS < buffer.duration
    ) {
      // Sustains long notes without restarting the piano's recorded attack.
      source.loop = true;
      source.loopStart = PIANO_LOOP_START_SECONDS;
      source.loopEnd = PIANO_LOOP_END_SECONDS;
    }
    const edge = Math.min(edgeSeconds, (gateEnd - startTime) / 3);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(level, startTime + edge);
    gain.gain.setValueAtTime(level, gateEnd - edge);
    gain.gain.linearRampToValueAtTime(0, gateEnd);
    source.connect(gain);
    gain.connect(output ?? context.destination);
    source.onended = cleanup;
    source.start(startTime);
    // Stopping at the canonical gate end prevents sample tails leaking into rests.
    source.stop(gateEnd);
  } catch (error) {
    try {
      source?.stop();
    } catch {
      /* It may not have started yet. */
    }
    cleanup();
    throw error;
  }

  return Object.freeze({
    cancel: () => {
      if (finished) return;
      try {
        gain?.gain.cancelScheduledValues(context.currentTime);
        gain?.gain.setValueAtTime(0, context.currentTime);
      } catch {
        /* Still stop and disconnect the source if automation is unavailable. */
      }
      try {
        source?.stop(context.currentTime);
      } catch {
        /* Already ended. */
      }
      cleanup();
    },
  });
}

type ClickAccent = "strong" | "medium" | "weak";

const CLICK_PROFILE: Readonly<
  Record<
    ClickAccent,
    Readonly<{
      frequencyHz: number;
      levelScale: number;
    }>
  >
> = Object.freeze({
  strong: Object.freeze({ frequencyHz: 3300, levelScale: 1 }),
  medium: Object.freeze({ frequencyHz: 2550, levelScale: 0.74 }),
  weak: Object.freeze({ frequencyHz: 1950, levelScale: 0.5 }),
});

const clickBuffers = new WeakMap<
  BaseAudioContext,
  Readonly<Record<ClickAccent, AudioBuffer>>
>();

// Original FreePats SFZ loop frames converted to seconds at the source rate.
const PIANO_LOOP_START_SECONDS = 199374 / 44100;
const PIANO_LOOP_END_SECONDS = 354248 / 44100;

/** Build a short, bright noise-plus-downward-chirp PCM click, not a sine-only tone. */
function createClickBuffer(
  context: BaseAudioContext,
  accent: ClickAccent
): AudioBuffer {
  const sampleRate = context.sampleRate;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError(
      "AudioContext sample rate must be finite and positive."
    );
  }
  const durationSeconds = 0.045;
  const frameCount = Math.max(1, Math.ceil(sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const pcm = buffer.getChannelData(0);
  const profile = CLICK_PROFILE[accent];
  let seed =
    accent === "strong" ? 0x7135 : accent === "medium" ? 0x3981 : 0x1957;
  const chirpSlope = -profile.frequencyHz * 12;
  for (let frame = 0; frame < frameCount; frame++) {
    const time = frame / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    const phase =
      2 *
      Math.PI *
      (profile.frequencyHz * time + 0.5 * chirpSlope * time * time);
    const tone = Math.sin(phase) * 0.68 + Math.sin(phase * 2) * 0.16;
    const attackAndDecay = Math.exp(-time * 92);
    const value = (noise * 0.62 + tone) * attackAndDecay;
    pcm[frame] = Math.max(-1, Math.min(1, value));
  }
  return buffer;
}

function getClickBuffer(
  context: BaseAudioContext,
  accent: ClickAccent
): AudioBuffer {
  let buffers = clickBuffers.get(context);
  if (buffers === undefined) {
    buffers = Object.freeze({
      strong: createClickBuffer(context, "strong"),
      medium: createClickBuffer(context, "medium"),
      weak: createClickBuffer(context, "weak"),
    });
    clickBuffers.set(context, buffers);
  }
  return buffers[accent];
}

type ResonantMode = Readonly<{
  frequencyHz: number;
  amplitude: number;
  decaySeconds: number;
}>;
type ResonantProfile = Readonly<{
  levelScale: number;
  modes: readonly ResonantMode[];
}>;

/**
 * Inharmonic partials give the strike a wooden/bell-like body instead of the
 * broadband edge of the legacy bright click. Amplitudes are normalized at
 * scheduling time; profile frequencies and decay constants are immutable.
 */
const RESONANT_KNOCK_PROFILE: Readonly<Record<ClickAccent, ResonantProfile>> =
  Object.freeze({
    strong: Object.freeze({
      levelScale: 1,
      modes: Object.freeze([
        Object.freeze({
          frequencyHz: 560,
          amplitude: 0.5,
          decaySeconds: 0.1,
        }),
        Object.freeze({
          frequencyHz: 1423,
          amplitude: 0.31,
          decaySeconds: 0.05,
        }),
        Object.freeze({
          frequencyHz: 2705,
          amplitude: 0.14,
          decaySeconds: 0.025,
        }),
        Object.freeze({
          frequencyHz: 3689,
          amplitude: 0.05,
          decaySeconds: 0.012,
        }),
      ]),
    }),
    medium: Object.freeze({
      levelScale: 0.8,
      modes: Object.freeze([
        Object.freeze({
          frequencyHz: 446,
          amplitude: 0.54,
          decaySeconds: 0.092,
        }),
        Object.freeze({
          frequencyHz: 1127,
          amplitude: 0.28,
          decaySeconds: 0.048,
        }),
        Object.freeze({
          frequencyHz: 2119,
          amplitude: 0.13,
          decaySeconds: 0.023,
        }),
        Object.freeze({
          frequencyHz: 2963,
          amplitude: 0.05,
          decaySeconds: 0.011,
        }),
      ]),
    }),
    weak: Object.freeze({
      levelScale: 0.6,
      modes: Object.freeze([
        Object.freeze({
          frequencyHz: 342,
          amplitude: 0.57,
          decaySeconds: 0.085,
        }),
        Object.freeze({
          frequencyHz: 879,
          amplitude: 0.26,
          decaySeconds: 0.045,
        }),
        Object.freeze({
          frequencyHz: 1613,
          amplitude: 0.13,
          decaySeconds: 0.021,
        }),
        Object.freeze({
          frequencyHz: 2457,
          amplitude: 0.04,
          decaySeconds: 0.01,
        }),
      ]),
    }),
  });

/** Schedule four native oscillator modes with a shared onset and independent decay. */
function scheduleResonantKnock(
  context: BaseAudioContext,
  startTime: number,
  ringSeconds: number,
  level: number,
  edgeSeconds: number,
  accent: ClickAccent,
  output: AudioNode | undefined,
  onEnded: () => void
): RhythmVoiceHandle {
  const profile = RESONANT_KNOCK_PROFILE[accent];
  const amplitudeTotal = profile.modes.reduce(
    (sum, mode) => sum + mode.amplitude,
    0
  );
  // A conservative summed-peak bound prevents clipping without hard clipping.
  const normalizedLevel = Math.min(level, 0.4) * profile.levelScale;
  const attackSeconds = Math.min(
    Math.max(edgeSeconds, 0.0005),
    0.004,
    ringSeconds / 4
  );
  const terminalFadeSeconds = Math.min(0.008, ringSeconds / 4);
  const stopTime = startTime + ringSeconds;
  const decayEnd = stopTime - terminalFadeSeconds;
  const voices: Array<{
    oscillator: OscillatorNode;
    gain: GainNode;
  }> = [];
  let endedModes = 0;
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    for (const voice of voices) {
      voice.oscillator.onended = null;
      try {
        voice.oscillator.disconnect();
      } catch {
        /* Keep cleanup idempotent if a native node already disconnected. */
      }
      try {
        voice.gain.disconnect();
      } catch {
        /* Keep cleanup idempotent if a native node already disconnected. */
      }
    }
    try {
      onEnded();
    } catch {
      /* Scheduler cleanup callbacks must not interrupt native audio teardown. */
    }
  };

  try {
    for (const mode of profile.modes) {
      const oscillator = context.createOscillator();
      let gain: GainNode;
      try {
        gain = context.createGain();
      } catch (error) {
        try {
          oscillator.disconnect();
        } catch {
          /* The oscillator may already be disconnected by a failed context. */
        }
        throw error;
      }
      voices.push({ oscillator, gain });
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(mode.frequencyHz, startTime);
      const peak = normalizedLevel * (mode.amplitude / amplitudeTotal);
      const finalEnvelope =
        peak *
        Math.exp(
          -Math.max(0, decayEnd - (startTime + attackSeconds)) /
            mode.decaySeconds
        );
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + attackSeconds);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(finalEnvelope, peak * 0.0001),
        decayEnd
      );
      gain.gain.linearRampToValueAtTime(0, stopTime);
      oscillator.connect(gain);
      gain.connect(output ?? context.destination);
      oscillator.onended = () => {
        if (finished) return;
        endedModes += 1;
        if (endedModes === profile.modes.length) cleanup();
      };
    }
    for (const voice of voices) {
      voice.oscillator.start(startTime);
      voice.oscillator.stop(stopTime);
    }
  } catch (error) {
    for (const voice of voices) {
      try {
        voice.oscillator.stop(context.currentTime);
      } catch {
        /* The mode may not have started, or may already have been stopped. */
      }
    }
    cleanup();
    throw error;
  }

  return Object.freeze({
    cancel: () => {
      if (finished) return;
      for (const voice of voices) {
        try {
          voice.gain.gain.cancelScheduledValues(context.currentTime);
          voice.gain.gain.setValueAtTime(0, context.currentTime);
        } catch {
          /* Stop and disconnect the mode even if automation cannot be cancelled. */
        }
        try {
          voice.oscillator.stop(context.currentTime);
        } catch {
          /* Already ended. */
        }
      }
      cleanup();
    },
  });
}

const pianoPeakCache = new WeakMap<AudioBuffer, number>();

/** Keep normalized sample playback below a conservative per-voice peak. */
function boundedPianoLevel(
  buffer: AudioBuffer,
  requestedLevel: number
): number {
  let peak = pianoPeakCache.get(buffer);
  if (peak === undefined) {
    peak = 0;
    try {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const samples = buffer.getChannelData(channel);
        for (let index = 0; index < samples.length; index++) {
          const sample = samples[index];
          if (Number.isFinite(sample)) peak = Math.max(peak, Math.abs(sample));
        }
      }
    } catch {
      // Native AudioBuffers expose their channel data; assume normalized PCM in test doubles.
      peak = 1;
    }
    if (peak <= 0) peak = 1;
    pianoPeakCache.set(buffer, peak);
  }
  return Math.min(requestedLevel, 0.32) / Math.max(1, peak);
}

/**
 * A real oscillator gate, not a click stand-in for a written note duration.
 * The default (no opt-in buffer/click fields) retains the legacy oscillator
 * behavior and independent structural/segment accent semantics.
 */
export function scheduleRhythmVoice(
  context: BaseAudioContext,
  event: RhythmAudioEvent,
  startTime: number,
  endTime: number,
  settings: RhythmVoiceSettings,
  onEnded: () => void = () => undefined
): RhythmVoiceHandle {
  validateVoiceSettings(settings);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    startTime < 0 ||
    endTime <= startTime
  )
    throw new RangeError("A voice requires a finite positive audio gate.");
  const voice = settings[event.lane];
  const gateEnd =
    event.lane === "metronome"
      ? Math.min(endTime, startTime + settings.metronome.durationSeconds)
      : endTime;

  if (event.lane === "pattern" && settings.pattern.pianoBuffer !== undefined) {
    return scheduleBufferVoice(
      context,
      settings.pattern.pianoBuffer,
      startTime,
      gateEnd,
      boundedPianoLevel(settings.pattern.pianoBuffer, settings.pattern.level),
      settings.pattern.edgeSeconds,
      settings.pattern.output,
      onEnded
    );
  }

  if (event.lane === "metronome" && settings.metronome.resonantKnock === true) {
    return scheduleResonantKnock(
      context,
      startTime,
      settings.metronome.durationSeconds,
      settings.metronome.level,
      settings.metronome.edgeSeconds,
      event.structuralAccent,
      settings.metronome.output,
      onEnded
    );
  }

  if (event.lane === "metronome" && settings.metronome.brightClick === true) {
    const accent = event.structuralAccent;
    const profile = CLICK_PROFILE[accent];
    let clickBuffer: AudioBuffer;
    try {
      clickBuffer = getClickBuffer(context, accent);
    } catch (error) {
      try {
        onEnded();
      } catch {
        /* The original audio-buffer construction error remains authoritative. */
      }
      throw error;
    }
    return scheduleBufferVoice(
      context,
      clickBuffer,
      startTime,
      gateEnd,
      Math.min(settings.metronome.level, 0.32) * profile.levelScale,
      settings.metronome.edgeSeconds,
      settings.metronome.output,
      onEnded
    );
  }

  const edge = Math.min(voice.edgeSeconds, (gateEnd - startTime) / 3);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  let disconnected = false;
  const disconnect = () => {
    if (disconnected) return;
    disconnected = true;
    oscillator.onended = null;
    oscillator.disconnect();
    gain.disconnect();
    onEnded();
  };
  try {
    oscillator.type = voice.waveform;
    oscillator.frequency.setValueAtTime(voice.frequencyHz, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(voice.level, startTime + edge);
    gain.gain.setValueAtTime(voice.level, gateEnd - edge);
    gain.gain.linearRampToValueAtTime(0, gateEnd);
    oscillator.connect(gain);
    gain.connect(voice.output ?? context.destination);
    oscillator.onended = disconnect;
    oscillator.start(startTime);
    oscillator.stop(gateEnd);
  } catch (error) {
    try {
      oscillator.stop();
    } catch {
      /* It may not have started yet. */
    }
    disconnect();
    throw error;
  }
  return Object.freeze({
    cancel: () => {
      if (disconnected) return;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
      try {
        oscillator.stop(context.currentTime);
      } catch {
        /* Already ended. */
      }
      disconnect();
    },
  });
}

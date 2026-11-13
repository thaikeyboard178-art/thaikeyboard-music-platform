import React, { useEffect, useMemo, useRef, useState } from "react";
import { deriveMeterStructure } from "../rhythm/meters";
import type { RhythmMeter } from "../types";
import type { RhythmScheduledEvent } from "../audio/transport";

type PlaybackState =
  | "idle"
  | "starting"
  | "playing"
  | "paused"
  | "stopped"
  | "completed"
  | "aborted"
  | "disposed"
  | "count-in"
  | "collecting"
  | "draining"
  | "reference";

export type RhythmAudioPlayback = Readonly<{
  audioTime: number;
  scheduledEvents: readonly RhythmScheduledEvent[];
  state: PlaybackState | string;
}>;

type VisualMetronomeProps = Readonly<{
  meter: RhythmMeter;
  pulseBpm?: number;
  /** Playback-only measure offset; zero for preview and one for reference. */
  countInBars?: number;
  readPlayback: () => RhythmAudioPlayback | null;
}>;

type ActivePulse = Readonly<{
  generation: number;
  measureIndex: number;
  pulseIndex: number;
  countIn: boolean;
}>;

const LIVE_STATES = new Set([
  "starting",
  "playing",
  "count-in",
  "collecting",
  "draining",
  "reference",
]);

function activePulseFor(
  playback: RhythmAudioPlayback | null,
  pulseSeconds?: number,
  countInBars = 0
): ActivePulse | null {
  if (
    playback === null ||
    !Number.isFinite(playback.audioTime) ||
    !LIVE_STATES.has(playback.state)
  ) {
    return null;
  }

  const pulses = playback.scheduledEvents
    .filter(item => item.event.lane === "metronome")
    .sort((left, right) => {
      if (left.generation !== right.generation)
        return left.generation - right.generation;
      return left.startTime - right.startTime;
    });
  if (pulses.length === 0) return null;

  const currentGeneration = pulses[pulses.length - 1].generation;
  const generationPulses = pulses.filter(
    item => item.generation === currentGeneration
  );
  const due = generationPulses.filter(
    item => item.startTime <= playback.audioTime
  );
  const current = due[due.length - 1];
  if (!current) return null;

  // A click gate is shorter than a musical pulse. The learner supplies the
  // immutable exercise pulse BPM, so queue look-ahead cannot flicker the dot.
  // Legacy callers without BPM retain the bounded scheduled-event fallback.
  const next = generationPulses.find(
    item => item.startTime > current.startTime
  );
  const audibleUntil =
    pulseSeconds !== undefined
      ? Math.min(current.startTime + pulseSeconds, next?.startTime ?? Infinity)
      : (next?.startTime ?? current.endTime);
  if (playback.audioTime >= audibleUntil) return null;

  const countIn = current.event.id.startsWith("count-in:");
  return Object.freeze({
    generation: current.generation,
    measureIndex: current.event.measureIndex - (countIn ? 0 : countInBars),
    pulseIndex: current.event.pulseIndex,
    countIn,
  });
}

/**
 * A display-only projection of already-scheduled metronome events. Animation
 * frames sample the AudioContext clock; they never create musical timing.
 */
export function VisualMetronome({
  meter,
  pulseBpm,
  countInBars = 0,
  readPlayback,
}: VisualMetronomeProps) {
  const structure = useMemo(() => deriveMeterStructure(meter, 240), [meter]);
  const playbackReader = useRef(readPlayback);
  const pulsePeriod = useRef<number | undefined>(undefined);
  const measureOffset = useRef(countInBars);
  const [activePulse, setActivePulse] = useState<ActivePulse | null>(null);
  playbackReader.current = readPlayback;
  measureOffset.current = countInBars;
  pulsePeriod.current =
    pulseBpm !== undefined && Number.isFinite(pulseBpm) && pulseBpm > 0
      ? 60 / pulseBpm
      : undefined;

  useEffect(() => {
    let frame = 0;
    let stopped = false;
    const sample = () => {
      if (stopped) return;
      let playback: RhythmAudioPlayback | null = null;
      try {
        playback = playbackReader.current();
      } catch {
        playback = null;
      }
      const nextPulse = activePulseFor(
        playback,
        pulsePeriod.current,
        measureOffset.current
      );
      setActivePulse(previous =>
        previous?.generation === nextPulse?.generation &&
        previous?.measureIndex === nextPulse?.measureIndex &&
        previous?.pulseIndex === nextPulse?.pulseIndex &&
        previous?.countIn === nextPulse?.countIn
          ? previous
          : nextPulse
      );
      frame = globalThis.requestAnimationFrame(sample);
    };

    if (typeof globalThis.requestAnimationFrame === "function") {
      frame = globalThis.requestAnimationFrame(sample);
    }
    return () => {
      stopped = true;
      if (frame && typeof globalThis.cancelAnimationFrame === "function")
        globalThis.cancelAnimationFrame(frame);
    };
  }, []);

  const pulses = structure.pulseStarts.map((tick, pulseIndex) => {
    const accent = structure.accentPositions.find(
      position => position.tick === tick && position.subdivisionIndex === 0
    );
    return {
      tick,
      pulseIndex,
      accent: accent?.level ?? "weak",
    } as const;
  });
  const active = activePulse !== null;
  const activeLabel = active
    ? activePulse.countIn
      ? `Đếm vào, phách ${activePulse.pulseIndex + 1}`
      : `Ô nhịp ${activePulse.measureIndex + 1}, phách ${activePulse.pulseIndex + 1}`
    : "Đang chờ phách";
  const hasCompoundGroups = structure.groups.some(size => size > 1);

  return (
    <section
      className="rhythm-metronome"
      aria-label={`Metronome nhịp ${meter.numerator}/${meter.denominator}`}
      data-testid="rhythm-metronome"
      data-active={active ? "true" : "false"}
    >
      <div className="rhythm-metronome-heading">
        <div>
          <span className="rhythm-eyebrow">THEO DÕI PHÁCH</span>
          <h3>Metronome trực quan</h3>
        </div>
        <span
          className="rhythm-metronome-position"
          role="status"
          aria-live="polite"
        >
          {activeLabel}
        </span>
      </div>
      <div
        className="rhythm-metronome-beats"
        role="img"
        aria-label={activeLabel}
      >
        {pulses.map(pulse => {
          const isActive =
            activePulse?.measureIndex !== undefined &&
            activePulse.pulseIndex === pulse.pulseIndex;
          const startsCompoundGroup =
            hasCompoundGroups &&
            pulse.pulseIndex > 0 &&
            structure.groupStarts.includes(pulse.tick);
          return (
            <div
              className={`rhythm-metronome-beat accent-${pulse.accent}${isActive ? " is-active" : ""}${startsCompoundGroup ? " is-group-start" : ""}`}
              data-testid="metronome-beat"
              data-accent={pulse.accent}
              data-pulse={pulse.pulseIndex + 1}
              data-active={isActive ? "true" : "false"}
              data-group-start={startsCompoundGroup ? "true" : "false"}
              key={pulse.tick}
            >
              <span className="rhythm-metronome-dot" aria-hidden="true" />
              <strong>{pulse.pulseIndex + 1}</strong>
            </div>
          );
        })}
      </div>
      <p className="rhythm-metronome-caption">
        Đỏ: mạnh · Vàng: vừa · Xám: nhẹ. Số trên chấm là thứ tự phách; ranh giới
        nhóm theo cấu trúc nhịp.
      </p>
    </section>
  );
}

export default VisualMetronome;

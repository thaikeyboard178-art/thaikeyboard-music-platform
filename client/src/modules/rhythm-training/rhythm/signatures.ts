import { PPQ } from "./durations";
import { deriveRhythmTimeline } from "./deriveTimeline";
import { requireValidRhythmPattern } from "./validate";

// Notation identity ignores labels, object key order and tempo, but preserves
// written note/rest values and ties. Tie IDs are canonicalized by first occurrence.
export function notationSignature(input: unknown): string {
  const pattern = requireValidRhythmPattern(input);
  const tieIds = new Map<string, number>();
  return JSON.stringify({
    version: 1,
    kind: "notation",
    ppq: PPQ,
    meter: [pattern.meter.numerator, pattern.meter.denominator],
    measures: pattern.measures.map(measure =>
      measure.segments.map(segment => {
        let tie: number | null = null;
        if (segment.tieGroupId !== undefined) {
          if (!tieIds.has(segment.tieGroupId))
            tieIds.set(segment.tieGroupId, tieIds.size);
          tie = tieIds.get(segment.tieGroupId)!;
        }
        return [
          segment.kind,
          segment.duration.denominator,
          segment.duration.dots,
          tie,
          segment.accent ?? "normal",
          segment.articulation ?? "ordinary",
        ];
      })
    ),
  });
}

// Timing identities include pulse BPM and complete length. They describe
// intended canonical timing, not measured sound or device audibility.
export function onsetSignature(input: unknown): string {
  const timeline = deriveRhythmTimeline(input);
  return JSON.stringify({
    version: 1,
    kind: "onsets",
    ppq: PPQ,
    meter: [
      timeline.pattern.meter.numerator,
      timeline.pattern.meter.denominator,
    ],
    pulseBpm: timeline.pattern.tempo.pulseBpm,
    lengthTicks: timeline.totalTicks,
    onsets: timeline.onsets,
  });
}

export function soundingSignature(input: unknown): string {
  const timeline = deriveRhythmTimeline(input);
  return JSON.stringify({
    version: 1,
    kind: "sounding",
    ppq: PPQ,
    meter: [
      timeline.pattern.meter.numerator,
      timeline.pattern.meter.denominator,
    ],
    pulseBpm: timeline.pattern.tempo.pulseBpm,
    lengthTicks: timeline.totalTicks,
    spans: timeline.soundingSpans.map(span => [
      span.startTicks,
      span.endTicks,
      span.accent,
    ]),
  });
}

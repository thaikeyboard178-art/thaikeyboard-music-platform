import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import {
  notationSignature,
  onsetSignature,
  soundingSignature,
} from "../rhythm/signatures";

export type RhythmAnswerSignatures = Readonly<{
  notation: string;
  visible: string;
  onsets: string;
  sounding: string;
  discriminationSounding: string;
}>;

// No playback is performed. These are conservative canonical identities used
// to exclude ambiguous options; device/perceptual evidence is a later phase.
export function answerSignatures(input: unknown): RhythmAnswerSignatures {
  const timeline = deriveRhythmTimeline(input);
  const visible = timeline.pattern.measures.map(measure =>
    measure.segments.map(segment => {
      const position = timeline.segments.find(
        item => item.segmentId === segment.id
      )!;
      return [
        segment.kind,
        segment.duration.denominator,
        segment.duration.dots,
        position.tieRole,
        segment.accent ?? "normal",
      ];
    })
  );
  return Object.freeze({
    notation: notationSignature(timeline.pattern),
    visible: JSON.stringify(visible),
    onsets: onsetSignature(timeline.pattern),
    sounding: soundingSignature(timeline.pattern),
    // Accent-only changes are not reliable distractors. Ignore accent even if
    // visually rendered; do not rely on a future output device's gain audibility.
    discriminationSounding: JSON.stringify(
      timeline.soundingSpans.map(span => [span.startTicks, span.endTicks])
    ),
  });
}

export type ChoiceRejection =
  | "invalid-pattern"
  | "context-mismatch"
  | "notation-equivalent"
  | "visually-equivalent"
  | "sounding-equivalent"
  | "onset-equivalent";
export type RhythmDiscrimination = "sounding" | "onsets";

export function choiceRejectionReason(
  reference: unknown,
  candidate: unknown,
  discrimination: RhythmDiscrimination = "sounding"
): ChoiceRejection | null {
  if (discrimination !== "sounding" && discrimination !== "onsets")
    throw new RangeError("Unsupported choice discrimination policy");
  try {
    const left = deriveRhythmTimeline(reference);
    const right = deriveRhythmTimeline(candidate);
    if (
      left.pattern.meter.numerator !== right.pattern.meter.numerator ||
      left.pattern.meter.denominator !== right.pattern.meter.denominator ||
      left.pattern.tempo.pulseBpm !== right.pattern.tempo.pulseBpm ||
      left.pattern.measures.length !== right.pattern.measures.length
    )
      return "context-mismatch";
    const a = answerSignatures(left.pattern);
    const b = answerSignatures(right.pattern);
    if (a.notation === b.notation) return "notation-equivalent";
    if (a.visible === b.visible) return "visually-equivalent";
    if (a.discriminationSounding === b.discriminationSounding)
      return "sounding-equivalent";
    if (discrimination === "onsets" && a.onsets === b.onsets)
      return "onset-equivalent";
    return null;
  } catch {
    return "invalid-pattern";
  }
}

export type RhythmMeter =
  | Readonly<{ numerator: 2; denominator: 4 }>
  | Readonly<{ numerator: 3; denominator: 4 }>
  | Readonly<{ numerator: 4; denominator: 4 }>
  | Readonly<{ numerator: 3; denominator: 8 }>
  | Readonly<{ numerator: 6; denominator: 8 }>
  | Readonly<{ numerator: 9; denominator: 8 }>
  | Readonly<{ numerator: 2; denominator: 2 }>;

export type WrittenDuration = Readonly<{
  denominator: 1 | 2 | 4 | 8 | 16;
  dots: 0 | 1;
}>;

export type RhythmSegment = Readonly<{
  id: string;
  kind: "note" | "rest";
  duration: WrittenDuration;
  tieGroupId?: string;
  accent?: "normal" | "strong";
  // The model names future markings, but the V1 validator accepts ordinary only.
  articulation?: "ordinary" | "staccato" | "tenuto";
}>;

export type RhythmMeasure = Readonly<{
  id: string;
  segments: readonly RhythmSegment[];
}>;

export type RhythmPattern = Readonly<{
  id: string;
  meter: RhythmMeter;
  tempo: Readonly<{ pulseBpm: number }>;
  measures: readonly RhythmMeasure[];
}>;

export type TieRole = "none" | "start" | "continue" | "end";

export type SegmentPosition = Readonly<{
  segmentId: string;
  measureId: string;
  measureIndex: number;
  segmentIndex: number;
  kind: "note" | "rest";
  durationTicks: number;
  absoluteStartTicks: number;
  absoluteEndTicks: number;
  measureOffsetTicks: number;
  pulseIndex: number;
  pulseOffsetTicks: number;
  subdivisionIndex: number;
  subdivisionTicks: number;
  isOnset: boolean;
  tieRole: TieRole;
  tieGroupId?: string;
  accent: "normal" | "strong";
}>;

export type SoundingSpan = Readonly<{
  startTicks: number;
  endTicks: number;
  segmentIds: readonly string[];
  tieGroupId?: string;
  accent: "normal" | "strong";
}>;

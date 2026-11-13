import type { RhythmSegment, WrittenDuration } from "../types";

export const PPQ = 480;

const BASE_TICKS: Readonly<Record<WrittenDuration["denominator"], number>> = {
  1: PPQ * 4,
  2: PPQ * 2,
  4: PPQ,
  8: PPQ / 2,
  16: PPQ / 4,
};

function isDurationRecord(value: unknown): value is {
  denominator: unknown;
  dots: unknown;
} {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function durationToTicks(duration: WrittenDuration): number {
  if (!isDurationRecord(duration)) {
    throw new RangeError(
      "Duration must be an object with a supported denominator and dot count."
    );
  }

  const { denominator, dots } = duration;
  if (
    typeof denominator !== "number" ||
    !Number.isFinite(denominator) ||
    !Object.prototype.hasOwnProperty.call(BASE_TICKS, denominator)
  ) {
    throw new RangeError("Unsupported duration denominator.");
  }

  if (dots !== 0 && dots !== 1) {
    throw new RangeError("Only zero or one dot is supported.");
  }

  if (
    dots === 1 &&
    denominator !== 2 &&
    denominator !== 4 &&
    denominator !== 8
  ) {
    throw new RangeError("This dotted duration is not supported in V1.");
  }

  const baseTicks = BASE_TICKS[denominator as WrittenDuration["denominator"]];
  const ticks = dots === 1 ? baseTicks + baseTicks / 2 : baseTicks;
  if (!Number.isSafeInteger(ticks) || ticks <= 0) {
    throw new RangeError(
      "Duration does not produce a positive safe integer tick count."
    );
  }

  return ticks;
}

/** Resolve the sounding/written occupancy of one canonical segment. */
export function segmentDurationToTicks(
  segment: Pick<RhythmSegment, "duration" | "tupletGroup">
): number {
  const writtenTicks = durationToTicks(segment.duration);
  const group = segment.tupletGroup;
  if (group === undefined) return writtenTicks;
  if (group.actualNotes !== 3 || group.normalNotes !== 2) {
    throw new RangeError("Only canonical 3:2 tuplets are supported.");
  }
  if (
    segment.duration.dots !== 0 ||
    (segment.duration.denominator !== 4 && segment.duration.denominator !== 8)
  ) {
    throw new RangeError(
      "A 3:2 tuplet member must be an undotted quarter or eighth note."
    );
  }
  const ticks = (writtenTicks * group.normalNotes) / group.actualNotes;
  if (!Number.isSafeInteger(ticks) || ticks <= 0) {
    throw new RangeError("Tuplet duration must resolve to safe integer ticks.");
  }
  return ticks;
}

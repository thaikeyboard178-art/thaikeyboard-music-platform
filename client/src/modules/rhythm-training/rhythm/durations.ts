import type { WrittenDuration } from "../types";

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

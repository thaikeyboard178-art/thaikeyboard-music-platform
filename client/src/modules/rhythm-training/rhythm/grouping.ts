import type { RhythmMeter } from "../types";
import { deriveMeter } from "./meters";

export type RhythmGroupBounds = Readonly<{
  startTicks: number;
  endTicks: number;
}>;

/**
 * Return the existing structural group containing a measure-local offset for
 * 6/8 and 9/8. Other meters keep their current unrestricted segment policy.
 */
export function compoundGroupAt(
  meter: RhythmMeter,
  offsetTicks: number
): RhythmGroupBounds | undefined {
  if (
    meter.denominator !== 8 ||
    (meter.numerator !== 6 && meter.numerator !== 9)
  ) {
    return undefined;
  }
  const info = deriveMeter(meter);
  if (offsetTicks < 0 || offsetTicks >= info.measureTicks) return undefined;
  const startIndex = info.groupStarts.findLastIndex(
    start => start <= offsetTicks
  );
  if (startIndex < 0) return undefined;
  return Object.freeze({
    startTicks: info.groupStarts[startIndex],
    endTicks: info.groupStarts[startIndex + 1] ?? info.measureTicks,
  });
}

/** A written component in 6/8 or 9/8 must fit wholly inside one 3-eighth group. */
export function segmentFitsCompoundGroup(
  meter: RhythmMeter,
  startTicks: number,
  durationTicks: number
): boolean {
  const group = compoundGroupAt(meter, startTicks);
  return (
    group === undefined ||
    (durationTicks > 0 && startTicks + durationTicks <= group.endTicks)
  );
}

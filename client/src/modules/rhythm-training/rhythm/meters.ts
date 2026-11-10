import type { RhythmMeter } from "../types";
import { PPQ } from "./durations";

export type MeterInfo = Readonly<{
  meter: RhythmMeter;
  measureTicks: number;
  pulseTicks: number;
  pulseCount: number;
  pulseStarts: readonly number[];
  groups: readonly number[];
  pulseUnit: Readonly<{ denominator: 4; dots: 0 | 1 }>;
}>;

type MeterShape = {
  numerator: unknown;
  denominator: unknown;
};

function isMeterRecord(value: unknown): value is MeterShape {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function meterDefinition(meter: RhythmMeter): Omit<MeterInfo, "meter"> {
  if (
    meter.denominator === 4 &&
    (meter.numerator === 2 || meter.numerator === 3 || meter.numerator === 4)
  ) {
    const pulseCount = meter.numerator;
    return {
      measureTicks: pulseCount * PPQ,
      pulseTicks: PPQ,
      pulseCount,
      pulseStarts: Array.from(
        { length: pulseCount },
        (_, index) => index * PPQ
      ),
      groups: Array.from({ length: pulseCount }, () => 1),
      pulseUnit: { denominator: 4, dots: 0 },
    };
  }

  if (meter.denominator === 8 && meter.numerator === 6) {
    return {
      measureTicks: (6 * PPQ) / 2,
      pulseTicks: (3 * PPQ) / 2,
      pulseCount: 2,
      pulseStarts: [0, (3 * PPQ) / 2],
      groups: [3, 3],
      pulseUnit: { denominator: 4, dots: 1 },
    };
  }

  throw new RangeError("Unsupported rhythm meter.");
}

export function deriveMeter(meter: RhythmMeter): MeterInfo {
  if (!isMeterRecord(meter)) {
    throw new RangeError(
      "Meter must be an object with a supported numerator and denominator."
    );
  }

  const { numerator, denominator } = meter;
  if (
    typeof numerator !== "number" ||
    !Number.isFinite(numerator) ||
    typeof denominator !== "number" ||
    !Number.isFinite(denominator)
  ) {
    throw new RangeError(
      "Meter numerator and denominator must be finite numbers."
    );
  }

  const sourceMeter = { numerator, denominator } as RhythmMeter;
  const definition = meterDefinition(sourceMeter);
  const copiedMeter = Object.freeze({ numerator, denominator }) as RhythmMeter;
  const pulseStarts = Object.freeze([...definition.pulseStarts]);
  const groups = Object.freeze([...definition.groups]);
  const pulseUnit = Object.freeze({
    denominator: definition.pulseUnit.denominator,
    dots: definition.pulseUnit.dots,
  }) as Readonly<{ denominator: 4; dots: 0 | 1 }>;

  return Object.freeze({
    meter: copiedMeter,
    measureTicks: definition.measureTicks,
    pulseTicks: definition.pulseTicks,
    pulseCount: definition.pulseCount,
    pulseStarts,
    groups,
    pulseUnit,
  });
}

export function ticksToSeconds(
  ticks: number,
  meter: RhythmMeter,
  pulseBpm: number
): number {
  if (!Number.isSafeInteger(ticks) || ticks < 0) {
    throw new RangeError("Ticks must be a nonnegative safe integer.");
  }
  if (
    typeof pulseBpm !== "number" ||
    !Number.isFinite(pulseBpm) ||
    pulseBpm <= 0
  ) {
    throw new RangeError("Pulse BPM must be a finite positive number.");
  }

  const { pulseTicks } = deriveMeter(meter);
  const seconds = (ticks / pulseTicks) * (60 / pulseBpm);
  if (!Number.isFinite(seconds)) {
    throw new RangeError("Tick conversion produced a non-finite result.");
  }

  return seconds;
}

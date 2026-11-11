import type { RhythmMeter, RhythmPattern, RhythmSegment } from "../types";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import { durationToTicks } from "../rhythm/durations";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import {
  mixedRuntimePattern,
  SEVEN_METER_RUNTIME_FIXTURES,
} from "../runtime/fixtures";

/**
 * Offline deterministic pilot only. This is not a production matcher, evaluator,
 * capture API, scoring integration, or public Rhythm Training export.
 */
export type PilotToleranceCandidate = Readonly<{
  id: string;
  model: "T1" | "T2";
  density: "fixed-ms" | "legal-grid" | "actual-local";
  passCapMs: number;
  associationCapMs: number;
  alpha?: number;
  beta?: number;
  earlyScale: number;
  lateScale: number;
}>;

export type PilotTap = Readonly<{
  /** Distinct native events remain distinct even when timestamps collide. */
  nativeEventId: string;
  timestampSeconds: number;
  validPhysicalEvent: boolean;
}>;

export type PilotWindow = Readonly<{
  earlyPassSeconds: number;
  latePassSeconds: number;
  earlyAssociationSeconds: number;
  lateAssociationSeconds: number;
}>;

export type PilotCounts = Readonly<{
  tp: number;
  missing: number;
  extra: number;
  nearMiss: number;
  n: number;
  k: number;
  accuracyPercent: number | null;
  technicalAbort: boolean;
  targetStatuses: readonly string[];
  tapStatuses: readonly string[];
}>;

export type PilotTempo = "slow" | "medium" | "fast";

const t1Candidates: PilotToleranceCandidate[] = [50, 75, 100].map(ms => ({
  id: `T1-${ms}ms`,
  model: "T1",
  density: "fixed-ms",
  passCapMs: ms,
  associationCapMs: ms * 2,
  earlyScale: 1,
  lateScale: 1,
}));

const t2Bases = [
  {
    id: "A-conservative",
    alpha: 0.2,
    beta: 0.35,
    passCapMs: 35,
    associationCapMs: 70,
  },
  {
    id: "B-balanced",
    alpha: 0.3,
    beta: 0.4,
    passCapMs: 50,
    associationCapMs: 80,
  },
  {
    id: "C-wider",
    alpha: 0.4,
    beta: 0.45,
    passCapMs: 70,
    associationCapMs: 100,
  },
] as const;

const t2Candidates: PilotToleranceCandidate[] = t2Bases.flatMap(base => {
  const densityCandidates: PilotToleranceCandidate[] = (
    ["legal-grid", "actual-local"] as const
  ).map(density => ({
    ...base,
    id: `T2-${base.id}-${density}`,
    model: "T2",
    density,
    earlyScale: 1,
    lateScale: 1,
  }));
  if (base.id === "B-balanced") {
    densityCandidates.push({
      ...base,
      id: "T2-B-balanced-actual-local-asymmetric",
      model: "T2",
      density: "actual-local",
      earlyScale: 0.75,
      lateScale: 1.1,
    });
  }
  return densityCandidates;
});

/** Candidate values are pilot inputs only and are not production defaults. */
export const PILOT_CANDIDATES: readonly PilotToleranceCandidate[] =
  Object.freeze(
    [...t1Candidates, ...t2Candidates].map(candidate =>
      Object.freeze(candidate)
    )
  );

export type PilotMeterCase = Readonly<{
  name: string;
  meter: RhythmMeter;
  slowBpm: number;
  mediumBpm: number;
  fastBpm: number;
  legalGridTicks: number;
}>;

/** Pulse BPM follows each meter's actual quarter/eighth/dotted-quarter/half pulse. */
export const PILOT_METERS: readonly PilotMeterCase[] = Object.freeze(
  SEVEN_METER_RUNTIME_FIXTURES.map(fixture => {
    const compoundGrouping = fixture.pattern.meter.denominator === 8;
    const allaBreve =
      fixture.pattern.meter.numerator === 2 &&
      fixture.pattern.meter.denominator === 2;
    return Object.freeze({
      name: fixture.name,
      meter: fixture.pattern.meter,
      slowBpm: compoundGrouping || allaBreve ? 40 : 50,
      mediumBpm: compoundGrouping || allaBreve ? 56 : 79,
      fastBpm: compoundGrouping || allaBreve ? 72 : 108,
      // Level 5 permits sixteenths in simple meters; Level 6/Bonus remain eighth-grid.
      legalGridTicks: compoundGrouping || allaBreve ? 240 : 120,
    });
  })
);

function durationForTicks(ticks: number) {
  const values = [
    { denominator: 16 as const, dots: 0 as const },
    { denominator: 8 as const, dots: 0 as const },
    { denominator: 4 as const, dots: 0 as const },
    { denominator: 2 as const, dots: 0 as const },
    { denominator: 8 as const, dots: 1 as const },
    { denominator: 4 as const, dots: 1 as const },
    { denominator: 2 as const, dots: 1 as const },
  ];
  const found = values.find(value => durationToTicks(value) === ticks);
  if (!found)
    throw new RangeError(`No canonical written duration for ${ticks} ticks.`);
  return found;
}

function completePattern(
  id: string,
  meter: RhythmMeter,
  bars: readonly (readonly Readonly<{
    ticks: number;
    rest?: boolean;
    tie?: string;
  }>[])[],
  pulseBpm: number
): RhythmPattern {
  const measures = bars.map((items, barIndex) => ({
    id: `${id}-bar-${barIndex + 1}`,
    segments: items.map(
      (item, segmentIndex): RhythmSegment => ({
        id: `${id}-bar-${barIndex + 1}-segment-${segmentIndex + 1}`,
        kind: item.rest ? "rest" : "note",
        duration: durationForTicks(item.ticks),
        ...(item.tie ? { tieGroupId: item.tie } : {}),
      })
    ),
  }));
  return { id, meter, tempo: { pulseBpm }, measures };
}

/** Sparse two-bar canonical pattern, alternating pulse notes and rests. */
export function sparsePilotPattern(
  meter: RhythmMeter,
  pulseBpm: number
): RhythmPattern {
  const info = deriveMeter(meter);
  const makeBar = (barIndex: number) =>
    info.pulseStarts.map((_, pulseIndex) => ({
      ticks: info.pulseTicks,
      rest: (pulseIndex + barIndex) % 2 === 1,
    }));
  return completePattern(
    "pilot-sparse",
    meter,
    [makeBar(0), makeBar(1)],
    pulseBpm
  );
}

/** Dense two-bar pattern using the current track's legal grid for this meter. */
export function densePilotPattern(
  meter: RhythmMeter,
  pulseBpm: number,
  gridTicks: number
): RhythmPattern {
  const info = deriveMeter(meter);
  if (info.measureTicks % gridTicks !== 0)
    throw new RangeError("Grid must divide bar capacity.");
  const makeBar = () =>
    Array.from({ length: info.measureTicks / gridTicks }, () => ({
      ticks: gridTicks,
    }));
  return completePattern(
    "pilot-dense",
    meter,
    [makeBar(), makeBar()],
    pulseBpm
  );
}

/**
 * Build actual onset coordinates only through production validator/timeline.
 * Pattern mixes dotted-eighth + sixteenth, rest, and a cross-bar tie. For Level 6
 * meters, this is a canonical stress fixture, not a claim that Level 6 teaches
 * sixteenths or dotted-eighths.
 */
export function pilotOnsets(
  pattern: RhythmPattern,
  gridTicks = 120
): readonly number[] {
  return deriveRhythmTimeline(pattern, gridTicks).onsets;
}

export function mixedPilotOnsets(
  fixtureIndex: number,
  pulseBpm: number
): readonly number[] {
  const fixture = SEVEN_METER_RUNTIME_FIXTURES[fixtureIndex];
  if (!fixture) throw new RangeError("Unknown seven-meter pilot fixture.");
  const pattern = { ...mixedRuntimePattern(fixture), tempo: { pulseBpm } };
  return pilotOnsets(pattern, 120);
}

export function tempoBpmFor(
  meterCase: PilotMeterCase,
  tempo: PilotTempo
): number {
  if (tempo === "slow") return meterCase.slowBpm;
  if (tempo === "medium") return meterCase.mediumBpm;
  return meterCase.fastBpm;
}

function adjacentGaps(onsetsSeconds: readonly number[], index: number) {
  const gaps: number[] = [];
  if (index > 0) {
    const gap = onsetsSeconds[index] - onsetsSeconds[index - 1];
    if (gap > 0) gaps.push(gap);
  }
  if (index + 1 < onsetsSeconds.length) {
    const gap = onsetsSeconds[index + 1] - onsetsSeconds[index];
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
}

export function pilotWindows(
  candidate: PilotToleranceCandidate,
  meter: RhythmMeter,
  pulseBpm: number,
  gridTicks: number,
  onsetTicks: readonly number[]
): readonly PilotWindow[] {
  const info = deriveMeter(meter);
  const gridSeconds = ticksToSeconds(gridTicks, meter, pulseBpm);
  const onsetSeconds = onsetTicks.map(tick =>
    ticksToSeconds(tick, meter, pulseBpm)
  );
  return Object.freeze(
    onsetSeconds.map((_, index) => {
      if (candidate.model === "T1") {
        return Object.freeze({
          earlyPassSeconds: candidate.passCapMs / 1000,
          latePassSeconds: candidate.passCapMs / 1000,
          earlyAssociationSeconds: candidate.associationCapMs / 1000,
          lateAssociationSeconds: candidate.associationCapMs / 1000,
        });
      }
      if (
        !candidate.alpha ||
        !candidate.beta ||
        !(
          candidate.alpha > 0 &&
          candidate.alpha <= candidate.beta &&
          candidate.beta < 0.5
        )
      ) {
        throw new RangeError("T2 requires 0 < alpha <= beta < 1/2.");
      }
      const gaps = adjacentGaps(onsetSeconds, index);
      // Legal-grid mode uses S; actual-local mode caps S by the nearest observed
      // neighboring onset gap. Long rests therefore never widen G beyond S.
      const g =
        candidate.density === "legal-grid" || gaps.length === 0
          ? gridSeconds
          : Math.min(gridSeconds, ...gaps);
      const passBase = candidate.alpha * g;
      const associationBase = candidate.beta * g;
      const passCap = candidate.passCapMs / 1000;
      const associationCap = candidate.associationCapMs / 1000;
      const makeSide = (scale: number) => ({
        pass: Math.min(passCap, passBase * scale),
        association: Math.min(associationCap, associationBase * scale),
      });
      const early = makeSide(candidate.earlyScale);
      const late = makeSide(candidate.lateScale);
      if (early.pass > early.association || late.pass > late.association) {
        throw new RangeError(
          "Pass window cannot exceed its association window."
        );
      }
      // Keep `info` in the path to make explicit that the production meter pulse
      // definition, not denominator arithmetic, governs the interval conversion.
      if (info.pulseTicks <= 0) throw new RangeError("Unsupported pulse unit.");
      return Object.freeze({
        earlyPassSeconds: early.pass,
        latePassSeconds: late.pass,
        earlyAssociationSeconds: early.association,
        lateAssociationSeconds: late.association,
      });
    })
  );
}

type Pair = Readonly<{
  target: number;
  tap: number;
  status: "matched" | "early" | "late";
  error: number;
}>;
type Alignment = Readonly<{
  pairs: readonly Pair[];
  missingTargets: readonly number[];
  extraTaps: readonly number[];
}>;

// The pilot treats window edges as inclusive; this tiny guard only counters
// IEEE-754 representation error and is not a production threshold.
const pilotAtOrInsideWindow = (
  absoluteErrorSeconds: number,
  windowSeconds: number
) => absoluteErrorSeconds <= windowSeconds + 1e-12;

function candidateIsBetter(candidate: Alignment, incumbent: Alignment) {
  const quality = (alignment: Alignment) => ({
    pass: alignment.pairs.filter(pair => pair.status === "matched").length,
    assoc: alignment.pairs.length,
    error: alignment.pairs.reduce((sum, pair) => sum + Math.abs(pair.error), 0),
  });
  const a = quality(candidate);
  const b = quality(incumbent);
  if (a.pass !== b.pass) return a.pass > b.pass;
  if (a.assoc !== b.assoc) return a.assoc > b.assoc;
  if (a.error !== b.error) return a.error < b.error;
  for (
    let index = 0;
    index < Math.min(candidate.pairs.length, incumbent.pairs.length);
    index++
  ) {
    const ap = candidate.pairs[index];
    const bp = incumbent.pairs[index];
    if (ap.target !== bp.target) return ap.target < bp.target;
    if (ap.tap !== bp.tap) return ap.tap < bp.tap;
  }
  return false;
}

/** Deliberately small, deterministic pilot-only sequence aligner. */
function alignPilot(
  onsets: readonly number[],
  taps: readonly PilotTap[],
  windows: readonly PilotWindow[]
): Alignment {
  const memo = new Map<string, Alignment>();
  const solve = (targetIndex: number, tapIndex: number): Alignment => {
    const key = `${targetIndex}:${tapIndex}`;
    const cached = memo.get(key);
    if (cached) return cached;
    if (targetIndex >= onsets.length) {
      const result = Object.freeze({
        pairs: Object.freeze([]),
        missingTargets: Object.freeze([]),
        extraTaps: Object.freeze(
          Array.from({ length: taps.length - tapIndex }, (_, i) => tapIndex + i)
        ),
      });
      memo.set(key, result);
      return result;
    }
    if (tapIndex >= taps.length) {
      const result = Object.freeze({
        pairs: Object.freeze([]),
        missingTargets: Object.freeze(
          Array.from(
            { length: onsets.length - targetIndex },
            (_, i) => targetIndex + i
          )
        ),
        extraTaps: Object.freeze([]),
      });
      memo.set(key, result);
      return result;
    }
    const options: Alignment[] = [];
    const skippedTarget = solve(targetIndex + 1, tapIndex);
    options.push(
      Object.freeze({
        ...skippedTarget,
        missingTargets: Object.freeze([
          targetIndex,
          ...skippedTarget.missingTargets,
        ]),
      })
    );
    const skippedTap = solve(targetIndex, tapIndex + 1);
    options.push(
      Object.freeze({
        ...skippedTap,
        extraTaps: Object.freeze([tapIndex, ...skippedTap.extraTaps]),
      })
    );
    const error = taps[tapIndex].timestampSeconds - onsets[targetIndex];
    const window = windows[targetIndex];
    const association =
      error < 0
        ? window.earlyAssociationSeconds
        : window.lateAssociationSeconds;
    if (pilotAtOrInsideWindow(Math.abs(error), association)) {
      const matched = solve(targetIndex + 1, tapIndex + 1);
      const pass = error < 0 ? window.earlyPassSeconds : window.latePassSeconds;
      const pair: Pair = Object.freeze({
        target: targetIndex,
        tap: tapIndex,
        status: pilotAtOrInsideWindow(Math.abs(error), pass)
          ? "matched"
          : error < 0
            ? "early"
            : "late",
        error,
      });
      options.push(
        Object.freeze({
          pairs: Object.freeze([pair, ...matched.pairs]),
          missingTargets: matched.missingTargets,
          extraTaps: matched.extraTaps,
        })
      );
    }
    let best = options[0];
    for (const option of options.slice(1)) {
      if (candidateIsBetter(option, best)) best = option;
    }
    memo.set(key, best);
    return best;
  };
  return solve(0, 0);
}

/** Deduplicate repeated delivery of one native event; never dedupe distinct physical downs by timestamp. */
export function deduplicateSoftwareDelivery(
  taps: readonly PilotTap[]
): readonly PilotTap[] {
  const seen = new Set<string>();
  const result: PilotTap[] = [];
  for (const tap of taps) {
    if (!tap.validPhysicalEvent || seen.has(tap.nativeEventId)) continue;
    seen.add(tap.nativeEventId);
    result.push(tap);
  }
  return Object.freeze(result);
}

export function evaluatePilotScenario(
  input: Readonly<{
    candidate: PilotToleranceCandidate;
    meter: RhythmMeter;
    pulseBpm: number;
    gridTicks: number;
    onsetTicks: readonly number[];
    taps: readonly PilotTap[];
    technicalAbort?: boolean;
  }>
): PilotCounts {
  const acceptedTaps = deduplicateSoftwareDelivery(input.taps);
  if (acceptedTaps.some(tap => !Number.isFinite(tap.timestampSeconds)))
    throw new RangeError("Pilot timestamps must be finite.");
  if (input.onsetTicks.length === 0) {
    return Object.freeze({
      tp: 0,
      missing: 0,
      extra: acceptedTaps.length,
      nearMiss: 0,
      n: 0,
      k: acceptedTaps.length,
      accuracyPercent: null,
      technicalAbort: input.technicalAbort ?? false,
      targetStatuses: Object.freeze([]),
      tapStatuses: Object.freeze(acceptedTaps.map(() => "extra")),
    });
  }
  const onsets = input.onsetTicks.map(tick =>
    ticksToSeconds(tick, input.meter, input.pulseBpm)
  );
  const windows = pilotWindows(
    input.candidate,
    input.meter,
    input.pulseBpm,
    input.gridTicks,
    input.onsetTicks
  );
  const alignment = alignPilot(onsets, acceptedTaps, windows);
  const targetStatuses = Array.from({ length: onsets.length }, () => "missing");
  const tapStatuses = Array.from(
    { length: acceptedTaps.length },
    () => "extra"
  );
  for (const pair of alignment.pairs) {
    targetStatuses[pair.target] = pair.status;
    tapStatuses[pair.tap] = pair.status;
  }
  const tp = alignment.pairs.filter(pair => pair.status === "matched").length;
  const nearMiss = alignment.pairs.filter(
    pair => pair.status === "early" || pair.status === "late"
  ).length;
  const missing = alignment.missingTargets.length;
  const extra = alignment.extraTaps.length;
  const n = onsets.length;
  const k = acceptedTaps.length;
  const technicalAbort = input.technicalAbort ?? false;
  const accuracyPercent =
    technicalAbort || n + k === 0 ? null : (200 * tp) / (n + k);
  return Object.freeze({
    tp,
    missing,
    extra,
    nearMiss,
    n,
    k,
    accuracyPercent,
    technicalAbort,
    targetStatuses: Object.freeze(targetStatuses),
    tapStatuses: Object.freeze(tapStatuses),
  });
}

export function countOverlappingAssociationWindows(
  onsetTicks: readonly number[],
  meter: RhythmMeter,
  pulseBpm: number,
  gridTicks: number,
  candidate: PilotToleranceCandidate
): number {
  const onsets = onsetTicks.map(tick => ticksToSeconds(tick, meter, pulseBpm));
  const windows = pilotWindows(
    candidate,
    meter,
    pulseBpm,
    gridTicks,
    onsetTicks
  );
  let overlaps = 0;
  for (let i = 0; i + 1 < onsets.length; i++) {
    if (
      windows[i].lateAssociationSeconds +
        windows[i + 1].earlyAssociationSeconds >=
      onsets[i + 1] - onsets[i]
    )
      overlaps++;
  }
  return overlaps;
}

export type PilotScenarioSummary = Readonly<{
  candidate: string;
  model: "T1" | "T2";
  density: string;
  meter: string;
  tempo: PilotTempo;
  pulseBpm: number;
  pattern: "sparse" | "dense" | "mixed-stress";
  expectedOnsets: number;
  tp: number;
  missing: number;
  extra: number;
  nearMiss: number;
  formulaBPercent: number | null;
  exactFormulaBPercent: number | null;
  fixedErrorProbes: Readonly<
    Record<
      string,
      Readonly<{
        status: string;
        tp: number;
        missing: number;
        extra: number;
        nearMiss: number;
        formulaBPercent: number | null;
      }>
    >
  >;
  correctClassifications: number;
  testedClassifications: number;
  classificationRate: number;
  scenarioRates: Readonly<
    Record<string, Readonly<{ correct: number; tested: number; rate: number }>>
  >;
  midpointOverlaps: number;
  midpointAssigned: number;
  associationOverlaps: number;
  actualVsLegalEqualWindowCount: number;
}>;

function tap(id: string, seconds: number): PilotTap {
  return {
    nativeEventId: id,
    timestampSeconds: seconds,
    validPhysicalEvent: true,
  };
}

function scenarioClassificationCount(
  candidate: PilotToleranceCandidate,
  meter: RhythmMeter,
  bpm: number,
  gridTicks: number,
  onsetTicks: readonly number[]
) {
  const onsets = onsetTicks.map(tick => ticksToSeconds(tick, meter, bpm));
  const windows = pilotWindows(candidate, meter, bpm, gridTicks, onsetTicks);
  if (!onsets.length)
    return {
      correct: 0,
      total: 0,
      scenarioRates: {},
      midpointOverlaps: 0,
      midpointAssigned: 0,
    };
  const scenarioCounts = new Map<string, { correct: number; tested: number }>();
  const measure = (scenario: string, expected: string, observed: string) => {
    const count = scenarioCounts.get(scenario) ?? { correct: 0, tested: 0 };
    count.tested++;
    if (expected === observed) count.correct++;
    scenarioCounts.set(scenario, count);
  };
  const exact = onsets.map((time, index) => tap(`exact-${index}`, time));
  const exactResult = evaluatePilotScenario({
    candidate,
    meter,
    pulseBpm: bpm,
    gridTicks,
    onsetTicks,
    taps: exact,
  });
  for (const status of exactResult.targetStatuses)
    measure("exact", "matched", status);

  // Exercise boundary and interior targets without replaying every class at
  // every dense onset; exact matching still covers all targets in each row.
  const probeIndices = [
    ...new Set([0, Math.floor((onsets.length - 1) / 2), onsets.length - 1]),
  ];
  for (const i of probeIndices) {
    for (const direction of ["early", "late"] as const) {
      const widthPass =
        direction === "early"
          ? windows[i].earlyPassSeconds
          : windows[i].latePassSeconds;
      const nearAssoc =
        direction === "early"
          ? windows[i].earlyAssociationSeconds
          : windows[i].lateAssociationSeconds;
      const withinDelta = widthPass * 0.75;
      const nearDelta = widthPass + (nearAssoc - widthPass) / 2;
      const sign = direction === "early" ? -1 : 1;
      for (const [label, delta, expected] of [
        ["within", withinDelta, "matched"],
        ["near", nearDelta, direction],
      ] as const) {
        const taps = exact.map((entry, index) =>
          tap(
            entry.nativeEventId,
            index === i ? onsets[index] + sign * delta : entry.timestampSeconds
          )
        );
        const result = evaluatePilotScenario({
          candidate,
          meter,
          pulseBpm: bpm,
          gridTicks,
          onsetTicks,
          taps,
        });
        measure(`${direction}-${label}`, expected, result.targetStatuses[i]);
      }
    }
    const missingTaps = exact.filter((_, index) => index !== i);
    const missingResult = evaluatePilotScenario({
      candidate,
      meter,
      pulseBpm: bpm,
      gridTicks,
      onsetTicks,
      taps: missingTaps,
    });
    measure("missing", "missing", missingResult.targetStatuses[i]);

    const physicalDouble = [...exact, tap(`physical-double-${i}`, onsets[i])];
    const doubleResult = evaluatePilotScenario({
      candidate,
      meter,
      pulseBpm: bpm,
      gridTicks,
      onsetTicks,
      taps: physicalDouble,
    });
    measure("physical-double", "1-extra", `${doubleResult.extra}-extra`);

    const softwareDup = [...exact, tap(exact[i].nativeEventId, onsets[i])];
    const duplicateResult = evaluatePilotScenario({
      candidate,
      meter,
      pulseBpm: bpm,
      gridTicks,
      onsetTicks,
      taps: softwareDup,
    });
    measure("software-duplicate", "0-extra", `${duplicateResult.extra}-extra`);
  }

  const farExtraTime =
    onsets[onsets.length - 1] +
    windows[windows.length - 1].lateAssociationSeconds +
    ticksToSeconds(gridTicks, meter, bpm) * 0.1;
  const extraResult = evaluatePilotScenario({
    candidate,
    meter,
    pulseBpm: bpm,
    gridTicks,
    onsetTicks,
    taps: [...exact, tap("far-extra", farExtraTime)],
  });
  measure("extra", "1-extra", `${extraResult.extra}-extra`);

  let midpointOverlaps = 0;
  let midpointAssigned = 0;
  if (onsets.length >= 2) {
    const gap = onsets[1] - onsets[0];
    const midpoint = (onsets[0] + onsets[1]) / 2;
    if (
      windows[0].lateAssociationSeconds + windows[1].earlyAssociationSeconds >=
      gap
    )
      midpointOverlaps++;
    const restExact = exact.slice(2);
    const midpointResult = evaluatePilotScenario({
      candidate,
      meter,
      pulseBpm: bpm,
      gridTicks,
      onsetTicks,
      taps: [tap("midpoint", midpoint), ...restExact],
    });
    // A midpoint is deliberately a diagnostic/ambiguous probe, not a labeled correct class.
    if (
      midpointResult.targetStatuses
        .slice(0, 2)
        .some(status => status !== "missing")
    )
      midpointAssigned++;
  }
  const scenarioRates = Object.fromEntries(
    [...scenarioCounts.entries()].map(([name, count]) => [
      name,
      Object.freeze({
        ...count,
        rate: count.tested ? count.correct / count.tested : 0,
      }),
    ])
  );
  const correct = [...scenarioCounts.values()].reduce(
    (sum, count) => sum + count.correct,
    0
  );
  const total = [...scenarioCounts.values()].reduce(
    (sum, count) => sum + count.tested,
    0
  );
  return {
    correct,
    total,
    scenarioRates: Object.freeze(scenarioRates),
    midpointOverlaps,
    midpointAssigned,
  };
}

/** Full deterministic matrix: 10 candidates × 7 meters × 3 tempos × 3 patterns. */
export function runPilotMatrix(): readonly PilotScenarioSummary[] {
  const rows: PilotScenarioSummary[] = [];
  for (const [fixtureIndex, meterCase] of PILOT_METERS.entries()) {
    const info = deriveMeter(meterCase.meter);
    for (const tempo of ["slow", "medium", "fast"] as const) {
      const pulseBpm = tempoBpmFor(meterCase, tempo);
      const patterns = [
        {
          name: "sparse" as const,
          onsets: pilotOnsets(sparsePilotPattern(meterCase.meter, pulseBpm)),
        },
        {
          name: "dense" as const,
          onsets: pilotOnsets(
            densePilotPattern(
              meterCase.meter,
              pulseBpm,
              meterCase.legalGridTicks
            )
          ),
        },
        {
          name: "mixed-stress" as const,
          onsets: mixedPilotOnsets(fixtureIndex, pulseBpm),
        },
      ];
      for (const pattern of patterns) {
        for (const candidate of PILOT_CANDIDATES) {
          const gridTicks = meterCase.legalGridTicks;
          const onsetsSeconds = pattern.onsets.map(tick =>
            ticksToSeconds(tick, meterCase.meter, pulseBpm)
          );
          const windows = pilotWindows(
            candidate,
            meterCase.meter,
            pulseBpm,
            gridTicks,
            pattern.onsets
          );
          const classification = scenarioClassificationCount(
            candidate,
            meterCase.meter,
            pulseBpm,
            gridTicks,
            pattern.onsets
          );
          const exactTaps = onsetsSeconds.map((time, index) =>
            tap(`row-${index}`, time)
          );
          const exactCounts = evaluatePilotScenario({
            candidate,
            meter: meterCase.meter,
            pulseBpm,
            gridTicks,
            onsetTicks: pattern.onsets,
            taps: exactTaps,
          });
          const focus = Math.floor(pattern.onsets.length / 2);
          const missingIndex =
            focus === pattern.onsets.length - 1 ? 0 : pattern.onsets.length - 1;
          const nearDelta =
            (windows[focus].latePassSeconds +
              windows[focus].lateAssociationSeconds) /
            2;
          const compositeTaps = exactTaps
            .filter((_, index) => index !== missingIndex)
            .map((event, index) => {
              const originalIndex = index >= missingIndex ? index + 1 : index;
              return originalIndex === focus
                ? tap(
                    event.nativeEventId,
                    onsetsSeconds[originalIndex] + nearDelta
                  )
                : event;
            });
          const lastOnset = onsetsSeconds[onsetsSeconds.length - 1];
          const compositeExtraTime =
            lastOnset +
            windows[windows.length - 1].lateAssociationSeconds +
            ticksToSeconds(gridTicks, meterCase.meter, pulseBpm) * 0.1;
          compositeTaps.push(tap("composite-extra", compositeExtraTime));
          const compositeCounts = evaluatePilotScenario({
            candidate,
            meter: meterCase.meter,
            pulseBpm,
            gridTicks,
            onsetTicks: pattern.onsets,
            taps: compositeTaps,
          });
          const fixedErrorProbes = Object.fromEntries(
            [20, 45, 80, 120].map(errorMs => {
              const focusIndex = Math.floor(pattern.onsets.length / 2);
              const shiftedTaps = exactTaps.map((event, index) =>
                index === focusIndex
                  ? tap(
                      event.nativeEventId,
                      onsetsSeconds[index] + errorMs / 1000
                    )
                  : event
              );
              const result = evaluatePilotScenario({
                candidate,
                meter: meterCase.meter,
                pulseBpm,
                gridTicks,
                onsetTicks: pattern.onsets,
                taps: shiftedTaps,
              });
              return [
                `${errorMs}ms`,
                Object.freeze({
                  status: result.targetStatuses[focusIndex],
                  tp: result.tp,
                  missing: result.missing,
                  extra: result.extra,
                  nearMiss: result.nearMiss,
                  formulaBPercent: result.accuracyPercent,
                }),
              ];
            })
          );
          const legalCandidate =
            candidate.model === "T2"
              ? { ...candidate, density: "legal-grid" as const }
              : candidate;
          const legalWindows = pilotWindows(
            legalCandidate,
            meterCase.meter,
            pulseBpm,
            gridTicks,
            pattern.onsets
          );
          const actualVsLegalEqualWindowCount = windows.reduce(
            (count, window, index) => {
              const legal = legalWindows[index];
              return (
                count +
                (Math.abs(window.earlyPassSeconds - legal.earlyPassSeconds) <
                  1e-12 &&
                Math.abs(window.latePassSeconds - legal.latePassSeconds) <
                  1e-12 &&
                Math.abs(
                  window.earlyAssociationSeconds - legal.earlyAssociationSeconds
                ) < 1e-12 &&
                Math.abs(
                  window.lateAssociationSeconds - legal.lateAssociationSeconds
                ) < 1e-12
                  ? 1
                  : 0)
              );
            },
            0
          );
          rows.push(
            Object.freeze({
              candidate: candidate.id,
              model: candidate.model,
              density: candidate.density,
              meter: meterCase.name,
              tempo,
              pulseBpm,
              pattern: pattern.name,
              expectedOnsets: pattern.onsets.length,
              tp: compositeCounts.tp,
              missing: compositeCounts.missing,
              extra: compositeCounts.extra,
              nearMiss: compositeCounts.nearMiss,
              formulaBPercent: compositeCounts.accuracyPercent,
              exactFormulaBPercent: exactCounts.accuracyPercent,
              fixedErrorProbes: Object.freeze(fixedErrorProbes),
              correctClassifications: classification.correct,
              testedClassifications: classification.total,
              classificationRate: classification.total
                ? classification.correct / classification.total
                : 0,
              scenarioRates: classification.scenarioRates,
              midpointOverlaps: classification.midpointOverlaps,
              midpointAssigned: classification.midpointAssigned,
              associationOverlaps: countOverlappingAssociationWindows(
                pattern.onsets,
                meterCase.meter,
                pulseBpm,
                gridTicks,
                candidate
              ),
              actualVsLegalEqualWindowCount,
            })
          );
        }
      }
    }
    if (info.pulseTicks <= 0)
      throw new RangeError("Meter has invalid pulse semantics.");
  }
  return Object.freeze(rows);
}

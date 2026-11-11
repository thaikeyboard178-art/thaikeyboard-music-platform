import { describe, expect, it } from "vitest";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import { validateRhythmPattern } from "../rhythm/validate";
import {
  countOverlappingAssociationWindows,
  densePilotPattern,
  evaluatePilotScenario,
  mixedPilotOnsets,
  PILOT_CANDIDATES,
  PILOT_METERS,
  pilotOnsets,
  pilotWindows,
  runPilotMatrix,
  sparsePilotPattern,
  type PilotTap,
} from "./tolerancePilot";
import {
  mixedRuntimePattern,
  SEVEN_METER_RUNTIME_FIXTURES,
} from "../runtime/fixtures";

const t2BalancedActual = PILOT_CANDIDATES.find(
  candidate => candidate.id === "T2-B-balanced-actual-local"
)!;
const t2BalancedLegal = PILOT_CANDIDATES.find(
  candidate => candidate.id === "T2-B-balanced-legal-grid"
)!;
const t1Wide = PILOT_CANDIDATES.find(candidate => candidate.id === "T1-100ms")!;
const byName = new Map(PILOT_METERS.map(item => [item.name, item]));

describe("Phase 4A.1 offline tolerance pilot (not production matching)", () => {
  it("covers all seven meters with pulse BPM in each meter's approved pulse unit", () => {
    expect(PILOT_METERS.map(item => item.name)).toEqual([
      "2/4",
      "3/4",
      "4/4",
      "3/8",
      "6/8",
      "9/8",
      "2/2",
    ]);
    for (const item of PILOT_METERS) {
      const info = deriveMeter(item.meter);
      for (const bpm of [item.slowBpm, item.mediumBpm, item.fastBpm]) {
        expect(ticksToSeconds(info.pulseTicks, item.meter, bpm)).toBeCloseTo(
          60 / bpm,
          12
        );
      }
    }
    expect(byName.get("2/4")?.slowBpm).toBe(50);
    expect(byName.get("3/8")?.slowBpm).toBe(40);
    expect(byName.get("6/8")?.fastBpm).toBe(72);
    expect(byName.get("2/2")?.fastBpm).toBe(72);
  });

  it("validates sparse, dense, dotted/rest/sixteenth and cross-bar-tie canonical patterns for every meter", () => {
    for (const [index, item] of PILOT_METERS.entries()) {
      const grid = item.legalGridTicks;
      const sparse = sparsePilotPattern(item.meter, item.mediumBpm);
      const dense = densePilotPattern(item.meter, item.mediumBpm, grid);
      const mixed = {
        ...mixedRuntimePattern(SEVEN_METER_RUNTIME_FIXTURES[index]),
        tempo: { pulseBpm: item.mediumBpm },
      };
      for (const pattern of [sparse, dense, mixed]) {
        const validation = validateRhythmPattern(pattern);
        expect(validation.valid, `${item.name} ${pattern.id}`).toBe(true);
        const timeline = deriveRhythmTimeline(pattern, 120);
        expect(timeline.onsets.length).toBeGreaterThan(0);
        expect(timeline.totalTicks).toBe(
          deriveMeter(item.meter).measureTicks * 2
        );
      }
      const mixedSegments = mixed.measures.flatMap(bar => bar.segments);
      expect(mixedSegments.some(segment => segment.kind === "rest")).toBe(true);
      expect(
        mixedSegments.some(
          segment =>
            segment.duration.denominator === 8 && segment.duration.dots === 1
        )
      ).toBe(true);
      expect(
        mixedSegments.some(segment => segment.duration.denominator === 16)
      ).toBe(true);
      expect(
        mixedSegments.some(segment => segment.tieGroupId !== undefined)
      ).toBe(true);
      expect(pilotOnsets(mixed, 120)).toEqual(
        deriveRhythmTimeline(mixed, 120).onsets
      );
    }
    // Above Level 6's written vocabulary in some meters, explicitly as a canonical
    // stress fixture only; no curriculum or policy is altered by this test.
  });

  it("calculates owner-selected Formula B for exact, missing, extra, near-miss, zero-tap and no-target cases", () => {
    const meter = byName.get("4/4")!.meter;
    const bpm = 108;
    const grid = 120;
    const onsetTicks = [0, 120, 240];
    const onsetSeconds = onsetTicks.map(tick =>
      ticksToSeconds(tick, meter, bpm)
    );
    const makeTap = (id: string, time: number): PilotTap => ({
      nativeEventId: id,
      timestampSeconds: time,
      validPhysicalEvent: true,
    });
    const exact = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: bpm,
      gridTicks: grid,
      onsetTicks,
      taps: onsetSeconds.map((time, index) => makeTap(`exact-${index}`, time)),
    });
    expect(exact).toMatchObject({
      tp: 3,
      missing: 0,
      extra: 0,
      nearMiss: 0,
      n: 3,
      k: 3,
      accuracyPercent: 100,
    });

    const missing = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: bpm,
      gridTicks: grid,
      onsetTicks,
      taps: [makeTap("a", onsetSeconds[0]), makeTap("c", onsetSeconds[2])],
    });
    expect(missing).toMatchObject({
      tp: 2,
      missing: 1,
      extra: 0,
      n: 3,
      k: 2,
      accuracyPercent: 80,
    });

    const extra = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: bpm,
      gridTicks: grid,
      onsetTicks,
      taps: [
        ...onsetSeconds.map((time, index) => makeTap(`e-${index}`, time)),
        makeTap("far", onsetSeconds[2] + 0.2),
      ],
    });
    expect(extra.tp).toBe(3);
    expect(extra.extra).toBe(1);
    expect(extra.accuracyPercent).toBeCloseTo(85.7142857143, 9);

    const windows = pilotWindows(
      t2BalancedActual,
      meter,
      bpm,
      grid,
      onsetTicks
    );
    const nearDelta =
      (windows[1].latePassSeconds + windows[1].lateAssociationSeconds) / 2;
    const near = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: bpm,
      gridTicks: grid,
      onsetTicks,
      taps: [
        makeTap("a", onsetSeconds[0]),
        makeTap("b", onsetSeconds[1] + nearDelta),
        makeTap("c", onsetSeconds[2]),
      ],
    });
    expect(near.targetStatuses[1]).toBe("late");
    expect(near).toMatchObject({
      tp: 2,
      nearMiss: 1,
      n: 3,
      k: 3,
      accuracyPercent: 200 / 3,
    });

    const noTaps = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: bpm,
      gridTicks: grid,
      onsetTicks,
      taps: [],
    });
    expect(noTaps).toMatchObject({
      tp: 0,
      missing: 3,
      extra: 0,
      n: 3,
      k: 0,
      accuracyPercent: 0,
    });
    const noTargets = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: bpm,
      gridTicks: grid,
      onsetTicks: [],
      taps: [
        makeTap("no-target-first", 0),
        makeTap("no-target-first", 0),
        makeTap("no-target-second", 0),
        {
          nativeEventId: "ignored-software",
          timestampSeconds: 0,
          validPhysicalEvent: false,
        },
      ],
    });
    expect(noTargets).toMatchObject({
      n: 0,
      k: 2,
      extra: 2,
      accuracyPercent: null,
      technicalAbort: false,
      tapStatuses: ["extra", "extra"],
    });

    const aborted = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: bpm,
      gridTicks: grid,
      onsetTicks,
      taps: onsetSeconds.map((time, index) => makeTap(`abort-${index}`, time)),
      technicalAbort: true,
    });
    expect(aborted).toMatchObject({
      technicalAbort: true,
      accuracyPercent: null,
    });
  });

  it("deduplicates software redelivery but preserves equal-timestamp physical double taps", () => {
    const meter = byName.get("3/4")!.meter;
    const onsetTicks = [0, 480];
    const t0 = ticksToSeconds(0, meter, 79);
    const t1 = ticksToSeconds(480, meter, 79);
    const duplicate = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: 79,
      gridTicks: 120,
      onsetTicks,
      taps: [
        {
          nativeEventId: "same-native-event",
          timestampSeconds: t0,
          validPhysicalEvent: true,
        },
        {
          nativeEventId: "same-native-event",
          timestampSeconds: t0,
          validPhysicalEvent: true,
        },
        {
          nativeEventId: "second-onset",
          timestampSeconds: t1,
          validPhysicalEvent: true,
        },
      ],
    });
    expect(duplicate).toMatchObject({
      tp: 2,
      extra: 0,
      k: 2,
      accuracyPercent: 100,
    });

    const physicalDouble = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: 79,
      gridTicks: 120,
      onsetTicks: [0],
      taps: [
        {
          nativeEventId: "pointerdown-1",
          timestampSeconds: t0,
          validPhysicalEvent: true,
        },
        {
          nativeEventId: "pointerdown-2",
          timestampSeconds: t0,
          validPhysicalEvent: true,
        },
      ],
    });
    expect(physicalDouble).toMatchObject({
      tp: 1,
      extra: 1,
      n: 1,
      k: 2,
      accuracyPercent: 200 / 3,
    });
  });

  it("shows legal-grid and actual-local T2 are identical on grid-aligned patterns and differ only in finer stress material", () => {
    for (const [index, item] of PILOT_METERS.entries()) {
      const pulseBpm = item.fastBpm;
      const legalTicks = pilotOnsets(
        densePilotPattern(item.meter, pulseBpm, item.legalGridTicks)
      );
      const legal = pilotWindows(
        t2BalancedLegal,
        item.meter,
        pulseBpm,
        item.legalGridTicks,
        legalTicks
      );
      const actual = pilotWindows(
        t2BalancedActual,
        item.meter,
        pulseBpm,
        item.legalGridTicks,
        legalTicks
      );
      for (const [targetIndex, window] of actual.entries()) {
        expect(window.earlyPassSeconds).toBeCloseTo(
          legal[targetIndex].earlyPassSeconds,
          12
        );
        expect(window.latePassSeconds).toBeCloseTo(
          legal[targetIndex].latePassSeconds,
          12
        );
        expect(window.earlyAssociationSeconds).toBeCloseTo(
          legal[targetIndex].earlyAssociationSeconds,
          12
        );
        expect(window.lateAssociationSeconds).toBeCloseTo(
          legal[targetIndex].lateAssociationSeconds,
          12
        );
      }
      const mixedTicks = mixedPilotOnsets(index, pulseBpm);
      const mixedLegal = pilotWindows(
        t2BalancedLegal,
        item.meter,
        pulseBpm,
        item.legalGridTicks,
        mixedTicks
      );
      const mixedActual = pilotWindows(
        t2BalancedActual,
        item.meter,
        pulseBpm,
        item.legalGridTicks,
        mixedTicks
      );
      if (["6/8", "9/8", "2/2"].includes(item.name)) {
        expect(
          mixedActual.some(
            (window, targetIndex) =>
              window.latePassSeconds < mixedLegal[targetIndex].latePassSeconds
          )
        ).toBe(true);
      } else if (item.name === "3/8") {
        // A 120-tick local gap exists in this stress fixture, but Cpass=50 ms
        // saturates both alternatives at the chosen fast eighth-note tempo.
        expect(mixedActual).toEqual(mixedLegal);
      }
    }
  });

  it("finds T1 midpoint overlaps at fast dense 4/4 but no T2 association-window overlap", () => {
    const meter = byName.get("4/4")!.meter;
    const onsetTicks = pilotOnsets(densePilotPattern(meter, 108, 120));
    expect(
      countOverlappingAssociationWindows(onsetTicks, meter, 108, 120, t1Wide)
    ).toBeGreaterThan(0);
    for (const candidate of PILOT_CANDIDATES.filter(
      item => item.model === "T2"
    )) {
      expect(
        countOverlappingAssociationWindows(
          onsetTicks,
          meter,
          108,
          120,
          candidate
        )
      ).toBe(0);
    }
  });

  it("shows one 45 ms late tap can be a pass or near-miss by pulse and legal grid", () => {
    const scenarios = [
      {
        meter: byName.get("4/4")!.meter,
        bpm: 50,
        grid: 120,
        expected: "matched",
      },
      {
        meter: byName.get("4/4")!.meter,
        bpm: 108,
        grid: 120,
        expected: "late",
      },
      {
        meter: byName.get("3/8")!.meter,
        bpm: 72,
        grid: 240,
        expected: "matched",
      },
      {
        meter: byName.get("6/8")!.meter,
        bpm: 72,
        grid: 240,
        expected: "matched",
      },
      {
        meter: byName.get("2/2")!.meter,
        bpm: 72,
        grid: 240,
        expected: "matched",
      },
    ] as const;
    for (const [index, item] of scenarios.entries()) {
      const expectedTime = ticksToSeconds(0, item.meter, item.bpm);
      const result = evaluatePilotScenario({
        candidate: t2BalancedActual,
        meter: item.meter,
        pulseBpm: item.bpm,
        gridTicks: item.grid,
        onsetTicks: [0],
        taps: [
          {
            nativeEventId: `45ms-${index}`,
            timestampSeconds: expectedTime + 0.045,
            validPhysicalEvent: true,
          },
        ],
      });
      expect(result.targetStatuses[0]).toBe(item.expected);
    }
  });

  it("keeps an exact inclusive 80 ms association boundary inside the pilot window", () => {
    const meter = byName.get("4/4")!.meter;
    const expected = ticksToSeconds(0, meter, 50);
    const result = evaluatePilotScenario({
      candidate: t2BalancedActual,
      meter,
      pulseBpm: 50,
      gridTicks: 120,
      onsetTicks: [0, 120],
      taps: [
        {
          nativeEventId: "boundary-80ms",
          timestampSeconds: expected + 0.08,
          validPhysicalEvent: true,
        },
      ],
    });
    expect(result.targetStatuses[0]).toBe("late");
    expect(result.extra).toBe(0);
  });

  it("covers a 630-cell matrix and records nontrivial scenario classification rates", () => {
    const matrix = runPilotMatrix();
    expect(matrix).toHaveLength(10 * 7 * 3 * 3);
    expect(new Set(matrix.map(row => row.candidate)).size).toBe(10);
    expect(new Set(matrix.map(row => row.meter)).size).toBe(7);
    expect(matrix.every(row => row.exactFormulaBPercent === 100)).toBe(true);
    expect(
      matrix.every(
        row =>
          row.tp === row.expectedOnsets - 2 &&
          row.missing === 1 &&
          row.extra === 1 &&
          row.nearMiss === 1
      )
    ).toBe(true);
    expect(
      matrix.every(
        row => row.classificationRate >= 0 && row.classificationRate <= 1
      )
    ).toBe(true);
    expect(matrix.some(row => row.classificationRate < 1)).toBe(false);
  });
});

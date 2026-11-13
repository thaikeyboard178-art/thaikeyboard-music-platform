// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { sealTapAttempt } from "../exercises/tapCompletion";
import {
  matchTapRhythm,
  type TapMatchInput,
} from "../exercises/tapMatcher";
import {
  calculateTapTwoRoundScore,
  type TapRoundInput,
} from "../exercises/tapRoundScoring";
import {
  createTapTargets,
  type TapRhythmExercise,
} from "../exercises/tapRhythm";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import { RHYTHM_NOTATION_EXAMPLES } from "../notation/examples";
import { TapResultNotation } from "./TapResultNotation";

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () =>
      ({
        measureText: (text: string) => ({ width: text.length * 7 }),
      }) as unknown as CanvasRenderingContext2D,
  });
});

afterEach(cleanup);

function exerciseFixture(): TapRhythmExercise {
  const pattern = RHYTHM_NOTATION_EXAMPLES[0].pattern;
  const targets = createTapTargets(pattern, 240);
  return Object.freeze({
    id: "result-notation-component-fixture",
    kind: "tap-rhythm",
    track: 4,
    section: "practice",
    pattern,
    gridTicks: 240,
    targets,
  });
}

function exactTaps(
  exercise: TapRhythmExercise,
  sequenceStart = 0,
  timingOffsetMs = 0
): readonly TapMatchInput[] {
  return exercise.targets.map((target, index) => ({
    sequence: sequenceStart + index,
    offsetMs: target.offsetMs + timingOffsetMs,
  }));
}

type ResultOptions = Readonly<{
  round1Taps?: readonly TapMatchInput[];
  round2Taps?: readonly TapMatchInput[];
  skippedRounds?: readonly [boolean, boolean];
}>;

function resultFixture(
  exercise: TapRhythmExercise,
  {
    round1Taps = exercise.targets.map((target, index) => ({
      sequence: 7 + index,
      offsetMs: target.offsetMs + (index === 0 ? 18.25 : 0),
    })),
    round2Taps = exactTaps(exercise),
    skippedRounds = [false, false],
  }: ResultOptions = {}
) {
  const rounds: readonly [TapRoundInput, TapRoundInput] = [
    { roundNumber: 1, skipped: skippedRounds[0], taps: round1Taps },
    { roundNumber: 2, skipped: skippedRounds[1], taps: round2Taps },
  ];
  const meter = deriveMeter(exercise.pattern.meter);
  const canonicalPulseMs =
    ticksToSeconds(
      meter.pulseTicks,
      exercise.pattern.meter,
      exercise.pattern.tempo.pulseBpm
    ) * 1000;
  const score = calculateTapTwoRoundScore(
    exercise.targets,
    rounds,
    canonicalPulseMs
  );
  const firstPlayedRound = score.rounds.find(round => round.status === "played");
  const evaluation = firstPlayedRound
    ? matchTapRhythm(exercise.targets, firstPlayedRound.taps)
    : null;
  return sealTapAttempt({
    exerciseId: exercise.id,
    generation: 1,
    mode: "practice",
    status: "completed",
    reason: null,
    targetTicks: exercise.targets.map(target => target.tick),
    taps: firstPlayedRound?.taps ?? [],
    evaluation,
    accuracyPercent: score.overallAccuracyPercent,
    scoreOutOfTen: score.scoreOutOfTen,
    rounds: score.rounds,
    rawCaptures: [],
  });
}

function resultWithAllMarkerStatuses(exercise: TapRhythmExercise) {
  const [first, second, third] = exercise.targets;
  const last = exercise.targets[exercise.targets.length - 1];
  if (!first || !second || !third || !last || exercise.targets.length < 4) {
    throw new Error("Fixture needs at least four targets");
  }
  const taps: readonly TapMatchInput[] = [
    {
      sequence: 0,
      offsetMs: first.offsetMs - first.passMs - 1,
    },
    { sequence: 1, offsetMs: second.offsetMs },
    {
      sequence: 2,
      offsetMs: third.offsetMs + third.passMs + 1,
    },
    { sequence: 3, offsetMs: last.offsetMs + 2000 },
    { sequence: 4, offsetMs: last.offsetMs + 2050 },
  ];
  return resultFixture(exercise, {
    round1Taps: taps,
    round2Taps: exactTaps(exercise),
  });
}

function setHostWidth(width: number) {
  const host = screen.getByTestId("tap-result-notation-host");
  Object.defineProperty(host, "clientWidth", {
    configurable: true,
    get: () => width,
  });
}

function drawAtWidth(width = 390) {
  setHostWidth(width);
  act(() => window.dispatchEvent(new Event("resize")));
}

function markerRow(testId: string): SVGGElement {
  const row = screen.getByTestId(testId);
  expect(row.tagName.toLowerCase()).toBe("g");
  return row as unknown as SVGGElement;
}

describe("TapResultNotation", () => {
  it("renders both scored learner rows with a fixed Reference row and toggles only learner markers", () => {
    const exercise = exerciseFixture();
    const result = resultFixture(exercise);
    render(<TapResultNotation exercise={exercise} result={result} />);
    drawAtWidth();

    const host = screen.getByTestId("tap-result-notation-host");
    const score = host.querySelector("svg[data-rhythm-pattern-id]");
    expect(score).not.toBeNull();
    expect(score?.querySelectorAll("[data-rhythm-segment-id]").length).toBe(
      exercise.pattern.measures.flatMap(measure => measure.segments).length
    );
    expect(score?.getAttribute("width")).toBe(
      score?.getAttribute("data-rhythm-natural-width")
    );
    const overlay = host.querySelector<SVGSVGElement>(
      "svg[data-testid='tap-marker-layer']"
    );
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("role")).toBe("group");
    expect(overlay?.querySelectorAll("text")).toHaveLength(0);

    const legend = screen.getByTestId("tap-marker-legend");
    expect(legend.querySelectorAll("li")).toHaveLength(3);
    expect(legend.textContent).toContain("Khớp");
    expect(legend.textContent).toContain("Lệch");
    expect(legend.textContent).toContain("Chạm thừa");
    expect(screen.getByTestId("tap-reference-row-label").textContent).toContain(
      "Tham chiếu"
    );

    const referenceRow = markerRow("tap-reference-markers");
    const round1Row = markerRow("tap-round-1-markers");
    const round2Row = markerRow("tap-round-2-markers");
    expect(referenceRow.getAttribute("visibility")).toBe("visible");
    expect(
      referenceRow.querySelectorAll("[data-testid='tap-reference-marker']")
    ).toHaveLength(exercise.targets.length);
    expect(round1Row.getAttribute("data-round")).toBe("1");
    expect(round2Row.getAttribute("data-round")).toBe("2");
    expect(round1Row.querySelectorAll("[data-testid='tap-marker']")).toHaveLength(
      exercise.targets.length
    );
    expect(round2Row.querySelectorAll("[data-testid='tap-marker']")).toHaveLength(
      exercise.targets.length
    );

    const marker = [...round1Row.querySelectorAll("[data-testid='tap-marker']")]
      .find(item => item.getAttribute("data-sequence") === "7");
    expect(marker).toBeTruthy();
    expect(marker?.getAttribute("data-offset")).toBe(
      String(exercise.targets[0].offsetMs + 18.25)
    );
    expect(marker?.getAttribute("data-status")).toBe("matched");
    expect(marker?.getAttribute("data-error-ms")).toBe("18.25");
    expect(marker?.getAttribute("aria-label")).toContain("Vòng 1, Khớp");
    expect(marker?.getAttribute("aria-label")).toContain("t +18.25 ms");
    expect(marker?.getAttribute("aria-label")).toContain("Δ +18.25 ms");
    expect(
      screen.getByRole("img", {
        name: "Vòng 1, Khớp, t +18.25 ms, Δ +18.25 ms",
      })
    ).toBe(marker);
    expect(marker?.querySelector("title")?.textContent).toContain(
      "Δ +18.25 ms"
    );
    expect(marker?.querySelectorAll("text")).toHaveLength(0);
    expect(marker?.querySelector("circle")?.getAttribute("fill")).toBe(
      "#23835a"
    );
    expect(marker?.querySelector("circle")?.getAttribute("cx")).toBe(
      marker?.getAttribute("data-x")
    );
    expect(marker?.querySelector("circle")?.getAttribute("cy")).toBe(
      marker?.getAttribute("data-y")
    );

    const toggle = screen.getByRole("checkbox", {
      name: /marker kết quả của hai vòng/i,
    }) as HTMLInputElement;
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(round1Row.getAttribute("visibility")).toBe("hidden");
    expect(round2Row.getAttribute("visibility")).toBe("hidden");
    expect(referenceRow.getAttribute("visibility")).toBe("visible");
    expect(referenceRow.getAttribute("aria-hidden")).toBe("false");
    expect(host.querySelector("svg[data-rhythm-pattern-id]")).toBe(score);
    expect(
      screen.queryByRole("img", {
        name: "Vòng 1, Khớp, t +18.25 ms, Δ +18.25 ms",
      })
    ).toBeNull();
    expect(
      screen.getAllByRole("img", {
        name: "Tham chiếu — đúng vị trí mục tiêu, 100%",
      })
    ).toHaveLength(exercise.targets.length);

    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
    expect(round1Row.getAttribute("visibility")).toBe("visible");
    expect(round2Row.getAttribute("visibility")).toBe("visible");
    expect(referenceRow.getAttribute("visibility")).toBe("visible");
  });

  it("renders only real assigned taps and captured extras, never a fabricated marker for a missing target", () => {
    const exercise = exerciseFixture();
    const result = resultWithAllMarkerStatuses(exercise);
    render(<TapResultNotation exercise={exercise} result={result} />);
    drawAtWidth();

    const host = screen.getByTestId("tap-result-notation-host");
    const overlay = host.querySelector<SVGSVGElement>(
      "svg[data-testid='tap-marker-layer']"
    );
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelectorAll("text")).toHaveLength(0);

    const round1Row = markerRow("tap-round-1-markers");
    const round2Row = markerRow("tap-round-2-markers");
    const referenceRow = markerRow("tap-reference-markers");
    const round1Markers = [
      ...round1Row.querySelectorAll<SVGGElement>("[data-testid='tap-marker']"),
    ];
    expect(
      new Set(round1Markers.map(marker => marker.getAttribute("data-status")))
    ).toEqual(new Set(["matched", "early", "late", "extra"]));
    expect(round1Markers).toHaveLength(5);
    const firstRound = result.rounds?.[0];
    expect(firstRound?.evaluation?.targetResults.map(item => item.status)).toContain(
      "missing"
    );
    const missingTargetId = firstRound?.evaluation?.targetResults.find(
      item => item.status === "missing"
    )?.targetId;
    expect(missingTargetId).toBeTruthy();
    expect(
      round1Row.querySelector(
        `[data-testid='tap-marker'][data-target-id='${missingTargetId}']`
      )
    ).toBeNull();
    expect(
      [...referenceRow.querySelectorAll("[data-testid='tap-reference-marker']")]
        .some(marker => marker.getAttribute("data-target-id") === missingTargetId)
    ).toBe(true);

    const actualCaptureSequences = new Set(
      firstRound?.taps.map(tap => String(tap.sequence))
    );
    for (const marker of round1Markers) {
      expect(actualCaptureSequences.has(marker.getAttribute("data-sequence") ?? "")).toBe(
        true
      );
      expect(marker.querySelectorAll("text")).toHaveLength(0);
      expect(marker.querySelector("circle")).not.toBeNull();
      expect(marker.querySelector("path, rect, polygon, line")).toBeNull();
      expect(marker.querySelector("circle")?.getAttribute("cx")).toBe(
        marker.getAttribute("data-x")
      );
      expect(marker.querySelector("circle")?.getAttribute("cy")).toBe(
        marker.getAttribute("data-y")
      );
    }
    expect(
      round1Markers.find(marker => marker.getAttribute("data-status") === "matched")
        ?.querySelector("circle")?.getAttribute("fill")
    ).toBe("#23835a");
    for (const status of ["early", "late"]) {
      const circle = round1Markers
        .find(marker => marker.getAttribute("data-status") === status)
        ?.querySelector("circle");
      expect(circle?.getAttribute("fill")).toBe("none");
      expect(circle?.getAttribute("stroke")).toBe("#23835a");
    }
    const extra = round1Markers.find(
      marker => marker.getAttribute("data-status") === "extra"
    );
    expect(extra?.getAttribute("data-sequence")).toBe("4");
    expect(extra?.querySelector("circle")?.getAttribute("fill")).toBe("none");
    expect(extra?.querySelector("circle")?.getAttribute("stroke")).toBe(
      "#23835a"
    );

    const round2Markers = [
      ...round2Row.querySelectorAll<SVGGElement>("[data-testid='tap-marker']"),
    ];
    expect(round2Markers).toHaveLength(exercise.targets.length);
    expect(
      new Set(round2Markers.map(marker => marker.getAttribute("data-status")))
    ).toEqual(new Set(["matched"]));
    for (const marker of round2Markers) {
      expect(marker.getAttribute("data-sequence")).not.toBe("");
      expect(marker.querySelector("circle")).not.toBeNull();
      expect(marker.querySelector("path, rect, polygon, line")).toBeNull();
      expect(marker.querySelector("circle")?.getAttribute("cx")).toBe(marker.getAttribute("data-x"));
      expect(marker.querySelector("circle")?.getAttribute("cy")).toBe(marker.getAttribute("data-y"));
      expect(marker.querySelector("circle")?.getAttribute("fill")).toBe("#23835a");
    }
  });

  it("labels skipped rounds and gives them zero learner markers while Reference stays visible", () => {
    const exercise = exerciseFixture();
    const result = resultFixture(exercise, {
      skippedRounds: [true, false],
      round1Taps: exactTaps(exercise),
      round2Taps: exactTaps(exercise),
    });
    render(<TapResultNotation exercise={exercise} result={result} />);
    drawAtWidth();

    expect(screen.getByTestId("tap-round-1-row-label").textContent).toContain(
      "Đã bỏ qua"
    );
    expect(screen.getByTestId("tap-round-2-row-label").textContent).toContain(
      "Hoàn tất"
    );
    const referenceRow = markerRow("tap-reference-markers");
    const skippedRow = markerRow("tap-round-1-markers");
    const playedRow = markerRow("tap-round-2-markers");
    expect(skippedRow.querySelectorAll("[data-testid='tap-marker']")).toHaveLength(
      0
    );
    expect(playedRow.querySelectorAll("[data-testid='tap-marker']")).toHaveLength(
      exercise.targets.length
    );
    expect(referenceRow.getAttribute("visibility")).toBe("visible");
    expect(
      referenceRow.querySelectorAll("[data-testid='tap-reference-marker']")
    ).toHaveLength(exercise.targets.length);

    const toggle = screen.getByRole("checkbox", {
      name: /marker kết quả của hai vòng/i,
    });
    fireEvent.click(toggle);
    expect(skippedRow.querySelectorAll("[data-testid='tap-marker']")).toHaveLength(
      0
    );
    expect(playedRow.getAttribute("visibility")).toBe("hidden");
    expect(referenceRow.getAttribute("visibility")).toBe("visible");
    expect(referenceRow.getAttribute("aria-hidden")).toBe("false");
    expect(
      screen.getAllByRole("img", {
        name: "Tham chiếu — đúng vị trí mục tiêu, 100%",
      })
    ).toHaveLength(exercise.targets.length);
  });

  it("keeps Round 1 markers visible when the live attempt advances into Round 2", () => {
    const exercise = exerciseFixture();
    const canonicalPulseMs =
      ticksToSeconds(
        deriveMeter(exercise.pattern.meter).pulseTicks,
        exercise.pattern.meter,
        exercise.pattern.tempo.pulseBpm
      ) * 1000;
    const completedRound1 = calculateTapTwoRoundScore(
      exercise.targets,
      [
        { roundNumber: 1, skipped: false, taps: exactTaps(exercise) },
        { roundNumber: 2, skipped: true, taps: [] },
      ],
      canonicalPulseMs
    ).rounds[0];
    const view = render(
      <TapResultNotation
        exercise={exercise}
        result={null}
        liveRounds={[null, null]}
        currentRound={1}
        isLive
      />
    );
    drawAtWidth();
    expect(markerRow("tap-round-1-markers").querySelectorAll("[data-testid='tap-marker']"))
      .toHaveLength(0);

    view.rerender(
      <TapResultNotation
        exercise={exercise}
        result={null}
        liveRounds={[completedRound1, null]}
        currentRound={2}
        isLive
      />
    );
    drawAtWidth();

    expect(screen.getByTestId("tap-round-1-row-label").textContent).toContain(
      "Hoàn tất"
    );
    expect(screen.getByTestId("tap-round-2-row-label").textContent).toContain(
      "Đang thực hiện"
    );
    expect(
      markerRow("tap-round-1-markers").querySelectorAll("[data-testid='tap-marker']")
    ).toHaveLength(exercise.targets.length);
    expect(
      markerRow("tap-round-2-markers").querySelectorAll("[data-testid='tap-marker']")
    ).toHaveLength(0);
    expect(
      markerRow("tap-reference-markers").querySelectorAll("[data-testid='tap-reference-marker']")
    ).toHaveLength(exercise.targets.length);
  });

  it("keeps each exact target horizontally aligned and puts Reference, Round 1, and Round 2 in distinct y lanes", () => {
    const exercise = exerciseFixture();
    const exact = exactTaps(exercise);
    const result = resultFixture(exercise, {
      round1Taps: exact,
      round2Taps: exact,
    });
    render(<TapResultNotation exercise={exercise} result={result} />);
    drawAtWidth();

    const referenceRow = markerRow("tap-reference-markers");
    const round1Row = markerRow("tap-round-1-markers");
    const round2Row = markerRow("tap-round-2-markers");
    expect(screen.getByTestId("tap-reference-row-label").textContent).toContain(
      "Tham chiếu"
    );
    for (const target of exercise.targets) {
      const reference = referenceRow.querySelector<SVGGElement>(
        `[data-testid='tap-reference-marker'][data-target-id='${target.id}']`
      );
      const round1 = round1Row.querySelector<SVGGElement>(
        `[data-testid='tap-marker'][data-target-id='${target.id}']`
      );
      const round2 = round2Row.querySelector<SVGGElement>(
        `[data-testid='tap-marker'][data-target-id='${target.id}']`
      );
      expect(reference).not.toBeNull();
      expect(round1).not.toBeNull();
      expect(round2).not.toBeNull();
      expect(round1?.getAttribute("data-status")).toBe("matched");
      expect(round2?.getAttribute("data-status")).toBe("matched");
      expect(Number(round1?.getAttribute("data-x"))).toBeCloseTo(
        Number(reference?.getAttribute("data-x")),
        5
      );
      expect(Number(round2?.getAttribute("data-x"))).toBeCloseTo(
        Number(reference?.getAttribute("data-x")),
        5
      );
      const referenceY = Number(reference?.getAttribute("data-y"));
      const round1Y = Number(round1?.getAttribute("data-y"));
      const round2Y = Number(round2?.getAttribute("data-y"));
      expect(round1Y).toBe(referenceY + 22);
      expect(round2Y).toBe(referenceY + 44);
      expect(new Set([referenceY, round1Y, round2Y]).size).toBe(3);
    }
  });
});

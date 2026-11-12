import {
  getCurriculumUnit,
  requireExerciseKindAllowed,
  type CountBeatFocus,
  type CurriculumSection,
} from "../curriculum/curriculum";
import { generateRhythmPattern } from "../generation/generator";
import { createSeededRandom } from "../generation/random";
import { deriveMeter } from "../rhythm/meters";
import { deriveRhythmTimeline } from "../rhythm/deriveTimeline";
import type { RhythmPattern, RhythmTrack } from "../types";

export type CountBeatEvent = "onset" | "sustain" | "rest" | "tie-continuation";

export type CountBeatPosition = Readonly<{
  tick: number;
  measureIndex: number;
  measureOffsetTicks: number;
  pulseIndex: number;
  subdivisionIndex: number;
  isPulseStart: boolean;
  isGroupStart: boolean;
  isSubdivisionStart: true;
  structuralAccent: "strong" | "medium" | "weak";
  event: CountBeatEvent;
}>;

export type CountBeatSemantics = Readonly<{
  numerator: number;
  denominator: number;
  pulseCount: number;
  pulseTicks: number;
  pulseUnit: Readonly<{ denominator: number; dots: number }>;
  groups: readonly number[];
  groupStarts: readonly number[];
}>;

export type CountBeatExercise = Readonly<{
  id: string;
  kind: "count-beat";
  track: RhythmTrack;
  section: CurriculumSection;
  focus: CountBeatFocus;
  prompt: string;
  pattern: RhythmPattern;
  gridTicks: number;
  questionTick?: number;
  semantics: CountBeatSemantics;
  positions: readonly CountBeatPosition[];
}>;

export type CountBeatAnswer =
  | Readonly<{ selectedTicks: readonly number[] }>
  | Readonly<{ event: CountBeatEvent }>
  | Readonly<{ semantics: CountBeatSemantics }>;

export type CountBeatEvaluation = Readonly<{
  correct: boolean;
  expectedCanonicalIdentity: string;
  submittedCanonicalIdentity: string | null;
}>;

function gridForTrack(track: RhythmTrack): number {
  if (track === 5) return 120;
  if (track === "bonus") return 240;
  if (track === 1) return 480;
  return 240;
}

function eventAtTick(
  tick: number,
  segments: ReturnType<typeof deriveRhythmTimeline>["segments"]
): CountBeatEvent {
  const segment = segments.find(
    item => item.absoluteStartTicks <= tick && tick < item.absoluteEndTicks
  );
  if (!segment)
    throw new RangeError("Count the Beat tick lies outside the timeline.");
  if (segment.kind === "rest") return "rest";
  if (tick === segment.absoluteStartTicks) {
    if (segment.tieRole === "continue" || segment.tieRole === "end")
      return "tie-continuation";
    return segment.isOnset ? "onset" : "sustain";
  }
  return "sustain";
}

function analyzePattern(
  pattern: RhythmPattern,
  gridTicks: number
): Readonly<{
  semantics: CountBeatSemantics;
  positions: readonly CountBeatPosition[];
}> {
  const timeline = deriveRhythmTimeline(pattern, gridTicks);
  const meter = deriveMeter(timeline.pattern.meter);
  const positions: CountBeatPosition[] = [];
  for (let tick = 0; tick < timeline.totalTicks; tick += gridTicks) {
    const measureIndex = Math.floor(tick / meter.measureTicks);
    const measureOffsetTicks = tick - measureIndex * meter.measureTicks;
    const accent = timeline.structure.accentPositions.find(
      item => item.tick === measureOffsetTicks
    );
    if (!accent)
      throw new RangeError("Count the Beat grid is missing meter metadata.");
    positions.push(
      Object.freeze({
        tick,
        measureIndex,
        measureOffsetTicks,
        pulseIndex: Math.floor(measureOffsetTicks / meter.pulseTicks),
        subdivisionIndex: accent.subdivisionIndex,
        isPulseStart: meter.pulseStarts.includes(measureOffsetTicks),
        isGroupStart: meter.groupStarts.includes(measureOffsetTicks),
        isSubdivisionStart: true,
        structuralAccent: accent.level,
        event: eventAtTick(tick, timeline.segments),
      })
    );
  }
  return Object.freeze({
    semantics: Object.freeze({
      numerator: meter.meter.numerator,
      denominator: meter.meter.denominator,
      pulseCount: meter.pulseCount,
      pulseTicks: meter.pulseTicks,
      pulseUnit: meter.pulseUnit,
      groups: Object.freeze([...meter.groups]),
      groupStarts: Object.freeze([...meter.groupStarts]),
    }),
    positions: Object.freeze(positions),
  });
}

function needsFeature(focus: CountBeatFocus, pattern: RhythmPattern): boolean {
  const segments = pattern.measures.flatMap(measure => measure.segments);
  if (focus === "rest-positions")
    return segments.some(segment => segment.kind === "rest");
  if (focus === "tie-continuations")
    return segments.some(segment => segment.tieGroupId !== undefined);
  return true;
}

function buildPrompt(focus: CountBeatFocus): string {
  const prompts: Record<CountBeatFocus, string> = {
    "pulse-positions": "Chọn tất cả vị trí bắt đầu của các phách.",
    "subdivision-positions": "Chọn các vị trí trên subdivision grid đã học.",
    "onset-positions": "Chọn tất cả vị trí có onset mới.",
    "rest-positions": "Chọn các vị trí thuộc dấu lặng.",
    "tie-continuations": "Chọn vị trí tie continuation không tạo onset mới.",
    "group-starts": "Chọn vị trí bắt đầu của từng nhóm cấu trúc theo meter.",
    "meter-semantics": "Chọn pulse unit, số phách và cách chia nhóm của meter.",
    "event-at-position":
      "Xác định vị trí được hỏi là onset, sustain, dấu lặng hay tie continuation.",
  };
  return prompts[focus];
}

export function generateCountBeatExercise(
  input: Readonly<{
    track: RhythmTrack;
    seed: string;
    focus: CountBeatFocus;
    section?: CurriculumSection;
    meter?: RhythmPattern["meter"];
  }>
): CountBeatExercise {
  if (!input.seed.trim())
    throw new RangeError("Count the Beat requires a seed.");
  const section = input.section ?? "practice";
  requireExerciseKindAllowed(input.track, section, "count-beat");
  const curriculum = getCurriculumUnit(input.track);
  const gridTicks = gridForTrack(input.track);
  if (!curriculum.countBeatFocuses.includes(input.focus)) {
    throw new RangeError(
      `${input.focus} is not part of this track's Count the Beat scope.`
    );
  }
  if (
    input.meter &&
    !curriculum.allowedMeters.some(
      meter =>
        meter.numerator === input.meter!.numerator &&
        meter.denominator === input.meter!.denominator
    )
  ) {
    throw new RangeError(
      "The requested meter is not allowed in this curriculum track."
    );
  }

  const focus = input.focus === "tie-continuations" ? "ties" : undefined;
  let pattern: RhythmPattern | undefined;
  let analysis: ReturnType<typeof analyzePattern> | undefined;
  const attempts = input.focus === "rest-positions" || focus ? 24 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = generateRhythmPattern({
      level: input.track,
      seed: `${input.seed}/pattern/${attempt}`,
      ...(input.meter ? { meter: input.meter } : {}),
      ...(focus ? { focus } : {}),
    });
    if (!needsFeature(input.focus, candidate)) continue;
    pattern = candidate;
    analysis = analyzePattern(candidate, gridTicks);
    break;
  }
  if (!pattern || !analysis) {
    throw new RangeError(
      `Could not generate the required ${input.focus} feature within the bounded attempt budget.`
    );
  }
  const random = createSeededRandom(`${input.seed}/question`);
  const questionTick =
    input.focus === "event-at-position"
      ? analysis.positions[Math.floor(random() * analysis.positions.length)]
          .tick
      : undefined;
  return Object.freeze({
    id: `count-${String(input.track)}-${input.seed}`,
    kind: "count-beat",
    track: input.track,
    section,
    focus: input.focus,
    prompt: buildPrompt(input.focus),
    pattern,
    gridTicks,
    ...(questionTick === undefined ? {} : { questionTick }),
    semantics: analysis.semantics,
    positions: analysis.positions,
  });
}

function ticksIdentity(
  focus: CountBeatFocus,
  ticks: readonly number[]
): string {
  return JSON.stringify([focus, [...ticks].sort((a, b) => a - b)]);
}

function expectedForExercise(exercise: CountBeatExercise): string {
  const analysis = analyzePattern(exercise.pattern, exercise.gridTicks);
  const positions = analysis.positions;
  if (exercise.focus === "event-at-position") {
    if (exercise.questionTick === undefined)
      throw new RangeError(
        "Event-at-position exercise is missing its target tick."
      );
    const target = positions.find(
      position => position.tick === exercise.questionTick
    );
    if (!target)
      throw new RangeError("Event-at-position tick is outside the grid.");
    return JSON.stringify([
      exercise.focus,
      exercise.questionTick,
      target.event,
    ]);
  }
  if (exercise.focus === "meter-semantics") {
    return JSON.stringify([exercise.focus, analysis.semantics]);
  }
  const selected = positions
    .filter(position => {
      switch (exercise.focus) {
        case "pulse-positions":
          return position.isPulseStart;
        case "group-starts":
          return position.isGroupStart;
        case "subdivision-positions":
          return position.isSubdivisionStart;
        case "onset-positions":
          return position.event === "onset";
        case "rest-positions":
          return position.event === "rest";
        case "tie-continuations":
          return position.event === "tie-continuation";
        default:
          return false;
      }
    })
    .map(position => position.tick);
  return ticksIdentity(exercise.focus, selected);
}

function submittedIdentity(
  exercise: CountBeatExercise,
  answer: unknown
): string | null {
  if (exercise.focus === "event-at-position") {
    if (
      typeof answer !== "object" ||
      answer === null ||
      !("event" in answer) ||
      !["onset", "sustain", "rest", "tie-continuation"].includes(
        String(answer.event)
      ) ||
      exercise.questionTick === undefined
    ) {
      return null;
    }
    return JSON.stringify([
      exercise.focus,
      exercise.questionTick,
      answer.event,
    ]);
  }
  if (exercise.focus === "meter-semantics") {
    if (
      typeof answer !== "object" ||
      answer === null ||
      !("semantics" in answer)
    )
      return null;
    const value = answer.semantics as Partial<CountBeatSemantics>;
    if (
      !Number.isSafeInteger(value.numerator) ||
      !Number.isSafeInteger(value.denominator) ||
      !Number.isSafeInteger(value.pulseCount) ||
      !Number.isSafeInteger(value.pulseTicks) ||
      !value.pulseUnit ||
      !Array.isArray(value.groups) ||
      !value.groups.every(Number.isSafeInteger) ||
      !Array.isArray(value.groupStarts) ||
      !value.groupStarts.every(tick => Number.isSafeInteger(tick) && tick >= 0)
    ) {
      return null;
    }
    return JSON.stringify([
      exercise.focus,
      {
        numerator: value.numerator,
        denominator: value.denominator,
        pulseCount: value.pulseCount,
        pulseTicks: value.pulseTicks,
        pulseUnit: value.pulseUnit,
        groups: value.groups,
        groupStarts: value.groupStarts,
      },
    ]);
  }
  if (
    typeof answer !== "object" ||
    answer === null ||
    !("selectedTicks" in answer) ||
    !Array.isArray(answer.selectedTicks) ||
    !answer.selectedTicks.every(tick => Number.isSafeInteger(tick) && tick >= 0)
  ) {
    return null;
  }
  const ticks = answer.selectedTicks as number[];
  if (new Set(ticks).size !== ticks.length) return null;
  return ticksIdentity(exercise.focus, ticks);
}

export function evaluateCountBeatAnswer(
  exercise: CountBeatExercise,
  answer: unknown
): CountBeatEvaluation {
  const expectedCanonicalIdentity = expectedForExercise(exercise);
  const submittedCanonicalIdentity = submittedIdentity(exercise, answer);
  return Object.freeze({
    correct: submittedCanonicalIdentity === expectedCanonicalIdentity,
    expectedCanonicalIdentity,
    submittedCanonicalIdentity,
  });
}

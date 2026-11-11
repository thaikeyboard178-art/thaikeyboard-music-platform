import { getCurriculumUnit, requireExerciseKindAllowed } from "../curriculum/curriculum";
import type {
  CurriculumSection,
  MultipleChoiceFocus,
} from "../curriculum/curriculum";
import type { RhythmFocus } from "../generation/levels";
import {
  generateRhythmChoices,
  type RhythmChoiceSet,
} from "../generation/choices";
import {
  assertLevelConstraints,
  generateRhythmPattern,
} from "../generation/generator";
import { createSeededRandom, seededShuffle } from "../generation/random";
import { deriveMeter } from "../rhythm/meters";
import { notationSignature } from "../rhythm/signatures";
import { requireValidRhythmPattern } from "../rhythm/validate";
import type {
  RhythmExerciseKind,
  RhythmPattern,
  RhythmTrack,
  WrittenDuration,
} from "../types";

export type MultipleChoiceOption = Readonly<{
  id: string;
  label: string;
  canonicalIdentity: string;
  value: string | boolean | WrittenDuration | RhythmPattern;
  pattern?: RhythmPattern;
}>;

export type MultipleChoiceExercise = Readonly<{
  id: string;
  kind: "multiple-choice";
  track: RhythmTrack;
  section: CurriculumSection;
  focus: MultipleChoiceFocus;
  prompt: Readonly<{
    text: string;
    segmentId?: string;
  }>;
  target: RhythmPattern;
  options: readonly MultipleChoiceOption[];
  correctCanonicalIdentity: string;
  generation?: RhythmChoiceSet;
}>;

export type MultipleChoiceAnswer = Readonly<{
  canonicalIdentity: string;
}>;

export type MultipleChoiceEvaluation = Readonly<{
  correct: boolean;
  selectedKnownOption: boolean;
  expectedCanonicalIdentity: string;
}>;

function durationIdentity(duration: WrittenDuration): string {
  return JSON.stringify([
    "written-duration",
    duration.denominator,
    duration.dots,
  ]);
}

function meterIdentity(meter: RhythmPattern["meter"]): string {
  return JSON.stringify(["meter", meter.numerator, meter.denominator]);
}

function groupingIdentity(meter: RhythmPattern["meter"]): string {
  const info = deriveMeter(meter);
  return JSON.stringify([
    "meter-grouping",
    info.pulseCount,
    info.pulseTicks,
    info.groups,
    info.pulseUnit.denominator,
    info.pulseUnit.dots,
  ]);
}

function segmentForPrompt(
  pattern: RhythmPattern,
  segmentId: string | undefined
) {
  const segments = pattern.measures.flatMap(measure => measure.segments);
  if (segmentId === undefined) return segments[0];
  const segment = segments.find(item => item.id === segmentId);
  if (!segment) throw new RangeError("Multiple Choice prompt segment is missing.");
  return segment;
}

function expectedIdentity(exercise: MultipleChoiceExercise): string {
  const pattern = requireValidRhythmPattern(exercise.target);
  switch (exercise.focus) {
    case "pattern":
      return notationSignature(pattern);
    case "note-rest":
      return JSON.stringify([
        "segment-kind",
        exercise.prompt.segmentId,
        segmentForPrompt(pattern, exercise.prompt.segmentId).kind,
      ]);
    case "duration":
      return JSON.stringify([
        "segment-duration",
        exercise.prompt.segmentId,
        durationIdentity(
          segmentForPrompt(pattern, exercise.prompt.segmentId).duration
        ),
      ]);
    case "meter":
      return meterIdentity(pattern.meter);
    case "grouping":
      return groupingIdentity(pattern.meter);
    case "dot":
      return JSON.stringify([
        "contains-dot",
        pattern.measures.some(measure =>
          measure.segments.some(segment => segment.duration.dots > 0)
        ),
      ]);
    case "tie":
      return JSON.stringify([
        "contains-tie",
        pattern.measures.some(measure =>
          measure.segments.some(segment => segment.tieGroupId !== undefined)
        ),
      ]);
  }
}

function makeOption(
  index: number,
  label: string,
  canonicalIdentity: string,
  value: MultipleChoiceOption["value"],
  pattern?: RhythmPattern
): MultipleChoiceOption {
  return Object.freeze({
    id: `choice-${index + 1}`,
    label,
    canonicalIdentity,
    value,
    ...(pattern === undefined ? {} : { pattern }),
  });
}

function choicesForFocus(
  focus: MultipleChoiceFocus,
  track: RhythmTrack,
  section: CurriculumSection,
  pattern: RhythmPattern,
  seed: string,
  generation?: RhythmChoiceSet
): readonly MultipleChoiceOption[] {
  if (focus === "pattern") {
    if (!generation) throw new RangeError("Pattern choices were not generated.");
    return Object.freeze(
      generation.choices.map((choice, index) =>
        makeOption(
          index,
          `Pattern ${index + 1}`,
          choice.canonicalIdentity,
          choice.pattern,
          choice.pattern
        )
      )
    );
  }

  const unit = getCurriculumUnit(track);
  let rows: Array<{
    label: string;
    identity: string;
    value: MultipleChoiceOption["value"];
  }>;
  if (focus === "note-rest") {
    const segment = segmentForPrompt(pattern, undefined);
    rows = (["note", "rest"] as const).map(kind => ({
      label: kind === "note" ? "Nốt" : "Dấu lặng",
      identity: JSON.stringify(["segment-kind", segment.id, kind]),
      value: kind,
    }));
  } else if (focus === "duration") {
    const segment = segmentForPrompt(pattern, undefined);
    rows = unit.allowedDurations.map(duration => ({
      label: `${duration.dots ? "Chấm dôi " : ""}giá trị 1/${duration.denominator}`,
      identity: JSON.stringify([
        "segment-duration",
        segment.id,
        durationIdentity(duration),
      ]),
      value: duration,
    }));
  } else if (focus === "meter") {
    rows = unit.allowedMeters.map(meter => ({
      label: `${meter.numerator}/${meter.denominator}`,
      identity: meterIdentity(meter),
      value: `${meter.numerator}/${meter.denominator}`,
    }));
  } else if (focus === "grouping") {
    rows = unit.allowedMeters.map(meter => {
      const info = deriveMeter(meter);
      return {
        label: `${info.pulseCount} phách, mỗi phách ${info.pulseTicks} ticks (${info.groups.join("+")})`,
        identity: groupingIdentity(meter),
        value: JSON.stringify({
          pulseCount: info.pulseCount,
          pulseTicks: info.pulseTicks,
          groups: info.groups,
          pulseUnit: info.pulseUnit,
        }),
      };
    });
  } else {
    const hasFeature =
      focus === "dot"
        ? pattern.measures.some(measure =>
            measure.segments.some(segment => segment.duration.dots > 0)
          )
        : pattern.measures.some(measure =>
            measure.segments.some(segment => segment.tieGroupId !== undefined)
          );
    const kind = focus === "dot" ? "contains-dot" : "contains-tie";
    rows = [false, true].map(value => ({
      label: value ? "Có" : "Không có",
      identity: JSON.stringify([kind, value]),
      value,
    }));
    if (!hasFeature) {
      throw new RangeError(`The generated pattern does not contain the ${focus} focus.`);
    }
  }

  const segmentFocus = focus === "note-rest" || focus === "duration";
  const correct = expectedIdentity({
    id: `mc-${String(track)}-${seed}`,
    kind: "multiple-choice",
    track,
    section,
    focus,
    prompt: {
      text: "",
      ...(segmentFocus
        ? { segmentId: pattern.measures[0].segments[0].id }
        : {}),
    },
    target: pattern,
    options: [],
    correctCanonicalIdentity: "",
  });
  const uniqueRows = rows.filter(
    (row, index) => rows.findIndex(item => item.identity === row.identity) === index
  );
  if (uniqueRows.length < 2 || !uniqueRows.some(row => row.identity === correct)) {
    throw new RangeError(`Insufficient canonical distractors for ${focus}.`);
  }
  return Object.freeze(
    seededShuffle(
      uniqueRows.map((row, index) =>
        makeOption(index, row.label, row.identity, row.value)
      ),
      createSeededRandom(`${seed}/options`)
    )
  );
}

function generatorFocus(focus: MultipleChoiceFocus): RhythmFocus | undefined {
  if (focus === "dot") return "dots";
  if (focus === "tie") return "ties";
  return undefined;
}

export function generateMultipleChoiceExercise(input: Readonly<{
  track: RhythmTrack;
  seed: string;
  focus: MultipleChoiceFocus;
  section?: CurriculumSection;
  meter?: RhythmPattern["meter"];
}>): MultipleChoiceExercise {
  if (!input.seed.trim()) throw new RangeError("Multiple Choice requires a seed.");
  const section = input.section ?? "practice";
  requireExerciseKindAllowed(input.track, section, "multiple-choice" satisfies RhythmExerciseKind);
  const curriculum = getCurriculumUnit(input.track);
  if (!curriculum.multipleChoiceFocuses.includes(input.focus)) {
    throw new RangeError(`${input.focus} is not part of this curriculum track.`);
  }
  const focus = generatorFocus(input.focus);
  if (input.meter && !curriculum.allowedMeters.some(meter => meterIdentity(meter) === meterIdentity(input.meter!))) {
    throw new RangeError("The requested meter is not allowed in this curriculum track.");
  }
  if (
    (input.focus === "meter" || input.focus === "grouping") &&
    curriculum.allowedMeters.length < 2
  ) {
    throw new RangeError(`A ${input.focus} question needs distinct approved meters.`);
  }

  let target: RhythmPattern;
  let generation: RhythmChoiceSet | undefined;
  if (input.focus === "pattern") {
    generation = generateRhythmChoices({
      level: input.track,
      seed: input.seed,
      ...(input.meter ? { meter: input.meter } : {}),
      count: 4,
    });
    target = generation.target;
  } else {
    target = generateRhythmPattern({
      level: input.track,
      seed: `${input.seed}/target`,
      ...(input.meter ? { meter: input.meter } : {}),
      ...(focus ? { focus } : {}),
    });
    assertLevelConstraints(target, {
      level: input.track,
      seed: `${input.seed}/target`,
      meter: target.meter,
      pulseBpm: target.tempo.pulseBpm,
      bars: target.measures.length as 1 | 2,
      ...(focus ? { focus } : {}),
    });
  }

  const flat = target.measures.flatMap(measure => measure.segments);
  const promptSegment = flat[0];
  const prompt = Object.freeze({
    text: {
      pattern: "Chọn ký âm trùng khớp với mẫu.",
      "note-rest": "Đoạn được hỏi là nốt hay dấu lặng?",
      duration: "Trường độ của đoạn được hỏi là gì?",
      meter: "Mẫu này thuộc nhịp nào?",
      grouping: "Mẫu này có cấu trúc phách và nhóm nào?",
      dot: "Mẫu có chứa giá trị chấm dôi không?",
      tie: "Mẫu có chứa nối trường độ không?",
    }[input.focus],
    ...(["note-rest", "duration"].includes(input.focus)
      ? { segmentId: promptSegment.id }
      : {}),
  });
  const options = choicesForFocus(
    input.focus,
    input.track,
    section,
    target,
    input.seed,
    generation
  );
  const partial = {
    id: `mc-${String(input.track)}-${input.seed}`,
    kind: "multiple-choice" as const,
    track: input.track,
    section,
    focus: input.focus,
    prompt,
    target,
    options,
    correctCanonicalIdentity: "",
    ...(generation ? { generation } : {}),
  };
  const correctCanonicalIdentity = expectedIdentity(partial);
  if (!options.some(option => option.canonicalIdentity === correctCanonicalIdentity)) {
    throw new RangeError("Generated Multiple Choice options omit the canonical answer.");
  }
  return Object.freeze({ ...partial, correctCanonicalIdentity });
}

export function evaluateMultipleChoice(
  exercise: MultipleChoiceExercise,
  answer: unknown
): MultipleChoiceEvaluation {
  const canonical = requireValidRhythmPattern(exercise.target);
  const expectedCanonicalIdentity = expectedIdentity({
    ...exercise,
    target: canonical,
  });
  const answerIdentity =
    typeof answer === "object" &&
    answer !== null &&
    "canonicalIdentity" in answer &&
    typeof answer.canonicalIdentity === "string"
      ? answer.canonicalIdentity
      : null;
  const selectedKnownOption =
    answerIdentity !== null &&
    exercise.options.some(
      option => option.canonicalIdentity === answerIdentity
    );
  return Object.freeze({
    correct:
      selectedKnownOption &&
      answerIdentity === expectedCanonicalIdentity,
    selectedKnownOption,
    expectedCanonicalIdentity,
  });
}

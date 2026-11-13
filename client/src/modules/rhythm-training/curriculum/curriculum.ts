import { BONUS_POLICY, LEVEL_POLICIES } from "../generation/levels";
import type {
  RhythmExerciseKind,
  RhythmLevel,
  RhythmMeter,
  RhythmTrack,
  WrittenDuration,
} from "../types";
import type { RhythmFocus } from "../generation/levels";

export type CurriculumSection = "lessons" | "practice" | "assessment";
export type MultipleChoiceFocus =
  | "pattern"
  | "note-rest"
  | "duration"
  | "meter"
  | "grouping"
  | "dot"
  | "tie";
export type CountBeatFocus =
  | "pulse-positions"
  | "subdivision-positions"
  | "onset-positions"
  | "rest-positions"
  | "tie-continuations"
  | "group-starts"
  | "meter-semantics"
  | "event-at-position";

export type CurriculumLesson = Readonly<{
  id: string;
  title: string;
  objective: string;
  concepts: readonly string[];
}>;

export type RhythmCurriculumUnit = Readonly<{
  track: RhythmTrack;
  title: string;
  optional: boolean;
  overview: string;
  objectives: readonly string[];
  knowledge: readonly string[];
  allowedMeters: readonly RhythmMeter[];
  allowedDurations: readonly WrittenDuration[];
  allowedRestDurations: readonly WrittenDuration[];
  generationFocuses: readonly RhythmFocus[];
  lessons: readonly CurriculumLesson[];
  exerciseKinds: Readonly<
    Record<CurriculumSection, readonly RhythmExerciseKind[]>
  >;
  optionalExerciseKinds: readonly RhythmExerciseKind[];
  requiredAssessmentMeters: readonly RhythmMeter[];
  requiredAssessmentKinds: readonly RhythmExerciseKind[];
  assessmentAllocation: "unspecified" | "pending-technical-specification";
  multipleChoiceFocuses: readonly MultipleChoiceFocus[];
  countBeatFocuses: readonly CountBeatFocus[];
}>;

const foundationKinds = Object.freeze([
  "multiple-choice",
  "listen-identify",
] as const);
const foundationTapKinds = Object.freeze([
  ...foundationKinds,
  "tap-rhythm",
] as const);
const fullKinds = Object.freeze([
  "multiple-choice",
  "tap-rhythm",
  "listen-identify",
  "count-beat",
] as const);
const bonusAssessmentKinds = Object.freeze([
  "multiple-choice",
  "listen-identify",
  "count-beat",
] as const);
const bonusTapAssessmentKinds = Object.freeze([
  ...bonusAssessmentKinds,
  "tap-rhythm",
] as const);
const mcBasic = Object.freeze(["pattern", "note-rest", "duration"] as const);
const mcSimple = Object.freeze([...mcBasic, "meter", "grouping"] as const);
const mcDotsAndTies = Object.freeze([...mcSimple, "dot", "tie"] as const);
const countSimple = Object.freeze([
  "pulse-positions",
  "subdivision-positions",
  "onset-positions",
  "rest-positions",
  "group-starts",
  "meter-semantics",
  "event-at-position",
] as const);
const countWithTies = Object.freeze([
  ...countSimple,
  "tie-continuations",
] as const);

function makeLesson(
  track: RhythmTrack,
  index: number,
  title: string,
  objective: string,
  concepts: readonly string[]
): CurriculumLesson {
  return Object.freeze({
    id: `${track === "bonus" ? "bonus" : `level-${track}`}-lesson-${index}`,
    title,
    objective,
    concepts: Object.freeze([...concepts]),
  });
}

function policy(track: RhythmTrack) {
  return track === "bonus"
    ? BONUS_POLICY
    : LEVEL_POLICIES[track as RhythmLevel];
}

function unit(
  input: Omit<
    RhythmCurriculumUnit,
    | "allowedMeters"
    | "allowedDurations"
    | "allowedRestDurations"
    | "generationFocuses"
    | "requiredAssessmentMeters"
  >
): RhythmCurriculumUnit {
  const generationPolicy = policy(input.track);
  return Object.freeze({
    ...input,
    objectives: Object.freeze([...input.objectives]),
    knowledge: Object.freeze([...input.knowledge]),
    allowedMeters: generationPolicy.allowedMeters,
    allowedDurations: generationPolicy.durations,
    allowedRestDurations: generationPolicy.restDurations,
    generationFocuses: generationPolicy.supportedFocus,
    lessons: Object.freeze([...input.lessons]),
    exerciseKinds: Object.freeze({
      lessons: Object.freeze([...input.exerciseKinds.lessons]),
      practice: Object.freeze([...input.exerciseKinds.practice]),
      assessment: Object.freeze([...input.exerciseKinds.assessment]),
    }),
    optionalExerciseKinds: Object.freeze([...input.optionalExerciseKinds]),
    requiredAssessmentMeters: generationPolicy.allowedMeters,
    requiredAssessmentKinds: Object.freeze([...input.requiredAssessmentKinds]),
    multipleChoiceFocuses: Object.freeze([...input.multipleChoiceFocuses]),
    countBeatFocuses: Object.freeze([...input.countBeatFocuses]),
  });
}

/**
 * Curriculum V1 as immutable runtime data. This deliberately contains no fixed
 * question quotas; Level 6 requires all four kinds while their allocation is
 * still pending a separate technical specification and approval.
 */
export const RHYTHM_CURRICULUM: readonly RhythmCurriculumUnit[] = Object.freeze(
  [
    unit({
      track: 1,
      title: "Nốt đen, nốt trắng, nốt tròn, dấu lặng đen",
      optional: false,
      overview:
        "Nhận diện trường độ cơ bản và dấu lặng đen trong scaffold 4/4.",
      objectives: [
        "Nhận diện quarter, half, whole note và quarter rest.",
        "Phân biệt onset với thời gian ngân và giữ đủ bốn quarter trong một ô 4/4.",
      ],
      knowledge: ["quarter", "half", "whole", "quarter-rest", "4/4"],
      lessons: [
        makeLesson(1, 1, "Quarter pulse", "Đếm bốn quarter pulses trong 4/4.", [
          "quarter",
          "barline",
        ]),
        makeLesson(
          1,
          2,
          "Note values",
          "Phân biệt trường độ quarter, half và whole.",
          ["quarter", "half", "whole"]
        ),
        makeLesson(1, 3, "Quarter rest", "Giữ pulse qua một quarter rest.", [
          "quarter-rest",
          "silence",
        ]),
      ],
      exerciseKinds: {
        lessons: foundationKinds,
        practice: foundationTapKinds,
        assessment: foundationTapKinds,
      },
      optionalExerciseKinds: [],
      requiredAssessmentKinds: foundationKinds,
      assessmentAllocation: "unspecified",
      multipleChoiceFocuses: mcBasic,
      countBeatFocuses: [],
    }),
    unit({
      track: 2,
      title: "Móc đơn, dấu lặng đơn, chia đôi phách",
      optional: false,
      overview:
        "Chia quarter pulse thành hai eighth positions trong scaffold 4/4.",
      objectives: [
        "Đọc eighth notes và eighth rests cùng các giá trị đã học.",
        "Hiểu binary subdivision mà không đưa meter transfer hoặc Tap Rhythm vào Level 2.",
      ],
      knowledge: ["eighth", "eighth-rest", "binary-subdivision", "4/4"],
      lessons: [
        makeLesson(
          2,
          1,
          "Two eighth positions",
          "Chia mỗi quarter thành hai eighth.",
          ["eighth", "binary-subdivision"]
        ),
        makeLesson(
          2,
          2,
          "Eighth rest",
          "Giữ duration và count khi một eighth position im lặng.",
          ["eighth-rest", "silence"]
        ),
        makeLesson(
          2,
          3,
          "Complete 4/4 bar",
          "Ghép cells thành ô 4/4 chính xác.",
          ["bar-fill", "4/4"]
        ),
      ],
      exerciseKinds: {
        lessons: foundationKinds,
        practice: foundationTapKinds,
        assessment: foundationTapKinds,
      },
      optionalExerciseKinds: [],
      requiredAssessmentKinds: foundationKinds,
      assessmentAllocation: "unspecified",
      multipleChoiceFocuses: mcBasic,
      countBeatFocuses: [],
    }),
    unit({
      track: 3,
      title: "Nhịp đơn, nốt chấm dôi và nối trường độ",
      optional: false,
      overview:
        "Kết hợp nốt chấm dôi, dấu nối và các trường độ đã học trong nhịp 2/4, 3/4, 4/4.",
      objectives: [
        "Nhận diện 2/4, 3/4, 4/4 và số quarter pulses tương ứng.",
        "Tính trường độ nốt đen chấm dôi và nốt trắng chấm dôi.",
        "Phân biệt dấu nối với chấm dôi và ghép các trường độ trong một ô nhịp.",
      ],
      knowledge: [
        "simple-meter",
        "2/4",
        "3/4",
        "4/4",
        "quarter-pulse",
        "eighth-subdivision",
        "dotted-quarter",
        "dotted-half",
        "tie",
        "tie-continuation",
      ],
      lessons: [
        makeLesson(3, 1, "Read the meter", "So sánh 2/4 và độ dài bar.", [
          "2/4",
          "meter",
        ]),
        makeLesson(
          3,
          2,
          "Dotted durations",
          "Tính dotted quarter và dotted half bằng tick arithmetic.",
          ["dot", "dotted-quarter", "dotted-half"]
        ),
        makeLesson(
          3,
          3,
          "Ties and continuation",
          "Nối note segments mà không tạo attack thứ hai.",
          ["tie", "tie-continuation", "onset"]
        ),
        makeLesson(
          3,
          4,
          "Combined rhythms in simple meter",
          "Ghép dotted values, ties, notes và rests trong 2/4, 3/4, 4/4.",
          ["combined-rhythm", "simple-meter", "rest"]
        ),
      ],
      exerciseKinds: {
        lessons: fullKinds,
        practice: fullKinds,
        assessment: fullKinds,
      },
      optionalExerciseKinds: [],
      requiredAssessmentKinds: fullKinds,
      assessmentAllocation: "unspecified",
      multipleChoiceFocuses: mcDotsAndTies,
      countBeatFocuses: countWithTies,
    }),
    unit({
      track: 4,
      title: "Móc kép, móc giật và đòn gánh",
      optional: false,
      overview:
        "Kế thừa dot và tie ở Level 3; tiến từ lưới sixteenth sang snap, sandwich, rồi tổ hợp có kiểm soát với dots/ties.",
      objectives: [
        "Đọc bốn vị trí sixteenth trong một quarter pulse và nhận diện dấu lặng tương ứng.",
        "Nhận diện dotted-eighth–sixteenth snap và sixteenth–eighth–sixteenth sandwich.",
        "Tổ hợp dots/ties đã học ở Level 3 với subdivisions mới theo độ khó tăng dần, vẫn exact-fill.",
        "Phân biệt onset mới với tie continuation khi đọc các subdivisions.",
      ],
      knowledge: [
        "sixteenth",
        "sixteenth-rest",
        "four-part-subdivision",
        "subdivision-grid",
        "dotted-quarter",
        "dotted-half",
        "dotted-eighth",
        "tie",
        "tie-continuation",
        "dotted-eighth-sixteenth-snap",
        "sixteenth-eighth-sixteenth-sandwich",
        "progressive-density",
      ],
      lessons: [
        makeLesson(
          4,
          1,
          "Four-part grid",
          "Đọc bốn sixteenth positions trong một quarter.",
          ["sixteenth", "subdivision"]
        ),
        makeLesson(
          4,
          2,
          "Snap: dotted eighth plus sixteenth",
          "Đọc móc giật dotted eighth–sixteenth đúng tổng một quarter pulse.",
          ["dotted-eighth", "sixteenth", "snap"]
        ),
        makeLesson(
          4,
          3,
          "Sandwich: sixteenth–eighth–sixteenth",
          "Đọc đòn gánh 16th–8th–16th trên đúng một quarter pulse.",
          ["sixteenth", "eighth", "sandwich"]
        ),
        makeLesson(
          4,
          4,
          "Inherited concepts and mixed density",
          "Bắt đầu bằng dot hoặc tie đã học, rồi ghép với móc kép, snap hoặc sandwich; giữ tối đa hai nguồn khó tương tác.",
          ["subdivision", "dot", "tie", "progressive-density"]
        ),
      ],
      exerciseKinds: {
        lessons: fullKinds,
        practice: fullKinds,
        assessment: fullKinds,
      },
      optionalExerciseKinds: [],
      requiredAssessmentKinds: fullKinds,
      assessmentAllocation: "unspecified",
      multipleChoiceFocuses: mcDotsAndTies,
      countBeatFocuses: countWithTies,
    }),
    unit({
      track: 5,
      title: "Liên ba và tổ hợp tiết tấu phức tạp",
      optional: false,
      overview:
        "Giới thiệu riêng liên 3 đen và liên 3 đơn bằng timing 3:2 thực, sau đó phối hợp có kiểm soát với vocabulary Level 1–4.",
      objectives: [
        "Đọc ba nốt quarter-triplet trong 960 ticks và ba nốt eighth-triplet trong 480 ticks.",
        "Kết hợp liên ba với dots, ties, sixteenths, snap, sandwich và các trường độ đã học, tối đa hai nguồn khó.",
        "Đọc tổ hợp phức tạp có kiểm soát mà không làm sai bar fill, tỷ lệ 3:2 hoặc quy tắc dấu lặng.",
      ],
      knowledge: [
        "sixteenth",
        "sixteenth-rest",
        "quarter-note-triplet-3-to-2",
        "eighth-note-triplet-3-to-2",
        "actual-duration-320-ticks",
        "actual-duration-160-ticks",
        "dotted-eighth",
        "dotted-quarter",
        "dotted-half",
        "tie",
        "multi-duration-combination",
        "syncopation",
      ],
      lessons: [
        makeLesson(
          5,
          1,
          "Quarter-note triplets",
          "Chia hai quarter pulses thành ba quarter-triplet onsets cách nhau 320 ticks.",
          ["quarter-triplet", "3:2", "320-ticks"]
        ),
        makeLesson(
          5,
          2,
          "Eighth-note triplets",
          "Chia một quarter pulse thành ba eighth-triplet onsets cách nhau 160 ticks.",
          ["eighth-triplet", "3:2", "160-ticks"]
        ),
        makeLesson(
          5,
          3,
          "Triplets with learned vocabulary",
        "Kết hợp một nhóm liên ba với một nguồn đã học (dot, tie hoặc móc kép); giữ ngân sách tối đa hai nguồn khó.",
          ["triplet-combined", "dot", "tie", "sixteenth"]
        ),
        makeLesson(
          5,
          4,
          "Progressive complex rhythms",
          "Tăng dần mật độ và kết hợp nhiều trường độ nhưng giữ đúng tỷ lệ 3:2.",
          ["complex-combination", "progressive-density", "3:2"]
        ),
      ],
      exerciseKinds: {
        lessons: fullKinds,
        practice: fullKinds,
        assessment: fullKinds,
      },
      optionalExerciseKinds: [],
      requiredAssessmentKinds: fullKinds,
      assessmentAllocation: "unspecified",
      multipleChoiceFocuses: mcDotsAndTies,
      countBeatFocuses: countWithTies,
    }),
    unit({
      track: 6,
      title: "Grouping in Threes: 3/8, 6/8, 9/8",
      optional: false,
      overview:
        "Một unit thống nhất, tiến triển từ một, hai đến ba groups mà không nhập nhằng simple/compound pulse.",
      objectives: [
        "Giữ 3/8 là ba eighth pulses riêng; không biến thành một compound pulse.",
        "Phân biệt 6/8 có hai dotted-quarter pulses với 9/8 có ba.",
        "Combined assessment phải bao gồm cả bốn exercise kinds; quota/phân bổ chi tiết chưa được phê duyệt.",
      ],
      knowledge: [
        "3/8",
        "6/8",
        "9/8",
        "simple-triple",
        "compound-duple",
        "compound-triple",
        "grouping-in-threes",
        "dots",
        "ties",
      ],
      lessons: [
        makeLesson(
          6,
          1,
          "One group of three eighths",
          "Đếm ba eighth pulses độc lập trong 3/8.",
          ["3/8", "simple-triple"]
        ),
        makeLesson(
          6,
          2,
          "Two groups",
          "Đếm hai dotted-quarter pulses 720 ticks trong 6/8.",
          ["6/8", "compound-duple", "group-starts"]
        ),
        makeLesson(
          6,
          3,
          "Three groups",
          "Đếm ba dotted-quarter pulses 720 ticks trong 9/8.",
          ["9/8", "compound-triple", "group-starts"]
        ),
        makeLesson(
          6,
          4,
          "Compare and analyze",
          "So sánh accents, rests, dots, ties và onset positions.",
          ["meter-semantics", "rest", "dot", "tie"]
        ),
      ],
      exerciseKinds: {
        lessons: fullKinds,
        practice: fullKinds,
        assessment: fullKinds,
      },
      optionalExerciseKinds: [],
      requiredAssessmentKinds: fullKinds,
      assessmentAllocation: "pending-technical-specification",
      multipleChoiceFocuses: mcDotsAndTies,
      countBeatFocuses: countWithTies,
    }),
    unit({
      track: "bonus",
      title: "Bonus — 2/2 Alla Breve",
      optional: true,
      overview:
        "Progression tùy chọn với hai half-note pulses; được hỗ trợ trong V1 nhưng không phải điều kiện tốt nghiệp.",
      objectives: [
        "Nhận diện hai half-note pulses tại tick 0 và 960 trong một bar 2/2.",
        "So sánh pulse half của 2/2 với 4/4 mà không đồng nhất meter semantics.",
      ],
      knowledge: ["2/2", "alla-breve", "half-pulse", "2/2-versus-4/4"],
      lessons: [
        makeLesson(
          "bonus",
          1,
          "Half-note pulse",
          "Đếm hai half-note pulses trong 2/2.",
          ["2/2", "half-pulse"]
        ),
        makeLesson(
          "bonus",
          2,
          "Compare 2/2 and 4/4",
          "So sánh pulse unit dù bar capacity bằng nhau.",
          ["2/2", "4/4", "meter-semantics"]
        ),
      ],
      exerciseKinds: {
        lessons: foundationKinds,
        practice: bonusAssessmentKinds,
        assessment: bonusTapAssessmentKinds,
      },
      optionalExerciseKinds: ["tap-rhythm"],
      requiredAssessmentKinds: bonusAssessmentKinds,
      assessmentAllocation: "unspecified",
      multipleChoiceFocuses: mcSimple,
      countBeatFocuses: countSimple,
    }),
  ]
);

const unitsByTrack = new Map<RhythmTrack, RhythmCurriculumUnit>(
  RHYTHM_CURRICULUM.map(item => [item.track, item])
);

export function getRhythmCurriculum(): readonly RhythmCurriculumUnit[] {
  return RHYTHM_CURRICULUM;
}

export function getCurriculumUnit(track: RhythmTrack): RhythmCurriculumUnit {
  const item = unitsByTrack.get(track);
  if (!item)
    throw new RangeError("Unsupported Rhythm Training curriculum track.");
  return item;
}

export function isExerciseKindAllowed(
  track: RhythmTrack,
  section: CurriculumSection,
  kind: RhythmExerciseKind
): boolean {
  const item = getCurriculumUnit(track);
  return (
    item.exerciseKinds[section].includes(kind) ||
    (section === "practice" && item.optionalExerciseKinds.includes(kind))
  );
}

export function requireExerciseKindAllowed(
  track: RhythmTrack,
  section: CurriculumSection,
  kind: RhythmExerciseKind
): void {
  if (!isExerciseKindAllowed(track, section, kind)) {
    throw new RangeError(
      `${kind} is not placed in ${section} for Rhythm Training ${String(track)}.`
    );
  }
}

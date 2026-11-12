import type { RhythmPattern, RhythmTrack } from "../types";
import {
  deriveMeter,
  deriveMeterStructure,
  getDefaultPulseBpm,
} from "../rhythm/meters";
import { PPQ } from "../rhythm/durations";
import { requireValidRhythmPattern } from "../rhythm/validate";

export type QuizTrack = RhythmTrack;
export type QuizOption = Readonly<{ id: string; label: string }>;
export type QuizNotation =
  | Readonly<{
      kind: "canonical";
      pattern: RhythmPattern;
      caption: string;
    }>
  | Readonly<{
      kind: "illustrative-3-8-partial";
      caption: string;
    }>;
export type QuizQuestion = Readonly<{
  id: string;
  track: QuizTrack;
  concept: string;
  prompt: string;
  options: readonly QuizOption[];
  correctOptionId: string;
  explanation: string;
  notation?: QuizNotation;
}>;

const option = (id: string, label: string): QuizOption => ({ id, label });
function makeQuestion(
  track: QuizTrack,
  id: string,
  concept: string,
  prompt: string,
  options: readonly QuizOption[],
  correctOptionId: string,
  explanation: string,
  notation?: QuizNotation
): QuizQuestion {
  if (!options.some(candidate => candidate.id === correctOptionId)) {
    throw new Error(`Question ${id} refers to an unknown canonical option id`);
  }
  return {
    id,
    track,
    concept,
    prompt,
    options,
    correctOptionId,
    explanation,
    ...(notation ? { notation } : {}),
  };
}

function canonicalPattern(
  id: string,
  meter: RhythmPattern["meter"],
  segments: readonly Readonly<{
    id: string;
    kind?: "note" | "rest";
    denominator: 1 | 2 | 4 | 8 | 16;
    dots?: 0 | 1;
    tieGroupId?: string;
  }>[]
): RhythmPattern {
  return requireValidRhythmPattern({
    id,
    meter,
    tempo: { pulseBpm: getDefaultPulseBpm(meter) },
    measures: [
      {
        id: `${id}-measure-1`,
        segments: segments.map(segment => ({
          id: segment.id,
          kind: segment.kind ?? "note",
          duration: {
            denominator: segment.denominator,
            dots: segment.dots ?? 0,
          },
          ...(segment.tieGroupId ? { tieGroupId: segment.tieGroupId } : {}),
        })),
      },
    ],
  });
}

function meterPattern(
  meter: RhythmPattern["meter"],
  id: string
): RhythmPattern {
  const { measureTicks, pulseTicks, pulseUnit } = deriveMeter(meter);
  const segments: {
    id: string;
    denominator: 1 | 2 | 4 | 8 | 16;
    dots: 0 | 1;
  }[] = [];
  if (pulseUnit.denominator === 2) {
    for (let index = 0; index < measureTicks / (PPQ * 2); index += 1) {
      segments.push({
        id: `${id}-pulse-${index + 1}`,
        denominator: 2,
        dots: 0,
      });
    }
  } else if (pulseUnit.denominator === 4 && pulseUnit.dots === 0) {
    for (let index = 0; index < measureTicks / PPQ; index += 1) {
      segments.push({ id: `${id}-beat-${index + 1}`, denominator: 4, dots: 0 });
    }
  } else {
    for (let index = 0; index < measureTicks / (PPQ / 2); index += 1) {
      segments.push({
        id: `${id}-eighth-${index + 1}`,
        denominator: 8,
        dots: 0,
      });
    }
  }
  if (
    segments.reduce(
      (sum, segment) =>
        sum +
        (segment.denominator === 2
          ? PPQ * 2
          : segment.denominator === 4
            ? PPQ
            : segment.denominator === 8
              ? PPQ / 2
              : 0),
      0
    ) !== measureTicks
  ) {
    throw new Error(
      `Notation fixture ${id} does not match canonical pulse ticks ${pulseTicks}`
    );
  }
  return canonicalPattern(id, meter, segments);
}

const fourFour: RhythmPattern["meter"] = { numerator: 4, denominator: 4 };
const twoFour: RhythmPattern["meter"] = { numerator: 2, denominator: 4 };
const threeFour: RhythmPattern["meter"] = { numerator: 3, denominator: 4 };
const threeEight: RhythmPattern["meter"] = { numerator: 3, denominator: 8 };
const sixEight: RhythmPattern["meter"] = { numerator: 6, denominator: 8 };
const nineEight: RhythmPattern["meter"] = { numerator: 9, denominator: 8 };
const twoTwo: RhythmPattern["meter"] = { numerator: 2, denominator: 2 };
const pulseCountWord: Readonly<Record<number, string>> = {
  1: "one",
  2: "two",
  4: "four",
};

function meterIdentityQuestions(
  track: QuizTrack,
  meter: RhythmPattern["meter"],
  label: string
): QuizQuestion {
  const signature = `${meter.numerator}-${meter.denominator}`;
  const meterOptions =
    track === 3
      ? [
          option("meter-2-4", "2/4"),
          option("meter-3-4", "3/4"),
          option("meter-4-4", "4/4"),
          option("meter-5-4", "5/4"),
        ]
      : track === 6
        ? [
            option("meter-3-8", "3/8"),
            option("meter-6-8", "6/8"),
            option("meter-9-8", "9/8"),
            option("meter-12-8", "12/8"),
          ]
        : track === "bonus"
          ? [
              option("meter-2-2", "2/2"),
              option("meter-2-4", "2/4"),
              option("meter-4-4", "4/4"),
              option("meter-3-2", "3/2"),
            ]
          : [
              option("meter-2-4", "2/4"),
              option("meter-3-4", "3/4"),
              option("meter-4-4", "4/4"),
            ];
  return makeQuestion(
    track,
    `${label}-identify-meter`,
    "meter-identification",
    "Hãy xác định số chỉ nhịp được viết trong ô nhịp hoàn chỉnh.",
    meterOptions,
    `meter-${signature}`,
    `Khuông nhạc ghi ${meter.numerator}/${meter.denominator}; đây là một ô nhịp hoàn chỉnh theo số chỉ nhịp đó.`,
    {
      kind: "canonical",
      pattern: meterPattern(meter, `${label}-canonical-staff`),
      caption: "Ô nhịp hoàn chỉnh được viết theo mô hình canonical.",
    }
  );
}

const l1: QuizQuestion[] = [
  makeQuestion(
    1,
    "l1-four-four-quarter-beats",
    "4-4-scaffold",
    "Trong khung 4/4, một ô nhịp có bao nhiêu phách nốt đen?",
    [
      option("quarter-beats-2", "2 phách nốt đen"),
      option("quarter-beats-3", "3 phách nốt đen"),
      option("quarter-beats-4", "4 phách nốt đen"),
    ],
    "quarter-beats-4",
    "Khung 4/4 có bốn phách; ở đây mỗi phách là một nốt đen."
  ),
  makeQuestion(
    1,
    "l1-quarter-value",
    "quarter-note",
    "Một nốt đen có giá trị bao nhiêu phách trong khung này?",
    [
      option("quarter-value-half", "Nửa phách"),
      option("quarter-value-one", "1 phách"),
      option("quarter-value-two", "2 phách"),
    ],
    "quarter-value-one",
    "Một nốt đen là một phách trong khung 4/4."
  ),
  makeQuestion(
    1,
    "l1-half-value",
    "half-note",
    "Một nốt trắng bằng bao nhiêu nốt đen?",
    [
      option("half-as-one-quarter", "1 nốt đen"),
      option("half-as-two-quarters", "2 nốt đen"),
      option("half-as-four-quarters", "4 nốt đen"),
    ],
    "half-as-two-quarters",
    "Nốt trắng kéo dài bằng hai nốt đen."
  ),
  makeQuestion(
    1,
    "l1-whole-value",
    "whole-note",
    "Một nốt tròn bằng bao nhiêu nốt đen?",
    [
      option("whole-as-two-quarters", "2 nốt đen"),
      option("whole-as-three-quarters", "3 nốt đen"),
      option("whole-as-four-quarters", "4 nốt đen"),
    ],
    "whole-as-four-quarters",
    "Nốt tròn kéo dài bằng bốn nốt đen."
  ),
  makeQuestion(
    1,
    "l1-quarter-rest-value",
    "quarter-rest",
    "Dấu lặng đen chiếm bao nhiêu phách?",
    [
      option("quarter-rest-half", "Nửa phách"),
      option("quarter-rest-one", "1 phách"),
      option("quarter-rest-two", "2 phách"),
    ],
    "quarter-rest-one",
    "Dấu lặng đen im lặng trong đúng một phách nốt đen."
  ),
  makeQuestion(
    1,
    "l1-two-half-notes",
    "half-note",
    "Hai nốt trắng chiếm tổng cộng bao nhiêu phách nốt đen?",
    [
      option("two-halves-two", "2 phách"),
      option("two-halves-four", "4 phách"),
      option("two-halves-eight", "8 phách"),
    ],
    "two-halves-four",
    "Mỗi nốt trắng dài hai phách; hai nốt trắng dài bốn phách."
  ),
  makeQuestion(
    1,
    "l1-one-whole-fills",
    "whole-note",
    "Trong khung 4/4, nốt nào một mình có thể lấp đầy ô nhịp?",
    [
      option("fills-with-quarter", "Nốt đen"),
      option("fills-with-half", "Nốt trắng"),
      option("fills-with-whole", "Nốt tròn"),
    ],
    "fills-with-whole",
    "Nốt tròn dài bốn phách nốt đen, bằng dung lượng một ô 4/4."
  ),
  makeQuestion(
    1,
    "l1-two-beat-note",
    "half-note",
    "Nốt nào kéo dài hai phách nốt đen?",
    [
      option("two-beats-quarter", "Nốt đen"),
      option("two-beats-half", "Nốt trắng"),
      option("two-beats-whole", "Nốt tròn"),
    ],
    "two-beats-half",
    "Nốt trắng có trường độ hai nốt đen."
  ),
  makeQuestion(
    1,
    "l1-quarter-rest-name",
    "quarter-rest",
    "Dấu lặng đen tạo ra điều gì trong một phách?",
    [
      option("rest-l1-silence-one", "Một phách im lặng"),
      option("rest-l1-silence-two", "Hai phách im lặng"),
      option("rest-l1-no-duration", "Không chiếm trường độ"),
    ],
    "rest-l1-silence-one",
    "Dấu lặng đen im lặng trong đúng một phách nốt đen."
  ),
  makeQuestion(
    1,
    "l1-whole-note-staff",
    "whole-note",
    "Nốt tròn trên khuông nhạc hoàn chỉnh này chiếm bao nhiêu phách?",
    [
      option("staff-whole-2", "2 phách nốt đen"),
      option("staff-whole-3", "3 phách nốt đen"),
      option("staff-whole-4", "4 phách nốt đen"),
    ],
    "staff-whole-4",
    "Nốt tròn có trường độ bốn nốt đen và lấp đầy ô 4/4.",
    {
      kind: "canonical",
      pattern: canonicalPattern("l1-whole-note-complete-bar", fourFour, [
        { id: "l1-whole-note", denominator: 1 },
      ]),
      caption: "Nốt tròn trong một ô 4/4 hoàn chỉnh.",
    }
  ),
];

const l2: QuizQuestion[] = [
  makeQuestion(
    2,
    "l2-quarter-two-eighths",
    "quarter-eighth-equivalence",
    "Một nốt đen bằng bao nhiêu nốt móc đơn?",
    [
      option("quarter-to-one-eighth", "1 nốt móc đơn"),
      option("quarter-to-two-eighths", "2 nốt móc đơn"),
      option("quarter-to-four-eighths", "4 nốt móc đơn"),
    ],
    "quarter-to-two-eighths",
    "Một nốt đen chia nhị phân thành hai nốt móc đơn bằng nhau."
  ),
  makeQuestion(
    2,
    "l2-eighth-rest",
    "eighth-rest",
    "Dấu lặng móc đơn chiếm bao nhiêu thời gian?",
    [
      option("eighth-rest-quarter", "1 phách nốt đen"),
      option("eighth-rest-half-quarter", "Nửa phách nốt đen"),
      option("eighth-rest-two", "2 phách nốt đen"),
    ],
    "eighth-rest-half-quarter",
    "Dấu lặng móc đơn im lặng trong thời gian của một nốt móc đơn, bằng nửa nốt đen."
  ),
  makeQuestion(
    2,
    "l2-binary-subdivision",
    "binary-subdivision",
    "Trong chia phách nhị phân, một phách nốt đen được chia đều thành bao nhiêu phần?",
    [
      option("binary-two", "2 phần bằng nhau"),
      option("binary-three", "3 phần bằng nhau"),
      option("binary-four", "4 phần bằng nhau"),
    ],
    "binary-two",
    "Chia phách nhị phân nghĩa là chia một phách thành hai phần bằng nhau."
  ),
  makeQuestion(
    2,
    "l2-eighth-is-half-quarter",
    "quarter-eighth-equivalence",
    "Một nốt móc đơn bằng phần nào của một nốt đen?",
    [
      option("l2-eighth-quarter-one-fourth", "Một phần tư"),
      option("l2-eighth-quarter-half", "Một nửa"),
      option("l2-eighth-quarter-whole", "Toàn bộ"),
    ],
    "l2-eighth-quarter-half",
    "Hai nốt móc đơn bằng một nốt đen; mỗi móc đơn bằng một nửa."
  ),
  makeQuestion(
    2,
    "l2-two-eighths-one-beat",
    "quarter-eighth-equivalence",
    "Hai nốt móc đơn bằng trường độ của nốt nào?",
    [
      option("two-eighth-quarter", "Nốt đen"),
      option("two-eighth-half", "Nốt trắng"),
      option("two-eighth-whole", "Nốt tròn"),
    ],
    "two-eighth-quarter",
    "Hai móc đơn bằng một nốt đen."
  ),
  makeQuestion(
    2,
    "l2-eighth-rest-silence",
    "eighth-rest",
    "Một dấu lặng móc đơn có làm mất trường độ trong ô nhịp không?",
    [
      option("rest-does-not-occupy", "Có; thời gian đó biến mất"),
      option("rest-occupies-duration", "Không; dấu lặng vẫn chiếm trường độ"),
      option("rest-adds-duration", "Không; dấu lặng cộng thêm một phách"),
    ],
    "rest-occupies-duration",
    "Dấu lặng tạo im lặng nhưng vẫn chiếm đúng trường độ được viết."
  ),
  makeQuestion(
    2,
    "l2-half-quarter-beat",
    "binary-subdivision",
    "Một móc đơn có trường độ bằng phần nào của một phách nốt đen?",
    [
      option("eighth-quarter-whole", "Cả phách"),
      option("eighth-quarter-half", "Nửa phách"),
      option("eighth-quarter-two", "Hai phách"),
    ],
    "eighth-quarter-half",
    "Một móc đơn bằng nửa nốt đen."
  ),
  makeQuestion(
    2,
    "l2-pair-completes-quarter",
    "quarter-eighth-equivalence",
    "Cặp nào có tổng trường độ đúng bằng một nốt đen?",
    [
      option("pair-one-eighth", "Một móc đơn"),
      option("pair-two-eighths", "Hai móc đơn"),
      option("pair-two-quarters", "Hai nốt đen"),
    ],
    "pair-two-eighths",
    "Hai móc đơn bằng một nốt đen."
  ),
  makeQuestion(
    2,
    "l2-eighth-rest-value",
    "eighth-rest",
    "Dấu lặng móc đơn có trường độ bằng nốt nào?",
    [
      option("rest-value-quarter", "Nốt đen"),
      option("rest-value-eighth", "Nốt móc đơn"),
      option("rest-value-half", "Nốt trắng"),
    ],
    "rest-value-eighth",
    "Dấu lặng móc đơn có trường độ của nốt móc đơn."
  ),
  makeQuestion(
    2,
    "l2-eighth-split-staff",
    "binary-subdivision",
    "Hai móc đơn nhìn thấy trong ô 4/4 này tạo thành bao nhiêu phách nốt đen?",
    [
      option("staff-eighths-half", "Nửa phách"),
      option("staff-eighths-one", "1 phách"),
      option("staff-eighths-two", "2 phách"),
    ],
    "staff-eighths-one",
    "Hai móc đơn bằng một phách nốt đen.",
    {
      kind: "canonical",
      pattern: canonicalPattern("l2-eighth-pair-staff", fourFour, [
        { id: "l2-eighth-a", denominator: 8 },
        { id: "l2-eighth-b", denominator: 8 },
        { id: "l2-quarter-a", denominator: 4 },
        { id: "l2-quarter-b", denominator: 4 },
        { id: "l2-quarter-c", denominator: 4 },
      ]),
      caption: "Hai móc đơn và ba nốt đen trong ô 4/4 hoàn chỉnh.",
    }
  ),
];

const l3Meters = [twoFour, threeFour, fourFour] as const;
const l3: QuizQuestion[] = [
  ...l3Meters.map(meter => {
    const derived = deriveMeter(meter);
    return makeQuestion(
      3,
      `l3-${meter.numerator}-4-pulse-count`,
      "simple-meter-pulses",
      `Nhịp ${meter.numerator}/4 có bao nhiêu phách nốt đen trong một ô?`,
      [
        option("simple-pulses-2", "2 phách"),
        option("simple-pulses-3", "3 phách"),
        option("simple-pulses-4", "4 phách"),
        option("simple-pulses-5", "5 phách"),
      ],
      `simple-pulses-${derived.pulseCount}`,
      `deriveMeter xác định ${meter.numerator}/4 có ${derived.pulseCount} phách; mỗi phách là nốt đen.`
    );
  }),
  ...l3Meters.map(meter =>
    meterIdentityQuestions(3, meter, `l3-${meter.numerator}-4`)
  ),
  makeQuestion(
    3,
    "l3-three-four-meter",
    "simple-meter-pulses",
    "Một ô có ba phách nốt đen thuộc nhịp nào trong các lựa chọn?",
    [
      option("meter-2-4", "2/4"),
      option("meter-3-4", "3/4"),
      option("meter-4-4", "4/4"),
    ],
    "meter-3-4",
    "Trong các nhịp đơn được học, 3/4 có ba phách nốt đen."
  ),
  makeQuestion(
    3,
    "l3-two-four-meter",
    "simple-meter-pulses",
    "Nhịp nào có đúng hai phách nốt đen mỗi ô?",
    [
      option("meter-2-4", "2/4"),
      option("meter-3-4", "3/4"),
      option("meter-4-4", "4/4"),
    ],
    "meter-2-4",
    "2/4 có hai phách nốt đen mỗi ô."
  ),
  makeQuestion(
    3,
    "l3-four-four-meter",
    "simple-meter-pulses",
    "Nhịp nào có đúng bốn phách nốt đen mỗi ô?",
    [
      option("meter-2-4", "2/4"),
      option("meter-3-4", "3/4"),
      option("meter-4-4", "4/4"),
    ],
    "meter-4-4",
    "4/4 có bốn phách nốt đen mỗi ô."
  ),
  makeQuestion(
    3,
    "l3-pulse-unit",
    "simple-meter-pulses",
    "Trong các nhịp 2/4, 3/4 và 4/4, đơn vị phách là gì?",
    [
      option("l3-unit-eighth", "Nốt móc đơn"),
      option("l3-unit-quarter", "Nốt đen"),
      option("l3-unit-half", "Nốt trắng"),
    ],
    "l3-unit-quarter",
    "Các nhịp X/4 này dùng nốt đen làm đơn vị phách."
  ),
];

const dottedQuarterAndEighth = canonicalPattern(
  "l4-dotted-quarter-and-eighth",
  fourFour,
  [
    { id: "l4-dotted-quarter", denominator: 4, dots: 1 },
    { id: "l4-eighth", denominator: 8 },
    { id: "l4-half", denominator: 2 },
  ]
);
const tiedQuarterPair = canonicalPattern("l4-tied-quarter-pair", fourFour, [
  { id: "l4-tie-start", denominator: 4, tieGroupId: "l4-tie" },
  { id: "l4-tie-continuation", denominator: 4, tieGroupId: "l4-tie" },
  { id: "l4-final-half", denominator: 2 },
]);
const l3DottedAndTies: QuizQuestion[] = [
  makeQuestion(
    3,
    "l4-dotted-quarter",
    "dot-arithmetic",
    "Nốt đen chấm dôi kéo dài bao nhiêu phách nốt đen?",
    [
      option("dotted-quarter-one", "1 phách"),
      option("dotted-quarter-one-half", "1½ phách"),
      option("dotted-quarter-two", "2 phách"),
    ],
    "dotted-quarter-one-half",
    "Dấu chấm cộng thêm một nửa giá trị gốc: 1 + ½ = 1½ phách."
  ),
  makeQuestion(
    3,
    "l4-dotted-half",
    "dot-arithmetic",
    "Nốt trắng chấm dôi bằng bao nhiêu nốt đen?",
    [
      option("dotted-half-two", "2 nốt đen"),
      option("dotted-half-three", "3 nốt đen"),
      option("dotted-half-four", "4 nốt đen"),
    ],
    "dotted-half-three",
    "Nốt trắng dài hai nốt đen; dấu chấm thêm một nốt đen nữa."
  ),
  makeQuestion(
    3,
    "l4-dot-extension",
    "dot-arithmetic",
    "Dấu chấm sau nốt cộng thêm bao nhiêu so với trường độ gốc?",
    [
      option("dot-add-third", "Một phần ba giá trị gốc"),
      option("dot-add-half", "Một nửa giá trị gốc"),
      option("dot-add-double", "Gấp đôi giá trị gốc"),
    ],
    "dot-add-half",
    "Một dấu chấm làm tăng trường độ thêm một nửa giá trị của nốt không chấm."
  ),
  makeQuestion(
    3,
    "l4-dotted-quarter-eighth",
    "dot-arithmetic",
    "Một nốt đen chấm dôi cộng một móc đơn bằng bao nhiêu nốt đen?",
    [
      option("dotted-plus-eighth-one", "1 nốt đen"),
      option("dotted-plus-eighth-two", "2 nốt đen"),
      option("dotted-plus-eighth-three", "3 nốt đen"),
    ],
    "dotted-plus-eighth-two",
    "1½ phách cộng ½ phách bằng 2 phách."
  ),
  makeQuestion(
    3,
    "l4-dotted-quarter-eighths",
    "dot-arithmetic",
    "Một nốt đen chấm dôi có trường độ bằng bao nhiêu móc đơn?",
    [
      option("dotted-quarter-two-eighths", "2 móc đơn"),
      option("dotted-quarter-three-eighths", "3 móc đơn"),
      option("dotted-quarter-four-eighths", "4 móc đơn"),
    ],
    "dotted-quarter-three-eighths",
    "Một nốt đen bằng hai móc đơn; dấu chấm cộng thêm một móc đơn nữa."
  ),
  makeQuestion(
    3,
    "l4-tie-no-new-onset",
    "tie-continuation",
    "Khi hai nốt cùng cao độ được nối bằng dấu nối trường độ, nốt thứ hai làm gì?",
    [
      option("tie-new-onset", "Tạo một tiếng mới"),
      option("tie-no-onset", "Tiếp tục giữ tiếng trước, không tạo onset mới"),
      option("tie-rest", "Biến thành một dấu lặng"),
    ],
    "tie-no-onset",
    "Dấu nối trường độ gộp hai nốt liên tiếp cùng cao độ thành một tiếng kéo dài; nốt sau không có onset mới."
  ),
  makeQuestion(
    3,
    "l4-tied-quarter-total",
    "tie-continuation",
    "Hai nốt đen cùng cao độ được nối với nhau kéo dài tổng cộng bao lâu?",
    [
      option("tie-total-one", "1 phách"),
      option("tie-total-two", "2 phách"),
      option("tie-total-four", "4 phách"),
    ],
    "tie-total-two",
    "Hai trường độ nốt đen nối nhau tạo tiếng kéo dài hai phách nhưng chỉ có onset ở nốt đầu."
  ),
  makeQuestion(
    3,
    "l4-tie-notation",
    "tie-continuation",
    "Nốt ở vị trí thứ hai trong ví dụ được nối có phải là onset mới không?",
    [
      option("tie-example-yes", "Có, luôn phát lại nốt"),
      option("tie-example-no", "Không; đó là phần tiếp tục của tiếng trước"),
      option("tie-example-rest", "Không; đó là dấu lặng"),
    ],
    "tie-example-no",
    "Dấu nối làm nốt thứ hai tiếp tục trường độ, không khởi phát tiếng mới.",
    {
      kind: "canonical",
      pattern: tiedQuarterPair,
      caption:
        "Hai nốt đen nối trường độ, tiếp theo là nốt trắng; onset chỉ ở nốt đầu của cặp.",
    }
  ),
  makeQuestion(
    3,
    "l4-dotted-notation",
    "dot-arithmetic",
    "Nốt đen chấm dôi trong ví dụ kéo dài bao nhiêu phách?",
    [
      option("dotted-staff-one", "1 phách"),
      option("dotted-staff-one-half", "1½ phách"),
      option("dotted-staff-two", "2 phách"),
    ],
    "dotted-staff-one-half",
    "Trường độ viết là 1 nốt đen + một nửa nốt đen.",
    {
      kind: "canonical",
      pattern: dottedQuarterAndEighth,
      caption: "Nốt đen chấm dôi, móc đơn và nốt trắng trong ô 4/4.",
    }
  ),
  makeQuestion(
    3,
    "l4-dot-equals-half",
    "dot-arithmetic",
    "Một nốt trắng chấm dôi bằng nốt nào trong trường độ?",
    [
      option("dotted-half-two-quarters", "2 nốt đen"),
      option("dotted-half-three-quarters", "3 nốt đen"),
      option("dotted-half-four-quarters", "4 nốt đen"),
    ],
    "dotted-half-three-quarters",
    "Nốt trắng chấm dôi có giá trị 2 + 1 = 3 nốt đen."
  ),
];

const l5Sixteenths = canonicalPattern("l5-sixteenths-complete-bar", fourFour, [
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `l5-sixteenth-${index + 1}`,
    denominator: 16 as const,
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `l5-quarter-${index + 1}`,
    denominator: 4 as const,
  })),
]);
const l4: QuizQuestion[] = [
  makeQuestion(
    4,
    "l5-four-sixteenths-quarter",
    "sixteenth-subdivision",
    "Bốn nốt móc kép bằng trường độ của nốt nào?",
    [
      option("four-sixteenths-eighth", "Nốt móc đơn"),
      option("four-sixteenths-quarter", "Nốt đen"),
      option("four-sixteenths-half", "Nốt trắng"),
    ],
    "four-sixteenths-quarter",
    "Bốn móc kép bằng một nốt đen."
  ),
  makeQuestion(
    4,
    "l5-one-sixteenth-quarter",
    "sixteenth-subdivision",
    "Một móc kép bằng phần nào của nốt đen?",
    [
      option("one-sixteenth-quarter-half", "1/2"),
      option("one-sixteenth-quarter-fourth", "1/4"),
      option("one-sixteenth-quarter-eighth", "1/8"),
    ],
    "one-sixteenth-quarter-fourth",
    "Một nốt đen chia thành bốn móc kép bằng nhau."
  ),
  makeQuestion(
    4,
    "l5-sixteenth-rest",
    "sixteenth-rest",
    "Dấu lặng móc kép chiếm trường độ nào?",
    [
      option("sixteenth-rest-quarter", "Một nốt đen"),
      option("sixteenth-rest-eighth", "Một nốt móc đơn"),
      option("sixteenth-rest-sixteenth", "Một nốt móc kép"),
    ],
    "sixteenth-rest-sixteenth",
    "Dấu lặng móc kép im lặng trong đúng trường độ của một móc kép."
  ),
  makeQuestion(
    4,
    "l5-half-eight-sixteenths",
    "approved-note-values",
    "Một nốt trắng bằng bao nhiêu móc kép?",
    [
      option("half-sixteenths-four", "4 móc kép"),
      option("half-sixteenths-eight", "8 móc kép"),
      option("half-sixteenths-sixteen", "16 móc kép"),
    ],
    "half-sixteenths-eight",
    "Nốt trắng dài hai nốt đen; mỗi nốt đen bằng bốn móc kép, tổng cộng tám."
  ),
  makeQuestion(
    4,
    "l5-two-eighths-sixteenths",
    "sixteenth-subdivision",
    "Hai nốt móc đơn bằng bao nhiêu móc kép?",
    [
      option("two-eighths-two-sixteenths", "2 móc kép"),
      option("two-eighths-four-sixteenths", "4 móc kép"),
      option("two-eighths-eight-sixteenths", "8 móc kép"),
    ],
    "two-eighths-four-sixteenths",
    "Mỗi móc đơn bằng hai móc kép; hai móc đơn bằng bốn móc kép."
  ),
  makeQuestion(
    4,
    "l5-sixteenth-quarter-fill",
    "sixteenth-subdivision",
    "Bốn móc kép có tổng trường độ bao nhiêu phách nốt đen?",
    [
      option("sixteenth-fill-half", "Nửa phách"),
      option("sixteenth-fill-one", "1 phách"),
      option("sixteenth-fill-two", "2 phách"),
    ],
    "sixteenth-fill-one",
    "Bốn móc kép bằng một nốt đen, tức một phách."
  ),
  makeQuestion(
    4,
    "l5-rest-duration",
    "sixteenth-rest",
    "Dấu lặng móc kép có chiếm thời gian dù không phát ra âm không?",
    [
      option("sixteenth-rest-no-time", "Không, thời gian biến mất"),
      option("sixteenth-rest-time", "Có, nó vẫn chiếm một móc kép"),
      option("sixteenth-rest-beat", "Có, nó chiếm một nốt đen"),
    ],
    "sixteenth-rest-time",
    "Dấu lặng giữ nguyên trường độ viết; chỉ có âm thanh là im lặng."
  ),
  makeQuestion(
    4,
    "l5-whole-sixteenths",
    "approved-note-values",
    "Một nốt tròn bằng bao nhiêu móc kép?",
    [
      option("whole-sixteenths-eight", "8 móc kép"),
      option("whole-sixteenths-sixteen", "16 móc kép"),
      option("whole-sixteenths-thirty-two", "32 móc kép"),
    ],
    "whole-sixteenths-sixteen",
    "Nốt tròn bằng bốn nốt đen; mỗi nốt đen bằng bốn móc kép: 4 × 4 = 16."
  ),
  makeQuestion(
    4,
    "l5-sixteenth-staff",
    "sixteenth-subdivision",
    "Bốn móc kép đầu tiên trên khuông nhạc có trường độ bằng nốt nào?",
    [
      option("staff-sixteenths-eighth", "Nốt móc đơn"),
      option("staff-sixteenths-quarter", "Nốt đen"),
      option("staff-sixteenths-half", "Nốt trắng"),
    ],
    "staff-sixteenths-quarter",
    "Bốn móc kép lấp đúng trường độ một nốt đen.",
    {
      kind: "canonical",
      pattern: l5Sixteenths,
      caption: "Bốn móc kép đầu và ba nốt đen trong một ô 4/4 hoàn chỉnh.",
    }
  ),
  makeQuestion(
    4,
    "l5-quarter-approved-value",
    "approved-note-values",
    "Một nốt đen bằng bao nhiêu móc kép?",
    [
      option("quarter-sixteenths-two", "2 móc kép"),
      option("quarter-sixteenths-four", "4 móc kép"),
      option("quarter-sixteenths-eight", "8 móc kép"),
    ],
    "quarter-sixteenths-four",
    "Một nốt đen chia thành bốn móc kép bằng nhau."
  ),
];

const l5ComboPatterns = {
  dottedQuarterEighthHalf: canonicalPattern(
    "l5-combo-dotted-eighth-half",
    fourFour,
    [
      { id: "l5-combo-dotted-quarter", denominator: 4, dots: 1 },
      { id: "l5-combo-eighth", denominator: 8 },
      { id: "l5-combo-half", denominator: 2 },
    ]
  ),
  sixteenthsDottedEighthQuarter: canonicalPattern(
    "l5-combo-sixteenths-dotted-eighth-quarter",
    fourFour,
    [
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `l5-combo-sixteenth-${index + 1}`,
        denominator: 16 as const,
      })),
      { id: "l5-combo-dotted-quarter", denominator: 4, dots: 1 },
      { id: "l5-combo-eighth", denominator: 8 },
      { id: "l5-combo-quarter", denominator: 4 },
    ]
  ),
  tiedPairAndSixteenths: canonicalPattern(
    "l5-combo-tied-pair-sixteenths",
    fourFour,
    [
      { id: "l5-combo-tie-start", denominator: 4, tieGroupId: "l5-combo-tie" },
      {
        id: "l5-combo-tie-continuation",
        denominator: 4,
        tieGroupId: "l5-combo-tie",
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `l5-combo-tie-sixteenth-${index + 1}`,
        denominator: 16 as const,
      })),
      { id: "l5-combo-final-quarter", denominator: 4 },
    ]
  ),
  restDottedAndSixteenths: canonicalPattern(
    "l5-combo-rest-dotted-sixteenths",
    fourFour,
    [
      { id: "l5-combo-quarter-rest", kind: "rest", denominator: 4 },
      { id: "l5-combo-rest-dotted-quarter", denominator: 4, dots: 1 },
      { id: "l5-combo-rest-eighth", denominator: 8 },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `l5-combo-rest-sixteenth-${index + 1}`,
        denominator: 16 as const,
      })),
    ]
  ),
} as const;

const l5: QuizQuestion[] = [
  makeQuestion(
    5,
    "l5-combo-dotted-eighth-half",
    "complex-rhythm-combinations",
    "Trong ví dụ 4/4, nốt đen chấm dôi, móc đơn và nốt trắng lấp tổng cộng bao nhiêu phách?",
    [
      option("l5-combo-total-3", "3 phách"),
      option("l5-combo-total-4", "4 phách"),
      option("l5-combo-total-5", "5 phách"),
      option("l5-combo-total-6", "6 phách"),
    ],
    "l5-combo-total-4",
    "Nốt đen chấm dôi là 1½ phách, móc đơn là ½ phách, nốt trắng là 2 phách: tổng cộng 4 phách.",
    {
      kind: "canonical",
      pattern: l5ComboPatterns.dottedQuarterEighthHalf,
      caption: "Tổ hợp chấm dôi, móc đơn và nốt trắng trong ô 4/4.",
    }
  ),
  makeQuestion(
    5,
    "l5-combo-sixteenths-dotted-eighth-quarter",
    "complex-rhythm-combinations",
    "Trong ví dụ, bốn móc kép, nốt đen chấm dôi và móc đơn đầu tiên chiếm tổng cộng bao nhiêu phách?",
    [
      option("l5-combo-part-2", "2 phách"),
      option("l5-combo-part-2-half", "2½ phách"),
      option("l5-combo-part-3", "3 phách"),
      option("l5-combo-part-4", "4 phách"),
    ],
    "l5-combo-part-3",
    "Bốn móc kép bằng 1 phách; nốt đen chấm dôi là 1½; móc đơn là ½. Tổng cộng 3 phách.",
    {
      kind: "canonical",
      pattern: l5ComboPatterns.sixteenthsDottedEighthQuarter,
      caption: "Bốn móc kép, nốt đen chấm dôi, móc đơn và nốt đen trong ô 4/4.",
    }
  ),
  makeQuestion(
    5,
    "l5-combo-tied-pair-sixteenths",
    "complex-rhythm-combinations",
    "Trong ví dụ, cặp nốt đen nối trường độ cùng bốn móc kép chiếm bao nhiêu phách?",
    [
      option("l5-combo-tie-sixteenths-2", "2 phách"),
      option("l5-combo-tie-sixteenths-3", "3 phách"),
      option("l5-combo-tie-sixteenths-4", "4 phách"),
      option("l5-combo-tie-sixteenths-5", "5 phách"),
    ],
    "l5-combo-tie-sixteenths-3",
    "Hai nốt đen được nối giữ tiếng trong 2 phách; bốn móc kép bằng 1 phách, tổng cộng 3 phách.",
    {
      kind: "canonical",
      pattern: l5ComboPatterns.tiedPairAndSixteenths,
      caption: "Cặp nốt đen nối trường độ, bốn móc kép và một nốt đen.",
    }
  ),
  makeQuestion(
    5,
    "l5-combo-rest-dotted-sixteenths",
    "complex-rhythm-combinations",
    "Sau dấu lặng đen, nốt đen chấm dôi, móc đơn và bốn móc kép chiếm thêm bao nhiêu phách?",
    [
      option("l5-combo-after-rest-2", "2 phách"),
      option("l5-combo-after-rest-3", "3 phách"),
      option("l5-combo-after-rest-4", "4 phách"),
      option("l5-combo-after-rest-5", "5 phách"),
    ],
    "l5-combo-after-rest-3",
    "Bỏ dấu lặng đầu, phần còn lại là 1½ + ½ + 1 = 3 phách.",
    {
      kind: "canonical",
      pattern: l5ComboPatterns.restDottedAndSixteenths,
      caption: "Dấu lặng, chấm dôi, móc đơn và móc kép trong ô 4/4.",
    }
  ),
];

function eighthCount(meter: RhythmPattern["meter"]): number {
  return deriveMeterStructure(meter, PPQ / 2).subdivisionStarts.length;
}
function groupingText(meter: RhythmPattern["meter"]): string {
  const info = deriveMeter(meter);
  return info.groups.join("+");
}
function mediumEighthBeats(meter: RhythmPattern["meter"]): number[] {
  const structure = deriveMeterStructure(meter, PPQ / 2);
  return structure.accentPositions
    .filter(position => position.level === "medium")
    .map(position => structure.subdivisionStarts.indexOf(position.tick) + 1);
}

const l6: QuizQuestion[] = [
  ...([threeEight, sixEight, nineEight] as const).map(meter => {
    const count = eighthCount(meter);
    return makeQuestion(
      6,
      `l6-${meter.numerator}-8-eighth-beats`,
      "eighth-metronome-count",
      `Trong nhịp ${meter.numerator}/8, một ô có bao nhiêu tiếng metronome theo móc đơn?`,
      [
        option(`eighth-count-${count - 1}`, `${count - 1} tiếng móc đơn`),
        option(`eighth-count-${count}`, `${count} tiếng móc đơn`),
        option(`eighth-count-${count + 1}`, `${count + 1} tiếng móc đơn`),
        option(`eighth-count-${count + 2}`, `${count + 2} tiếng móc đơn`),
      ],
      `eighth-count-${count}`,
      `deriveMeterStructure xác định có ${count} vị trí móc đơn trong một ô ${meter.numerator}/8.`
    );
  }),
  ...([threeEight, sixEight, nineEight] as const).map(meter => {
    const groups = groupingText(meter);
    return makeQuestion(
      6,
      `l6-${meter.numerator}-8-grouping`,
      "grouping-in-threes",
      `Các móc đơn trong nhịp ${meter.numerator}/8 được nhóm như thế nào theo dữ liệu nhịp?`,
      [
        option("groups-1-1-1", "1 + 1 + 1 · ba phách móc đơn riêng biệt"),
        option("groups-3-3", "3 + 3"),
        option("groups-3-3-3", "3 + 3 + 3"),
        option("groups-2-2-2", "2 + 2 + 2"),
      ],
      `groups-${groups.replaceAll("+", "-")}`,
      `deriveMeter cung cấp cấu trúc nhóm ${groups}.`
    );
  }),
  makeQuestion(
    6,
    "l6-six-eight-medium",
    "compound-group-accent",
    "Trong nhịp 6/8, phách móc đơn nào bắt đầu nhóm thứ hai và mang accent vừa?",
    [
      option("medium-eighth-3", "Móc đơn thứ 3"),
      option("medium-eighth-4", "Móc đơn thứ 4"),
      option("medium-eighth-6", "Móc đơn thứ 6"),
    ],
    `medium-eighth-${mediumEighthBeats(sixEight)[0]}`,
    "Vị trí medium được derive từ accent metadata: tiếng móc đơn thứ tư bắt đầu nhóm 3+3 thứ hai."
  ),
  makeQuestion(
    6,
    "l6-nine-eight-medium",
    "compound-group-accent",
    "Trong nhịp 9/8, các móc đơn nào bắt đầu nhóm thứ hai và thứ ba với accent vừa?",
    [
      option("medium-eighths-3-6", "Móc đơn thứ 3 và 6"),
      option("medium-eighths-4-7", "Móc đơn thứ 4 và 7"),
      option("medium-eighths-5-8", "Móc đơn thứ 5 và 8"),
    ],
    `medium-eighths-${mediumEighthBeats(nineEight).join("-")}`,
    "deriveMeterStructure đặt accent vừa ở đầu nhóm hai và ba: móc đơn thứ tư và thứ bảy."
  ),
  meterIdentityQuestions(6, threeEight, "l6-3-8"),
  makeQuestion(
    6,
    "l6-3-8-incomplete-fill",
    "incomplete-bar-fill",
    "Ô nhịp minh họa 3/8 có một nốt đen. Cần thêm trường độ nào để đủ ô?",
    [
      option("partial-add-eighth", "Một móc đơn"),
      option("partial-add-quarter", "Một nốt đen"),
      option("partial-add-half", "Một nốt trắng"),
    ],
    "partial-add-eighth",
    "Ô 3/8 chứa ba móc đơn; nốt đen chiếm hai móc đơn, nên còn thiếu một móc đơn.",
    {
      kind: "illustrative-3-8-partial",
      caption: "Minh họa một nốt đen trong ô nhịp 3/8 chưa hoàn chỉnh.",
    }
  ),
];

const bonus: QuizQuestion[] = [
  makeQuestion(
    "bonus",
    "bonus-two-two-pulse-count",
    "2-2-meter",
    "Nhịp 2/2 có bao nhiêu phách trong một ô?",
    [
      option("bonus-pulses-1", "1 phách"),
      option("bonus-pulses-2", "2 phách"),
      option("bonus-pulses-4", "4 phách"),
    ],
    `bonus-pulses-${deriveMeter(twoTwo).pulseCount}`,
    "deriveMeter xác định 2/2 có hai phách mỗi ô."
  ),
  makeQuestion(
    "bonus",
    "bonus-two-two-pulse-unit",
    "half-note-pulse",
    "Đơn vị của mỗi phách trong nhịp 2/2 là nốt nào?",
    [
      option("bonus-unit-quarter", "Nốt đen"),
      option("bonus-unit-half", "Nốt trắng"),
      option("bonus-unit-whole", "Nốt tròn"),
    ],
    `bonus-unit-${deriveMeter(twoTwo).pulseUnit.denominator === 2 ? "half" : "quarter"}`,
    "Cấu hình canonical 2/2 đặt mỗi phách bằng một nốt trắng, không phải nốt tròn."
  ),
  meterIdentityQuestions("bonus", twoTwo, "bonus-2-2"),
  makeQuestion(
    "bonus",
    "bonus-whole-two-pulses",
    "2-2-meter",
    "Một nốt tròn bằng bao nhiêu phách nốt trắng trong 2/2?",
    [
      option("whole-half-pulses-1", "1 phách"),
      option("whole-half-pulses-2", "2 phách"),
      option("whole-half-pulses-4", "4 phách"),
    ],
    "whole-half-pulses-2",
    "Nốt tròn bằng hai nốt trắng, tức hai phách 2/2."
  ),
  makeQuestion(
    "bonus",
    "bonus-two-halves-fill",
    "half-note-pulse",
    "Hai nốt trắng chiếm bao nhiêu phách trong 2/2?",
    [
      option("two-halves-pulses-1", "1 phách"),
      option("two-halves-pulses-2", "2 phách"),
      option("two-halves-pulses-4", "4 phách"),
    ],
    "two-halves-pulses-2",
    "Mỗi nốt trắng bằng một phách; hai nốt trắng lấp hai phách của ô."
  ),
  makeQuestion(
    "bonus",
    "bonus-two-two-signature",
    "2-2-meter",
    "Số 2 ở dưới trong số chỉ nhịp 2/2 cho biết đơn vị nốt nào?",
    [
      option("signature-unit-quarter", "Nốt đen"),
      option("signature-unit-half", "Nốt trắng"),
      option("signature-unit-whole", "Nốt tròn"),
    ],
    "signature-unit-half",
    "Mẫu số 2 biểu thị nốt trắng; canonical metadata cũng xác nhận đơn vị phách là nốt trắng."
  ),
  makeQuestion(
    "bonus",
    "bonus-two-two-versus-four",
    "2-2-meter",
    "Lựa chọn nào mô tả đúng đơn vị phách và số phách của ô 2/2?",
    [
      option("bonus-no-confusion-quarter", "Hai phách nốt đen"),
      option(
        "bonus-no-confusion-whole",
        "Hai phách nốt trắng, không phải một phách nốt tròn"
      ),
      option("bonus-no-confusion-half", "Một phách nốt trắng"),
    ],
    "bonus-no-confusion-whole",
    "2/2 có hai phách nốt trắng; tổng trường độ toàn ô đúng bằng một nốt tròn, nhưng đơn vị mỗi phách là nốt trắng."
  ),
  makeQuestion(
    "bonus",
    "bonus-two-two-half-value",
    "half-note-pulse",
    "Một nốt trắng đơn lẻ có giá trị bao nhiêu phách trong 2/2?",
    [
      option("one-half-note-zero", "0 phách"),
      option("one-half-note-one", "1 phách"),
      option("one-half-note-two", "2 phách"),
    ],
    "one-half-note-one",
    "Mỗi nốt trắng là đúng một phách trong 2/2."
  ),
  makeQuestion(
    "bonus",
    "bonus-two-two-complete",
    "2-2-meter",
    "Một ô 2/2 hoàn chỉnh có tổng trường độ bao nhiêu nốt trắng?",
    [
      option("two-two-halves-one", "1 nốt trắng"),
      option("two-two-halves-two", "2 nốt trắng"),
      option("two-two-halves-four", "4 nốt trắng"),
    ],
    "two-two-halves-two",
    "Hai nốt trắng lấp đầy hai phách của nhịp 2/2."
  ),
  makeQuestion(
    "bonus",
    "bonus-two-two-pulse-count-derived",
    "2-2-meter",
    "Số phách canonical của 2/2 là bao nhiêu?",
    [
      option("derived-two-two-one", "1"),
      option("derived-two-two-two", "2"),
      option("derived-two-two-four", "4"),
    ],
    `derived-two-two-${pulseCountWord[deriveMeter(twoTwo).pulseCount]}`,
    "Số phách lấy từ deriveMeter: 2 phách nốt trắng mỗi ô."
  ),
];

const FOURTH_OPTION_BY_ID: Readonly<Record<string, QuizOption>> = Object.freeze(
  {
    "l1-four-four-quarter-beats": option("quarter-beats-5", "5 phách nốt đen"),
    "l1-quarter-value": option("quarter-value-three", "3 phách"),
    "l1-half-value": option("half-as-three-quarters", "3 nốt đen"),
    "l1-whole-value": option("whole-as-one-quarter", "1 nốt đen"),
    "l1-quarter-rest-value": option("quarter-rest-three", "3 phách"),
    "l1-two-half-notes": option("two-halves-six", "6 phách"),
    "l1-one-whole-fills": option(
      "fills-with-dotted-quarter",
      "Nốt đen chấm dôi"
    ),
    "l1-two-beat-note": option("two-beats-dotted-half", "Nốt trắng chấm dôi"),
    "l1-quarter-rest-name": option(
      "rest-l1-sounds-one",
      "Một phách có âm thanh"
    ),
    "l1-whole-note-staff": option("staff-whole-5", "5 phách nốt đen"),
    "l2-quarter-two-eighths": option(
      "quarter-to-three-eighths",
      "3 nốt móc đơn"
    ),
    "l2-eighth-rest": option("eighth-rest-quarter-quarter", "¼ phách nốt đen"),
    "l2-binary-subdivision": option("binary-five", "5 phần bằng nhau"),
    "l2-eighth-is-half-quarter": option(
      "l2-eighth-quarter-third",
      "Một phần ba"
    ),
    "l2-two-eighths-one-beat": option(
      "two-eighth-dotted-quarter",
      "Nốt đen chấm dôi"
    ),
    "l2-eighth-rest-silence": option(
      "rest-shortens-next-beat",
      "Có; phách tiếp theo bị rút ngắn"
    ),
    "l2-half-quarter-beat": option(
      "eighth-quarter-quarter",
      "Một phần tư phách"
    ),
    "l2-pair-completes-quarter": option("pair-half-note", "Một nốt trắng"),
    "l2-eighth-rest-value": option("rest-value-sixteenth", "Nốt móc kép"),
    "l2-eighth-split-staff": option("staff-eighths-three", "3 phách"),
    "l3-three-four-meter": option("meter-5-4", "5/4"),
    "l3-two-four-meter": option("meter-5-4", "5/4"),
    "l3-four-four-meter": option("meter-5-4", "5/4"),
    "l3-pulse-unit": option("l3-unit-whole", "Nốt tròn"),
    "l4-dotted-quarter": option("dotted-quarter-two-half", "2½ phách"),
    "l4-dotted-half": option("dotted-half-five", "5 nốt đen"),
    "l4-dot-extension": option("dot-add-quarter", "Một phần tư giá trị gốc"),
    "l4-dotted-quarter-eighth": option("dotted-plus-eighth-four", "4 nốt đen"),
    "l4-dotted-quarter-eighths": option(
      "dotted-quarter-five-eighths",
      "5 móc đơn"
    ),
    "l4-tie-no-new-onset": option(
      "tie-restart-first",
      "Nốt sau phát lại tiếng từ đầu"
    ),
    "l4-tied-quarter-total": option("tie-total-three", "3 phách"),
    "l4-tie-notation": option(
      "tie-example-new-onset",
      "Có; nốt thứ hai tạo onset mới"
    ),
    "l4-dotted-notation": option("dotted-staff-two-half", "2½ phách"),
    "l4-dot-equals-half": option("dotted-half-five-quarters", "5 nốt đen"),
    "l5-four-sixteenths-quarter": option(
      "four-sixteenths-dotted-quarter",
      "Nốt đen chấm dôi"
    ),
    "l5-one-sixteenth-quarter": option(
      "one-sixteenth-quarter-sixteenth",
      "1/16"
    ),
    "l5-sixteenth-rest": option("sixteenth-rest-half-quarter", "Nửa nốt đen"),
    "l5-half-eight-sixteenths": option("half-sixteenths-twelve", "12 móc kép"),
    "l5-two-eighths-sixteenths": option(
      "two-eighths-six-sixteenths",
      "6 móc kép"
    ),
    "l5-sixteenth-quarter-fill": option("sixteenth-fill-one-half", "1½ phách"),
    "l5-rest-duration": option(
      "sixteenth-rest-eighth",
      "Có, nó chiếm một móc đơn"
    ),
    "l5-whole-sixteenths": option("whole-sixteenths-twenty-four", "24 móc kép"),
    "l5-sixteenth-staff": option(
      "staff-sixteenths-dotted-quarter",
      "Nốt đen chấm dôi"
    ),
    "l5-quarter-approved-value": option("quarter-sixteenths-six", "6 móc kép"),
    "l6-six-eight-medium": option("medium-eighth-5", "Móc đơn thứ 5"),
    "l6-nine-eight-medium": option("medium-eighths-3-8", "Móc đơn thứ 3 và 8"),
    "l6-3-8-incomplete-fill": option("partial-add-three-eighths", "Ba móc đơn"),
    "bonus-two-two-pulse-count": option("bonus-pulses-3", "3 phách"),
    "bonus-two-two-pulse-unit": option("bonus-unit-eighth", "Nốt móc đơn"),
    "bonus-whole-two-pulses": option("whole-half-pulses-3", "3 phách"),
    "bonus-two-halves-fill": option("two-halves-pulses-3", "3 phách"),
    "bonus-two-two-signature": option("signature-unit-eighth", "Nốt móc đơn"),
    "bonus-two-two-versus-four": option(
      "bonus-no-confusion-four-quarters",
      "Bốn phách nốt đen"
    ),
    "bonus-two-two-half-value": option("one-half-note-three", "3 phách"),
    "bonus-two-two-complete": option("two-two-halves-three", "3 nốt trắng"),
    "bonus-two-two-pulse-count-derived": option("derived-two-two-three", "3"),
  }
);

function addFourthOption(question: QuizQuestion): QuizQuestion {
  const options =
    question.options.length === 4
      ? [...question.options]
      : question.options.length === 3 && FOURTH_OPTION_BY_ID[question.id]
        ? [...question.options, FOURTH_OPTION_BY_ID[question.id]]
        : [];
  if (options.length !== 4)
    throw new Error(
      `Question ${question.id} needs exactly four authored options.`
    );
  const optionIds = options.map(candidate => candidate.id);
  const labels = options.map(candidate =>
    candidate.label.trim().toLocaleLowerCase()
  );
  if (
    new Set(optionIds).size !== 4 ||
    new Set(labels).size !== 4 ||
    !options.some(candidate => candidate.id === question.correctOptionId)
  )
    throw new Error(
      `Question ${question.id} has duplicate or invalid options.`
    );
  return Object.freeze({ ...question, options: Object.freeze(options) });
}

const RAW_QUESTION_BANK: Readonly<Record<string, readonly QuizQuestion[]>> = {
  "1": l1,
  "2": l2,
  "3": [...l3, ...l3DottedAndTies],
  "4": l4,
  "5": l5,
  "6": l6,
  bonus,
};

function validateAndFreezeBank(): Readonly<
  Record<string, readonly QuizQuestion[]>
> {
  const questionIds = new Set<string>();
  const result: Record<string, readonly QuizQuestion[]> = {};
  for (const [track, source] of Object.entries(RAW_QUESTION_BANK)) {
    const bank = source.map(addFourthOption);
    for (const question of bank) {
      if (questionIds.has(question.id))
        throw new Error(`Duplicate Rhythm Quiz question ID: ${question.id}`);
      if (String(question.track) !== track)
        throw new Error(
          `Question ${question.id} is assigned to the wrong track.`
        );
      questionIds.add(question.id);
    }
    result[track] = Object.freeze(bank);
  }
  return Object.freeze(result);
}

export const QUIZ_QUESTION_BANK = validateAndFreezeBank();

export const QUIZ_TRACKS: readonly Readonly<{
  id: QuizTrack;
  title: string;
  description: string;
}>[] = Object.freeze([
  {
    id: 1,
    title: "Level 1",
    description: "Khung 4/4 · nốt đen, trắng, tròn và lặng đen",
  },
  {
    id: 2,
    title: "Level 2",
    description: "Móc đơn, lặng móc đơn · chia đôi phách",
  },
  {
    id: 3,
    title: "Level 3",
    description: "Nốt chấm dôi, dấu nối và tổ hợp trường độ trong nhịp đơn",
  },
  { id: 4, title: "Level 4", description: "Móc kép và chia nhỏ phách" },
  { id: 5, title: "Level 5", description: "Tổ hợp trường độ phức tạp" },
  {
    id: 6,
    title: "Level 6",
    description: "Nhịp 3/8, 6/8, 9/8 · nhóm ba móc đơn",
  },
  {
    id: "bonus",
    title: "Bonus · 2/2",
    description: "Hai phách nốt trắng trong mỗi ô",
  },
]);

const DEFAULT_QUESTION_COUNT = 10;
export const DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT = DEFAULT_QUESTION_COUNT;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const character of seed)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function freshCryptographicSeed(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues)
    throw new Error("A cryptographic source is required for a fresh Quiz run.");
  const words = cryptoApi.getRandomValues(new Uint32Array(4));
  return `fresh-${Array.from(words, word => word.toString(16).padStart(8, "0")).join("")}`;
}

/** Return a finite, randomly sampled deck; explicit seeds remain stable for tests and repro. */
export function createQuizRun(
  track: QuizTrack,
  seed?: string,
  questionCount = DEFAULT_QUESTION_COUNT
): readonly QuizQuestion[] {
  if (seed !== undefined && !seed.trim())
    throw new RangeError("An explicit quiz seed must not be empty.");
  if (!Number.isSafeInteger(questionCount) || questionCount < 1)
    throw new RangeError("Quiz question count must be a positive integer.");
  const bank = QUIZ_QUESTION_BANK[String(track)];
  if (!bank) throw new RangeError("Unknown Rhythm Quiz track.");
  const bankIds = bank.map(question => question.id);
  if (
    new Set(bankIds).size !== bank.length ||
    bank.some(question => String(question.track) !== String(track))
  )
    throw new Error(
      `Rhythm Quiz track ${String(track)} has invalid bank identities.`
    );
  const runSeed =
    seed ?? `rhythm-quiz-${String(track)}:${freshCryptographicSeed()}`;
  const selected = shuffle(bank, seededRandom(`${runSeed}:deck`)).slice(
    0,
    Math.min(questionCount, bank.length)
  );
  if (new Set(selected.map(question => question.id)).size !== selected.length)
    throw new Error("A Rhythm Quiz run cannot contain duplicate question IDs.");
  return Object.freeze(
    selected.map(question =>
      Object.freeze({
        ...question,
        options: Object.freeze(
          shuffle(
            question.options,
            seededRandom(`${runSeed}:${question.id}:options`)
          )
        ),
      })
    )
  );
}

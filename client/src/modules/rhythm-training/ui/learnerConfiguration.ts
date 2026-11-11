import {
  getCurriculumUnit,
  isExerciseKindAllowed,
  type CurriculumSection,
} from "../curriculum/curriculum";
import {
  policyForLevel,
  type RhythmFocus,
  type TempoBand,
} from "../generation/levels";
import { deriveMeter } from "../rhythm/meters";
import type { RhythmMeter, RhythmTrack } from "../types";

export const SECTION_LABELS: Readonly<Record<CurriculumSection, string>> = {
  lessons: "Bài học — ví dụ không chấm điểm",
  practice: "Luyện tập",
  assessment: "Đánh giá — bài Tap riêng",
};

export const FOCUS_LABELS: Readonly<Record<RhythmFocus, string>> = {
  basic: "Nốt và dấu lặng cơ bản",
  dots: "Dấu chấm dôi",
  ties: "Nối trường độ",
  combined: "Kết hợp chấm dôi và nối",
  sixteenths: "Lưới móc kép",
  compound: "Phách phức — nhóm ba",
  syncopation: "Đảo phách có kiểm soát",
  integrated: "Tổ hợp nâng cao",
};

export const TRACK_LABELS: Readonly<Record<RhythmTrack, string>> = {
  1: "Nốt và dấu lặng cơ bản",
  2: "Móc đơn, chia đôi phách",
  3: "Nhịp đơn: 2/4, 3/4, 4/4",
  4: "Chấm dôi và nối trường độ",
  5: "Móc kép và tổ hợp nâng cao",
  6: "Nhóm ba: 3/8, 6/8, 9/8",
  bonus: "2/2 Alla Breve — tùy chọn",
};

export const LEARNER_TRACK_NOTES: Readonly<Record<RhythmTrack, string>> = {
  1: "Nhận biết nốt đen, nốt trắng, nốt tròn và dấu lặng đen; chưa mở Tap Rhythm.",
  2: "Chia đôi phách nốt đen thành hai móc đơn; chưa mở Tap Rhythm.",
  3: "Giữ phách nốt đen khi chuyển giữa nhịp 2/4, 3/4 và 4/4.",
  4: "Chấm dôi kéo dài nốt. Với nốt nối trường độ, chỉ chạm ở đầu tiếng mới, không chạm lại ở đoạn nối.",
  5: "Rèn móc kép, đảo phách và các tổ hợp nâng cao có kiểm soát trong nhịp đơn.",
  6: "3/8 có ba phách móc đơn độc lập; 6/8 và 9/8 có phách phức là nốt đen chấm dôi.",
  bonus:
    "Giữ hai phách nốt trắng mỗi ô nhịp, khác bốn phách nốt đen của 4/4. Đây là bài bổ sung tùy chọn.",
};

export function trackName(track: RhythmTrack): string {
  return track === "bonus" ? "Bonus 2/2" : `Level ${track}`;
}

export function meterKey(meter: RhythmMeter): string {
  return `${meter.numerator}/${meter.denominator}`;
}

export function getTapSections(
  track: RhythmTrack
): readonly CurriculumSection[] {
  return (["lessons", "practice", "assessment"] as const).filter(section =>
    isExerciseKindAllowed(track, section, "tap-rhythm")
  );
}

export function getTapTempoBand(
  track: RhythmTrack,
  meter: RhythmMeter
): TempoBand {
  const { pulseTicks } = deriveMeter(meter);
  const tempo = policyForLevel(track).tempo;
  if (pulseTicks === 960) return tempo.half ?? tempo.simple;
  if (pulseTicks === 720) return tempo.compound ?? tempo.simple;
  if (pulseTicks === 240) return tempo.eighth ?? tempo.simple;
  return tempo.simple;
}

export function getTapFocuses(
  track: RhythmTrack,
  meter: RhythmMeter
): readonly RhythmFocus[] {
  const focuses = policyForLevel(track).supportedFocus;
  // These configurations already fail the generator's existing 3/8 gate:
  // compound focus is not simple triple, and dot+tie cannot fit this bar.
  return meter.numerator === 3 && meter.denominator === 8
    ? focuses.filter(focus => focus !== "compound" && focus !== "combined")
    : focuses;
}

export function pulseDescription(meter: RhythmMeter): string {
  const info = deriveMeter(meter);
  const pulse =
    info.pulseTicks === 960
      ? "nốt trắng"
      : info.pulseTicks === 720
        ? "nốt đen chấm dôi"
        : info.pulseTicks === 240
          ? "nốt móc đơn"
          : "nốt đen";
  const type = info.pulseTicks === 720 ? "phách phức" : "phách chính";
  return `${info.pulseCount} ${type} mỗi ô · mỗi phách = ${pulse}`;
}

export function groupingDescription(meter: RhythmMeter): string {
  const info = deriveMeter(meter);
  if (info.pulseTicks === 720)
    return `Nhóm móc đơn ${info.groups.join(" + ")} · không chạm lại ở nốt nối tiếp`;
  if (meterKey(meter) === "3/8")
    return "Ba phách móc đơn độc lập · không gộp thành một phách phức";
  if (meterKey(meter) === "2/2")
    return "Hai phách nốt trắng · khác cách đếm 4/4";
  return "Chia đôi phách chính · dấu lặng vẫn chiếm thời gian";
}

export function defaultTapMeter(track: RhythmTrack): RhythmMeter {
  return getCurriculumUnit(track).allowedMeters[0];
}

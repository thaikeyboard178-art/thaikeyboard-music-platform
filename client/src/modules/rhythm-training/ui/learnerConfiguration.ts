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
import { deriveMeter, MAX_PULSE_BPM, MIN_PULSE_BPM } from "../rhythm/meters";
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
  combined: "Kết hợp trường độ",
  sixteenths: "Lưới móc kép",
  compound: "Phách phức — nhóm ba",
  syncopation: "Đảo phách có kiểm soát",
  integrated: "Tổ hợp nâng cao",
  snap: "Móc giật — móc đơn chấm dôi và móc kép",
  sandwich: "Đòn gánh — móc kép, móc đơn, móc kép",
  "quarter-triplets": "Liên 3 đen",
  "eighth-triplets": "Liên 3 đơn",
  "triplet-combined": "Liên ba kết hợp trường độ đã học",
};

export const TRACK_LABELS: Readonly<Record<RhythmTrack, string>> = {
  1: "Nốt và dấu lặng cơ bản",
  2: "Móc đơn, chia đôi phách",
  3: "Nhịp đơn, chấm dôi và nối trường độ",
  4: "Móc kép và chia nhỏ phách",
  5: "Tổ hợp tiết tấu phức tạp",
  6: "Nhóm ba: 3/8, 6/8, 9/8",
  bonus: "2/2 Alla Breve — tùy chọn",
};

export const LEARNER_TRACK_NOTES: Readonly<Record<RhythmTrack, string>> = {
  1: "Luyện nốt đen, nốt trắng, nốt tròn và dấu lặng đen trong khung 4/4.",
  2: "Chia đôi phách nốt đen thành hai móc đơn, giữ nhịp qua dấu lặng.",
  3: "Luyện chấm dôi, dấu nối và trường độ trong nhịp đơn 2/4, 3/4 và 4/4. Với 2/4, chọn từng nội dung riêng để còn chỗ cho dấu lặng; kết hợp dùng 3/4 hoặc 4/4.",
  4: "Từ lưới móc kép đến móc giật, đòn gánh và các tổ hợp đảo phách; không chạm lại ở nốt nối tiếp.",
  5: "Luyện liên 3 đen, liên 3 đơn rồi kết hợp trường độ và đảo phách đã học. Trong 2/4, chọn liên 3 đơn để còn chỗ cho dấu lặng; liên 3 đen dùng 3/4 hoặc 4/4.",
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
  void track;
  const { pulseUnit } = deriveMeter(meter);
  const pulse: TempoBand["pulse"] =
    pulseUnit.denominator === 8
      ? "eighth"
      : pulseUnit.denominator === 2
        ? "half"
        : "quarter";
  return Object.freeze({ min: MIN_PULSE_BPM, max: MAX_PULSE_BPM, pulse });
}

export function getTapFocuses(
  track: RhythmTrack,
  meter: RhythmMeter
): readonly RhythmFocus[] {
  const focuses = policyForLevel(track).supportedFocus;
  if (track === 4) return focuses.filter(focus => focus !== "combined");
  if (track === 5)
    return focuses.filter(focus => {
      if (focus === "combined" || focus === "snap" || focus === "syncopation")
        return false;
      if (focus === "dots") return meter.numerator === 4;
      if (
        focus === "ties" ||
        focus === "sandwich" ||
        focus === "quarter-triplets"
      )
        return meter.numerator !== 2;
      return true;
    });
  if (track === 3 && meter.numerator === 2 && meter.denominator === 4)
    return focuses.filter(focus => focus !== "combined");
  // These configurations already fail the generator's existing 3/8 gate:
  // Compound focus is not simple triple. A dotted quarter fills 3/8, so
  // dots cannot leave the mandatory rest; dot+tie cannot fit either.
  return meter.numerator === 3 && meter.denominator === 8
    ? focuses.filter(
        focus =>
          focus !== "compound" && focus !== "combined" && focus !== "dots"
      )
    : focuses;
}

export function pulseDescription(meter: RhythmMeter): string {
  const info = deriveMeter(meter);
  const pulse =
    info.pulseUnit.denominator === 2
      ? "nốt trắng"
      : info.pulseUnit.denominator === 8
        ? "nốt móc đơn"
        : "nốt đen";
  return `${info.pulseCount} phách mỗi ô · mỗi phách = ${pulse}`;
}

export function groupingDescription(meter: RhythmMeter): string {
  const info = deriveMeter(meter);
  if (meter.denominator === 8 && info.groups.some(size => size > 1))
    return `Nhóm móc đơn ${info.groups.join(" + ")} · không chạm lại ở nốt nối tiếp`;
  if (meterKey(meter) === "3/8")
    return "Ba phách móc đơn độc lập · không gộp thành một phách phức";
  if (meterKey(meter) === "2/2")
    return "Nhóm 1 + 1: 1 | 2 · mỗi phách là nốt trắng, khác cách đếm 4/4";
  if (meterKey(meter) === "2/4")
    return "Nhóm 1 + 1: 1 | 2 · mỗi phách là nốt đen";
  if (meterKey(meter) === "3/4")
    return "Nhóm 1 + 1 + 1: 1 | 2 | 3 · mỗi phách là nốt đen";
  if (meterKey(meter) === "4/4")
    return "Nhóm 2 + 2: 1 – 2 | 3 – 4 · mỗi phách là nốt đen";
  return "Chia đôi phách chính · dấu lặng vẫn chiếm thời gian";
}

export function defaultTapMeter(track: RhythmTrack): RhythmMeter {
  return getCurriculumUnit(track).allowedMeters[0];
}

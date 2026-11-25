import type { ChordLevel, ChordQuality } from "../types";
import { CHORD_QUALITIES } from "../theory/qualityCatalog";

export type LevelDefinition = Readonly<{ level: ChordLevel; label: string; description: string }>;

export const LEVELS: readonly LevelDefinition[] = Object.freeze([
  Object.freeze({ level: 1, label: "Tam âm cơ bản", description: "Hợp âm trưởng và thứ" }),
  Object.freeze({ level: 2, label: "Tam âm biến hóa", description: "Tam âm giảm và tăng" }),
  Object.freeze({ level: 3, label: "Hợp âm treo", description: "Hợp âm treo bậc 2 và bậc 4" }),
  Object.freeze({ level: 4, label: "Hợp âm bảy", description: "Hợp âm át 7, trưởng 7 và thứ 7" }),
  Object.freeze({ level: 5, label: "Hợp âm bảy biến thể", description: "Bán giảm, giảm 7 và thứ–trưởng 7" }),
  Object.freeze({ level: 6, label: "Hợp âm mở rộng", description: "Hợp âm 9, 11 và 13 xếp chồng quãng ba" }),
]);

const byLevel = new Map<ChordLevel, readonly ChordQuality[]>(LEVELS.map(({ level }) => [
  level,
  Object.freeze(CHORD_QUALITIES.filter((quality) => quality.level <= level)),
]));

export function eligibleQualities(level: ChordLevel): readonly ChordQuality[] {
  const qualities = byLevel.get(level);
  if (!qualities) throw new RangeError(`Invalid chord level: ${String(level)}`);
  return qualities;
}

export function qualitiesAtLevel(level: ChordLevel): readonly ChordQuality[] {
  return Object.freeze(CHORD_QUALITIES.filter((quality) => quality.level === level));
}

import { z } from "zod";
import type { LedgerRange, NoteRange } from "../types";

export const PREFERENCES_KEY = "thaikeyboard-note-reading-preferences-v1";
export const ledgerRangeSchema = z.object({ above: z.number().int().min(0).max(4), below: z.number().int().min(0).max(4) });
const preferencesSchema = z.object({ autoAdvance: z.boolean(), ledgerRange: ledgerRangeSchema });
export type PracticePreferences = { autoAdvance: boolean; ledgerRange: LedgerRange };

export function readPracticePreferences(): PracticePreferences {
  const defaults: PracticePreferences = { autoAdvance: true, ledgerRange: { above: 1, below: 1 } };
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaults;
    const parsed = preferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaults;
  } catch {
    return defaults;
  }
}

export function savePracticePreferences(preferences: PracticePreferences): void {
  try {
    const parsed = preferencesSchema.safeParse(preferences);
    if (parsed.success) localStorage.setItem(PREFERENCES_KEY, JSON.stringify(parsed.data));
  } catch {
    // Preferences are optional; blocked storage never blocks practice.
  }
}

// Retain the historical range field for old module consumers/session metadata.
// Actual UI/generation uses the independent ledgerRange, not this alias.
export function legacyRangeAlias(range: LedgerRange): NoteRange {
  if (range.above === 0 && range.below === 0) return "staff";
  return range.above === 1 && range.below === 1 ? "one-ledger" : "extended";
}

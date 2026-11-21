import type { ChordLevel, ChordMethod, ChordResult } from "../types";
const KEY = "thaikeyboard-chord-results-v1";
function validResult(value: unknown): value is ChordResult {
  if (!value || typeof value !== "object") return false;
  const r = value as ChordResult;
  return typeof r.sessionId === "string" && ["visual", "ear"].includes(r.method) && Number.isInteger(r.level) && r.level >= 1 && r.level <= 6 && ["completed", "stopped"].includes(r.status) && [r.presented, r.answered, r.correct, r.incorrect, r.skipped, r.completedAt].every(n => Number.isFinite(n) && n >= 0) && r.answered === r.correct + r.incorrect && (r.accuracy === null || Number.isFinite(r.accuracy) && r.accuracy >= 0 && r.accuracy <= 100) && Array.isArray(r.details);
}
export function readChordHistory(): readonly ChordResult[] {
  try { const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(parsed) ? parsed.filter(validResult) : []; } catch { return []; }
}
export function recordChordResult(result: ChordResult): boolean {
  try {
    const history = readChordHistory();
    if (!validResult(result) || history.some(r => r.sessionId === result.sessionId)) return false;
    localStorage.setItem(KEY, JSON.stringify([result, ...history].slice(0, 50)));
    return true;
  } catch { return false; }
}
export function historyFor(method: ChordMethod, level: ChordLevel): readonly ChordResult[] { return readChordHistory().filter(r => r.method === method && r.level === level); }

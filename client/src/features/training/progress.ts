import type { TrainingResult } from "./types";

export const PROGRESS_KEY = "thaikeyboard-music-training-progress-v1";

export type PracticeProgress = {
  sessionsCompleted: number;
  questionsAnswered: number;
  correctAnswers: number;
  lastSessionId?: string;
};

const EMPTY_PROGRESS: PracticeProgress = {
  sessionsCompleted: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
};

type StoredProgress = Partial<PracticeProgress> & Record<string, unknown>;

function defaults(): PracticeProgress {
  return { ...EMPTY_PROGRESS };
}

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function normalizeCounter(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function normalizeProgress(value: unknown): PracticeProgress {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return defaults();

  const stored = value as StoredProgress;
  const questionsAnswered = normalizeCounter(stored.questionsAnswered);
  return {
    sessionsCompleted: normalizeCounter(stored.sessionsCompleted),
    questionsAnswered,
    correctAnswers: Math.min(normalizeCounter(stored.correctAnswers), questionsAnswered),
    ...(typeof stored.lastSessionId === "string" && stored.lastSessionId.trim().length > 0
      ? { lastSessionId: stored.lastSessionId }
      : {}),
  };
}

function parseProgress(raw: string | null): PracticeProgress {
  if (raw === null) return defaults();
  try {
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return defaults();
  }
}

function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isValidCompletedResult(result: TrainingResult): boolean {
  return (
    result !== null &&
    typeof result === "object" &&
    isValidSessionId(result.sessionId) &&
    isValidCount(result.totalQuestions) &&
    isValidCount(result.correctAnswers) &&
    isValidCount(result.incorrectAnswers) &&
    result.correctAnswers <= result.totalQuestions &&
    result.incorrectAnswers <= result.totalQuestions &&
    result.correctAnswers + result.incorrectAnswers === result.totalQuestions
  );
}

export function readPracticeProgress(): PracticeProgress {
  const storage = getStorage();
  if (!storage) return defaults();

  try {
    return parseProgress(storage.getItem(PROGRESS_KEY));
  } catch {
    return defaults();
  }
}

export function recordCompletedResult(result: TrainingResult): boolean {
  if (!isValidCompletedResult(result)) return false;

  const storage = getStorage();
  if (!storage) return false;

  let current: PracticeProgress;
  try {
    current = parseProgress(storage.getItem(PROGRESS_KEY));
  } catch {
    return false;
  }

  if (current.lastSessionId === result.sessionId) return false;

  const next: PracticeProgress = {
    lastSessionId: result.sessionId,
    sessionsCompleted: current.sessionsCompleted + 1,
    questionsAnswered: current.questionsAnswered + result.totalQuestions,
    correctAnswers: current.correctAnswers + result.correctAnswers,
  };
  if (![next.sessionsCompleted, next.questionsAnswered, next.correctAnswers].every(isValidCount)) return false;

  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

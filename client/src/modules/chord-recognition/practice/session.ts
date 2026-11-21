import type { ChordConfiguration, ChordQuestion, ChordResult, ChordSession } from "../types";

export function createChordSession(config: ChordConfiguration, questions: readonly ChordQuestion[], seed: number, id: string = globalThis.crypto?.randomUUID?.() ?? `chord-${Date.now()}`, now = Date.now()): ChordSession {
  if (!questions.length || questions.some(q => q.method !== config.method || q.level !== config.level)) throw new Error("Ngân hàng câu hỏi không khớp cấu hình.");
  return { id, config, questions, seed, index: 0, records: [{ question: questions[0], status: "unanswered", answerId: null }], status: "active", startedAt: now, completedAt: null };
}

export function answerChordQuestion(session: ChordSession, questionId: string, answerId: string): ChordSession {
  const current = session.records[session.index];
  if (session.status !== "active" || current?.question.id !== questionId || current.status !== "unanswered" || !current.question.choices.some(a => a.id === answerId)) return session;
  return { ...session, records: session.records.map((r, i) => i === session.index ? { ...r, answerId, status: answerId === r.question.correctAnswer.id ? "correct" : "incorrect" } : r) };
}

export function advanceChordQuestion(session: ChordSession, questionId: string, extra: readonly ChordQuestion[] = [], now = Date.now()): ChordSession {
  const current = session.records[session.index];
  if (session.status !== "active" || current?.question.id !== questionId || current.status === "unanswered") return session;
  if (session.config.questionCount !== null && session.index + 1 >= session.config.questionCount) return { ...session, status: "completed", completedAt: now };
  const questions = extra.length ? [...session.questions, ...extra] : session.questions;
  const next = questions[session.index + 1];
  if (!next) throw new Error("Chưa có câu hỏi tiếp theo; không giảm Level tự động.");
  if (next.method !== session.config.method || next.level !== session.config.level) throw new Error("Câu hỏi tiếp theo không khớp cấu hình.");
  return { ...session, questions, index: session.index + 1, records: [...session.records, { question: next, status: "unanswered", answerId: null }] };
}

export function skipChordQuestion(session: ChordSession, questionId: string, extra: readonly ChordQuestion[] = [], now = Date.now()): ChordSession {
  const current = session.records[session.index];
  if (session.status !== "active" || current?.question.id !== questionId || current.status !== "unanswered") return session;
  const skipped: ChordSession = { ...session, records: session.records.map((r, i) => i === session.index ? { ...r, status: "skipped" } : r) };
  return advanceChordQuestion(skipped, questionId, extra, now);
}

export function stopChordSession(session: ChordSession, now = Date.now()): ChordSession {
  return session.status === "active" ? { ...session, status: "stopped", completedAt: now } : session;
}

export function toChordResult(session: ChordSession): ChordResult | null {
  if (session.status === "active" || session.completedAt === null) return null;
  const correct = session.records.filter(r => r.status === "correct").length;
  const incorrect = session.records.filter(r => r.status === "incorrect").length;
  const answered = correct + incorrect;
  return { sessionId: session.id, method: session.config.method, level: session.config.level, status: session.status, presented: session.records.length, answered, correct, incorrect, skipped: session.records.filter(r => r.status === "skipped").length, accuracy: answered ? Math.round(correct / answered * 100) : null, details: session.records, completedAt: session.completedAt };
}

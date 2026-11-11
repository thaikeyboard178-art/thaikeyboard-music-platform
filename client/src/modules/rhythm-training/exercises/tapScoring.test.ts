import { describe, expect, it } from "vitest";
import { TapRhythmEngine } from "../audio/tapEngine";
import { TapFakeClock, TEST_TAP_VOICES } from "../audio/tapTestHelpers";
import { createTapRhythmExercise } from "./tapRhythm";
import {
  createRhythmTrainingSession,
  submitRhythmExerciseAnswer,
} from "./scoring";
import { toTrainingResult } from "@/features/training/session";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";

async function setup(name: string) {
  const clock = new TapFakeClock();
  const input = new EventTarget();
  const exercise = createTapRhythmExercise({
    track: 3,
    pattern: SEVEN_METER_RUNTIME_FIXTURES[0].pattern,
    id: name,
  });
  const engine = new TapRhythmEngine({
    exercise,
    inputTarget: input,
    blurSource: null,
    now: clock.now,
    timeOrigin: () => 1700000000000,
    transport: {
      voices: TEST_TAP_VOICES,
      timers: clock.timers,
      contextFactory: () => clock.context as unknown as AudioContext,
      visibilitySource: null,
    },
  });
  const session = createRhythmTrainingSession(
    { mode: "challenge", plannedQuestions: 1, sessionId: name },
    exercise
  );
  await engine.start();
  return { clock, input, exercise, engine, session };
}
function complete(h: Awaited<ReturnType<typeof setup>>, shifts: number[] = []) {
  for (let i = 0; i < h.engine.snapshot!.expectedOnsets.length; i++) {
    const at =
      h.engine.snapshot!.expectedOnsets[i].audioTime + (shifts[i] ?? 0) / 1000;
    h.clock.at(at);
    h.input.dispatchEvent(h.clock.nativeTap(at));
  }
  h.clock.at(h.engine.snapshot!.drainEndAudioTime + 0.03);
  return h.engine.result!;
}

describe("Tap runtime to existing shared scoring integration", () => {
  it("strict all-onsets pass awards +10 exactly once and leaves Formula B outside shared result", async () => {
    const h = await setup("tap-score-correct");
    const attempt = complete(h);
    const first = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2100,
    });
    expect(first.status).toBe("graded");
    expect(first.scoreDelta).toBe(10);
    expect(first.session.questionsAnswered).toBe(1);
    expect(attempt.accuracyPercent).toBe(100);
    expect(toTrainingResult(first.session)!.accuracy).toBe(100);
    const duplicate = submitRhythmExerciseAnswer(first.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2100,
    });
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.scoreDelta).toBe(0);
    expect(duplicate.session).toBe(first.session);
    const staleSnapshot = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2100,
    });
    expect(staleSnapshot.status).toBe("duplicate");
    expect(staleSnapshot.scoreDelta).toBe(0);
    expect(staleSnapshot.session.questionsAnswered).toBe(0);
    await h.engine.dispose();
  });
  it("blocks a distinct engine completion for the same stable session question, including a cloned stale snapshot", async () => {
    const firstEngine = await setup("tap-score-distinct-engine");
    const firstAttempt = complete(firstEngine);
    const first = submitRhythmExerciseAnswer(
      firstEngine.session,
      firstEngine.exercise,
      { type: "answer", answer: firstAttempt, responseTimeMs: 2100 }
    );
    expect(first.scoreDelta).toBe(10);
    const secondEngine = await setup("tap-score-distinct-engine");
    const secondAttempt = complete(secondEngine);
    expect(secondAttempt).not.toBe(firstAttempt);
    expect(secondAttempt.mode).toBe("graded");
    const replayed = submitRhythmExerciseAnswer(
      { ...firstEngine.session },
      secondEngine.exercise,
      { type: "answer", answer: secondAttempt, responseTimeMs: 2100 }
    );
    expect(replayed.status).toBe("duplicate");
    expect(replayed.scoreDelta).toBe(0);
    expect(replayed.session.questionsAnswered).toBe(0);
    await firstEngine.engine.dispose();
    await secondEngine.engine.dispose();
  });
  it("one near-miss awards +0 while Formula B stays 75%, not shared accuracy", async () => {
    const h = await setup("tap-score-near");
    const attempt = complete(h, [65]);
    const result = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2200,
    });
    expect(attempt.accuracyPercent).toBe(75);
    expect(result.status).toBe("graded");
    expect(result.correct).toBe(false);
    expect(result.scoreDelta).toBe(0);
    expect(result.session.incorrectAnswers).toBe(1);
    expect(toTrainingResult(result.session)!.accuracy).toBe(0);
    expect(toTrainingResult(result.session)!.averageResponseTimeMs).toBe(2200);
    await h.engine.dispose();
  });
  it("physical extra tap defeats strict gate despite passing all expected onsets", async () => {
    const h = await setup("tap-score-extra");
    const first = h.engine.snapshot!.expectedOnsets[0].audioTime;
    h.clock.at(first);
    h.input.dispatchEvent(h.clock.nativeTap(first));
    const attempt = complete(h);
    const result = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2000,
    });
    expect(attempt.evaluation!.tp).toBe(4);
    expect(attempt.evaluation!.k).toBe(5);
    expect(attempt.accuracyPercent).toBeCloseTo(800 / 9);
    expect(result.scoreDelta).toBe(0);
    expect(result.correct).toBe(false);
    await h.engine.dispose();
  });
  it("technical abort never increments answered/incorrect counts and cannot be forged into an answer", async () => {
    const h = await setup("tap-score-abort");
    h.engine.stop();
    const result = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: h.engine.result,
      responseTimeMs: 0,
    });
    expect(result.status).toBe("technical-abort");
    expect(result.session).toBe(h.session);
    expect(result.session.questionsAnswered).toBe(0);
    const forged = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: {
        correct: true,
        accuracyPercent: 100,
        status: "completed",
        mode: "graded",
      },
      responseTimeMs: 1,
    });
    expect(forged.status).toBe("technical-abort");
    expect(forged.session).toBe(h.session);
    await h.engine.dispose();
  });
  it("completed retry/practice cannot create a new shared answer even with an unanswered session", async () => {
    const h = await setup("tap-score-practice");
    const firstAttempt = complete(h);
    const first = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: firstAttempt,
      responseTimeMs: 2000,
    });
    await h.engine.retry();
    const practice = complete(h);
    expect(practice.mode).toBe("practice");
    const second = submitRhythmExerciseAnswer(first.session, h.exercise, {
      type: "answer",
      answer: practice,
      responseTimeMs: 2000,
    });
    expect(second.scoreDelta).toBe(0);
    expect(second.session.questionsAnswered).toBe(1);
    const unanswered = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: practice,
      responseTimeMs: 2000,
    });
    expect(unanswered.status).toBe("practice");
    expect(unanswered.session.questionsAnswered).toBe(0);
    await h.engine.dispose();
  });
});

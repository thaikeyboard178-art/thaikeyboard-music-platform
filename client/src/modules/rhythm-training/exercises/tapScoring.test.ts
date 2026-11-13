import { describe, expect, it } from "vitest";
import { TapRhythmEngine } from "../audio/tapEngine";
import {
  createCanonicalTapStressExercise,
  dispatchFirstTapAtNextDownbeat,
  TapFakeClock,
  TEST_TAP_VOICES,
} from "../audio/tapTestHelpers";
import type { RhythmScheduledEvent } from "../audio/transport";
import { sealTapAttempt } from "./tapCompletion";
import {
  calculateTapTwoRoundScore,
  type TapRoundInput,
} from "./tapRoundScoring";
import { deriveMeter, ticksToSeconds } from "../rhythm/meters";
import {
  advanceRhythmSession,
  createRhythmTrainingSession,
  skipRhythmExercise,
  submitRhythmExerciseAnswer,
  type RhythmGradedExercise,
} from "./scoring";
import {
  submitSessionAnswer,
  toTrainingResult,
} from "@/features/training/session";
import { SEVEN_METER_RUNTIME_FIXTURES } from "../runtime/fixtures";

async function setup(name: string) {
  const clock = new TapFakeClock();
  const input = new EventTarget();
  const scheduledEvents: RhythmScheduledEvent[] = [];
  const exercise = createCanonicalTapStressExercise({
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
      onScheduled: event => scheduledEvents.push(event),
    },
  });
  const session = createRhythmTrainingSession(
    { mode: "challenge", plannedQuestions: 1, sessionId: name },
    exercise
  );
  await engine.start();
  return { clock, input, exercise, engine, session, scheduledEvents };
}
function complete(h: Awaited<ReturnType<typeof setup>>, shifts: number[] = []) {
  if (!h.engine.snapshot)
    dispatchFirstTapAtNextDownbeat(
      h.clock,
      h.input,
      h.exercise,
      h.scheduledEvents
    );
  const snapshot = h.engine.snapshot!;
  let responseIndex = 0;
  for (const target of snapshot.expectedOnsets) {
    if (target.roundNumber === 1 && target.targetIndex === 0) continue;
    const at = target.audioTime + (shifts[responseIndex] ?? 0) / 1000;
    responseIndex++;
    h.clock.at(at);
    h.input.dispatchEvent(h.clock.nativeTap(at));
  }
  h.clock.at(Math.max(snapshot.drainEndAudioTime, snapshot.planEndAudioTime) + 0.06);
  return h.engine.result!;
}

function receiptFromRounds(
  exercise: Awaited<ReturnType<typeof setup>>["exercise"],
  rounds: readonly TapRoundInput[]
) {
  const meter = deriveMeter(exercise.pattern.meter);
  const canonicalPulseMs =
    ticksToSeconds(
      meter.pulseTicks,
      exercise.pattern.meter,
      exercise.pattern.tempo.pulseBpm
    ) * 1000;
  const score = calculateTapTwoRoundScore(
    exercise.targets,
    rounds,
    canonicalPulseMs
  );
  const firstPlayed = score.rounds.find(round => round.status === "played");
  return sealTapAttempt({
    exerciseId: exercise.id,
    generation: 1,
    mode: "graded",
    status: "completed",
    reason: null,
    targetTicks: exercise.targets.map(target => target.tick),
    taps: firstPlayed?.taps ?? [],
    evaluation: firstPlayed?.evaluation ?? null,
    accuracyPercent: score.overallAccuracyPercent,
    scoreOutOfTen: score.scoreOutOfTen,
    rounds: score.rounds,
    rawCaptures: [],
  });
}

function receiptAtAccuracy(
  exercise: Awaited<ReturnType<typeof setup>>["exercise"],
  accuracyPercent: number
) {
  const tapsForRound = (roundNumber: 1 | 2) =>
    exercise.targets.map((target, index) => {
      const previous = exercise.targets[index - 1];
      const next = exercise.targets[index + 1];
      const interval = next
        ? next.offsetMs - target.offsetMs
        : previous
          ? target.offsetMs - previous.offsetMs
          : 1000;
      return {
        sequence: roundNumber * 100 + index,
        offsetMs:
          target.offsetMs + ((100 - accuracyPercent) / 100) * (interval / 2),
      };
    });
  return receiptFromRounds(exercise, [
    { roundNumber: 1, skipped: false, taps: tapsForRound(1) },
    { roundNumber: 2, skipped: false, taps: tapsForRound(2) },
  ]);
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
    expect(attempt.accuracyPercent).toBeCloseTo(100, 6);
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
  it("one near-miss keeps strict correctness false while Formula B stays separate from shared accuracy", async () => {
    const h = await setup("tap-score-near");
    const attempt = complete(h, [65]);
    const result = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2200,
    });
    expect(attempt.accuracyPercent).toBeGreaterThan(94);
    expect(attempt.accuracyPercent).toBeLessThan(100);
    expect(result.status).toBe("graded");
    expect(result.correct).toBe(false);
    expect(result.scoreDelta).toBe(10);
    expect(result.session.totalScore).toBe(10);
    expect(result.session.incorrectAnswers).toBe(1);
    expect(toTrainingResult(result.session)!.accuracy).toBe(0);
    expect(toTrainingResult(result.session)!.averageResponseTimeMs).toBe(2200);
    await h.engine.dispose();
  });
  it("rounds Timing Accuracy half-up into shared Tap awards independently of strict correctness", async () => {
    const h = await setup("tap-score-accuracy-awards");
    const cases = [
      [100, 10],
      [99, 10],
      [95, 10],
      [94, 9],
      [90, 9],
      [84, 8],
      [75, 8],
      [0, 0],
    ] as const;

    for (const [accuracyPercent, expectedAward] of cases) {
      const attempt = receiptAtAccuracy(h.exercise, accuracyPercent);
      const session = createRhythmTrainingSession(
        {
          mode: "challenge",
          plannedQuestions: 1,
          sessionId: `tap-score-accuracy-${accuracyPercent}`,
        },
        h.exercise
      );
      const result = submitRhythmExerciseAnswer(session, h.exercise, {
        type: "answer",
        answer: attempt,
        responseTimeMs: 2200,
      });

      expect(result.status).toBe("graded");
      expect(attempt.accuracyPercent).toBeCloseTo(accuracyPercent, 8);
      expect(attempt.scoreOutOfTen).toBe(expectedAward);
      expect(result.correct).toBe(accuracyPercent === 100);
      expect(result.scoreDelta).toBe(expectedAward);
      expect(result.session.totalScore).toBe(expectedAward);
      expect(result.session.questionsAnswered).toBe(1);
      expect(result.session.correctAnswers).toBe(accuracyPercent === 100 ? 1 : 0);
      expect(result.session.incorrectAnswers).toBe(accuracyPercent === 100 ? 0 : 1);
      expect(result.session.accuracy).toBe(accuracyPercent === 100 ? 100 : 0);
    }
    await h.engine.dispose();
  });
  it("physical extra taps are excluded from accuracy while all target notes still earn the full award", async () => {
    const h = await setup("tap-score-extra");
    dispatchFirstTapAtNextDownbeat(
      h.clock,
      h.input,
      h.exercise,
      h.scheduledEvents
    );
    const first = h.engine.snapshot!.expectedOnsets[0].audioTime;
    h.clock.at(first);
    h.input.dispatchEvent(h.clock.nativeTap(first));
    const attempt = complete(h);
    const result = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2000,
    });
    expect(attempt.evaluation!.tp).toBe(h.exercise.targets.length);
    expect(attempt.evaluation!.k).toBe(h.exercise.targets.length + 1);
    expect(attempt.evaluation!.extra).toBe(1);
    expect(attempt.accuracyPercent).toBe(100);
    expect(attempt.scoreOutOfTen).toBe(10);
    expect(result.scoreDelta).toBe(10);
    expect(result.correct).toBe(true);
    await h.engine.dispose();
  });
  it("scores a missing target as zero across both rounds", async () => {
    const h = await setup("tap-score-missing-zero");
    const targetCount = h.exercise.targets.length;
    const firstRound = h.exercise.targets.slice(1).map((target, index) => ({
      sequence: index + 1,
      offsetMs: target.offsetMs,
    }));
    const secondRound = h.exercise.targets.map((target, index) => ({
      sequence: targetCount + index,
      offsetMs: target.offsetMs,
    }));
    const attempt = receiptFromRounds(h.exercise, [
      { roundNumber: 1, skipped: false, taps: firstRound },
      { roundNumber: 2, skipped: false, taps: secondRound },
    ]);
    const result = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2000,
    });

    expect(attempt.rounds?.[0].noteResults[0]).toMatchObject({
      matchStatus: "missing",
      noteAccuracyPercent: 0,
    });
    expect(attempt.rounds?.[0].missedTargetCount).toBe(1);
    expect(attempt.accuracyPercent).toBeCloseTo(
      ((targetCount * 2 - 1) / (targetCount * 2)) * 100
    );
    expect(result.status).toBe("graded");
    expect(result.correct).toBe(false);
    expect(result.scoreDelta).toBe(attempt.scoreOutOfTen);
    expect(result.session.questionsAnswered).toBe(1);
    await h.engine.dispose();
  });
  it("does not award or record an answer when both sealed rounds were skipped", async () => {
    const h = await setup("tap-score-both-rounds-skipped");
    const attempt = receiptFromRounds(h.exercise, [
      { roundNumber: 1, skipped: true, taps: [] },
      { roundNumber: 2, skipped: true, taps: [] },
    ]);
    expect(attempt.accuracyPercent).toBeNull();
    expect(attempt.scoreOutOfTen).toBeNull();
    expect(attempt.rounds?.map(round => round.status)).toEqual([
      "skipped",
      "skipped",
    ]);
    const result = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2000,
    });

    expect(result.status).toBe("technical-abort");
    expect(result.scoreDelta).toBe(0);
    expect(result.session).toBe(h.session);
    expect(result.session.questionsAnswered).toBe(0);
    expect(result.session.correctAnswers).toBe(0);
    expect(result.session.incorrectAnswers).toBe(0);
    expect(result.session.totalScore).toBe(0);
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
  it("never awards a stale completed attempt after its question was explicitly skipped", async () => {
    const h = await setup("tap-skip-before-answer");
    const attempt = complete(h);
    const next = createCanonicalTapStressExercise({
      track: 3,
      pattern: h.exercise.pattern,
      id: "tap-skip-before-answer-next",
    });
    const stale = { ...h.session };
    const skipped = skipRhythmExercise(stale, h.exercise, next, "graded");
    expect(skipped.status).toBe("skipped");
    expect(skipped.session.questionsAnswered).toBe(0);
    const submitted = submitRhythmExerciseAnswer(stale, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2000,
    });
    expect(submitted.status).toBe("duplicate");
    expect(submitted.scoreDelta).toBe(0);
    expect(submitted.session.questionsAnswered).toBe(0);
    await h.engine.dispose();
  });
  it("never applies Skip to a cloned stale snapshot of an already answered Tap question", async () => {
    const h = await setup("tap-answer-before-skip");
    const attempt = complete(h);
    const answered = submitRhythmExerciseAnswer(h.session, h.exercise, {
      type: "answer",
      answer: attempt,
      responseTimeMs: 2000,
    });
    expect(answered.scoreDelta).toBe(10);
    const next = createCanonicalTapStressExercise({
      track: 3,
      pattern: h.exercise.pattern,
      id: "tap-answer-before-skip-next",
    });
    const stale = { ...h.session };
    const skipped = skipRhythmExercise(stale, h.exercise, next, "graded");
    expect(skipped.status).toBe("duplicate");
    expect(skipped.scoreDelta).toBe(0);
    expect(skipped.session).toBe(stale);
    expect(answered.session.totalScore).toBe(10);
    await h.engine.dispose();
  });
  it("excludes invalid sealed Accuracy from awards rather than exceeding ten points or fabricating a grade", async () => {
    const h = await setup("tap-invalid-accuracy");
    const attempt = complete(h);
    for (const accuracyPercent of [NaN, Infinity, -1, 101]) {
      const submitted = submitRhythmExerciseAnswer(h.session, h.exercise, {
        type: "answer",
        answer: sealTapAttempt({ ...attempt, accuracyPercent }),
        responseTimeMs: 2000,
      });
      expect(submitted.status).toBe("technical-abort");
      expect(submitted.session).toBe(h.session);
      expect(submitted.scoreDelta).toBe(0);
    }
    await h.engine.dispose();
  });
});

describe("Rhythm skip and advance integration", () => {
  function exercise(id: string): RhythmGradedExercise {
    return { id, kind: "multiple-choice" } as RhythmGradedExercise;
  }

  it.each([
    [20, 15],
    [5, 0],
    [2, 0],
    [0, 0],
  ])(
    "graded skip clamps score %i to %i, adds no answer, and is idempotent",
    (score, expectedScore) => {
      const current = exercise(`graded-skip-${score}`);
      const next = exercise(`graded-next-${score}`);
      const initial = createRhythmTrainingSession(
        {
          mode: "challenge",
          plannedQuestions: null,
          sessionId: `graded-skip-session-${score}`,
        },
        current
      );
      const session = { ...initial, totalScore: score };
      const skipped = skipRhythmExercise(session, current, next, "graded", 123);

      expect(skipped.status).toBe("skipped");
      expect(skipped.scoreDelta).toBe(expectedScore - score);
      expect(skipped.session.currentExercise.id).toBe(next.id);
      expect(skipped.session.sessionId).toBe(session.sessionId);
      expect(skipped.session.totalScore).toBe(expectedScore);
      expect(skipped.session.questionsAnswered).toBe(0);
      expect(skipped.session.correctAnswers).toBe(0);
      expect(skipped.session.incorrectAnswers).toBe(0);
      expect(skipped.session.accuracy).toBe(0);
      expect(skipped.session.responseTimeTotalMs).toBe(0);
      expect(skipped.session.completedAt).toBeNull();
      expect(skipped.session.hasAnsweredCurrent).toBe(false);

      const duplicate = skipRhythmExercise(
        skipped.session,
        current,
        next,
        "graded"
      );
      expect(duplicate.status).toBe("duplicate");
      expect(duplicate.scoreDelta).toBe(0);
      expect(duplicate.session).toBe(skipped.session);
    }
  );

  it("practice skip preserves score, and stale or same-item skips do not advance", () => {
    const current = exercise("practice-skip-current");
    const next = exercise("practice-skip-next");
    const initial = createRhythmTrainingSession(
      {
        mode: "free",
        plannedQuestions: null,
        sessionId: "practice-skip-session",
      },
      current
    );
    const session = { ...initial, totalScore: 20 };
    const sameItem = skipRhythmExercise(session, current, current, "graded");
    expect(sameItem.status).toBe("stale-exercise");
    expect(sameItem.session).toBe(session);
    const skipped = skipRhythmExercise(session, current, next, "practice");
    expect(skipped.status).toBe("skipped");
    expect(skipped.scoreDelta).toBe(0);
    expect(skipped.session.totalScore).toBe(20);
    expect(skipped.session.questionsAnswered).toBe(0);

    const stale = skipRhythmExercise(session, next, current, "graded");
    expect(stale.status).toBe("stale-exercise");
    expect(stale.session).toBe(session);
  });

  it("advances through the answer-aware wrapper without inventing an answer", () => {
    const current = exercise("advance-current");
    const next = exercise("advance-next");
    const initial = createRhythmTrainingSession(
      { mode: "free", plannedQuestions: null, sessionId: "advance-session" },
      current
    );
    const unansweredNext = advanceRhythmSession(initial, next);
    expect(unansweredNext.currentExercise.id).toBe(next.id);
    expect(unansweredNext.sessionId).toBe(initial.sessionId);
    expect(unansweredNext.questionsAnswered).toBe(0);
    expect(unansweredNext.totalScore).toBe(0);

    const answered = submitSessionAnswer(initial, true, 100, 10, 10);
    const answeredNext = advanceRhythmSession(answered, next);
    expect(answeredNext.currentExercise.id).toBe(next.id);
    expect(answeredNext.questionsAnswered).toBe(1);
    expect(answeredNext.totalScore).toBe(10);
    expect(answeredNext.hasAnsweredCurrent).toBe(false);
  });
});

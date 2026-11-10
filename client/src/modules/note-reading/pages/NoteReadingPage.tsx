import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { TrainingHeader, TrainingFooter } from "@/app/TrainingShell";
import { ResultSummary } from "@/features/training/ResultSummary";
import { recordCompletedResult } from "@/features/training/progress";
import { advanceSession, createTrainingSession, finishSession, submitSessionAnswer, toTrainingResult } from "@/features/training/session";
import type { TrainingSession } from "@/features/training/session";
import { ExerciseSetup, type SetupValues } from "../components/ExerciseSetup";
import { VirtualPiano } from "../components/VirtualPiano";
import { AutoAdvanceSwitch } from "../components/AutoAdvanceSwitch";
import { ledgerRangeLabel, midiPitch, NOTE_LETTERS, NOTE_SOLFEGE } from "../notation/musicTheory";
import { VexFlowStaff } from "../notation/VexFlowStaff";
import { generateDailyExercises, generateExercise } from "../services/exercises";
import { legacyRangeAlias, readPracticePreferences, savePracticePreferences } from "../services/preferences";
import { useAutoAdvance } from "../services/useAutoAdvance";
import { noteReadingModule } from "../module";
import type { NoteAnswer, NoteExercise } from "../types";

const DEFAULT_SETUP: SetupValues = {
  clef: "treble",
  range: "one-ledger",
  mode: "free",
  answerMethod: "multiple-choice",
  questionCount: 10,
  speedLimitSeconds: null,
  ledgerRange: { above: 1, below: 1 },
  autoAdvance: true,
};

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeExercise(configuration: SetupValues, index: number, previous?: NoteExercise["note"]): NoteExercise {
  return generateExercise({
    clef: configuration.clef,
    range: configuration.range,
    ledgerRange: configuration.ledgerRange,
    exerciseId: `note-${Date.now()}-${index}`,
    index,
    previous: previous ? { clef: previous.clef, diatonicPosition: previous.diatonicPosition } : undefined,
  });
}

function ExerciseResult({ session, onRetry, onSetup }: { session: TrainingSession<NoteExercise>; onRetry: () => void; onSetup: () => void }) {
  const result = toTrainingResult(session);
  if (!result) return null;
  return (
    <section className="result-view" aria-labelledby="result-title">
      <div className="result-badge"><Trophy size={28} /></div>
      <p className="panel-eyebrow">LƯỢT LUYỆN ĐÃ HOÀN THÀNH</p>
      <h2 id="result-title" tabIndex={-1}>Bạn đã làm rất tốt!</h2>
      <p className="result-subtitle">Mỗi nốt bạn đọc hôm nay giúp lần sau tự tin hơn.</p>
      <ResultSummary result={result} />
      <div className="result-actions">
        <button type="button" className="start-session-button" onClick={onRetry}><RotateCcw size={17} /> Luyện lại</button>
        <button type="button" className="secondary-action" onClick={onSetup}>Đổi thiết lập</button>
      </div>
    </section>
  );
}

export default function NoteReadingPage() {
  const [setup, setSetup] = useState<SetupValues>(() => {
    const preferences = readPracticePreferences();
    return { ...DEFAULT_SETUP, ...preferences, range: legacyRangeAlias(preferences.ledgerRange) };
  });
  const [session, setSession] = useState<TrainingSession<NoteExercise> | null>(null);
  const sessionRef = useRef<TrainingSession<NoteExercise> | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const resultVisibleRef = useRef(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [submittedAnswer, setSubmittedAnswer] = useState<NoteAnswer | null>(null);
  const sessionStartRef = useRef(0);
  const dailyExercisesRef = useRef<NoteExercise[]>([]);
  const savedSessionRef = useRef<string | null>(null);
  const challengeDateRef = useRef<string>("");
  const mainRef = useRef<HTMLElement>(null);

  const currentExercise = session?.currentExercise;
  const currentNote = currentExercise?.note;
  const complete = Boolean(session && session.completedAt !== null && resultVisible);
  const progress = session?.plannedQuestions ? Math.min((session.questionsAnswered / session.plannedQuestions) * 100, 100) : 0;
  const responseTime = elapsedMs;
  const remainingMs = setup.speedLimitSeconds === null ? null : Math.max(0, setup.speedLimitSeconds * 1000 - elapsedMs);
  const resultLabel = session?.hasAnsweredCurrent ? (session.lastAnswerCorrect ? "correct" : "incorrect") : null;
  const description = useMemo(() => {
    const clef = setup.clef === "mixed" ? "Khóa Sol & Fa" : setup.clef === "treble" ? "Khóa Sol" : "Khóa Fa";
    return `${clef} · ${ledgerRangeLabel(setup.ledgerRange)}`;
  }, [setup.clef, setup.ledgerRange.above, setup.ledgerRange.below]);

  const updateSession = useCallback((next: TrainingSession<NoteExercise> | null) => {
    // Synchronous identity/answer guards also cover multiple events in one render.
    sessionRef.current = next;
    setSession(next);
  }, []);

  const getNextExercise = useCallback((index: number, previous?: NoteExercise["note"]): NoteExercise => {
    if (setup.mode === "daily") {
      return dailyExercisesRef.current[index - 1] ?? generateExercise({ clef: setup.clef, range: setup.range, ledgerRange: setup.ledgerRange, exerciseId: `daily-fallback-${index}`, index });
    }
    return makeExercise(setup, index, previous);
  }, [setup.clef, setup.range, setup.ledgerRange.above, setup.ledgerRange.below, setup.mode]);

  function startSession() {
    const today = localDateKey();
    challengeDateRef.current = today;
    noteReadingModule.configSchema.parse({
      ...setup,
      challengeDate: today,
    });
    const plannedQuestions = setup.mode === "free" ? null : setup.mode === "daily" ? 10 : setup.questionCount;
    if (setup.mode === "daily") {
      dailyExercisesRef.current = generateDailyExercises(today, setup.clef, setup.range, plannedQuestions ?? 10, setup.ledgerRange);
    } else {
      dailyExercisesRef.current = [];
    }
    const firstExercise = getNextExercise(1);
    const created = createTrainingSession({
      moduleId: noteReadingModule.id,
      mode: setup.mode,
      plannedQuestions,
      sessionId: `${setup.mode}-${today}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      startedAt: Date.now(),
    }, firstExercise);
    cancelAutoAdvance();
    resultVisibleRef.current = false;
    setResultVisible(false);
    updateSession(created);
    setSubmittedAnswer(null);
    sessionStartRef.current = performance.now();
    setElapsedMs(0);
    savedSessionRef.current = null;
  }

  function submitAnswer(answer: NoteAnswer) {
    const current = sessionRef.current;
    if (!current || current.hasAnsweredCurrent || current.completedAt !== null || resultVisibleRef.current) return;
    if (current.sessionId !== session?.sessionId || current.currentExercise.id !== currentExercise?.id) return;
    const isCorrect = noteReadingModule.validateAnswer(current.currentExercise, answer);
    const spent = Math.max(0, performance.now() - sessionStartRef.current);
    setSubmittedAnswer(answer);
    updateSession(submitSessionAnswer(current, isCorrect, spent, 10, Date.now()));
    setElapsedMs(spent);
  }

  function chooseMultipleChoice(letter: (typeof NOTE_LETTERS)[number]) {
    if (!currentNote) return;
    const answer: NoteAnswer = { letter, octave: currentNote.octave, accidental: "natural", pitchValue: midiPitch(letter, currentNote.octave) };
    submitAnswer(answer);
  }

  const nextExercise = useCallback((expectedSessionId?: string, expectedExerciseId?: string) => {
    const current = sessionRef.current;
    if (!current || !current.hasAnsweredCurrent || resultVisibleRef.current) return;
    if ((expectedSessionId && current.sessionId !== expectedSessionId) || (expectedExerciseId && current.currentExercise.id !== expectedExerciseId)) return;
    cancelAutoAdvance();
    if (current.completedAt !== null) {
      resultVisibleRef.current = true;
      setResultVisible(true);
      return;
    }
    const nextIndex = current.questionsAnswered + 1;
    const next = getNextExercise(nextIndex, current.currentExercise.note);
    updateSession(advanceSession(current, next));
    setSubmittedAnswer(null);
    sessionStartRef.current = performance.now();
    setElapsedMs(0);
  }, [getNextExercise, updateSession]);

  const cancelAutoAdvance = useAutoAdvance({
    sessionId: session?.sessionId,
    exerciseId: currentExercise?.id,
    answered: Boolean(session?.hasAnsweredCurrent),
    active: Boolean(session && !resultVisible),
    enabled: setup.autoAdvance,
    onAdvance: nextExercise,
  });

  function changeAutoAdvance(autoAdvance: boolean) {
    cancelAutoAdvance();
    setSetup((current) => ({ ...current, autoAdvance }));
  }

  function stopSession() {
    cancelAutoAdvance();
    const current = sessionRef.current;
    if (!current) return;
    const finished = finishSession(current);
    updateSession(finished);
    if (finished.completedAt !== null) {
      resultVisibleRef.current = true;
      setResultVisible(true);
    }
  }

  function retrySession() {
    startSession();
  }

  function returnToSetup() {
    cancelAutoAdvance();
    updateSession(null);
    resultVisibleRef.current = false;
    setResultVisible(false);
    setSubmittedAnswer(null);
    setElapsedMs(0);
  }

  useEffect(() => {
    savePracticePreferences({ autoAdvance: setup.autoAdvance, ledgerRange: setup.ledgerRange });
  }, [setup.autoAdvance, setup.ledgerRange.above, setup.ledgerRange.below]);

  useEffect(() => {
    if (!session || complete || session.hasAnsweredCurrent) return;
    const tick = () => {
      const current = sessionRef.current;
      if (!current || current.sessionId !== session.sessionId || current.currentExercise.id !== session.currentExercise.id || current.hasAnsweredCurrent || current.completedAt !== null) return;
      const value = performance.now();
      const elapsed = Math.max(0, value - sessionStartRef.current);
      setElapsedMs(elapsed);
      if (session.mode === "speed" && setup.speedLimitSeconds !== null && elapsed >= setup.speedLimitSeconds * 1000) {
        updateSession(submitSessionAnswer(current, false, setup.speedLimitSeconds * 1000, 10, Date.now()));
      }
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [session?.sessionId, session?.currentExercise.id, session?.hasAnsweredCurrent, session?.completedAt, complete, setup.mode, setup.speedLimitSeconds]);

  useEffect(() => {
    if (!session || session.completedAt === null || savedSessionRef.current === session.sessionId) return;
    const result = toTrainingResult(session);
    if (!result) return;
    savedSessionRef.current = session.sessionId;
    recordCompletedResult(result);
  }, [session?.completedAt, session?.sessionId, session?.questionsAnswered, session?.correctAnswers]);

  useEffect(() => {
    if (!session || session.hasAnsweredCurrent || complete || setup.answerMethod !== "multiple-choice") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !(event.key >= "1" && event.key <= "7")) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      chooseMultipleChoice(NOTE_LETTERS[Number(event.key) - 1]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session?.sessionId, session?.currentExercise.id, session?.hasAnsweredCurrent, complete, setup.answerMethod, currentNote]);

  useEffect(() => {
    const selector = !session ? "h1" : complete ? "#result-title" : session.hasAnsweredCurrent ? ".continue-button" : setup.answerMethod === "piano" ? ".piano-scroll" : ".note-answer";
    mainRef.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [session?.sessionId, session?.currentExercise.id, session?.hasAnsweredCurrent, complete, setup.answerMethod]);

  const isSpeed = setup.mode === "speed";
  const clockValue = isSpeed && remainingMs !== null ? `${Math.ceil(remainingMs / 1000)}s` : `${(responseTime / 1000).toFixed(1)}s`;

  return (
    <div className="training-app">
      <TrainingHeader currentModuleId={noteReadingModule.id} />

      <main className="module-main" ref={mainRef}>
        <div className="module-breadcrumb"><Link href="/">Học nhạc</Link><span>/</span><span>Đọc nốt</span></div>
        {!session ? (
          <>
            <div className="module-heading-row"><div><span className="module-kicker">MODULE 01 · NOTE READING</span><h1 tabIndex={-1}>Đọc nốt nhạc</h1><p>Nhận diện nốt đúng vị trí trên khuông, từ khóa Sol đến khóa Fa.</p></div><span className="free-pill"><Sparkles size={14} /> MIỄN PHÍ · KHÔNG CẦN TÀI KHOẢN</span></div>
            <ExerciseSetup value={setup} onChange={setSetup} onStart={startSession} />
          </>
        ) : complete ? (
          <>
            <div className="module-heading-row"><div><span className="module-kicker">{session.mode.toUpperCase()} · SESSION COMPLETE</span><h1>Kết quả luyện tập</h1></div><button type="button" className="text-action" onClick={returnToSetup}><ArrowLeft size={15} /> Đổi thiết lập</button></div>
            <ExerciseResult session={session} onRetry={retrySession} onSetup={returnToSetup} />
          </>
        ) : currentExercise && currentNote ? (
          <>
            <div className="module-heading-row practice-heading"><div><span className="module-kicker">MODULE 01 · {session.mode.toUpperCase()}</span><h1>Luyện đọc nốt</h1><p>{description}{session.mode === "daily" ? ` · ${challengeDateRef.current}` : ""}</p></div>{(session.mode === "free" || session.mode === "speed") && <button type="button" className="text-action" onClick={stopSession} disabled={session.questionsAnswered === 0}><X size={15} /> Kết thúc lượt</button>}</div>
            <section className="exercise-workspace" aria-label="Bài luyện đọc nốt">
              <div className="exercise-main">
                <div className="exercise-toolbar"><div className="exercise-context"><span className="context-mark">01</span><span><strong>{session.mode === "daily" ? "Thử thách hôm nay" : session.mode === "speed" ? "Luyện tốc độ" : session.mode === "challenge" ? "Thử thách" : "Luyện tự do"}</strong><small>{description}</small></span></div><div className="exercise-toolbar-right"><span className="answer-help">{setup.answerMethod === "multiple-choice" ? "PHÍM 1—7 ĐỂ TRẢ LỜI" : "CHỌN ĐÚNG NỐT & QUÃNG TÁM"}</span><button type="button" className="exit-practice" onClick={returnToSetup} aria-label="Quay lại thiết lập"><X size={16} /></button></div></div>
                <div className="practice-options"><AutoAdvanceSwitch compact enabled={setup.autoAdvance} onChange={changeAutoAdvance} /></div>
                <div className="exercise-progress"><div className="progress-copy"><span>{session.mode === "free" ? `Câu ${currentExercise.index}` : `Câu ${currentExercise.index} / ${session.plannedQuestions}`}</span><span>{session.totalScore} điểm</span></div><div className="progress-track"><span style={{ width: session.mode === "free" ? `${Math.min((session.questionsAnswered % 10) * 10 + 4, 100)}%` : `${progress}%` }} /></div></div>
                <div className={`notation-stage ${resultLabel ? `is-${resultLabel}` : ""}`}>
                  <div className="notation-stage-top"><span className="clef-label"><span className="clef-symbol">{currentNote.clef === "treble" ? "𝄞" : "𝄢"}</span> KHÓA {currentNote.clef === "treble" ? "SOL" : "FA"}</span><span className="notation-instruction">Hãy đọc tên nốt đang được hiển thị</span></div>
                  <VexFlowStaff note={currentNote} revealAnswer={Boolean(resultLabel)} feedback={resultLabel === "correct" ? "correct" : resultLabel === "incorrect" ? "incorrect" : null} />
                  <p className="note-prompt">Nốt nào đang ở trên khuông nhạc?</p>
                </div>
                <div className="answer-section">
                  <div className="answer-section-heading"><strong>{setup.answerMethod === "multiple-choice" ? "Chọn tên nốt" : "Chọn phím đàn"}</strong>{setup.answerMethod === "multiple-choice" && <span>Đô · Rê · Mi · Fa · Sol · La · Si</span>}</div>
                  {setup.answerMethod === "multiple-choice" ? (
                    <div className="note-answer-grid" role="group" aria-label="Chọn một trong bảy nốt tự nhiên">
                      {NOTE_LETTERS.map((letter, index) => <button key={letter} type="button" className={`note-answer ${session.hasAnsweredCurrent && letter === currentNote.letter ? "answer-is-correct" : ""} ${session.hasAnsweredCurrent && session.lastAnswerCorrect === false && submittedAnswer?.letter === letter ? "answer-selected-wrong" : ""}`} onClick={() => chooseMultipleChoice(letter)} disabled={session.hasAnsweredCurrent} aria-label={`${NOTE_SOLFEGE[letter]} (${letter})`}><span className="answer-number">{index + 1}</span><strong>{NOTE_SOLFEGE[letter]}</strong>{session.hasAnsweredCurrent && letter === currentNote.letter && <Check size={17} />}</button>)}
                    </div>
                  ) : <VirtualPiano target={currentNote} disabled={session.hasAnsweredCurrent} lastAnswer={submittedAnswer} lastAnswerCorrect={session.lastAnswerCorrect} onAnswer={submitAnswer} />}
                </div>
                {session.hasAnsweredCurrent ? (
                  <div className={`answer-feedback ${session.lastAnswerCorrect ? "feedback-correct" : "feedback-incorrect"}`} role="status" aria-live="polite">
                    <span className="feedback-icon">{session.lastAnswerCorrect ? <Check size={17} /> : <X size={17} />}</span><span><strong>{session.lastAnswerCorrect ? "Chính xác!" : "Chưa đúng, mình thử lại nhé."}</strong><small>Đáp án là {NOTE_SOLFEGE[currentNote.letter]} ({currentNote.letter}{currentNote.octave}). {session.lastAnswerCorrect ? "+10 điểm" : "Không trừ điểm."}</small></span>
                    <button type="button" className="continue-button" onClick={() => nextExercise()}>{session.completedAt !== null ? "Xem kết quả" : "Câu tiếp theo"} <ArrowRight size={16} /></button>
                  </div>
                ) : (
                  <div className="exercise-bottom-note"><span className="note-dot" />{setup.answerMethod === "piano" ? "Nghe nốt khi bấm phím; chọn đúng cả tên nốt lẫn quãng tám." : "Đọc vị trí nốt trước khi chọn — phím số 1 đến 7 cũng dùng được."}</div>
                )}
                {session.hasAnsweredCurrent && <p className="feedback-auto-note">{setup.autoAdvance ? (session.completedAt !== null ? "Tự động xem kết quả sau 0,9 giây." : "Tự động chuyển câu sau 0,9 giây.") : "Phản hồi được giữ lại đến khi bạn tiếp tục."}</p>}
              </div>
              <aside className="exercise-side-rail" aria-label="Thống kê lượt luyện">
                <span className="rail-eyebrow">TIẾN TRÌNH</span><div className="side-stat"><span>Đã trả lời</span><strong>{session.questionsAnswered}{session.plannedQuestions ? <small> / {session.plannedQuestions}</small> : ""}</strong></div><div className="side-stat"><span>Đúng</span><strong className="stat-positive">{session.correctAnswers}</strong></div><div className="side-stat"><span>Độ chính xác</span><strong>{session.accuracy}%</strong></div><div className="side-stat"><span>Điểm</span><strong>{session.totalScore}</strong></div><div className="side-divider" /><div className={`timer-card ${isSpeed ? "timer-active" : ""}`}><Clock3 size={17} /><span>{isSpeed && remainingMs !== null ? "Còn lại" : "Thời gian câu"}<strong>{clockValue}</strong></span></div><p className="rail-tip"><Sparkles size={14} />Sai không bị trừ điểm. Cứ tập trung ghi nhớ từng nốt.</p>
              </aside>
            </section>
          </>
        ) : null}
        <TrainingFooter />
      </main>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Clock3, Home, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { advanceSession, createTrainingSession, finishSession, submitSessionAnswer, toTrainingResult } from "@/features/training/session";
import type { TrainingSession } from "@/features/training/session";
import { ExerciseSetup, type SetupValues } from "../components/ExerciseSetup";
import { VirtualPiano } from "../components/VirtualPiano";
import { midiPitch, NOTE_LETTERS, NOTE_RANGES, NOTE_SOLFEGE } from "../notation/musicTheory";
import { VexFlowStaff } from "../notation/VexFlowStaff";
import { generateDailyExercises, generateExercise } from "../services/exercises";
import { noteReadingModule } from "../module";
import type { NoteAnswer, NoteExercise } from "../types";

const PROGRESS_KEY = "thaikeyboard-music-training-progress-v1";
const DEFAULT_SETUP: SetupValues = {
  clef: "treble",
  range: "staff",
  mode: "free",
  answerMethod: "multiple-choice",
  questionCount: 10,
  speedLimitSeconds: null,
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
    exerciseId: `note-${Date.now()}-${index}`,
    index,
    previous: previous ? { clef: previous.clef, diatonicPosition: previous.diatonicPosition } : undefined,
  });
}

function saveCompletedProgress(sessionId: string, answered: number, correct: number) {
  try {
    const oldValue = localStorage.getItem(PROGRESS_KEY);
    const current = oldValue ? JSON.parse(oldValue) as { lastSessionId?: string; sessionsCompleted?: number; questionsAnswered?: number; correctAnswers?: number } : {};
    if (current.lastSessionId === sessionId) return;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      lastSessionId: sessionId,
      sessionsCompleted: (current.sessionsCompleted ?? 0) + 1,
      questionsAnswered: (current.questionsAnswered ?? 0) + answered,
      correctAnswers: (current.correctAnswers ?? 0) + correct,
    }));
  } catch {
    // Practice remains fully usable if browser storage is unavailable.
  }
}

function ExerciseResult({ session, onRetry, onSetup }: { session: TrainingSession<NoteExercise>; onRetry: () => void; onSetup: () => void }) {
  const result = toTrainingResult(session);
  if (!result) return null;
  const seconds = Math.max(0, Math.round(result.averageResponseTimeMs / 100) / 10);
  return (
    <section className="result-view" aria-labelledby="result-title">
      <div className="result-badge"><Trophy size={28} /></div>
      <p className="panel-eyebrow">LƯỢT LUYỆN ĐÃ HOÀN THÀNH</p>
      <h2 id="result-title">Bạn đã làm rất tốt!</h2>
      <p className="result-subtitle">Mỗi nốt bạn đọc hôm nay giúp lần sau tự tin hơn.</p>
      <div className="result-score"><strong>{result.accuracy}%</strong><span>độ chính xác</span></div>
      <div className="result-stats">
        <div><strong>{result.totalQuestions}</strong><span>Tổng số câu</span></div>
        <div><strong>{result.correctAnswers}</strong><span>Trả lời đúng</span></div>
        <div><strong>{result.incorrectAnswers}</strong><span>Cần luyện thêm</span></div>
        <div><strong>{result.totalScore}</strong><span>Điểm tích lũy</span></div>
        <div><strong>{seconds}s</strong><span>Thời gian trung bình</span></div>
      </div>
      <div className="result-actions">
        <button type="button" className="start-session-button" onClick={onRetry}><RotateCcw size={17} /> Luyện lại</button>
        <button type="button" className="secondary-action" onClick={onSetup}>Đổi thiết lập</button>
      </div>
    </section>
  );
}

export default function NoteReadingPage() {
  const [setup, setSetup] = useState<SetupValues>(DEFAULT_SETUP);
  const [session, setSession] = useState<TrainingSession<NoteExercise> | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [submittedAnswer, setSubmittedAnswer] = useState<NoteAnswer | null>(null);
  const sessionStartRef = useRef(0);
  const dailyExercisesRef = useRef<NoteExercise[]>([]);
  const savedSessionRef = useRef<string | null>(null);

  const currentExercise = session?.currentExercise;
  const currentNote = currentExercise?.note;
  const complete = Boolean(session?.completedAt);
  const progress = session?.plannedQuestions ? Math.min((session.questionsAnswered / session.plannedQuestions) * 100, 100) : 0;
  const responseTime = session?.hasAnsweredCurrent ? session.averageResponseTimeMs : elapsedMs;
  const remainingMs = setup.speedLimitSeconds === null ? null : Math.max(0, setup.speedLimitSeconds * 1000 - elapsedMs);
  const resultLabel = session?.hasAnsweredCurrent ? (session.lastAnswerCorrect ? "correct" : "incorrect") : null;
  const description = useMemo(() => {
    const clef = setup.clef === "mixed" ? "Khóa Sol & Fa" : setup.clef === "treble" ? "Khóa Sol" : "Khóa Fa";
    return `${clef} · ${NOTE_RANGES[setup.range].label}`;
  }, [setup.clef, setup.range]);

  const getNextExercise = useCallback((index: number, previous?: NoteExercise["note"]): NoteExercise => {
    if (setup.mode === "daily") {
      return dailyExercisesRef.current[index - 1] ?? generateExercise({ clef: setup.clef, range: setup.range, exerciseId: `daily-fallback-${index}`, index });
    }
    return makeExercise(setup, index, previous);
  }, [setup]);

  function startSession() {
    const today = localDateKey();
    noteReadingModule.configSchema?.parse({
      ...setup,
      challengeDate: today,
    });
    const plannedQuestions = setup.mode === "free" ? null : setup.mode === "daily" ? 10 : setup.questionCount;
    if (setup.mode === "daily") {
      dailyExercisesRef.current = generateDailyExercises(today, setup.clef, setup.range, plannedQuestions ?? 10);
    } else {
      dailyExercisesRef.current = [];
    }
    const firstExercise = getNextExercise(1);
    const created = createTrainingSession({
      moduleId: noteReadingModule.id,
      mode: setup.mode,
      clefConfiguration: setup.clef,
      noteRange: setup.range,
      plannedQuestions,
      sessionId: `${setup.mode}-${today}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      startedAt: Date.now(),
    }, firstExercise);
    setSession(created);
    setSubmittedAnswer(null);
    sessionStartRef.current = performance.now();
    setElapsedMs(0);
    savedSessionRef.current = null;
  }

  function submitAnswer(answer: NoteAnswer) {
    if (!session || !currentNote || session.hasAnsweredCurrent || session.completedAt !== null) return;
    const isCorrect = noteReadingModule.validateAnswer(session.currentExercise, answer);
    const spent = Math.max(0, performance.now() - sessionStartRef.current);
    setSubmittedAnswer(answer);
    const nextSession = submitSessionAnswer(session, isCorrect, spent, 10, Date.now());
    setSession(nextSession);
    setElapsedMs(spent);
  }

  function chooseMultipleChoice(letter: (typeof NOTE_LETTERS)[number]) {
    if (!currentNote) return;
    const answer: NoteAnswer = { letter, octave: currentNote.octave, accidental: "natural", pitchValue: midiPitch(letter, currentNote.octave) };
    submitAnswer(answer);
  }

  function nextExercise() {
    if (!session || !session.hasAnsweredCurrent || session.completedAt !== null) return;
    const nextIndex = session.questionsAnswered + 1;
    const next = getNextExercise(nextIndex, session.currentExercise.note);
    setSession(advanceSession(session, next));
    setSubmittedAnswer(null);
    sessionStartRef.current = performance.now();
    setElapsedMs(0);
  }

  function stopSession() {
    setSession((current) => current ? finishSession(current) : current);
  }

  function retrySession() {
    startSession();
  }

  function returnToSetup() {
    setSession(null);
    setElapsedMs(0);
  }

  useEffect(() => {
    if (!session || complete || session.hasAnsweredCurrent) return;
    const tick = () => {
      const value = performance.now();
      const elapsed = Math.max(0, value - sessionStartRef.current);
      setElapsedMs(elapsed);
      if (session.mode === "speed" && setup.speedLimitSeconds !== null && elapsed >= setup.speedLimitSeconds * 1000) {
        setSession((current) => current && !current.hasAnsweredCurrent && current.completedAt === null
          ? submitSessionAnswer(current, false, setup.speedLimitSeconds! * 1000, 10, Date.now())
          : current);
      }
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [session?.sessionId, session?.currentExercise.id, session?.hasAnsweredCurrent, session?.completedAt, complete, setup.mode, setup.speedLimitSeconds]);

  useEffect(() => {
    if (!session?.completedAt || savedSessionRef.current === session.sessionId) return;
    savedSessionRef.current = session.sessionId;
    saveCompletedProgress(session.sessionId, session.questionsAnswered, session.correctAnswers);
  }, [session?.completedAt, session?.sessionId, session?.questionsAnswered, session?.correctAnswers]);

  useEffect(() => {
    if (!session || session.hasAnsweredCurrent || complete) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !(event.key >= "1" && event.key <= "7")) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      if (setup.answerMethod === "multiple-choice") chooseMultipleChoice(NOTE_LETTERS[Number(event.key) - 1]);
      else if (currentNote) {
        const index = Number(event.key) - 1;
        const letter = NOTE_LETTERS[index];
        const answer: NoteAnswer = { letter, octave: currentNote.octave, accidental: "natural", pitchValue: midiPitch(letter, currentNote.octave) };
        submitAnswer(answer);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session?.sessionId, session?.currentExercise.id, session?.hasAnsweredCurrent, complete, setup.answerMethod, currentNote]);

  const isSpeed = setup.mode === "speed";
  const clockValue = isSpeed && remainingMs !== null ? `${Math.ceil(remainingMs / 1000)}s` : `${(responseTime / 1000).toFixed(1)}s`;

  return (
    <div className="training-app">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="wordmark" aria-label="THAIKEYBOARD Music Training, trang chủ"><span className="brand-key" aria-hidden="true"><i /><i /><i /></span><span>THAIKEYBOARD<small>MUSIC TRAINING</small></span></Link>
          <nav aria-label="Điều hướng"><Link href="/" className="nav-link"><Home size={15} /> Trang chủ</Link><span className="nav-current">Đọc nốt</span></nav>
        </div>
      </header>

      <main className="module-main">
        <div className="module-breadcrumb"><Link href="/">Học nhạc</Link><span>/</span><span>Đọc nốt</span></div>
        {!session ? (
          <>
            <div className="module-heading-row"><div><span className="module-kicker">MODULE 01 · NOTE READING</span><h1>Đọc nốt nhạc</h1><p>Nhận diện nốt đúng vị trí trên khuông, từ khóa Sol đến khóa Fa.</p></div><span className="free-pill"><Sparkles size={14} /> MIỄN PHÍ · KHÔNG CẦN TÀI KHOẢN</span></div>
            <ExerciseSetup value={setup} onChange={setSetup} onStart={startSession} />
          </>
        ) : complete ? (
          <>
            <div className="module-heading-row"><div><span className="module-kicker">{session.mode.toUpperCase()} · SESSION COMPLETE</span><h1>Kết quả luyện tập</h1></div><button type="button" className="text-action" onClick={returnToSetup}><ArrowLeft size={15} /> Đổi thiết lập</button></div>
            <ExerciseResult session={session} onRetry={retrySession} onSetup={returnToSetup} />
          </>
        ) : currentExercise && currentNote ? (
          <>
            <div className="module-heading-row practice-heading"><div><span className="module-kicker">MODULE 01 · {session.mode.toUpperCase()}</span><h1>Luyện đọc nốt</h1><p>{description}{session.mode === "daily" ? ` · ${localDateKey()}` : ""}</p></div><button type="button" className="text-action" onClick={stopSession} disabled={session.questionsAnswered === 0}><X size={15} /> Kết thúc lượt</button></div>
            <section className="exercise-workspace" aria-label="Bài luyện đọc nốt">
              <div className="exercise-main">
                <div className="exercise-toolbar"><div className="exercise-context"><span className="context-mark">01</span><span><strong>{session.mode === "daily" ? "Thử thách hôm nay" : session.mode === "speed" ? "Luyện tốc độ" : session.mode === "challenge" ? "Thử thách" : "Luyện tự do"}</strong><small>{description}</small></span></div><div className="exercise-toolbar-right"><span className="answer-help">{setup.answerMethod === "multiple-choice" ? "PHÍM 1—7 ĐỂ TRẢ LỜI" : "CHỌN ĐÚNG NỐT & QUÃNG TÁM"}</span><button type="button" className="exit-practice" onClick={returnToSetup} aria-label="Quay lại thiết lập"><X size={16} /></button></div></div>
                <div className="exercise-progress"><div className="progress-copy"><span>{session.mode === "free" ? `Câu ${session.questionsAnswered + 1}` : `Câu ${Math.min(session.questionsAnswered + 1, session.plannedQuestions ?? 0)} / ${session.plannedQuestions}`}</span><span>{session.totalScore} điểm</span></div><div className="progress-track"><span style={{ width: session.mode === "free" ? `${Math.min((session.questionsAnswered % 10) * 10 + 4, 100)}%` : `${progress}%` }} /></div></div>
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
                    {session.completedAt ? <button type="button" className="continue-button" onClick={() => setSession((value) => value)} disabled>Đã xong</button> : <button type="button" className="continue-button" onClick={nextExercise}>Câu tiếp <ArrowRight size={16} /></button>}
                  </div>
                ) : (
                  <div className="exercise-bottom-note"><span className="note-dot" />{setup.answerMethod === "piano" ? "Nghe nốt khi bấm phím; chọn đúng cả tên nốt lẫn quãng tám." : "Đọc vị trí nốt trước khi chọn — phím số 1 đến 7 cũng dùng được."}</div>
                )}
              </div>
              <aside className="exercise-side-rail" aria-label="Thống kê lượt luyện">
                <span className="rail-eyebrow">TIẾN TRÌNH</span><div className="side-stat"><span>Đã trả lời</span><strong>{session.questionsAnswered}{session.plannedQuestions ? <small> / {session.plannedQuestions}</small> : ""}</strong></div><div className="side-stat"><span>Đúng</span><strong className="stat-positive">{session.correctAnswers}</strong></div><div className="side-stat"><span>Độ chính xác</span><strong>{session.accuracy}%</strong></div><div className="side-stat"><span>Điểm</span><strong>{session.totalScore}</strong></div><div className="side-divider" /><div className={`timer-card ${isSpeed ? "timer-active" : ""}`}><Clock3 size={17} /><span>{isSpeed && remainingMs !== null ? "Còn lại" : "Thời gian câu"}<strong>{clockValue}</strong></span></div><p className="rail-tip"><Sparkles size={14} />Sai không bị trừ điểm. Cứ tập trung ghi nhớ từng nốt.</p>
              </aside>
            </section>
          </>
        ) : null}
        <footer className="module-footer"><span>THAIKEYBOARD <i>·</i> MUSIC TRAINING</span><span>Học nhạc từng nốt, tiến bộ từng ngày.</span></footer>
      </main>
    </div>
  );
}

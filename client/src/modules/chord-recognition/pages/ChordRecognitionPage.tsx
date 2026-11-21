import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { BookOpen, Eye, Headphones } from "lucide-react";
import { TrainingFooter, TrainingHeader } from "@/app/TrainingShell";
import type { ChordConfiguration, ChordMethod, ChordPitch, ChordSession, PlaybackConfiguration } from "../types";
import { defaultChordConfiguration } from "../configuration";
import { generateChordQuestions } from "../generation/generator";
import { ChordAudioPlayer, canPlay } from "../audio/playback";
import { advanceChordQuestion, answerChordQuestion, createChordSession, skipChordQuestion, stopChordSession, toChordResult } from "../practice/session";
import { historyFor, recordChordResult } from "../practice/history";
import { ChordSetup } from "../components/ChordSetup";
import { ChordQuestionView } from "../components/ChordQuestionView";
import { ChordReference } from "../components/ChordReference";
import { ChordResults } from "../components/ChordResults";
import "./chord.css";

export default function ChordRecognitionPage() {
  const [method, setMethod] = useState<ChordMethod>("visual");
  const [configs, setConfigs] = useState<Record<ChordMethod, ChordConfiguration>>({ visual: defaultChordConfiguration("visual"), ear: defaultChordConfiguration("ear") });
  const [sessions, setSessions] = useState<Record<ChordMethod, ChordSession | null>>({ visual: null, ear: null });
  const sessionsRef = useRef(sessions);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const [historyVersion, setHistoryVersion] = useState(0);
  const [plays, setPlays] = useState(0);
  const playsRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [playback, setPlayback] = useState<PlaybackConfiguration>(configs.ear.playback);
  const player = useRef<ChordAudioPlayer | null>(null);
  if (player.current === null) player.current = new ChordAudioPlayer();
  const audioEpoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedSequence = useRef(Date.now() >>> 0);
  const session = sessions[method];
  const config = configs[method];
  const questionId = session?.status === "active" ? session.records[session.index].question.id : null;

  function stopAudio() {
    audioEpoch.current++;
    player.current?.stop();
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    busyRef.current = false;
    setBusy(false);
  }
  useEffect(() => {
    stopAudio();
    playsRef.current = 0;
    setPlays(0);
    if (session) setPlayback(session.config.playback);
    // A new question or method owns a new replay budget, never a new AudioContext.
  }, [questionId, method]);
  useEffect(() => () => { audioEpoch.current++; player.current?.stop(); if (timer.current !== null) clearTimeout(timer.current); }, []);

  function store(next: ChordSession | null) {
    if (next && next.status !== "active") {
      const result = toChordResult(next)!;
      if (recordChordResult(result)) {
        setSavedIds(ids => new Set([...ids, next.id]));
        setHistoryVersion(v => v + 1);
      }
    }
    const updated = { ...sessionsRef.current, [method]: next };
    sessionsRef.current = updated;
    setSessions(updated);
  }
  function start(replay = false) {
    stopAudio(); setError(null);
    try {
      const previous = sessionsRef.current[method];
      const settings = replay && previous ? previous.config : configs[method];
      const seed = replay && previous ? previous.seed : ++seedSequence.current;
      const questions = replay && previous ? previous.questions : generateChordQuestions(settings, seed);
      store(createChordSession(settings, questions, seed));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo phiên luyện."); }
  }
  function extraQuestions(current: ChordSession) {
    return current.config.questionCount === null && current.index + 1 >= current.questions.length
      ? generateChordQuestions(current.config, (current.seed + current.questions.length) >>> 0, 30)
      : [];
  }
  function answer(answerId: string) {
    const current = sessionsRef.current[method];
    if (!current || !questionId) return;
    const next = answerChordQuestion(current, questionId, answerId);
    if (next !== current) { stopAudio(); store(next); }
  }
  function advance(skip: boolean) {
    const current = sessionsRef.current[method];
    if (!current || !questionId) return;
    try {
      const next = skip ? skipChordQuestion(current, questionId, extraQuestions(current)) : advanceChordQuestion(current, questionId, extraQuestions(current));
      if (next !== current) { stopAudio(); store(next); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể chuyển câu."); }
  }
  async function runAudio(pitches: readonly ChordPitch[], settings: PlaybackConfiguration, onStarted?: () => void) {
    stopAudio();
    const epoch = audioEpoch.current;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const played = await player.current!.play(pitches, settings);
      if (epoch !== audioEpoch.current) return;
      onStarted?.();
      timer.current = setTimeout(() => { if (audioEpoch.current === epoch) { busyRef.current = false; setBusy(false); timer.current = null; } }, (played.durationSeconds + 0.1) * 1000);
    } catch (cause) {
      if (epoch !== audioEpoch.current) return;
      busyRef.current = false; setBusy(false);
      setError(cause instanceof Error ? cause.message : "Không thể phát âm thanh. Hãy thử lại.");
    }
  }
  function playQuestion() {
    const current = sessionsRef.current.ear;
    if (method !== "ear" || !current || current.status !== "active" || busyRef.current || !canPlay(playsRef.current, current.config.replayLimit)) return;
    void runAudio(current.records[current.index].question.chord.pitches, playback, () => { playsRef.current++; setPlays(playsRef.current); });
  }
  const result = session ? toChordResult(session) : null;
  const history = historyFor(method, config.level); // each method/Level is independently filtered
  void historyVersion;

  return <div className="training-app chord-app">
    <TrainingHeader currentModuleId="chord-recognition" />
    <main className="module-main chord-main">
      <div className="module-breadcrumb"><Link href="/">Trang chủ</Link><span>/</span><span>Hợp âm</span></div>
      <div className="module-heading-row"><div><span className="module-kicker">MODULE 03 · CHORD TRAINING</span><h1>Nhận diện hợp âm</h1><p>Nhìn rõ cấu tạo. Nghe ra màu sắc. Luyện theo từng cấp độ.</p></div><button className="chord-secondary" aria-expanded={referenceOpen} aria-controls="chord-reference-panel" onClick={() => { stopAudio(); setReferenceOpen(!referenceOpen); }}><BookOpen size={16} />{referenceOpen ? "Thu gọn bảng tra cứu" : "Mở bảng tra cứu"}</button></div>
      <div className="chord-method-tabs" role="tablist" aria-label="Phương thức luyện hợp âm">{(["visual", "ear"] as const).map(m => <button key={m} role="tab" id={`chord-tab-${m}`} aria-controls="chord-method-panel" aria-selected={method === m} className={method === m ? "selected" : ""} onClick={() => { stopAudio(); setError(null); setMethod(m); }}>{m === "visual" ? <Eye size={20} /> : <Headphones size={20} />}<span><strong>{m === "visual" ? "Visual Recognition" : "Ear Training"}</strong><small>{m === "visual" ? "Nhìn và nhận biết" : "Nghe và nhận biết"}</small></span></button>)}</div>
      <div role="tabpanel" id="chord-method-panel" aria-labelledby={`chord-tab-${method}`}>
        {!session ? <div className="chord-setup-layout"><ChordSetup config={config} onChange={c => setConfigs(all => ({ ...all, [method]: c }))} onStart={() => start()} error={error} /><aside className="chord-learning-note"><span className="module-kicker">MỖI NGÀY MỘT CHÚT</span><h2>{method === "visual" ? <>Từ hình nốt,<br /><em>đến hợp âm.</em></> : <>Lắng nghe,<br /><em>nhận màu sắc.</em></>}</h2><p>{method === "visual" ? "Quan sát khoảng cách giữa các nốt trên khuông và các phím Piano để nhận ra đặc trưng hợp âm." : "Bắt đầu với Major và Minor. Thử nghe lần lượt từng nốt, rồi nghe cả hợp âm cùng lúc."}</p><div className="chord-note-levels">6 Level hợp âm <span>·</span> Thế đảo tùy chọn</div><p>Tra cứu bất cứ lúc nào mà không mất phiên luyện.</p></aside></div> : result ? <ChordResults result={result} saved={savedIds.has(session.id)} onReplay={() => start(true)} onNew={() => start()} onSetup={() => { stopAudio(); store(null); setError(null); }} /> : <><ChordQuestionView session={session} onAnswer={answer} onNext={() => advance(false)} onSkip={() => advance(true)} onStop={() => { stopAudio(); store(stopChordSession(sessionsRef.current[method]!)); }} onPlay={playQuestion} onStopAudio={stopAudio} plays={plays} busy={busy} playback={playback} setPlayback={setPlayback} />{error && <p role="alert" className="chord-error">{error}</p>}</>}
      </div>
      <div id="chord-reference-panel" hidden={!referenceOpen}><ChordReference onPlay={p => { void runAudio(p, { mode: "harmony", direction: "ascending", spacingMs: 350 }); }} onStop={stopAudio} /></div>
      <details className="chord-panel chord-history"><summary>Kết quả đã lưu · {method === "visual" ? "Visual" : "Ear"} · Level {config.level} ({history.length})</summary><p className="chord-muted">Chỉ lưu trên trình duyệt này. Không gộp kết quả giữa phương thức hoặc Level.</p>{history.length ? history.map(r => <div className="chord-history-row" key={r.sessionId}><span>{new Date(r.completedAt).toLocaleString("vi-VN")}</span><strong>{r.accuracy === null ? "Chưa có độ chính xác" : `${r.accuracy}%`}</strong><span>{r.correct}/{r.answered} đúng · {r.skipped} bỏ qua</span></div>) : <p className="chord-muted">Chưa có kết quả cho phương thức và Level này.</p>}</details>
      <TrainingFooter />
    </main>
  </div>;
}

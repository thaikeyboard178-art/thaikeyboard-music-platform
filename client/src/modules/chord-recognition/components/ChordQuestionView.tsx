import React from "react";
import { Eye, Headphones, Play, Square } from "lucide-react";
import type { ChordSession, PlaybackConfiguration } from "../types";
import { ChordStaff } from "../notation/ChordStaff";
import { ChordPiano } from "./ChordPiano";
import { PlaybackControls } from "./ChordSetup";
import { replayRemaining } from "../audio/playback";

export function ChordQuestionView({ session, onAnswer, onNext, onSkip, onStop, onPlay, onStopAudio, plays, busy, playback, setPlayback }: {
  session: ChordSession; onAnswer: (answer: string) => void; onNext: () => void; onSkip: () => void; onStop: () => void;
  onPlay: () => void; onStopAudio: () => void; plays: number; busy: boolean; playback: PlaybackConfiguration; setPlayback: (p: PlaybackConfiguration) => void;
}) {
  const record = session.records[session.index];
  const question = record.question;
  const revealed = record.status !== "unanswered";
  const remaining = replayRemaining(plays, session.config.replayLimit);
  const Icon = session.config.method === "visual" ? Eye : Headphones;
  return <section className="chord-panel chord-practice" aria-label="Bài luyện hợp âm">
    <div className="chord-panel-top"><span className="module-kicker"><Icon size={16} />{session.config.method === "visual" ? "VISUAL RECOGNITION" : "EAR TRAINING"} · LEVEL {session.config.level}</span><button className="chord-secondary" onClick={onStop}>Dừng phiên</button></div>
    <div className="chord-progress"><strong>Câu {session.index + 1}{session.config.questionCount !== null ? ` / ${session.config.questionCount}` : " · Không giới hạn"}</strong><span>{session.records.filter(r => r.status === "correct").length} đúng · {session.records.filter(r => r.status === "skipped").length} bỏ qua</span></div>
    <h2>{session.config.method === "visual" ? "Bạn nhận ra hợp âm nào?" : "Nghe và chọn hợp âm"}</h2>
    {session.config.method === "visual" ? <div className="chord-visual-stage">
      {session.config.display !== "piano" && <ChordStaff pitches={question.chord.pitches} reveal={revealed} />}
      {session.config.display !== "staff" && <ChordPiano pitches={question.chord.pitches} showLabels={revealed} />}
    </div> : <div className="chord-ear-stage">
      <div className="chord-listen-mark"><Headphones size={40} /></div>
      <p>Nghe cao độ và màu sắc của hợp âm, rồi chọn đáp án.</p>
      <div className="chord-actions"><button className="chord-primary" disabled={busy || plays > 0 && remaining === 0} onClick={onPlay}><Play size={16} />{plays === 0 ? "Phát hợp âm" : "Nghe lại"}</button><button className="chord-secondary" disabled={!busy} onClick={onStopAudio}><Square size={14} />Dừng phát</button></div>
      <p className="chord-muted" aria-live="polite">{plays === 0 ? "Lượt phát đầu tiên miễn phí." : remaining === null ? "Nghe lại không giới hạn." : `Còn ${remaining} lần nghe lại.`}</p>
      <details className="chord-playback-details"><summary>Tùy chỉnh cách nghe</summary><PlaybackControls value={playback} onChange={setPlayback} disabled={busy} /></details>
    </div>}
    <div className="chord-answer-grid" aria-label="Các đáp án">{question.choices.map(a => <button key={a.id} disabled={revealed} className={`chord-answer ${revealed && a.id === question.correctAnswer.id ? "correct" : revealed && a.id === record.answerId ? "incorrect" : ""}`} onClick={() => onAnswer(a.id)}>{a.label}</button>)}</div>
    {revealed && <div className={`chord-feedback ${record.status}`} role="status"><strong>{record.status === "correct" ? "Chính xác!" : "Chưa chính xác."}</strong><span>Đáp án: {question.correctAnswer.label} · {question.chord.symbol}</span><small>{question.chord.tones.map(n => n.name).join(" – ")}</small></div>}
    <div className="chord-actions chord-next-actions">{revealed ? <button className="chord-primary" onClick={onNext}>{session.config.questionCount !== null && session.index + 1 >= session.config.questionCount ? "Xem kết quả" : "Câu tiếp theo"}</button> : <button className="chord-secondary" onClick={onSkip}>Bỏ qua câu</button>}</div>
  </section>;
}

import React from "react";
import { ArrowRight, Clock3, Keyboard, Music2, Sparkles, Timer } from "lucide-react";
import { NOTE_RANGES } from "../notation/musicTheory";
import type { AnswerMethod, ClefSelection, NoteRange } from "../types";
import type { ExerciseMode } from "@/features/training/types";

export type SetupValues = {
  clef: ClefSelection;
  range: NoteRange;
  mode: ExerciseMode;
  answerMethod: AnswerMethod;
  questionCount: number;
  speedLimitSeconds: number | null;
};

type ExerciseSetupProps = {
  value: SetupValues;
  onChange: (value: SetupValues) => void;
  onStart: () => void;
};

const QUESTION_COUNTS = [10, 20, 30, 50];

export function ExerciseSetup({ value, onChange, onStart }: ExerciseSetupProps) {
  function update(patch: Partial<SetupValues>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="setup-layout">
      <section className="setup-panel" aria-labelledby="setup-title">
        <div className="panel-eyebrow"><span className="eyebrow-dot" /> BẮT ĐẦU TỪ ĐÂU?</div>
        <h2 id="setup-title">Chọn cách bạn muốn luyện</h2>
        <p className="setup-copy">Mọi bài tập đều miễn phí, không cần tài khoản và không giới hạn lượt luyện.</p>

        <fieldset className="setup-group">
          <legend>Khóa nhạc</legend>
          <div className="choice-row three-choice">
            {([
              ["treble", "Khóa Sol", "𝄞"],
              ["bass", "Khóa Fa", "𝄢"],
              ["mixed", "Xen kẽ", "⇄"],
            ] as const).map(([key, label, symbol]) => (
              <button key={key} type="button" className={`choice-card ${value.clef === key ? "is-selected" : ""}`} onClick={() => update({ clef: key })} aria-pressed={value.clef === key}>
                <span className="choice-glyph">{symbol}</span><span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-group">
          <legend>Phạm vi nốt</legend>
          <div className="range-grid">
            {(Object.entries(NOTE_RANGES) as [NoteRange, (typeof NOTE_RANGES)[NoteRange]][]).map(([key, range]) => (
              <button key={key} type="button" className={`range-card ${value.range === key ? "is-selected" : ""}`} onClick={() => update({ range: key })} aria-pressed={value.range === key}>
                <span className="range-radio" /><span><strong>{range.label}</strong><small>{range.detail}</small></span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-group">
          <legend>Cách luyện</legend>
          <div className="mode-grid">
            {([
              ["free", "Luyện tự do", "Không giới hạn câu", Sparkles],
              ["challenge", "Thử thách", "Hoàn thành một lượt", Clock3],
              ["speed", "Luyện tốc độ", "Rèn phản xạ nhanh", Timer],
              ["daily", "Thử thách hôm nay", "Câu hỏi cố định theo ngày", Music2],
            ] as const).map(([key, label, detail, Icon]) => (
              <button key={key} type="button" className={`mode-card ${value.mode === key ? "is-selected" : ""}`} onClick={() => update({ mode: key })} aria-pressed={value.mode === key}>
                <Icon size={18} /><span><strong>{label}</strong><small>{detail}</small></span>
              </button>
            ))}
          </div>
        </fieldset>

        {value.mode !== "free" && value.mode !== "daily" && (
          <fieldset className="setup-group compact-group">
            <legend>Số câu</legend>
            <div className="chip-row" aria-label="Số câu trong lượt">
              {QUESTION_COUNTS.map((count) => <button key={count} type="button" className={value.questionCount === count ? "is-selected" : ""} onClick={() => update({ questionCount: count })} aria-pressed={value.questionCount === count}>{count}</button>)}
            </div>
          </fieldset>
        )}

        {value.mode === "speed" && (
          <fieldset className="setup-group compact-group">
            <legend>Giới hạn thời gian mỗi câu</legend>
            <div className="chip-row" aria-label="Giới hạn thời gian">
              {([null, 3, 5, 8] as const).map((seconds) => <button key={seconds ?? "none"} type="button" className={value.speedLimitSeconds === seconds ? "is-selected" : ""} onClick={() => update({ speedLimitSeconds: seconds })} aria-pressed={value.speedLimitSeconds === seconds}>{seconds === null ? "Không giới hạn" : `${seconds} giây`}</button>)}
            </div>
          </fieldset>
        )}

        <fieldset className="setup-group compact-group">
          <legend>Cách trả lời</legend>
          <div className="choice-row two-choice">
            <button type="button" className={`answer-method-card ${value.answerMethod === "multiple-choice" ? "is-selected" : ""}`} onClick={() => update({ answerMethod: "multiple-choice" })} aria-pressed={value.answerMethod === "multiple-choice"}><Keyboard size={18} /><span><strong>Trắc nghiệm</strong><small>Chọn tên nốt · phím 1–7</small></span></button>
            <button type="button" className={`answer-method-card ${value.answerMethod === "piano" ? "is-selected" : ""}`} onClick={() => update({ answerMethod: "piano" })} aria-pressed={value.answerMethod === "piano"}><Music2 size={18} /><span><strong>Piano ảo</strong><small>Nghe và chọn cao độ</small></span></button>
          </div>
        </fieldset>

        <button type="button" className="start-session-button" onClick={onStart}>Bắt đầu luyện <ArrowRight size={18} /></button>
        <p className="setup-footnote">Không cần đăng ký · Luyện bao nhiêu cũng được</p>
      </section>
      <aside className="setup-note" aria-label="Thông tin bài luyện">
        <div className="setup-note-mark"><span className="note-mark-staff" /><span className="note-mark-head" /></div>
        <span className="setup-note-label">THAIKEYBOARD MUSIC TRAINING</span>
        <h3>Nhìn nốt.<br />Gọi tên.<br /><em>Chơi đúng.</em></h3>
        <p>Rèn khả năng đọc nốt bằng những bài tập rõ ràng, đúng chuẩn và luôn miễn phí.</p>
        <div className="setup-note-points"><span>01 <b>Khóa Sol &amp; Fa</b></span><span>02 <b>Âm thanh theo cao độ</b></span><span>03 <b>Tiến bộ theo nhịp riêng</b></span></div>
      </aside>
    </div>
  );
}

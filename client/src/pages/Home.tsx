import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Music2,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

type Clef = "treble" | "bass";
type ClefMode = "treble" | "bass" | "mix";
type Scope = "staff" | "ledger" | "wide";
type SessionMode = "endless" | "challenge";
type ResponseMode = "multiple" | "piano";
type SelectedAnswer = { letter: number; octave: number };
type Note = { letter: number; octave: number; name: string; solfege: string };

const NOTE_NAMES = ["Đô", "Rê", "Mi", "Fa", "Sol", "La", "Si"];
const LETTER_NAMES = ["C", "D", "E", "F", "G", "A", "B"];
const PITCH_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const SCOPE_RANGE: Record<Scope, [number, number]> = {
  staff: [0, 8],
  ledger: [-2, 10],
  wide: [-4, 12],
};
const CHALLENGE_LENGTHS = [5, 10, 20];

function noteAtPosition(clef: Clef, position: number): Note {
  const baseLetter = clef === "treble" ? 2 : 4; // E4 on treble bottom line; G2 on bass bottom line.
  const baseOctave = clef === "treble" ? 4 : 2;
  const absoluteLetter = baseLetter + position;
  const letter = ((absoluteLetter % 7) + 7) % 7;
  const octave = baseOctave + Math.floor(absoluteLetter / 7);
  return { letter, octave, name: NOTE_NAMES[letter], solfege: LETTER_NAMES[letter] };
}

function makeQuestion(mode: ClefMode, scope: Scope, previous?: { clef: Clef; position: number }) {
  const clefs: Clef[] = mode === "mix" ? ["treble", "bass"] : [mode];
  const [min, max] = SCOPE_RANGE[scope];
  let clef = clefs[Math.floor(Math.random() * clefs.length)];
  let position = min + Math.floor(Math.random() * (max - min + 1));
  if (previous && clefs.length * (max - min + 1) > 1) {
    let attempts = 0;
    while (clef === previous.clef && position === previous.position && attempts < 12) {
      clef = clefs[Math.floor(Math.random() * clefs.length)];
      position = min + Math.floor(Math.random() * (max - min + 1));
      attempts += 1;
    }
  }
  return { clef, position, note: noteAtPosition(clef, position) };
}

function Staff({ clef, position, result }: { clef: Clef; position: number; result: "correct" | "wrong" | null }) {
  const y = 111 - position * 9;
  const noteColor = result === "correct" ? "#278469" : result === "wrong" ? "#d2644d" : "#173d38";
  const ledgerPositions: number[] = [];
  if (position < 0) {
    for (let p = -2; p >= position; p -= 2) ledgerPositions.push(p);
  } else if (position > 8) {
    for (let p = 10; p <= position; p += 2) ledgerPositions.push(p);
  }

  return (
    <svg className="staff-svg" viewBox="0 0 460 158" role="img" aria-label={`Nốt nhạc trên khuông khóa ${clef === "treble" ? "Sol" : "Fa"}`}>
      <g className="staff-lines">
        {[39, 57, 75, 93, 111].map((lineY) => (
          <line key={lineY} x1="72" y1={lineY} x2="390" y2={lineY} />
        ))}
      </g>
      <text x="38" y={clef === "treble" ? 103 : 92} className={`clef-symbol ${clef === "bass" ? "clef-bass" : ""}`}>
        {clef === "treble" ? "𝄞" : "𝄢"}
      </text>
      {ledgerPositions.map((p) => (
        <line key={p} className="ledger-line" x1="202" x2="253" y1={111 - p * 9} y2={111 - p * 9} />
      ))}
      <ellipse cx="229" cy={y} rx="13" ry="9" transform={`rotate(-18 229 ${y})`} fill={noteColor} className="note-head" />
      {position < 4 ? (
        <line x1="241" y1={y} x2="241" y2={y - 43} stroke={noteColor} strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <line x1="217" y1={y} x2="217" y2={y + 43} stroke={noteColor} strokeWidth="2.5" strokeLinecap="round" />
      )}
      <circle cx="405" cy="29" r="2" fill="#ddc99f" />
      <circle cx="416" cy="29" r="2" fill="#ddc99f" />
      <circle cx="427" cy="29" r="2" fill="#ddc99f" />
    </svg>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}{suffix}</strong>
    </div>
  );
}

function VirtualPiano({
  octave,
  targetLetter,
  selected,
  disabled,
  onChoose,
}: {
  octave: number;
  targetLetter: number;
  selected: SelectedAnswer | null;
  disabled: boolean;
  onChoose: (letter: number, octave: number) => void;
}) {
  const blackKeysAfter = [0, 1, 3, 4, 5];

  return (
    <div className="piano-console">
      <div className="piano-console-heading">
        <span>PIANO ẢO</span>
        <span className="piano-octave-label">QUÃNG TÁM {octave}</span>
      </div>
      <div className="piano-keybed" role="group" aria-label={`Piano ảo, quãng tám ${octave}`}>
        <div className="piano-white-keys">
          {NOTE_NAMES.map((name, index) => {
            const isCorrect = selected !== null && index === targetLetter;
            const isWrong = selected?.letter === index && index !== targetLetter;
            return (
              <button
                key={name}
                type="button"
                className={`piano-white-key ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`}
                onClick={() => onChoose(index, octave)}
                disabled={disabled}
                aria-label={`Phím ${name}, quãng tám ${octave}`}
                aria-pressed={selected?.letter === index && selected.octave === octave}
              >
                <span className="piano-key-note">{name}</span>
                <span className="piano-key-pitch">{LETTER_NAMES[index]}{index === 0 ? octave : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="piano-black-keys" aria-hidden="true">
          {blackKeysAfter.map((index) => (
            <span key={index} className="piano-black-key" style={{ left: `${((index + 1) / 7) * 100}%` }} />
          ))}
        </div>
      </div>
      <div className="piano-instruction">Bấm phím trắng để nghe và trả lời nốt trên khuông.</div>
    </div>
  );
}

export default function Home() {
  const [clefMode, setClefMode] = useState<ClefMode>("treble");
  const [scope, setScope] = useState<Scope>("staff");
  const [sessionMode, setSessionMode] = useState<SessionMode>("endless");
  const [responseMode, setResponseMode] = useState<ResponseMode>("multiple");
  const [challengeLength, setChallengeLength] = useState(10);
  const [question, setQuestion] = useState(() => makeQuestion("treble", "staff"));
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<SelectedAnswer | null>(null);
  const [finished, setFinished] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const isCorrect = selected !== null && selected.letter === question.note.letter && (responseMode === "multiple" || selected.octave === question.note.octave);
  const result = selected === null ? null : isCorrect ? "correct" : "wrong";
  const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100);
  const progress = sessionMode === "challenge" ? Math.min((answered / challengeLength) * 100, 100) : 0;

  const instruction = useMemo(() => {
    if (clefMode === "mix") return "Khóa Sol & Fa · bất ngờ mỗi lượt";
    return clefMode === "treble" ? "Khóa Sol · nốt cao" : "Khóa Fa · nốt trầm";
  }, [clefMode]);

  function resetSession(nextMode = clefMode, nextScope = scope, nextSessionMode = sessionMode, nextLength = challengeLength) {
    setClefMode(nextMode);
    setScope(nextScope);
    setSessionMode(nextSessionMode);
    setChallengeLength(nextLength);
    setAnswered(0);
    setCorrect(0);
    setSelected(null);
    setFinished(false);
    setQuestion(makeQuestion(nextMode, nextScope));
  }

  function chooseAnswer(index: number, octave = question.note.octave) {
    if (selected !== null || finished) return;
    setSelected({ letter: index, octave });
    setAnswered((count) => count + 1);
    if (index === question.note.letter && octave === question.note.octave) setCorrect((count) => count + 1);
  }

  function playPianoNote(letter: number, octave: number) {
    if (typeof window.AudioContext !== "undefined") {
      try {
        const audioContext = audioContextRef.current ?? new window.AudioContext();
        audioContextRef.current = audioContext;
        void audioContext.resume();

        const midi = (octave + 1) * 12 + PITCH_SEMITONES[letter];
        const frequency = 440 * Math.pow(2, (midi - 69) / 12);
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.56);
      } catch {
        // Answer checking should still work if the browser blocks audio playback.
      }
    }
    chooseAnswer(letter, octave);
  }

  function nextQuestion() {
    if (selected === null) return;
    if (sessionMode === "challenge" && answered >= challengeLength) {
      setFinished(true);
      return;
    }
    setQuestion(makeQuestion(clefMode, scope, question));
    setSelected(null);
  }

  function restart() {
    resetSession(clefMode, scope, sessionMode, challengeLength);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (responseMode === "multiple" && event.key >= "1" && event.key <= "7") chooseAnswer(Number(event.key) - 1);
      if ((event.key === "Enter" || event.key === " ") && selected !== null && !finished) {
        event.preventDefault();
        nextQuestion();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="Nốt Nhạc — trang chủ">
            <span className="brand-mark"><Music2 size={22} strokeWidth={2.2} /></span>
            <span className="brand-name">nốt<span>nhạc</span></span>
          </a>
          <div className="topbar-right">
            <span className="practice-tag"><span className="live-dot" /> KHÔNG GIAN LUYỆN TẬP</span>
            <a className="top-guide-link" href="#huong-dan" onClick={() => setGuideOpen(true)}><CircleHelp size={16} /> Cách đọc nốt</a>
          </div>
        </div>
      </header>

      <main className="page-wrap">
        <section className="intro-row">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> NHÌN NỐT · GỌI TÊN · GHI NHỚ</div>
            <h1>Mắt đọc nhanh hơn,<br className="desktop-break" /> tay chơi tự tin hơn.</h1>
            <p className="intro-copy">Một nốt nhạc mỗi lượt. Cùng luyện cho đến khi bạn nhận ra chúng thật tự nhiên.</p>
          </div>
          <div className="daily-mark" aria-hidden="true">
            <span className="daily-mark-line" />
            <span className="daily-mark-note">𝄞</span>
            <span className="daily-mark-caption">BÀI TẬP<br />HÔM NAY</span>
          </div>
        </section>

        <section className="workbench" aria-label="Bảng luyện đọc nốt nhạc">
          <aside className="settings-card">
            <div className="section-kicker"><span>01</span> THIẾT LẬP</div>
            <h2>Chọn bài luyện</h2>
            <p className="card-subtitle">Tập trung vào điều bạn muốn nhớ.</p>

            <div className="setting-block">
              <div className="setting-label">Khóa nhạc</div>
              <div className="clef-options" role="group" aria-label="Chọn khóa nhạc">
                {([
                  ["treble", "Khóa Sol", "𝄞"],
                  ["bass", "Khóa Fa", "𝄢"],
                  ["mix", "Xen kẽ", "↗"],
                ] as const).map(([value, label, symbol]) => (
                  <button key={value} className={`clef-option ${clefMode === value ? "is-active" : ""}`} onClick={() => resetSession(value)} aria-pressed={clefMode === value}>
                    <span className="clef-option-symbol">{symbol}</span><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-block scope-block">
              <div className="setting-label">Phạm vi nốt</div>
              <div className="scope-options" role="group" aria-label="Chọn phạm vi nốt">
                {([
                  ["staff", "Trong khuông", "5 dòng"],
                  ["ledger", "Thêm dòng phụ", "1 dòng"],
                  ["wide", "Mở rộng", "Nhiều dòng"],
                ] as const).map(([value, label, detail]) => (
                  <button key={value} className={`scope-option ${scope === value ? "is-active" : ""}`} onClick={() => resetSession(clefMode, value)} aria-pressed={scope === value}>
                    <span className="scope-radio" /><span className="scope-name">{label}<small>{detail}</small></span><ChevronRight size={15} className="scope-chevron" />
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-block mode-block">
              <div className="setting-label">Cách luyện</div>
              <div className="mode-toggle" role="group" aria-label="Chọn cách luyện">
                <button className={sessionMode === "endless" ? "is-active" : ""} onClick={() => resetSession(clefMode, scope, "endless")}>Tự do</button>
                <button className={sessionMode === "challenge" ? "is-active" : ""} onClick={() => resetSession(clefMode, scope, "challenge")}>Thử thách</button>
              </div>
              {sessionMode === "challenge" && (
                <div className="challenge-length" aria-label="Số câu thử thách">
                  {CHALLENGE_LENGTHS.map((length) => (
                    <button key={length} className={challengeLength === length ? "is-active" : ""} onClick={() => resetSession(clefMode, scope, "challenge", length)} aria-pressed={challengeLength === length}>{length} câu</button>
                  ))}
                </div>
              )}
            </div>

            <div className="setting-block response-mode-block">
              <div className="setting-label">Cách trả lời</div>
              <div className="response-mode-toggle" role="group" aria-label="Chọn cách trả lời">
                <button className={`response-mode-button ${responseMode === "multiple" ? "is-active" : ""}`} onClick={() => setResponseMode("multiple")} disabled={selected !== null} aria-pressed={responseMode === "multiple"}>
                  <span className="response-mode-number">123</span> Trắc nghiệm
                </button>
                <button className={`response-mode-button ${responseMode === "piano" ? "is-active" : ""}`} onClick={() => setResponseMode("piano")} disabled={selected !== null} aria-pressed={responseMode === "piano"}>
                  <Music2 size={14} /> Piano ảo
                </button>
              </div>
            </div>

            <div className="settings-footer"><Sparkles size={15} /><span>{responseMode === "piano" ? "Phím đàn phát nốt khi bạn bấm" : "Đáp án được xáo trộn mỗi lượt"}</span></div>
          </aside>

          <section className="practice-card" aria-label="Câu hỏi hiện tại">
            {finished ? (
              <div className="completion-screen">
                <div className="trophy-orbit"><Trophy size={34} strokeWidth={1.6} /></div>
                <span className="completion-kicker">HOÀN THÀNH THỬ THÁCH</span>
                <h2>Tiến bộ thật đáng tự hào.</h2>
                <p className="completion-copy">Bạn đã trả lời đúng <strong>{correct}/{challengeLength}</strong> câu trong thử thách.</p>
                <div className="completion-score"><strong>{accuracy}%</strong><span>độ chính xác</span></div>
                <div className="completion-actions">
                  <button className="primary-button" onClick={restart}><RotateCcw size={17} /> Luyện lại</button>
                  <button className="text-button" onClick={() => resetSession(clefMode, scope, "endless")}>Luyện tự do <ArrowRight size={16} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="practice-topline">
                  <div>
                    <div className="section-kicker"><span>02</span> ĐẾN LƯỢT BẠN</div>
                    <h2>Nhận diện nốt nhạc</h2>
                  </div>
                  <button className="icon-button" onClick={restart} aria-label="Làm mới phiên luyện" title="Làm mới phiên luyện"><RotateCcw size={17} /></button>
                </div>
                <div className="session-stats">
                  <Stat label="ĐÃ TRẢ LỜI" value={answered} />
                  <span className="stat-divider" />
                  <Stat label="TRẢ LỜI ĐÚNG" value={correct} />
                  <span className="stat-divider" />
                  <Stat label="CHÍNH XÁC" value={accuracy} suffix="%" />
                </div>
                {sessionMode === "challenge" && (
                  <div className="challenge-progress"><div className="progress-meta"><span>TIẾN ĐỘ THỬ THÁCH</span><span>{answered}<i> / </i>{challengeLength}</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
                )}
                <div className={`staff-panel ${result ? `has-${result}` : ""}`}>
                  <div className="staff-panel-top"><span className="clef-chip"><span>{question.clef === "treble" ? "𝄞" : "𝄢"}</span> {question.clef === "treble" ? "KHÓA SOL" : "KHÓA FA"}</span><span className="staff-hint">{instruction}</span></div>
                  <Staff clef={question.clef} position={question.position} result={result} />
                  <div className="question-caption">Nốt này tên là gì?</div>
                </div>
                <div className="answers-heading"><span>{responseMode === "piano" ? "BẤM PHÍM ĐÀN" : "CHỌN TÊN NỐT"}</span><span className="keyboard-hint">{responseMode === "piano" ? `quãng tám ${question.note.octave}` : "phím 1 — 7"}</span></div>
                {responseMode === "multiple" ? (
                  <div className="answer-grid" role="group" aria-label="Bảy lựa chọn tên nốt">
                    {NOTE_NAMES.map((name, index) => {
                      const isCorrectAnswer = selected !== null && index === question.note.letter;
                      const isWrongAnswer = selected?.letter === index && index !== question.note.letter;
                      return (
                        <button key={name} className={`answer-button ${isCorrectAnswer ? "answer-correct" : ""} ${isWrongAnswer ? "answer-wrong" : ""}`} onClick={() => chooseAnswer(index)} disabled={selected !== null} aria-label={`Nốt ${name}`}>
                          <span className="answer-letter">{name}</span><span className="answer-key">{index + 1}</span>
                          {isCorrectAnswer && <Check size={15} className="answer-result-icon" />}
                          {isWrongAnswer && <X size={15} className="answer-result-icon" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <VirtualPiano octave={question.note.octave} targetLetter={question.note.letter} selected={selected} disabled={selected !== null} onChoose={playPianoNote} />
                )}
                {result ? (
                  <div className={`feedback-row ${result}`} role="status" aria-live="polite">
                    <span className="feedback-symbol">{result === "correct" ? <Check size={16} /> : <X size={16} />}</span>
                    <span className="feedback-message">{result === "correct" ? "Chính xác! Bạn nhận ra nốt này rồi." : <>Nốt này là <strong>{question.note.name}{responseMode === "piano" ? ` ${question.note.octave}` : ""}</strong>. Ghi nhớ vị trí nhé!</>}</span>
                    <button className="next-button" onClick={nextQuestion}>{sessionMode === "challenge" && answered >= challengeLength ? "Xem kết quả" : "Tiếp theo"}<ChevronRight size={16} /></button>
                  </div>
                ) : (
                  <div className="session-note"><span className="note-dot" />{responseMode === "piano" ? "Bấm một phím trắng để nghe và trả lời." : sessionMode === "challenge" ? `Thử thách ${challengeLength} câu · trả lời theo cảm nhận đầu tiên` : "Cứ thong thả — tốc độ đến sau khi bạn đã quen."}</div>
                )}
              </>
            )}
          </section>

          <aside className="guide-card" id="huong-dan">
            <button className="guide-heading" onClick={() => setGuideOpen((open) => !open)} aria-expanded={guideOpen}>
              <span className="guide-icon"><BookOpen size={18} /></span>
              <span><span className="section-kicker"><span>03</span> MẸO NHỚ NHANH</span><strong>Vị trí các nốt</strong></span>
              <ChevronRight size={17} className={`guide-chevron ${guideOpen ? "is-open" : ""}`} />
            </button>
            {guideOpen && (
              <div className="guide-content">
                <p className="guide-intro">Đọc từ <strong>dòng dưới cùng</strong> đi lên — mỗi nấc là một nốt kế tiếp.</p>
                <div className="guide-clef-block">
                  <div className="guide-clef-title"><span className="guide-clef-symbol">𝄞</span><span>Khóa Sol</span><span className="guide-clef-range"></span></div>
                  <div className="note-ladder"><span className="ladder-label">Dòng kẻ</span><strong>Mi</strong><span>·</span><strong>Sol</strong><span>·</span><strong>Si</strong><span>·</span><strong>Sol</strong><span>·</span><strong>Fa</strong></div>
                  <div className="note-ladder spaces"><span className="ladder-label">Kẽ</span><strong>Mi</strong><span>·</span><strong>Đô</strong><span>·</span><strong>La</strong><span>·</span><strong>Fa</strong></div>
                </div>
                <div className="guide-clef-block bass-guide">
                  <div className="guide-clef-title"><span className="guide-clef-symbol bass-symbol">𝄢</span><span>Khóa Fa</span><span className="guide-clef-range">NỐT TRẦM</span></div>
                  <div className="note-ladder"><span className="ladder-label">Dòng</span><strong>La</strong><span>·</span><strong>Fa</strong><span>·</span><strong>Rê</strong><span>·</span><strong>Si</strong><span>·</span><strong>Sol</strong></div>
                  <div className="note-ladder spaces"><span className="ladder-label">Kẽ</span><strong>Sol</strong><span>·</span><strong>Mi</strong><span>·</span><strong>Đô</strong><span>·</span><strong>La</strong></div>
                </div>
                <div className="guide-tip"><Sparkles size={15} /><p><strong>Mẹo nhỏ</strong><br />Hãy đọc theo thứ tự Đô – Rê – Mi – Fa – Sol – La – Si. Nốt lên một bậc, tên cũng tiến một bước.</p></div>
                <div className="keyboard-tip"><span>{responseMode === "piano" ? "Bấm phím piano để nghe nốt." : <><span className="keycap">1</span><span className="keycap">–</span><span className="keycap">7</span> trên bàn phím để trả lời nhanh</>}</span></div>
              </div>
            )}
            {!guideOpen && <p className="guide-collapsed-note">Mở phần hướng dẫn để xem tên nốt trên các dòng và khe.</p>}
          </aside>
        </section>
        <footer className="page-footer"><span>nốt nhạc <span className="footer-separator">·</span> Luyện một chút mỗi ngày.</span><span>Nghe bằng mắt, ghi nhớ bằng thực hành.</span></footer>
      </main>
    </div>
  );
}

import React, { useCallback, useRef, useState } from "react";
import { toTrainingResult } from "@/features/training/session";
import { RhythmQuizNotation } from "../quiz/RhythmQuizNotation";
import {
  createQuizRun,
  DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT,
  getAvailableQuizQuestionCount,
  QUIZ_TRACKS,
  RHYTHM_QUIZ_QUESTION_COUNTS,
  type QuizQuestion,
  type QuizTrack,
} from "../quiz/questionBank";
import {
  advanceRhythmQuizSession,
  createRhythmQuizSession,
  skipRhythmQuizQuestion,
  submitRhythmQuizAnswer,
  type RhythmQuizSession,
} from "../quiz/session";
import "../quiz/rhythm-quiz.css";

export type RhythmQuizScreenState =
  | "select"
  | "quiz"
  | "summary"
  | "technical-error";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

type RhythmQuizScreenProps = {
  onBack: () => void;
  screen?: RhythmQuizScreenState;
  onScreenChange?: (screen: RhythmQuizScreenState) => void;
};

export default function RhythmQuizScreen({
  onBack,
  screen: controlledScreen,
  onScreenChange,
}: RhythmQuizScreenProps) {
  const [selectedTrack, setSelectedTrack] = useState<QuizTrack>(1);
  const [selectedQuestionCount, setSelectedQuestionCount] =
    useState<number>(DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT);
  const [localScreen, setLocalScreen] =
    useState<RhythmQuizScreenState>("select");
  const screen = controlledScreen ?? localScreen;
  const setScreen = useCallback(
    (nextScreen: RhythmQuizScreenState) => {
      if (onScreenChange) onScreenChange(nextScreen);
      else setLocalScreen(nextScreen);
    },
    [onScreenChange]
  );
  const [session, setSession] = useState<RhythmQuizSession | null>(null);
  const [questions, setQuestions] = useState<readonly QuizQuestion[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [runNumber, setRunNumber] = useState(0);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const questionStartedAt = useRef(Date.now());
  const skipLockRef = useRef(false);

  React.useEffect(() => {
    skipLockRef.current = false;
  }, [session]);

  const startRun = useCallback(
    (
      track = selectedTrack,
      nextRun = runNumber + 1,
      questionCount: number = selectedQuestionCount
    ) => {
      const deck = createQuizRun(track, undefined, questionCount);
      setSelectedTrack(track);
      setQuestions(deck);
      setSession(createRhythmQuizSession(track, deck, nextRun));
      setSelectedOptionId(null);
      setSkipDialogOpen(false);
      setRunNumber(nextRun);
      setTechnicalError(null);
      questionStartedAt.current = Date.now();
      setScreen("quiz");
    },
    [runNumber, selectedQuestionCount, selectedTrack, setScreen]
  );

  const onNotationFailure = useCallback(
    (message: string) => {
      setTechnicalError(message);
      setScreen("technical-error");
      // Rendering errors terminate the attempt without submitting a learner answer.
    },
    [setScreen]
  );

  const chooseAnswer = (optionId: string) => {
    if (!session || selectedOptionId !== null || session.hasAnsweredCurrent)
      return;
    setSelectedOptionId(optionId);
    setSession(
      submitRhythmQuizAnswer(
        session,
        { questionId: session.currentExercise.id, optionId },
        Date.now() - questionStartedAt.current
      )
    );
  };

  const advance = () => {
    if (!session?.hasAnsweredCurrent) return;
    if (session.completedAt !== null) {
      setScreen("summary");
      return;
    }
    const nextQuestion = questions[session.seenQuestionIds.length];
    if (!nextQuestion) {
      setScreen("technical-error");
      setTechnicalError(
        "Không tìm thấy câu tiếp theo; lượt Quiz chưa được hoàn tất hoặc tính sai."
      );
      return;
    }
    setSession(advanceRhythmQuizSession(session, nextQuestion));
    setSelectedOptionId(null);
    questionStartedAt.current = Date.now();
  };

  const confirmSkip = () => {
    if (!session || skipLockRef.current || selectedOptionId !== null) return;
    skipLockRef.current = true;
    const currentIndex = session.runQuestionIds.indexOf(
      session.currentExercise.id
    );
    const nextQuestion = questions[currentIndex + 1] ?? null;
    const skipped = skipRhythmQuizQuestion(session, nextQuestion, Date.now());
    if (skipped === session) {
      skipLockRef.current = false;
      setTechnicalError("Không thể bỏ qua câu hiện tại một cách an toàn.");
      setScreen("technical-error");
      return;
    }
    setSession(skipped);
    setSelectedOptionId(null);
    setSkipDialogOpen(false);
    if (skipped.completedAt !== null) setScreen("summary");
    else questionStartedAt.current = Date.now();
  };

  const currentQuestion = session?.currentExercise ?? null;
  const result = session ? toTrainingResult(session) : null;
  const availableQuestionCount = getAvailableQuizQuestionCount(selectedTrack);
  const questionCountAvailable =
    selectedQuestionCount > 0 && availableQuestionCount >= selectedQuestionCount;
  const processedQuestionCount = session
    ? session.questionsAnswered + session.skippedQuestionIds.length
    : 0;
  const correctOption = currentQuestion?.options.find(
    option => option.id === currentQuestion.correctOptionId
  );

  return (
    <div className="rhythm-quiz-app">
      <main className="rhythm-quiz-main">
        <div className="rhythm-quiz-shell">
          <div className="rhythm-quiz-topline">
            <p className="rhythm-quiz-kicker">Rhythm Training · Quiz</p>
            {screen === "select" ? (
              <button
                type="button"
                className="rhythm-quiz-back"
                onClick={onBack}
              >
                Quay lại Rhythm Training
              </button>
            ) : (
              <button
                type="button"
                className="rhythm-quiz-back"
                onClick={() => setScreen("select")}
              >
                Thoát Quiz
              </button>
            )}
          </div>

          {screen === "select" && (
            <section aria-labelledby="rhythm-quiz-title">
              <h1 id="rhythm-quiz-title" className="rhythm-quiz-heading">
                Trắc nghiệm kiến thức nhịp điệu
              </h1>
              <p className="rhythm-quiz-intro">
                Nhìn khuông nhạc, đọc câu hỏi và chọn đáp án. Mỗi lượt tạo đúng
                số câu đã chọn từ câu hỏi curriculum hiện có. Quiz chỉ dùng hình
                ảnh — không cần nghe hoặc gõ nhịp.
              </p>
              <div
                className="rhythm-quiz-track-list"
                role="group"
                aria-label="Chọn cấp độ Quiz"
              >
                {QUIZ_TRACKS.map(track => (
                  <button
                    key={String(track.id)}
                    type="button"
                    className="rhythm-quiz-track"
                    aria-pressed={selectedTrack === track.id}
                    onClick={() => {
                      const nextAvailable = getAvailableQuizQuestionCount(track.id);
                      setSelectedTrack(track.id);
                      setSelectedQuestionCount(previous => {
                        if (previous >= 5 && previous <= nextAvailable)
                          return previous;
                        if (nextAvailable < 5) return nextAvailable;
                        return nextAvailable >= DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT
                          ? DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT
                          : 5;
                      });
                    }}
                  >
                    <span
                      className="rhythm-quiz-track-index"
                      aria-hidden="true"
                    >
                      {track.id === "bonus"
                        ? "2/2"
                        : track.id === "mixed"
                          ? "ALL"
                          : String(track.id).padStart(2, "0")}
                    </span>
                    <span className="rhythm-quiz-track-copy">
                      <strong>{track.title}</strong>
                      <small>{track.description}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div
                className="rhythm-quiz-count-group"
                role="group"
                aria-label="Số câu trong Quiz"
              >
                <span>Số câu mỗi lượt</span>
                <div className="rhythm-quiz-count-options">
                  {RHYTHM_QUIZ_QUESTION_COUNTS.map(count => (
                    <button
                      key={count}
                      type="button"
                      className="rhythm-quiz-count-option"
                      aria-pressed={selectedQuestionCount === count}
                      disabled={count > availableQuestionCount}
                      onClick={() => setSelectedQuestionCount(count)}
                    >
                      {count} câu
                    </button>
                  ))}
                  {availableQuestionCount > 0 && availableQuestionCount < 5 && (
                    <button
                      type="button"
                      className="rhythm-quiz-count-option"
                      aria-pressed={
                        selectedQuestionCount === availableQuestionCount
                      }
                      onClick={() =>
                        setSelectedQuestionCount(availableQuestionCount)
                      }
                    >
                      {availableQuestionCount} câu hiện có
                    </button>
                  )}
                </div>
              </div>
              {questionCountAvailable ? (
                <p className="rhythm-quiz-note" role="status">
                  Ngân hàng có {availableQuestionCount} câu khác nhau; lượt này
                  sẽ có đúng {selectedQuestionCount} câu.
                </p>
              ) : (
                <p className="rhythm-quiz-availability-warning" role="status">
                  Ngân hàng hiện có {availableQuestionCount} câu khác nhau, chưa
                  đủ {selectedQuestionCount} câu. Hãy chọn mức ngắn hơn hoặc dùng
                  toàn bộ số câu khả dụng.
                </p>
              )}
              <div className="rhythm-quiz-action-row">
                <button
                  type="button"
                  className="rhythm-quiz-primary"
                  disabled={!questionCountAvailable}
                  onClick={() => startRun()}
                >
                  Bắt đầu Quiz
                </button>
              </div>
              <p className="rhythm-quiz-note">
                Chọn một cấp độ hoặc Hỗn hợp — All Levels để bắt đầu lượt Quiz.
              </p>
            </section>
          )}

          {screen === "quiz" && session && currentQuestion && (
            <section
              aria-labelledby="rhythm-quiz-question"
              aria-live="polite"
              data-question-id={currentQuestion.id}
              data-question-track={String(currentQuestion.track)}
            >
              <div className="rhythm-quiz-runline">
                <span>
                  {QUIZ_TRACKS.find(track => track.id === selectedTrack)?.title}{" "}
                  · Quiz run {runNumber}{" "}
                  <span>(chỉ số lượt trong giao diện)</span>
                  {selectedTrack === "mixed" && (
                    <small>
                      · Câu này thuộc{" "}
                      {QUIZ_TRACKS.find(
                        track => track.id === currentQuestion.track
                      )?.title ?? String(currentQuestion.track)}
                    </small>
                  )}
                </span>
                <span>
                  Câu {session.runQuestionIds.indexOf(currentQuestion.id) + 1} /{" "}
                  {questions.length}
                </span>
              </div>
              <div
                className="rhythm-quiz-progress"
                role="progressbar"
                aria-label="Tiến độ câu hỏi"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={processedQuestionCount}
              >
                <span
                  style={{
                    width: `${(processedQuestionCount / questions.length) * 100}%`,
                  }}
                />
              </div>
              <h1 id="rhythm-quiz-question" className="rhythm-quiz-question">
                {currentQuestion.prompt}
              </h1>
              {currentQuestion.notation && (
                <RhythmQuizNotation
                  notation={currentQuestion.notation}
                  onRenderError={onNotationFailure}
                />
              )}
              <ul
                className="rhythm-quiz-options"
                aria-label="Các phương án trả lời"
              >
                {currentQuestion.options.map((option, index) => {
                  const chosen = selectedOptionId === option.id;
                  const optionLetter = OPTION_LETTERS[index] ?? "?";
                  const isCorrect =
                    option.id === currentQuestion.correctOptionId;
                  const stateClass =
                    selectedOptionId === null
                      ? ""
                      : isCorrect
                        ? "is-correct"
                        : chosen
                          ? "is-incorrect"
                          : "";
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        className={`rhythm-quiz-option ${stateClass}`}
                        aria-label={`${optionLetter}. ${option.label}`}
                        aria-pressed={chosen}
                        data-option-id={option.id}
                        disabled={selectedOptionId !== null}
                        onClick={() => chooseAnswer(option.id)}
                      >
                        <span
                          className="rhythm-quiz-option-letter"
                          aria-hidden="true"
                        >
                          {optionLetter}
                        </span>
                        <span className="rhythm-quiz-option-copy">
                          {option.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!session.hasAnsweredCurrent && selectedOptionId === null && (
                <div className="rhythm-quiz-action-row rhythm-quiz-skip-row">
                  <button
                    type="button"
                    className="rhythm-quiz-secondary"
                    onClick={() => setSkipDialogOpen(true)}
                  >
                    Bỏ qua câu hỏi
                  </button>
                </div>
              )}
              {skipDialogOpen && (
                <div className="rhythm-quiz-dialog-backdrop">
                  <div
                    className="rhythm-quiz-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="rhythm-quiz-skip-title"
                    aria-describedby="rhythm-quiz-skip-copy"
                  >
                    <h2 id="rhythm-quiz-skip-title">Xác nhận bỏ qua câu hỏi?</h2>
                    <p id="rhythm-quiz-skip-copy">
                      Câu hỏi này được đánh dấu đã bỏ qua và không thể trả lời lại
                      trong lượt này. Xác nhận sẽ trừ 5 điểm, tối thiểu 0 điểm.
                    </p>
                    <div className="rhythm-quiz-action-row">
                      <button
                        type="button"
                        className="rhythm-quiz-secondary"
                        onClick={() => setSkipDialogOpen(false)}
                      >
                        Tiếp tục làm
                      </button>
                      <button
                        type="button"
                        className="rhythm-quiz-primary"
                        onClick={confirmSkip}
                      >
                        Xác nhận bỏ qua · −5 điểm
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {selectedOptionId !== null && session.hasAnsweredCurrent && (
                <div
                  className={`rhythm-quiz-feedback ${session.lastAnswerCorrect ? "" : "is-incorrect"}`}
                  role="status"
                >
                  <strong>
                    {session.lastAnswerCorrect
                      ? "Chính xác · +10 điểm"
                      : "Chưa đúng · +0 điểm"}
                  </strong>
                  <span>{currentQuestion.explanation}</span>
                  {!session.lastAnswerCorrect && correctOption && (
                    <span>
                      Đáp án đúng:{" "}
                      {OPTION_LETTERS[
                        currentQuestion.options.findIndex(
                          option => option.id === correctOption.id
                        )
                      ] ?? "?"}
                      . {correctOption.label}.
                    </span>
                  )}
                </div>
              )}
              {session.hasAnsweredCurrent && (
                <div className="rhythm-quiz-action-row">
                  <button
                    type="button"
                    className="rhythm-quiz-primary"
                    onClick={advance}
                  >
                    {session.completedAt !== null
                      ? "Xem tổng kết"
                      : "Câu tiếp theo"}
                  </button>
                </div>
              )}
            </section>
          )}

          {screen === "summary" && result && session && (
            <section
              className="rhythm-quiz-summary"
              aria-labelledby="rhythm-quiz-summary-title"
            >
              <div className="rhythm-quiz-summary-mark" aria-hidden="true">
                ✓
              </div>
              <p className="rhythm-quiz-kicker">
                {QUIZ_TRACKS.find(track => track.id === selectedTrack)?.title} ·
                Quiz run {runNumber}
              </p>
              <h1
                id="rhythm-quiz-summary-title"
                className="rhythm-quiz-heading"
              >
                Tổng kết Quiz
              </h1>
              <p className="rhythm-quiz-intro">
                Bạn đã hoàn thành đủ {session.runQuestionIds.length} câu đã chọn.
                Độ chính xác tính trên câu đã trả lời; câu bỏ qua được tính riêng.
              </p>
              <div className="rhythm-quiz-summary-grid">
                <div className="rhythm-quiz-stat">
                  <strong>{result.totalScore}</strong>
                  <span>Tổng điểm cuối</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{result.accuracy}%</strong>
                  <span>Độ chính xác</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>
                    {result.correctAnswers}/
                    {result.correctAnswers + result.incorrectAnswers}
                  </strong>
                  <span>Câu đúng / đã trả lời</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{result.incorrectAnswers}</strong>
                  <span>Câu trả lời sai · +0 điểm</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{session.skippedQuestionIds.length}</strong>
                  <span>Câu đã bỏ qua</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{result.correctAnswers * 10}</strong>
                  <span>Điểm cộng từ câu đúng</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{session.pointsDeducted}</strong>
                  <span>Điểm thực tế bị trừ khi bỏ qua</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>
                    {Math.round(result.averageResponseTimeMs / 1000)}s
                  </strong>
                  <span>Thời gian phản hồi TB</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{runNumber}</strong>
                  <span>Quiz run · chỉ số giao diện</span>
                </div>
              </div>
              <div className="rhythm-quiz-action-row">
                <button
                  type="button"
                  className="rhythm-quiz-primary"
                  onClick={() => startRun(selectedTrack, runNumber + 1)}
                >
                  Làm lại lượt này
                </button>
                <button
                  type="button"
                  className="rhythm-quiz-secondary"
                  onClick={() => setScreen("select")}
                >
                  Chọn cấp độ khác
                </button>
                <button
                  type="button"
                  className="rhythm-quiz-secondary"
                  onClick={onBack}
                >
                  Chọn hoạt động
                </button>
              </div>
            </section>
          )}

          {screen === "technical-error" && (
            <section className="rhythm-quiz-technical" role="alert">
              <h1 className="rhythm-quiz-heading">
                Không thể hiển thị câu hỏi
              </h1>
              <p>
                Lỗi dựng khuông nhạc là lỗi kỹ thuật; câu này không bị chấm sai
                và lượt chưa tạo tổng kết.
              </p>
              {technicalError && (
                <p>
                  <small>{technicalError}</small>
                </p>
              )}
              <div className="rhythm-quiz-action-row">
                <button
                  type="button"
                  className="rhythm-quiz-primary"
                  onClick={() => startRun(selectedTrack, runNumber + 1)}
                >
                  Thử lại Quiz
                </button>
                <button
                  type="button"
                  className="rhythm-quiz-secondary"
                  onClick={() => setScreen("select")}
                >
                  Chọn cấp độ khác
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

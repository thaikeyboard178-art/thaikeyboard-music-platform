import React, { useCallback, useRef, useState } from "react";
import { toTrainingResult } from "@/features/training/session";
import { RhythmQuizNotation } from "../quiz/RhythmQuizNotation";
import {
  createQuizRun,
  DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT,
  QUIZ_QUESTION_BANK,
  QUIZ_TRACKS,
  type QuizQuestion,
  type QuizTrack,
} from "../quiz/questionBank";
import {
  advanceRhythmQuizSession,
  createRhythmQuizSession,
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
  const questionStartedAt = useRef(Date.now());

  const startRun = useCallback(
    (track = selectedTrack, nextRun = runNumber + 1) => {
      const deck = createQuizRun(
        track,
        undefined,
        DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT
      );
      setSelectedTrack(track);
      setQuestions(deck);
      setSession(createRhythmQuizSession(track, deck, nextRun));
      setSelectedOptionId(null);
      setRunNumber(nextRun);
      setTechnicalError(null);
      questionStartedAt.current = Date.now();
      setScreen("quiz");
    },
    [runNumber, selectedTrack, setScreen]
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
    const nextQuestion = questions[session.questionsAnswered];
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

  const currentQuestion = session?.currentExercise ?? null;
  const result = session ? toTrainingResult(session) : null;
  const correctOption = currentQuestion?.options.find(
    option => option.id === currentQuestion.correctOptionId
  );
  const availableQuestionCount = Math.min(
    DEFAULT_RHYTHM_QUIZ_QUESTION_COUNT,
    QUIZ_QUESTION_BANK[String(selectedTrack)]?.length ?? 0
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
                Nhìn khuông nhạc, đọc câu hỏi và chọn đáp án. Mỗi lượt có tối đa{" "}
                {availableQuestionCount} câu theo ngân hàng hiện có. Quiz chỉ
                dùng hình ảnh — không cần nghe hoặc gõ nhịp.
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
                    onClick={() => setSelectedTrack(track.id)}
                  >
                    <span
                      className="rhythm-quiz-track-index"
                      aria-hidden="true"
                    >
                      {track.id === "bonus"
                        ? "2/2"
                        : String(track.id).padStart(2, "0")}
                    </span>
                    <span className="rhythm-quiz-track-copy">
                      <strong>{track.title}</strong>
                      <small>{track.description}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="rhythm-quiz-action-row">
                <button
                  type="button"
                  className="rhythm-quiz-primary"
                  onClick={() => startRun()}
                >
                  Bắt đầu Quiz
                </button>
              </div>
              <p className="rhythm-quiz-note">
                Chọn một cấp độ để bắt đầu một lượt trắc nghiệm hữu hạn.
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
                </span>
                <span>
                  Câu{" "}
                  {session.questionsAnswered +
                    (session.hasAnsweredCurrent ? 0 : 1)}{" "}
                  / {questions.length}
                </span>
              </div>
              <div
                className="rhythm-quiz-progress"
                role="progressbar"
                aria-label="Tiến độ câu hỏi"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={session.questionsAnswered}
              >
                <span
                  style={{
                    width: `${(session.questionsAnswered / questions.length) * 100}%`,
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

          {screen === "summary" && result && (
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
                Bạn đã hoàn thành lượt trắc nghiệm. Điểm phản ánh đúng số câu
                trả lời đúng trong lượt này.
              </p>
              <div className="rhythm-quiz-summary-grid">
                <div className="rhythm-quiz-stat">
                  <strong>{result.totalScore}</strong>
                  <span>Điểm · +10 / câu đúng</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{result.accuracy}%</strong>
                  <span>Độ chính xác</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>
                    {result.correctAnswers}/{result.totalQuestions}
                  </strong>
                  <span>Câu đúng</span>
                </div>
                <div className="rhythm-quiz-stat">
                  <strong>{result.incorrectAnswers}</strong>
                  <span>Câu chưa đúng</span>
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

import React from "react";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { TapRoundResult } from "../exercises/tapRoundScoring";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import { RelativeTimingFeedbackPanel } from "./RelativeTimingFeedbackPanel";

type TapResultPanelProps = Readonly<{
  result: TapAttemptResult;
  exercise?: TapRhythmExercise;
  points: number | null;
  originalPoints?: number | null;
  onRetry: () => void;
  onContinue: () => void;
  busy?: boolean;
  lesson?: boolean;
  retryLabel?: string;
  continueLabel?: string;
  practiceLabel?: string;
}>;

export type TapResultSummary = Readonly<{
  scoreOutOfTen: number | null;
  roundAccuracies: readonly [number | null, number | null];
  averageAccuracyPercent: number | null;
  roundsPlayed: number;
  roundsSkipped: number;
  missedTargetCount: number;
  playedTargetCount: number;
  matchedTapCount: number;
  earlyTapCount: number;
  lateTapCount: number;
  extraTapCount: number;
  hasTwoRoundResult: boolean;
}>;

/** Reads the immutable two-round result; never reruns or replaces the matcher. */
export function summarizeTapResult(result: TapAttemptResult): TapResultSummary {
  const rounds = result.rounds;
  if (result.status !== "completed" || !rounds || rounds.length !== 2) {
    return Object.freeze({
      scoreOutOfTen: null,
      roundAccuracies: Object.freeze([null, null]) as readonly [null, null],
      averageAccuracyPercent: null,
      roundsPlayed: 0,
      roundsSkipped: 0,
      missedTargetCount: 0,
      playedTargetCount: 0,
      matchedTapCount: 0,
      earlyTapCount: 0,
      lateTapCount: 0,
      extraTapCount: 0,
      hasTwoRoundResult: false,
    });
  }
  const playedRounds = rounds.filter(round => round.status === "played");
  const roundsSkipped = rounds.filter(
    round => round.status === "skipped"
  ).length;
  const averageAccuracyPercent =
    playedRounds.length === 0 ||
    playedRounds.some(round => round.accuracyPercent === null)
      ? null
      : playedRounds.reduce(
          (sum, round) => sum + round.accuracyPercent!,
          0
        ) / playedRounds.length;
  const noteResults = playedRounds.flatMap(round => round.noteResults);
  return Object.freeze({
    scoreOutOfTen: result.scoreOutOfTen ?? null,
    roundAccuracies: Object.freeze([
      rounds[0].accuracyPercent,
      rounds[1].accuracyPercent,
    ]) as readonly [number | null, number | null],
    averageAccuracyPercent,
    roundsPlayed: playedRounds.length,
    roundsSkipped,
    missedTargetCount: playedRounds.reduce(
      (sum, round) => sum + round.missedTargetCount,
      0
    ),
    playedTargetCount: result.targetTicks.length * playedRounds.length,
    matchedTapCount: noteResults.filter(row => row.matchStatus === "matched")
      .length,
    earlyTapCount: noteResults.filter(row => row.matchStatus === "early").length,
    lateTapCount: noteResults.filter(row => row.matchStatus === "late").length,
    extraTapCount: playedRounds.reduce(
      (sum, round) => sum + round.extraTapCount,
      0
    ),
    hasTwoRoundResult: true,
  });
}

function friendlyReason(reason: string | null): string {
  if (!reason) return "Lượt này không có đủ dữ liệu để hoàn tất chấm điểm.";
  const knownReasons: Readonly<Record<string, string>> = {
    "audio-unavailable": "Không thể khởi động âm thanh trên thiết bị.",
    "audio-blocked": "Trình duyệt chưa cho phép phát âm thanh.",
    "audio-aborted": "Âm thanh đã bị ngắt trước khi bài hoàn tất.",
    "context-interrupted": "Âm thanh bị gián đoạn trong lúc luyện.",
    "visibility-hidden": "Bài bị ngắt khi thẻ trình duyệt hoặc màn hình bị ẩn.",
    "input-blur": "Cửa sổ mất tiêu điểm trong lúc ghi nhận lượt chạm.",
    "pointer-cancel": "Thiết bị đã hủy thao tác chạm giữa chừng.",
    "pointer-cancelled": "Thiết bị đã hủy thao tác chạm giữa chừng.",
    "target-snapshot-mismatch":
      "Dữ liệu nhịp thay đổi trong lúc bài đang chạy.",
    "generation-mismatch":
      "Lượt chạy âm thanh không còn khớp với bài hiện tại.",
    "non-monotonic-event-time": "Thiết bị gửi thời điểm chạm không hợp lệ.",
    "non-monotonic-output-timestamp":
      "Đồng hồ âm thanh không ổn định trong lượt này.",
    stopped: "Bài đã được dừng trước khi hoàn tất.",
    paused: "Bài đã tạm dừng trước khi hoàn tất.",
    disposed: "Âm thanh đã dừng trước khi bài hoàn tất.",
  };
  return (
    knownReasons[reason] ??
    "Âm thanh hoặc thiết bị gặp trục trặc trong lượt này."
  );
}

function formatAccuracy(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Không khả dụng";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatReferenceScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value}/10`;
}

function formatPoints(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Chưa có điểm được ghi";
  if (!Number.isInteger(value) || value < 0 || value > 10)
    return "Chưa có điểm được ghi";
  return `+${value} điểm`;
}

function roundScoreText(
  round: TapRoundResult | undefined,
  accuracyPercent: number | null
): string {
  if (!round) return "Không khả dụng";
  if (round.status === "skipped") return "Đã bỏ qua";
  if (round.status === "unplayed") return "Chưa chơi";
  return formatAccuracy(accuracyPercent);
}

export function TapResultPanel({
  result,
  exercise,
  points,
  onRetry,
  onContinue,
  busy = false,
  lesson = false,
  retryLabel = "Luyện lại",
  continueLabel = "Tiếp tục",
  practiceLabel =
    "Đây là kết quả luyện tập tham khảo, không được tính vào tổng điểm chính thức.",
}: TapResultPanelProps) {
  const summary = summarizeTapResult(result);
  const isTechnical = result.status === "technical-abort";
  const hasCompletedTwoRounds =
    result.status === "completed" && summary.hasTwoRoundResult;
  const rounds = result.status === "completed" ? result.rounds : undefined;
  const showGradedPoints =
    !lesson &&
    hasCompletedTwoRounds &&
    result.mode === "graded" &&
    summary.scoreOutOfTen !== null &&
    points !== null;
  const referenceScoreAnnouncement =
    summary.roundsPlayed === 0
      ? "Chưa có vòng nào được chơi; chưa có điểm tham khảo."
      : summary.scoreOutOfTen === null
      ? "Điểm tham khảo không khả dụng."
      : `Điểm tham khảo ${summary.scoreOutOfTen}/10.`;
  const currentScoreAnnouncement =
    result.mode === "practice"
      ? referenceScoreAnnouncement
      : `Điểm đã ghi: ${formatPoints(points)}.`;
  const missingHeadsText =
    summary.roundsPlayed === 0 || summary.playedTargetCount === 0
      ? "—"
      : `${summary.missedTargetCount}/${summary.playedTargetCount}`;
  const extraTapsText =
    summary.roundsPlayed === 0 ? "—" : String(summary.extraTapCount);
  const liveAnnouncement = isTechnical
    ? "Bài chưa được chấm do sự cố kỹ thuật."
    : hasCompletedTwoRounds
      ? `Kết quả hai vòng: ${summary.roundsPlayed}/2 vòng đã chơi; vòng 1 ${roundScoreText(rounds?.[0], summary.roundAccuracies[0])}; vòng 2 ${roundScoreText(rounds?.[1], summary.roundAccuracies[1])}; thiếu ${missingHeadsText} đầu nốt; chạm thừa ${extraTapsText}. ${currentScoreAnnouncement}`
      : "Lượt chưa có kết quả hai vòng hợp lệ.";

  return (
    <section
      className="rhythm-result"
      aria-labelledby="rhythm-result-title"
      data-testid="tap-result"
    >
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="tap-result-announcement"
      >
        {liveAnnouncement}
      </p>
      <div className="rhythm-result-live">
        {lesson && (
          <p className="rhythm-result-eyebrow">
            BÀI HỌC — VÍ DỤ KHÔNG CHẤM ĐIỂM
          </p>
        )}
        <h2 id="rhythm-result-title">Kết quả hai vòng gõ nhịp</h2>

        {lesson && (
          <p className="rhythm-practice-label">
            Bài học — ví dụ thực hành không ghi điểm. Accuracy chỉ để tham khảo;
            không tạo shared answer.
          </p>
        )}
        {result.mode === "practice" && !lesson && (
          <p className="rhythm-practice-label">{practiceLabel}</p>
        )}

        {hasCompletedTwoRounds && (
          <>
            <div className="rhythm-metrics rhythm-metrics-primary" aria-label="Kết quả hai vòng">
              <div className="rhythm-metric rhythm-metric-primary" data-testid="tap-primary-round-1">
                <span>Accuracy Vòng 1 (%)</span>
                <strong data-testid="tap-round-1-accuracy">
                  {roundScoreText(rounds?.[0], summary.roundAccuracies[0])}
                </strong>
              </div>
              <div className="rhythm-metric rhythm-metric-primary" data-testid="tap-primary-round-2">
                <span>Accuracy Vòng 2 (%)</span>
                <strong data-testid="tap-round-2-accuracy">
                  {roundScoreText(rounds?.[1], summary.roundAccuracies[1])}
                </strong>
              </div>
              <div className="rhythm-metric rhythm-metric-average" data-testid="tap-primary-average">
                <span>Điểm trung bình (%)</span>
                <strong data-testid="tap-average-accuracy">
                  {summary.roundsPlayed === 0
                    ? "Chưa có"
                    : formatAccuracy(summary.averageAccuracyPercent)}
                </strong>
              </div>
              <div className="rhythm-metric rhythm-metric-reference" aria-label="Điểm tham khảo, quy đổi theo thang 10" data-testid="tap-primary-reference">
                <span>Điểm tham khảo</span>
                <strong data-testid="tap-reference-score">
                  {summary.roundsPlayed === 0
                    ? "Chưa có"
                    : formatReferenceScore(summary.scoreOutOfTen)}
                </strong>
                <small>Điểm quy đổi (thang 10)</small>
              </div>
            </div>

            <details className="rhythm-secondary-metrics" data-testid="tap-secondary-metrics-details">
              <summary>Chi tiết kết quả</summary>
              <div className="rhythm-secondary-metrics-grid">
                <div className="rhythm-metric">
                  <span>Vòng đã chơi</span>
                  <strong data-testid="tap-rounds-played">{summary.roundsPlayed}/2</strong>
                </div>
                <div className="rhythm-metric">
                  <span>Gõ khớp</span>
                  <strong data-testid="tap-count-matched">{summary.matchedTapCount}</strong>
                </div>
                <div className="rhythm-metric">
                  <span>Gõ sớm</span>
                  <strong data-testid="tap-count-early">{summary.earlyTapCount}</strong>
                </div>
                <div className="rhythm-metric">
                  <span>Gõ trễ</span>
                  <strong data-testid="tap-count-late">{summary.lateTapCount}</strong>
                </div>
                <div className="rhythm-metric">
                  <span>Đầu nốt thiếu</span>
                  <strong
                    data-testid="tap-count-missing"
                    aria-label={
                      summary.roundsPlayed === 0
                        ? "Chưa có vòng nào được chơi"
                        : summary.playedTargetCount === 0
                          ? "Không có đầu nốt để chấm"
                          : `${summary.missedTargetCount} trên ${summary.playedTargetCount} đầu nốt đã chơi`
                    }
                  >
                    {missingHeadsText}
                  </strong>
                </div>
                <div className="rhythm-metric">
                  <span>Chạm thừa</span>
                  <strong data-testid="tap-count-extra">{extraTapsText}</strong>
                </div>
                {summary.roundsSkipped > 0 && (
                  <div className="rhythm-metric">
                    <span>Vòng đã bỏ qua</span>
                    <strong data-testid="tap-rounds-skipped">{summary.roundsSkipped}</strong>
                  </div>
                )}
              </div>
            </details>
          </>
        )}

        {hasCompletedTwoRounds && summary.scoreOutOfTen === null && (
          <div className="rhythm-ungraded" role="note">
            <strong>Không có điểm khả dụng.</strong>
            <p>
              {summary.roundsPlayed === 0
                ? summary.roundsSkipped === 2
                  ? "Cả hai vòng đã được bỏ qua; chưa có vòng để tính điểm."
                  : "Chưa có vòng nào được chơi; chưa có điểm trung bình."
                : "Không có đủ khoảng đầu nốt tham chiếu hợp lệ để tính điểm."}
            </p>
          </div>
        )}

        {isTechnical && (
          <div className="rhythm-ungraded" role="note">
            <strong>Bài chưa được chấm — đây không phải lỗi của bạn.</strong>
            <p>{friendlyReason(result.reason)}</p>
          </div>
        )}
        {result.status === "completed" && !summary.hasTwoRoundResult && (
          <div className="rhythm-ungraded" role="note">
            <strong>Không có dữ liệu kết quả cho đủ hai vòng.</strong>
            <p>Hãy bắt đầu một lượt Tap Rhythm mới để nhận kết quả.</p>
          </div>
        )}

        {result.mode === "graded" && !lesson && (
          <div className="rhythm-points" aria-label="Điểm bài tập đã ghi">
            <span>Điểm chính thức</span>
            <strong data-testid="tap-points">
              {showGradedPoints ? formatPoints(points) : "Chưa ghi điểm"}
            </strong>
          </div>
        )}

        {exercise && hasCompletedTwoRounds && (
          <RelativeTimingFeedbackPanel exercise={exercise} result={result} />
        )}
      </div>

      <div className="rhythm-result-actions">
        <button
          className="rhythm-secondary"
          type="button"
          onClick={onRetry}
          disabled={busy}
        >
          {retryLabel}
        </button>
        <button
          className="rhythm-primary"
          type="button"
          onClick={onContinue}
          disabled={busy}
        >
          {continueLabel}
        </button>
      </div>
    </section>
  );
}

export default TapResultPanel;

import React from "react";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { TapTargetResult } from "../exercises/tapMatcher";

type TapResultPanelProps = Readonly<{
  result: TapAttemptResult;
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

type TapStatusCounts = Readonly<{
  matched: number;
  early: number;
  late: number;
  missing: number;
  extra: number;
  n: number;
  k: number;
  extraSequences: readonly number[];
}>;

export type TapResultSummary = Readonly<{
  accuracyPercent: number | null;
  counts: TapStatusCounts | null;
  notApplicable: boolean;
}>;

/** Summarizes only the immutable statuses emitted by the production matcher. */
export function summarizeTapResult(result: TapAttemptResult): TapResultSummary {
  const evaluation = result.evaluation;
  if (result.status !== "completed" || evaluation === null) {
    return Object.freeze({
      accuracyPercent: null,
      counts: null,
      notApplicable: false,
    });
  }

  const targets = evaluation.targetResults;
  const taps = evaluation.tapResults;
  const counts: TapStatusCounts = Object.freeze({
    matched: targets.filter(target => target.status === "matched").length,
    early: targets.filter(target => target.status === "early").length,
    late: targets.filter(target => target.status === "late").length,
    missing: targets.filter(target => target.status === "missing").length,
    extra: taps.filter(tap => tap.status === "extra").length,
    n: targets.length,
    k: taps.length,
    extraSequences: Object.freeze(
      taps.filter(tap => tap.status === "extra").map(tap => tap.sequence)
    ),
  });
  const notApplicable = counts.n === 0 || result.accuracyPercent === null;
  return Object.freeze({
    accuracyPercent: notApplicable ? null : result.accuracyPercent,
    counts,
    notApplicable,
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

function targetStatusText(target: TapTargetResult): string {
  switch (target.status) {
    case "matched":
      return "Khớp nhịp";
    case "early":
      return "Chạm sớm — lệch ngoài vùng khớp";
    case "late":
      return "Chạm muộn — lệch ngoài vùng khớp";
    case "missing":
      return "Chưa có lần chạm ở đầu nốt này";
  }
}

function signedTimingText(target: TapTargetResult): string | null {
  if (target.errorMs === null || target.status === "missing") return null;
  if (target.status === "early") {
    return `Sớm ${Math.round(Math.abs(target.errorMs))} ms`;
  }
  if (target.status === "late") {
    return `Muộn ${Math.round(Math.abs(target.errorMs))} ms`;
  }
  return null;
}

function formatAccuracy(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatPoints(value: number | null | undefined): string {
  if (value === 10 || value === 0) return `+${value} điểm`;
  return "Chưa có điểm được ghi";
}

export function TapResultPanel({
  result,
  points,
  originalPoints,
  onRetry,
  onContinue,
  busy = false,
  lesson = false,
  retryLabel = "Luyện lại",
  continueLabel = "Tiếp tục",
  practiceLabel = "Luyện lại — không ghi thêm điểm",
}: TapResultPanelProps) {
  const summary = summarizeTapResult(result);
  const evaluation = result.evaluation;
  const isAnalyzable =
    result.status === "completed" &&
    summary.counts !== null &&
    summary.counts.n > 0 &&
    summary.accuracyPercent !== null;
  const isTechnical = result.status === "technical-abort";
  const shouldExplainUngraded = isTechnical || !isAnalyzable;
  const showStatusDetails =
    isAnalyzable && evaluation !== null && summary.counts !== null;
  const showGradedPoints =
    !lesson &&
    result.status === "completed" &&
    result.mode === "graded" &&
    isAnalyzable;

  return (
    <section
      className="rhythm-result"
      aria-labelledby="rhythm-result-title"
      data-testid="tap-result"
    >
      <div className="rhythm-result-live" role="status" aria-live="polite">
        <p className="rhythm-result-eyebrow">
          {lesson
            ? "BÀI HỌC — VÍ DỤ KHÔNG CHẤM ĐIỂM"
            : result.mode === "practice"
              ? "KẾT QUẢ LUYỆN TẬP"
              : "KẾT QUẢ BÀI TẬP"}
        </p>
        <h2 id="rhythm-result-title">Kết quả lượt gõ nhịp</h2>

        {lesson && (
          <p className="rhythm-practice-label">
            Bài học — ví dụ thực hành không ghi điểm. Timing Accuracy chỉ để
            tham khảo; không tạo shared answer.
          </p>
        )}
        {result.mode === "practice" && !lesson && (
          <p className="rhythm-practice-label">{practiceLabel}</p>
        )}

        {showStatusDetails && summary.counts && evaluation && (
          <>
            <div className="rhythm-metrics" aria-label="Chỉ số kết quả">
              <div className="rhythm-metric rhythm-metric-primary">
                <span>Độ chính xác nhịp (Timing Accuracy)</span>
                <strong data-testid="tap-accuracy">
                  {formatAccuracy(summary.accuracyPercent!)}
                </strong>
              </div>
              <div className="rhythm-metric">
                <span>Khớp nhịp</span>
                <strong data-testid="tap-count-matched">
                  {summary.counts.matched}
                </strong>
              </div>
              <div className="rhythm-metric">
                <span>Chạm sớm</span>
                <strong data-testid="tap-count-early">
                  {summary.counts.early}
                </strong>
              </div>
              <div className="rhythm-metric">
                <span>Chạm muộn</span>
                <strong data-testid="tap-count-late">
                  {summary.counts.late}
                </strong>
              </div>
              <div className="rhythm-metric">
                <span>Thiếu lần chạm</span>
                <strong data-testid="tap-count-missing">
                  {summary.counts.missing}
                </strong>
              </div>
              <div className="rhythm-metric">
                <span>Chạm thừa</span>
                <strong data-testid="tap-count-extra">
                  {summary.counts.extra}
                </strong>
              </div>
              <p className="rhythm-result-nk">
                N (đầu nốt cần chạm): {summary.counts.n} · K (lần chạm):{" "}
                {summary.counts.k}
              </p>
            </div>

            <p className="rhythm-diagnostic-note">
              Chạm sớm hoặc muộn là thông tin để bạn điều chỉnh nhịp; các lần
              chạm này vẫn được giữ nguyên trạng thái riêng, không tính thành
              “khớp”.
            </p>

            <ul
              className="rhythm-feedback-list"
              aria-label="Phản hồi từng đầu nốt"
            >
              {evaluation.targetResults.map((target, index) => {
                const timing = signedTimingText(target);
                return (
                  <li
                    className={`rhythm-feedback-item is-${target.status}`}
                    key={`${target.targetId}-${target.targetIndex}`}
                  >
                    <span className="rhythm-feedback-label">
                      Đầu nốt {index + 1}
                    </span>
                    <span>{targetStatusText(target)}</span>
                    {timing && <small>{timing}</small>}
                  </li>
                );
              })}
            </ul>

            {summary.counts.extra > 0 && (
              <p className="rhythm-extra-note">
                Có {summary.counts.extra} lần chạm thừa
                {summary.counts.extraSequences.length > 0
                  ? ` (lần chạm ${summary.counts.extraSequences
                      .map(sequence => sequence + 1)
                      .join(", ")})`
                  : ""}
                . Lần chạm thừa không gắn với một đầu nốt mục tiêu.
              </p>
            )}
          </>
        )}

        {shouldExplainUngraded && (
          <div className="rhythm-ungraded" role="note">
            <strong>Bài chưa được chấm — đây không phải lỗi của bạn.</strong>
            <p>
              {isTechnical
                ? friendlyReason(result.reason)
                : summary.counts?.n === 0
                  ? "Bài không có nhịp onset để chấm (N = 0), nên Timing Accuracy không áp dụng."
                  : result.evaluation === null
                    ? friendlyReason(result.reason)
                    : "Lượt này chưa có Timing Accuracy hợp lệ để hiển thị."}
            </p>
          </div>
        )}

        {result.mode === "graded" && !lesson && (
          <div className="rhythm-points" aria-label="Điểm bài tập">
            <span>Exercise Points</span>
            <strong data-testid="tap-points">
              {showGradedPoints ? formatPoints(points) : "Chưa ghi điểm"}
            </strong>
          </div>
        )}

        {result.mode === "practice" && !lesson && (
          <p className="rhythm-original-points">
            {originalPoints === 10 || originalPoints === 0
              ? `Điểm đã ghi từ bài chấm trước: ${formatPoints(originalPoints)}. Điểm này được giữ nguyên, không tính lại ở lượt luyện.`
              : "Chơi thử không tạo câu trả lời chấm điểm hoặc điểm chính thức."}
          </p>
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

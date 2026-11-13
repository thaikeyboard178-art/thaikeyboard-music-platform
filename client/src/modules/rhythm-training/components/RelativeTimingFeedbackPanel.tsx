import React from "react";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { TapRoundResult } from "../exercises/tapRoundScoring";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import { deriveMeter } from "../rhythm/meters";

function percentage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Không khả dụng";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function percentageMagnitude(value: number): string {
  const magnitude = Math.abs(value);
  return `${Number.isInteger(magnitude) ? magnitude : magnitude.toFixed(1)}%`;
}

function rowForTarget(round: TapRoundResult, targetIndex: number) {
  return round.noteResults.find(row => row.targetIndex === targetIndex) ?? null;
}

function resultText(round: TapRoundResult, targetIndex: number): string {
  if (round.status === "skipped") return "Đã bỏ qua";
  const row = rowForTarget(round, targetIndex);
  if (!row) return "Không có dữ liệu";
  if (row.matchStatus === "missing") return "Thiếu";
  if (row.matchStatus === "matched") return "Đúng";

  const direction =
    row.direction === "early" || row.matchStatus === "early"
      ? "Sớm"
      : row.direction === "late" || row.matchStatus === "late"
        ? "Muộn"
        : null;
  if (!direction) return "Đúng";
  return row.deviationPercent === null
    ? direction
    : `${direction} ${percentageMagnitude(row.deviationPercent)}`;
}

function noteScoreText(round: TapRoundResult, targetIndex: number): string {
  if (round.status === "skipped") return "Đã bỏ qua";
  const row = rowForTarget(round, targetIndex);
  if (!row) return "Không có dữ liệu";
  return percentage(row.noteAccuracyPercent);
}

function extraTapText(round: TapRoundResult): string {
  return round.status === "skipped" ? "Đã bỏ qua" : String(round.extraTapCount);
}

export function RelativeTimingFeedbackPanel({
  exercise,
  result,
}: Readonly<{
  exercise: TapRhythmExercise;
  result: TapAttemptResult;
}>) {
  const rounds = result.rounds;
  const contextMatches =
    result.exerciseId === exercise.id &&
    result.targetTicks.length === exercise.targets.length &&
    result.targetTicks.every(
      (tick, index) => tick === exercise.targets[index]?.tick
    );
  if (
    result.status !== "completed" ||
    !rounds ||
    rounds.length !== 2 ||
    !contextMatches
  ) {
    return null;
  }
  const measureTicks = deriveMeter(exercise.pattern.meter).measureTicks;

  return (
    <section
      className="rhythm-relative-feedback"
      aria-label="Bảng điểm chi tiết hai vòng"
      data-testid="tap-relative-feedback"
    >
      <details
        className="rhythm-relative-details"
        data-testid="tap-detail-table-details"
      >
        <summary>Bảng điểm chi tiết</summary>
        <div className="tap-detail-table-scroll" tabIndex={0}>
          <table
            className="tap-detail-table"
            aria-label="Kết quả từng đầu nốt qua hai vòng"
            data-testid="tap-detail-table"
          >
            <caption className="sr-only">
              Trạng thái và điểm mỗi đầu nốt ở từng vòng. Vòng đã bỏ qua không
              có điểm.
            </caption>
            <thead>
              <tr>
                <th scope="col">Đầu nốt</th>
                <th scope="col">Kết quả vòng 1</th>
                <th scope="col">Điểm vòng 1</th>
                <th scope="col">Kết quả vòng 2</th>
                <th scope="col">Điểm vòng 2</th>
              </tr>
            </thead>
            <tbody>
              {exercise.targets.map((target, targetIndex) => {
                const measureNumber =
                  Math.floor(target.tick / measureTicks) + 1;
                const firstResult = resultText(rounds[0], targetIndex);
                const secondResult = resultText(rounds[1], targetIndex);
                return (
                  <tr
                    key={target.id}
                    data-testid={`tap-detail-onset-${targetIndex}`}
                  >
                    <th
                      scope="row"
                      aria-label={`Đầu nốt ${targetIndex + 1}, ô ${measureNumber}, tick ${target.tick}`}
                    >
                      Đầu nốt {targetIndex + 1}
                      <span className="sr-only">
                        {`, ô ${measureNumber}, tick ${target.tick}`}
                      </span>
                    </th>
                    <td
                      aria-label={`${firstResult}, điểm ${noteScoreText(rounds[0], targetIndex)}`}
                    >
                      {firstResult}
                    </td>
                    <td
                      data-testid={`tap-round-1-note-accuracy-${targetIndex}`}
                    >
                      {noteScoreText(rounds[0], targetIndex)}
                    </td>
                    <td
                      aria-label={`${secondResult}, điểm ${noteScoreText(rounds[1], targetIndex)}`}
                    >
                      {secondResult}
                    </td>
                    <td
                      data-testid={`tap-round-2-note-accuracy-${targetIndex}`}
                    >
                      {noteScoreText(rounds[1], targetIndex)}
                    </td>
                  </tr>
                );
              })}
              {exercise.targets.length === 0 && (
                <tr>
                  <td colSpan={5}>Bài không có đầu nốt để so sánh.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="tap-extra-summary" data-testid="tap-extra-summary">
          Chạm thừa riêng: Vòng 1 — {extraTapText(rounds[0])}; Vòng 2 —{" "}
          {extraTapText(rounds[1])}.
        </p>
      </details>
    </section>
  );
}

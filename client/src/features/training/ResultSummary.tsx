import React from "react";
import type { TrainingResult } from "./types";

export type ResultSummaryProps = {
  result: TrainingResult;
};

export function ResultSummary({ result }: ResultSummaryProps) {
  const seconds = Math.max(0, Math.round(result.averageResponseTimeMs / 100) / 10);

  return (
    <>
      <div className="result-score">
        <strong>{result.accuracy}%</strong>
        <span>độ chính xác</span>
      </div>
      <div className="result-stats">
        <div><strong>{result.totalQuestions}</strong><span>Tổng số câu</span></div>
        <div><strong>{result.correctAnswers}</strong><span>Trả lời đúng</span></div>
        <div><strong>{result.incorrectAnswers}</strong><span>Cần luyện thêm</span></div>
        <div><strong>{result.totalScore}</strong><span>Điểm tích lũy</span></div>
        <div><strong>{seconds}s</strong><span>Thời gian trung bình</span></div>
      </div>
    </>
  );
}

export default ResultSummary;

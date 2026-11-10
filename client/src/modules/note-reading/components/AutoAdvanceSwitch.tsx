import React from "react";

type Props = { enabled: boolean; onChange: (enabled: boolean) => void; compact?: boolean };

export function AutoAdvanceSwitch({ enabled, onChange, compact = false }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Tự động chuyển câu tiếp theo"
      className={`auto-advance-switch ${compact ? "is-compact" : ""}`}
      onClick={() => onChange(!enabled)}
    >
      <span className="switch-copy"><strong>Tự động chuyển câu tiếp theo</strong>{!compact && <small>{enabled ? "Xem phản hồi 0,9 giây, rồi sang câu mới." : "Giữ phản hồi đến khi bạn chọn câu tiếp theo."}</small>}</span>
      <span className={`switch-track ${enabled ? "is-on" : ""}`} aria-hidden="true"><span /></span>
    </button>
  );
}

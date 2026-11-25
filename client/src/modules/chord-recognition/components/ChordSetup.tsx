import React from "react";
import type { ChordConfiguration, ChordLevel, PlaybackConfiguration } from "../types";
import { LEVELS } from "../curriculum/levels";
export function PlaybackControls({ value, onChange, disabled = false }: { value: PlaybackConfiguration; onChange: (p: PlaybackConfiguration) => void; disabled?: boolean }) {
  return <div className="chord-field-grid">
    <label>Cách phát<select aria-label="Cách phát" value={value.mode} disabled={disabled} onChange={e => onChange({ ...value, mode: e.target.value as PlaybackConfiguration["mode"] })}><option value="melody">Melody — Lần lượt</option><option value="harmony">Harmony — Đồng thời</option><option value="both">Both — Lần lượt rồi đồng thời</option></select></label>
    <label>Hướng giai điệu<select aria-label="Hướng giai điệu" value={value.direction} disabled={disabled || value.mode === "harmony"} onChange={e => onChange({ ...value, direction: e.target.value as PlaybackConfiguration["direction"] })}><option value="ascending">Đi lên</option><option value="descending">Đi xuống</option><option value="random">Ngẫu nhiên lên / xuống</option></select></label>
    <label className="chord-wide">Khoảng cách nốt <strong>{value.spacingMs} ms</strong><input aria-label="Khoảng cách nốt" type="range" min={150} max={1000} step={10} value={value.spacingMs} disabled={disabled || value.mode === "harmony"} onChange={e => onChange({ ...value, spacingMs: Number(e.target.value) })} /></label>
  </div>;
}
export function ChordSetup({ config, onChange, onStart, error }: { config: ChordConfiguration; onChange: (c: ChordConfiguration) => void; onStart: () => void; error: string | null }) {
  return <section className="chord-panel" aria-label="Thiết lập hợp âm">
    <span className="module-kicker">THIẾT LẬP BÀI LUYỆN</span><h2>{config.method === "visual" ? "Nhìn và nhận biết" : "Nghe và nhận biết"}</h2>
    <p className="chord-muted">Chọn độ phức tạp hợp âm và cách luyện phù hợp với bạn.</p>
    <div className="chord-field-grid">
      <label>Level hợp âm<select aria-label="Level hợp âm" value={config.level} onChange={e => onChange({ ...config, level: Number(e.target.value) as ChordLevel })}>{LEVELS.map(l => <option key={l.level} value={l.level}>Level {l.level} — {l.label}</option>)}</select></label>
      <label>Số câu hỏi<select aria-label="Số câu hỏi" value={config.questionCount ?? "unlimited"} onChange={e => onChange({ ...config, questionCount: e.target.value === "unlimited" ? null : Number(e.target.value) as 10 | 20 | 30 })}><option value="10">10 câu</option><option value="20">20 câu</option><option value="30">30 câu</option><option value="unlimited">Không giới hạn</option></select></label>
      <label>Đáp án<select aria-label="Kiểu đáp án" value={config.answerMode} onChange={e => onChange({ ...config, answerMode: e.target.value as "quality" | "full" })}><option value="quality">Nhận diện loại hợp âm</option><option value="full">Tên hợp âm đầy đủ</option></select></label>
      <label>Âm vực<select aria-label="Âm vực" value={config.register} onChange={e => onChange({ ...config, register: Number(e.target.value) as 3 | 4 | 5 })}><option value="3">Thấp — nốt gốc quãng tám 3</option><option value="4">Trung — nốt gốc quãng tám 4</option><option value="5">Cao — nốt gốc quãng tám 5</option></select></label>
      {config.method === "visual" && <label className="chord-wide">Cách hiển thị<select aria-label="Cách hiển thị" value={config.display} onChange={e => onChange({ ...config, display: e.target.value as ChordConfiguration["display"] })}><option value="staff">Khuông nhạc</option><option value="piano">Bàn phím Piano</option><option value="both">Khuông nhạc và Piano</option></select></label>}
      <label className="chord-check chord-wide"><input type="checkbox" checked={config.inversions} onChange={e => onChange({ ...config, inversions: e.target.checked })} />Cho phép thế đảo</label>
    </div>
    <p className="chord-level-description">{LEVELS.find(l => l.level === config.level)?.description}</p>
    {config.method === "ear" && <div className="chord-playback-settings"><h3>Âm thanh bài luyện</h3><PlaybackControls value={config.playback} onChange={playback => onChange({ ...config, playback })} /><label>Giới hạn nghe lại<select aria-label="Giới hạn nghe lại" value={config.replayLimit ?? "unlimited"} onChange={e => onChange({ ...config, replayLimit: e.target.value === "unlimited" ? null : Number(e.target.value) as 1 | 3 })}><option value="unlimited">Không giới hạn</option><option value="3">3 lần nghe lại</option><option value="1">1 lần nghe lại</option></select></label><p className="chord-muted">Lượt phát đầu tiên không tính vào số lần nghe lại.</p></div>}
    {error && <p role="alert" className="chord-error">{error}</p>}
    <button className="chord-primary" onClick={onStart}>Bắt đầu bài tập</button>
  </section>;
}

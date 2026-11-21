import React, { useMemo, useState } from "react";
import type { ChordPitch, QualityId } from "../types";
import { ROOT_NAMES } from "../theory/spelling";
import { CHORD_QUALITIES } from "../theory/qualityCatalog";
import { createChord } from "../theory/chords";
import { suggestVoicing } from "../theory/voicing";
import { ChordStaff } from "../notation/ChordStaff";
import { ChordPiano } from "./ChordPiano";

export function ChordReference({ onPlay, onStop }: { onPlay: (pitches: readonly ChordPitch[]) => void; onStop: () => void }) {
  const [root, setRoot] = useState("C");
  const [quality, setQuality] = useState<QualityId>("major");
  const [bass, setBass] = useState("");
  const [labels, setLabels] = useState(true);
  const [hand, setHand] = useState<"both" | "left" | "right">("both");
  const chord = useMemo(() => createChord(root, quality, { octave: 4, bass: bass || undefined }), [root, quality, bass]);
  const voicing = useMemo(() => suggestVoicing(chord), [chord]);
  function change(action: () => void) { onStop(); action(); }
  return <section className="chord-panel chord-reference" aria-label="Bảng tra cứu hợp âm">
    <span className="module-kicker">CHORD REFERENCE</span><h2>Bảng tra cứu hợp âm</h2>
    <div className="chord-field-grid chord-reference-selectors">
      <label>Nốt gốc<select aria-label="Nốt gốc tra cứu" value={root} onChange={e => change(() => setRoot(e.target.value))}>{ROOT_NAMES.map(n => <option key={n}>{n}</option>)}</select></label>
      <label>Loại hợp âm<select aria-label="Loại hợp âm tra cứu" value={quality} onChange={e => change(() => setQuality(e.target.value as QualityId))}>{CHORD_QUALITIES.map(q => <option value={q.id} key={q.id}>{q.name}</option>)}</select></label>
      <label>Nốt bass / slash<select aria-label="Nốt bass tra cứu" value={bass} onChange={e => change(() => setBass(e.target.value))}><option value="">Theo nốt gốc</option>{ROOT_NAMES.map(n => <option key={n}>{n}</option>)}</select></label>
    </div>
    <div className="chord-reference-halves">
      <div className="chord-structure"><h3>Cấu tạo hợp âm</h3><div className="chord-symbol">{chord.symbol}</div><p>{chord.name}</p><dl><div><dt>Công thức quãng</dt><dd>{chord.intervals.map(i => i.label).join(" – ")}</dd></div><div><dt>Nốt cấu tạo</dt><dd>{chord.tones.map(n => n.name).join(" – ")}</dd></div><div><dt>Nốt gốc / Bass</dt><dd>{chord.root.name} / {chord.bass.name}</dd></div></dl>
        <ChordStaff pitches={chord.pitches} reveal /><ChordPiano pitches={chord.pitches} showLabels />
        <button className="chord-secondary" onClick={() => onPlay(chord.pitches)}>Nghe hợp âm</button>
      </div>
      <div className="chord-voicing"><h3>Cách chơi gợi ý trên Piano</h3><span className="chord-muted">Suggested Piano Voicing</span>
        <p className="chord-disclaimer">Đây là cách chơi gợi ý. Hợp âm có thể được thể hiện bằng nhiều cách phân bổ nốt và thế đảo khác nhau tùy ngữ cảnh âm nhạc.</p>
        <div className="chord-field-grid"><label>Xem tay<select aria-label="Xem tay" value={hand} onChange={e => { onStop(); setHand(e.target.value as typeof hand); }}><option value="both">Cả hai tay</option><option value="left">Chỉ tay trái</option><option value="right">Chỉ tay phải</option></select></label><label className="chord-check"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} />Hiển thị tên nốt</label></div>
        <div className="chord-hand-legend"><span className="left">Left Hand (LH)</span><span className="right">Right Hand (RH)</span></div>
        {labels && <div className="chord-voicing-notes">{hand !== "right" && <p><b>LH:</b> {voicing.left.map(p => `${p.name}${p.octave}`).join(" – ")}</p>}{hand !== "left" && <p><b>RH:</b> {voicing.right.map(p => `${p.name}${p.octave}`).join(" – ")}</p>}</div>}
        <ChordPiano left={voicing.left} right={voicing.right} showLabels={labels} hand={hand} />
        <div className="chord-actions"><button className="chord-secondary" onClick={() => { setHand("left"); onPlay(voicing.left); }}>Nghe tay trái</button><button className="chord-secondary" onClick={() => { setHand("right"); onPlay(voicing.right); }}>Nghe tay phải</button><button className="chord-secondary" onClick={() => { setHand("both"); onPlay([...voicing.left, ...voicing.right]); }}>Nghe hai tay</button><button className="chord-secondary" onClick={onStop}>Dừng âm thanh</button></div>
      </div>
    </div>
  </section>;
}

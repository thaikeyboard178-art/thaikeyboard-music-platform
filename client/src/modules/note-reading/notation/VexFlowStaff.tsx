import { useLayoutEffect, useRef } from "react";
import React from "react";
import { Formatter, Renderer, Stave, StaveNote } from "vexflow";
import type { NoteEvent } from "../types";
import { NOTE_SOLFEGE, vexFlowKey } from "./musicTheory";

export type VexFlowStaffProps = {
  note: NoteEvent;
  revealAnswer?: boolean;
  feedback?: "correct" | "incorrect" | null;
};

export function VexFlowStaff({ note, revealAnswer = false, feedback = null }: VexFlowStaffProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const noteKey = vexFlowKey(note);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;

    const draw = () => {
      if (disposed || !host.isConnected) return;
      const width = Math.max(180, Math.floor(host.getBoundingClientRect().width || host.clientWidth || 420));
      const height = 198;
      host.replaceChildren();
      try {
        const renderer = new Renderer(host, Renderer.Backends.SVG);
        renderer.resize(width, height);
        const context = renderer.getContext();
        const stave = new Stave(12, 38, width - 24, { spacingBetweenLinesPx: 12 });
        stave.addClef(note.clef).setContext(context).draw();

        const color = feedback === "correct" ? "#28734f" : feedback === "incorrect" ? "#bd4937" : "#24313f";
        const staveNote = new StaveNote({ keys: [noteKey], duration: "q", clef: note.clef, autoStem: true });
        staveNote.setStyle({ fillStyle: color, strokeStyle: color });
        staveNote.setStemStyle({ strokeStyle: color });
        staveNote.setLedgerLineStyle({ strokeStyle: "#556578", lineWidth: 1.15 });
        Formatter.FormatAndDraw(context, stave, [staveNote]);
      } catch {
        host.replaceChildren();
        const fallback = document.createElement("p");
        fallback.className = "notation-error";
        fallback.textContent = "Không thể hiển thị khuông nhạc. Vui lòng tải lại trang.";
        host.append(fallback);
      }
    };

    draw();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw);
    observer?.observe(host);
    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [note.clef, noteKey, feedback]);

  const label = `Khuông nhạc khóa ${note.clef === "treble" ? "Sol" : "Fa"}${revealAnswer ? `, ${NOTE_SOLFEGE[note.letter]} ${note.octave}` : ""}`;
  return <div ref={hostRef} className="notation-host" role="img" aria-label={label} data-clef={note.clef} data-position={note.diatonicPosition} />;
}

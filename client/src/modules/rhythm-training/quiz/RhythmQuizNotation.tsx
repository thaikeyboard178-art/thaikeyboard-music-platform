import React, { useLayoutEffect, useRef } from "react";
import {
  BarlineType,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
  VexFlow,
} from "vexflow";
import { renderRhythmNotation } from "../notation/VexFlowRhythm";
import type { QuizNotation } from "./questionBank";

export function RhythmQuizNotation({
  notation,
  onRenderError,
}: {
  notation: QuizNotation;
  onRenderError: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    try {
      if (notation.kind === "canonical") {
        const rendered = renderRhythmNotation(host, notation.pattern, {
          width: 620,
          measuresPerRow: 1,
          displayTimeSignature: notation.showTimeSignature !== false,
          exposeCanonicalMetadata: notation.showTimeSignature !== false,
        });
        rendered.svg.setAttribute(
          "data-quiz-notation",
          "canonical-complete-bar"
        );
      } else {
        // Quiz-only visual illustration: this deliberately incomplete bar is not a canonical pattern,
        // is not graded as one, and never passes through requireValidRhythmPattern.
        while (host.firstChild) host.removeChild(host.firstChild);
        const renderer = new Renderer(
          host as HTMLDivElement,
          Renderer.Backends.SVG
        );
        renderer.resize(560, 155);
        const context = renderer.getContext();
        const stave = new Stave(20, 30, 520);
        stave.addClef("percussion").addTimeSignature("3/8");
        stave.setEndBarType(BarlineType.END);
        stave.setContext(context).draw();
        const voice = new Voice({
          numBeats: 3,
          beatValue: 8,
          resolution: VexFlow.RESOLUTION,
        });
        voice.setMode(Voice.Mode.SOFT);
        voice.addTickables([new StaveNote({ keys: ["b/4"], duration: "q" })]);
        voice.setStave(stave);
        new Formatter()
          .joinVoices([voice])
          .format([voice], stave.getNoteEndX() - stave.getNoteStartX() - 24);
        voice.draw(context, stave);
        const svg = host.querySelector("svg");
        if (!svg)
          throw new Error("VexFlow did not create an illustrative SVG.");
        svg.setAttribute("data-quiz-notation", "illustrative-incomplete-3-8");
        svg.setAttribute("role", "img");
        svg.setAttribute(
          "aria-label",
          "Minh họa ô nhịp 3/8 chưa hoàn chỉnh với một nốt đen"
        );
        svg.setAttribute("viewBox", "0 0 560 155");
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
      }
    } catch (error) {
      onRenderError(
        error instanceof Error ? error.message : "Không thể dựng khuông nhạc."
      );
    }
  }, [notation, onRenderError]);

  return (
    <figure className="rhythm-quiz-notation" data-testid="quiz-notation">
      <div ref={hostRef} className="rhythm-quiz-notation-canvas" />
      {notation.kind === "illustrative-3-8-partial" && (
        <p className="rhythm-quiz-notation-caption is-illustrative">
          Minh họa Quiz chưa hoàn chỉnh — không phải mẫu nhịp canonical được
          chấm điểm.
        </p>
      )}
      {notation.kind === "canonical" && (
        <figcaption className="rhythm-quiz-notation-caption">
          {notation.caption}
        </figcaption>
      )}
    </figure>
  );
}

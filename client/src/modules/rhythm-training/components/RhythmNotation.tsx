import React, { useEffect, useRef, useState } from "react";
import type { RhythmPattern } from "../types";
import { renderRhythmNotation } from "../notation/VexFlowRhythm";

type RhythmNotationProps = Readonly<{
  pattern: RhythmPattern;
  onReady?: (ready: boolean) => void;
}>;
type RenderState = "loading" | "ready" | "error";

function canonicalSummary(pattern: RhythmPattern): string {
  const segments = pattern.measures.flatMap(measure => measure.segments);
  const notes = segments.filter(segment => segment.kind === "note").length;
  const rests = segments.filter(segment => segment.kind === "rest").length;
  const tieGroups = new Set(
    segments
      .filter(segment => segment.kind === "note" && segment.tieGroupId)
      .map(segment => segment.tieGroupId)
  ).size;
  const tieSummary =
    tieGroups > 0 ? ` Có ${tieGroups} nhóm nốt được nối bằng dấu nối.` : "";
  return `Nhịp ${pattern.meter.numerator}/${pattern.meter.denominator}, ${pattern.measures.length} ô nhịp; ${notes} nốt hoặc đoạn nốt, ${rests} ký hiệu lặng.${tieSummary}`;
}

function notationLabel(pattern: RhythmPattern): string {
  return `Ký âm tiết tấu nhịp ${pattern.meter.numerator}/${pattern.meter.denominator}, ${pattern.measures.length} ô nhịp`;
}

export function RhythmNotation({ pattern, onReady }: RhythmNotationProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const lastWidthRef = useRef(0);
  const [renderState, setRenderState] = useState<RenderState>("loading");

  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    lastWidthRef.current = 0;
    host.replaceChildren();
    setRenderState("loading");
    onReadyRef.current?.(false);

    const draw = () => {
      if (disposed) return;
      const width = Math.floor(host.clientWidth);
      if (width < 1 || width === lastWidthRef.current) return;

      lastWidthRef.current = width;
      try {
        const rendered = renderRhythmNotation(host, pattern, {
          width,
          measuresPerRow: width < 560 ? 1 : 0,
          tapGroups: true,
        });
        if (!host.contains(rendered.svg)) host.appendChild(rendered.svg);
        rendered.svg.setAttribute("role", "img");
        rendered.svg.setAttribute("aria-label", notationLabel(pattern));

        // Keep the adapter's natural drawing dimensions so dense notation
        // scrolls instead of shrinking to fit a narrow phone screen.
        const naturalWidth = Number(
          rendered.svg.getAttribute("data-rhythm-natural-width")
        );
        const viewBox = rendered.svg.getAttribute("viewBox");
        const viewBoxHeight = viewBox?.trim().split(/[ ,]+/)[3];
        const naturalHeight = Number(viewBoxHeight);
        if (Number.isFinite(naturalWidth) && naturalWidth > 0) {
          rendered.svg.setAttribute("width", String(naturalWidth));
        }
        if (Number.isFinite(naturalHeight) && naturalHeight > 0) {
          rendered.svg.setAttribute("height", String(naturalHeight));
        }

        setRenderState("ready");
        onReadyRef.current?.(true);
      } catch {
        host.replaceChildren();
        setRenderState("error");
        onReadyRef.current?.(false);
      }
    };

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => draw())
        : null;
    observer?.observe(host);
    window.addEventListener("resize", draw);
    draw();

    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [pattern]);

  return (
    <section className="rhythm-notation" aria-label="Ký âm bài tập">
      <div
        className="rhythm-notation-scroll"
        aria-busy={renderState === "loading"}
      >
        <div className="rhythm-notation-host" ref={hostRef} />
      </div>
      {renderState === "loading" && (
        <p className="rhythm-loading" role="status">
          Đang chuẩn bị khuông nhạc…
        </p>
      )}
      {renderState === "error" && (
        <p className="rhythm-error" role="alert">
          Chưa thể hiển thị khuông nhạc. Hãy thử tải lại bài tập.
        </p>
      )}
      <p className="rhythm-notation-summary">{canonicalSummary(pattern)}</p>
    </section>
  );
}

export default RhythmNotation;

import React, { useEffect, useRef, useState } from "react";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import { renderRhythmNotation } from "../notation/VexFlowRhythm";
import {
  projectTapMarkers,
  type TapMarkerProjection,
  type TapMarkerStatus,
} from "../ui/tapMarkerProjection";

type TapResultNotationProps = Readonly<{
  exercise: TapRhythmExercise;
  result: TapAttemptResult;
}>;

type RenderState = "loading" | "ready" | "error";

const SVG_NS = "http://www.w3.org/2000/svg";
const STATUS_COPY: Readonly<Record<TapMarkerStatus, string>> = Object.freeze({
  matched: "Khớp",
  early: "Sớm",
  late: "Muộn",
  missing: "Thiếu",
  extra: "Thừa",
});
const STATUS_COLOR: Readonly<Record<TapMarkerStatus, string>> = Object.freeze({
  matched: "#23835a",
  early: "#c47a12",
  late: "#c94b45",
  missing: "#657080",
  extra: "#7654a8",
});

function timestampText(offsetMs: number): string {
  const sign = offsetMs < 0 ? "−" : "+";
  return `t ${sign}${String(Math.abs(offsetMs))} ms`;
}

function signedErrorText(errorMs: number, compact = false): string {
  const sign = errorMs < 0 ? "−" : "+";
  if (compact) return `${sign}${Math.round(Math.abs(errorMs))} ms`;
  return `Δ ${sign}${String(Math.abs(errorMs))} ms`;
}

function statusShape(marker: TapMarkerProjection, color: string): SVGElement {
  const { x, y, status } = marker;
  if (status === "matched") {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", "5");
    circle.setAttribute("fill", color);
    return circle;
  }
  if (status === "early" || status === "late") {
    const diamond = document.createElementNS(SVG_NS, "path");
    diamond.setAttribute(
      "d",
      `M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z`
    );
    diamond.setAttribute("fill", color);
    return diamond;
  }
  if (status === "missing") {
    const cross = document.createElementNS(SVG_NS, "path");
    cross.setAttribute(
      "d",
      `M ${x - 5} ${y - 5} L ${x + 5} ${y + 5} M ${x + 5} ${y - 5} L ${x - 5} ${y + 5}`
    );
    cross.setAttribute("fill", "none");
    cross.setAttribute("stroke", color);
    cross.setAttribute("stroke-width", "2.5");
    cross.setAttribute("stroke-linecap", "round");
    return cross;
  }
  const square = document.createElementNS(SVG_NS, "rect");
  square.setAttribute("x", String(x - 5));
  square.setAttribute("y", String(y - 5));
  square.setAttribute("width", "10");
  square.setAttribute("height", "10");
  square.setAttribute("rx", "1.5");
  square.setAttribute("fill", color);
  return square;
}

function markerAccessibleLabel(marker: TapMarkerProjection): string {
  const parts = [STATUS_COPY[marker.status]];
  if (marker.offsetMs !== null) parts.push(timestampText(marker.offsetMs));
  if (marker.errorMs !== null) parts.push(signedErrorText(marker.errorMs));
  return parts.join(", ");
}

function createMarkerLayer(
  viewBox: string,
  naturalWidth: number,
  naturalHeight: number,
  markers: readonly TapMarkerProjection[],
  visible: boolean
): SVGSVGElement {
  const overlay = document.createElementNS(SVG_NS, "svg");
  overlay.setAttribute("viewBox", viewBox);
  overlay.setAttribute("width", String(naturalWidth));
  overlay.setAttribute("height", String(naturalHeight));
  overlay.setAttribute("preserveAspectRatio", "xMinYMin meet");
  overlay.setAttribute("data-testid", "tap-marker-layer");
  overlay.setAttribute("role", "img");
  overlay.setAttribute("aria-label", "Vị trí lần chạm trên khuông nhạc");
  overlay.setAttribute("aria-hidden", String(!visible));
  overlay.style.position = "absolute";
  overlay.style.inset = "0 auto auto 0";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "visible";

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("data-testid", "tap-markers");
  group.setAttribute("visibility", visible ? "visible" : "hidden");
  for (const marker of markers) {
    const markerGroup = document.createElementNS(SVG_NS, "g");
    markerGroup.setAttribute("data-testid", "tap-marker");
    markerGroup.setAttribute("data-status", marker.status);
    markerGroup.setAttribute("data-tick", String(marker.tick));
    markerGroup.setAttribute("data-measure", String(marker.measureIndex));
    markerGroup.setAttribute(
      "data-sequence",
      marker.sequence === null ? "" : String(marker.sequence)
    );
    markerGroup.setAttribute(
      "data-offset",
      marker.offsetMs === null ? "" : String(marker.offsetMs)
    );
    if (marker.errorMs !== null) {
      markerGroup.setAttribute("data-error-ms", String(marker.errorMs));
    }
    markerGroup.setAttribute("aria-label", markerAccessibleLabel(marker));
    markerGroup.appendChild(
      document.createElementNS(SVG_NS, "title")
    ).textContent = markerAccessibleLabel(marker);
    markerGroup.appendChild(statusShape(marker, STATUS_COLOR[marker.status]));

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", String(marker.x + 8));
    label.setAttribute("y", String(marker.y + 4));
    label.setAttribute("fill", STATUS_COLOR[marker.status]);
    label.setAttribute("font-family", "system-ui, sans-serif");
    label.setAttribute("font-size", "11");
    label.setAttribute("font-weight", "650");
    label.textContent =
      marker.errorMs === null
        ? STATUS_COPY[marker.status]
        : signedErrorText(marker.errorMs, true);
    markerGroup.appendChild(label);
    group.appendChild(markerGroup);
  }
  overlay.appendChild(group);
  return overlay;
}

const LEGEND: readonly TapMarkerStatus[] = Object.freeze([
  "matched",
  "early",
  "late",
  "missing",
  "extra",
]);

export function TapResultNotation({
  exercise,
  result,
}: TapResultNotationProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markerVisibilityRef = useRef(true);
  const lastWidthRef = useRef(0);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [renderState, setRenderState] = useState<RenderState>("loading");
  markerVisibilityRef.current = markersVisible;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    lastWidthRef.current = 0;
    host.replaceChildren();
    setRenderState("loading");

    const draw = () => {
      if (disposed) return;
      const width = Math.floor(host.clientWidth);
      if (width < 1 || width === lastWidthRef.current) return;
      lastWidthRef.current = width;
      try {
        const rendered = renderRhythmNotation(host, exercise.pattern, {
          width,
          measuresPerRow: width < 560 ? 1 : 2,
        });
        const viewBox = rendered.svg.getAttribute("viewBox");
        const viewBoxParts = viewBox?.trim().split(/[ ,]+/);
        const naturalWidth = Number(viewBoxParts?.[2]);
        const naturalHeight = Number(viewBoxParts?.[3]);
        if (
          !viewBox ||
          !Number.isFinite(naturalWidth) ||
          naturalWidth <= 0 ||
          !Number.isFinite(naturalHeight) ||
          naturalHeight <= 0
        ) {
          throw new Error("Renderer did not return usable SVG dimensions");
        }

        // Keep the real VexFlow coordinates at natural size; narrow viewports
        // scroll rather than scaling or moving any score element.
        rendered.svg.setAttribute("width", String(naturalWidth));
        rendered.svg.setAttribute("height", String(naturalHeight));
        rendered.svg.setAttribute(
          "aria-label",
          `Ký âm gốc ${exercise.pattern.meter.numerator}/${exercise.pattern.meter.denominator}, ${exercise.pattern.measures.length} ô nhịp`
        );
        const markers = projectTapMarkers(exercise, result, rendered.geometry);
        const layer = createMarkerLayer(
          viewBox,
          naturalWidth,
          naturalHeight,
          markers,
          markerVisibilityRef.current
        );
        host.appendChild(layer);
        if (!host.contains(rendered.svg))
          host.insertBefore(rendered.svg, layer);
        else host.appendChild(layer);
        setRenderState("ready");
      } catch {
        host.replaceChildren();
        setRenderState("error");
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
  }, [exercise, result]);

  useEffect(() => {
    const group = hostRef.current?.querySelector<SVGGElement>(
      '[data-testid="tap-markers"]'
    );
    const layer = hostRef.current?.querySelector<SVGSVGElement>(
      '[data-testid="tap-marker-layer"]'
    );
    group?.setAttribute("visibility", markersVisible ? "visible" : "hidden");
    layer?.setAttribute("aria-hidden", String(!markersVisible));
  }, [markersVisible, renderState]);

  return (
    <section
      className="tap-result-notation"
      aria-label="Khuông nhạc kết quả"
      data-testid="tap-result-notation"
      style={{ color: "#312d29", fontFamily: "inherit" }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h3 style={{ fontSize: "1.05rem", margin: 0 }}>Ký âm và lần chạm</h3>
        <label
          data-testid="tap-marker-toggle"
          style={{
            alignItems: "center",
            background: "#fffaf5",
            border: "1px solid #cfc4b7",
            borderRadius: "0.55rem",
            color: "inherit",
            cursor: "pointer",
            display: "inline-flex",
            font: "inherit",
            gap: "0.5rem",
            minHeight: "2.5rem",
            padding: "0.45rem 0.8rem",
          }}
        >
          <input
            type="checkbox"
            checked={markersVisible}
            aria-label="Hiển thị marker vị trí tap"
            onChange={event => setMarkersVisible(event.currentTarget.checked)}
            style={{ accentColor: "#7654a8", height: "1rem", width: "1rem" }}
          />
          <span>Hiển thị marker vị trí tap</span>
        </label>
      </div>

      <div
        className="tap-result-notation-scroll"
        style={{ maxWidth: "100%", overflowX: "auto", overflowY: "hidden" }}
      >
        <div
          className="tap-result-notation-host"
          ref={hostRef}
          data-testid="tap-result-notation-host"
          aria-busy={renderState === "loading"}
          style={{ minWidth: "100%", position: "relative" }}
        />
      </div>

      {renderState === "loading" && (
        <p role="status" style={{ margin: "0.6rem 0" }}>
          Đang chuẩn bị khuông nhạc kết quả…
        </p>
      )}
      {renderState === "error" && (
        <p role="alert" style={{ margin: "0.6rem 0" }}>
          Chưa thể hiển thị khuông nhạc kết quả.
        </p>
      )}

      <ul
        aria-label="Chú giải trạng thái lần chạm"
        data-testid="tap-marker-legend"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.55rem 1rem",
          listStyle: "none",
          margin: "0.8rem 0 0",
          padding: 0,
        }}
      >
        {LEGEND.map(status => (
          <li
            key={status}
            data-status={status}
            style={{
              alignItems: "center",
              display: "inline-flex",
              gap: "0.4rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                background: STATUS_COLOR[status],
                borderRadius: status === "extra" ? "2px" : "50%",
                display: "inline-block",
                height: "0.62rem",
                width: "0.62rem",
              }}
            />
            <span>{STATUS_COPY[status]}</span>
          </li>
        ))}
      </ul>
      <p className="rhythm-note">
        Sai lệch trên nhãn làm tròn tới mili giây; dữ liệu chấm điểm và vị trí
        lần chạm giữ nguyên độ chính xác gốc.
      </p>
    </section>
  );
}

export default TapResultNotation;

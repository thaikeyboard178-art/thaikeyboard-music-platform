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
  early: "Chạm sớm — lệch",
  late: "Chạm muộn — lệch",
  missing: "Chưa chạm",
  extra: "Chạm thừa — lệch",
});
const STATUS_COLOR: Readonly<Record<TapMarkerStatus, string>> = Object.freeze({
  matched: "#23835a",
  early: "#c94b45",
  late: "#c94b45",
  missing: "#c94b45",
  extra: "#c94b45",
});

function timestampText(offsetMs: number): string {
  const sign = offsetMs < 0 ? "−" : "+";
  return `t ${sign}${String(Math.abs(offsetMs))} ms`;
}

function signedErrorText(errorMs: number): string {
  const sign = errorMs < 0 ? "−" : "+";
  return `Δ ${sign}${String(Math.abs(errorMs))} ms`;
}

function statusCircle(
  marker: TapMarkerProjection,
  color: string
): SVGCircleElement {
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", String(marker.x));
  circle.setAttribute("cy", String(marker.y));
  circle.setAttribute("r", "5");
  if (marker.status === "missing") {
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", color);
    circle.setAttribute("stroke-width", "2.5");
  } else {
    circle.setAttribute("fill", color);
  }
  return circle;
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
  overlay.setAttribute("role", "group");
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
    markerGroup.setAttribute("role", "img");
    markerGroup.setAttribute("data-testid", "tap-marker");
    markerGroup.setAttribute("data-status", marker.status);
    markerGroup.setAttribute("data-tick", String(marker.tick));
    markerGroup.setAttribute("data-measure", String(marker.measureIndex));
    markerGroup.setAttribute("data-x", String(marker.x));
    markerGroup.setAttribute("data-y", String(marker.y));
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
    const accessibleLabel = markerAccessibleLabel(marker);
    markerGroup.setAttribute("aria-label", accessibleLabel);
    markerGroup.appendChild(
      document.createElementNS(SVG_NS, "title")
    ).textContent = accessibleLabel;
    markerGroup.appendChild(statusCircle(marker, STATUS_COLOR[marker.status]));
    group.appendChild(markerGroup);
  }
  overlay.appendChild(group);
  return overlay;
}

const LEGEND = Object.freeze([
  { state: "matched", label: "Khớp", color: STATUS_COLOR.matched },
  { state: "misaligned", label: "Lệch", color: STATUS_COLOR.early },
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
        {LEGEND.map(item => (
          <li
            key={item.state}
            data-state={item.state}
            style={{
              alignItems: "center",
              display: "inline-flex",
              gap: "0.4rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                background: item.color,
                borderRadius: "50%",
                display: "inline-block",
                height: "0.62rem",
                width: "0.62rem",
              }}
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <p className="rhythm-note" style={{ marginTop: "0.35rem" }}>
        Vòng tròn viền đỏ: chưa chạm.
      </p>
    </section>
  );
}

export default TapResultNotation;

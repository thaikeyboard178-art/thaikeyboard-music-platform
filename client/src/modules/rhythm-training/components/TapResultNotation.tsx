import React, { useEffect, useRef, useState } from "react";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { TapRhythmExercise } from "../exercises/tapRhythm";
import type { TapRoundResult } from "../exercises/tapRoundScoring";
import { renderRhythmNotation } from "../notation/VexFlowRhythm";
import {
  projectReferenceMarkers,
  projectTapMarkers,
  type TapMarkerProjection,
  type TapMarkerStatus,
} from "../ui/tapMarkerProjection";

type TapResultNotationProps = Readonly<{
  exercise: TapRhythmExercise;
  result: TapAttemptResult | null;
  liveRounds?: readonly [TapRoundResult | null, TapRoundResult | null];
  currentRound?: 1 | 2 | null;
  isLive?: boolean;
}>;

type RenderState = "loading" | "ready" | "error";

const SVG_NS = "http://www.w3.org/2000/svg";
const OVERLAY_EXTRA_HEIGHT = 92;
const STATUS_COPY: Readonly<Record<TapMarkerStatus, string>> = Object.freeze({
  reference: "Tham chiếu — đúng vị trí mục tiêu, 100%",
  matched: "Khớp",
  early: "Chạm sớm — lệch",
  late: "Chạm muộn — lệch",
  missing: "Chưa chạm ở đầu nốt này",
  extra: "Chạm thừa — không ghép vào đầu nốt",
});
const STATUS_COLOR: Readonly<Record<TapMarkerStatus, string>> = Object.freeze({
  reference: "#7654a8",
  matched: "#23835a",
  early: "#23835a",
  late: "#23835a",
  missing: "#23835a",
  extra: "#23835a",
});

function timestampText(offsetMs: number): string {
  const sign = offsetMs < 0 ? "−" : offsetMs > 0 ? "+" : "±";
  return `t ${sign}${String(Math.abs(offsetMs))} ms`;
}

function signedErrorText(errorMs: number): string {
  const sign = errorMs < 0 ? "−" : errorMs > 0 ? "+" : "±";
  return `Δ ${sign}${String(Math.abs(errorMs))} ms`;
}

function markerShape(
  marker: TapMarkerProjection,
  color: string,
  _roundNumber: 1 | 2 | null
): SVGElement {
  if (marker.status === "reference") {
    const diamond = document.createElementNS(SVG_NS, "path");
    diamond.setAttribute(
      "d",
      `M ${marker.x} ${marker.y - 6} L ${marker.x + 6} ${marker.y} L ${marker.x} ${marker.y + 6} L ${marker.x - 6} ${marker.y} Z`
    );
    diamond.setAttribute("fill", color);
    return diamond;
  }
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", String(marker.x));
  circle.setAttribute("cy", String(marker.y));
  circle.setAttribute("r", "5");
  if (marker.status !== "matched") {
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", color);
    circle.setAttribute("stroke-width", "2.5");
    if (marker.status === "extra")
      circle.setAttribute("stroke-dasharray", "2 2");
  } else {
    circle.setAttribute("fill", color);
  }
  return circle;
}

function markerAccessibleLabel(
  marker: TapMarkerProjection,
  roundNumber: 1 | 2 | null
): string {
  const parts = [
    roundNumber === null
      ? STATUS_COPY[marker.status]
      : `Vòng ${roundNumber}, ${STATUS_COPY[marker.status]}`,
  ];
  if (marker.offsetMs !== null) parts.push(timestampText(marker.offsetMs));
  if (marker.errorMs !== null && marker.status !== "reference")
    parts.push(signedErrorText(marker.errorMs));
  return parts.join(", ");
}

function createMarkerGroup(
  markers: readonly TapMarkerProjection[],
  visible: boolean,
  label: string,
  testId: string,
  roundNumber: 1 | 2 | null
): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("data-testid", testId);
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", label);
  group.setAttribute("visibility", visible ? "visible" : "hidden");
  group.setAttribute("aria-hidden", String(!visible));
  if (roundNumber !== null)
    group.setAttribute("data-round", String(roundNumber));
  for (const marker of markers) {
    const markerGroup = document.createElementNS(SVG_NS, "g");
    markerGroup.setAttribute("role", "img");
    markerGroup.setAttribute(
      "data-testid",
      marker.status === "reference" ? "tap-reference-marker" : "tap-marker"
    );
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
    if (roundNumber !== null)
      markerGroup.setAttribute("data-round", String(roundNumber));
    if (marker.targetId !== null)
      markerGroup.setAttribute("data-target-id", marker.targetId);
    if (marker.errorMs !== null)
      markerGroup.setAttribute("data-error-ms", String(marker.errorMs));
    const accessibleLabel = markerAccessibleLabel(marker, roundNumber);
    markerGroup.setAttribute("aria-label", accessibleLabel);
    markerGroup.appendChild(
      document.createElementNS(SVG_NS, "title")
    ).textContent = accessibleLabel;
    markerGroup.appendChild(
      markerShape(marker, STATUS_COLOR[marker.status], roundNumber)
    );
    group.appendChild(markerGroup);
  }
  return group;
}

function expandedViewBox(viewBox: string): string {
  const values = viewBox.trim().split(/[ ,]+/).map(Number);
  if (values.length !== 4 || values.some(value => !Number.isFinite(value)))
    throw new Error("Renderer returned an invalid SVG viewBox.");
  return `${values[0]} ${values[1]} ${values[2]} ${values[3] + OVERLAY_EXTRA_HEIGHT}`;
}

function createMarkerLayer(
  viewBox: string,
  naturalWidth: number,
  naturalHeight: number,
  reference: readonly TapMarkerProjection[],
  round1: readonly TapMarkerProjection[],
  round2: readonly TapMarkerProjection[],
  visible: boolean
): SVGSVGElement {
  const overlay = document.createElementNS(SVG_NS, "svg");
  overlay.setAttribute("viewBox", expandedViewBox(viewBox));
  overlay.setAttribute("width", String(naturalWidth));
  overlay.setAttribute("height", String(naturalHeight + OVERLAY_EXTRA_HEIGHT));
  overlay.setAttribute("preserveAspectRatio", "xMinYMin meet");
  overlay.setAttribute("data-testid", "tap-marker-layer");
  overlay.setAttribute("role", "group");
  overlay.setAttribute(
    "aria-label",
    "Ký âm với hàng tham chiếu cố định, kết quả vòng 1 và kết quả vòng 2"
  );
  overlay.style.position = "absolute";
  overlay.style.inset = "0 auto auto 0";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "visible";

  // Reference is deliberately independent of the learner-marker visibility switch.
  overlay.appendChild(
    createMarkerGroup(
      reference,
      true,
      "Hàng 1 — Tham chiếu 100%, luôn hiển thị",
      "tap-reference-markers",
      null
    )
  );
  overlay.appendChild(
    createMarkerGroup(
      round1,
      visible,
      "Hàng 2 — Vị trí tap thực tế vòng 1",
      "tap-round-1-markers",
      1
    )
  );
  overlay.appendChild(
    createMarkerGroup(
      round2,
      visible,
      "Hàng 3 — Vị trí tap thực tế vòng 2",
      "tap-round-2-markers",
      2
    )
  );
  return overlay;
}

function roundStateText(
  round: TapRoundResult | null | undefined,
  roundNumber: 1 | 2,
  currentRound: 1 | 2 | null,
  isLive: boolean
): string {
  if (round?.status === "skipped") return "Đã bỏ qua";
  if (round?.status === "played") return "Hoàn tất";
  if (isLive && currentRound === roundNumber) return "Đang thực hiện";
  if (isLive && currentRound === null && roundNumber === 1)
    return "Sắp bắt đầu sau nhịp đếm";
  if (isLive && roundNumber === 2) return "Chưa bắt đầu";
  return "Chưa có kết quả";
}

function LegendMarker({
  color,
  shape,
  variant = "outline",
}: Readonly<{
  color: string;
  shape: "diamond" | "circle";
  variant?: "solid" | "outline" | "extra";
}>) {
  const style: React.CSSProperties = {
    background:
      shape === "diamond" || variant === "solid" ? color : "transparent",
    border:
      shape === "diamond"
        ? "none"
        : `2px ${variant === "extra" ? "dashed" : "solid"} ${color}`,
    borderRadius: shape === "circle" ? "50%" : 0,
    display: "inline-block",
    height: "0.62rem",
    transform: shape === "diamond" ? "rotate(45deg)" : undefined,
    width: "0.62rem",
  };
  return <span aria-hidden="true" style={style} />;
}

export function TapResultNotation({
  exercise,
  result,
  liveRounds,
  currentRound = null,
  isLive = false,
}: TapResultNotationProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markerVisibilityRef = useRef(true);
  const lastWidthRef = useRef(0);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [renderState, setRenderState] = useState<RenderState>("loading");
  markerVisibilityRef.current = markersVisible;
  const rounds = result?.rounds ?? liveRounds;
  const contextMatches =
    result === null ||
    (result.exerciseId === exercise.id &&
      result.targetTicks.length === exercise.targets.length &&
      result.targetTicks.every(
        (tick, index) => tick === exercise.targets[index]?.tick
      ));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;
    lastWidthRef.current = 0;
    host.replaceChildren();
    host.style.height = "auto";
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

        // Keep notation and every marker row at the same natural VexFlow X scale.
        rendered.svg.setAttribute("width", String(naturalWidth));
        rendered.svg.setAttribute("height", String(naturalHeight));
        rendered.svg.setAttribute(
          "aria-label",
          `Ký âm gốc ${exercise.pattern.meter.numerator}/${exercise.pattern.meter.denominator}, ${exercise.pattern.measures.length} ô nhịp`
        );
        const reference = projectReferenceMarkers(exercise, rendered.geometry);
        const round1 =
          contextMatches && rounds?.[0]?.status === "played"
            ? projectTapMarkers(exercise, rounds[0], rendered.geometry, 1)
            : Object.freeze([]);
        const round2 =
          contextMatches && rounds?.[1]?.status === "played"
            ? projectTapMarkers(exercise, rounds[1], rendered.geometry, 2)
            : Object.freeze([]);
        const overlay = createMarkerLayer(
          viewBox,
          naturalWidth,
          naturalHeight,
          reference,
          round1,
          round2,
          markerVisibilityRef.current
        );
        host.style.height = `${naturalHeight + OVERLAY_EXTRA_HEIGHT}px`;
        host.appendChild(overlay);
        host.insertBefore(rendered.svg, overlay);
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
  }, [contextMatches, exercise, result, rounds]);

  useEffect(() => {
    const layer = hostRef.current?.querySelector<SVGSVGElement>(
      '[data-testid="tap-marker-layer"]'
    );
    for (const id of ["tap-round-1-markers", "tap-round-2-markers"]) {
      layer
        ?.querySelector<SVGGElement>(`[data-testid="${id}"]`)
        ?.setAttribute("visibility", markersVisible ? "visible" : "hidden");
      layer
        ?.querySelector<SVGGElement>(`[data-testid="${id}"]`)
        ?.setAttribute("aria-hidden", String(!markersVisible));
    }
  }, [markersVisible, renderState]);

  return (
    <section
      className="tap-result-notation"
      aria-label="Khuông nhạc kết quả hai vòng"
      data-testid="tap-result-notation"
      style={{ color: "#312d29", fontFamily: "inherit" }}
    >
      <div className="tap-result-notation-heading">
        <h3>Ký âm và kết quả</h3>
        <label data-testid="tap-marker-toggle">
          <input
            type="checkbox"
            checked={markersVisible}
            aria-label="Hiển thị marker kết quả của hai vòng"
            onChange={event => setMarkersVisible(event.currentTarget.checked)}
          />
          <span>Hiện lần chạm</span>
        </label>
      </div>

      <ol className="tap-marker-row-legend" aria-label="Ba hàng marker">
        <li data-testid="tap-reference-row-label">
          <LegendMarker color={STATUS_COLOR.reference} shape="diamond" />
          <span>Tham chiếu</span>
        </li>
        <li data-testid="tap-round-1-row-label">
          <LegendMarker color="#23835a" shape="circle" />
          <span>
            Vòng 1 · {roundStateText(rounds?.[0], 1, currentRound, isLive)}
          </span>
        </li>
        <li data-testid="tap-round-2-row-label">
          <LegendMarker color={STATUS_COLOR.matched} shape="circle" />
          <span>
            Vòng 2 · {roundStateText(rounds?.[1], 2, currentRound, isLive)}
          </span>
        </li>
      </ol>
      {!contextMatches && (
        <p role="note" data-testid="tap-result-context-warning">
          Kết quả không khớp với bài hiện tại; không hiển thị marker của học
          viên.
        </p>
      )}

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
        className="tap-marker-status-legend"
      >
        <li>
          <LegendMarker
            color={STATUS_COLOR.matched}
            shape="circle"
            variant="solid"
          />{" "}
          Khớp
        </li>
        <li>
          <LegendMarker color={STATUS_COLOR.early} shape="circle" /> Lệch
        </li>
        <li>
          <LegendMarker
            color={STATUS_COLOR.extra}
            shape="circle"
            variant="extra"
          />{" "}
          Chạm thừa
        </li>
      </ul>
    </section>
  );
}

export default TapResultNotation;

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  ChevronRight,
  Headphones,
  Play,
  RotateCcw,
  Square,
  Volume2,
  Waves,
} from "lucide-react";
import { TrainingFooter, TrainingHeader } from "@/app/TrainingShell";
import {
  getRhythmCurriculum,
  getCurriculumUnit,
} from "../curriculum/curriculum";
import { generateRhythmPattern } from "../generation/generator";
import { policyForLevel, type RhythmFocus } from "../generation/levels";
import type { TapAttemptResult } from "../exercises/tapCompletion";
import type { RhythmMeter, RhythmTrack } from "../types";
import {
  TapTrainingController,
  type TapUiConfiguration,
  type TapUiState,
} from "../ui/TapTrainingController";
import {
  defaultTapMeter,
  FOCUS_LABELS,
  getTapFocuses,
  getTapSections,
  getTapTempoBand,
  groupingDescription,
  LEARNER_TRACK_NOTES,
  meterKey,
  pulseDescription,
  SECTION_LABELS,
  TRACK_LABELS,
  trackName,
} from "../ui/learnerConfiguration";
import { RhythmNotation } from "../components/RhythmNotation";
import { TapResultPanel } from "../components/TapResultPanel";
import { TapResultNotation } from "../components/TapResultNotation";
import { VisualMetronome } from "../components/VisualMetronome";
import "./rhythm.css";

type PageScreen = "setup" | "practice" | "result";
type PracticeStage = "mode" | "exercise";
type ReceiptChoice = "latest" | "graded";
type TapMode = "practice" | "graded";

const ACTIVE_PHASES = new Set([
  "preparing",
  "starting",
  "count-in",
  "collecting",
  "draining",
  "reference",
]);

const PHASE_COPY: Record<string, string> = {
  setup: "Chọn cấu hình bài luyện.",
  preparing: "Đang tạo bài theo curriculum…",
  ready: "Sẵn sàng — có thể nghe mẫu hoặc bắt đầu.",
  idle: "Sẵn sàng — có thể nghe mẫu hoặc bắt đầu.",
  reference: "Đang phát mẫu — bài chưa được chấm.",
  starting: "Đang mở âm thanh…",
  "count-in": "Đếm vào một ô nhịp — nghe click và chuẩn bị chạm.",
  collecting: "Đang thực hiện — chạm ở đầu mỗi nốt, giữ nhịp qua dấu lặng.",
  draining: "Đang hoàn tất bài — vui lòng chờ kết quả.",
  completed: "Đã hoàn thành — đang mở kết quả.",
  aborted: "Bài chưa được chấm — đây không phải lỗi của bạn.",
  empty: "Bài không có onset cần thực hiện.",
  error: "Chưa thể mở bài. Hãy kiểm tra cấu hình và thử lại.",
  disposed: "Đã đóng bài luyện.",
};

function defaultTempo(track: RhythmTrack, meter: RhythmMeter): number {
  const generated = generateRhythmPattern({
    level: track,
    seed: `rhythm-ui-setup-default-${String(track)}-${meterKey(meter)}`,
    meter,
    bars: 2,
    focus: policyForLevel(track).defaultFocus,
  });
  return generated.tempo.pulseBpm;
}

function isFinalReceipt(
  receipt: TapAttemptResult | null,
  phase: string
): receipt is TapAttemptResult {
  return (
    receipt !== null &&
    (receipt.status === "completed" || receipt.status === "technical-abort") &&
    (phase === "completed" || phase === "aborted")
  );
}

export default function RhythmTrainingPage() {
  const tapRef = useRef<HTMLDivElement>(null);
  const [controller] = useState(
    () => new TapTrainingController({ getInputTarget: () => tapRef.current })
  );
  const subscribe = useCallback(
    (notify: () => void) => controller.subscribe(notify),
    [controller]
  );
  const getSnapshot = useCallback(() => controller.getSnapshot(), [controller]);
  const view = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [track, setTrack] = useState<RhythmTrack>(3);
  const [selectedMeter, setSelectedMeter] = useState(() =>
    meterKey(defaultTapMeter(3))
  );
  const [bars, setBars] = useState<1 | 2 | 4>(2);
  const [focus, setFocus] = useState<RhythmFocus>(
    policyForLevel(3).defaultFocus
  );
  const [tempo, setTempo] = useState(() => defaultTempo(3, defaultTapMeter(3)));
  const [tempoInput, setTempoInput] = useState(() =>
    String(defaultTempo(3, defaultTapMeter(3)))
  );
  const [screen, setScreen] = useState<PageScreen>("setup");
  const [practiceStage, setPracticeStage] = useState<PracticeStage>("mode");
  const [notationReady, setNotationReady] = useState(false);
  const [tapFlash, setTapFlash] = useState(false);
  const [metronomeVolume, setMetronomeVolume] = useState(() =>
    controller.getMetronomeVolume()
  );
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [receiptChoice, setReceiptChoice] = useState<ReceiptChoice>("latest");
  const screenRef = useRef<PageScreen>(screen);
  const phaseRef = useRef(view.phase);
  const latestAutoReceipt = useRef<TapAttemptResult | null>(null);
  const mountToken = useRef(0);
  const historyKey = useRef(
    `rhythm-training-${Math.random().toString(36).slice(2)}`
  );

  screenRef.current = screen;
  phaseRef.current = view.phase;

  const unit = getCurriculumUnit(track);
  const meter =
    unit.allowedMeters.find(item => meterKey(item) === selectedMeter) ??
    unit.allowedMeters[0];
  const band = getTapTempoBand(track, meter);
  const focuses = getTapFocuses(track, meter);
  const active = ACTIVE_PHASES.has(view.phase);
  const locked = active || view.busy;
  const hasExercise = view.exercise !== null;
  const configuration: TapUiConfiguration = {
    track,
    section: "practice",
    meter,
    bars,
    focus,
    pulseBpm: tempo,
  };
  const finalLatestReceipt = isFinalReceipt(view.result, view.phase)
    ? view.result
    : null;
  const selectedReceipt =
    receiptChoice === "graded" && view.gradedResult
      ? view.gradedResult
      : finalLatestReceipt;
  const showResult = screen === "result" && selectedReceipt !== null;
  const canStart = hasExercise && notationReady && controller.canStart;
  const screenTransitionBlocked = active;

  useEffect(() => {
    const token = ++mountToken.current;
    return () => {
      // Effect replay in React StrictMode must not dispose a remounted controller.
      queueMicrotask(() => {
        if (mountToken.current === token) void controller.dispose();
      });
    };
  }, [controller]);

  useEffect(() => {
    if (view.tapVisualSequence === 0) return;
    setTapFlash(true);
    const id = globalThis.setTimeout(() => setTapFlash(false), 140);
    return () => globalThis.clearTimeout(id);
  }, [view.tapVisualSequence]);

  useEffect(() => {
    if (view.phase === "empty") setPracticeStage("exercise");
  }, [view.phase]);

  useEffect(() => {
    if (!view.result || !isFinalReceipt(view.result, view.phase)) return;
    if (latestAutoReceipt.current === view.result) return;
    latestAutoReceipt.current = view.result;
    setReceiptChoice("latest");
    setScreen("result");
    screenRef.current = "result";
    const current = window.history.state ?? {};
    window.history.pushState(
      {
        ...current,
        rhythmTrainingKey: historyKey.current,
        rhythmTrainingScreen: "result",
      },
      "",
      window.location.href
    );
  }, [view.phase, view.result]);

  useEffect(() => {
    const current = window.history.state ?? {};
    if (current.rhythmTrainingKey !== historyKey.current) {
      window.history.replaceState(
        {
          ...current,
          rhythmTrainingKey: historyKey.current,
          rhythmTrainingScreen: "setup",
        },
        "",
        window.location.href
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      if (ACTIVE_PHASES.has(phaseRef.current)) {
        const latest = window.history.state ?? {};
        window.history.pushState(
          {
            ...latest,
            rhythmTrainingKey: historyKey.current,
            rhythmTrainingScreen: screenRef.current,
          },
          "",
          window.location.href
        );
        return;
      }
      const nextScreen =
        event.state?.rhythmTrainingKey === historyKey.current &&
        ["setup", "practice", "result"].includes(
          event.state.rhythmTrainingScreen
        )
          ? (event.state.rhythmTrainingScreen as PageScreen)
          : "setup";
      if (
        nextScreen === "result" &&
        !isFinalReceipt(view.result, phaseRef.current)
      ) {
        const safeScreen = view.exercise ? "practice" : "setup";
        screenRef.current = safeScreen;
        setScreen(safeScreen);
        return;
      }
      screenRef.current = nextScreen;
      setScreen(nextScreen);
      if (nextScreen === "result") setReceiptChoice("latest");
      if (nextScreen === "practice" && view.exercise)
        setPracticeStage("exercise");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [view.exercise, view.result]);

  useEffect(() => {
    if (!previewing) return;
    return () => controller.stopPreview();
  }, [controller, previewing]);

  function transitionTo(next: PageScreen) {
    if (screenTransitionBlocked) return;
    screenRef.current = next;
    setScreen(next);
    const current = window.history.state ?? {};
    window.history.pushState(
      {
        ...current,
        rhythmTrainingKey: historyKey.current,
        rhythmTrainingScreen: next,
      },
      "",
      window.location.href
    );
  }

  function selectTrack(next: RhythmTrack) {
    if (locked || getTapSections(next).length === 0) return;
    const nextMeter = defaultTapMeter(next);
    setTrack(next);
    setSelectedMeter(meterKey(nextMeter));
    setFocus(policyForLevel(next).defaultFocus);
    const nextTempo = defaultTempo(next, nextMeter);
    setTempo(nextTempo);
    setTempoInput(String(nextTempo));
  }

  function selectMeter(key: string) {
    const next = unit.allowedMeters.find(item => meterKey(item) === key);
    if (!next || locked) return;
    setSelectedMeter(key);
    const nextTempo = defaultTempo(track, next);
    setTempo(nextTempo);
    setTempoInput(String(nextTempo));
    if (!getTapFocuses(track, next).includes(focus))
      setFocus(policyForLevel(track).defaultFocus);
  }

  function setTempoWithinBand(nextTempo: number) {
    if (
      !Number.isInteger(nextTempo) ||
      nextTempo < band.min ||
      nextTempo > band.max
    )
      return;
    setTempo(nextTempo);
    setTempoInput(String(nextTempo));
  }

  function changeTempoInput(raw: string) {
    setTempoInput(raw);
    if (!/^\d+$/.test(raw)) return;
    const nextTempo = Number(raw);
    if (
      Number.isInteger(nextTempo) &&
      nextTempo >= band.min &&
      nextTempo <= band.max
    )
      setTempo(nextTempo);
  }

  async function openExercise() {
    if (locked || getTapSections(track).length === 0) return;
    setNotationReady(false);
    setPracticeStage("mode");
    transitionTo("practice");
    await controller.prepare(configuration);
  }

  async function reopenExercise() {
    if (locked) return;
    setNotationReady(false);
    setPracticeStage("mode");
    await controller.prepare(configuration);
  }

  async function start() {
    if (!canStart) return;
    tapRef.current?.focus({ preventScroll: true });
    await controller.start();
    tapRef.current?.focus({ preventScroll: true });
  }

  async function retry() {
    if (locked || !notationReady) return;
    controller.chooseMode("practice");
    setPracticeStage("exercise");
    transitionTo("practice");
    tapRef.current?.focus({ preventScroll: true });
    await controller.retry();
    tapRef.current?.focus({ preventScroll: true });
  }

  async function nextExercise() {
    if (locked) return;
    setNotationReady(false);
    setPracticeStage("mode");
    transitionTo("practice");
    await controller.continue();
  }

  function chooseMode(next: TapMode) {
    if (locked || !view.exercise) return;
    controller.chooseMode(next);
    setPracticeStage("exercise");
  }

  async function playPreview() {
    if (previewing) {
      controller.stopPreview();
      setPreviewing(false);
      return;
    }
    setPreviewError(null);
    setPreviewing(true);
    try {
      await controller.previewMetronome(configuration);
    } catch {
      setPreviewError("Không thể phát metronome thử trên thiết bị này.");
    } finally {
      setPreviewing(false);
    }
  }

  function showReceipt(choice: ReceiptChoice) {
    if (choice === "graded" && !view.gradedResult) return;
    setReceiptChoice(choice);
    transitionTo("result");
  }

  function returnToPractice() {
    if (screenTransitionBlocked) return;
    setPracticeStage("exercise");
    transitionTo("practice");
  }

  return (
    <div className="training-app rhythm-page">
      <TrainingHeader currentModuleId="rhythm-training" />
      <main className="module-main rhythm-main">
        <div className="module-breadcrumb">
          <Link href="/">Trang chủ</Link>
          <ChevronRight size={12} />
          <span>Luyện tiết tấu</span>
        </div>
        <div className="module-heading-row rhythm-heading">
          <div>
            <span className="module-kicker">RHYTHM TRAINING · TAP RHYTHM</span>
            <h1>Luyện tiết tấu</h1>
            <p>Nhìn ký âm. Nghe nhịp. Chạm đúng lúc bắt đầu mỗi nốt.</p>
          </div>
          <span className="free-pill">
            <Waves size={13} /> Không cần tài khoản · Không lưu tiến trình
          </span>
        </div>

        <section
          className="rhythm-screen rhythm-setup-screen"
          data-testid="screen-setup"
          data-screen="setup"
          aria-labelledby="rhythm-setup-title"
          hidden={screen !== "setup"}
        >
          <div className="rhythm-screen-heading">
            <div>
              <span className="module-kicker">MÀN HÌNH 1 · THIẾT LẬP</span>
              <h2 id="rhythm-setup-title">Chọn bài tập của bạn</h2>
              <p>Chọn cấp độ, nhịp, nội dung luyện, số ô nhịp và tempo.</p>
            </div>
            <span className="rhythm-note">Tap Rhythm bắt đầu từ Level 3</span>
          </div>

          <div className="rhythm-tracks" aria-label="Cấp độ Tap Rhythm">
            {getRhythmCurriculum().map(item => {
              const allowed = getTapSections(item.track).length > 0;
              return (
                <button
                  key={String(item.track)}
                  type="button"
                  disabled={!allowed || locked}
                  aria-pressed={track === item.track}
                  className={`rhythm-track ${track === item.track ? "is-selected" : ""}`}
                  onClick={() => selectTrack(item.track)}
                  aria-label={`${trackName(item.track)} — ${TRACK_LABELS[item.track]}${allowed ? "" : " — chưa có Tap"}`}
                >
                  <strong>
                    {trackName(item.track)}
                    {item.optional ? " · tùy chọn" : ""}
                  </strong>
                  <span>{TRACK_LABELS[item.track]}</span>
                  {!allowed && <small>Chưa có Tap · nhận diện và nghe</small>}
                </button>
              );
            })}
          </div>

          <div className="rhythm-form">
            <label>
              Nhịp
              <select
                aria-label="Nhịp"
                value={selectedMeter}
                disabled={locked}
                onChange={event => selectMeter(event.target.value)}
              >
                {unit.allowedMeters.map(value => (
                  <option key={meterKey(value)} value={meterKey(value)}>
                    {meterKey(value)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nội dung luyện
              <select
                aria-label="Nội dung luyện"
                value={focus}
                disabled={locked}
                onChange={event => setFocus(event.target.value as RhythmFocus)}
              >
                {focuses.map(value => (
                  <option key={value} value={value}>
                    {FOCUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Độ dài
              <select
                aria-label="Độ dài"
                value={bars}
                disabled={locked}
                onChange={event =>
                  setBars(Number(event.target.value) as 1 | 2 | 4)
                }
              >
                <option value={1}>1 ô nhịp</option>
                <option value={2}>2 ô nhịp</option>
                <option value={4}>4 ô nhịp</option>
              </select>
            </label>
          </div>

          <section
            className="rhythm-tempo-control"
            aria-labelledby="tempo-heading"
          >
            <div className="rhythm-tempo-heading">
              <div>
                <span className="module-kicker">
                  TEMPO · {band.min}–{band.max} BPM
                </span>
                <h3 id="tempo-heading">Tốc độ theo phách</h3>
                <p>
                  {pulseDescription(meter)} · {groupingDescription(meter)}
                </p>
              </div>
              <output
                className="rhythm-tempo-value"
                htmlFor="rhythm-tempo-range"
              >
                <strong>{tempo}</strong>
                <span>BPM</span>
              </output>
            </div>
            <div className="rhythm-tempo-row">
              <button
                type="button"
                className="rhythm-stepper"
                aria-label="Giảm tempo"
                disabled={locked || tempo <= band.min}
                onClick={() => setTempoWithinBand(tempo - 1)}
              >
                −
              </button>
              <input
                id="rhythm-tempo-range"
                aria-label="Tempo (BPM)"
                type="range"
                min={band.min}
                max={band.max}
                step={1}
                value={tempo}
                disabled={locked}
                onChange={event =>
                  setTempoWithinBand(Number(event.target.value))
                }
              />
              <button
                type="button"
                className="rhythm-stepper"
                aria-label="Tăng tempo"
                disabled={locked || tempo >= band.max}
                onClick={() => setTempoWithinBand(tempo + 1)}
              >
                +
              </button>
              <label className="rhythm-bpm-input-label">
                BPM
                <input
                  aria-label="Nhập tempo BPM"
                  type="number"
                  inputMode="numeric"
                  min={band.min}
                  max={band.max}
                  step={1}
                  value={tempoInput}
                  disabled={locked}
                  onChange={event => changeTempoInput(event.target.value)}
                />
              </label>
            </div>
            <p className="rhythm-tempo-hint">
              Tempo dùng cùng một giá trị cho ký âm, reference, metronome và bài
              tập.
            </p>
          </section>

          <div className="rhythm-setup-actions">
            <button
              type="button"
              className="rhythm-secondary"
              onClick={() => void playPreview()}
              disabled={locked}
              aria-pressed={previewing}
            >
              <Headphones size={16} />
              {previewing ? "Dừng nghe thử" : "Nghe thử metronome"}
            </button>
            <button
              type="button"
              className="rhythm-primary"
              onClick={() => void openExercise()}
              disabled={locked || getTapSections(track).length === 0}
            >
              Áp dụng và mở bài <ArrowRight size={16} />
            </button>
          </div>
          {previewError && (
            <p className="rhythm-error" role="alert">
              {previewError}
            </p>
          )}
          <p className="rhythm-note">{LEARNER_TRACK_NOTES[track]}</p>
          {track === "bonus" && (
            <p className="rhythm-note">
              Bonus 2/2 là luyện tập tùy chọn, không phải điều kiện hoàn thành
              các Level chính.
            </p>
          )}
        </section>

        <section
          className="rhythm-screen rhythm-practice-screen"
          data-testid="screen-practice"
          data-screen="practice"
          aria-labelledby="rhythm-practice-title"
          hidden={screen !== "practice"}
        >
          <div className="rhythm-screen-heading">
            <div>
              <span className="module-kicker">MÀN HÌNH 2 · THỰC HÀNH</span>
              <h2 id="rhythm-practice-title">
                {hasExercise ? "Bài tập tiết tấu" : "Đang mở bài tập"}
              </h2>
            </div>
            {hasExercise && (
              <button
                type="button"
                className="rhythm-tertiary"
                onClick={() => transitionTo("setup")}
                disabled={locked}
              >
                Đổi bài
              </button>
            )}
          </div>

          {view.phase === "preparing" && (
            <div className="rhythm-loading" role="status">
              Đang tạo bài và mở ký âm…
            </div>
          )}
          {view.error && (
            <div className="rhythm-error-card" role="alert">
              <strong>
                {view.phase === "aborted"
                  ? "Bài chưa được chấm"
                  : "Chưa thể mở bài"}
              </strong>
              <p>{view.error}</p>
              <button
                className="rhythm-secondary"
                type="button"
                disabled={locked}
                onClick={() => void reopenExercise()}
              >
                {hasExercise ? "Mở bài mới" : "Thử mở lại"}
              </button>
            </div>
          )}
          {!hasExercise && view.phase !== "preparing" && !view.error && (
            <div className="rhythm-intro">
              <Headphones size={22} />
              <h3>Chuẩn bị trước khi chạm</h3>
              <p>
                Chọn Chơi thử để luyện không ghi điểm, hoặc Chấm điểm để thực
                hiện một lượt được chấm theo chính sách hiện hành.
              </p>
            </div>
          )}

          {view.exercise &&
            practiceStage === "mode" &&
            view.phase !== "empty" && (
              <div
                className="rhythm-mode-chooser"
                aria-label="Chọn chế độ thực hành"
                data-testid="practice-mode-chooser"
              >
                <div>
                  <span className="module-kicker">CHỌN CÁCH THỰC HIỆN</span>
                  <h3>Bạn muốn chơi thử hay chấm điểm?</h3>
                  <p>
                    Hai chế độ dùng cùng bài tập. Chơi thử không tạo answer hay
                    điểm chính thức.
                  </p>
                </div>
                <div className="rhythm-mode-options">
                  <button
                    type="button"
                    className="rhythm-mode-card"
                    aria-label="Chơi thử"
                    onClick={() => chooseMode("practice")}
                    disabled={locked}
                  >
                    <span className="rhythm-mode-icon">
                      <RotateCcw size={19} />
                    </span>
                    <strong>Chơi thử</strong>
                    <span>
                      Luyện lại, nghe reference và xem Timing Accuracy tham
                      khảo. Không cộng điểm.
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rhythm-mode-card is-graded"
                    aria-label="Chấm điểm"
                    onClick={() => chooseMode("graded")}
                    disabled={
                      locked ||
                      (view.gradedResult !== null &&
                        view.gradedResult.status === "completed")
                    }
                  >
                    <span className="rhythm-mode-icon">
                      <Play size={19} />
                    </span>
                    <strong>Chấm điểm</strong>
                    <span>
                      Một lượt chấm cho bài này. Đúng +10, sai +0; lượt dừng do
                      kỹ thuật không ghi điểm.
                    </span>
                  </button>
                </div>
              </div>
            )}

          {view.exercise && (
            <section
              className={`rhythm-workspace-shell ${practiceStage !== "exercise" ? "is-mode-choice" : ""}`}
              aria-label="Bài tập Tap Rhythm"
              data-exercise-id={view.exercise.id}
              data-track={view.exercise.track}
              data-section={view.exercise.section}
              data-testid="rhythm-workspace"
              hidden={practiceStage !== "exercise"}
            >
              <ExerciseMetadata view={view} />
              <RhythmNotation
                pattern={view.exercise.pattern}
                onReady={setNotationReady}
              />
              <VisualMetronome
                meter={view.exercise.pattern.meter}
                pulseBpm={view.exercise.pattern.tempo.pulseBpm}
                readPlayback={() => controller.getAudioPlayback()}
              />
              <div
                className={`rhythm-status phase-${view.phase}`}
                role="status"
                aria-live="polite"
                data-testid="rhythm-status"
                data-phase={view.phase}
              >
                {PHASE_COPY[view.phase] ?? "Đang chuẩn bị bài luyện…"}
                {view.selectedMode && (
                  <span>
                    {" "}
                    · Chế độ:{" "}
                    {view.selectedMode === "practice"
                      ? "Chơi thử"
                      : "Chấm điểm"}
                  </span>
                )}
                {view.practice && <span> · Lượt này không ghi thêm điểm</span>}
              </div>
              <div className="rhythm-controls">
                <button
                  type="button"
                  className="rhythm-primary"
                  onClick={() => void start()}
                  disabled={!canStart || locked}
                >
                  <Play size={16} /> Bắt đầu
                </button>
                <button
                  type="button"
                  className="rhythm-secondary"
                  onClick={() => void controller.reference()}
                  disabled={!controller.canReference || locked}
                >
                  <Headphones size={16} />
                  {view.referenceUsed
                    ? "Đã nghe mẫu (1/1)"
                    : "Nghe mẫu (1 lần)"}
                </button>
                {!locked && view.phase !== "preparing" && (
                  <button
                    type="button"
                    className="rhythm-secondary"
                    onClick={() => setPracticeStage("mode")}
                  >
                    Đổi chế độ
                  </button>
                )}
                {active && (
                  <button
                    type="button"
                    className="rhythm-secondary"
                    onClick={() => controller.stop()}
                  >
                    <Square size={14} /> Dừng — không chấm
                  </button>
                )}
              </div>
              <label className="rhythm-volume-control">
                <Volume2 size={16} />
                <span>Âm lượng metronome</span>
                <input
                  type="range"
                  aria-label="Âm lượng metronome"
                  min="0"
                  max="1"
                  step="0.01"
                  value={metronomeVolume}
                  onChange={event => {
                    const next = Number(event.target.value);
                    setMetronomeVolume(next);
                    controller.setMetronomeVolume(next);
                  }}
                  disabled={
                    view.phase === "collecting" || view.phase === "draining"
                  }
                />
                <output>{Math.round(metronomeVolume * 100)}%</output>
              </label>

              <div
                ref={tapRef}
                role="button"
                tabIndex={0}
                aria-label="Vùng chạm tiết tấu — chạm hoặc ấn Space"
                aria-disabled={
                  !["count-in", "collecting", "draining"].includes(view.phase)
                }
                aria-describedby="rhythm-tap-help"
                className={`rhythm-tap-surface ${["count-in", "collecting", "draining"].includes(view.phase) ? "is-active" : ""} ${tapFlash ? "is-tapped" : ""}`}
                data-testid="rhythm-tap-surface"
                onPointerDown={event => {
                  if (event.isPrimary) controller.acknowledgeTap();
                }}
                onKeyDown={event => {
                  if (event.code === "Space" || event.key === " ") {
                    event.preventDefault();
                    if (!event.repeat) controller.acknowledgeTap();
                  }
                }}
              >
                <Waves size={35} aria-hidden="true" />
                <strong>{tapFlash ? "Vừa chạm" : "Chạm ở đây"}</strong>
                <span>Hoặc ấn Space khi vùng chạm được chọn</span>
                <small>
                  {view.tapVisualSequence > 0
                    ? `Tín hiệu chạm hiển thị: ${view.tapVisualSequence} · chấm sau khi hoàn tất`
                    : "Chạm một lần ở đầu mỗi nốt · không cần giữ"}
                </small>
              </div>
              <p id="rhythm-tap-help" className="rhythm-tap-help">
                Tín hiệu chạm chỉ xác nhận thao tác, chưa phải đúng/sai. Engine
                chấm sau khi bài hoàn tất; không cộng điểm theo từng tap.
              </p>
              {view.phase === "empty" && (
                <div className="rhythm-error-card" role="status">
                  <strong>Không có onset cần chạm</strong>
                  <p>
                    Timing Accuracy không áp dụng. Bài này không tạo câu trả lời
                    hoặc điểm.
                  </p>
                  <button
                    type="button"
                    className="rhythm-secondary"
                    onClick={() => void nextExercise()}
                    disabled={locked}
                  >
                    Mở bài khác
                  </button>
                </div>
              )}
              {finalLatestReceipt && (
                <div className="rhythm-receipt-return" role="note">
                  <span>Kết quả gần nhất vẫn được giữ nguyên.</span>
                  <button
                    type="button"
                    className="rhythm-tertiary"
                    onClick={() => showReceipt("latest")}
                  >
                    Xem kết quả
                  </button>
                  {view.gradedResult &&
                    view.gradedResult !== finalLatestReceipt && (
                      <button
                        type="button"
                        className="rhythm-tertiary"
                        onClick={() => showReceipt("graded")}
                      >
                        Xem kết quả chấm
                      </button>
                    )}
                </div>
              )}
            </section>
          )}

          {!hasExercise &&
            view.error === null &&
            view.phase !== "preparing" && (
              <p className="rhythm-note">
                Hiện chỉ mở giao diện Tap Rhythm; các kind khác vẫn giữ trong
                curriculum.
              </p>
            )}
        </section>

        <section
          className="rhythm-screen rhythm-result-screen"
          data-testid="screen-result"
          data-screen="result"
          aria-labelledby="rhythm-result-screen-title"
          hidden={!showResult}
        >
          {selectedReceipt && view.exercise && (
            <>
              <div className="rhythm-screen-heading">
                <div>
                  <span className="module-kicker">MÀN HÌNH 3 · KẾT QUẢ</span>
                  <h2 id="rhythm-result-screen-title">
                    {selectedReceipt.status === "technical-abort"
                      ? "Lượt chưa được chấm"
                      : "Kết quả lượt gõ nhịp"}
                  </h2>
                  <p>
                    Phản hồi của lượt đã hoàn tất; nội dung bài gốc không bị
                    thay đổi.
                  </p>
                </div>
              </div>
              <TapResultPanel
                result={selectedReceipt}
                points={
                  selectedReceipt.mode === "graded"
                    ? (view.originalPoints ?? view.points)
                    : view.points
                }
                originalPoints={view.originalPoints}
                onRetry={() => void retry()}
                onContinue={() => void nextExercise()}
                busy={locked || !notationReady}
                retryLabel="Chơi lại"
                continueLabel="Bài tiếp theo"
                practiceLabel="Chơi thử — Timing Accuracy tham khảo, không ghi điểm"
              />
              <TapResultNotation
                exercise={view.exercise}
                result={selectedReceipt}
              />
              {view.gradedResult && selectedReceipt !== view.gradedResult && (
                <button
                  type="button"
                  className="rhythm-secondary"
                  onClick={() => showReceipt("graded")}
                >
                  Xem kết quả chấm
                </button>
              )}
              {view.result &&
                selectedReceipt === view.gradedResult &&
                view.result !== view.gradedResult && (
                  <button
                    type="button"
                    className="rhythm-secondary"
                    onClick={() => showReceipt("latest")}
                  >
                    Xem lượt gần nhất
                  </button>
                )}
              {selectedReceipt.mode === "practice" &&
                selectedReceipt.status === "completed" &&
                view.gradedResult === null && (
                  <button
                    type="button"
                    className="rhythm-secondary"
                    onClick={() => {
                      controller.chooseMode("graded");
                      setPracticeStage("exercise");
                      transitionTo("practice");
                    }}
                    disabled={locked}
                  >
                    Chấm điểm bài này
                  </button>
                )}
              <div className="rhythm-result-navigation">
                <button
                  type="button"
                  className="rhythm-secondary"
                  onClick={returnToPractice}
                >
                  Quay lại practice
                </button>
                <button
                  type="button"
                  className="rhythm-tertiary"
                  onClick={() => transitionTo("setup")}
                >
                  Đổi bài
                </button>
              </div>
            </>
          )}
        </section>

        <TrainingFooter />
      </main>
    </div>
  );
}

function ExerciseMetadata({ view }: { view: TapUiState }) {
  const exercise = view.exercise;
  if (!exercise) return null;
  return (
    <div className="rhythm-meta">
      <div>
        <span className="module-kicker">
          {trackName(exercise.track)} · {SECTION_LABELS[exercise.section]} ·
          Lượt {view.trialNumber}
        </span>
        <h2>
          Nhịp {meterKey(exercise.pattern.meter)}{" "}
          <small>· {exercise.pattern.measures.length} ô nhịp</small>
        </h2>
        <p>{pulseDescription(exercise.pattern.meter)}</p>
        <p>{groupingDescription(exercise.pattern.meter)}</p>
      </div>
      <span className="rhythm-tempo">
        <strong>{exercise.pattern.tempo.pulseBpm}</strong>
        <small>BPM theo phách</small>
      </span>
    </div>
  );
}

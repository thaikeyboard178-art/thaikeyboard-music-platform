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
  Square,
  Waves,
} from "lucide-react";
import { TrainingHeader, TrainingFooter } from "@/app/TrainingShell";
import {
  getRhythmCurriculum,
  getCurriculumUnit,
  type CurriculumSection,
} from "../curriculum/curriculum";
import { policyForLevel, type RhythmFocus } from "../generation/levels";
import type { RhythmTrack } from "../types";
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
import "./rhythm.css";

const ACTIVE_PHASES = new Set([
  "starting",
  "count-in",
  "collecting",
  "draining",
  "reference",
  "preparing",
]);
const PHASE_COPY: Record<string, string> = {
  setup: "Chọn cấp độ và mở một bài Tap Rhythm.",
  preparing: "Đang tạo bài theo curriculum…",
  ready: "Sẵn sàng — có thể nghe mẫu một lần hoặc bắt đầu.",
  idle: "Sẵn sàng — có thể nghe mẫu một lần hoặc bắt đầu.",
  reference: "Đang phát mẫu — chỉ nghe, bài chưa được chấm.",
  starting: "Đang mở âm thanh…",
  "count-in": "Đếm vào 1 ô nhịp — nghe click và chuẩn bị chạm.",
  collecting: "Đang luyện — chạm ở đầu mỗi nốt, giữ nhịp qua dấu lặng.",
  draining: "Đang hoàn tất bài — vui lòng chờ kết quả.",
  completed: "Đã hoàn thành — xem phản hồi bên dưới.",
  aborted: "Bài chưa được chấm — đây không phải lỗi của bạn.",
  empty: "Bài không có onset cần thực hiện. Không chấm điểm bài này.",
  error: "Chưa thể mở bài. Hãy kiểm tra cấu hình và thử lại.",
  disposed: "Đã đóng bài luyện.",
};

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
  const [section, setSection] = useState<CurriculumSection>("practice");
  const [selectedMeter, setSelectedMeter] = useState(() =>
    meterKey(defaultTapMeter(3))
  );
  const [bars, setBars] = useState<1 | 2>(1);
  const [focus, setFocus] = useState<RhythmFocus>(
    policyForLevel(3).defaultFocus
  );
  const [tempo, setTempo] = useState("default");
  const [notationReady, setNotationReady] = useState(false);
  const [tapFlash, setTapFlash] = useState(false);
  const mountToken = useRef(0);

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

  const unit = getCurriculumUnit(track);
  const meter =
    unit.allowedMeters.find(item => meterKey(item) === selectedMeter) ??
    unit.allowedMeters[0];
  const band = getTapTempoBand(track, meter);
  const focuses = getTapFocuses(track, meter);
  const active = ACTIVE_PHASES.has(view.phase);
  const locked = active || view.busy;
  const hasExercise = view.exercise !== null;
  const canStart =
    hasExercise && notationReady && !locked && controller.canStart;
  const configuration: TapUiConfiguration = {
    track,
    section,
    meter,
    bars,
    focus,
    ...(tempo === "default" ? {} : { pulseBpm: Number(tempo) }),
  };

  function selectTrack(next: RhythmTrack) {
    if (locked || getTapSections(next).length === 0) return;
    setTrack(next);
    setSection("practice");
    setSelectedMeter(meterKey(defaultTapMeter(next)));
    setFocus(policyForLevel(next).defaultFocus);
    setTempo("default");
  }
  function selectMeter(key: string) {
    const next = unit.allowedMeters.find(item => meterKey(item) === key);
    if (!next || locked) return;
    setSelectedMeter(key);
    setTempo("default");
    if (!getTapFocuses(track, next).includes(focus))
      setFocus(policyForLevel(track).defaultFocus);
  }
  async function prepare() {
    if (locked) return;
    setNotationReady(false);
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
    tapRef.current?.focus({ preventScroll: true });
    await controller.retry();
    tapRef.current?.focus({ preventScroll: true });
  }
  async function nextExercise() {
    if (locked) return;
    setNotationReady(false);
    await controller.continue();
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

        <section className="rhythm-setup" aria-labelledby="rhythm-setup-title">
          <div className="rhythm-setup-heading">
            <div>
              <span className="module-kicker">CHỌN BÀI LUYỆN</span>
              <h2 id="rhythm-setup-title">
                Đi từ phách đơn đến tổ hợp nâng cao
              </h2>
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
              Phần học
              <select
                aria-label="Phần học"
                value={section}
                disabled={locked}
                onChange={event =>
                  setSection(event.target.value as CurriculumSection)
                }
              >
                {getTapSections(track).map(value => (
                  <option key={value} value={value}>
                    {SECTION_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
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
                onChange={event => setBars(Number(event.target.value) as 1 | 2)}
              >
                <option value={1}>1 ô nhịp</option>
                <option value={2}>2 ô nhịp</option>
              </select>
            </label>
            <label>
              Tốc độ theo phách
              <select
                aria-label="Tốc độ theo phách"
                value={tempo}
                disabled={locked}
                onChange={event => setTempo(event.target.value)}
              >
                <option value="default">Theo cấp độ</option>
                <option value={band.min}>Chậm · {band.min} BPM</option>
                <option value={band.max}>Nhanh · {band.max} BPM</option>
              </select>
            </label>
            <button
              type="button"
              className="rhythm-primary"
              onClick={() => void prepare()}
              disabled={locked}
            >
              {hasExercise ? "Áp dụng và mở bài mới" : "Mở bài Tap Rhythm"}
              <ArrowRight size={16} />
            </button>
          </div>
          <p className="rhythm-note">{LEARNER_TRACK_NOTES[track]}</p>
          {section === "lessons" && (
            <p className="rhythm-note">
              Bài học là ví dụ thực hành không chấm điểm. Bạn có thể nghe mẫu,
              chạm thử và xem phản hồi; không ghi câu trả lời chấm điểm hoặc
              cộng +10/+0.
            </p>
          )}
          {section === "assessment" && (
            <p className="rhythm-note">
              Đây là một bài Tap riêng theo placement đã duyệt, không phải bộ
              Assessment tổng hợp hoặc quota hoàn thành Level.
            </p>
          )}
          {track === "bonus" && (
            <p className="rhythm-note">
              Bonus 2/2 là luyện tập tùy chọn, không phải điều kiện hoàn thành
              các Level chính.
            </p>
          )}
        </section>

        {view.phase === "preparing" && (
          <div className="rhythm-loading" role="status">
            Đang tạo bài và mở ký âm…
          </div>
        )}
        {view.error && (
          <div className="rhythm-error" role="alert">
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
              onClick={() => void prepare()}
            >
              {hasExercise ? "Mở bài mới" : "Thử mở lại"}
            </button>
          </div>
        )}
        {!hasExercise && view.phase !== "preparing" && !view.error && (
          <section className="rhythm-intro">
            <Headphones size={24} />
            <h2>Chuẩn bị trước khi chạm</h2>
            <p>
              Chọn bài rồi nghe mẫu tối đa một lần. Khi bắt đầu, ứng dụng đếm
              vào một ô nhịp và giữ metronome liên tục. Chạm ở đầu nốt; không
              chạm dấu lặng hoặc nốt nối tiếp.
            </p>
            <p className="rhythm-note">
              Hiện mở giao diện Tap Rhythm. Các kind còn lại vẫn giữ trong
              curriculum, chưa được giả lập thành chức năng UI ở giai đoạn này.
            </p>
          </section>
        )}

        {view.exercise && (
          <div className="rhythm-layout">
            <section
              className="rhythm-workspace"
              aria-label="Bài tập Tap Rhythm"
              data-exercise-id={view.exercise.id}
              data-track={view.exercise.track}
              data-section={view.exercise.section}
            >
              <ExerciseMetadata view={view} />
              <RhythmNotation
                pattern={view.exercise.pattern}
                onReady={setNotationReady}
              />
              <div
                className={`rhythm-status phase-${view.phase}`}
                role="status"
                aria-live="polite"
                data-testid="rhythm-status"
                data-phase={view.phase}
              >
                {PHASE_COPY[view.phase] ?? "Đang chuẩn bị bài luyện…"}
                {view.practice && (
                  <span>
                    {view.exercise.section === "lessons"
                      ? " · Ví dụ bài học — không ghi điểm"
                      : " · Luyện lại — không ghi thêm điểm"}
                  </span>
                )}
              </div>
              <div className="rhythm-controls">
                <button
                  type="button"
                  className="rhythm-primary"
                  onClick={() => void start()}
                  disabled={!canStart}
                >
                  <Play size={16} /> Bắt đầu
                </button>
                <button
                  type="button"
                  className="rhythm-secondary"
                  onClick={() => void controller.reference()}
                  disabled={!canStart || view.referenceUsed}
                >
                  <Headphones size={16} />
                  {view.referenceUsed
                    ? "Đã nghe mẫu (1/1)"
                    : "Nghe mẫu (1 lần)"}
                </button>
                {active && view.phase !== "preparing" && (
                  <button
                    type="button"
                    className="rhythm-secondary"
                    onClick={() => controller.stop()}
                  >
                    <Square size={14} /> Dừng — không chấm
                  </button>
                )}
              </div>
              <div
                ref={tapRef}
                role="button"
                tabIndex={0}
                aria-label="Vùng chạm tiết tấu — chạm hoặc ấn Space"
                aria-disabled={
                  !active ||
                  view.phase === "reference" ||
                  view.phase === "starting"
                }
                aria-describedby="rhythm-tap-help"
                className={`rhythm-tap-surface ${active && view.phase !== "reference" ? "is-active" : ""} ${tapFlash ? "is-tapped" : ""}`}
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
                <div className="rhythm-error" role="status">
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
              {view.result && (
                <TapResultPanel
                  result={view.result}
                  points={view.points}
                  originalPoints={view.originalPoints}
                  onRetry={() => void retry()}
                  onContinue={() => void nextExercise()}
                  busy={locked || !notationReady}
                  lesson={view.exercise.section === "lessons"}
                />
              )}
            </section>
            <aside
              className="rhythm-side"
              aria-label="Hướng dẫn luyện tiết tấu"
            >
              <span className="module-kicker">GIỮ PHÁCH, KHÔNG ĐẾM SỐ TAP</span>
              <h2>
                Một nốt dài,
                <br />
                một lần chạm.
              </h2>
              <p>
                Chạm đúng lúc âm bắt đầu. Phần ngân còn lại vẫn chiếm thời gian
                nhưng không cần chạm thêm.
              </p>
              <div className="rhythm-side-step">
                <strong>1. Nhìn ký âm</strong>
                <span>Chú ý dấu lặng, chấm dôi và nối trường độ.</span>
              </div>
              <div className="rhythm-side-step">
                <strong>2. Nghe click đếm vào</strong>
                <span>Một ô nhịp chuẩn bị trước khi thực hiện.</span>
              </div>
              <div className="rhythm-side-step">
                <strong>3. Chạm và xem phản hồi</strong>
                <span>Timing Accuracy khác với Exercise Points +10/+0.</span>
              </div>
              <p className="rhythm-note">
                Nếu âm thanh hoặc clock không đáng tin cậy, bài được ghi là chưa
                chấm — không tính bạn làm sai.
              </p>
            </aside>
          </div>
        )}
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

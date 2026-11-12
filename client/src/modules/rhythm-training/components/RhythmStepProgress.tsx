import React from "react";
import {
  BarChart3,
  Check,
  Music2,
  Settings2,
  type LucideIcon,
} from "lucide-react";

type RhythmStep = "setup" | "practice" | "result";
type StepState = "current" | "completed" | "waiting";

const STEPS: ReadonlyArray<
  Readonly<{ id: RhythmStep; label: string; icon: LucideIcon }>
> = [
  { id: "setup", label: "Thiết lập", icon: Settings2 },
  { id: "practice", label: "Thực hành", icon: Music2 },
  { id: "result", label: "Kết quả", icon: BarChart3 },
];

/** Progress is a projection of the owning page's real screen state. */
export function RhythmStepProgress({ current }: { current: RhythmStep }) {
  const currentIndex = STEPS.findIndex(step => step.id === current);

  return (
    <nav
      className="rhythm-step-progress"
      aria-label="Tiến trình luyện tiết tấu"
      data-testid="rhythm-step-progress"
      data-current-step={current}
    >
      <ol>
        {STEPS.map((step, index) => {
          const state: StepState =
            index === currentIndex
              ? "current"
              : index < currentIndex
                ? "completed"
                : "waiting";
          const Icon = state === "completed" ? Check : step.icon;

          return (
            <li
              key={step.id}
              data-testid="rhythm-step"
              data-step={step.id}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="rhythm-step-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={2.3} />
              </span>
              <span className="rhythm-step-name">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default RhythmStepProgress;

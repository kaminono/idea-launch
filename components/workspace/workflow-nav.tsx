"use client";

import type { WorkflowStage } from "@/lib/types";

const STAGES = [
  { key: "idea_understanding", label: "产品想法", en: "Idea" },
  { key: "clarification", label: "信息补全", en: "Clarify" },
  { key: "product_analysis", label: "产品分析", en: "Analysis" },
  { key: "mvp_scoping", label: "MVP 收敛", en: "Scope" },
  { key: "execution_planning", label: "执行方案", en: "Execute" },
] as const;

interface WorkflowNavProps {
  /** 当前所处阶段 */
  currentStage: WorkflowStage;
}

export function WorkflowNav({ currentStage }: WorkflowNavProps) {
  const currentIndex = STAGES.findIndex(
    (stage) => stage.key === currentStage
  );

  return (
    <nav aria-label="立项流程" className="px-1">
      <ol className="flex flex-row items-center justify-between gap-1 lg:flex-col lg:items-stretch lg:gap-0">
        {STAGES.map((stage, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLocked = index > currentIndex;
          const isLast = index === STAGES.length - 1;

          return (
            <li
              key={stage.key}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex flex-1 gap-3 pb-0 lg:pb-6 lg:last:pb-0"
            >
              {/* 节点与连接线 */}
              <div className="relative flex w-4 items-center justify-center lg:flex-col lg:items-center">
                <span
                  className={[
                    "z-10 mt-[5px] h-2 w-2 shrink-0 rounded-full border transition-colors duration-200",
                    isCurrent
                      ? "h-2.5 w-2.5 border-brand bg-brand"
                      : isDone
                        ? "border-brand/50 bg-brand/50"
                        : "border-border-strong bg-paper",
                  ].join(" ")}
                />
                {!isLast && (
                  <span
                    className={[
                      "absolute left-[13px] right-0 top-[12px] h-px lg:top-[13px] lg:h-auto lg:w-px lg:flex-1",
                      isDone ? "bg-brand/40" : "bg-border",
                    ].join(" ")}
                  />
                )}
              </div>

              <div className="-mt-0.5 hidden flex-1 flex-col lg:flex">
                <span className="font-mono text-[10px] leading-4 text-ink-muted">
                  {String(index + 1).padStart(2, "0")} · {stage.en}
                </span>
                <span
                  className={[
                    "text-[13px] leading-5 transition-colors duration-200",
                    isCurrent
                      ? "font-semibold text-ink"
                      : isDone
                        ? "text-ink-secondary"
                        : isLocked
                          ? "text-ink-muted"
                          : "text-ink-secondary",
                  ].join(" ")}
                >
                  {stage.label}
                </span>
              </div>

              {/* 窄屏：仅中文标签，圆点下方 */}
              <span
                className={[
                  "absolute left-1/2 top-[22px] -translate-x-1/2 whitespace-nowrap text-[11px] leading-4 lg:hidden",
                  isCurrent
                    ? "font-semibold text-ink"
                    : isDone
                      ? "text-ink-secondary"
                      : "text-ink-muted",
                ].join(" ")}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

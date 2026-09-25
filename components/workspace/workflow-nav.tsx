"use client";

import { Check } from "lucide-react";
import type { WorkflowStage } from "@/lib/types";

const STAGES = [
  { key: "idea_understanding", label: "产品想法" },
  { key: "clarification", label: "信息补全" },
  { key: "product_analysis", label: "产品分析" },
  { key: "mvp_scoping", label: "MVP" },
  { key: "execution_planning", label: "执行方案" },
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
    <nav aria-label="工作流阶段" className="space-y-1">
      {STAGES.map((stage, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLocked = index > currentIndex;

        return (
          <div
            key={stage.key}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm",
              isCurrent
                ? "bg-accent-soft font-medium text-accent"
                : isDone
                  ? "text-body"
                  : "text-faint",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                isDone
                  ? "border-success bg-success text-white"
                  : isCurrent
                    ? "border-accent text-accent"
                    : "border-subtle text-faint",
              ].join(" ")}
            >
              {isDone ? <Check size={12} /> : index + 1}
            </span>
            <span>{stage.label}</span>
            {isLocked && (
              <span className="ml-auto text-[11px] text-faint">待开放</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";

interface StepProgressProps {
  steps: readonly string[];
  intervalMs?: number;
}

/** 产品级运行状态：只展示阶段动作，不展示模型思维链 */
function StepProgress({ steps, intervalMs = 1900 }: StepProgressProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [steps.length, intervalMs]);

  return (
    <div className="animate-fade-in">
      <div className="rounded-[16px] border border-subtle bg-surface p-6">
        <ul className="space-y-4">
          {steps.map((label, index) => {
            const state =
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "active"
                  : "pending";
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={[
                    "h-2 w-2 shrink-0 rounded-full transition-colors duration-200",
                    state === "done"
                      ? "bg-success"
                      : state === "active"
                        ? "animate-pulse bg-accent"
                        : "bg-subtle",
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-sm transition-colors duration-200",
                    state === "pending" ? "text-faint" : "text-body",
                  ].join(" ")}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const ANALYSIS_STEPS = [
  "正在收敛核心用户",
  "正在分析核心使用场景",
  "正在识别用户当前替代方式",
  "正在梳理产品核心价值",
  "正在检查关键假设",
  "正在识别主要风险",
] as const;

export function ProductAnalysisProgress() {
  return <StepProgress steps={ANALYSIS_STEPS} />;
}

"use client";

import { useEffect, useState } from "react";

interface StepProgressProps {
  steps: readonly string[];
  intervalMs?: number;
}

/** 产品级运行状态：只展示阶段动作，不展示模型思维链 */
function StepProgress({ steps, intervalMs = 1800 }: StepProgressProps) {
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

const QUESTION_STEPS = [
  "正在确认哪些信息会影响产品方向",
  "正在检查目标用户",
  "正在检查使用场景",
  "正在识别关键约束",
  "正在整理必要问题",
] as const;

export function ClarifyQuestionsProgress() {
  return <StepProgress steps={QUESTION_STEPS} />;
}

const SYNTHESIS_STEPS = [
  "正在整理你的产品上下文",
  "正在合并原始想法",
  "正在确认关键决策",
  "正在区分事实和假设",
  "正在准备产品分析上下文",
] as const;

export function ClarifySynthesisProgress() {
  return <StepProgress steps={SYNTHESIS_STEPS} />;
}

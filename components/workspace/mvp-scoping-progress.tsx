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

const MVP_SCOPING_STEPS = [
  "正在确定第一版最重要的验证目标",
  "正在寻找最小完整用户闭环",
  "正在判断哪些能力必须保留",
  "正在主动删除暂时不需要的功能",
  "正在检查独立开发约束",
  "正在准备验证方案",
] as const;

export function MvpScopingProgress() {
  return <StepProgress steps={MVP_SCOPING_STEPS} />;
}

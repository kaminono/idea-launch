"use client";

import { StepProgress } from "@/components/workspace/step-progress";

const PROGRESS_STEPS = [
  "正在理解你的产品想法",
  "正在识别目标用户",
  "正在提取核心问题",
  "正在检查已有约束",
  "正在识别缺失信息",
] as const;

export function AnalysisProgress() {
  return (
    <div className="animate-fade-in">
      <StepProgress
        steps={PROGRESS_STEPS}
        label="Working · 正在理解"
        intervalMs={2200}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-5">
      <div className="skeleton mb-4 h-3.5 w-24" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton h-3"
            style={{ width: `${88 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { StepProgress } from "@/components/workspace/step-progress";

const FINAL_REVIEW_STEPS = [
  "正在核对用户与问题是否一致",
  "正在检查 MVP 范围是否发生回流",
  "正在核对事实与假设边界",
  "正在检查执行计划是否过度工程化",
  "正在检查任务依赖与验收标准",
  "正在形成最终执行建议",
] as const;

export function FinalReviewProgress() {
  return (
    <StepProgress
      steps={FINAL_REVIEW_STEPS}
      label="Working · 正在审计方案"
      intervalMs={2100}
    />
  );
}

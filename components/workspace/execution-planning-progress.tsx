"use client";

import { StepProgress } from "@/components/workspace/step-progress";

const EXECUTION_PLANNING_STEPS = [
  "正在整理产品结构",
  "正在选择最简单的技术路径",
  "正在拆解核心数据对象",
  "正在组织开发里程碑",
  "正在拆分可执行任务",
  "正在检查任务依赖与验收标准",
] as const;

export function ExecutionPlanningProgress() {
  return (
    <StepProgress
      steps={EXECUTION_PLANNING_STEPS}
      label="Working · 正在生成执行方案"
      intervalMs={2100}
    />
  );
}

"use client";

import { StepProgress } from "@/components/workspace/step-progress";

const ANALYSIS_STEPS = [
  "正在收敛核心用户",
  "正在分析核心使用场景",
  "正在识别用户当前替代方式",
  "正在梳理产品核心价值",
  "正在检查关键假设",
  "正在识别主要风险",
] as const;

export function ProductAnalysisProgress() {
  return (
    <StepProgress steps={ANALYSIS_STEPS} label="Working · 正在分析产品" />
  );
}

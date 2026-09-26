"use client";

import { StepProgress } from "@/components/workspace/step-progress";

const QUESTION_STEPS = [
  "正在确认哪些信息会影响产品方向",
  "正在检查目标用户",
  "正在检查使用场景",
  "正在识别关键约束",
  "正在整理必要问题",
] as const;

export function ClarifyQuestionsProgress() {
  return (
    <StepProgress steps={QUESTION_STEPS} label="Working · 正在生成问题" />
  );
}

const SYNTHESIS_STEPS = [
  "正在整理你的产品上下文",
  "正在合并原始想法",
  "正在确认关键决策",
  "正在区分事实和假设",
  "正在准备产品分析上下文",
] as const;

export function ClarifySynthesisProgress() {
  return (
    <StepProgress steps={SYNTHESIS_STEPS} label="Working · 正在综合上下文" />
  );
}

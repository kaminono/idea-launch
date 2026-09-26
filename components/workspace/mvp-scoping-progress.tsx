"use client";

import { StepProgress } from "@/components/workspace/step-progress";

const MVP_SCOPING_STEPS = [
  "正在确定第一版最重要的验证目标",
  "正在寻找最小完整用户闭环",
  "正在判断哪些能力必须保留",
  "正在主动删除暂时不需要的功能",
  "正在检查独立开发约束",
  "正在准备验证方案",
] as const;

export function MvpScopingProgress() {
  return (
    <StepProgress steps={MVP_SCOPING_STEPS} label="Working · 正在收敛 MVP" />
  );
}

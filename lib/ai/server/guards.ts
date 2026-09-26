// Route Handler 共享的业务 Payload 守卫。
// 仅做结构性校验，不涉及模型配置（模型配置见 validate-config.ts）。

import {
  isClarificationAnswer,
  isClarificationQuestion,
  isClarifiedContext,
} from "../schemas";

/** 校验请求中的 ClarificationState（必须含 questions/answers/clarifiedContext） */
export function isClarificationStatePayload(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.needed === "boolean" &&
    typeof candidate.reason === "string" &&
    Array.isArray(candidate.questions) &&
    candidate.questions.every(isClarificationQuestion) &&
    Array.isArray(candidate.answers) &&
    candidate.answers.every(isClarificationAnswer) &&
    (candidate.clarifiedContext === null ||
      isClarifiedContext(candidate.clarifiedContext)) &&
    (candidate.completedAt === null ||
      typeof candidate.completedAt === "string")
  );
}
